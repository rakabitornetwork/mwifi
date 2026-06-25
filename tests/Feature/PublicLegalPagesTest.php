<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Services\LegalService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicLegalPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_terms_page_renders_default_sections(): void
    {
        Setting::updateOrCreate(['key' => 'system.company_name'], [
            'group' => 'system',
            'value' => 'Teslatech',
            'is_encrypted' => false,
        ]);

        $this->get('/syarat-ketentuan')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Public/TermsOfService')
                ->has('termsSections', 7)
                ->where('termsSections.0.title', '1. Ketentuan Umum')
            );
    }

    public function test_homepage_includes_support_and_terms_preview(): void
    {
        Setting::updateOrCreate(['key' => 'system.company_email'], [
            'group' => 'system',
            'value' => 'support@teslatech.my.id',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'system.company_phone'], [
            'group' => 'system',
            'value' => '6281234567890',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'system.company_address'], [
            'group' => 'system',
            'value' => 'Malang, Jawa Timur',
            'is_encrypted' => false,
        ]);

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Welcome')
                ->has('termsSections', 7)
            );
    }

    public function test_custom_terms_override_is_parsed(): void
    {
        Setting::updateOrCreate(['key' => 'system.terms_of_service'], [
            'group' => 'system',
            'value' => "## Kebijakan Khusus\nIsi kebijakan khusus.",
            'is_encrypted' => false,
        ]);

        $sections = LegalService::termsSections();

        $this->assertCount(1, $sections);
        $this->assertSame('Kebijakan Khusus', $sections[0]['title']);
        $this->assertSame('Isi kebijakan khusus.', $sections[0]['body']);
    }
}
