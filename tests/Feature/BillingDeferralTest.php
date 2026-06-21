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

    public function test_two_month_deferral_resolves_previous_and_anchor_periods(): void
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

        $this->assertSame(['2026-04', '2026-05'], $periods);
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
        $this->assertSame(['2026-05', '2026-06'], $deferral->periods);
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
}
