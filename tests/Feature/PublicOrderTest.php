<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Router;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PublicOrderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Create a default router
        Router::create([
            'name' => 'Router Test',
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'secret',
            'protocol_type' => 'legacy_socket',
            'status' => false,
        ]);

        // Mock payment settings
        Setting::updateOrCreate(['key' => 'payment.active_gateway'], [
            'group' => 'payment',
            'value' => 'midtrans',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'payment.midtrans.mode'], [
            'group' => 'payment',
            'value' => 'sandbox',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'services.midtrans.server_key'], [
            'group' => 'services',
            'value' => 'SB-Mid-server-12345',
            'is_encrypted' => false,
        ]);
        config(['services.midtrans.server_key' => 'SB-Mid-server-12345']);
    }

    public function test_guest_can_order_service_successfully(): void
    {
        // Fake Midtrans Snap API call
        Http::fake([
            'https://app.sandbox.midtrans.com/*' => Http::response([
                'token' => 'snap-token-12345',
                'redirect_url' => 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-12345',
            ], 201),
        ]);

        $response = $this->postJson('/layanan/pesan', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'phone' => '081234567890',
            'service_type' => 'starter',
            'payment_method' => 'all',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure(['success', 'reference', 'payment_url', 'invoice_number', 'message']);

        // Assert customer was created
        $this->assertDatabaseHas('customers', [
            'name' => 'John Doe',
            'phone_number' => '6281234567890',
        ]);

        // Assert invoice was created as VPS order
        $this->assertDatabaseHas('invoices', [
            'billing_period' => 'vps:starter',
            'amount' => 99000.00,
            'status' => 'unpaid',
        ]);
    }

    public function test_landing_order_customer_sees_vps_plan_in_portal(): void
    {
        Http::fake([
            'https://app.sandbox.midtrans.com/*' => Http::response([
                'token' => 'snap-token-12345',
                'redirect_url' => 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-12345',
            ], 201),
        ]);

        $this->postJson('/layanan/pesan', [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'phone' => '081234567890',
            'service_type' => 'starter',
            'payment_method' => 'all',
        ])->assertOk();

        $customer = Customer::where('phone_number', '6281234567890')->firstOrFail();

        $this->actingAs($customer->user)
            ->get('/customer/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Customer/Dashboard')
                ->where('portalView', 'vps')
                ->where('vpsPlan.id', 'starter')
                ->where('vpsPlan.cpu', '1 vCPU')
                ->where('vpsPlan.ram', '2 GB RAM')
                ->where('vpsPlan.bandwidth', '1 TB / bulan')
                ->missing('customer.package')
            );
    }

    public function test_legacy_service_invoice_still_resolves_vps_plan_in_portal(): void
    {
        $user = \App\Models\User::factory()->create([
            'email' => 'legacy@example.com',
        ]);
        $router = Router::first();
        $customer = Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => null,
            'service_type' => 'pppoe',
            'username' => 'legacy-vps',
            'password' => 'secret',
            'name' => 'Legacy VPS Buyer',
            'phone_number' => '6281111222333',
            'address' => 'Pemesanan via Landing Page',
            'status' => 'active',
            'billing_date' => 1,
            'service_start_date' => now()->toDateString(),
        ]);

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'SRV-STA-123456-99',
            'billing_period' => 'service:starter',
            'amount' => 99000,
            'tax' => 0,
            'total_amount' => 99000,
            'due_date' => now()->addDays(3),
            'status' => 'paid',
        ]);

        $this->actingAs($user)
            ->get('/customer/dashboard')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('portalView', 'vps')
                ->where('vpsPlan.name', 'VPS Starter')
                ->where('vpsPlan.storage', '40 GB SSD NVMe')
            );
    }

    public function test_order_fails_when_validation_fails(): void
    {
        $response = $this->postJson('/layanan/pesan', [
            'name' => '',
            'email' => 'invalid-email',
            'phone' => '',
            'service_type' => 'invalid_service',
        ]);

        $response->assertStatus(422)
            ->assertJsonStructure([
                'message',
                'errors' => [
                    'name',
                    'email',
                    'phone',
                    'service_type',
                ],
            ]);
    }
}
