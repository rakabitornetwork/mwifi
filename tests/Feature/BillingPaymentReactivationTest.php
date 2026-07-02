<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Router;
use App\Models\Setting;
use App\Models\User;
use App\Services\BillingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BillingPaymentReactivationTest extends TestCase
{
    use RefreshDatabase;

    private function makeIsolatedCustomer(): array
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
        $customer = Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust_' . uniqid(),
            'password' => 'pass',
            'name' => 'Pelanggan Isolir',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'isolated',
            'billing_date' => 25,
            'service_start_date' => '2026-01-01',
        ]);

        return compact('customer', 'package');
    }

    public function test_payment_reactivates_isolated_customer_when_no_other_past_due_invoices(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-25'));

        ['customer' => $customer] = $this->makeIsolatedCustomer();

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0001-TEST',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'unpaid',
        ]);

        $success = BillingService::processPaidInvoice(
            $invoice,
            'manual',
            'ADMIN-CASH-TEST',
            150000,
            0,
            ['payment_method' => 'Cash / Tunai']
        );

        $this->assertTrue($success);
        $this->assertSame('paid', $invoice->fresh()->status);
        $this->assertSame('active', $customer->fresh()->status);
    }

    public function test_payment_does_not_reactivate_while_other_past_due_invoices_remain(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-25'));

        ['customer' => $customer] = $this->makeIsolatedCustomer();

        $older = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202605-0001-TEST',
            'billing_period' => '2026-05',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-05-25',
            'status' => 'unpaid',
        ]);

        $newer = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0002-TEST',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'unpaid',
        ]);

        BillingService::processPaidInvoice(
            $newer,
            'manual',
            'ADMIN-CASH-TEST-2',
            150000
        );

        $this->assertSame('paid', $newer->fresh()->status);
        $this->assertSame('unpaid', $older->fresh()->status);
        $this->assertSame('isolated', $customer->fresh()->status);
    }

    public function test_payment_reactivates_when_db_status_active_but_overdue_cleared(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-25'));

        ['customer' => $customer] = $this->makeIsolatedCustomer();
        $customer->update(['status' => 'active']);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0003-TEST',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'unpaid',
        ]);

        BillingService::processPaidInvoice(
            $invoice,
            'manual',
            'ADMIN-CASH-TEST-3',
            150000
        );

        $this->assertSame('active', $customer->fresh()->status);
        $this->assertTrue(BillingService::customerHasPastDueUnpaidInvoices($customer->fresh()) === false);
    }

    public function test_early_payment_on_active_customer_skips_router_reactivation(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-10'));

        $user = User::factory()->create();
        $router = Router::create([
            'name' => 'Router Active Early Pay',
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'secret',
            'protocol_type' => 'legacy_socket',
            'status' => true,
        ]);
        $package = Package::create([
            'name' => 'Paket 150K',
            'type' => 'pppoe',
            'price' => 150000,
            'bandwidth_limit' => '20M/20M',
            'mikrotik_profile' => '20M',
        ]);
        $customer = Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust_active_' . uniqid(),
            'password' => 'pass',
            'name' => 'Pelanggan Aktif',
            'phone_number' => '6281234567891',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 25,
            'service_start_date' => '2026-01-01',
        ]);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-EARLY-TEST',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-25',
            'status' => 'unpaid',
        ]);

        $this->assertTrue(BillingService::reactivateCustomerOnRouter($customer));

        $message = BillingService::buildPaidInvoiceWhatsAppMessage($invoice, includeReactivationNote: false);
        $this->assertNotNull($message);
        $this->assertStringNotContainsString('aktif kembali', strtolower($message));

        $success = BillingService::processPaidInvoice(
            $invoice,
            'manual',
            'ADMIN-CASH-EARLY',
            150000,
            0,
            ['payment_method' => 'Cash / Tunai']
        );

        $this->assertTrue($success);
        $this->assertSame('paid', $invoice->fresh()->status);
        $this->assertSame('active', $customer->fresh()->status);
    }

    public function test_midtrans_webhook_payload_stores_readable_payment_method(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-25'));

        ['customer' => $customer] = $this->makeIsolatedCustomer();
        $customer->update(['status' => 'active']);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202607-MIDTRANS',
            'billing_period' => '2026-07',
            'amount' => 28000,
            'days_billed' => 7,
            'is_prorated' => true,
            'tax' => 0,
            'total_amount' => 28000,
            'due_date' => '2026-07-01',
            'status' => 'unpaid',
        ]);

        $success = BillingService::processPaidInvoice(
            $invoice,
            'midtrans',
            'trx-midtrans-001',
            28000,
            0,
            [
                'transaction_status' => 'settlement',
                'payment_type' => 'qris',
                'gross_amount' => '28000.00',
            ]
        );

        $this->assertTrue($success);
        $payment = $invoice->fresh()->payments()->first();
        $this->assertNotNull($payment);
        $this->assertSame('QRIS', $payment->payment_method);
        $this->assertSame(
            'QRIS',
            BillingService::formatPaymentMethodLabel($payment->payment_method, $payment->gateway_name)
        );
    }

    public function test_duitku_webhook_payload_stores_readable_payment_method(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-25'));

        ['customer' => $customer] = $this->makeIsolatedCustomer();
        $customer->update(['status' => 'active']);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202607-DUITKU',
            'billing_period' => '2026-07',
            'amount' => 28000,
            'days_billed' => 7,
            'is_prorated' => true,
            'tax' => 0,
            'total_amount' => 28000,
            'due_date' => '2026-07-01',
            'status' => 'unpaid',
        ]);

        $success = BillingService::processPaidInvoice(
            $invoice,
            'duitku',
            'ref-duitku-001',
            28000,
            0,
            [
                'resultCode' => '00',
                'paymentCode' => 'BC',
                'amount' => '28000',
            ]
        );

        $this->assertTrue($success);
        $payment = $invoice->fresh()->payments()->first();
        $this->assertNotNull($payment);
        $this->assertSame('VA BCA', $payment->payment_method);
        $this->assertSame(
            'VA BCA',
            BillingService::formatPaymentMethodLabel($payment->payment_method, $payment->gateway_name)
        );
    }

    private function seedWhatsAppSettings(): void
    {
        Setting::updateOrCreate(['key' => 'whatsapp.enabled'], [
            'group' => 'whatsapp',
            'value' => '1',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'whatsapp.api_url'], [
            'group' => 'whatsapp',
            'value' => 'http://127.0.0.1:3003',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'whatsapp.session_id'], [
            'group' => 'whatsapp',
            'value' => 'mwifi_session',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'whatsapp.bulk_delay_enabled'], [
            'group' => 'whatsapp',
            'value' => '0',
            'is_encrypted' => false,
        ]);
        \App\Services\WhatsAppService::resetBulkDelayState();
    }

    public function test_manual_payment_skips_whatsapp_when_disabled(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-25'));
        $this->seedWhatsAppSettings();
        Http::fake([
            'http://127.0.0.1:3003/send-message' => Http::response(['success' => true], 200),
        ]);

        ['customer' => $customer] = $this->makeIsolatedCustomer();
        $admin = User::factory()->create();

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-NOWA-TEST',
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
            ->post('/admin/invoices/pay-manual', [
                'invoice_id' => $invoice->id,
                'send_whatsapp' => false,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertSame('paid', $invoice->fresh()->status);
        $this->assertSame('active', $customer->fresh()->status);
        Http::assertNothingSent();
    }

    public function test_process_paid_invoice_skips_whatsapp_when_flag_disabled(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-25'));
        $this->seedWhatsAppSettings();
        Http::fake([
            'http://127.0.0.1:3003/send-message' => Http::response(['success' => true], 200),
        ]);

        ['customer' => $customer] = $this->makeIsolatedCustomer();

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-FLAG-TEST',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'unpaid',
        ]);

        $success = BillingService::processPaidInvoice(
            $invoice,
            'manual',
            'ADMIN-CASH-NOWA',
            150000,
            0,
            ['payment_method' => 'Cash / Tunai'],
            false
        );

        $this->assertTrue($success);
        Http::assertNothingSent();
    }

    public function test_payment_does_not_reactivate_inactive_customer(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-25'));

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
        $customer = Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust_inactive_' . uniqid(),
            'password' => 'pass',
            'name' => 'Pelanggan Nonaktif',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'inactive',
            'billing_date' => 25,
            'service_start_date' => '2026-01-01',
        ]);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-INACTIVE-TEST',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'unpaid',
        ]);

        $success = BillingService::processPaidInvoice(
            $invoice,
            'manual',
            'ADMIN-CASH-INACTIVE',
            150000
        );

        $this->assertTrue($success);
        $this->assertSame('inactive', $customer->fresh()->status);
    }
}
