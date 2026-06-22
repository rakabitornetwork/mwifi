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

class BillingCustomerInvoiceTest extends TestCase
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
    }

    private function makeCustomer(int $billingDate = 25): Customer
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

    public function test_admin_can_generate_invoice_for_single_customer(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/generate-customer', [
                'customer_id' => $customer->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertSame(1, Invoice::where('customer_id', $customer->id)->count());
        $invoice = Invoice::where('customer_id', $customer->id)->first();
        $this->assertSame('2026-06', $invoice->billing_period);
        $this->assertSame('unpaid', $invoice->status);
    }

    public function test_generate_invoice_for_customer_rejects_duplicate_period(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer();

        BillingService::generateInvoiceForCustomer($customer);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('sudah ada');

        BillingService::generateInvoiceForCustomer($customer);
    }

    public function test_generate_invoice_for_customer_rejects_deferred_period(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer();

        BillingDeferral::create([
            'customer_id' => $customer->id,
            'months_count' => 1,
            'periods' => ['2026-06'],
            'combined_due_date' => '2026-07-25',
            'status' => 'pending',
        ]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('ditunda');

        BillingService::generateInvoiceForCustomer($customer);
    }

    public function test_generate_invoice_for_customer_requires_package(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer();
        $customer->update(['package_id' => null]);

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('paket');

        BillingService::generateInvoiceForCustomer($customer->fresh());
    }

    public function test_manual_invoice_uses_selected_due_extension_days(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer(5);

        $created = BillingService::generateInvoiceForCustomer($customer, null, 3);

        $this->assertSame('2026-06-23', $created['due_date']);
        $this->assertSame('2026-06-23', Invoice::first()->due_date->format('Y-m-d'));
    }

    public function test_manual_invoice_keeps_scheduled_due_date_when_still_in_future(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $customer = $this->makeCustomer(25);

        $created = BillingService::generateInvoiceForCustomer($customer, null, 3);

        $this->assertSame('2026-06-25', $created['due_date']);
    }

    public function test_admin_can_pass_due_extension_days_when_generating_invoice(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        $admin = User::factory()->create();
        $customer = $this->makeCustomer(5);

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/generate-customer', [
                'customer_id' => $customer->id,
                'due_extension_days' => 5,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertSame('2026-06-25', Invoice::first()->due_date->format('Y-m-d'));
    }
}
