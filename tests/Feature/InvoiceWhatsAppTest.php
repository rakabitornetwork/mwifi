<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Payment;
use App\Models\Router;
use App\Models\Setting;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class InvoiceWhatsAppTest extends TestCase
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
            'name' => 'Pelanggan WA Test',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 20,
            'service_start_date' => '2026-01-01',
        ]);
    }

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

    public function test_admin_can_send_unpaid_invoice_via_whatsapp(): void
    {
        $this->seedWhatsAppSettings();
        Http::fake([
            'http://127.0.0.1:3003/send-message' => Http::response(['success' => true], 200),
        ]);

        $admin = User::factory()->create();
        $customer = $this->makeCustomer();
        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-WA01',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'unpaid',
        ]);

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/send-whatsapp', ['invoice_id' => $invoice->id]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        Http::assertSent(fn ($request) => $request->url() === 'http://127.0.0.1:3003/send-message'
            && str_contains($request['text'], 'INV-202606-WA01'));
    }

    public function test_admin_can_send_paid_invoice_via_whatsapp(): void
    {
        $this->seedWhatsAppSettings();
        Http::fake([
            'http://127.0.0.1:3003/send-message' => Http::response(['success' => true], 200),
        ]);

        $admin = User::factory()->create();
        $customer = $this->makeCustomer();
        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202606-WA02',
            'billing_period' => '2026-06',
            'amount' => 150000,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-20',
            'status' => 'paid',
            'paid_at' => now(),
        ]);
        Payment::create([
            'invoice_id' => $invoice->id,
            'gateway_name' => 'manual',
            'reference_number' => 'ADMIN-CASH-1',
            'payment_method' => 'Cash / Tunai',
            'amount_paid' => 150000,
            'fee_charged' => 0,
        ]);

        $response = $this->actingAs($admin)
            ->post('/admin/invoices/send-whatsapp', ['invoice_id' => $invoice->id]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        Http::assertSent(fn ($request) => str_contains($request['text'], 'Terima Kasih'));
    }

    public function test_paid_invoice_whatsapp_uses_app_timezone_for_payment_date(): void
    {
        config(['app.timezone' => 'Asia/Jakarta']);

        $paidAtUtc = Carbon::create(2026, 6, 21, 18, 4, 0, 'UTC');
        $formatted = \App\Services\BillingService::formatDisplayDateTime($paidAtUtc);

        $this->assertSame('22-06-2026 01:04', $formatted);
    }
}
