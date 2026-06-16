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
                return $default;
            }

            if ($setting->value === null || $setting->value === '') {
                return $setting->value;
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
