<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Router;
use App\Models\User;
use App\Services\BillingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingIsolationPackageTest extends TestCase
{
    use RefreshDatabase;

    private function makeActiveCustomer(string $packageName): Customer
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
            'name' => $packageName,
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
            'name' => 'Pelanggan ' . $packageName,
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 25,
            'service_start_date' => '2026-01-01',
        ]);
    }

    public function test_package_name_starting_with_number_is_eligible_for_isolation(): void
    {
        $customer = $this->makeActiveCustomer('20 Mbps - 150K');

        $this->assertTrue(BillingService::isCustomerEligibleForAutoIsolation($customer));
    }

    public function test_package_name_not_starting_with_number_is_not_eligible(): void
    {
        $customer = $this->makeActiveCustomer('Paket VIP Unlimited');

        $this->assertFalse(BillingService::isCustomerEligibleForAutoIsolation($customer));
    }

    public function test_isolate_past_due_skips_non_numeric_package_names(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-25'));

        $skipped = $this->makeActiveCustomer('Paket VIP Unlimited');
        $isolated = $this->makeActiveCustomer('150K Rumahan');

        foreach ([$skipped, $isolated] as $customer) {
            Invoice::create([
                'customer_id' => $customer->id,
                'invoice_number' => 'INV-202606-' . $customer->id,
                'billing_period' => '2026-06',
                'amount' => 150000,
                'days_billed' => 30,
                'is_prorated' => false,
                'tax' => 0,
                'total_amount' => 150000,
                'due_date' => '2026-06-20',
                'status' => 'unpaid',
            ]);
        }

        $count = BillingService::isolatePastDueCustomers();

        $this->assertSame(1, $count);
        $this->assertSame('active', $skipped->fresh()->status);
        $this->assertSame('isolated', $isolated->fresh()->status);
    }

    public function test_isolir_check_creates_overdue_invoice_before_isolating(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-28'));

        $customer = $this->makeActiveCustomer('150K Rumahan');
        $customer->update(['billing_date' => '2026-06-20']);

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
            'status' => 'paid',
            'paid_at' => '2026-05-21',
        ]);

        $this->assertFalse(
            Invoice::where('customer_id', $customer->id)->where('billing_period', '2026-06')->exists()
        );

        $count = BillingService::isolatePastDueCustomers();

        $this->assertSame(1, $count);
        $this->assertTrue(
            Invoice::where('customer_id', $customer->id)->where('billing_period', '2026-06')->exists()
        );
        $this->assertSame('isolated', $customer->fresh()->status);

        Carbon::setTestNow();
    }
}
