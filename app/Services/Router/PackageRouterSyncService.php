<?php

namespace App\Services\Router;

use App\Models\Package;
use App\Models\Router;
use Exception;

class PackageRouterSyncService
{
    /**
     * @return array{
     *     imported: int,
     *     updated: int,
     *     removed: int,
     *     duplicates_removed: int,
     *     skipped_in_use: int,
     *     profile_count: int,
     * }
     */
    public static function sync(Router $router): array
    {
        $connector = RouterService::getConnector($router);

        $routerProfiles = [];
        $imported = 0;
        $updated = 0;

        foreach ($connector->getProfiles() as $profile) {
            if (!is_array($profile)) {
                continue;
            }

            $name = trim((string) ($profile['name'] ?? ''));
            if ($name === '' || strcasecmp($name, 'default') === 0) {
                continue;
            }

            $key = strtolower($name);
            $routerProfiles[$key] = [
                'name' => $name,
                'type' => 'pppoe',
                'payload' => self::mapPppProfile($profile),
            ];
        }

        foreach ($connector->getHotspotProfiles() as $profile) {
            if (!is_array($profile)) {
                continue;
            }

            $name = trim((string) ($profile['name'] ?? ''));
            if ($name === '' || strcasecmp($name, 'default') === 0) {
                continue;
            }

            $key = strtolower($name);
            if (isset($routerProfiles[$key])) {
                continue;
            }

            $routerProfiles[$key] = [
                'name' => $name,
                'type' => 'hotspot',
                'payload' => self::mapHotspotProfile($profile),
            ];
        }

        foreach ($routerProfiles as $meta) {
            $result = self::upsertPackage($meta['payload'], $meta['type']);
            if ($result === 'created') {
                $imported++;
            } elseif ($result === 'updated') {
                $updated++;
            }
        }

        $duplicatesRemoved = self::removeDuplicatePackages($routerProfiles);
        $cleanup = self::removePackagesMissingOnRouter($routerProfiles);

        MikrotikPackageProfilesCache::forget($router->id);

        return [
            'imported' => $imported,
            'updated' => $updated,
            'removed' => $cleanup['removed'],
            'duplicates_removed' => $duplicatesRemoved,
            'skipped_in_use' => $cleanup['skipped_in_use'],
            'profile_count' => count($routerProfiles),
        ];
    }

    /**
     * @param  array<string, mixed>  $profile
     * @return array<string, mixed>
     */
    private static function mapPppProfile(array $profile): array
    {
        $name = trim((string) ($profile['name'] ?? ''));
        [$queueRx, $queueTx] = self::parseQueueType(self::field($profile, ['queue-type', 'queue_type']));

        return [
            'name' => $name,
            'mikrotik_profile' => $name,
            'bandwidth_limit' => self::field($profile, ['rate-limit', 'rate_limit']) ?: '10M/10M',
            'local_address' => self::field($profile, ['local-address', 'local_address']),
            'remote_address' => self::field($profile, ['remote-address', 'remote_address']),
            'dns_server' => self::field($profile, ['dns-server', 'dns_server']),
            'parent_queue' => self::field($profile, ['parent-queue', 'parent_queue']),
            'queue_type_rx' => $queueRx,
            'queue_type_tx' => $queueTx,
            'only_one' => self::field($profile, ['only-one', 'only_one']) === 'yes',
            'description' => 'Disinkronkan dari profil PPPoE RouterOS.',
        ];
    }

    /**
     * @param  array<string, mixed>  $profile
     * @return array<string, mixed>
     */
    private static function mapHotspotProfile(array $profile): array
    {
        $name = trim((string) ($profile['name'] ?? ''));
        [$queueRx, $queueTx] = self::parseQueueType(self::field($profile, ['queue-type', 'queue_type']));

        return [
            'name' => 'Hotspot - ' . $name,
            'mikrotik_profile' => $name,
            'bandwidth_limit' => self::field($profile, ['rate-limit', 'rate_limit']) ?: '5M/5M',
            'remote_address' => self::field($profile, ['address-pool', 'address_pool']),
            'parent_queue' => self::field($profile, ['parent-queue', 'parent_queue']),
            'queue_type_rx' => $queueRx,
            'queue_type_tx' => $queueTx,
            'validity' => '1d',
            'description' => 'Disinkronkan dari profil Hotspot RouterOS.',
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private static function upsertPackage(array $payload, string $type): string
    {
        $profileName = (string) ($payload['mikrotik_profile'] ?? '');
        $existing = Package::query()
            ->whereRaw('LOWER(mikrotik_profile) = ?', [strtolower($profileName)])
            ->orderByDesc('id')
            ->first();

        $routerFields = array_merge($payload, ['type' => $type]);

        if (!$existing) {
            Package::create(array_merge($routerFields, [
                'price' => self::guessPriceFromProfileName($profileName),
            ]));

            return 'created';
        }

        $existing->update($routerFields);

        return 'updated';
    }

    /**
     * @param  array<string, array{name: string, type: string, payload: array<string, mixed>}>  $routerProfiles
     */
    private static function removeDuplicatePackages(array $routerProfiles): int
    {
        $removed = 0;

        foreach ($routerProfiles as $key => $meta) {
            $duplicates = Package::query()
                ->whereRaw('LOWER(mikrotik_profile) = ?', [$key])
                ->orderByDesc('id')
                ->get();

            if ($duplicates->count() <= 1) {
                continue;
            }

            foreach ($duplicates->slice(1) as $package) {
                if ($package->customers()->exists()) {
                    continue;
                }

                $package->delete();
                $removed++;
            }
        }

        return $removed;
    }

    /**
     * @param  array<string, array{name: string, type: string, payload: array<string, mixed>}>  $routerProfiles
     * @return array{removed: int, skipped_in_use: int}
     */
    private static function removePackagesMissingOnRouter(array $routerProfiles): array
    {
        $removed = 0;
        $skippedInUse = 0;

        $packages = Package::query()->orderBy('name')->get();

        foreach ($packages as $package) {
            $key = strtolower((string) ($package->mikrotik_profile ?: $package->name));
            if ($key === '' || isset($routerProfiles[$key])) {
                continue;
            }

            if ($package->customers()->exists()) {
                $skippedInUse++;
                continue;
            }

            $package->delete();
            $removed++;
        }

        return [
            'removed' => $removed,
            'skipped_in_use' => $skippedInUse,
        ];
    }

  private static function guessPriceFromProfileName(string $name): float
    {
        if (preg_match('/(\d+)\s*[kK]/', $name, $matches)) {
            return (float) ($matches[1] * 1000);
        }

        if (preg_match('/(\d{2,})/', $name, $matches)) {
            return (float) $matches[1];
        }

        return 100000;
    }

    /**
     * @param  array<int, string>  $keys
     */
    private static function field(array $row, array $keys): ?string
    {
        foreach ($keys as $key) {
            if (!array_key_exists($key, $row)) {
                continue;
            }

            $value = trim((string) $row[$key]);
            if ($value !== '') {
                return $value;
            }
        }

        return null;
    }

    /**
     * @return array{0: ?string, 1: ?string}
     */
    private static function parseQueueType(?string $queueType): array
    {
        $queueType = trim((string) ($queueType ?? ''));
        if ($queueType === '' || !str_contains($queueType, '/')) {
            return [null, null];
        }

        [$rx, $tx] = array_pad(explode('/', $queueType, 2), 2, '');
        $rx = trim($rx);
        $tx = trim($tx);

        return [$rx !== '' ? $rx : null, $tx !== '' ? $tx : null];
    }
}
