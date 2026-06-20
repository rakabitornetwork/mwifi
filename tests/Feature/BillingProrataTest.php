<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Package;
use App\Models\Router;
use App\Models\Setting;
use App\Models\User;
use App\Services\BillingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingProrataTest extends TestCase
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

    private function makeCustomer(string $serviceStartDate, int $billingDate = 20): Customer
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

    public function test_prorata_for_customer_starting_mid_month(): void
    {
        $customer = $this->makeCustomer('2026-06-15', 20);

        $billing = BillingService::calculateInvoiceAmount($customer, '2026-06', 150000);

        $this->assertNotNull($billing);
        $this->assertTrue($billing['is_prorated']);
        $this->assertSame(6, $billing['days_billed']);
        $this->assertSame(30000.0, $billing['amount']);
    }

    public function test_prorata_ends_on_billing_date_not_end_of_month(): void
    {
        $customer = $this->makeCustomer('2026-06-15', 25);

        $billing = BillingService::calculateInvoiceAmount($customer, '2026-06', 120000);

        $this->assertNotNull($billing);
        $this->assertTrue($billing['is_prorated']);
        $this->assertSame(11, $billing['days_billed']);
        $this->assertSame(44000.0, $billing['amount']);
    }

    public function test_full_month_after_first_billing_period(): void
    {
        $customer = $this->makeCustomer('2026-06-15');

        $billing = BillingService::calculateInvoiceAmount($customer, '2026-07', 150000);

        $this->assertNotNull($billing);
        $this->assertFalse($billing['is_prorated']);
        $this->assertSame(30, $billing['days_billed']);
        $this->assertSame(150000.0, $billing['amount']);
    }

    public function test_skips_period_before_service_start(): void
    {
        $customer = $this->makeCustomer('2026-07-01');

        $billing = BillingService::calculateInvoiceAmount($customer, '2026-06', 150000);

        $this->assertNull($billing);
    }

    public function test_prorata_disabled_uses_full_price(): void
    {
        Setting::where('key', 'system.billing_prorata_enabled')->update(['value' => '0']);

        $customer = $this->makeCustomer('2026-06-15');
        $billing = BillingService::calculateInvoiceAmount($customer, '2026-06', 150000);

        $this->assertNotNull($billing);
        $this->assertFalse($billing['is_prorated']);
        $this->assertSame(150000.0, $billing['amount']);
    }
}
