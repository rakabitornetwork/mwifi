<?php

namespace Tests\Feature;

use App\Models\Package;
use App\Models\Router;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CustomerRegistrationWhatsAppTest extends TestCase
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

    public function test_new_customer_registration_sends_whatsapp_welcome(): void
    {
        $this->seedWhatsAppSettings();
        Http::fake([
            'http://127.0.0.1:3003/send-message' => Http::response(['success' => true], 200),
        ]);

        $admin = User::factory()->create();
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

        $response = $this->actingAs($admin)->post('/admin/customers/save', [
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'pelanggan_baru',
            'password' => 'rahasia123',
            'name' => 'Ahmad Baru',
            'phone_number' => '6281234567890',
            'address' => 'Jl. Test No. 1',
            'status' => 'active',
            'billing_date' => 20,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        Http::assertSent(fn ($request) => $request->url() === 'http://127.0.0.1:3003/send-message'
            && $request['to'] === '6281234567890'
            && str_contains($request['text'], 'pelanggan_baru')
            && str_contains($request['text'], 'SELAMAT DATANG'));
    }

    public function test_update_existing_customer_does_not_send_registration_whatsapp(): void
    {
        $this->seedWhatsAppSettings();
        Http::fake([
            'http://127.0.0.1:3003/send-message' => Http::response(['success' => true], 200),
        ]);

        $admin = User::factory()->create();
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

        $user = User::factory()->create();
        $customer = \App\Models\Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'pelanggan_lama',
            'password' => 'rahasia123',
            'name' => 'Ahmad Lama',
            'phone_number' => '6281234567890',
            'address' => 'Jl. Test No. 1',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => '2026-01-01',
        ]);

        $response = $this->actingAs($admin)->post('/admin/customers/save', [
            'id' => $customer->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'pelanggan_lama',
            'password' => 'rahasia123',
            'name' => 'Ahmad Lama Updated',
            'phone_number' => '6281234567890',
            'address' => 'Jl. Test No. 1',
            'status' => 'active',
            'billing_date' => 20,
        ]);

        $response->assertRedirect();
        Http::assertNothingSent();
    }
}
