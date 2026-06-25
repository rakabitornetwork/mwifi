<?php

namespace Tests\Unit;

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
}
