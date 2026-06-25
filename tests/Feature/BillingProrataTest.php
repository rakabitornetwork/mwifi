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

class BillingProrataTest extends TestCase
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

    private function makeCustomer(string $serviceStartDate, int $billingDate = 20): Customer
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
            'name' => 'Pelanggan Test',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => $billingDate,
            'service_start_date' => $serviceStartDate,
        ]);
    }

    public function test_prorata_for_customer_starting_mid_month(): void
    {
        $customer = $this->makeCustomer('2026-06-15', 20);

        $billing = BillingService::calculateInvoiceAmount($customer, '2026-06', 150000);

        $this->assertNotNull($billing);
        $this->assertTrue($billing['is_prorated']);
        $this->assertSame(6, $billing['days_billed']);
        $this->assertSame(30000.0, $billing['amount']);
    }

    public function test_prorata_ends_on_billing_date_not_end_of_month(): void
    {
        $customer = $this->makeCustomer('2026-06-15', 25);

        $billing = BillingService::calculateInvoiceAmount($customer, '2026-06', 120000);

        $this->assertNotNull($billing);
        $this->assertTrue($billing['is_prorated']);
        $this->assertSame(11, $billing['days_billed']);
        $this->assertSame(44000.0, $billing['amount']);
    }

    public function test_full_month_after_first_billing_period(): void
    {
        $customer = $this->makeCustomer('2026-06-15');

        $billing = BillingService::calculateInvoiceAmount($customer, '2026-07', 150000);

        $this->assertNotNull($billing);
        $this->assertFalse($billing['is_prorated']);
        $this->assertSame(30, $billing['days_billed']);
        $this->assertSame(150000.0, $billing['amount']);
    }

    public function test_skips_period_before_service_start(): void
    {
        $customer = $this->makeCustomer('2026-07-01');

        $billing = BillingService::calculateInvoiceAmount($customer, '2026-06', 150000);

        $this->assertNull($billing);
    }

    public function test_prorata_disabled_uses_full_price(): void
    {
        Setting::where('key', 'system.billing_prorata_enabled')->update(['value' => '0']);

        $customer = $this->makeCustomer('2026-06-15');
        $billing = BillingService::calculateInvoiceAmount($customer, '2026-06', 150000);

        $this->assertNotNull($billing);
        $this->assertFalse($billing['is_prorated']);
        $this->assertSame(150000.0, $billing['amount']);
    }

    public function test_service_start_date_keeps_calendar_day_for_prorata(): void
    {
        $customer = $this->makeCustomer('2026-01-06', 20);

        $resolved = BillingService::resolveServiceStartDate($customer);

        $this->assertSame('2026-01-06', $resolved->format('Y-m-d'));
    }

    public function test_prorata_uses_next_month_due_when_billing_date_already_passed(): void
    {
        $customer = $this->makeCustomer('2026-06-23', 20);

        $billing = BillingService::calculateInvoiceAmount($customer, '2026-07', 120000);

        $this->assertNotNull($billing);
        $this->assertTrue($billing['is_prorated']);
        $this->assertSame(28, $billing['days_billed']);
        $this->assertSame(112000.0, $billing['amount']);
    }

    public function test_resolve_next_due_date_uses_following_month_when_day_passed(): void
    {
        $customer = $this->makeCustomer('2026-06-23', 20);
        $fromDate = Carbon::createFromFormat('Y-m-d', '2026-06-23');

        $dueDate = BillingService::resolveNextDueDateFrom($customer, $fromDate);

        $this->assertSame('2026-07-20', $dueDate->format('Y-m-d'));
    }

    public function test_registration_preview_after_billing_date_targets_next_due(): void
    {
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d', '2026-06-23'));

        $customer = $this->makeCustomer('2026-06-23', 20);
        $preview = BillingService::previewRegistrationBilling($customer, 120000);

        $this->assertNotNull($preview);
        $this->assertSame('2026-07', $preview['period']);
        $this->assertSame('20 Juli 2026', $preview['due_date']);
        $this->assertTrue($preview['is_prorated']);
        $this->assertSame(28, $preview['days_billed']);
        $this->assertStringContainsString('Juli 2026', $preview['period_label']);
        $this->assertStringContainsString('23 Juni 2026 s/d 20 Juli 2026', $preview['billing_info']);

        Carbon::setTestNow();
    }

    public function test_registration_preview_for_mid_month_start_with_billing_on_first(): void
    {
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d', '2026-06-25'));

        $customer = $this->makeCustomer('2026-06-25', 1);
        $preview = BillingService::previewRegistrationBilling($customer, 110000);

        $this->assertNotNull($preview);
        $this->assertSame('2026-07', $preview['period']);
        $this->assertSame('01 Juli 2026', $preview['due_date']);
        $this->assertTrue($preview['is_prorated']);
        $this->assertSame(7, $preview['days_billed']);
        $this->assertSame('Rp 25.667', $preview['estimated_subtotal']);
        $this->assertStringContainsString('25 Juni 2026 s/d 01 Juli 2026', $preview['billing_info']);

        Carbon::setTestNow();
    }

    public function test_manual_first_invoice_matches_registration_preview(): void
    {
        Carbon::setTestNow(Carbon::createFromFormat('Y-m-d', '2026-06-25'));

        $customer = $this->makeCustomer('2026-06-25', 1);
        $package = $customer->package;
        $package->update(['price' => 110000]);

        $created = BillingService::generateInvoiceForCustomer($customer->fresh(), null, 0);

        $this->assertSame('2026-07', $created['billing_period']);
        $this->assertSame('2026-07-01', $created['due_date']);
        $this->assertSame(7, Invoice::first()->days_billed);
        $this->assertSame(25666.67, (float) Invoice::first()->amount);

        Carbon::setTestNow();
    }

    public function test_whatsapp_invoice_date_labels_use_indonesian_format(): void
    {
        $this->assertSame('Juli 2026', BillingService::formatWhatsAppBillingPeriod('2026-07'));
        $this->assertSame('April 2026 + Mei 2026', BillingService::formatWhatsAppBillingPeriod('2026-04 + 2026-05'));
        $this->assertSame('01 Juli 2026', BillingService::formatWhatsAppDueDate('2026-07-01'));
    }

    public function test_unpaid_invoice_whatsapp_message_uses_indonesian_period_and_due_date(): void
    {
        $customer = $this->makeCustomer('2026-06-25', 1);
        $invoice = Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-202607-0977-D99A',
            'billing_period' => '2026-07',
            'amount' => 28000,
            'days_billed' => 7,
            'is_prorated' => true,
            'tax' => 0,
            'total_amount' => 28000,
            'due_date' => '2026-07-01',
            'status' => 'unpaid',
        ]);

        $message = BillingService::buildUnpaidInvoiceWhatsAppMessage($invoice);

        $this->assertNotNull($message);
        $this->assertStringContainsString('periode *Juli 2026*', $message);
        $this->assertStringContainsString('*01 Juli 2026*', $message);
        $this->assertStringNotContainsString('2026-07', $message);
        $this->assertStringNotContainsString('01-07-2026', $message);
    }
}
