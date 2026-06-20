<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Payment;
use App\Models\Router;
use App\Models\User;
use App\Services\BillingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingReversePaymentTest extends TestCase
{
    use RefreshDatabase;

    private function makePaidManualInvoice(): Invoice
    {
        $user = User::factory()->create();
        $router = Router::create([
            'name' => 'Router Test',
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'secret',
            'protocol_type' => 'legacy_socket',
            'status' => false,
        ]);
        $package = Package::create([
            'name' => 'Paket 120K',
            'type' => 'pppoe',
            'price' => 120000,
            'bandwidth_limit' => '20M/20M',
            'mikrotik_profile' => '20M',
        ]);
        $customer = Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust_' . uniqid(),
            'password' => 'pass',
            'name' => 'Pelanggan Test',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 25,
            'service_start_date' => '2026-01-01',
        ]);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-REVERSE-TEST',
            'billing_period' => '2026-06',
            'amount' => 120000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 120000,
            'due_date' => Carbon::create(2026, 6, 25),
            'status' => 'paid',
            'paid_at' => Carbon::now(),
        ]);

        Payment::create([
            'invoice_id' => $invoice->id,
            'gateway_name' => 'manual',
            'reference_number' => 'ADMIN-CASH-TEST',
            'payment_method' => 'Cash / Tunai',
            'amount_paid' => 120000,
            'fee_charged' => 0,
        ]);

        return $invoice->load('payments', 'customer');
    }

    public function test_reverse_manual_payment_restores_unpaid_status(): void
    {
        $invoice = $this->makePaidManualInvoice();

        $this->assertTrue(BillingService::reverseManualPayment($invoice));

        $invoice->refresh();
        $this->assertSame('unpaid', $invoice->status);
        $this->assertNull($invoice->paid_at);
        $this->assertSame(0, Payment::where('invoice_id', $invoice->id)->count());
    }

    public function test_cannot_reverse_gateway_payment(): void
    {
        $invoice = $this->makePaidManualInvoice();
        Payment::where('invoice_id', $invoice->id)->update(['gateway_name' => 'tripay']);

        $this->expectException(\Exception::class);
        BillingService::reverseManualPayment($invoice->fresh(['payments', 'customer']));
    }

    public function test_admin_can_void_manual_payment_via_http(): void
    {
        $admin = User::factory()->create();
        $invoice = $this->makePaidManualInvoice();

        $response = $this->actingAs($admin)->post('/admin/invoices/void-payment', [
            'invoice_id' => $invoice->id,
        ]);

        $response->assertRedirect();
        $invoice->refresh();
        $this->assertSame('unpaid', $invoice->status);
    }
}
