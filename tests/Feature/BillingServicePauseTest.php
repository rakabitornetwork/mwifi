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
use Tests\TestCase;

class BillingServicePauseTest extends TestCase
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

    private function makeActiveCustomer(string $billingDate = '2026-07-01'): Customer
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
            'name' => 'Pelanggan Postpaid',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => $billingDate,
            'service_start_date' => '2020-01-01',
        ]);
    }

    public function test_pause_prorata_charges_usage_from_cycle_start_to_pause_date(): void
    {
        $customer = $this->makeActiveCustomer('2026-07-01');
        $pauseDate = Carbon::parse('2026-07-14');

        $billing = BillingService::calculatePausePeriodInvoiceAmount(
            $customer,
            '2026-07',
            $pauseDate,
            150000
        );

        $this->assertNotNull($billing);
        $this->assertTrue($billing['is_prorated']);
        $this->assertSame(14, $billing['days_billed']);
        $this->assertSame(70000.0, $billing['amount']);
    }

    public function test_initiate_pause_creates_invoice_and_keeps_customer_active(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-14'));

        $customer = $this->makeActiveCustomer('2026-07-01');

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0001',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-01',
            'status' => 'paid',
            'paid_at' => '2026-06-01 10:00:00',
        ]);

        $result = BillingService::initiateServicePause(
            $customer,
            Carbon::parse('2026-07-14'),
            'inactive'
        );

        $this->assertTrue($result['pending_payment']);
        $this->assertSame('2026-07', $result['billing_period']);
        $this->assertSame(14, $result['days_billed']);

        $customer->refresh();
        $this->assertSame('active', $customer->status);
        $this->assertSame('inactive', $customer->pending_pause_status);
        $this->assertSame('2026-07-14', $customer->billing_pause_date->format('Y-m-d'));

        $invoice = Invoice::where('customer_id', $customer->id)
            ->where('billing_period', '2026-07')
            ->first();

        $this->assertNotNull($invoice);
        $this->assertSame('unpaid', $invoice->status);
        $this->assertSame(14, $invoice->days_billed);
        $this->assertSame(70000.0, (float) $invoice->amount);

        Carbon::setTestNow();
    }

    public function test_customer_becomes_inactive_after_pause_invoice_paid(): void
    {
        $customer = $this->makeActiveCustomer('2026-07-01');
        $customer->update([
            'billing_pause_date' => '2026-07-14',
            'pending_pause_status' => 'inactive',
        ]);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202607-0001',
            'billing_period' => '2026-07',
            'amount' => 70000,
            'days_billed' => 14,
            'is_prorated' => true,
            'tax' => 0,
            'total_amount' => 70000,
            'due_date' => '2026-07-21',
            'status' => 'paid',
            'paid_at' => '2026-07-15 10:00:00',
        ]);

        $completed = BillingService::completePendingServicePause($customer->fresh(), $invoice);

        $this->assertTrue($completed);
        $customer->refresh();
        $this->assertSame('inactive', $customer->status);
        $this->assertNull($customer->billing_pause_date);
        $this->assertNull($customer->pending_pause_status);
    }

    public function test_initiate_pause_adjusts_existing_unpaid_full_month_invoice(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-14'));

        $customer = $this->makeActiveCustomer('2026-07-01');

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202607-0001',
            'billing_period' => '2026-07',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-07-01',
            'status' => 'unpaid',
        ]);

        BillingService::initiateServicePause($customer, Carbon::parse('2026-07-14'), 'inactive');

        $invoice = Invoice::where('customer_id', $customer->id)
            ->where('billing_period', '2026-07')
            ->first();

        $this->assertSame(14, $invoice->days_billed);
        $this->assertSame(70000.0, (float) $invoice->amount);
        $this->assertTrue($invoice->is_prorated);

        Carbon::setTestNow();
    }

    public function test_pause_prorata_with_billing_anchor_end_of_month(): void
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
            'name' => '10 Mbps - 120K',
            'type' => 'pppoe',
            'price' => 120000,
            'bandwidth_limit' => '10M/10M',
            'mikrotik_profile' => '10M',
        ]);

        $customer = Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'demo_pause_' . uniqid(),
            'password' => 'pass',
            'name' => 'Demo Pause',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => '2026-07-30',
            'service_start_date' => '2026-05-01',
        ]);

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-PAUSE',
            'billing_period' => '2026-06',
            'amount' => 120000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 120000,
            'due_date' => '2026-06-30',
            'status' => 'paid',
            'paid_at' => '2026-06-30 10:00:00',
        ]);

        Carbon::setTestNow(Carbon::parse('2026-07-14'));

        $billing = BillingService::calculatePausePeriodInvoiceAmount(
            $customer,
            '2026-07',
            Carbon::parse('2026-07-14'),
            120000
        );

        $this->assertNotNull($billing);
        $this->assertSame(14, $billing['days_billed']);

        $result = BillingService::initiateServicePause($customer, Carbon::parse('2026-07-14'), 'inactive');

        $this->assertTrue($result['pending_payment']);
        $this->assertSame('2026-07', $result['billing_period']);

        $invoice = Invoice::where('customer_id', $customer->id)
            ->where('billing_period', '2026-07')
            ->first();

        $this->assertNotNull($invoice);
        $this->assertSame('unpaid', $invoice->status);
        $this->assertSame(14, $invoice->days_billed);

        Carbon::setTestNow();
    }

    public function test_create_pause_invoice_if_missing_for_already_inactive_customer(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-14'));

        $customer = $this->makeActiveCustomer('2026-07-30');
        $customer->update([
            'status' => 'inactive',
            'service_start_date' => '2026-05-01',
        ]);

        $created = BillingService::createPauseInvoiceIfMissing($customer, Carbon::parse('2026-07-14'));

        $this->assertNotNull($created);
        $this->assertSame('2026-07', $created['billing_period']);
        $this->assertSame(14, $created['days_billed']);

        Carbon::setTestNow();
    }

    public function test_paid_invoice_covers_pause_skips_new_invoice(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-27'));

        $customer = $this->makeActiveCustomer('2026-06-30');
        $customer->update(['service_start_date' => '2026-05-01']);

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-PAUSE2',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-30',
            'status' => 'paid',
            'paid_at' => '2026-06-27 10:00:00',
        ]);

        $result = BillingService::initiateServicePause($customer, Carbon::parse('2026-06-27'), 'inactive');

        $this->assertFalse($result['pending_payment']);
        $this->assertSame(1, Invoice::where('customer_id', $customer->id)->count());

        Carbon::setTestNow();
    }

    public function test_scheduled_invoice_skips_customer_with_pending_pause(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-27'));

        Setting::create([
            'group' => 'system',
            'key' => 'system.billing_generate_days_before',
            'value' => '5',
            'is_encrypted' => false,
        ]);

        $customer = $this->makeActiveCustomer('2026-08-01');
        $customer->update([
            'billing_pause_date' => '2026-07-14',
            'pending_pause_status' => 'inactive',
        ]);

        $count = BillingService::generateScheduledInvoices();

        $this->assertSame(0, $count);
        $this->assertSame(0, Invoice::where('customer_id', $customer->id)->where('billing_period', '2026-08')->count());

        Carbon::setTestNow();
    }
}
