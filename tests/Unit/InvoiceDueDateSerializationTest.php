<?php

namespace Tests\Unit;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Router;
use App\Models\User;
use App\Services\BillingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceDueDateSerializationTest extends TestCase
{
    use RefreshDatabase;

    public function test_invoice_to_array_serializes_due_date_in_utc_causing_day_shift(): void
    {
        config(['app.timezone' => 'Asia/Jakarta']);

        $invoice = new Invoice(['due_date' => '2026-07-01']);
        $serialized = $invoice->toArray()['due_date'];

        $this->assertSame('2026-06-30T17:00:00.000000Z', $serialized);
    }

    public function test_append_next_billing_to_invoices_preserves_calendar_due_date(): void
    {
        config(['app.timezone' => 'Asia/Jakarta']);

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
        $customer = Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust_due_date',
            'password' => 'pass',
            'name' => 'Pelanggan Due Date',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => '2026-07-01',
            'service_start_date' => '2026-06-01',
        ]);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-DUE-DATE-TEST',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-07-01',
            'status' => 'unpaid',
        ]);

        $serialized = BillingService::appendNextBillingToInvoices(collect([$invoice->fresh()]));

        $this->assertSame('2026-07-01', $serialized[0]['due_date']);
    }
}
