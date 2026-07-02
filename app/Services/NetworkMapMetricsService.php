<?php

namespace App\Services;

use App\Models\Router;
use App\Services\Router\MikrotikTrafficService;
use App\Services\Router\RouterService;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class NetworkMapMetricsService
{
    /**
     * @return array{
     *     ont: array<string, array<string, mixed>>,
     *     ont_devices: list<array<string, mixed>>,
     *     traffic: array<string, array<string, mixed>>,
     *     traffic_by_router: array<string, array<string, array<string, mixed>>>
     * }
     */
    public static function getPayload(StaffRouterScope $scope, ?int $routerId = null, bool $force = false): array
    {
        if ($routerId !== null) {
            $scope->ensureCanAccessRouter($routerId);
        }

        $ontDevices = self::cachedOntDevices($force);
        $trafficPayload = self::cachedTrafficPayload($scope, $routerId, $force);

        return [
            'ont' => self::indexOntByUsername($ontDevices),
            'ont_devices' => $ontDevices,
            'traffic' => $trafficPayload['merged'],
            'traffic_by_router' => $trafficPayload['by_router'],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function cachedOntDevices(bool $force): array
    {
        $key = 'network_map:ont_devices';

        if (!$force) {
            $cached = Cache::get($key);
            if (is_array($cached)) {
                return $cached;
            }
        }

        $lock = Cache::lock($key . ':lock', 60);

        try {
            return $lock->block(30, function () use ($key, $force) {
                if (!$force) {
                    $cached = Cache::get($key);
                    if (is_array($cached)) {
                        return $cached;
                    }
                }

                $devices = GenieAcsService::getOntDevicesForMap();
                Cache::put($key, $devices, self::ontCacheTtl());

                return $devices;
            });
        } catch (LockTimeoutException) {
            $cached = Cache::get($key);

            return is_array($cached) ? $cached : GenieAcsService::getOntDevicesForMap();
        }
    }

    /**
     * @return array{merged: array<string, array<string, mixed>>, by_router: array<string, array<string, array<string, mixed>>>}
     */
    private static function cachedTrafficPayload(StaffRouterScope $scope, ?int $routerId, bool $force): array
    {
        $key = self::trafficCacheKey($scope, $routerId);

        if (!$force) {
            $cached = Cache::get($key);
            if (is_array($cached)) {
                return $cached;
            }
        }

        $lock = Cache::lock($key . ':lock', 60);

        try {
            return $lock->block(30, function () use ($key, $scope, $routerId, $force) {
                if (!$force) {
                    $cached = Cache::get($key);
                    if (is_array($cached)) {
                        return $cached;
                    }
                }

                $payload = self::fetchTrafficPayload($scope, $routerId);
                Cache::put($key, $payload, self::trafficCacheTtl());

                return $payload;
            });
        } catch (LockTimeoutException) {
            $cached = Cache::get($key);

            return is_array($cached) ? $cached : self::fetchTrafficPayload($scope, $routerId);
        }
    }

    private static function trafficCacheKey(StaffRouterScope $scope, ?int $routerId): string
    {
        $scopeKey = $scope->isScoped() ? 'scope:' . $scope->routerId() : 'scope:all';
        $routerKey = $routerId !== null ? 'router:' . $routerId : 'router:all';

        return "network_map:traffic:{$scopeKey}:{$routerKey}";
    }

    /**
     * @return array{merged: array<string, array<string, mixed>>, by_router: array<string, array<string, array<string, mixed>>>}
     */
    private static function fetchTrafficPayload(StaffRouterScope $scope, ?int $routerId): array
    {
        $merged = [];
        $byRouter = [];

        foreach (self::routersForMetrics($scope, $routerId) as $router) {
            try {
                $connector = RouterService::getConnector($router);
                $routerTraffic = MikrotikTrafficService::fetchLightForConnector($connector);
                $byRouter[(string) $router->id] = $routerTraffic;

                foreach ($routerTraffic as $username => $entry) {
                    $merged[$username] = $entry;
                }
            } catch (\Throwable $e) {
                Log::warning("Network map traffic fetch failed for router {$router->id}: " . $e->getMessage());
                $byRouter[(string) $router->id] = [];
            }
        }

        return [
            'merged' => $merged,
            'by_router' => $byRouter,
        ];
    }

    /**
     * @return Collection<int, Router>
     */
    private static function routersForMetrics(StaffRouterScope $scope, ?int $routerId): Collection
    {
        $query = $scope->routersQuery();

        if ($routerId !== null) {
            $query->whereKey($routerId);
        }

        return $query->get();
    }

    /**
     * @param list<array<string, mixed>> $devices
     * @return array<string, array<string, mixed>>
     */
    private static function indexOntByUsername(array $devices): array
    {
        $map = [];

        foreach ($devices as $device) {
            $username = trim((string) ($device['username'] ?? ''));
            if ($username === '' || $username === 'unknown_ont') {
                continue;
            }

            $aliases = array_unique(array_filter([
                $username,
                strtolower($username),
                explode('@', $username)[0],
                strtolower(explode('@', $username)[0]),
            ]));

            foreach ($aliases as $alias) {
                $map[$alias] = $device;
            }
        }

        return $map;
    }

    private static function ontCacheTtl(): int
    {
        return max(10, (int) config('mikrotik.network_map_ont_cache_ttl', 30));
    }

    private static function trafficCacheTtl(): int
    {
        return max(3, (int) config('mikrotik.network_map_traffic_cache_ttl', 8));
    }
}
