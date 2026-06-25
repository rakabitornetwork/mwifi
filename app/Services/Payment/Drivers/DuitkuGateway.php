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
    protected string $popBaseUrl;

    public function __construct()
    {
        $this->merchantCode = (string) config('services.duitku.merchant_code', '');
        $this->apiKey = (string) config('services.duitku.api_key', '');

        $mode = SettingService::get('payment.duitku.mode', 'sandbox');
        $isProduction = $mode === 'production';
        $this->baseUrl = $isProduction
            ? 'https://passport.duitku.com/webapi/api/merchant'
            : 'https://sandbox.duitku.com/webapi/api/merchant';
        $this->popBaseUrl = $isProduction
            ? 'https://api-prod.duitku.com/api/merchant'
            : 'https://api-sandbox.duitku.com/api/merchant';
    }

    /**
     * Create a payment transaction via Duitku.
     * Uses POP createInvoice when no specific channel is chosen (hosted checkout),
     * otherwise uses API v2 inquiry with a payment method code.
     */
    public function createTransaction(Invoice $invoice, string $paymentMethod): array
    {
        if ($this->merchantCode === '' || $this->apiKey === '') {
            return [
                'success' => false,
                'message' => 'Kredensial Duitku belum lengkap. Isi Merchant Code dan API Key di menu Pengaturan.',
            ];
        }

        $paymentCode = $this->resolveDuitkuPaymentCode($paymentMethod);

        if ($paymentCode === null) {
            return $this->createPopInvoice($invoice);
        }

        return $this->createV2Inquiry($invoice, $paymentCode);
    }

    protected function createPopInvoice(Invoice $invoice): array
    {
        $customer = $invoice->customer;
        $merchantOrderId = $this->buildMerchantOrderId($invoice);
        $paymentAmount = (int) $invoice->total_amount;
        $appUrl = rtrim((string) config('app.url'), '/');
        [$firstName, $lastName] = $this->splitCustomerName($customer->name);
        $phoneNumber = (string) ($customer->phone_number ?? '');
        $addressLine = trim((string) ($customer->address ?? '')) ?: 'Indonesia';

        $address = [
            'firstName' => $firstName,
            'lastName' => $lastName,
            'address' => $addressLine,
            'city' => 'Indonesia',
            'postalCode' => '00000',
            'phone' => $phoneNumber,
            'countryCode' => 'ID',
        ];

        $payload = [
            'paymentAmount' => $paymentAmount,
            'merchantOrderId' => $merchantOrderId,
            'productDetails' => 'Tagihan internet ' . $invoice->invoice_number,
            'additionalParam' => '',
            'merchantUserInfo' => '',
            'paymentMethod' => '',
            'customerVaName' => $customer->name,
            'email' => $customer->paymentGatewayEmail(),
            'phoneNumber' => $phoneNumber,
            'itemDetails' => [
                [
                    'name' => $customer->package->name ?? 'Layanan Internet',
                    'price' => $paymentAmount,
                    'quantity' => 1,
                ],
            ],
            'customerDetail' => [
                'firstName' => $firstName,
                'lastName' => $lastName,
                'email' => $customer->paymentGatewayEmail(),
                'phoneNumber' => $phoneNumber,
                'billingAddress' => $address,
                'shippingAddress' => $address,
            ],
            'callbackUrl' => $appUrl . '/api/payment/callback',
            'returnUrl' => $appUrl . '/customer/dashboard',
            'expiryPeriod' => 60,
        ];

        try {
            $timestamp = (string) (int) round(microtime(true) * 1000);
            $signature = hash_hmac('sha256', $this->merchantCode . $timestamp, $this->apiKey);

            $response = PaymentHttp::client()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                    'x-duitku-timestamp' => $timestamp,
                    'x-duitku-signature' => $signature,
                    'x-duitku-merchantcode' => $this->merchantCode,
                ])
                ->post($this->popBaseUrl . '/createInvoice', $payload);

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
            Log::error("Duitku createPopInvoice error for INV {$invoice->invoice_number}: " . $e->getMessage());

            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    protected function createV2Inquiry(Invoice $invoice, string $paymentCode): array
    {
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
            'paymentMethod' => $paymentCode,
            'expiryPeriod' => 1440,
            'itemDetails' => [
                [
                    'name' => $customer->package->name ?? 'Layanan Internet',
                    'price' => $paymentAmount,
                    'quantity' => 1,
                ],
            ],
        ];

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
                'qr_data' => $data['qrString'] ?? '',
                'raw_response' => $data,
            ];
        } catch (Exception $e) {
            Log::error("Duitku createV2Inquiry error for INV {$invoice->invoice_number}: " . $e->getMessage());

            return [
                'success' => false,
                'message' => $e->getMessage(),
            ];
        }
    }

    protected function resolveDuitkuPaymentCode(string $paymentMethod): ?string
    {
        $method = strtolower(trim($paymentMethod));

        if ($method === '' || $method === 'all') {
            return null;
        }

        if (preg_match('/^[a-z0-9]{2}$/', $method)) {
            return strtoupper($method);
        }

        return match ($method) {
            'qris' => 'SQ',
            'bcamaca', 'bca_va', 'bca' => 'BC',
            'mandiriva', 'mandiri_va', 'mandiri' => 'M2',
            'briva', 'bri_va', 'bri' => 'BR',
            'alfamart' => 'FT',
            'dana' => 'DA',
            'ovo' => 'OV',
            'shopeepay' => 'SP',
            'indomaret' => 'IR',
            default => strtoupper($method),
        };
    }

    /**
     * @return array{0: string, 1: string}
     */
    protected function splitCustomerName(?string $name): array
    {
        $parts = preg_split('/\s+/', trim((string) $name), 2) ?: [];

        return [
            $parts[0] !== '' ? $parts[0] : 'Pelanggan',
            $parts[1] ?? '',
        ];
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
