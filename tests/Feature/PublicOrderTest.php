<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
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
            'service_type' => 'pembuatan_aplikasi',
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

        // Assert package was created
        $this->assertDatabaseHas('packages', [
            'name' => 'Jasa Pembuatan Aplikasi',
            'price' => 5000000.00,
        ]);

        // Assert invoice was created
        $this->assertDatabaseHas('invoices', [
            'billing_period' => 'service:pembuatan_aplikasi',
            'amount' => 5000000.00,
            'status' => 'unpaid',
        ]);
    }

    public function test_order_fails_when_validation_fails(): void
    {
        $this->withoutExceptionHandling();

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
