<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Router;
use App\Models\Setting;
use App\Models\User;
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
                ->has('invoices', 0)
            );
    }

    public function test_showcase_customer_sees_only_vps_invoices(): void
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
            ->assertInertia(fn ($page) => $page
                ->has('invoices', 1)
                ->where('invoices.0.invoice_number', 'VPS-BUSINESS-0001-AB12')
                ->where('invoices.0.service_label', 'Sewa VPS — VPS Business (Bulanan)')
            );
    }
}
