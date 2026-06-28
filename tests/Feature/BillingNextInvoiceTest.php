<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Router;
use App\Models\Setting;
use App\Models\User;
use App\Services\BillingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingNextInvoiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Setting::create([
            'group' => 'system',
            'key' => 'system.billing_prorata_enabled',
            'value' => '1',
            'is_encrypted' => false,
        ]);
    }

    private function makePaidInvoice(string $period = '2026-06'): Invoice
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
            'name' => 'Paket 120K',
            'type' => 'pppoe',
            'price' => 120000,
            'bandwidth_limit' => '20M/20M',
            'mikrotik_profile' => '20M',
        ]);
        $customer = Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust_' . uniqid(),
            'password' => 'pass',
            'name' => 'Pelanggan Test',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 25,
            'service_start_date' => '2026-06-15',
        ]);

        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-TEST-PAID',
            'billing_period' => $period,
            'amount' => 44000,
            'days_billed' => 11,
            'is_prorated' => true,
            'tax' => 0,
            'total_amount' => 44000,
            'due_date' => Carbon::create(2026, 6, 25),
            'status' => 'paid',
            'paid_at' => Carbon::create(2026, 6, 20),
        ]);

        return $invoice->load('customer.package');
    }

    public function test_resolve_next_billing_preview_for_paid_invoice(): void
    {
        $invoice = $this->makePaidInvoice();

        $preview = BillingService::resolveNextBillingPreview($invoice);

        $this->assertNotNull($preview);
        $this->assertSame('2026-07', $preview['period']);
        $this->assertSame('2026-07-25', $preview['due_date']);
        $this->assertFalse($preview['already_generated']);
        $this->assertSame('preview', $preview['status']);
        $this->assertSame(120000.0, $preview['total_amount']);
    }

    public function test_sync_customer_billing_date_after_paid_invoice_advances_to_next_due(): void
    {
        $invoice = $this->makePaidInvoice();
        $customer = $invoice->customer;

        $customer->update(['billing_date' => '2026-06-25']);
        $customer->refresh();

        BillingService::syncCustomerBillingDate($customer);

        $this->assertSame('2026-07-25', $customer->fresh()->billing_date?->format('Y-m-d'));
    }

    public function test_resolve_customer_upcoming_due_date_matches_next_billing_preview(): void
    {
        $invoice = $this->makePaidInvoice();
        $customer = $invoice->customer->fresh();

        $upcoming = BillingService::resolveCustomerUpcomingDueDate($customer);
        $preview = BillingService::resolveNextBillingPreview($invoice);

        $this->assertNotNull($upcoming);
        $this->assertSame($preview['due_date'], $upcoming->format('Y-m-d'));
    }

    public function test_returns_existing_next_invoice_when_already_generated(): void
    {
        $invoice = $this->makePaidInvoice();

        Invoice::create([
            'customer_id' => $invoice->customer_id,
            'invoice_number' => 'INV-NEXT',
            'billing_period' => '2026-07',
            'amount' => 120000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 120000,
            'due_date' => Carbon::create(2026, 7, 25),
            'status' => 'unpaid',
        ]);

        $preview = BillingService::resolveNextBillingPreview($invoice);

        $this->assertTrue($preview['already_generated']);
        $this->assertSame('INV-NEXT', $preview['invoice_number']);
        $this->assertSame('unpaid', $preview['status']);
    }

    public function test_admin_can_open_invoice_print_page(): void
    {
        $admin = User::factory()->create();
        $invoice = $this->makePaidInvoice();

        $response = $this->actingAs($admin)->get("/admin/invoices/{$invoice->id}/print?position=top");

        $response->assertOk();
        $response->assertSee($invoice->invoice_number);
        $response->assertSee('Tagihan Selanjutnya');
    }

    public function test_admin_can_open_invoice_print_a4_and_thermal(): void
    {
        $admin = User::factory()->create();
        $invoice = $this->makePaidInvoice();

        $a4 = $this->actingAs($admin)->get("/admin/invoices/{$invoice->id}/print?format=a4");
        $a4->assertOk();
        $a4->assertSee('Cetak A4');
        $a4->assertSee('BUKTI BAYAR');

        $thermal = $this->actingAs($admin)->get("/admin/invoices/{$invoice->id}/print?format=thermal");
        $thermal->assertOk();
        $thermal->assertSee('Thermal 58mm');
        $thermal->assertSee('Lunas');
    }

    public function test_next_billing_preview_skips_vps_invoices(): void
    {
        $invoice = $this->makePaidInvoice();
        $invoice->update([
            'invoice_number' => 'VPS-BUSINESS-0001-AB12',
            'billing_period' => 'vps:business',
        ]);

        $this->assertNull(BillingService::resolveNextBillingPreview($invoice->fresh()));

        $payload = BillingService::appendNextBillingToInvoices(collect([$invoice->fresh()]));
        $this->assertNull($payload[0]['next_billing'] ?? null);
    }

    public function test_paid_invoice_whatsapp_includes_next_billing_after_payment_time(): void
    {
        $invoice = $this->makePaidInvoice();

        $block = BillingService::buildPaidInvoiceNextBillingBlock($invoice);
        $this->assertStringContainsString('Tagihan Berikutnya', $block);
        $this->assertStringContainsString('Juli 2026', $block);
        $this->assertStringContainsString('Rp 120.000', $block);

        $message = BillingService::buildPaidInvoiceWhatsAppMessage($invoice);
        $this->assertNotNull($message);
        $this->assertStringContainsString('Waktu Bayar', $message);
        $this->assertLessThan(
            strpos($message, 'Tagihan Berikutnya'),
            strpos($message, 'Waktu Bayar')
        );
    }
}
