<?php

namespace App\Services\Payment\Drivers;

use App\Models\Invoice;
use App\Services\Payment\PaymentGatewayInterface;
use App\Services\Payment\PaymentHttp;
use App\Services\SettingService;
use Illuminate\Support\Facades\Log;
use Exception;

class MidtransGateway implements PaymentGatewayInterface
{
    protected string $serverKey;
    protected string $clientKey;
    protected string $baseUrl;

    public function __construct()
    {
        $this->serverKey = config('services.midtrans.server_key', '');
        $this->clientKey = config('services.midtrans.client_key', '');

        $mode = SettingService::get('payment.midtrans.mode', 'sandbox');
        $this->baseUrl = ($mode === 'production') 
            ? 'https://app.midtrans.com/snap/v1/transactions' 
            : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
    }

    /**
     * Create a payment transaction using Snap API.
     */
    public function createTransaction(Invoice $invoice, string $paymentMethod): array
    {
        if ($this->serverKey === '') {
            return [
                'success' => false,
                'message' => 'Server Key Midtrans belum dikonfigurasi. Isi di menu Pengaturan → Midtrans Gateway.',
            ];
        }

        $customer = $invoice->customer;
        $orderId = $this->buildOrderId($invoice);
        $amount = (int) $invoice->total_amount;

        $payload = [
            'transaction_details' => [
                'order_id'     => $orderId,
                'gross_amount' => $amount,
            ],
            'customer_details' => [
                'first_name' => $customer->name,
                'email'      => $customer->paymentGatewayEmail(),
                'phone'      => $customer->phone_number,
            ],
            'item_details' => [
                [
                    'id'       => 'PKG-' . ($customer->package_id ?? '0'),
                    'name'     => $customer->package->name ?? 'Internet Service',
                    'price'    => $amount,
                    'quantity' => 1,
                ]
            ],
            // Expiry settings
            'expiry' => [
                'start_time' => date('Y-m-d H:i:s O'),
                'unit'       => 'hours',
                'duration'   => 24
            ]
        ];

        // Snap Redirect mode requires enabled_payments in the API request.
        // Dashboard Snap Preferences only apply to Snap Popup (snap.js), not redirect.
        $payload['enabled_payments'] = ($paymentMethod && $paymentMethod !== 'all')
            ? [$paymentMethod]
            : $this->defaultEnabledPayments();

        try {
            $response = PaymentHttp::client()
            ->withHeaders([
                'Content-Type'  => 'application/json',
                'Accept'        => 'application/json',
                'Authorization' => 'Basic ' . base64_encode($this->serverKey . ':'),
            ])
            ->post($this->baseUrl, $payload);

            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['token']) && isset($data['redirect_url'])) {
                    return [
                        'success'        => true,
                        'reference'      => $data['token'],
                        'payment_url'    => $data['redirect_url'],
                        'fee'            => 0.0, // Snap API gross_amount includes everything, fee is parsed/deducted by midtrans internally
                        'amount'         => (float) $amount,
                        'qr_data'        => '',
                        'raw_response'   => $data,
                    ];
                }

                throw new Exception('Midtrans returned no token or redirect URL.');
            }

            throw new Exception("Midtrans API HTTP Error: " . $response->status() . " - " . $response->body());
        } catch (Exception $e) {
            Log::error("Midtrans createTransaction error for INV {$orderId}: " . $e->getMessage());
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
        $signatureKey = $payload['signature_key'] ?? null;
        $orderId = $payload['order_id'] ?? null;
        $statusCode = $payload['status_code'] ?? null;
        $grossAmount = $payload['gross_amount'] ?? null;

        if (!$signatureKey || !$orderId || !$statusCode || !$grossAmount) {
            return false;
        }

        // Midtrans SHA512 signature key: order_id + status_code + gross_amount + server_key
        $rawString = $orderId . $statusCode . $grossAmount . $this->serverKey;
        $calculatedSignature = hash('sha512', $rawString);

        return hash_equals($calculatedSignature, $signatureKey);
    }

    /**
     * Extract relevant data from the webhook payload.
     */
    public function extractWebhookData(array $payload): array
    {
        $transactionStatus = $payload['transaction_status'] ?? '';
        $fraudStatus = $payload['fraud_status'] ?? '';
        
        $status = 'unpaid';
        if ($transactionStatus === 'capture') {
            if ($fraudStatus === 'challenge') {
                $status = 'challenge';
            } elseif ($fraudStatus === 'accept') {
                $status = 'paid';
            }
        } elseif ($transactionStatus === 'settlement') {
            $status = 'paid';
        } elseif (in_array($transactionStatus, ['cancel', 'deny', 'expire'])) {
            $status = 'failed';
        } elseif ($transactionStatus === 'pending') {
            $status = 'unpaid';
        }

        return [
            'invoice_number' => self::resolveInvoiceNumber((string) ($payload['order_id'] ?? '')),
            'reference'      => $payload['transaction_id'] ?? '',
            'status'         => $status,
            'amount_paid'    => (float) ($payload['gross_amount'] ?? 0),
            'fee'            => 0.0, // Midtrans handles merchant fee inside their dashboard invoice
            'payment_method' => $payload['payment_type'] ?? 'unknown',
        ];
    }

    /**
     * Build a unique Midtrans order_id per payment attempt.
     * Midtrans rejects duplicate order_id for the same merchant.
     */
    protected function buildOrderId(Invoice $invoice): string
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

    /**
     * Map Midtrans order_id back to the mWiFi invoice_number.
     */
    public static function resolveInvoiceNumber(string $orderId): string
    {
        if (str_contains($orderId, '~')) {
            return explode('~', $orderId, 2)[0];
        }

        return $orderId;
    }

    /**
     * Default Snap payment channels for Indonesian ISP billing (Snap Redirect mode).
     *
     * @return list<string>
     */
    protected function defaultEnabledPayments(): array
    {
        return [
            'gopay',
            'qris',
            'other_qris',
            'shopeepay',
            'ovo',
            'dana',
            'bank_transfer',
            'other_va',
            'alfamart',
            'indomaret',
        ];
    }
}
