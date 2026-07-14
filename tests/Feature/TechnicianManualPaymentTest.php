<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Router;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TechnicianManualPaymentTest extends TestCase
{
    use RefreshDatabase;

    private function makeTechnicianWithRouter(bool $canManualPayment = true): array
    {
        $router = Router::create([
            'name' => 'Router Teknisi',
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'secret',
            'protocol_type' => 'legacy_socket',
            'status' => false,
        ]);

        $technician = User::factory()->create([
            'role' => User::ROLE_TECHNICIAN,
            'assigned_router_id' => $router->id,
            'can_manual_payment' => $canManualPayment,
        ]);

        return [$technician, $router];
    }

    private function makeUnpaidInvoice(Router $router, string $suffix): Invoice
    {
        $user = User::factory()->create();
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
            'username' => 'cust_' . $suffix,
            'password' => 'pass',
            'name' => 'Pelanggan ' . $suffix,
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 25,
            'service_start_date' => '2026-01-01',
        ]);

        return Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-TECH-' . $suffix,
            'billing_period' => '2026-06',
            'amount' => 150000,
            'days_billed' => 30,
            'is_prorated' => false,
            'tax' => 0,
            'total_amount' => 150000,
            'due_date' => '2026-06-25',
            'status' => 'unpaid',
        ]);
    }

    public function test_technician_with_permission_can_pay_manual(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        [$technician, $router] = $this->makeTechnicianWithRouter(true);
        $invoice = $this->makeUnpaidInvoice($router, 'A001');

        $response = $this->actingAs($technician)
            ->post('/admin/invoices/pay-manual', ['invoice_id' => $invoice->id]);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertSame('paid', $invoice->fresh()->status);
    }

    public function test_pay_manual_json_returns_print_url_without_redirect(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-20'));

        [$technician, $router] = $this->makeTechnicianWithRouter(true);
        $invoice = $this->makeUnpaidInvoice($router, 'A001J');

        $response = $this->actingAs($technician)
            ->postJson('/admin/invoices/pay-manual', [
                'invoice_id' => $invoice->id,
                'send_whatsapp' => false,
            ]);

        $response->assertOk();
        $response->assertJsonPath('ok', true);
        $response->assertJsonPath('print_invoice_id', $invoice->id);
        $this->assertStringContainsString(
            '/admin/invoices/' . $invoice->id . '/print',
            (string) $response->json('print_url')
        );
        $this->assertSame('paid', $invoice->fresh()->status);
    }

    public function test_technician_without_permission_cannot_pay_manual(): void
    {
        [$technician, $router] = $this->makeTechnicianWithRouter(false);
        $invoice = $this->makeUnpaidInvoice($router, 'B002');

        $response = $this->actingAs($technician)
            ->post('/admin/invoices/pay-manual', ['invoice_id' => $invoice->id]);

        $response->assertRedirect();
        $response->assertSessionHas('error');
        $this->assertSame('unpaid', $invoice->fresh()->status);
    }

    public function test_technician_cannot_pay_invoice_outside_assigned_router(): void
    {
        [$technician] = $this->makeTechnicianWithRouter(true);

        $otherRouter = Router::create([
            'name' => 'Router Lain',
            'host' => '127.0.0.2',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'secret',
            'protocol_type' => 'legacy_socket',
            'status' => false,
        ]);

        $invoice = $this->makeUnpaidInvoice($otherRouter, 'C003');

        $response = $this->actingAs($technician)
            ->post('/admin/invoices/pay-manual', ['invoice_id' => $invoice->id]);

        $response->assertForbidden();
        $this->assertSame('unpaid', $invoice->fresh()->status);
    }

    public function test_super_admin_can_save_technician_manual_payment_flag(): void
    {
        $superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        $router = Router::create([
            'name' => 'Router Save Test',
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'secret',
            'protocol_type' => 'legacy_socket',
            'status' => false,
        ]);

        $response = $this->actingAs($superAdmin)->post('/admin/users/save', [
            'name' => 'Teknisi Bayar',
            'email' => 'teknisi-bayar@example.com',
            'password' => 'secret123',
            'role' => User::ROLE_TECHNICIAN,
            'assigned_router_id' => $router->id,
            'can_manual_payment' => '1',
            'is_active' => '1',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $technician = User::query()->where('email', 'teknisi-bayar@example.com')->first();
        $this->assertTrue($technician->can_manual_payment);
        $this->assertTrue($technician->canPayManual());
    }
}
