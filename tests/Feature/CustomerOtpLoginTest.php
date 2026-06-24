<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Package;
use App\Models\Router;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CustomerOtpLoginTest extends TestCase
{
    use RefreshDatabase;

    private function seedWhatsAppSettings(): void
    {
        Setting::updateOrCreate(['key' => 'whatsapp.enabled'], [
            'group' => 'whatsapp',
            'value' => '1',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'whatsapp.api_url'], [
            'group' => 'whatsapp',
            'value' => 'http://127.0.0.1:3003',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'whatsapp.session_id'], [
            'group' => 'whatsapp',
            'value' => 'mwifi_session',
            'is_encrypted' => false,
        ]);
    }

    private function makeCustomer(string $phone = '6281234567890'): Customer
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
            'price' => 120000,
            'bandwidth_limit' => '10M/10M',
            'mikrotik_profile' => '10M',
        ]);

        return Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'pelanggan_otp',
            'password' => 'rahasia123',
            'name' => 'Pelanggan OTP',
            'phone_number' => $phone,
            'address' => 'Jl. Test No. 1',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => now()->format('Y-m-d'),
        ]);
    }

    public function test_portal_login_page_is_accessible(): void
    {
        $this->get('/portal')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Customer/Login'));
    }

    public function test_customer_can_request_and_verify_otp(): void
    {
        $this->seedWhatsAppSettings();
        Http::fake([
            'http://127.0.0.1:3003/send-message' => Http::response(['success' => true], 200),
        ]);

        $customer = $this->makeCustomer('081234567890');

        $this->post('/portal/otp/request', [
            'phone_number' => '081234567890',
        ])->assertRedirect(route('portal.login'));

        $otp = '654321';
        Cache::put('customer_portal_otp:6281234567890', [
            'hash' => Hash::make($otp),
            'customer_id' => $customer->id,
            'attempts' => 0,
        ], 300);

        $this->post('/portal/otp/verify', [
            'phone_number' => '081234567890',
            'otp' => $otp,
        ])->assertRedirect('/customer/dashboard');

        $this->assertAuthenticatedAs($customer->user);
    }

    public function test_customer_dashboard_requires_customer_session(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)
            ->get('/customer/dashboard')
            ->assertRedirect(route('dashboard'));
    }

    public function test_staff_login_rejects_customer_account(): void
    {
        $customer = $this->makeCustomer();

        $this->post('/login', [
            'email' => $customer->user->email,
            'password' => 'password',
        ])->assertSessionHasErrors('email');
    }

    public function test_unknown_phone_still_shows_generic_success_on_request(): void
    {
        $this->seedWhatsAppSettings();
        Http::fake();

        $this->post('/portal/otp/request', [
            'phone_number' => '089999999999',
        ])->assertRedirect(route('portal.login'));

        Http::assertNothingSent();
    }

    public function test_customer_logout_redirects_to_portal_login(): void
    {
        $customer = $this->makeCustomer();

        $this->actingAs($customer->user)
            ->post('/logout')
            ->assertRedirect(route('portal.login'));
    }
}
