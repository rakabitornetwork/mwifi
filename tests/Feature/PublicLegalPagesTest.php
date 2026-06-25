<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Services\LegalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicLegalPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_terms_page_renders_teslatech_style_sections(): void
    {
        Setting::updateOrCreate(['key' => 'system.company_name'], [
            'group' => 'system',
            'value' => 'Teslatech',
            'is_encrypted' => false,
        ]);

        $this->get('/syarat-ketentuan')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Public/PolicyPage')
                ->where('policy.page_title', 'Syarat & Ketentuan')
                ->where('policy.last_updated', '25 Juni 2026')
                ->has('policy.sections', 10)
                ->where('policy.sections.0.title', '1. Ruang Lingkup Layanan')
                ->has('legalLinks', 3)
            );
    }

    public function test_privacy_and_refund_pages_are_available(): void
    {
        $this->get('/kebijakan-privasi')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Public/PolicyPage')
                ->where('policy.page_title', 'Kebijakan Privasi')
                ->has('policy.sections', 10)
            );

        $this->get('/kebijakan-pengembalian')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Public/PolicyPage')
                ->where('policy.page_title', 'Kebijakan Pengembalian Dana')
                ->has('policy.sections', 9)
            );
    }

    public function test_homepage_includes_support_and_terms_preview(): void
    {
        Setting::updateOrCreate(['key' => 'system.company_email'], [
            'group' => 'system',
            'value' => 'info@teslatech.my.id',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'system.company_phone'], [
            'group' => 'system',
            'value' => '087778888820',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'system.company_address'], [
            'group' => 'system',
            'value' => 'Jl. Kopral Yahya Blok Anjun',
            'is_encrypted' => false,
        ]);

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Welcome')
                ->has('termsSections', 3)
                ->has('termsDocument.sections', 10)
                ->has('legalLinks', 3)
            );
    }

    public function test_custom_terms_override_is_parsed(): void
    {
        Setting::updateOrCreate(['key' => 'system.terms_of_service'], [
            'group' => 'system',
            'value' => "## Kebijakan Khusus\nIsi kebijakan khusus.",
            'is_encrypted' => false,
        ]);

        $document = LegalService::termsDocument();

        $this->assertCount(1, $document['sections']);
        $this->assertSame('Kebijakan Khusus', $document['sections'][0]['title']);
    }

    public function test_contact_items_use_branding_settings(): void
    {
        Setting::updateOrCreate(['key' => 'system.company_email'], [
            'group' => 'system',
            'value' => 'info@teslatech.my.id',
            'is_encrypted' => false,
        ]);

        $items = LegalService::contactItems();

        $this->assertSame('info@teslatech.my.id', $items[0]['value']);
    }
}
