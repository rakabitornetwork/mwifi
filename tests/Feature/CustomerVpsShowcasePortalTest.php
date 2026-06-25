<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Router;
use App\Models\Setting;
use App\Models\User;
use App\Services\VpsCatalogService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerVpsShowcasePortalTest extends TestCase
{
    use RefreshDatabase;

    private function seedVpsShowcaseSettings(): void
    {
        Setting::updateOrCreate(['key' => 'vps.enabled'], [
            'group' => 'vps',
            'value' => '1',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'vps.whitelist_usernames'], [
            'group' => 'vps',
            'value' => 'demo-vps',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'vps.whitelist_phones'], [
            'group' => 'vps',
            'value' => '6281234567890',
            'is_encrypted' => false,
        ]);
    }

    private function makeCustomer(): Customer
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
            'name' => 'Paket 50 Mbps',
            'type' => 'pppoe',
            'price' => 150000,
            'bandwidth_limit' => '50M/50M',
            'mikrotik_profile' => '50M',
            'description' => 'Internet rumahan',
        ]);

        return Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'demo-vps',
            'password' => 'secret123',
            'name' => 'Pelanggan VPS Demo',
            'phone_number' => '6281234567890',
            'address' => 'Jl. Rahasia RT/RW Net 123',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => now()->format('Y-m-d'),
        ]);
    }

    public function test_showcase_customer_dashboard_hides_pppoe_data(): void
    {
        $this->seedVpsShowcaseSettings();
        $customer = $this->makeCustomer();

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0001-ABCD',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => now()->addDays(5),
            'status' => 'unpaid',
        ]);

        $this->actingAs($customer->user)
            ->get('/customer/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Customer/Dashboard')
                ->where('portalView', 'vps')
                ->where('customer.server_id', fn ($id) => str_starts_with($id, 'SRV-'))
                ->where('customer.name', 'Pelanggan VPS Demo')
                ->missing('customer.username')
                ->missing('customer.address')
                ->missing('customer.package')
                ->has('vpsPlan.cpu')
                ->has('invoices', 1)
                ->where('invoices.0.service_label', 'Sewa VPS Cloud (Bulanan)')
            );
    }

    public function test_showcase_customer_manual_generate_creates_vps_invoice(): void
    {
        $this->seedVpsShowcaseSettings();
        $customer = $this->makeCustomer();
        $admin = User::factory()->create();

        $this->actingAs($admin)
            ->post('/admin/invoices/generate-customer', [
                'customer_id' => $customer->id,
                'due_extension_days' => 0,
            ])
            ->assertRedirect()
            ->assertSessionHas('success');

        $invoice = Invoice::where('customer_id', $customer->id)->first();
        $this->assertNotNull($invoice);
        $this->assertTrue(str_starts_with($invoice->invoice_number, 'VPS-'));
        $this->assertSame('vps:business', $invoice->billing_period);

        $this->actingAs($customer->user)
            ->get('/customer/dashboard')
            ->assertInertia(fn ($page) => $page
                ->has('invoices', 1)
                ->where('invoices.0.invoice_number', $invoice->invoice_number)
            );
    }

    public function test_vps_manual_invoice_uses_customer_billing_date_not_three_day_default(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-25'));

        $this->seedVpsShowcaseSettings();
        $customer = $this->makeCustomer();
        $customer->update([
            'billing_date' => 1,
            'service_start_date' => '2026-06-25',
        ]);

        $created = VpsCatalogService::generateManualInvoiceForCustomer($customer->fresh(), 0);

        $this->assertSame('2026-07-01', $created['due_date']);

        $invoice = Invoice::where('customer_id', $customer->id)->first();
        $this->assertSame('2026-07-01', $invoice->due_date->format('Y-m-d'));
    }

    public function test_showcase_with_phone_only_whitelist_match(): void
    {
        $this->seedVpsShowcaseSettings();
        Setting::updateOrCreate(['key' => 'vps.whitelist_usernames'], [
            'group' => 'vps',
            'value' => 'wrong-username',
            'is_encrypted' => false,
        ]);

        $customer = $this->makeCustomer();
        $customer->update(['username' => 'midtrans@demo']);

        $this->actingAs($customer->user)
            ->get('/customer/dashboard')
            ->assertInertia(fn ($page) => $page->where('portalView', 'vps'));

        $this->actingAs($customer->user)
            ->get('/layanan/vps')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Public/VpsCatalog')
                ->where('canOrder', true)
                ->where('guestVerification', false)
                ->where('isLoggedIn', true)
            );
    }

    public function test_username_prefix_matches_midtrans_demo(): void
    {
        $this->assertTrue(VpsCatalogService::usernameMatchesWhitelist('midtrans@demo', ['midtrans']));
        $this->assertTrue(VpsCatalogService::usernameMatchesWhitelist('midtrans@demo', ['midtrans@demo']));
    }

    public function test_showcase_customer_sees_vps_and_unpaid_legacy_invoices(): void
    {
        $this->seedVpsShowcaseSettings();
        $customer = $this->makeCustomer();

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-ISP-001',
            'billing_period' => '2026-05',
            'amount' => 150000,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => now()->addDays(5),
            'status' => 'unpaid',
        ]);

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'VPS-BUSINESS-0001-AB12',
            'billing_period' => 'vps:business',
            'amount' => 199000,
            'tax' => 0,
            'total_amount' => 199000,
            'due_date' => now()->addDays(3),
            'status' => 'unpaid',
        ]);

        $this->actingAs($customer->user)
            ->get('/customer/dashboard')
            ->assertInertia(function ($page) {
                $page->has('invoices', 2);

                $invoices = collect($page->toArray()['props']['invoices'] ?? []);
                $numbers = $invoices->pluck('invoice_number')->all();

                $this->assertContains('VPS-BUSINESS-0001-AB12', $numbers);
                $this->assertContains('INV-ISP-001', $numbers);
                $this->assertSame(
                    'Sewa VPS — VPS Business (Bulanan)',
                    $invoices->firstWhere('invoice_number', 'VPS-BUSINESS-0001-AB12')['service_label'] ?? null
                );
                $this->assertSame(
                    'Sewa VPS Cloud (Bulanan)',
                    $invoices->firstWhere('invoice_number', 'INV-ISP-001')['service_label'] ?? null
                );
            });
    }

    public function test_showcase_customer_hides_paid_legacy_invoices(): void
    {
        $this->seedVpsShowcaseSettings();
        $customer = $this->makeCustomer();

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-ISP-PAID',
            'billing_period' => '2026-04',
            'amount' => 150000,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => now()->subDays(10),
            'paid_at' => now()->subDays(8),
            'status' => 'paid',
        ]);

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'VPS-BUSINESS-0001-AB12',
            'billing_period' => 'vps:business',
            'amount' => 199000,
            'tax' => 0,
            'total_amount' => 199000,
            'due_date' => now()->addDays(3),
            'status' => 'unpaid',
        ]);

        $this->actingAs($customer->user)
            ->get('/customer/dashboard')
            ->assertInertia(fn ($page) => $page
                ->has('invoices', 1)
                ->where('invoices.0.invoice_number', 'VPS-BUSINESS-0001-AB12')
            );
    }
}
