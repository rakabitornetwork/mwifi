<?php

namespace App\Services\Router;

use Illuminate\Contracts\Cache\LockTimeoutException;
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
     * @param  callable(): array<string, mixed>  $resolver
     * @return array<string, mixed>
     */
    public static function remember(int $routerId, string $scope, callable $resolver): array
    {
        $key = self::key($routerId, $scope);
        $cached = Cache::get($key);

        if (is_array($cached)) {
            return $cached;
        }

        $lock = Cache::lock($key . ':lock', 120);

        try {
            return $lock->block(90, function () use ($key, $resolver) {
                $cached = Cache::get($key);
                if (is_array($cached)) {
                    return $cached;
                }

                $payload = $resolver();
                Cache::put($key, $payload, self::ttl());

                return $payload;
            });
        } catch (LockTimeoutException) {
            $cached = Cache::get($key);

            return is_array($cached) ? $cached : $resolver();
        }
    }

    public static function forget(int $routerId): void
    {
        Cache::forget(self::key($routerId, self::SCOPE_LIST));
        Cache::forget(self::key($routerId, self::SCOPE_FORM));
        Cache::forget(self::key($routerId, self::SCOPE_LIST) . ':lock');
        Cache::forget(self::key($routerId, self::SCOPE_FORM) . ':lock');
    }
}
