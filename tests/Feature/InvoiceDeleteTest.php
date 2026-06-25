<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Payment;
use App\Models\Router;
use App\Models\Setting;
use App\Models\User;
use App\Services\BillingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceDeleteTest extends TestCase
{
    use RefreshDatabase;

    private function makeCustomer(): Customer
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
            'name' => 'Paket 150K',
            'type' => 'pppoe',
            'price' => 150000,
            'bandwidth_limit' => '20M/20M',
            'mikrotik_profile' => '20M',
        ]);

        return Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust_' . uniqid(),
            'password' => 'pass',
            'name' => 'Pelanggan Delete Test',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => '2026-01-01',
        ]);
    }

    public function test_admin_can_delete_unpaid_invoice(): void
    {
        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0001-DEL',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'unpaid',
        ]);

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/delete', [
                'invoice_id' => $invoice->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('invoices', ['id' => $invoice->id]);
    }

    public function test_admin_can_delete_canceled_invoice(): void
    {
        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202605-0001-DEL',
            'billing_period' => '2026-05',
            'amount' => 5000,
            'days_billed' => 1,
            'is_prorated' => true,
            'tax' => 0,
            'total_amount' => 5000,
            'due_date' => '2026-06-28',
            'status' => 'canceled',
        ]);

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/delete', [
                'invoice_id' => $invoice->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('invoices', ['id' => $invoice->id]);
    }

    public function test_paid_invoice_without_void_path_cannot_be_deleted(): void
    {
        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0002-DEL',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        Payment::create([
            'invoice_id' => $invoice->id,
            'gateway_name' => 'tripay',
            'reference_number' => 'TRIPAY-TEST',
            'payment_method' => 'QRIS',
            'amount_paid' => 150000,
            'fee_charged' => 0,
        ]);

        Setting::updateOrCreate(['key' => 'payment.tripay.mode'], [
            'group' => 'payment',
            'value' => 'production',
            'is_encrypted' => false,
        ]);

        $this->assertFalse(BillingService::canDeleteInvoice($invoice->fresh(['payments', 'customer'])));

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/delete', [
                'invoice_id' => $invoice->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertDatabaseHas('invoices', ['id' => $invoice->id]);
    }

    public function test_admin_can_delete_paid_non_vps_midtrans_sandbox_invoice(): void
    {
        Setting::updateOrCreate(['key' => 'payment.active_gateway'], [
            'group' => 'payment',
            'value' => 'midtrans',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'payment.midtrans.mode'], [
            'group' => 'payment',
            'value' => 'sandbox',
            'is_encrypted' => false,
        ]);

        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0003-DEL',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        Payment::create([
            'invoice_id' => $invoice->id,
            'gateway_name' => 'midtrans',
            'reference_number' => 'SNAP-TEST',
            'payment_method' => 'QRIS',
            'amount_paid' => 150000,
            'fee_charged' => 0,
        ]);

        $this->assertTrue(BillingService::canDeleteInvoice($invoice->fresh(['payments', 'customer'])));

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/delete', [
                'invoice_id' => $invoice->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('invoices', ['id' => $invoice->id]);
        $this->assertDatabaseMissing('payments', ['invoice_id' => $invoice->id]);
    }

    public function test_admin_can_delete_paid_non_vps_tripay_sandbox_invoice(): void
    {
        Setting::updateOrCreate(['key' => 'payment.tripay.mode'], [
            'group' => 'payment',
            'value' => 'sandbox',
            'is_encrypted' => false,
        ]);

        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0004-DEL',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        Payment::create([
            'invoice_id' => $invoice->id,
            'gateway_name' => 'tripay',
            'reference_number' => 'TRIPAY-SANDBOX',
            'payment_method' => 'QRIS',
            'amount_paid' => 150000,
            'fee_charged' => 0,
        ]);

        $this->assertTrue(BillingService::canDeleteInvoice($invoice->fresh(['payments', 'customer'])));

        $this->actingAs($admin)
            ->post('/admin/invoices/delete', ['invoice_id' => $invoice->id])
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('invoices', ['id' => $invoice->id]);
    }

    public function test_admin_can_delete_paid_non_vps_duitku_sandbox_invoice(): void
    {
        Setting::updateOrCreate(['key' => 'payment.duitku.mode'], [
            'group' => 'payment',
            'value' => 'sandbox',
            'is_encrypted' => false,
        ]);

        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0005-DEL',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        Payment::create([
            'invoice_id' => $invoice->id,
            'gateway_name' => 'duitku',
            'reference_number' => 'DUITKU-SANDBOX',
            'payment_method' => 'VC',
            'amount_paid' => 150000,
            'fee_charged' => 0,
        ]);

        $this->assertTrue(BillingService::canVoidPaidInvoice($invoice->fresh(['payments', 'customer'])));

        $this->actingAs($admin)
            ->post('/admin/invoices/void-payment', ['invoice_id' => $invoice->id])
            ->assertRedirect()
            ->assertSessionHas('success');

        $invoice->refresh();
        $this->assertSame('unpaid', $invoice->status);
    }

    public function test_paid_vps_invoice_cannot_be_deleted_directly(): void
    {
        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'VPS-BUSINESS-0001-DEL',
            'billing_period' => 'vps:business',
            'amount' => 199000,
            'tax' => 0,
            'total_amount' => 199000,
            'due_date' => '2026-06-20',
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        Payment::create([
            'invoice_id' => $invoice->id,
            'gateway_name' => 'midtrans',
            'reference_number' => 'SNAP-VPS',
            'payment_method' => 'QRIS',
            'amount_paid' => 199000,
            'fee_charged' => 0,
        ]);

        Setting::updateOrCreate(['key' => 'payment.active_gateway'], [
            'group' => 'payment',
            'value' => 'midtrans',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'payment.midtrans.mode'], [
            'group' => 'payment',
            'value' => 'sandbox',
            'is_encrypted' => false,
        ]);

        $this->assertFalse(BillingService::canDeleteInvoice($invoice->fresh(['payments', 'customer'])));

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/delete', [
                'invoice_id' => $invoice->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertDatabaseHas('invoices', ['id' => $invoice->id]);
    }
}
