<?php

namespace App\Services\Router;

use Illuminate\Support\Facades\Cache;

class MikrotikPackageProfilesCache
{
    public const SCOPE_LIST = 'list';

    public const SCOPE_FORM = 'form';

    public static function key(int $routerId, string $scope): string
    {
        return "mikrotik:package_profiles:{$routerId}:{$scope}";
    }

    public static function ttl(): int
    {
        return max(30, (int) config('mikrotik.package_profiles_cache_ttl', 180));
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function get(int $routerId, string $scope): ?array
    {
        $payload = Cache::get(self::key($routerId, $scope));

        return is_array($payload) ? $payload : null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public static function put(int $routerId, string $scope, array $payload): array
    {
        Cache::put(self::key($routerId, $scope), $payload, self::ttl());

        return $payload;
    }

    public static function forget(int $routerId): void
    {
        Cache::forget(self::key($routerId, self::SCOPE_LIST));
        Cache::forget(self::key($routerId, self::SCOPE_FORM));
    }
}
