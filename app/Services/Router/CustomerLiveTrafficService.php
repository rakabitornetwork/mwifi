<?php

namespace App\Services\Router;

use App\Models\Customer;

class CustomerLiveTrafficService
{
    /**
     * Live download/upload rates and optional monthly quota for one customer session.
     *
     * @return array<string, mixed>
     */
    public static function getPayload(Customer $customer, bool $sampleQuota = false): array
    {
        $customer->loadMissing(['router', 'package']);

        if (!$customer->router) {
            return [
                'success' => false,
                'online' => false,
                'download_bps' => 0,
                'upload_bps' => 0,
                'bandwidth_limit' => $customer->package?->bandwidth_limit,
                'quota' => CustomerBandwidthUsageService::getMonthlyUsage($customer, false),
                'error' => 'Router layanan belum dikonfigurasi.',
            ];
        }

        $downloadBps = 0;
        $uploadBps = 0;
        $online = false;
        $routerError = null;

        try {
            $connector = RouterService::getConnector($customer->router);
            $trafficMap = MikrotikTrafficService::fetchForConnector($connector);
            $entry = self::resolveEntry($trafficMap, $customer->username);

            if ($entry !== null) {
                $online = (bool) ($entry['online'] ?? true);
                $downloadBps = (int) ($entry['download_bps'] ?? 0);
                $uploadBps = (int) ($entry['upload_bps'] ?? 0);
            } else {
                $online = self::isCustomerOnline($connector, $customer->username);
            }
        } catch (\Throwable) {
            $routerError = 'Gagal membaca trafik RouterOS.';

            try {
                $connector = RouterService::getConnector($customer->router);
                $online = self::isCustomerOnline($connector, $customer->username);
            } catch (\Throwable) {
                $online = false;
            }
        }

        return [
            'success' => $routerError === null,
            'online' => $online,
            'download_bps' => $downloadBps,
            'upload_bps' => $uploadBps,
            'bandwidth_limit' => $customer->package?->bandwidth_limit,
            'quota' => CustomerBandwidthUsageService::getMonthlyUsage($customer, $sampleQuota),
            'error' => $routerError,
        ];
    }

    /**
     * @param array<string, array<string, mixed>> $trafficMap
     * @return array<string, mixed>|null
     */
    private static function resolveEntry(array $trafficMap, string $username): ?array
    {
        $directKeys = array_unique(array_filter([
            $username,
            explode('@', $username)[0],
            strtolower($username),
            strtolower(explode('@', $username)[0]),
        ]));

        foreach ($directKeys as $key) {
            if (isset($trafficMap[$key]) && is_array($trafficMap[$key])) {
                return $trafficMap[$key];
            }
        }

        $lower = strtolower($username);
        $base = strtolower(explode('@', $username)[0]);

        foreach ($trafficMap as $key => $entry) {
            if (!is_string($key) || !is_array($entry)) {
                continue;
            }

            $keyLower = strtolower($key);
            $keyBase = strtolower(explode('@', $keyLower)[0]);

            if ($keyLower === $lower || $keyBase === $base) {
                return $entry;
            }
        }

        return null;
    }

    private static function isCustomerOnline(RouterConnectorInterface $connector, string $username): bool
    {
        foreach ($connector->getActiveConnections() as $session) {
            if (!is_array($session)) {
                continue;
            }

            if (RouterService::matchesPppUsername($session, $username)) {
                return true;
            }
        }

        foreach ($connector->getHotspotActive() as $session) {
            if (!is_array($session)) {
                continue;
            }

            if (RouterService::matchesPppUsername($session, $username)) {
                return true;
            }
        }

        return false;
    }
}
