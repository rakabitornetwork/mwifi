<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Services\MessageTemplateService;
use App\Services\PaymentInstructionService;
use App\Services\WhatsAppService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentInstructionTest extends TestCase
{
    use RefreshDatabase;

    public function test_payment_instruction_includes_bank_and_whatsapp_contact(): void
    {
        Setting::create([
            'group' => 'payment',
            'key' => 'payment.bank_name',
            'value' => 'BCA',
            'is_encrypted' => false,
        ]);
        Setting::create([
            'group' => 'payment',
            'key' => 'payment.bank_account_number',
            'value' => '1234567890',
            'is_encrypted' => false,
        ]);
        Setting::create([
            'group' => 'payment',
            'key' => 'payment.bank_account_holder',
            'value' => 'PT Tesla Tech',
            'is_encrypted' => false,
        ]);
        Setting::create([
            'group' => 'whatsapp',
            'key' => 'whatsapp.linked_phone',
            'value' => '6281234567890',
            'is_encrypted' => false,
        ]);

        $instructions = PaymentInstructionService::formatPaymentInstructions();

        $this->assertStringContainsString('BCA', $instructions);
        $this->assertStringContainsString('1234567890', $instructions);
        $this->assertStringContainsString('PT Tesla Tech', $instructions);
        $this->assertStringContainsString('+6281234567890', $instructions);
        $this->assertStringContainsString('bukti pembayaran', $instructions);
    }

    public function test_invoice_template_renders_payment_instructions(): void
    {
        Setting::create([
            'group' => 'payment',
            'key' => 'payment.bank_name',
            'value' => 'Mandiri',
            'is_encrypted' => false,
        ]);
        Setting::create([
            'group' => 'payment',
            'key' => 'payment.bank_account_number',
            'value' => '9876543210',
            'is_encrypted' => false,
        ]);
        Setting::create([
            'group' => 'whatsapp',
            'key' => 'whatsapp.linked_phone',
            'value' => '628111222333',
            'is_encrypted' => false,
        ]);

        $rendered = MessageTemplateService::renderWithPaymentInstructions('whatsapp.template.invoice_unpaid', [
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

        $this->assertStringContainsString('Mandiri', $rendered);
        $this->assertStringContainsString('+628111222333', $rendered);
        $this->assertStringContainsString('Cara Pembayaran', $rendered);
    }

    public function test_whatsapp_display_phone_formats_local_number(): void
    {
        $this->assertSame('+6281234567890', WhatsAppService::formatDisplayPhone('081234567890'));
        $this->assertSame('+6281234567890', WhatsAppService::formatDisplayPhone('6281234567890'));
    }
}
