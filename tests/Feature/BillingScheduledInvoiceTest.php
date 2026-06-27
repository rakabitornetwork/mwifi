<?php

namespace Tests\Feature;

use App\Models\BillingActivityLog;
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

class BillingScheduledInvoiceTest extends TestCase
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
            'key' => 'system.billing_notify_admin',
            'value' => '1',
            'is_encrypted' => false,
        ]);

        Setting::create([
            'group' => 'system',
            'key' => 'system.billing_admin_phone',
            'value' => '628111222333',
            'is_encrypted' => false,
        ]);
    }

    private function makeCustomer(int $billingDate): Customer
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
            'service_start_date' => '2026-01-01',
        ]);
    }

    public function test_resolve_schedule_on_due_date_minus_five(): void
    {
        $customer = $this->makeCustomer(20);
        $today = Carbon::create(2026, 6, 15);

        $schedule = BillingService::resolveInvoiceSchedule($customer, $today);

        $this->assertNotNull($schedule);
        $this->assertSame('2026-06', $schedule['period']);
        $this->assertTrue($schedule['due_date']->equalTo(Carbon::create(2026, 6, 20)));
    }

    public function test_resolve_schedule_for_billing_date_first_of_month(): void
    {
        $customer = $this->makeCustomer(1);
        $today = Carbon::create(2026, 5, 27);

        $schedule = BillingService::resolveInvoiceSchedule($customer, $today);

        $this->assertNotNull($schedule);
        $this->assertSame('2026-06', $schedule['period']);
        $this->assertTrue($schedule['due_date']->equalTo(Carbon::create(2026, 6, 1)));
    }

    public function test_generate_scheduled_invoices_catches_up_after_generate_day(): void
    {
        $customer = $this->makeCustomer(25);
        $customer->update([
            'service_start_date' => '2026-06-21',
            'created_at' => '2026-06-21 14:24:40',
        ]);

        $count = BillingService::generateScheduledInvoices(Carbon::parse('2026-06-21'));

        $this->assertSame(1, $count);
        $this->assertTrue(
            Invoice::where('customer_id', $customer->id)->where('billing_period', '2026-06')->exists()
        );
    }

    public function test_no_schedule_before_generate_window(): void
    {
        $customer = $this->makeCustomer(20);
        $today = Carbon::create(2026, 6, 14);

        $this->assertNull(BillingService::resolveInvoiceSchedule($customer, $today));
    }

    public function test_generate_scheduled_invoices_only_for_matching_customers(): void
    {
        $dueToday = $this->makeCustomer(20);
        $notDue = $this->makeCustomer(25);
        $today = Carbon::create(2026, 6, 15);

        $count = BillingService::generateScheduledInvoices($today);

        $this->assertSame(1, $count);
        $this->assertTrue(Invoice::where('customer_id', $dueToday->id)->where('billing_period', '2026-06')->exists());
        $this->assertFalse(Invoice::where('customer_id', $notDue->id)->exists());

        $invoice = Invoice::where('customer_id', $dueToday->id)->first();
        $this->assertTrue($invoice->due_date->equalTo(Carbon::create(2026, 6, 20)));
    }

    public function test_skips_when_invoice_already_exists(): void
    {
        $customer = $this->makeCustomer(20);
        $today = Carbon::create(2026, 6, 15);

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-EXISTING',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => Carbon::create(2026, 6, 20),
            'status' => 'unpaid',
        ]);

        $count = BillingService::generateScheduledInvoices($today);

        $this->assertSame(0, $count);
        $this->assertSame(1, Invoice::where('customer_id', $customer->id)->count());
    }

    public function test_running_scheduled_generate_twice_does_not_create_duplicates(): void
    {
        $customer = $this->makeCustomer(20);
        $today = Carbon::create(2026, 6, 15);

        $firstRun = BillingService::generateScheduledInvoices($today);
        $secondRun = BillingService::generateScheduledInvoices($today);

        $this->assertSame(1, $firstRun);
        $this->assertSame(0, $secondRun);
        $this->assertSame(1, Invoice::where('customer_id', $customer->id)->count());
    }

    public function test_billing_generate_command_is_scheduled_every_six_hours(): void
    {
        $events = collect(app(\Illuminate\Console\Scheduling\Schedule::class)->events())
            ->filter(fn ($event) => str_contains($event->command ?? '', 'billing:generate'));

        $this->assertCount(1, $events);
        $this->assertSame('0 */6 * * *', $events->first()->expression);
    }

    public function test_records_activity_log_after_scheduled_run(): void
    {
        Http::fake([
            '*' => Http::response(['success' => true], 200),
        ]);

        $this->makeCustomer(20);
        $today = Carbon::create(2026, 6, 15);

        BillingService::generateScheduledInvoices($today);

        $log = BillingActivityLog::first();
        $this->assertNotNull($log);
        $this->assertSame('scheduled_invoice', $log->event_type);
        $this->assertSame(1, $log->meta['invoice_count']);
        $this->assertTrue($log->meta['admin_notified']);
        $this->assertSame('628111222333', $log->meta['admin_phone']);
    }

    public function test_records_zero_invoice_run_in_activity_log(): void
    {
        $today = Carbon::create(2026, 6, 14);

        BillingService::generateScheduledInvoices($today);

        $log = BillingActivityLog::first();
        $this->assertNotNull($log);
        $this->assertSame(0, $log->meta['invoice_count']);
        $this->assertFalse($log->meta['admin_notified']);
    }

    public function test_build_admin_message_contains_invoice_summary(): void
    {
        $message = BillingService::buildAdminScheduledInvoiceMessage(
            'mWiFi Test',
            Carbon::create(2026, 6, 15),
            5,
            [[
                'invoice_number' => 'INV-TEST',
                'customer_name' => 'Budi',
                'total_amount' => 150000,
                'billing_period' => '2026-06',
            ]],
            150000
        );

        $this->assertStringContainsString('LAPORAN GENERATE TAGIHAN', $message);
        $this->assertStringContainsString('INV-TEST', $message);
        $this->assertStringContainsString('Budi', $message);
    }
}
