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

        $customer = self::findCustomerByPhone($normalized);

        if (!$customer) {
            self::recordRequest($normalized);

            return [
                'ok' => true,
                'message' => 'Jika nomor terdaftar, kode OTP akan dikirim ke WhatsApp Anda.',
                'masked_phone' => PhoneNumber::mask($normalized),
            ];
        }

        if (empty(trim((string) $customer->phone_number))) {
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

        if (!WhatsAppService::sendText($customer->phone_number, $message, skipBulkDelay: true)) {
            Cache::forget($cacheKey);

            return [
                'ok' => false,
                'message' => 'Gagal mengirim OTP via WhatsApp. Pastikan gateway aktif atau hubungi admin.',
            ];
        }

        self::recordRequest($normalized);

        Log::info('Customer portal OTP sent.', [
            'customer_id' => $customer->id,
            'phone' => PhoneNumber::mask($normalized),
        ]);

        return [
            'ok' => true,
            'message' => 'Kode OTP telah dikirim ke WhatsApp Anda.',
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

        if ($normalized === '' || !preg_match('/^\d{6}$/', $otp)) {
            return [
                'ok' => false,
                'message' => 'Nomor atau kode OTP tidak valid.',
            ];
        }

        $cacheKey = self::otpCacheKey($normalized);
        $payload = Cache::get($cacheKey);

        if (!is_array($payload) || empty($payload['hash']) || empty($payload['customer_id'])) {
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

        if (!Hash::check($otp, $payload['hash'])) {
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

        if (!$customer || !$customer->user) {
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

        return Customer::query()
            ->whereHas('user')
            ->whereIn('phone_number', $variants)
            ->first();
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
