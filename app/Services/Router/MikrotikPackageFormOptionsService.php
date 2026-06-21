<?php

namespace App\Services\Router;

class MikrotikPackageFormOptionsService
{
    /**
     * @return array<string, mixed>
     */
    public static function build(RouterConnectorInterface $connector): array
    {
        $pppProfilesRaw = $connector->getProfiles();
        $hotspotProfilesRaw = $connector->getHotspotProfiles();
        $ipPoolsRaw = $connector->getIpPools();
        $simpleQueuesRaw = $connector->getSimpleQueues();
        $queueTypesRaw = $connector->getQueueTypes();

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

            $remote = self::field($profile, ['remote-address', 'remote_address']);
            $parentQueue = self::field($profile, ['parent-queue', 'parent_queue']);

            self::pushUnique($remoteAddresses, $remote);
            self::pushUnique($parentQueues, $parentQueue);
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

            $parentQueue = self::field($profile, ['parent-queue', 'parent_queue']);
            $addressPool = self::field($profile, ['address-pool', 'address_pool']);

            self::pushUnique($remoteAddresses, $addressPool);
            self::pushUnique($parentQueues, $parentQueue);
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
     * @param  array<string, mixed>  $row
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
