<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Models\User;
use App\Services\MessageTemplateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MessagingTemplateTest extends TestCase
{
    use RefreshDatabase;

    public function test_message_template_service_renders_placeholders(): void
    {
        $rendered = MessageTemplateService::render('whatsapp.template.invoice_unpaid', [
            'customer_name' => 'Budi',
            'brand_name' => 'TeslaTech',
            'period' => '2026-06',
            'invoice_number' => 'INV-TEST',
            'service_type' => 'PPPOE',
            'username' => 'budi001',
            'subtotal' => 'Rp 150.000',
            'prorata_line' => '',
            'total' => 'Rp 150.000',
            'due_date' => '20-06-2026',
        ]);

        $this->assertStringContainsString('Budi', $rendered);
        $this->assertStringContainsString('INV-TEST', $rendered);
    }

    public function test_admin_can_open_messaging_page(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->get('/messaging');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Messaging/Index')
            ->has('templateDefinitions')
            ->has('templateDefaults'));
    }

    public function test_admin_can_preview_messaging_template(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->postJson('/admin/messaging/template-preview', [
            'key' => 'whatsapp.template.invoice_unpaid',
            'template' => 'Halo {customer_name}, tagihan {invoice_number}.',
        ]);

        $response->assertOk();
        $response->assertJsonPath('ok', true);
        $response->assertJsonFragment(['preview' => 'Halo Budi Santoso, tagihan INV-202606-0001-AB12.']);
    }

    public function test_staff_advance_template_renders_placeholders(): void
    {
        $rendered = MessageTemplateService::render('whatsapp.template.staff_advance_admin', [
            'brand_name' => 'mWiFi',
            'action_header' => 'Transaksi hutang/piutang *baru dicatat*.',
            'type_label' => 'Kasbon Teknisi',
            'staff_name' => 'Teknisi A',
            'router_name' => 'Router Utama',
            'counterparty' => '—',
            'title' => 'Kasbon BBM',
            'amount' => 'Rp 100.000',
            'transaction_date' => '24 Jun 2026',
            'payment_method' => 'Tunai',
            'notes' => '—',
            'recorded_by' => 'Admin',
            'balance_line' => "\n• Sisa kasbon teknisi : *Rp 100.000*",
        ]);

        $this->assertStringContainsString('Kasbon BBM', $rendered);
        $this->assertStringContainsString('Teknisi A', $rendered);
    }

    public function test_migration_seeds_whatsapp_templates(): void
    {
        $this->assertTrue(Setting::where('key', 'whatsapp.template.invoice_unpaid')->exists());
        $this->assertNotSame('', Setting::where('key', 'whatsapp.template.invoice_unpaid')->value('value'));
    }

    public function test_saving_templates_does_not_overwrite_gateway_settings(): void
    {
        $admin = User::factory()->create();

        Setting::updateOrCreate(['key' => 'whatsapp.enabled'], [
            'group' => 'whatsapp',
            'value' => '1',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'whatsapp.api_url'], [
            'group' => 'whatsapp',
            'value' => 'http://192.168.1.50:3003',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'whatsapp.session_id'], [
            'group' => 'whatsapp',
            'value' => 'office_session',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'whatsapp.bulk_delay_enabled'], [
            'group' => 'whatsapp',
            'value' => '1',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'whatsapp.bulk_batch_size'], [
            'group' => 'whatsapp',
            'value' => '15',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'whatsapp.bulk_window_seconds'], [
            'group' => 'whatsapp',
            'value' => '600',
            'is_encrypted' => false,
        ]);

        $response = $this->actingAs($admin)->post('/admin/messaging/save', [
            'whatsapp' => [
                'template' => [
                    'invoice_unpaid' => 'Halo {customer_name}, tagihan {invoice_number} jatuh tempo.',
                ],
            ],
        ]);

        $response->assertRedirect();
        $this->assertSame('1', Setting::where('key', 'whatsapp.enabled')->value('value'));
        $this->assertSame('http://192.168.1.50:3003', Setting::where('key', 'whatsapp.api_url')->value('value'));
        $this->assertSame('office_session', Setting::where('key', 'whatsapp.session_id')->value('value'));
        $this->assertSame('1', Setting::where('key', 'whatsapp.bulk_delay_enabled')->value('value'));
        $this->assertSame('15', Setting::where('key', 'whatsapp.bulk_batch_size')->value('value'));
        $this->assertSame('600', Setting::where('key', 'whatsapp.bulk_window_seconds')->value('value'));
        $this->assertSame(
            'Halo {customer_name}, tagihan {invoice_number} jatuh tempo.',
            Setting::where('key', 'whatsapp.template.invoice_unpaid')->value('value')
        );
    }
}
