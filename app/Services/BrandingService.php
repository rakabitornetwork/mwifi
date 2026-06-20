<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;

class BrandingService
{
    public static function get(): array
    {
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
            'logo_url' => self::brandingAssetUrl('logo'),
            'favicon_url' => self::brandingAssetUrl('favicon'),
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
        if (!$path || SettingService::isBrokenUploadPath($path)) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        if (!Storage::disk('public')->exists($path)) {
            return null;
        }

        $url = asset('storage/' . ltrim($path, '/'));
        $version = SettingService::get('system.branding_version', '1');

        return $url . '?v=' . urlencode($version);
    }

    /**
     * URL logo/favicon via route Laravel — tidak bergantung symlink public/storage.
     */
    public static function brandingAssetUrl(string $type): ?string
    {
        if (!in_array($type, ['logo', 'favicon'], true)) {
            return null;
        }

        if (!self::resolveAssetPath($type)) {
            return null;
        }

        $version = SettingService::get('system.branding_version', '1');

        return route('branding.asset', ['type' => $type]) . '?v=' . urlencode($version);
    }

    /**
     * Temukan path file logo/favicon yang valid di disk public.
     */
    public static function resolveAssetPath(string $type): ?string
    {
        if (!in_array($type, ['logo', 'favicon'], true)) {
            return null;
        }

        $candidateKeys = $type === 'logo'
            ? ['system.logo', 'system_logo']
            : ['system.favicon', 'system_favicon', 'system.logo', 'system_logo'];

        foreach ($candidateKeys as $key) {
            $path = SettingService::get($key);
            if (self::isValidStoredAssetPath($path)) {
                return $path;
            }
        }

        return self::latestBrandingFile(
            $type === 'favicon'
                ? ['ico', 'png', 'webp', 'jpg', 'jpeg', 'svg']
                : ['png', 'webp', 'jpg', 'jpeg', 'svg']
        );
    }

    /**
     * Sinkronkan path logo/favicon di database dengan file terbaru di folder branding/.
     *
     * @return array{logo: ?string, favicon: ?string}
     */
    public static function repairStoredPaths(): array
    {
        $logoPath = self::resolveAssetPath('logo');
        if ($logoPath) {
            SettingService::set('system.logo', $logoPath);
        }

        $faviconPath = self::resolveAssetPath('favicon');
        if ($faviconPath) {
            SettingService::set('system.favicon', $faviconPath);
        }

        if ($logoPath || $faviconPath) {
            self::bumpVersion();
        }

        return [
            'logo' => $logoPath,
            'favicon' => $faviconPath,
        ];
    }

    public static function isValidStoredAssetPath(?string $path): bool
    {
        if (!$path || SettingService::isBrokenUploadPath($path)) {
            return false;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return false;
        }

        return Storage::disk('public')->exists($path);
    }

    /**
     * @param array<int, string> $extensions
     */
    private static function latestBrandingFile(array $extensions): ?string
    {
        $disk = Storage::disk('public');

        if (!$disk->exists('branding')) {
            return null;
        }

        $latestPath = null;
        $latestTime = 0;

        foreach ($disk->files('branding') as $file) {
            $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            if (!in_array($extension, $extensions, true)) {
                continue;
            }

            $modified = $disk->lastModified($file);
            if ($modified >= $latestTime) {
                $latestTime = $modified;
                $latestPath = $file;
            }
        }

        return $latestPath;
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
            'system_logo',
            'system_favicon',
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
