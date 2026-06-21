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
use Tests\TestCase;

class BillingDeferralTest extends TestCase
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

        Setting::create([
            'group' => 'system',
            'key' => 'system.billing_prorata_enabled',
            'value' => '0',
            'is_encrypted' => false,
        ]);

        Setting::create([
            'group' => 'system',
            'key' => 'system.tax_rate',
            'value' => '0',
            'is_encrypted' => false,
        ]);
    }

    private function makeCustomer(int $billingDate = 20): Customer
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
            'name' => 'Pelanggan Defer Test',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => $billingDate,
            'service_start_date' => '2026-01-01',
        ]);
    }

    public function test_two_month_deferral_resolves_anchor_and_next_periods(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-10'));

        $customer = $this->makeCustomer();

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202605-0001-TEST',
            'billing_period' => '2026-05',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-05-20',
            'status' => 'unpaid',
        ]);

        $periods = BillingService::resolveDeferralPeriods($customer, 2);

        $this->assertSame(['2026-05', '2026-06'], $periods);
    }

    public function test_two_month_deferral_without_unpaid_uses_current_and_next_month(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-10'));

        $customer = $this->makeCustomer();

        $periods = BillingService::resolveDeferralPeriods($customer, 2);

        $this->assertSame(['2026-06', '2026-07'], $periods);
    }

    public function test_admin_can_create_billing_deferral(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-10'));

        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $response = $this->actingAs($admin)
            ->post('/admin/billing/defer', [
                'customer_id' => $customer->id,
                'months_count' => 2,
                'combined_due_date' => '2026-07-25',
                'notes' => 'Kesepakatan pelanggan',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('billing_deferrals', [
            'customer_id' => $customer->id,
            'months_count' => 2,
            'status' => 'pending',
        ]);

        $deferral = BillingDeferral::first();
        $this->assertSame(['2026-06', '2026-07'], $deferral->periods);
    }

    public function test_scheduled_generation_skips_deferred_period(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-15'));

        $customer = $this->makeCustomer(20);

        BillingDeferral::create([
            'customer_id' => $customer->id,
            'months_count' => 1,
            'periods' => ['2026-06'],
            'combined_due_date' => '2026-07-25',
            'status' => 'pending',
        ]);

        $count = BillingService::generateScheduledInvoices(Carbon::parse('2026-06-15'));

        $this->assertSame(0, $count);
        $this->assertDatabaseMissing('invoices', [
            'customer_id' => $customer->id,
            'billing_period' => '2026-06',
            'status' => 'unpaid',
        ]);
    }

    public function test_accumulated_invoice_is_generated_on_deferral_schedule(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-20'));

        $customer = $this->makeCustomer(25);

        $deferral = BillingDeferral::create([
            'customer_id' => $customer->id,
            'months_count' => 2,
            'periods' => ['2026-06', '2026-07'],
            'combined_due_date' => '2026-07-25',
            'status' => 'pending',
        ]);

        $count = BillingService::processScheduledDeferrals(Carbon::parse('2026-07-20'));

        $this->assertSame(1, $count);

        $deferral->refresh();
        $this->assertSame('invoiced', $deferral->status);
        $this->assertNotNull($deferral->invoice_id);

        $invoice = Invoice::find($deferral->invoice_id);
        $this->assertTrue($invoice->is_accumulated);
        $this->assertSame(['2026-06', '2026-07'], $invoice->accumulated_periods);
        $this->assertSame(300000.0, (float) $invoice->amount);
        $this->assertSame('2026-07-25', $invoice->due_date->format('Y-m-d'));
    }

    public function test_isolated_customer_with_pending_deferral_is_not_isolated_again(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-25'));

        $customer = $this->makeCustomer(20);

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-OLD-0001-TEST',
            'billing_period' => '2026-04',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-05-01',
            'status' => 'unpaid',
        ]);

        BillingDeferral::create([
            'customer_id' => $customer->id,
            'months_count' => 1,
            'periods' => ['2026-06'],
            'combined_due_date' => '2026-07-25',
            'status' => 'pending',
        ]);

        $count = BillingService::isolatePastDueCustomers();

        $this->assertSame(0, $count);
        $this->assertSame('active', $customer->fresh()->status);
    }

    public function test_cancel_deferral_restores_canceled_invoices(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer(20);

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

        $deferral = BillingDeferral::create([
            'customer_id' => $customer->id,
            'months_count' => 1,
            'periods' => ['2026-06'],
            'combined_due_date' => '2026-07-25',
            'status' => 'pending',
        ]);

        $invoice->update(['status' => 'canceled']);

        $result = BillingService::cancelBillingDeferral($deferral);

        $this->assertSame(1, $result['restored_count']);
        $this->assertSame(0, $result['created_count']);
        $this->assertSame('cancelled', $deferral->fresh()->status);
        $this->assertSame('unpaid', $invoice->fresh()->status);
    }

    public function test_restore_canceled_invoice_endpoint(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-25'));

        $admin = User::factory()->create();
        $customer = $this->makeCustomer(20);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0005-TEST',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'canceled',
        ]);

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/restore-canceled', [
                'invoice_id' => $invoice->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertSame('unpaid', $invoice->fresh()->status);
        $this->assertSame('2026-07-02', $invoice->fresh()->due_date->format('Y-m-d'));
    }

    public function test_deferred_invoice_flagged_in_invoice_payload(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer(20);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0005-TEST',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'canceled',
        ]);

        BillingDeferral::create([
            'customer_id' => $customer->id,
            'months_count' => 2,
            'periods' => ['2026-05', '2026-06'],
            'combined_due_date' => '2026-07-28',
            'status' => 'pending',
        ]);

        $payload = BillingService::appendNextBillingToInvoices(collect([$invoice->fresh()]));
        $row = $payload[0];

        $this->assertTrue($row['is_deferred_by_pending']);
        $this->assertSame('2026-07-28', $row['deferred_combined_due_date']);
        $this->assertSame('2026-07-23', $row['deferred_accumulated_generate_on']);
    }

    public function test_preview_deferral_with_accumulated_unpaid_invoice_does_not_fail(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer(20);

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-ACC-202605202606-0001',
            'billing_period' => '2026-05+2026-06',
            'amount' => 155000,
            'days_billed' => 31,
            'is_prorated' => true,
            'is_accumulated' => true,
            'accumulated_periods' => ['2026-05', '2026-06'],
            'tax' => 0,
            'total_amount' => 155000,
            'due_date' => '2026-07-28',
            'status' => 'unpaid',
        ]);

        $preview = BillingService::previewBillingDeferral($customer, 2);

        $this->assertSame(['2026-06', '2026-07'], $preview['periods']);
        $this->assertGreaterThan(0, $preview['total_amount']);
    }

    public function test_preview_deferral_endpoint_with_accumulated_unpaid_invoice(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $admin = User::factory()->create();
        $customer = $this->makeCustomer(20);

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-ACC-202605202606-0001',
            'billing_period' => '2026-05+2026-06',
            'amount' => 155000,
            'days_billed' => 31,
            'is_prorated' => true,
            'is_accumulated' => true,
            'accumulated_periods' => ['2026-05', '2026-06'],
            'tax' => 0,
            'total_amount' => 155000,
            'due_date' => '2026-07-28',
            'status' => 'unpaid',
        ]);

        $response = $this->actingAs($admin)
            ->postJson('/admin/billing/defer/preview', [
                'customer_id' => $customer->id,
                'months_count' => 2,
            ]);

        $response->assertOk();
        $response->assertJsonPath('periods', ['2026-06', '2026-07']);
    }

    public function test_restore_canceled_invoice_blocked_during_active_deferral(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $admin = User::factory()->create();
        $customer = $this->makeCustomer(20);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0005-TEST',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'canceled',
        ]);

        BillingDeferral::create([
            'customer_id' => $customer->id,
            'months_count' => 2,
            'periods' => ['2026-05', '2026-06'],
            'combined_due_date' => '2026-07-28',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/restore-canceled', [
                'invoice_id' => $invoice->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertSame('canceled', $invoice->fresh()->status);
    }

    public function test_cancel_two_month_deferral_cancels_without_new_invoice(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer(28);

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202605-0005-BEBA',
            'billing_period' => '2026-05',
            'amount' => 5000,
            'days_billed' => 1,
            'is_prorated' => true,
            'tax' => 0,
            'total_amount' => 5000,
            'due_date' => '2026-06-28',
            'status' => 'canceled',
        ]);

        $june = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0005-E92D',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-28',
            'status' => 'canceled',
        ]);

        $deferral = BillingDeferral::create([
            'customer_id' => $customer->id,
            'months_count' => 2,
            'periods' => ['2026-06', '2026-07'],
            'combined_due_date' => '2026-07-28',
            'status' => 'pending',
        ]);

        $june->update(['status' => 'unpaid']);
        Invoice::where('customer_id', $customer->id)->where('billing_period', '2026-05')->update(['status' => 'unpaid']);

        $result = BillingService::cancelBillingDeferral($deferral);

        $this->assertSame(0, $result['accumulated_count']);
        $this->assertSame('cancelled', $deferral->fresh()->status);
        $this->assertSame(0, Invoice::where('customer_id', $customer->id)->where('is_accumulated', true)->where('status', 'unpaid')->count());
    }

    public function test_delete_accumulated_invoice_cancels_linked_deferral(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $admin = User::factory()->create();
        $customer = $this->makeCustomer(20);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-ACC-202606202607-0005-TEST',
            'billing_period' => '2026-06+2026-07',
            'amount' => 300000,
            'days_billed' => 60,
            'is_prorated' => false,
            'is_accumulated' => true,
            'accumulated_periods' => ['2026-06', '2026-07'],
            'tax' => 0,
            'total_amount' => 300000,
            'due_date' => '2026-07-20',
            'status' => 'unpaid',
        ]);

        $deferral = BillingDeferral::create([
            'customer_id' => $customer->id,
            'months_count' => 2,
            'periods' => ['2026-06', '2026-07'],
            'combined_due_date' => '2026-07-20',
            'status' => 'invoiced',
            'invoice_id' => $invoice->id,
        ]);

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/delete', [
                'invoice_id' => $invoice->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('invoices', ['id' => $invoice->id]);
        $this->assertSame('cancelled', $deferral->fresh()->status);
        $this->assertNull($deferral->fresh()->invoice_id);
    }

    public function test_repair_split_deferral_invoices(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer(28);

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202605-0005-BEBA',
            'billing_period' => '2026-05',
            'amount' => 5000,
            'days_billed' => 1,
            'is_prorated' => true,
            'tax' => 0,
            'total_amount' => 5000,
            'due_date' => '2026-06-28',
            'status' => 'unpaid',
        ]);

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0005-E92D',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-28',
            'status' => 'unpaid',
        ]);

        BillingDeferral::create([
            'customer_id' => $customer->id,
            'months_count' => 2,
            'periods' => ['2026-05', '2026-06'],
            'combined_due_date' => '2026-07-28',
            'status' => 'cancelled',
        ]);

        $repaired = BillingService::repairSplitDeferralInvoices();

        $this->assertSame(1, $repaired);
        $this->assertSame(1, Invoice::where('customer_id', $customer->id)->where('status', 'unpaid')->count());
        $this->assertDatabaseHas('invoices', [
            'customer_id' => $customer->id,
            'billing_period' => '2026-05+2026-06',
            'is_accumulated' => true,
            'status' => 'unpaid',
        ]);
    }
}
