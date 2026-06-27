<?php

namespace Tests\Feature;

use App\Models\BillingDeferral;
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

class BillingCustomerInvoiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Setting::create([
            'group' => 'system',
            'key' => 'system.billing_generate_days_before',
            'value' => '5',
            'is_encrypted' => false,
        ]);
    }

    private function makeCustomer(int $billingDate = 25, string $serviceStartDate = '2026-01-01'): Customer
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
            'name' => 'Pelanggan Test',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => $billingDate,
            'service_start_date' => $serviceStartDate,
        ]);
    }

    public function test_admin_can_generate_invoice_for_single_customer(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/generate-customer', [
                'customer_id' => $customer->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertSame(1, Invoice::where('customer_id', $customer->id)->count());
        $invoice = Invoice::where('customer_id', $customer->id)->first();
        $this->assertSame('2026-06', $invoice->billing_period);
        $this->assertSame('unpaid', $invoice->status);
    }

    public function test_generate_invoice_for_customer_rejects_duplicate_period(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer();

        BillingService::generateInvoiceForCustomer($customer);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('sudah ada');

        BillingService::generateInvoiceForCustomer($customer);
    }

    public function test_generate_invoice_for_customer_rejects_deferred_period(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer();

        BillingDeferral::create([
            'customer_id' => $customer->id,
            'months_count' => 1,
            'periods' => ['2026-06'],
            'combined_due_date' => '2026-07-25',
            'status' => 'pending',
        ]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('ditunda');

        BillingService::generateInvoiceForCustomer($customer);
    }

    public function test_generate_invoice_for_customer_requires_package(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer();
        $customer->update(['package_id' => null]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('paket');

        BillingService::generateInvoiceForCustomer($customer->fresh());
    }

    public function test_manual_invoice_skips_due_extension_when_zero(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer(5, '2026-06-01');

        $created = BillingService::generateInvoiceForCustomer($customer, null, 0);

        $this->assertSame('2026-06-05', $created['due_date']);
        $this->assertSame('2026-06-05', Invoice::first()->due_date->format('Y-m-d'));
    }

    public function test_admin_can_generate_invoice_without_due_extension(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $admin = User::factory()->create();
        $customer = $this->makeCustomer(5, '2026-06-01');

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/generate-customer', [
                'customer_id' => $customer->id,
                'due_extension_days' => 0,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertSame('2026-06-05', Invoice::first()->due_date->format('Y-m-d'));
    }

    public function test_manual_invoice_uses_selected_due_extension_days(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer(5, '2026-06-01');

        $created = BillingService::generateInvoiceForCustomer($customer, null, 3);

        $this->assertSame('2026-06-23', $created['due_date']);
        $this->assertSame('2026-06-23', Invoice::first()->due_date->format('Y-m-d'));
    }

    public function test_manual_invoice_keeps_scheduled_due_date_when_still_in_future(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer(25);

        $created = BillingService::generateInvoiceForCustomer($customer, null, 3);

        $this->assertSame('2026-06-25', $created['due_date']);
    }

    public function test_manual_generate_uses_next_period_for_long_term_customer_outside_schedule_window(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-27'));

        $customer = $this->makeCustomer(3, '2025-11-26');
        $customer->update(['billing_date' => '2026-07-03']);

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0001-TEST',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-03',
            'status' => 'paid',
            'paid_at' => '2026-06-10',
        ]);

        $created = BillingService::generateInvoiceForCustomer($customer->fresh(), null, 0);

        $this->assertSame('2026-07', $created['billing_period']);
        $this->assertSame('2026-07-03', $created['due_date']);

        $billing = BillingService::enrichCustomerBillingFields($customer->fresh());
        $this->assertSame('2026-07-03', $billing['upcoming_due_date']);
        $this->assertSame('2026-07-03', $customer->fresh()->billing_date?->format('Y-m-d'));
    }

    public function test_admin_can_pass_due_extension_days_when_generating_invoice(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $admin = User::factory()->create();
        $customer = $this->makeCustomer(5, '2026-06-01');

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/generate-customer', [
                'customer_id' => $customer->id,
                'due_extension_days' => 5,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertSame('2026-06-25', Invoice::first()->due_date->format('Y-m-d'));
    }

    public function test_manual_invoice_reactivates_isolated_customer_after_due_extension(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer(11, '2026-06-01');
        $customer->update(['status' => 'isolated']);

        BillingService::generateInvoiceForCustomer($customer, null, 7);

        $this->assertSame('active', $customer->fresh()->status);
        $this->assertSame('2026-06-27', Invoice::first()->due_date->format('Y-m-d'));
        $this->assertFalse(BillingService::customerHasPastDueUnpaidInvoices($customer->fresh()));
    }

    public function test_manual_invoice_does_not_reactivate_while_other_past_due_invoices_remain(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer(11);
        $customer->update(['status' => 'isolated']);

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202605-0001-TEST',
            'billing_period' => '2026-05',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-05-11',
            'status' => 'unpaid',
        ]);

        BillingService::generateInvoiceForCustomer($customer, null, 7);

        $this->assertSame('isolated', $customer->fresh()->status);
    }

    public function test_reactivate_customer_if_billing_clear_restores_isolated_customer(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer(11);
        $customer->update(['status' => 'isolated']);

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0001-TEST',
            'billing_period' => '2026-06',
            'amount' => 100000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 100000,
            'due_date' => '2026-06-25',
            'status' => 'unpaid',
        ]);

        $this->assertTrue(BillingService::reactivateCustomerIfBillingClear($customer));
        $this->assertSame('active', $customer->fresh()->status);
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

    public function test_generate_customer_invoice_skips_whatsapp_when_disabled(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));
        $this->seedWhatsAppSettings();
        Http::fake([
            'http://127.0.0.1:3003/send-message' => Http::response(['success' => true], 200),
        ]);

        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/generate-customer', [
                'customer_id' => $customer->id,
                'send_whatsapp' => false,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        Http::assertNothingSent();
    }

    public function test_generate_customer_invoice_sends_whatsapp_when_enabled(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));
        $this->seedWhatsAppSettings();
        Http::fake([
            'http://127.0.0.1:3003/send-message' => Http::response(['success' => true], 200),
        ]);

        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/generate-customer', [
                'customer_id' => $customer->id,
                'send_whatsapp' => true,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        Http::assertSent(fn ($request) => $request->url() === 'http://127.0.0.1:3003/send-message');
    }
}
