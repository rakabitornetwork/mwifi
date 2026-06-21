<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Payment;
use App\Models\Router;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BulkManualPaymentTest extends TestCase
{
    use RefreshDatabase;

    private function makeUnpaidInvoice(string $suffix, float $amount = 150000): Invoice
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
            'status' => 'unpaid',
        ]);
    }

    public function test_admin_can_pay_multiple_invoices_manually_without_print_flag(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $admin = User::factory()->create();
        $invoiceA = $this->makeUnpaidInvoice('A001');
        $invoiceB = $this->makeUnpaidInvoice('B002', 120000);

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/pay-manual-bulk', [
                'invoice_ids' => [$invoiceA->id, $invoiceB->id],
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $response->assertSessionMissing('print_invoice_id');

        $this->assertSame('paid', $invoiceA->fresh()->status);
        $this->assertSame('paid', $invoiceB->fresh()->status);
        $this->assertSame(2, Payment::count());
    }

    public function test_bulk_pay_skips_non_unpaid_invoices(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $admin = User::factory()->create();
        $unpaid = $this->makeUnpaidInvoice('C003');
        $paid = $this->makeUnpaidInvoice('D004');
        $paid->update(['status' => 'paid', 'paid_at' => now()]);

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/pay-manual-bulk', [
                'invoice_ids' => [$unpaid->id, $paid->id],
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertStringContainsString('1 tagihan berhasil', session('success'));
        $this->assertStringContainsString('1 invoice dilewati', session('success'));
        $this->assertSame('paid', $unpaid->fresh()->status);
    }

    public function test_bulk_pay_requires_at_least_one_invoice(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/pay-manual-bulk', [
                'invoice_ids' => [],
            ]);

        $response->assertSessionHasErrors('invoice_ids');
    }
}
