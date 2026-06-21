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
        $pppProfileDetails = [];
        $hotspotProfileDetails = [];
        $bandwidthLimits = [];
        $localAddresses = [];
        $remoteAddresses = [];
        $dnsServers = [];
        $parentQueues = [];
        $queueTypes = [];

        foreach ($pppProfilesRaw as $profile) {
            if (!is_array($profile)) {
                continue;
            }

            $name = trim((string) ($profile['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $pppProfileNames[] = $name;

            $local = self::field($profile, ['local-address', 'local_address']);
            $remote = self::field($profile, ['remote-address', 'remote_address']);
            $dns = self::field($profile, ['dns-server', 'dns_server', 'dns-servers', 'dns_servers']);
            $rateLimit = self::field($profile, ['rate-limit', 'rate_limit']);
            $parentQueue = self::field($profile, ['parent-queue', 'parent_queue']);
            $queueType = self::field($profile, ['queue-type', 'queue_type', 'rx-queue-type', 'rx_queue_type']);

            $pppProfileDetails[$name] = array_filter([
                'local_address' => $local,
                'remote_address' => $remote,
                'dns_server' => $dns,
                'bandwidth_limit' => $rateLimit,
                'parent_queue' => $parentQueue,
                'queue_type_rx' => $queueType,
                'queue_type_tx' => $queueType,
            ], fn ($value) => $value !== null && $value !== '');

            self::pushUnique($bandwidthLimits, $rateLimit);
            self::pushUnique($localAddresses, $local);
            self::pushUnique($remoteAddresses, $remote);
            self::pushUnique($dnsServers, $dns);
            self::pushUnique($parentQueues, $parentQueue);
            self::pushUnique($queueTypes, $queueType);
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

            $rateLimit = self::field($profile, ['rate-limit', 'rate_limit']);
            $parentQueue = self::field($profile, ['parent-queue', 'parent_queue']);
            $addressPool = self::field($profile, ['address-pool', 'address_pool']);
            $queueType = self::field($profile, ['queue-type', 'queue_type']);

            $hotspotProfileDetails[$name] = array_filter([
                'remote_address' => $addressPool,
                'bandwidth_limit' => $rateLimit,
                'parent_queue' => $parentQueue,
                'queue_type_rx' => $queueType,
                'queue_type_tx' => $queueType,
            ], fn ($value) => $value !== null && $value !== '');

            self::pushUnique($bandwidthLimits, $rateLimit);
            self::pushUnique($remoteAddresses, $addressPool);
            self::pushUnique($parentQueues, $parentQueue);
            self::pushUnique($queueTypes, $queueType);
        }

        $ipPoolNames = [];
        foreach ($ipPoolsRaw as $pool) {
            if (!is_array($pool)) {
                continue;
            }

            $poolName = trim((string) ($pool['name'] ?? ''));
            if ($poolName !== '') {
                $ipPoolNames[] = $poolName;
                self::pushUnique($remoteAddresses, $poolName);
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

            self::pushUnique($queueTypes, self::field($type, ['name']));
        }

        sort($pppProfileNames, SORT_NATURAL | SORT_FLAG_CASE);
        sort($hotspotProfileNames, SORT_NATURAL | SORT_FLAG_CASE);

        foreach ([&$bandwidthLimits, &$localAddresses, &$remoteAddresses, &$dnsServers, &$parentQueues, &$queueTypes, &$ipPoolNames] as &$list) {
            sort($list, SORT_NATURAL | SORT_FLAG_CASE);
            $list = array_values(array_unique($list));
        }

        return [
            'ppp_profile_names' => array_values(array_unique($pppProfileNames)),
            'hotspot_profile_names' => array_values(array_unique($hotspotProfileNames)),
            'all_profiles' => array_values(array_unique(array_merge($pppProfileNames, $hotspotProfileNames))),
            'bandwidth_limits' => $bandwidthLimits,
            'local_addresses' => $localAddresses,
            'remote_addresses' => $remoteAddresses,
            'ip_pool_names' => $ipPoolNames,
            'dns_servers' => $dnsServers,
            'parent_queues' => $parentQueues,
            'queue_types' => $queueTypes,
            'ppp_profile_details' => $pppProfileDetails,
            'hotspot_profile_details' => $hotspotProfileDetails,
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
