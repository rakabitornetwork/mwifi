<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    /**
     * Send a text message via the WhatsApp Baileys Gateway.
     *
     * @param string $to Recipient phone number (e.g. "0812345678" or "62812345678")
     * @param string $message The message body
     * @return bool
     */
    public static function sendText(string $to, string $message): bool
    {
        $apiUrl = config('services.whatsapp.api_url', 'http://localhost:3000');
        $apiKey = config('services.whatsapp.api_key');
        $sessionId = config('services.whatsapp.session_id', 'mwifi_session');

        // Normalize phone number to international format (replace leading 0 with 62)
        $to = preg_replace('/^0/', '62', trim($to));
        
        // Strip out any non-digit characters
        $to = preg_replace('/[^0-9]/', '', $to);

        if (empty($to)) {
            Log::warning("WhatsApp notification skipped: empty phone number.");
            return false;
        }

        try {
            $headers = [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ];

            if (!empty($apiKey)) {
                $headers['Authorization'] = 'Bearer ' . $apiKey;
            }

            // Post request to the Baileys gateway API endpoint
            $response = Http::withHeaders($headers)
                ->timeout(10)
                ->post("{$apiUrl}/send-message", [
                    'session' => $sessionId,
                    'to' => $to,
                    'text' => $message,
                ]);

            if ($response->successful()) {
                Log::info("WhatsApp message sent successfully to {$to}.");
                return true;
            }

            Log::error("WhatsApp Gateway returned an error status ({$response->status()}): " . $response->body());
            return false;
        } catch (\Exception $e) {
            Log::error("WhatsApp Gateway communication failure: " . $e->getMessage());
            return false;
        }
    }
}
