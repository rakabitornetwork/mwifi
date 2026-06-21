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

class BillingMonthlyRevenueTest extends TestCase
{
    use RefreshDatabase;

    private function makePaidInvoice(string $suffix, string $paidAt, float $amount = 150000): Invoice
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
            'username' => 'cust_' . $suffix,
            'password' => 'pass',
            'name' => 'Pelanggan ' . $suffix,
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 25,
            'service_start_date' => '2026-01-01',
        ]);

        return Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-' . $suffix,
            'billing_period' => '2026-06',
            'amount' => $amount,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => $amount,
            'due_date' => '2026-06-25',
            'status' => 'paid',
            'paid_at' => $paidAt,
        ]);
    }

    public function test_summarize_monthly_revenue_groups_by_paid_at(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $this->makePaidInvoice('A1', '2026-06-10', 150000);
        $this->makePaidInvoice('A2', '2026-06-15', 200000);
        $this->makePaidInvoice('B1', '2026-05-20', 100000);

        $summary = BillingService::summarizeMonthlyRevenue(6, Carbon::parse('2026-06-20'));

        $this->assertSame(350000.0, $summary['current_month']['total']);
        $this->assertSame(2, $summary['current_month']['invoice_count']);
        $this->assertSame(100000.0, $summary['previous_month']['total']);
        $this->assertSame(250.0, $summary['change_percent']);
        $this->assertCount(6, $summary['series']);
    }

    public function test_dashboard_includes_monthly_revenue_payload(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $admin = User::factory()->create();
        $this->makePaidInvoice('C1', '2026-06-05', 75000);

        $response = $this->actingAs($admin)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Dashboard/Index')
            ->has('monthlyRevenue.current_month')
            ->where('monthlyRevenue.current_month.total', 75000)
        );
    }
}
