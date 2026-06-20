<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Cache;

class SettingService
{
    /**
     * Get a setting by key.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function get(string $key, $default = null)
    {
        return Cache::remember("setting.{$key}", 3600, function () use ($key, $default) {
            $setting = Setting::where('key', $key)->first();

            if (!$setting) {
                $legacyKey = str_replace('.', '_', $key);
                if ($legacyKey !== $key) {
                    $setting = Setting::where('key', $legacyKey)->first();
                }
            }
            
            if (!$setting) {
                return $default;
            }

            if ($setting->value === null || $setting->value === '') {
                return $setting->value;
            }

            if (self::isBrokenUploadPath($setting->value)) {
                return $default;
            }

            if ($setting->is_encrypted) {
                try {
                    return Crypt::decryptString($setting->value);
                } catch (\Exception $e) {
                    return null;
                }
            }

            return $setting->value;
        });
    }

    /**
     * Set a setting value.
     *
     * @param string $key
     * @param mixed $value
     * @param string|null $group
     * @param bool $isEncrypted
     * @return Setting
     */
    public static function set(string $key, $value, ?string $group = null, bool $isEncrypted = false): Setting
    {
        $group = $group ?? (explode('.', $key)[0] ?? 'system');
        
        $rawValue = $value;
        if ($value !== null && $isEncrypted) {
            $rawValue = Crypt::encryptString($value);
        }

        $setting = Setting::updateOrCreate(
            ['key' => $key],
            [
                'group' => $group,
                'value' => $rawValue,
                'is_encrypted' => $isEncrypted,
            ]
        );

        // Clear cache
        Cache::forget("setting.{$key}");
        Cache::forget("settings.group.{$group}");
        Cache::forget("settings.all");

        return $setting;
    }

    /**
     * Merge legacy underscore keys (system_company_name) into canonical dot keys and remove invalid rows.
     */
    public static function cleanupLegacyDuplicateKeys(): void
    {
        $map = [
            'system_app_name' => 'system.app_name',
            'system_company_name' => 'system.company_name',
            'system_company_tagline' => 'system.company_tagline',
            'system_company_email' => 'system.company_email',
            'system_company_phone' => 'system.company_phone',
            'system_company_address' => 'system.company_address',
            'system_company_website' => 'system.company_website',
            'system_footer_copyright' => 'system.footer_copyright',
            'system_seo_title' => 'system.seo_title',
            'system_seo_description' => 'system.seo_description',
            'system_seo_keywords' => 'system.seo_keywords',
            'system_seo_robots' => 'system.seo_robots',
            'system_logo' => null,
            'system_favicon' => null,
        ];

        foreach ($map as $legacyKey => $canonicalKey) {
            $legacy = Setting::where('key', $legacyKey)->first();
            if (!$legacy) {
                continue;
            }

            if ($canonicalKey === null || self::isBrokenUploadPath($legacy->value)) {
                $legacy->delete();
                Cache::forget("setting.{$legacyKey}");
                continue;
            }

            $canonical = Setting::where('key', $canonicalKey)->first();
            $shouldMigrate = !$canonical
                || $canonical->value === null
                || $canonical->value === ''
                || $legacy->updated_at >= $canonical->updated_at;

            if ($shouldMigrate && $legacy->value !== null && $legacy->value !== '') {
                self::set($canonicalKey, $legacy->value, null, (bool) $legacy->is_encrypted);
            }

            $legacy->delete();
            Cache::forget("setting.{$legacyKey}");
        }
    }

    public static function isBrokenUploadPath(mixed $value): bool
    {
        if (!is_string($value)) {
            return false;
        }

        return str_contains($value, '\Temp\\')
            || str_contains($value, '/tmp/php')
            || str_contains($value, 'AppData\\Local\\Temp');
    }

    /**
     * Get all settings as key-value array.
     *
     * @param string|null $group
     * @return array
     */
    public static function all(?string $group = null): array
    {
        $cacheKey = $group ? "settings.group.{$group}" : "settings.all";
        
        return Cache::remember($cacheKey, 3600, function () use ($group) {
            $query = Setting::query();
            if ($group) {
                $query->where('group', $group);
            }
            
            $settings = $query->get();
            $result = [];
            
            foreach ($settings as $setting) {
                $value = $setting->value;
                if ($value !== null && $value !== '' && $setting->is_encrypted) {
                    try {
                        $value = Crypt::decryptString($value);
                    } catch (\Exception $e) {
                        $value = null;
                    }
                }
                $result[$setting->key] = $value;
            }
            
            return $result;
        });
    }
}
