<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Package;
use App\Models\Router;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerReactivationTest extends TestCase
{
    use RefreshDatabase;

    private function makeRouterAndPackage(): array
    {
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
            'name' => '10M',
            'type' => 'pppoe',
            'price' => 100000,
            'bandwidth_limit' => '10M/10M',
            'mikrotik_profile' => '10M',
        ]);

        return [$router, $package];
    }

    private function makeCustomer(array $overrides = []): Customer
    {
        [$router, $package] = $this->makeRouterAndPackage();
        $user = User::factory()->create();

        return Customer::create(array_merge([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'demo',
            'password' => 'pass123',
            'name' => 'Demo User',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => '2026-06-20',
        ], $overrides));
    }

    private function savePayload(Customer $customer, array $overrides = []): array
    {
        return array_merge([
            'id' => $customer->id,
            'router_id' => $customer->router_id,
            'package_id' => $customer->package_id,
            'service_type' => 'pppoe',
            'username' => $customer->username,
            'password' => $customer->password,
            'name' => $customer->name,
            'phone_number' => $customer->phone_number,
            'address' => $customer->address,
            'status' => 'active',
            'billing_date' => '2026-06-20',
        ], $overrides);
    }

    public function test_reactivating_inactive_customer_sets_status_active(): void
    {
        $admin = User::factory()->create();
        $customer = $this->makeCustomer(['status' => 'inactive']);

        $response = $this->actingAs($admin)->post('/admin/customers/save', $this->savePayload($customer, [
            'status' => 'active',
        ]));

        $response->assertRedirect();
        $this->assertSame('active', $customer->fresh()->status);
    }

    public function test_reactivating_pending_pause_customer_clears_pause_schedule(): void
    {
        $admin = User::factory()->create();
        $customer = $this->makeCustomer([
            'status' => 'active',
            'billing_pause_date' => '2026-06-14',
            'pending_pause_status' => 'inactive',
        ]);

        $this->assertTrue(
            \App\Services\BillingService::customerHasPendingServicePause($customer->fresh())
        );

        $response = $this->actingAs($admin)->post('/admin/customers/save', $this->savePayload($customer, [
            'status' => 'active',
        ]));

        $response->assertRedirect();

        $fresh = $customer->fresh();
        $this->assertSame('active', $fresh->status);
        $this->assertNull($fresh->pending_pause_status);
        $this->assertNull($fresh->billing_pause_date);
        $this->assertFalse(
            \App\Services\BillingService::customerHasPendingServicePause($fresh)
        );
    }
}
