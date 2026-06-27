<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Router;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerPortalPaymentTest extends TestCase
{
    use RefreshDatabase;

    private function makeCustomer(): Customer
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

        return Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust_pay',
            'password' => 'secret',
            'name' => 'Pelanggan Pay',
            'phone_number' => '6281234567890',
            'address' => 'Jl. Test',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => now()->format('Y-m-d'),
        ]);
    }

    public function test_customer_cannot_pay_via_gateway_when_sandbox_mode(): void
    {
        Setting::create([
            'group' => 'payment',
            'key' => 'payment.active_gateway',
            'value' => 'midtrans',
            'is_encrypted' => false,
        ]);
        Setting::create([
            'group' => 'payment',
            'key' => 'payment.midtrans.mode',
            'value' => 'sandbox',
            'is_encrypted' => false,
        ]);

        $customer = $this->makeCustomer();
        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-PAY-001',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => now()->addDays(5),
            'status' => 'unpaid',
        ]);

        $this->actingAs($customer->user)
            ->postJson("/customer/invoice/{$invoice->id}/pay", [
                'payment_method' => 'all',
            ])
            ->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);
    }
}
