<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Payment;
use App\Models\Router;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerInvoicePrintTest extends TestCase
{
    use RefreshDatabase;

    private function seedVpsShowcase(string $username = 'duitku'): void
    {
        Setting::updateOrCreate(['key' => 'vps.enabled'], [
            'group' => 'vps',
            'value' => '1',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'vps.whitelist_usernames'], [
            'group' => 'vps',
            'value' => $username,
            'is_encrypted' => false,
        ]);
    }

    public function test_customer_can_print_own_paid_invoice(): void
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
        $customer = Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust_print',
            'password' => 'secret',
            'name' => 'Pelanggan Cetak',
            'phone_number' => '6281234567890',
            'address' => 'Jl. Test',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => now()->format('Y-m-d'),
        ]);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-PRINT-001',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => now()->addDays(5),
            'paid_at' => now(),
            'status' => 'paid',
        ]);

        Payment::create([
            'invoice_id' => $invoice->id,
            'gateway_name' => 'duitku',
            'reference_number' => 'ref-duitku-print',
            'amount_paid' => 150000,
            'fee_charged' => 0,
            'payment_method' => 'Retail',
        ]);

        $this->actingAs($user)
            ->get("/customer/invoice/{$invoice->id}/print")
            ->assertOk()
            ->assertSee('INV-PRINT-001')
            ->assertSee('Lunas');
    }

    public function test_showcase_vps_invoice_print_uses_vps_labels_not_pppoe_package(): void
    {
        $this->seedVpsShowcase();

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
            'name' => '3 Mbps - 100K',
            'type' => 'pppoe',
            'price' => 100000,
            'bandwidth_limit' => '3M/3M',
            'mikrotik_profile' => '3M',
        ]);
        $customer = Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'duitku@demo',
            'password' => 'secret',
            'name' => 'Duitku Demo',
            'phone_number' => '6287778888498',
            'address' => 'Alamat rahasia PPPoE',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => now()->format('Y-m-d'),
        ]);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'VPS-BUSINESS-0001-AB12',
            'billing_period' => 'vps:business',
            'amount' => 150000,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => now()->addDays(30),
            'paid_at' => now(),
            'status' => 'paid',
        ]);

        Payment::create([
            'invoice_id' => $invoice->id,
            'gateway_name' => 'duitku',
            'reference_number' => 'ref-duitku-vps',
            'amount_paid' => 150000,
            'fee_charged' => 0,
            'payment_method' => 'Retail',
        ]);

        $response = $this->actingAs($user)
            ->get("/customer/invoice/{$invoice->id}/print");

        $response->assertOk()
            ->assertSee('Sewa VPS — VPS Business (Bulanan)', false)
            ->assertSee('VPS Business', false)
            ->assertSee('2 vCPU', false)
            ->assertSee('SRV-BUSINESS-', false)
            ->assertDontSee('Tagihan Internet', false)
            ->assertDontSee('3 Mbps - 100K', false)
            ->assertDontSee('duitku@demo', false)
            ->assertDontSee('Alamat rahasia PPPoE', false);
    }

    public function test_customer_cannot_print_other_customers_invoice(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
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

        $ownerCustomer = Customer::create([
            'user_id' => $owner->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'owner',
            'password' => 'secret',
            'name' => 'Owner',
            'phone_number' => '6281111111111',
            'address' => 'Jl. A',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => now()->format('Y-m-d'),
        ]);

        Customer::create([
            'user_id' => $other->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'other',
            'password' => 'secret',
            'name' => 'Other',
            'phone_number' => '6282222222222',
            'address' => 'Jl. B',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => now()->format('Y-m-d'),
        ]);

        $invoice = Invoice::create([
            'customer_id' => $ownerCustomer->id,
            'invoice_number' => 'INV-OTHER-001',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => now()->addDays(5),
            'paid_at' => now(),
            'status' => 'paid',
        ]);

        $this->actingAs($other)
            ->get("/customer/invoice/{$invoice->id}/print")
            ->assertForbidden();
    }
}
