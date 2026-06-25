<?php

namespace Tests\Unit;

use App\Services\Payment\Drivers\DuitkuGateway;
use App\Services\Payment\Drivers\MidtransGateway;
use App\Services\Payment\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentWebhookResolutionTest extends TestCase
{
    use RefreshDatabase;
    public function test_detects_midtrans_webhook_from_payload(): void
    {
        $payload = [
            'signature_key' => 'abc',
            'order_id' => 'INV-001',
            'status_code' => '200',
            'gross_amount' => '10000.00',
        ];

        [$driver, $gateway] = PaymentService::resolveDriverForWebhook([], $payload);

        $this->assertInstanceOf(MidtransGateway::class, $driver);
        $this->assertSame('midtrans', $gateway);
    }

    public function test_midtrans_signature_uses_string_gross_amount(): void
    {
        $serverKey = 'SB-Mid-server-test-key';
        config(['services.midtrans.server_key' => $serverKey]);

        $payload = [
            'order_id' => 'INV-TEST-001~abc123',
            'status_code' => '200',
            'gross_amount' => '150000.00',
        ];
        $payload['signature_key'] = hash(
            'sha512',
            $payload['order_id'] . $payload['status_code'] . $payload['gross_amount'] . $serverKey
        );

        $gateway = new MidtransGateway();

        $this->assertTrue($gateway->verifyWebhook([], $payload));
    }

    public function test_resolves_invoice_number_from_midtrans_order_id_suffix(): void
    {
        $this->assertSame(
            'INV-202606-0974-5FDF',
            MidtransGateway::resolveInvoiceNumber('INV-202606-0974-5FDF~1a2b3c4')
        );
        $this->assertSame(
            'INV-202606-0974-5FDF',
            MidtransGateway::resolveInvoiceNumber('INV-202606-0974-5FDF')
        );
    }

    public function test_midtrans_webhook_extracts_readable_payment_method(): void
    {
        $gateway = new MidtransGateway();

        $data = $gateway->extractWebhookData([
            'order_id' => 'INV-TEST-001',
            'transaction_status' => 'settlement',
            'gross_amount' => '28000.00',
            'payment_type' => 'qris',
            'transaction_id' => 'trx-123',
        ]);

        $this->assertSame('paid', $data['status']);
        $this->assertSame('QRIS', $data['payment_method']);
    }

    public function test_midtrans_bank_transfer_uses_va_bank_label(): void
    {
        $gateway = new MidtransGateway();

        $data = $gateway->extractWebhookData([
            'order_id' => 'INV-TEST-002',
            'transaction_status' => 'settlement',
            'gross_amount' => '150000.00',
            'payment_type' => 'bank_transfer',
            'va_numbers' => [['bank' => 'bca', 'va_number' => '1234567890']],
            'transaction_id' => 'trx-456',
        ]);

        $this->assertSame('VA BCA', $data['payment_method']);
    }

    public function test_detects_duitku_webhook_from_payload(): void
    {
        $payload = [
            'merchantCode' => 'D12345',
            'merchantOrderId' => 'INV-001',
            'amount' => '10000',
            'signature' => 'abc',
            'resultCode' => '00',
        ];

        [$driver, $gateway] = PaymentService::resolveDriverForWebhook([], $payload);

        $this->assertInstanceOf(DuitkuGateway::class, $driver);
        $this->assertSame('duitku', $gateway);
    }

    public function test_duitku_signature_verification(): void
    {
        $apiKey = 'duitku-test-api-key';
        config(['services.duitku.api_key' => $apiKey]);

        $payload = [
            'merchantCode' => 'D12345',
            'merchantOrderId' => 'INV-TEST-001~abc123',
            'amount' => '150000',
        ];
        $payload['signature'] = hash_hmac(
            'sha256',
            $payload['merchantCode'] . $payload['amount'] . $payload['merchantOrderId'],
            $apiKey
        );

        $gateway = new DuitkuGateway();

        $this->assertTrue($gateway->verifyWebhook([], $payload));
    }

    public function test_resolves_invoice_number_from_duitku_merchant_order_id_suffix(): void
    {
        $this->assertSame(
            'INV-202606-0974-5FDF',
            DuitkuGateway::resolveInvoiceNumber('INV-202606-0974-5FDF~1a2b3c4')
        );
        $this->assertSame(
            'INV-202606-0974-5FDF',
            DuitkuGateway::resolveInvoiceNumber('INV-202606-0974-5FDF')
        );
    }

    public function test_duitku_webhook_extracts_readable_payment_method(): void
    {
        $gateway = new DuitkuGateway();

        $data = $gateway->extractWebhookData([
            'merchantOrderId' => 'INV-TEST-001',
            'resultCode' => '00',
            'amount' => '28000',
            'paymentCode' => 'SQ',
            'reference' => 'ref-123',
        ]);

        $this->assertSame('paid', $data['status']);
        $this->assertSame('ShopeePay QRIS', $data['payment_method']);
    }
}
