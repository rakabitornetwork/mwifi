<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    private static ?float $lastBulkSentAt = null;

    public static function defaultTestMessage(): string
    {
        return 'Tes notifikasi WhatsApp dari panel Pengaturan ' . BrandingService::appName() . '.';
    }

    /**
     * @return array{
     *     api_url: string,
     *     api_key: ?string,
     *     session_id: string,
     *     enabled: bool,
     *     bulk_delay_enabled: bool,
     *     bulk_delay_seconds: int,
     *     bulk_delay_jitter_seconds: int
     * }
     */
    public static function configuration(): array
    {
        $apiUrl = rtrim((string) (setting('whatsapp.api_url') ?: 'http://127.0.0.1:3003'), '/');

        return [
            'api_url' => $apiUrl,
            'api_key' => setting('whatsapp.api_key') ?: null,
            'session_id' => (string) (setting('whatsapp.session_id') ?: 'mwifi_session'),
            'enabled' => setting('whatsapp.enabled', '1') !== '0',
            'bulk_delay_enabled' => setting('whatsapp.bulk_delay_enabled', '1') !== '0',
            'bulk_delay_seconds' => max(1, min(120, (int) (setting('whatsapp.bulk_delay_seconds') ?: 4))),
            'bulk_delay_jitter_seconds' => max(0, min(60, (int) (setting('whatsapp.bulk_delay_jitter_seconds') ?: 3))),
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
                self::$lastBulkSentAt = microtime(true);

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
    public static function getSessionStatus(): array
    {
        $config = self::configuration();

        if (empty($config['api_url'])) {
            return ['ok' => false, 'message' => 'Gateway URL belum diisi di menu Pengaturan.'];
        }

        $sessionId = rawurlencode($config['session_id']);

        try {
            $response = self::gatewayClient()->get("{$config['api_url']}/session/{$sessionId}/status");

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

            return [
                'ok' => true,
                'message' => 'Status sesi berhasil dimuat.',
                'session' => $data['session'] ?? $config['session_id'],
                'status' => $data['status'] ?? 'unknown',
                'has_qr' => (bool) ($data['has_qr'] ?? false),
                'qr_data_url' => $data['qr_data_url'] ?? null,
                'last_error' => $data['last_error'] ?? null,
                'profile' => $data['profile'] ?? null,
            ];
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
     * @param array{bulk_delay_enabled: bool, bulk_delay_seconds: int, bulk_delay_jitter_seconds: int} $config
     */
    private static function waitForBulkDelay(array $config): void
    {
        if (!($config['bulk_delay_enabled'] ?? false)) {
            return;
        }

        $baseSeconds = (int) ($config['bulk_delay_seconds'] ?? 4);
        $jitterSeconds = (int) ($config['bulk_delay_jitter_seconds'] ?? 0);
        $requiredGap = $baseSeconds + ($jitterSeconds > 0 ? random_int(0, $jitterSeconds) : 0);

        if (self::$lastBulkSentAt !== null) {
            $elapsed = microtime(true) - self::$lastBulkSentAt;
            $waitSeconds = $requiredGap - $elapsed;

            if ($waitSeconds > 0) {
                Log::debug(sprintf('WhatsApp bulk delay: waiting %.1f seconds before next message.', $waitSeconds));
                usleep((int) round($waitSeconds * 1_000_000));
            }
        }
    }

    /**
     * Reset penanda jeda massal (berguna untuk pengujian).
     */
    public static function resetBulkDelayState(): void
    {
        self::$lastBulkSentAt = null;
    }
}
