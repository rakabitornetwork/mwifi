<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Package;
use App\Models\Router;
use App\Models\Setting;
use App\Models\User;
use App\Services\VpsCatalogService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class VpsDemoLoginTest extends TestCase
{
    use RefreshDatabase;

    private function seedVpsShowcase(string $username = 'midtrans', string $phone = '6281234567890'): Customer
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
            'name' => 'Midtrans Demo',
            'phone_number' => $phone,
            'address' => 'Jl. Test No. 1',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => now()->format('Y-m-d'),
        ]);
    }

    public function test_signed_demo_link_logs_in_showcase_customer(): void
    {
        $customer = $this->seedVpsShowcase();
        $url = VpsCatalogService::generateDemoLoginUrl($customer);

        $this->assertNotNull($url);
        $this->assertStringContainsString('/portal/demo/', $url);

        $this->get($url)
            ->assertRedirect('/customer/dashboard');

        $this->assertAuthenticatedAs($customer->user);
        $this->assertTrue(session('customer_portal_vps_showcase'));
    }

    public function test_expired_demo_link_is_rejected(): void
    {
        $customer = $this->seedVpsShowcase();
        $url = URL::temporarySignedRoute(
            'portal.demo.login',
            now()->subMinute(),
            ['customer' => $customer->id],
        );

        $this->get($url)->assertForbidden();
        $this->assertGuest();
    }

    public function test_non_showcase_customer_demo_link_is_forbidden(): void
    {
        $customer = $this->seedVpsShowcase();
        $otherUser = User::factory()->create();
        $otherCustomer = Customer::create([
            'user_id' => $otherUser->id,
            'router_id' => $customer->router_id,
            'package_id' => $customer->package_id,
            'service_type' => 'pppoe',
            'username' => 'bukan-demo',
            'password' => 'rahasia123',
            'name' => 'Pelanggan Biasa',
            'phone_number' => '6289999999999',
            'address' => 'Jl. Lain',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => now()->format('Y-m-d'),
        ]);

        $url = URL::temporarySignedRoute(
            'portal.demo.login',
            now()->addDays(30),
            ['customer' => $otherCustomer->id],
        );

        $this->get($url)->assertForbidden();
        $this->assertGuest();
    }
}
