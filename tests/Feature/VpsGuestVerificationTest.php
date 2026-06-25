<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Package;
use App\Models\Router;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VpsGuestVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function seedVpsShowcase(string $username = 'duitku', string $phone = '6281234567890'): Customer
    {
        Setting::updateOrCreate(['key' => 'vps.enabled'], [
            'group' => 'vps',
            'value' => '1',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'vps.whitelist_usernames'], [
            'group' => 'vps',
            'value' => $username,
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'vps.whitelist_phones'], [
            'group' => 'vps',
            'value' => $phone,
            'is_encrypted' => false,
        ]);

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
            'name' => 'Paket 10 Mbps',
            'type' => 'pppoe',
            'price' => 120000,
            'bandwidth_limit' => '10M/10M',
            'mikrotik_profile' => '10M',
        ]);

        return Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => $username . '@demo',
            'password' => 'rahasia123',
            'name' => 'Duitku Demo',
            'phone_number' => $phone,
            'address' => 'Jl. Test No. 1',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => now()->format('Y-m-d'),
        ]);
    }

    public function test_public_vps_catalog_route_is_not_available(): void
    {
        $this->seedVpsShowcase();

        $this->get('/layanan/vps')->assertNotFound();
        $this->postJson('/layanan/vps/order', ['plan_id' => 'starter'])->assertNotFound();
    }

    public function test_authenticated_showcase_customer_can_order_via_portal_route(): void
    {
        $customer = $this->seedVpsShowcase();

        $response = $this->actingAs($customer->user)
            ->postJson('/customer/vps/order', [
                'plan_id' => 'starter',
                'payment_method' => 'all',
            ]);

        $this->assertNotSame(404, $response->status());
    }

    public function test_portal_order_rejected_when_showcase_not_configured(): void
    {
        Setting::updateOrCreate(['key' => 'vps.enabled'], [
            'group' => 'vps',
            'value' => '1',
            'is_encrypted' => false,
        ]);

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
            'name' => 'Paket 10 Mbps',
            'type' => 'pppoe',
            'price' => 120000,
            'bandwidth_limit' => '10M/10M',
            'mikrotik_profile' => '10M',
        ]);
        $customer = Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'pelanggan-biasa',
            'password' => 'rahasia123',
            'name' => 'Pelanggan Biasa',
            'phone_number' => '6281111111111',
            'address' => 'Jl. Lain',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => now()->format('Y-m-d'),
        ]);

        $this->actingAs($customer->user)
            ->postJson('/customer/vps/order', [
                'plan_id' => 'starter',
            ])
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }
}
