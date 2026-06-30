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

    public function test_branding_logo_wide_is_served_via_laravel_route(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('branding/test-logo-wide.png', 'fake-wide-png');

        SettingService::set('system.logo_wide', 'branding/test-logo-wide.png');
        BrandingService::clearBrandingCache();

        $branding = BrandingService::get();

        $this->assertNotNull($branding['logo_wide_url']);
        $this->assertStringContainsString('/branding/logo-wide', $branding['logo_wide_url']);

        $this->get('/branding/logo-wide')->assertOk();
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

    public function test_favicon_route_falls_back_to_logo_wide(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('branding/wide-only.png', 'wide-icon');

        SettingService::set('system.logo_wide', 'branding/wide-only.png');
        BrandingService::clearBrandingCache();

        $this->get('/favicon.ico')->assertOk();
        $this->assertNotNull(BrandingService::browserIconHref());
    }

    public function test_favicon_route_returns_404_when_no_brand_icon(): void
    {
        Storage::fake('public');
        BrandingService::clearBrandingCache();

        $this->get('/favicon.ico')->assertNotFound();
    }

    public function test_empty_branding_file_is_ignored_for_favicon(): void
    {
        Storage::fake('public');
        Storage::disk('public')->put('branding/empty-favicon.png', '');
        Storage::disk('public')->put('branding/real-logo.png', 'logo-bytes');

        SettingService::set('system.favicon', 'branding/empty-favicon.png');
        SettingService::set('system.logo', 'branding/real-logo.png');
        BrandingService::clearBrandingCache();

        $response = $this->get('/favicon.ico');

        $response->assertOk();
        $this->assertSame('branding/real-logo.png', BrandingService::resolveBrowserIconPath());
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
