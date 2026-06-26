<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Package;
use App\Models\Router;
use App\Models\Setting;
use App\Services\VpsCatalogService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class DuitkuDemoSetupCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_setup_command_prepares_showcase_customer_and_demo_login(): void
    {
        Router::create([
            'name' => 'Router Test',
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'secret',
            'protocol_type' => 'legacy_socket',
            'status' => false,
        ]);
        Package::create([
            'name' => 'Paket 10 Mbps',
            'type' => 'pppoe',
            'price' => 120000,
            'bandwidth_limit' => '10M/10M',
            'mikrotik_profile' => '10M',
        ]);

        $exitCode = Artisan::call('duitku:setup-demo');

        $this->assertSame(0, $exitCode);

        $customer = Customer::query()->where('username', 'duitku@demo')->first();
        $this->assertNotNull($customer);
        $this->assertTrue(VpsCatalogService::isShowcaseCustomer($customer));
        $this->assertSame('1', Setting::where('key', 'vps.enabled')->value('value'));
        $this->assertSame('duitku', Setting::where('key', 'vps.whitelist_usernames')->value('value'));
        $this->assertSame('duitku', Setting::where('key', 'payment.active_gateway')->value('value'));

        $url = VpsCatalogService::generateDemoLoginUrl($customer);
        $this->assertNotNull($url);

        $this->get($url)
            ->assertRedirect('/customer/dashboard');

        $this->assertAuthenticatedAs($customer->user);
        $this->assertTrue(session('customer_portal_vps_showcase'));

        $this->get('/customer/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Customer/Dashboard')
                ->where('portalView', 'vps')
                ->where('activeGateway', 'duitku')
                ->has('invoices', 1)
            );

        $this->assertTrue(\App\Services\BillingService::isGatewayInSandboxMode('duitku'));
    }
}
