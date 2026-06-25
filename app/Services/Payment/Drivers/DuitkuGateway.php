<?php

namespace App\Services\Payment\Drivers;

use App\Models\Invoice;
use App\Services\BillingService;
use App\Services\Payment\PaymentGatewayInterface;
use App\Services\Payment\PaymentHttp;
use App\Services\SettingService;
use Illuminate\Support\Facades\Log;
use Exception;

class DuitkuGateway implements PaymentGatewayInterface
{
    protected string $merchantCode;
    protected string $apiKey;
    protected string $baseUrl;

    public function __construct()
    {
        $this->merchantCode = (string) config('services.duitku.merchant_code', '');
        $this->apiKey = (string) config('services.duitku.api_key', '');

        $mode = SettingService::get('payment.duitku.mode', 'sandbox');
        $this->baseUrl = $mode === 'production'
            ? 'https://passport.duitku.com/webapi/api/merchant'
            : 'https://sandbox.duitku.com/webapi/api/merchant';
    }

    /**
     * Create a payment transaction via Duitku API v2 inquiry.
     */
    public function createTransaction(Invoice $invoice, string $paymentMethod): array
    {
        if ($this->merchantCode === '' || $this->apiKey === '') {
            return [
                'success' => false,
                'message' => 'Kredensial Duitku belum lengkap. Isi Merchant Code dan API Key di menu Pengaturan.',
            ];
        }

        $customer = $invoice->customer;
        $merchantOrderId = $this->buildMerchantOrderId($invoice);
        $paymentAmount = (int) $invoice->total_amount;
        $signature = hash_hmac(
            'sha256',
            $this->merchantCode . $merchantOrderId . $paymentAmount,
            $this->apiKey
        );

        $appUrl = rtrim((string) config('app.url'), '/');

        $payload = [
            'merchantCode' => $this->merchantCode,
            'paymentAmount' => $paymentAmount,
            'merchantOrderId' => $merchantOrderId,
            'productDetails' => 'Tagihan internet ' . $invoice->invoice_number,
            'email' => $customer->paymentGatewayEmail(),
            'phoneNumber' => $customer->phone_number ?? '',
            'customerVaName' => $customer->name,
            'callbackUrl' => $appUrl . '/api/payment/callback',
            'returnUrl' => $appUrl . '/customer/dashboard',
            'signature' => $signature,
            'expiryPeriod' => 1440,
            'itemDetails' => [
                [
                    'name' => $customer->package->name ?? 'Layanan Internet',
                    'price' => $paymentAmount,
                    'quantity' => 1,
                ],
            ],
        ];

        if ($paymentMethod !== '' && $paymentMethod !== 'all') {
            $payload['paymentMethod'] = $paymentMethod;
        }

        try {
            $response = PaymentHttp::client()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])
                ->post($this->baseUrl . '/v2/inquiry', $payload);

            if (!$response->successful()) {
                throw new Exception('Duitku API HTTP Error: ' . $response->status() . ' - ' . $response->body());
            }

            $data = $response->json();

            if (($data['statusCode'] ?? '') !== '00') {
                throw new Exception($data['statusMessage'] ?? $data['Message'] ?? 'Duitku menolak permintaan transaksi.');
            }

            if (empty($data['paymentUrl'])) {
                throw new Exception('Duitku tidak mengembalikan paymentUrl.');
            }

            return [
                'success' => true,
                'reference' => $data['reference'] ?? $merchantOrderId,
                'payment_url' => $data['paymentUrl'],
                'fee' => 0.0,
                'amount' => (float) $paymentAmount,
                'qr_data' => '',
                'raw_response' => $data,
            ];
        } catch (Exception $e) {
            Log::error("Duitku createTransaction error for INV {$invoice->invoice_number}: " . $e->getMessage());

            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    public function verifyWebhook(array $headers, array $payload): bool
    {
        $merchantCode = (string) ($payload['merchantCode'] ?? '');
        $amount = (string) ($payload['amount'] ?? '');
        $merchantOrderId = (string) ($payload['merchantOrderId'] ?? '');
        $signature = (string) ($payload['signature'] ?? '');

        if ($merchantCode === '' || $amount === '' || $merchantOrderId === '' || $signature === '') {
            return false;
        }

        if ($this->apiKey === '') {
            return false;
        }

        $calculatedSignature = hash_hmac(
            'sha256',
            $merchantCode . $amount . $merchantOrderId,
            $this->apiKey
        );

        return hash_equals($calculatedSignature, $signature);
    }

    public function extractWebhookData(array $payload): array
    {
        $resultCode = (string) ($payload['resultCode'] ?? '');
        $status = match ($resultCode) {
            '00' => 'paid',
            '01' => 'failed',
            default => 'unpaid',
        };

        return [
            'invoice_number' => self::resolveInvoiceNumber((string) ($payload['merchantOrderId'] ?? '')),
            'reference' => (string) ($payload['reference'] ?? $payload['publisherOrderId'] ?? ''),
            'status' => $status,
            'amount_paid' => (float) ($payload['amount'] ?? 0),
            'fee' => 0.0,
            'payment_method' => BillingService::resolvePaymentMethodFromPayload('duitku', array_merge($payload, [
                'payment_method' => $payload['paymentCode'] ?? null,
            ])),
        ];
    }

    protected function buildMerchantOrderId(Invoice $invoice): string
    {
        $suffix = dechex(time() % 0xFFFFFFF);
        $base = $invoice->invoice_number;
        $orderId = $base . '~' . $suffix;

        if (strlen($orderId) > 50) {
            $maxBaseLength = 50 - strlen('~' . $suffix);
            $base = substr($base, 0, max(1, $maxBaseLength));
            $orderId = $base . '~' . $suffix;
        }

        return $orderId;
    }

    public static function resolveInvoiceNumber(string $merchantOrderId): string
    {
        if (str_contains($merchantOrderId, '~')) {
            return explode('~', $merchantOrderId, 2)[0];
        }

        return $merchantOrderId;
    }
}
