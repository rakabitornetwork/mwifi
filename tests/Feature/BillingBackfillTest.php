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

class BillingBackfillTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Setting::create([
            'group' => 'system',
            'key' => 'system.billing_prorata_enabled',
            'value' => '1',
            'is_encrypted' => false,
        ]);
    }

    private function makeCustomer(string $serviceStartDate = '2026-01-24', int $billingDay = 25): Customer
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
            'name' => 'Paket 100K',
            'type' => 'pppoe',
            'price' => 100000,
            'bandwidth_limit' => '10M/10M',
            'mikrotik_profile' => '10M',
        ]);

        return Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust_' . uniqid(),
            'password' => 'pass',
            'name' => 'Pelanggan Backfill',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => Carbon::createFromFormat('Y-m-d', "2026-01-{$billingDay}")->toDateString(),
            'service_start_date' => $serviceStartDate,
        ]);
    }

    public function test_resolve_missing_periods_from_service_start_through_current_month(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-26'));

        $customer = $this->makeCustomer();
        $periods = BillingService::resolveMissingBillingPeriods($customer);

        $this->assertSame(
            ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'],
            $periods
        );

        Carbon::setTestNow();
    }

    public function test_backfill_creates_only_missing_invoices(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-26'));

        $customer = $this->makeCustomer();

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202601-0001-TEST',
            'billing_period' => '2026-01',
            'amount' => 6666.67,
            'days_billed' => 2,
            'is_prorated' => true,
            'tax' => 0,
            'total_amount' => 6666.67,
            'due_date' => '2026-01-25',
            'status' => 'unpaid',
        ]);

        $result = BillingService::backfillInvoicesForCustomer($customer, 0, false);

        $this->assertSame(5, $result['count']);
        $this->assertSame(6, Invoice::where('customer_id', $customer->id)->count());
        $this->assertTrue(
            Invoice::where('customer_id', $customer->id)->where('billing_period', '2026-06')->exists()
        );

        Carbon::setTestNow();
    }

    public function test_backfill_skips_deferred_periods(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-26'));

        $customer = $this->makeCustomer();

        BillingDeferral::create([
            'customer_id' => $customer->id,
            'months_count' => 2,
            'periods' => ['2026-01', '2026-02'],
            'combined_due_date' => '2026-07-25',
            'status' => 'pending',
        ]);

        $periods = BillingService::resolveMissingBillingPeriods($customer);

        $this->assertNotContains('2026-01', $periods);
        $this->assertNotContains('2026-02', $periods);
        $this->assertContains('2026-03', $periods);

        Carbon::setTestNow();
    }

    public function test_preview_backfill_returns_line_items_and_total(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-03-15'));

        $customer = $this->makeCustomer();
        $preview = BillingService::previewBackfillInvoices($customer, 0);

        $this->assertSame(3, $preview['count']);
        $this->assertCount(3, $preview['lines']);
        $this->assertSame('2026-01', $preview['lines'][0]['period']);
        $this->assertGreaterThan(0, $preview['total_amount']);

        Carbon::setTestNow();
    }

    public function test_admin_can_backfill_customer_invoices_via_http(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-10'));

        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/backfill-customer', [
                'customer_id' => $customer->id,
                'due_extension_days' => 0,
                'send_whatsapp' => false,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertSame(4, Invoice::where('customer_id', $customer->id)->count());

        Carbon::setTestNow();
    }

    public function test_backfill_preview_endpoint_returns_json(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-02-20'));

        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $response = $this->actingAs($admin)
            ->postJson('/admin/invoices/backfill-preview', [
                'customer_id' => $customer->id,
                'due_extension_days' => 0,
            ]);

        $response->assertOk();
        $response->assertJsonPath('count', 2);

        Carbon::setTestNow();
    }

    public function test_backfill_rejects_when_no_missing_periods(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-02-20'));

        $customer = $this->makeCustomer();

        BillingService::backfillInvoicesForCustomer($customer, 0, false);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Tidak ada periode tagihan terlewat');

        BillingService::backfillInvoicesForCustomer($customer, 0, false);

        Carbon::setTestNow();
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

    public function test_backfill_sends_whatsapp_when_enabled(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-04-10'));
        $this->seedWhatsAppSettings();
        Http::fake([
            'http://127.0.0.1:3003/send-message' => Http::response(['success' => true], 200),
        ]);

        $customer = $this->makeCustomer();
        $result = BillingService::backfillInvoicesForCustomer($customer, 0, true);

        $this->assertSame(4, $result['count']);
        $this->assertSame($result['count'], $result['whatsapp_sent']);
        Http::assertSent(fn ($request) => $request->url() === 'http://127.0.0.1:3003/send-message');

        Carbon::setTestNow();
    }

    public function test_backfill_includes_all_periods_when_billing_date_is_future_anchor(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-26'));

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
            'name' => 'Paket 100K',
            'type' => 'pppoe',
            'price' => 100000,
            'bandwidth_limit' => '10M/10M',
            'mikrotik_profile' => '10M',
        ]);
        $customer = Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust_' . uniqid(),
            'password' => 'pass',
            'name' => 'Pelanggan Cimet',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => '2026-06-25',
            'service_start_date' => '2025-12-26',
        ]);

        $periods = BillingService::resolveMissingBillingPeriods($customer);

        $this->assertSame(
            ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'],
            $periods
        );

        $preview = BillingService::previewBackfillInvoices($customer, 0);
        $this->assertSame(6, $preview['count']);

        Carbon::setTestNow();
    }
}
