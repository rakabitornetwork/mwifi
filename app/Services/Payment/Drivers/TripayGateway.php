<?php

namespace App\Services\Payment\Drivers;

use App\Models\Invoice;
use App\Services\Payment\PaymentGatewayInterface;
use App\Services\Payment\PaymentHttp;
use App\Services\SettingService;
use Illuminate\Support\Facades\Log;
use Exception;

class TripayGateway implements PaymentGatewayInterface
{
    protected string $apiKey;
    protected string $privateKey;
    protected string $merchantCode;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiKey = config('services.tripay.api_key', '');
        $this->privateKey = config('services.tripay.private_key', '');
        $this->merchantCode = config('services.tripay.merchant_code', '');

        // Detect sandbox automatically based on API key prefix or explicit setting
        $mode = SettingService::get('payment.tripay.mode', 'sandbox');
        $isSandbox = str_starts_with($this->apiKey, 'DEV-') || $mode === 'sandbox';
        
        $this->baseUrl = $isSandbox ? 'https://tripay.co.id/api-sandbox' : 'https://tripay.co.id/api';
    }

    /**
     * Create a payment transaction in Tripay.
     */
    public function createTransaction(Invoice $invoice, string $paymentMethod): array
    {
        if ($this->apiKey === '' || $this->privateKey === '' || $this->merchantCode === '') {
            return [
                'success' => false,
                'message' => 'Kredensial Tripay belum lengkap. Isi API Key, Merchant Code, dan Private Key di menu Pengaturan.',
            ];
        }

        $customer = $invoice->customer;
        $merchantRef = $invoice->invoice_number;
        $amount = (int) $invoice->total_amount;

        // Signature = merchant_code + merchant_ref + amount
        $signature = hash_hmac('sha256', $this->merchantCode . $merchantRef . $amount, $this->privateKey);

        $payload = [
            'method'         => $paymentMethod,
            'merchant_ref'   => $merchantRef,
            'amount'         => $amount,
            'customer_name'  => $customer->name,
            'customer_email' => $customer->paymentGatewayEmail(),
            'customer_phone' => $customer->phone_number,
            'order_items'    => [
                [
                    'sku'      => 'PKG-' . ($customer->package_id ?? '0'),
                    'name'     => $customer->package->name ?? 'Internet Service',
                    'price'    => $amount,
                    'quantity' => 1,
                ]
            ],
            'expired_time'   => time() + (24 * 3600), // 24 hours expiry
            'signature'      => $signature,
        ];

        try {
            $response = PaymentHttp::client()
            ->withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
            ])
            ->post($this->baseUrl . '/transaction/create', $payload);

            if ($response->successful()) {
                $data = $response->json();
                
                if ($data['success'] ?? false) {
                    $result = $data['data'];
                    return [
                        'success'        => true,
                        'reference'      => $result['reference'],
                        'payment_url'    => $result['checkout_url'] ?? '',
                        'fee'            => (float) ($result['total_fee'] ?? 0),
                        'amount'         => (float) ($result['amount'] ?? $amount),
                        'qr_data'        => $result['qr_string'] ?? '',
                        'instructions'   => $result['instructions'] ?? [],
                        'raw_response'   => $result,
                    ];
                }

                throw new Exception($data['message'] ?? 'Tripay returned success = false');
            }

            throw new Exception("Tripay API HTTP Error: " . $response->status() . " - " . $response->body());
        } catch (Exception $e) {
            Log::error("Tripay createTransaction error for INV {$merchantRef}: " . $e->getMessage());
            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Verify the authenticity of a webhook request.
     */
    public function verifyWebhook(array $headers, array $payload): bool
    {
        $signatureHeader = $headers['x-callback-signature'][0] ?? ($headers['X-Callback-Signature'][0] ?? null);
        
        if (!$signatureHeader) {
            return false;
        }

        // Tripay sends raw JSON body as the payload to compute the HMAC signature
        $rawJson = request()->getContent();
        $calculatedSignature = hash_hmac('sha256', $rawJson, $this->privateKey);

        return hash_equals($calculatedSignature, $signatureHeader);
    }

    /**
     * Extract relevant data from the webhook payload.
     */
    public function extractWebhookData(array $payload): array
    {
        return [
            'invoice_number' => $payload['merchant_ref'] ?? '',
            'reference'      => $payload['reference'] ?? '',
            'status'         => strtolower($payload['status'] ?? ''), // e.g. "paid", "expired", "failed"
            'amount_paid'    => (float) ($payload['total_amount'] ?? 0),
            'fee'            => (float) ($payload['fee_amount'] ?? 0),
            'payment_method' => $payload['payment_method'] ?? 'unknown',
        ];
    }
}
