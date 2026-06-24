<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\FinancialExpense;
use App\Models\HotspotSale;
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

    public function test_invoices_page_includes_monthly_revenue_payload(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $admin = User::factory()->create();
        $this->makePaidInvoice('C1', '2026-06-05', 75000);

        $response = $this->actingAs($admin)->get('/invoices');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Invoices/Index')
            ->has('monthlyRevenue.current_month')
            ->where('monthlyRevenue.current_month.total', 75000)
        );
    }

    public function test_summarize_today_revenue_groups_by_paid_at_on_same_day(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-22 15:00:00'));

        $this->makePaidInvoice('T1', '2026-06-22 09:30:00', 100000);
        $this->makePaidInvoice('T2', '2026-06-22 14:00:00', 50000);
        $this->makePaidInvoice('Y1', '2026-06-21 18:00:00', 200000);

        $summary = BillingService::summarizeTodayRevenue(Carbon::parse('2026-06-22'));

        $this->assertSame(150000.0, $summary['total']);
        $this->assertSame(2, $summary['payment_count']);
        $this->assertSame('2026-06-22', $summary['date']);
    }

    private function makeHotspotSale(string $suffix, string $soldAt, float $price = 25000): HotspotSale
    {
        $router = Router::first() ?? Router::create([
            'name' => 'Router Test',
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'secret',
            'protocol_type' => 'legacy_socket',
            'status' => false,
        ]);

        $sale = HotspotSale::create([
            'router_id' => $router->id,
            'username' => 'voucher_' . $suffix,
            'package_name' => 'Hotspot Profile: 1 Jam',
            'price' => $price,
            'payment_method' => 'cash',
        ]);

        $timestamp = Carbon::parse($soldAt);
        $sale->forceFill([
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ])->saveQuietly();

        return $sale->fresh();
    }

    public function test_summarize_daily_revenue_groups_by_paid_at_per_day(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-22 15:00:00'));

        $this->makePaidInvoice('D1', '2026-06-20 10:00:00', 100000);
        $this->makePaidInvoice('D2', '2026-06-21 11:00:00', 50000);
        $this->makePaidInvoice('D3', '2026-06-22 09:00:00', 75000);
        $this->makePaidInvoice('D4', '2026-06-22 14:00:00', 25000);
        $this->makeHotspotSale('V1', '2026-06-22 12:00:00', 30000);
        $this->makeHotspotSale('V2', '2026-06-21 16:00:00', 20000);

        $summary = BillingService::summarizeDailyRevenue(14, Carbon::parse('2026-06-22'));

        $this->assertSame(14, $summary['days']);
        $this->assertSame(300000.0, $summary['total']);
        $this->assertSame(250000.0, $summary['invoice_total']);
        $this->assertSame(50000.0, $summary['voucher_total']);
        $this->assertSame(4, $summary['payment_count']);
        $this->assertSame(2, $summary['voucher_sale_count']);
        $this->assertCount(14, $summary['series']);

        $today = collect($summary['series'])->firstWhere('date', '2026-06-22');
        $this->assertNotNull($today);
        $this->assertSame(100000.0, $today['invoice_total']);
        $this->assertSame(30000.0, $today['voucher_total']);
        $this->assertSame(130000.0, $today['total']);
        $this->assertSame(2, $today['payment_count']);
        $this->assertSame(1, $today['voucher_sale_count']);
    }

    public function test_dashboard_includes_daily_revenue_payload(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-22 12:00:00'));

        $admin = User::factory()->create();
        $this->makePaidInvoice('DR1', '2026-06-22 10:00:00', 125000);
        $this->makeHotspotSale('DRV1', '2026-06-22 11:00:00', 15000);

        $response = $this->actingAs($admin)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Dashboard/Index')
            ->has('dailyRevenue.series')
            ->where('dailyRevenue.total', 140000)
            ->where('dailyRevenue.invoice_total', 125000)
            ->where('dailyRevenue.voucher_total', 15000)
            ->where('dailyRevenue.payment_count', 1)
            ->where('dailyRevenue.voucher_sale_count', 1)
        );
    }

    public function test_dashboard_includes_daily_expenses_payload(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-22 12:00:00'));

        $admin = User::factory()->create();

        FinancialExpense::create([
            'recorded_by' => $admin->id,
            'category' => 'operasional',
            'title' => 'Biaya listrik',
            'amount' => 50000,
            'expense_date' => '2026-06-22',
        ]);

        FinancialExpense::create([
            'recorded_by' => $admin->id,
            'category' => 'transportasi',
            'title' => 'Bensin lapangan',
            'amount' => 25000,
            'expense_date' => '2026-06-21',
        ]);

        $response = $this->actingAs($admin)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Dashboard/Index')
            ->has('dailyExpenses.series')
            ->where('dailyExpenses.total', 75000)
            ->where('dailyExpenses.entry_count', 2)
        );
    }

    public function test_dashboard_includes_today_revenue_payload(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-22 12:00:00'));

        $admin = User::factory()->create();
        $this->makePaidInvoice('D1', '2026-06-22 10:00:00', 125000);

        $response = $this->actingAs($admin)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Dashboard/Index')
            ->has('todayRevenue')
            ->where('todayRevenue.gross_total', 125000)
            ->where('todayRevenue.expense_total', 0)
            ->where('todayRevenue.total', 125000)
            ->where('todayRevenue.payment_count', 1)
        );
    }

    public function test_dashboard_subtracts_expenses_from_revenue_totals(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-22 12:00:00'));

        $admin = User::factory()->create();
        $this->makePaidInvoice('NET1', '2026-06-22 10:00:00', 100000);

        FinancialExpense::create([
            'recorded_by' => $admin->id,
            'category' => 'operasional',
            'title' => 'Biaya operasional',
            'amount' => 35000,
            'expense_date' => '2026-06-22',
        ]);

        $response = $this->actingAs($admin)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Dashboard/Index')
            ->where('todayRevenue.gross_total', 100000)
            ->where('todayRevenue.expense_total', 35000)
            ->where('todayRevenue.total', 65000)
            ->where('dailyRevenue.gross_total', 100000)
            ->where('dailyRevenue.expense_total', 35000)
            ->where('dailyRevenue.total', 65000)
        );
    }

    public function test_expenses_only_reduce_invoice_income_not_voucher_sales(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-22 12:00:00'));

        $admin = User::factory()->create();
        $this->makePaidInvoice('MIX1', '2026-06-22 10:00:00', 30000);
        $this->makeHotspotSale('MIXV1', '2026-06-22 11:00:00', 80000);

        FinancialExpense::create([
            'recorded_by' => $admin->id,
            'category' => 'operasional',
            'title' => 'Biaya operasional',
            'amount' => 50000,
            'expense_date' => '2026-06-22',
        ]);

        $response = $this->actingAs($admin)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Dashboard/Index')
            ->where('dailyRevenue.invoice_total', 30000)
            ->where('dailyRevenue.voucher_total', 80000)
            ->where('dailyRevenue.gross_total', 110000)
            ->where('dailyRevenue.expense_total', 50000)
            ->where('dailyRevenue.total', 80000)
        );
    }
}
