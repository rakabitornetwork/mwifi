<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Router;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceDeleteTest extends TestCase
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
            'name' => 'Paket 150K',
            'type' => 'pppoe',
            'price' => 150000,
            'bandwidth_limit' => '20M/20M',
            'mikrotik_profile' => '20M',
        ]);

        return Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust_' . uniqid(),
            'password' => 'pass',
            'name' => 'Pelanggan Delete Test',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => '2026-01-01',
        ]);
    }

    public function test_admin_can_delete_unpaid_invoice(): void
    {
        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0001-DEL',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'unpaid',
        ]);

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/delete', [
                'invoice_id' => $invoice->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('invoices', ['id' => $invoice->id]);
    }

    public function test_admin_can_delete_canceled_invoice(): void
    {
        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202605-0001-DEL',
            'billing_period' => '2026-05',
            'amount' => 5000,
            'days_billed' => 1,
            'is_prorated' => true,
            'tax' => 0,
            'total_amount' => 5000,
            'due_date' => '2026-06-28',
            'status' => 'canceled',
        ]);

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/delete', [
                'invoice_id' => $invoice->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseMissing('invoices', ['id' => $invoice->id]);
    }

    public function test_paid_invoice_cannot_be_deleted(): void
    {
        $admin = User::factory()->create();
        $customer = $this->makeCustomer();

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-0002-DEL',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/delete', [
                'invoice_id' => $invoice->id,
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertDatabaseHas('invoices', ['id' => $invoice->id]);
    }
}
