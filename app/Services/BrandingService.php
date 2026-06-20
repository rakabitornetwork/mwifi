<?php

namespace App\Services;

class BrandingService
{
    public static function get(): array
    {
        $logoPath = SettingService::get('system.logo');
        $faviconPath = SettingService::get('system.favicon');
        $companyName = SettingService::get('system.company_name', 'mWiFi Manager');
        $appName = SettingService::get('system.app_name', 'mWiFi');
        $seoTitle = SettingService::get('system.seo_title', '');

        return [
            'app_name' => $appName,
            'company_name' => $companyName,
            'company_tagline' => SettingService::get('system.company_tagline', 'NOC Console'),
            'company_email' => SettingService::get('system.company_email', ''),
            'company_phone' => SettingService::get('system.company_phone', ''),
            'company_address' => SettingService::get('system.company_address', ''),
            'company_website' => SettingService::get('system.company_website', ''),
            'logo_url' => self::assetUrl($logoPath),
            'favicon_url' => self::assetUrl($faviconPath),
            'display_name' => $companyName ?: $appName,
            'footer_copyright' => self::renderCopyright(),
            'seo' => [
                'title' => $seoTitle ?: $appName,
                'description' => SettingService::get('system.seo_description', ''),
                'keywords' => SettingService::get('system.seo_keywords', ''),
                'robots' => SettingService::get('system.seo_robots', 'index,follow'),
            ],
            'version' => SettingService::get('system.branding_version', '1'),
        ];
    }

    public static function renderCopyright(?string $template = null): string
    {
        $template = $template ?? SettingService::get('system.footer_copyright', '');

        if ($template === null || $template === '') {
            return '© ' . date('Y') . ' ' . self::companyName() . '. All rights reserved.';
        }

        return str_replace(
            ['{year}', '{company}', '{app}', '{app_name}'],
            [date('Y'), self::companyName(), self::appName(), self::appName()],
            $template
        );
    }

    public static function companyName(): string
    {
        $company = SettingService::get('system.company_name', '');
        $app = SettingService::get('system.app_name', 'mWiFi');

        return $company ?: $app ?: 'mWiFi';
    }

    public static function appName(): string
    {
        return SettingService::get('system.app_name', 'mWiFi') ?: 'mWiFi';
    }

    public static function assetUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        $url = asset('storage/' . ltrim($path, '/'));
        $version = SettingService::get('system.branding_version', '1');

        return $url . '?v=' . urlencode($version);
    }

    public static function bumpVersion(): void
    {
        SettingService::set('system.branding_version', (string) time());
        self::clearBrandingCache();
    }

    public static function clearBrandingCache(): void
    {
        $keys = [
            'system.app_name',
            'system.company_name',
            'system.company_tagline',
            'system.company_email',
            'system.company_phone',
            'system.company_address',
            'system.company_website',
            'system.logo',
            'system.favicon',
            'system.footer_copyright',
            'system.seo_title',
            'system.seo_description',
            'system.seo_keywords',
            'system.seo_robots',
            'system.branding_version',
        ];

        foreach ($keys as $key) {
            \Illuminate\Support\Facades\Cache::forget("setting.{$key}");
        }

        \Illuminate\Support\Facades\Cache::forget('settings.group.system');
        \Illuminate\Support\Facades\Cache::forget('settings.all');
    }
}
