<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Package;
use App\Models\Router;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerLiveTrafficTest extends TestCase
{
    use RefreshDatabase;

    private function makeCustomer(array $overrides = []): Customer
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
            'name' => 'Paket 10 Mbps',
            'type' => 'pppoe',
            'price' => 150000,
            'bandwidth_limit' => '10M/10M',
            'mikrotik_profile' => '10M',
        ]);

        return Customer::create(array_merge([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust_traffic',
            'password' => 'secret',
            'name' => 'Pelanggan Trafik',
            'phone_number' => '6281234567890',
            'address' => 'Jl. Test',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => now()->format('Y-m-d'),
        ], $overrides));
    }

    public function test_guest_cannot_access_customer_traffic(): void
    {
        $this->getJson('/customer/traffic')
            ->assertUnauthorized();
    }

    public function test_authenticated_customer_gets_traffic_payload_shape(): void
    {
        $customer = $this->makeCustomer();

        $this->actingAs($customer->user)
            ->getJson('/customer/traffic')
            ->assertJsonStructure([
                'success',
                'online',
                'download_bps',
                'upload_bps',
                'bandwidth_limit',
                'quota' => [
                    'download_bytes',
                    'upload_bytes',
                    'total_bytes',
                    'period',
                ],
            ]);
    }

    public function test_vps_showcase_customer_cannot_access_traffic(): void
    {
        Setting::updateOrCreate(['key' => 'vps.enabled'], [
            'group' => 'vps',
            'value' => '1',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'vps.whitelist_usernames'], [
            'group' => 'vps',
            'value' => 'cust_traffic',
            'is_encrypted' => false,
        ]);

        $customer = $this->makeCustomer(['username' => 'cust_traffic']);

        $this->actingAs($customer->user)
            ->withSession(['customer_portal_vps_showcase' => true])
            ->getJson('/customer/traffic')
            ->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
    }
}
