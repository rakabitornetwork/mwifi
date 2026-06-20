<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Package;
use App\Models\Router;
use App\Models\User;
use App\Services\AppUpdateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function adminUser(): User
    {
        return User::factory()->create();
    }

    public function test_admin_can_open_update_page(): void
    {
        $response = $this->actingAs($this->adminUser())
            ->get('/update');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('activeTabProp', 'update')
            ->has('appUpdateInfo')
        );
    }

    public function test_update_status_has_expected_structure(): void
    {
        $status = app(AppUpdateService::class)->getStatus();

        $this->assertArrayHasKey('enabled', $status);
        $this->assertArrayHasKey('available', $status);
        $this->assertArrayHasKey('requirements', $status);
        $this->assertArrayHasKey('repository', $status);
        $this->assertArrayHasKey('local', $status);
        $this->assertArrayHasKey('remote', $status);
        $this->assertArrayHasKey('update_available', $status);
        $this->assertSame('https://github.com/rakabitornetwork/mwifi', $status['repository']['github_url']);
    }

    public function test_admin_can_check_for_updates(): void
    {
        $response = $this->actingAs($this->adminUser())
            ->post('/admin/update/check');

        $response->assertRedirect();
        $this->assertTrue(
            $response->getSession()->has('success') || $response->getSession()->has('error')
        );
    }

    public function test_run_update_requires_confirm_keyword(): void
    {
        $response = $this->actingAs($this->adminUser())
            ->post('/admin/update/run', [
                'confirm' => 'WRONG',
            ]);

        $response->assertSessionHasErrors('confirm');
    }

    public function test_customer_cannot_check_updates(): void
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
            'name' => 'Paket Test',
            'type' => 'pppoe',
            'price' => 100000,
            'bandwidth_limit' => '10M/10M',
            'mikrotik_profile' => '10M',
        ]);
        Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust001',
            'password' => 'secret',
            'name' => 'Pelanggan Test',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 1,
        ]);

        $response = $this->actingAs($user)
            ->post('/admin/update/check');

        $response->assertForbidden();
    }
}
