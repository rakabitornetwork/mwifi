<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Odp;
use App\Models\Package;
use App\Models\Router;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OdpUsedPortsTest extends TestCase
{
    use RefreshDatabase;

    public function test_sync_used_ports_reflects_connected_customers(): void
    {
        $odp = Odp::create([
            'name' => 'ODP-TEST-01',
            'latitude' => -7.98,
            'longitude' => 112.62,
            'total_ports' => 8,
            'used_ports' => 0,
        ]);

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
            'name' => 'Hotspot 50K',
            'type' => 'hotspot',
            'price' => 50000,
            'bandwidth_limit' => '10M/10M',
            'mikrotik_profile' => '10M',
        ]);

        foreach (['cust_a', 'cust_b'] as $username) {
            $user = User::factory()->create(['email' => $username . '@mwifi.test']);
            Customer::create([
                'user_id' => $user->id,
                'router_id' => $router->id,
                'package_id' => $package->id,
                'odp_id' => $odp->id,
                'service_type' => 'hotspot',
                'username' => $username,
                'password' => 'pass',
                'name' => 'Pelanggan ' . $username,
                'phone_number' => '6281234567890',
                'address' => 'Alamat test',
                'status' => 'active',
                'billing_date' => 25,
                'service_start_date' => '2026-01-01',
            ]);
        }

        $odp->syncUsedPorts();
        $odp->refresh();

        $this->assertSame(2, $odp->used_ports);
    }

    public function test_odp_loads_with_customers_count(): void
    {
        $odp = Odp::create([
            'name' => 'ODP-TEST-02',
            'latitude' => -7.98,
            'longitude' => 112.62,
            'total_ports' => 8,
            'used_ports' => 0,
        ]);

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
            'name' => 'Hotspot 50K',
            'type' => 'hotspot',
            'price' => 50000,
            'bandwidth_limit' => '10M/10M',
            'mikrotik_profile' => '10M',
        ]);

        $user = User::factory()->create(['email' => 'cust_c@mwifi.test']);
        Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'odp_id' => $odp->id,
            'service_type' => 'hotspot',
            'username' => 'cust_c',
            'password' => 'pass',
            'name' => 'Pelanggan C',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 25,
            'service_start_date' => '2026-01-01',
        ]);

        $loaded = Odp::withCount('customers')->find($odp->id);

        $this->assertSame(1, $loaded->customers_count);
    }
}
