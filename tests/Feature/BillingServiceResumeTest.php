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

class BillingServiceResumeTest extends TestCase
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

        Setting::create([
            'group' => 'system',
            'key' => 'system.billing_generate_days_before',
            'value' => '5',
            'is_encrypted' => false,
        ]);
    }

    private function makeLegacyCustomer(string $billingDate = '2026-07-01'): Customer
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
            'name' => 'Pelanggan Lama',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'inactive',
            'billing_date' => $billingDate,
            'service_start_date' => '2020-01-01',
        ]);
    }

    public function test_reactivation_prorata_for_legacy_customer_mid_month(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-10'));

        $customer = $this->makeLegacyCustomer('2026-07-01');

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
            'status' => 'paid',
            'paid_at' => '2026-07-01 10:00:00',
        ]);

        BillingService::syncCustomerStatusBillingTransition($customer, 'inactive', 'active');

        $customer->refresh();
        $this->assertSame('2026-08-10', $customer->billing_resume_date->format('Y-m-d'));

        $billing = BillingService::calculateInvoiceAmount($customer, '2026-08', 150000);

        $this->assertNotNull($billing);
        $this->assertTrue($billing['is_prorated']);
        $this->assertSame(23, $billing['days_billed']);
        $this->assertSame(115000.0, $billing['amount']);

        Carbon::setTestNow();
    }

    public function test_full_month_after_resume_invoice_paid(): void
    {
        $customer = $this->makeLegacyCustomer('2026-07-01');
        $customer->update([
            'status' => 'active',
            'billing_resume_date' => '2026-08-10',
        ]);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202608-0001',
            'billing_period' => '2026-08',
            'amount' => 115000,
            'days_billed' => 23,
            'is_prorated' => true,
            'tax' => 0,
            'total_amount' => 115000,
            'due_date' => '2026-08-17',
            'status' => 'paid',
            'paid_at' => '2026-08-17 10:00:00',
        ]);

        BillingService::clearBillingResumeIfInvoicePaid($customer->fresh(), $invoice);

        $customer->refresh();
        $this->assertNull($customer->billing_resume_date);

        $billing = BillingService::calculateInvoiceAmount($customer, '2026-09', 150000);
        $this->assertNotNull($billing);
        $this->assertFalse($billing['is_prorated']);
        $this->assertSame(150000.0, $billing['amount']);
    }

    public function test_pause_clears_billing_resume_date(): void
    {
        $customer = $this->makeLegacyCustomer();
        $customer->update([
            'status' => 'active',
            'billing_resume_date' => '2026-08-10',
        ]);

        BillingService::syncCustomerStatusBillingTransition($customer, 'active', 'inactive');

        $this->assertNull($customer->fresh()->billing_resume_date);
    }

    public function test_generate_invoice_after_reactivation_uses_prorata(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-10'));

        $customer = $this->makeLegacyCustomer('2026-07-01');

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
            'status' => 'paid',
            'paid_at' => '2026-07-01 10:00:00',
        ]);

        $customer->update(['status' => 'active']);
        BillingService::recordBillingResume($customer, Carbon::parse('2026-08-10'));

        $created = BillingService::generateInvoiceForCustomer($customer->fresh(), null, 7);

        $this->assertSame('2026-08', $created['billing_period']);
        $invoice = Invoice::where('customer_id', $customer->id)
            ->where('billing_period', '2026-08')
            ->first();

        $this->assertTrue($invoice->is_prorated);
        $this->assertSame(23, $invoice->days_billed);
        $this->assertSame(115000.0, (float) $invoice->amount);

        Carbon::setTestNow();
    }

    public function test_custom_resume_date_on_reactivation(): void
    {
        $customer = $this->makeLegacyCustomer();

        BillingService::syncCustomerStatusBillingTransition(
            $customer,
            'inactive',
            'active',
            Carbon::parse('2026-08-10')
        );

        $this->assertSame('2026-08-10', $customer->fresh()->billing_resume_date->format('Y-m-d'));
    }
}
