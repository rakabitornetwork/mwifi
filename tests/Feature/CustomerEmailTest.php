<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Package;
use App\Models\Router;
use App\Models\User;
use App\Services\Customer\LegacyCsvImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerEmailTest extends TestCase
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

    public function test_csv_import_stores_email_from_csv_column(): void
    {
        [$router] = $this->makeRouterAndPackage();

        $path = tempnam(sys_get_temp_dir(), 'customer-import-');
        file_put_contents($path, implode("\n", [
            'Login,Password,FullName,Plan,Email',
            'demo,pass123,Demo User,10M,demo@gmail.com',
        ]));

        $result = (new LegacyCsvImportService())->import($path, $router->id);

        $this->assertSame(1, $result['created']);
        $customer = Customer::where('username', 'demo')->firstOrFail();
        $this->assertSame('demo@gmail.com', $customer->user->email);
        $this->assertSame('demo@gmail.com', $customer->displayPortalEmail());
    }

    public function test_csv_import_updates_existing_customer_email_when_not_skipped(): void
    {
        [$router, $package] = $this->makeRouterAndPackage();

        $user = User::factory()->create(['email' => 'demo@mwifi.test']);
        Customer::create([
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
            'billing_date' => 20,
        ]);

        $path = tempnam(sys_get_temp_dir(), 'customer-import-');
        file_put_contents($path, implode("\n", [
            'Login,Password,FullName,Plan,email',
            'demo,pass123,Demo User,10M,demo@gmail.com',
        ]));

        $result = (new LegacyCsvImportService())->import($path, $router->id, false, false);

        $this->assertSame(1, $result['updated']);
        $this->assertSame('demo@gmail.com', $user->fresh()->email);
    }

    public function test_csv_import_skips_email_update_when_skip_existing_enabled(): void
    {
        [$router, $package] = $this->makeRouterAndPackage();

        $user = User::factory()->create(['email' => 'demo@mwifi.test']);
        Customer::create([
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
            'billing_date' => 20,
        ]);

        $path = tempnam(sys_get_temp_dir(), 'customer-import-');
        file_put_contents($path, implode("\n", [
            'Login,Password,FullName,Plan,Email',
            'demo,pass123,Demo User,10M,demo@gmail.com',
        ]));

        $result = (new LegacyCsvImportService())->import($path, $router->id, false, true);

        $this->assertSame(1, $result['skipped']);
        $this->assertSame('demo@mwifi.test', $user->fresh()->email);
    }

    public function test_save_customer_preserves_custom_email_on_update(): void
    {
        $admin = User::factory()->create();
        [$router, $package] = $this->makeRouterAndPackage();

        $user = User::factory()->create(['email' => 'demo@gmail.com']);
        $customer = Customer::create([
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
            'billing_date' => 20,
        ]);

        $response = $this->actingAs($admin)->post('/admin/customers/save', [
            'id' => $customer->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'demo',
            'password' => 'pass123',
            'name' => 'Demo User Updated',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 20,
        ]);

        $response->assertRedirect();
        $this->assertSame('demo@gmail.com', $user->fresh()->email);
    }

    public function test_save_customer_can_set_explicit_email(): void
    {
        $admin = User::factory()->create();
        [$router, $package] = $this->makeRouterAndPackage();

        $user = User::factory()->create(['email' => 'demo@mwifi.test']);
        $customer = Customer::create([
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
            'billing_date' => 20,
        ]);

        $response = $this->actingAs($admin)->post('/admin/customers/save', [
            'id' => $customer->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'demo',
            'password' => 'pass123',
            'name' => 'Demo User',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 20,
            'email' => 'demo@gmail.com',
        ]);

        $response->assertRedirect();
        $this->assertSame('demo@gmail.com', $user->fresh()->email);
    }
}
