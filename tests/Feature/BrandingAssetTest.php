<?php

namespace Tests\Feature;

use App\Services\BrandingService;
use App\Services\SettingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BrandingAssetTest extends TestCase
{
    use RefreshDatabase;

    public function test_branding_logo_is_served_via_laravel_route(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('branding/test-logo.png', 'fake-png');

        SettingService::set('system.logo', 'branding/test-logo.png');
        BrandingService::clearBrandingCache();

        $branding = BrandingService::get();

        $this->assertNotNull($branding['logo_url']);
        $this->assertStringContainsString('/branding/logo', $branding['logo_url']);

        $response = $this->get('/branding/logo');

        $response->assertOk();
    }

    public function test_branding_logo_returns_404_when_missing(): void
    {
        Storage::fake('public');
        SettingService::set('system.logo', 'branding/missing.png');
        BrandingService::clearBrandingCache();

        $this->get('/branding/logo')->assertNotFound();
    }

    public function test_branding_logo_falls_back_to_latest_file_in_branding_folder(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('branding/fallback-logo.png', 'logo-bytes');

        SettingService::set('system.logo', 'branding/missing.png');
        BrandingService::clearBrandingCache();

        $this->get('/branding/logo')->assertOk();
    }

    public function test_branding_repair_command_syncs_database_path(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('branding/live-logo.png', 'logo-bytes');

        SettingService::set('system.logo', 'branding/missing.png');
        BrandingService::clearBrandingCache();

        $this->artisan('branding:repair')->assertSuccessful();

        $this->assertSame('branding/live-logo.png', SettingService::get('system.logo'));
    }
}
