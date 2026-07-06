<?php

namespace App\Services;

use App\Models\Customer;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class CustomerOtpService
{
    public const OTP_TTL_SECONDS = 300;

    public const MAX_REQUESTS_PER_WINDOW = 3;

    public const REQUEST_WINDOW_SECONDS = 900;

    public const MAX_VERIFY_ATTEMPTS = 5;

    /**
     * @return array{ok: bool, message: string, masked_phone?: string}
     */
    public static function requestOtp(string $phone): array
    {
        $normalized = PhoneNumber::normalize($phone);

        if ($normalized === '') {
            return [
                'ok' => false,
                'message' => 'Nomor WhatsApp tidak valid.',
            ];
        }

        if (self::isRateLimited($normalized)) {
            return [
                'ok' => false,
                'message' => 'Terlalu banyak permintaan OTP. Coba lagi dalam beberapa menit.',
            ];
        }

        $customer = self::resolveCustomerForPortalLogin($phone);

        if (! $customer) {
            self::recordRequest($normalized);

            if (self::isVpsWhitelistedPhone($normalized)) {
                return [
                    'ok' => false,
                    'message' => 'Nomor ada di whitelist VPS, tetapi akun pelanggan belum ditemukan. '
                        . 'Buat pelanggan di Manajemen PPPoE dengan username yang sama seperti di whitelist Layanan VPS.',
                ];
            }

            return [
                'ok' => true,
                'message' => 'Jika nomor terdaftar, kode OTP akan dikirim ke WhatsApp Anda.',
                'masked_phone' => PhoneNumber::mask($normalized),
            ];
        }

        $sendTo = self::otpSendTarget($customer, $phone);

        if ($sendTo === '') {
            return [
                'ok' => false,
                'message' => 'Nomor WhatsApp belum terdaftar untuk akun ini. Hubungi admin.',
            ];
        }

        $otp = (string) random_int(100000, 999999);
        $cacheKey = self::otpCacheKey($normalized);

        Cache::put($cacheKey, [
            'hash' => Hash::make($otp),
            'customer_id' => $customer->id,
            'attempts' => 0,
        ], self::OTP_TTL_SECONDS);

        $brand = BrandingService::companyName();
        $message = "Kode OTP Portal Pelanggan {$brand}:\n\n*{$otp}*\n\nBerlaku 5 menit. Jangan bagikan kode ini kepada siapapun.";

        $sent = WhatsAppService::sendText($sendTo, $message, skipBulkDelay: true);

        if (! $sent) {
            Log::warning('Customer portal OTP send reported failure by gateway, keeping OTP cache.', [
                'customer_id' => $customer->id,
                'phone' => PhoneNumber::mask($normalized),
                'send_to' => PhoneNumber::mask($sendTo),
            ]);
        }

        self::recordRequest($normalized);

        Log::info('Customer portal OTP requested.', [
            'customer_id' => $customer->id,
            'phone' => PhoneNumber::mask($normalized),
            'send_to' => PhoneNumber::mask($sendTo),
            'gateway_reported_success' => $sent,
        ]);

        return [
            'ok' => true,
            'message' => 'Kode OTP telah dikirim ke WhatsApp Anda. Periksa pesan masuk lalu masukkan kode 6 digit di bawah.',
            'masked_phone' => PhoneNumber::mask($normalized),
        ];
    }

    /**
     * @return array{ok: bool, message: string, customer?: Customer}
     */
    public static function verifyOtp(string $phone, string $otp): array
    {
        $normalized = PhoneNumber::normalize($phone);
        $otp = trim($otp);

        if ($normalized === '' || ! preg_match('/^\d{6}$/', $otp)) {
            return [
                'ok' => false,
                'message' => 'Nomor atau kode OTP tidak valid.',
            ];
        }

        $cacheKey = self::otpCacheKey($normalized);
        $payload = Cache::get($cacheKey);

        if (! is_array($payload) || empty($payload['hash']) || empty($payload['customer_id'])) {
            return [
                'ok' => false,
                'message' => 'Kode OTP tidak ditemukan atau sudah kedaluwarsa. Minta kode baru.',
            ];
        }

        $attempts = (int) ($payload['attempts'] ?? 0);

        if ($attempts >= self::MAX_VERIFY_ATTEMPTS) {
            Cache::forget($cacheKey);

            return [
                'ok' => false,
                'message' => 'Terlalu banyak percobaan. Minta kode OTP baru.',
            ];
        }

        if (! Hash::check($otp, $payload['hash'])) {
            $payload['attempts'] = $attempts + 1;
            Cache::put($cacheKey, $payload, self::OTP_TTL_SECONDS);

            return [
                'ok' => false,
                'message' => 'Kode OTP salah. Periksa kembali pesan WhatsApp Anda.',
            ];
        }

        Cache::forget($cacheKey);

        $customer = Customer::query()
            ->with('user')
            ->find($payload['customer_id']);

        if (! $customer || ! $customer->user) {
            return [
                'ok' => false,
                'message' => 'Akun pelanggan tidak ditemukan. Hubungi admin.',
            ];
        }

        return [
            'ok' => true,
            'message' => 'Login berhasil.',
            'customer' => $customer,
        ];
    }

    public static function findCustomerByPhone(string $phone): ?Customer
    {
        $normalized = PhoneNumber::normalize($phone);

        if ($normalized === '') {
            return null;
        }

        $variants = PhoneNumber::variants($normalized);

        $customer = Customer::query()
            ->whereHas('user')
            ->whereIn('phone_number', $variants)
            ->first();

        if ($customer) {
            return $customer;
        }

        foreach (
            Customer::query()
                ->whereHas('user')
                ->whereNotNull('phone_number')
                ->where('phone_number', '!=', '')
                ->cursor() as $candidate
        ) {
            if (PhoneNumber::matches($phone, (string) $candidate->phone_number)) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * Resolve portal login customer by phone, with VPS whitelist username fallback.
     */
    public static function resolveCustomerForPortalLogin(string $phone): ?Customer
    {
        $customer = self::findCustomerByPhone($phone);

        if ($customer) {
            return $customer;
        }

        if (! VpsCatalogService::isEnabled()) {
            return null;
        }

        $normalized = PhoneNumber::normalize($phone);

        if ($normalized === '' || ! self::isVpsWhitelistedPhone($normalized)) {
            return null;
        }

        foreach (VpsCatalogService::whitelistUsernames() as $username) {
            $username = trim($username);

            if ($username === '') {
                continue;
            }

            $candidate = Customer::query()
                ->whereHas('user')
                ->whereRaw('LOWER(username) = ?', [strtolower($username)])
                ->first();

            if ($candidate) {
                return $candidate;
            }
        }

        return null;
    }

    private static function isVpsWhitelistedPhone(string $normalizedPhone): bool
    {
        return VpsCatalogService::isEnabled()
            && VpsCatalogService::phoneMatchesWhitelist($normalizedPhone, VpsCatalogService::whitelistPhones());
    }

    private static function otpSendTarget(Customer $customer, string $enteredPhone): string
    {
        $enteredNormalized = PhoneNumber::normalize($enteredPhone);

        if ($enteredNormalized !== '' && PhoneNumber::matches($enteredPhone, (string) $customer->phone_number)) {
            return $enteredNormalized;
        }

        if (VpsCatalogService::isEnabled()
            && self::isVpsWhitelistedPhone($enteredNormalized)
            && in_array(
                strtolower(trim((string) $customer->username)),
                array_map('strtolower', VpsCatalogService::whitelistUsernames()),
                true
            )
        ) {
            return $enteredNormalized;
        }

        return PhoneNumber::normalize((string) $customer->phone_number);
    }

    private static function otpCacheKey(string $normalizedPhone): string
    {
        return 'customer_portal_otp:' . $normalizedPhone;
    }

    private static function rateLimitKey(string $normalizedPhone): string
    {
        return 'customer_portal_otp_requests:' . $normalizedPhone;
    }

    private static function isRateLimited(string $normalizedPhone): bool
    {
        return (int) Cache::get(self::rateLimitKey($normalizedPhone), 0) >= self::MAX_REQUESTS_PER_WINDOW;
    }

    private static function recordRequest(string $normalizedPhone): void
    {
        $key = self::rateLimitKey($normalizedPhone);
        $count = (int) Cache::get($key, 0);
        Cache::put($key, $count + 1, self::REQUEST_WINDOW_SECONDS);
    }
}
