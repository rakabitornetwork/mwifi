<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    private static ?float $lastBulkSentAt = null;

    private static ?float $bulkWindowStartedAt = null;

    private static int $bulkSentInWindow = 0;

    public static function defaultTestMessage(): string
    {
        return 'Tes notifikasi WhatsApp dari ' . BrandingService::companyName() . '.';
    }

    /**
     * @return array{
     *     api_url: string,
     *     api_key: ?string,
     *     session_id: string,
     *     enabled: bool,
     *     bulk_delay_enabled: bool,
     *     bulk_batch_size: int,
     *     bulk_window_seconds: int
     * }
     */
    public static function configuration(): array
    {
        $apiUrl = rtrim((string) (setting('whatsapp.api_url') ?: 'http://127.0.0.1:3003'), '/');

        $legacyWindow = (int) (setting('whatsapp.bulk_delay_seconds') ?: 0);
        $windowSeconds = (int) (setting('whatsapp.bulk_window_seconds') ?: ($legacyWindow > 0 ? $legacyWindow : 300));

        return [
            'api_url' => $apiUrl,
            'api_key' => setting('whatsapp.api_key') ?: null,
            'session_id' => (string) (setting('whatsapp.session_id') ?: 'mwifi_session'),
            'enabled' => setting('whatsapp.enabled', '1') !== '0',
            'bulk_delay_enabled' => setting('whatsapp.bulk_delay_enabled', '1') !== '0',
            'bulk_batch_size' => max(1, min(100, (int) (setting('whatsapp.bulk_batch_size') ?: 5))),
            'bulk_window_seconds' => max(6, min(7200, $windowSeconds)),
        ];
    }

    /**
     * Send a text message via the WhatsApp Baileys Gateway.
     *
     * @param string $to Recipient phone number (e.g. "0812345678" or "62812345678")
     * @param string $message The message body
     * @param bool $skipBulkDelay Lewati jeda antar pesan (untuk uji coba tunggal)
     */
    public static function sendText(string $to, string $message, bool $skipBulkDelay = false): bool
    {
        $config = self::configuration();

        if (!$config['enabled']) {
            Log::info('WhatsApp notification skipped: integrasi dinonaktifkan di Pengaturan.');

            return false;
        }

        if (empty($config['api_url'])) {
            Log::warning('WhatsApp notification skipped: Gateway URL belum diisi di Pengaturan.');

            return false;
        }

        if (!$skipBulkDelay) {
            self::waitForBulkDelay($config);
        }

        $apiUrl = $config['api_url'];
        $sessionId = $config['session_id'];

        // Normalize phone number to international format (replace leading 0 with 62)
        $to = preg_replace('/^0/', '62', trim($to));

        // Strip out any non-digit characters
        $to = preg_replace('/[^0-9]/', '', $to);

        if (empty($to)) {
            Log::warning('WhatsApp notification skipped: empty phone number.');

            return false;
        }

        try {
            $response = self::gatewayClient()
                ->timeout(10)
                ->post("{$apiUrl}/send-message", [
                    'session' => $sessionId,
                    'to' => $to,
                    'text' => $message,
                ]);

            if ($response->successful()) {
                Log::info("WhatsApp message sent successfully to {$to}.");
                self::recordBulkSend($config);

                return true;
            }

            Log::error("WhatsApp Gateway returned an error status ({$response->status()}): " . $response->body());

            return false;
        } catch (\Exception $e) {
            Log::error('WhatsApp Gateway communication failure: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Cek ketersediaan gateway (health endpoint).
     *
     * @return array{ok: bool, message: string, status?: int}
     */
    public static function checkGatewayHealth(): array
    {
        $config = self::configuration();

        if (empty($config['api_url'])) {
            return ['ok' => false, 'message' => 'Gateway URL belum diisi di menu Pengaturan.'];
        }

        try {
            $response = Http::timeout(5)->get("{$config['api_url']}/health");

            if ($response->successful()) {
                return ['ok' => true, 'message' => 'Gateway merespons dengan baik.'];
            }

            return [
                'ok' => false,
                'message' => "Gateway merespons HTTP {$response->status()}.",
                'status' => $response->status(),
            ];
        } catch (\Exception $e) {
            return [
                'ok' => false,
                'message' => 'Gateway tidak dapat dijangkau: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Status sesi WhatsApp (termasuk QR untuk scan dari panel admin).
     *
     * @return array{
     *     ok: bool,
     *     message: string,
     *     session?: string,
     *     status?: string,
     *     has_qr?: bool,
     *     qr_data_url?: string|null,
     *     last_error?: string|null,
     *     profile?: array{id?: string, name?: string|null, picture_data_url?: string|null}|null
     * }
     */
    public static function getSessionStatus(bool $forceRefresh = false, bool $refreshProfile = false): array
    {
        $config = self::configuration();

        if (empty($config['api_url'])) {
            return ['ok' => false, 'message' => 'Gateway URL belum diisi di menu Pengaturan.'];
        }

        $sessionId = rawurlencode($config['session_id']);

        try {
            $response = self::gatewayClient()
                ->timeout(8)
                ->get("{$config['api_url']}/session/{$sessionId}/status", array_filter([
                    'profile' => $refreshProfile ? '1' : null,
                ]));

            if ($response->status() === 401) {
                return ['ok' => false, 'message' => 'API Key gateway tidak valid.'];
            }

            if (!$response->successful()) {
                return [
                    'ok' => false,
                    'message' => "Gateway merespons HTTP {$response->status()}.",
                ];
            }

            $data = $response->json();

            $profile = $data['profile'] ?? null;
            if (($data['status'] ?? '') === 'open') {
                $profile = is_array($profile) ? $profile : [];
                $profile['avatar_url'] = url('/admin/settings/whatsapp-session/avatar');
            } elseif (is_array($profile) && ($profile['has_picture'] ?? false)) {
                $profile['avatar_url'] = url('/admin/settings/whatsapp-session/avatar');
            }

            $result = [
                'ok' => true,
                'message' => 'Status sesi berhasil dimuat.',
                'session' => $data['session'] ?? $config['session_id'],
                'status' => $data['status'] ?? 'unknown',
                'has_qr' => (bool) ($data['has_qr'] ?? false),
                'qr_data_url' => $data['qr_data_url'] ?? null,
                'last_error' => $data['last_error'] ?? null,
                'profile' => $profile,
            ];

            self::syncLinkedPhoneFromSession($result);

            return $result;
        } catch (\Exception $e) {
            return [
                'ok' => false,
                'message' => 'Tidak dapat membaca status sesi: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Mulai / lanjutkan koneksi sesi WhatsApp di gateway.
     *
     * @return array{ok: bool, message: string, session?: string, status?: string}
     */
    public static function startSession(): array
    {
        $config = self::configuration();

        if (empty($config['api_url'])) {
            return ['ok' => false, 'message' => 'Gateway URL belum diisi di menu Pengaturan.'];
        }

        $sessionId = rawurlencode($config['session_id']);

        try {
            $response = self::gatewayClient()->post("{$config['api_url']}/session/{$sessionId}/start");

            if ($response->status() === 401) {
                return ['ok' => false, 'message' => 'API Key gateway tidak valid.'];
            }

            if (!$response->successful()) {
                $message = $response->json('message') ?: "Gateway merespons HTTP {$response->status()}.";

                return ['ok' => false, 'message' => $message];
            }

            $data = $response->json();

            return [
                'ok' => true,
                'message' => $data['message'] ?? 'Sesi WhatsApp dimulai.',
                'session' => $data['session'] ?? $config['session_id'],
                'status' => $data['status'] ?? 'connecting',
            ];
        } catch (\Exception $e) {
            return [
                'ok' => false,
                'message' => 'Gagal memulai sesi WhatsApp: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Hapus kredensial sesi lama di gateway (untuk ganti nomor / scan QR baru).
     *
     * @return array{ok: bool, message: string, session?: string, status?: string}
     */
    public static function resetSession(): array
    {
        $config = self::configuration();

        if (empty($config['api_url'])) {
            return ['ok' => false, 'message' => 'Gateway URL belum diisi di menu Pengaturan.'];
        }

        $sessionId = rawurlencode($config['session_id']);

        try {
            $response = self::gatewayClient()->post("{$config['api_url']}/session/{$sessionId}/reset");

            if ($response->status() === 401) {
                return ['ok' => false, 'message' => 'API Key gateway tidak valid.'];
            }

            if ($response->status() === 404) {
                return [
                    'ok' => false,
                    'message' => 'Gateway belum mendukung reset sesi. Restart layanan Baileys gateway ke versi terbaru.',
                ];
            }

            if (!$response->successful()) {
                $message = $response->json('message') ?: "Gateway merespons HTTP {$response->status()}.";

                return ['ok' => false, 'message' => $message];
            }

            $data = $response->json();
            SettingService::set('whatsapp.linked_phone', '', 'whatsapp', false);
            Cache::forget('whatsapp.linked_phone.live');

            return [
                'ok' => true,
                'message' => $data['message'] ?? 'Sesi WhatsApp direset.',
                'session' => $data['session'] ?? $config['session_id'],
                'status' => $data['status'] ?? 'idle',
            ];
        } catch (\Exception $e) {
            return [
                'ok' => false,
                'message' => 'Gagal mereset sesi WhatsApp: ' . $e->getMessage(),
            ];
        }
    }

    public static function refreshSessionProfile(): array
    {
        $config = self::configuration();

        if (empty($config['api_url'])) {
            return ['ok' => false, 'message' => 'Gateway URL belum diisi di menu Pengaturan.'];
        }

        $sessionId = rawurlencode($config['session_id']);

        try {
            $response = self::gatewayClient()
                ->timeout(15)
                ->post("{$config['api_url']}/session/{$sessionId}/profile/refresh");

            if ($response->status() === 401) {
                return ['ok' => false, 'message' => 'API Key gateway tidak valid.'];
            }

            if (!$response->successful()) {
                $message = $response->json('message') ?: "Gateway merespons HTTP {$response->status()}.";

                return ['ok' => false, 'message' => $message];
            }

            $data = $response->json();

            $profile = $data['profile'] ?? null;
            if (($data['status'] ?? '') === 'open') {
                $profile = is_array($profile) ? $profile : [];
                $profile['avatar_url'] = url('/admin/settings/whatsapp-session/avatar');
            } elseif (is_array($profile) && ($profile['has_picture'] ?? false)) {
                $profile['avatar_url'] = url('/admin/settings/whatsapp-session/avatar');
            }

            return [
                'ok' => true,
                'message' => 'Profil WhatsApp diperbarui.',
                'session' => $data['session'] ?? $config['session_id'],
                'status' => $data['status'] ?? 'open',
                'profile' => $profile,
            ];
        } catch (\Exception $e) {
            return [
                'ok' => false,
                'message' => 'Gagal memperbarui profil WhatsApp: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * @return \Illuminate\Http\Client\Response
     */
    public static function fetchSessionAvatarResponse()
    {
        $config = self::configuration();

        if (empty($config['api_url'])) {
            throw new \RuntimeException('Gateway URL belum diisi.');
        }

        $sessionId = rawurlencode($config['session_id']);

        return self::gatewayClient()
            ->withHeaders(['Accept' => 'image/*'])
            ->get("{$config['api_url']}/session/{$sessionId}/profile/avatar");
    }

    private static function gatewayClient(): PendingRequest
    {
        $config = self::configuration();

        $client = Http::withHeaders([
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ])->timeout(20);

        if (!empty($config['api_key'])) {
            $client = $client->withToken($config['api_key']);
        }

        return $client;
    }

    /**
     * @param array{bulk_delay_enabled: bool, bulk_batch_size: int, bulk_window_seconds: int} $config
     */
    private static function waitForBulkDelay(array $config): void
    {
        if (!($config['bulk_delay_enabled'] ?? false)) {
            return;
        }

        $batchSize = max(1, (int) ($config['bulk_batch_size'] ?? 5));
        $windowSeconds = max(6, (int) ($config['bulk_window_seconds'] ?? 300));
        $minGapSeconds = $windowSeconds / $batchSize;

        $now = microtime(true);

        if (self::$bulkWindowStartedAt === null || ($now - self::$bulkWindowStartedAt) >= $windowSeconds) {
            self::$bulkWindowStartedAt = $now;
            self::$bulkSentInWindow = 0;
        }

        if (self::$bulkSentInWindow >= $batchSize) {
            $waitSeconds = (self::$bulkWindowStartedAt + $windowSeconds) - $now;

            if ($waitSeconds > 0) {
                Log::debug(sprintf(
                    'WhatsApp bulk: kuota %d pesan per %d detik tercapai, menunggu %.1f detik.',
                    $batchSize,
                    $windowSeconds,
                    $waitSeconds
                ));
                self::sleepSeconds($waitSeconds);
            }

            self::$bulkWindowStartedAt = microtime(true);
            self::$bulkSentInWindow = 0;
            $now = microtime(true);
        }

        if (self::$lastBulkSentAt !== null && self::$bulkSentInWindow > 0) {
            $elapsed = $now - self::$lastBulkSentAt;
            $waitSeconds = $minGapSeconds - $elapsed;

            if ($waitSeconds > 0) {
                Log::debug(sprintf(
                    'WhatsApp bulk: jeda %.1f detik sebelum pesan berikutnya (%d pesan / %d detik).',
                    $waitSeconds,
                    $batchSize,
                    $windowSeconds
                ));
                self::sleepSeconds($waitSeconds);
            }
        }
    }

    /**
     * @param array{bulk_batch_size: int, bulk_window_seconds: int} $config
     */
    private static function recordBulkSend(array $config): void
    {
        $now = microtime(true);
        $windowSeconds = max(6, (int) ($config['bulk_window_seconds'] ?? 300));

        if (self::$bulkWindowStartedAt === null || ($now - self::$bulkWindowStartedAt) >= $windowSeconds) {
            self::$bulkWindowStartedAt = $now;
            self::$bulkSentInWindow = 0;
        }

        self::$bulkSentInWindow++;
        self::$lastBulkSentAt = $now;
    }

    private static function sleepSeconds(float $seconds): void
    {
        usleep((int) round($seconds * 1_000_000));
    }

    /**
     * Reset penanda jeda massal (berguna untuk pengujian).
     */
    public static function resetBulkDelayState(): void
    {
        self::$lastBulkSentAt = null;
        self::$bulkWindowStartedAt = null;
        self::$bulkSentInWindow = 0;
    }

    public static function syncLinkedPhoneFromSession(array $status): void
    {
        if (!($status['ok'] ?? false) || ($status['status'] ?? '') !== 'open') {
            return;
        }

        $profile = $status['profile'] ?? null;
        if (!is_array($profile)) {
            return;
        }

        $phone = trim((string) ($profile['id'] ?? ''));
        if ($phone === '') {
            return;
        }

        SettingService::set('whatsapp.linked_phone', $phone, 'whatsapp', false);
        Cache::forget('whatsapp.linked_phone.live');
    }

    public static function getLinkedPhoneForMessages(): string
    {
        $stored = trim((string) SettingService::get('whatsapp.linked_phone', ''));
        if ($stored !== '') {
            return self::formatDisplayPhone($stored);
        }

        $livePhone = Cache::remember('whatsapp.linked_phone.live', 120, function (): string {
            $status = self::getSessionStatus();
            if (($status['ok'] ?? false) && ($status['status'] ?? '') === 'open') {
                $phone = trim((string) ($status['profile']['id'] ?? ''));
                if ($phone !== '') {
                    self::syncLinkedPhoneFromSession($status);

                    return $phone;
                }
            }

            return '';
        });

        if ($livePhone !== '') {
            return self::formatDisplayPhone($livePhone);
        }

        $fallback = trim((string) SettingService::get('payment.manual_confirm_phone', ''));
        if ($fallback !== '') {
            return self::formatDisplayPhone($fallback);
        }

        $companyPhone = trim((string) SettingService::get('system.company_phone', ''));
        if ($companyPhone !== '') {
            return self::formatDisplayPhone($companyPhone);
        }

        return '-';
    }

    public static function formatDisplayPhone(string $phone): string
    {
        $digits = preg_replace('/[^0-9]/', '', $phone);
        if ($digits === '') {
            return '-';
        }

        if (str_starts_with($digits, '62')) {
            return '+' . $digits;
        }

        if (str_starts_with($digits, '0')) {
            return '+62' . substr($digits, 1);
        }

        return '+' . $digits;
    }
}
