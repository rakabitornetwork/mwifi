<?php

namespace App\Services\Router;

class MikrotikPackageFormOptionsService
{
    public const SCOPE_LIST = MikrotikPackageProfilesCache::SCOPE_LIST;

    public const SCOPE_FORM = MikrotikPackageProfilesCache::SCOPE_FORM;

    /**
     * @return array<string, mixed>
     */
    public static function build(RouterConnectorInterface $connector, string $scope = self::SCOPE_FORM): array
    {
        $scope = $scope === self::SCOPE_LIST ? self::SCOPE_LIST : self::SCOPE_FORM;

        if ($connector instanceof RestApiRouterConnector) {
            $raw = $scope === self::SCOPE_LIST
                ? $connector->fetchPackageListProfilesRaw()
                : $connector->fetchPackageFormOptionsRaw();

            return self::assembleFromRaw($raw, $scope);
        }

        return self::assembleFromRaw(self::fetchRawSequential($connector, $scope), $scope);
    }

    /**
     * @return array{
     *     ppp_profiles: array<int, mixed>,
     *     hotspot_profiles: array<int, mixed>,
     *     ip_pools: array<int, mixed>,
     *     simple_queues: array<int, mixed>,
     *     queue_types: array<int, mixed>,
     * }
     */
    private static function fetchRawSequential(RouterConnectorInterface $connector, string $scope): array
    {
        $raw = [
            'ppp_profiles' => $connector->getProfiles(),
            'hotspot_profiles' => $connector->getHotspotProfiles(),
            'ip_pools' => [],
            'simple_queues' => [],
            'queue_types' => [],
        ];

        if ($scope === self::SCOPE_FORM) {
            $raw['ip_pools'] = $connector->getIpPools();
            $raw['simple_queues'] = $connector->getSimpleQueues();
            $raw['queue_types'] = $connector->getQueueTypes();
        }

        return $raw;
    }

    /**
     * @param  array{
     *     ppp_profiles: array<int, mixed>,
     *     hotspot_profiles: array<int, mixed>,
     *     ip_pools?: array<int, mixed>,
     *     simple_queues?: array<int, mixed>,
     *     queue_types?: array<int, mixed>,
     * }  $raw
     * @return array<string, mixed>
     */
    private static function assembleFromRaw(array $raw, string $scope): array
    {
        $pppProfilesRaw = $raw['ppp_profiles'] ?? [];
        $hotspotProfilesRaw = $raw['hotspot_profiles'] ?? [];
        $ipPoolsRaw = $raw['ip_pools'] ?? [];
        $simpleQueuesRaw = $scope === self::SCOPE_FORM ? ($raw['simple_queues'] ?? []) : [];
        $queueTypesRaw = $scope === self::SCOPE_FORM ? ($raw['queue_types'] ?? []) : [];

        $pppProfileNames = [];
        $hotspotProfileNames = [];
        $remoteAddresses = [];
        $parentQueues = [];
        $queueTypeNames = [];

        foreach ($pppProfilesRaw as $profile) {
            if (!is_array($profile)) {
                continue;
            }

            $name = trim((string) ($profile['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $pppProfileNames[] = $name;

            if ($scope === self::SCOPE_FORM) {
                $remote = self::field($profile, ['remote-address', 'remote_address']);
                $parentQueue = self::field($profile, ['parent-queue', 'parent_queue']);

                self::pushUnique($remoteAddresses, $remote);
                self::pushUnique($parentQueues, $parentQueue);
            }
        }

        foreach ($hotspotProfilesRaw as $profile) {
            if (!is_array($profile)) {
                continue;
            }

            $name = trim((string) ($profile['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $hotspotProfileNames[] = $name;

            if ($scope === self::SCOPE_FORM) {
                $parentQueue = self::field($profile, ['parent-queue', 'parent_queue']);
                $addressPool = self::field($profile, ['address-pool', 'address_pool']);

                self::pushUnique($remoteAddresses, $addressPool);
                self::pushUnique($parentQueues, $parentQueue);
            }
        }

        $ipPoolNames = [];
        foreach ($ipPoolsRaw as $pool) {
            if (!is_array($pool)) {
                continue;
            }

            $poolName = trim((string) ($pool['name'] ?? ''));
            if ($poolName !== '') {
                $ipPoolNames[] = $poolName;
            }
        }

        foreach ($simpleQueuesRaw as $queue) {
            if (!is_array($queue)) {
                continue;
            }

            self::pushUnique($parentQueues, self::field($queue, ['name']));
        }

        foreach ($queueTypesRaw as $type) {
            if (!is_array($type)) {
                continue;
            }

            self::pushUnique($queueTypeNames, self::field($type, ['name']));
        }

        $queueTypeNames = array_values(array_filter(
            $queueTypeNames,
            static fn (string $name) => $name !== '' && !str_contains($name, '/')
        ));

        sort($pppProfileNames, SORT_NATURAL | SORT_FLAG_CASE);
        sort($hotspotProfileNames, SORT_NATURAL | SORT_FLAG_CASE);

        foreach ([&$remoteAddresses, &$parentQueues, &$queueTypeNames, &$ipPoolNames] as &$list) {
            sort($list, SORT_NATURAL | SORT_FLAG_CASE);
            $list = array_values(array_unique($list));
        }

        return [
            'ppp_profile_names' => array_values(array_unique($pppProfileNames)),
            'hotspot_profile_names' => array_values(array_unique($hotspotProfileNames)),
            'all_profiles' => array_values(array_unique(array_merge($pppProfileNames, $hotspotProfileNames))),
            'ip_pool_names' => $ipPoolNames,
            'parent_queues' => $parentQueues,
            'queue_types' => $queueTypeNames,
        ];
    }

    /**
     * Build RouterOS queue-type value (rx/tx) for PPP and Hotspot profiles.
     */
    public static function buildRouterOsQueueType(?string $rx, ?string $tx): ?string
    {
        $rx = trim((string) ($rx ?? ''));
        $tx = trim((string) ($tx ?? ''));

        if ($rx === '' && $tx === '') {
            return null;
        }

        if ($tx === '') {
            $tx = $rx;
        }

        if ($rx === '') {
            $rx = $tx;
        }

        return "{$rx}/{$tx}";
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
     * @param  array<int, string>  $list
     */
    private static function pushUnique(array &$list, ?string $value): void
    {
        if ($value === null || $value === '') {
            return;
        }

        $list[] = $value;
    }
}
