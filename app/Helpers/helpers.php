<?php

if (!function_exists('setting')) {
    /**
     * Get or set a dynamic setting.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    function setting(string $key, $default = null)
    {
        return \App\Services\SettingService::get($key, $default);
    }
}
