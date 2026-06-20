<?php

namespace App\Services\Router;

class MikrotikTrafficService
{
    /**
     * Build live traffic map keyed by PPP/hotspot username from a connected router.
     *
     * Download/upload are from the customer perspective.
     */
    public static function fetchForConnector(RouterConnectorInterface $connector): array
    {
        $interfaceStats = $connector->getInterfaceTrafficStats();
        $queueStats = $connector->getSimpleQueueTrafficStats();
        $traffic = [];

        foreach ($connector->getActiveConnections() as $session) {
            $username = trim((string) ($session['name'] ?? ''));
            if ($username === '') {
                continue;
            }

            $rates = self::resolveCustomerRates($username, $session, $interfaceStats, $queueStats);
            self::assignTraffic($traffic, $username, $rates, true);
        }

        foreach ($connector->getHotspotActive() as $session) {
            $username = trim((string) ($session['user'] ?? $session['name'] ?? ''));
            if ($username === '') {
                continue;
            }

            $rates = self::resolveCustomerRates($username, $session, $interfaceStats, $queueStats);
            self::assignTraffic($traffic, $username, $rates, true);
        }

        return $traffic;
    }

    private static function assignTraffic(array &$traffic, string $username, array $rates, bool $online): void
    {
        $entry = [
            'online' => $online,
            'download_bps' => $rates['download_bps'],
            'upload_bps' => $rates['upload_bps'],
        ];

        $traffic[$username] = $entry;

        $aliases = array_unique(array_filter([
            strtolower($username),
            explode('@', $username)[0],
            strtolower(explode('@', $username)[0]),
        ]));

        foreach ($aliases as $alias) {
            if ($alias !== '') {
                $traffic[$alias] = $entry;
            }
        }
    }

    private static function resolveCustomerRates(
        string $username,
        array $session,
        array $interfaceStats,
        array $queueStats
    ): array {
        $fromSession = self::parseSessionRates($session);
        if ($fromSession !== null) {
            return $fromSession;
        }

        $fromInterface = self::matchInterfaceRates($username, $interfaceStats);
        if ($fromInterface !== null) {
            return $fromInterface;
        }

        $fromQueue = self::matchQueueRates($username, $queueStats);
        if ($fromQueue !== null) {
            return $fromQueue;
        }

        return ['download_bps' => 0, 'upload_bps' => 0];
    }

    /**
     * Parse instantaneous rates from ppp/hotspot active entry when available.
     */
    private static function parseSessionRates(array $session): ?array
    {
        $download = self::readRate($session, [
            'rx-rate', 'rx/rate', 'rx-bits-per-second', 'rx-rate-bits-per-second',
        ]);
        $upload = self::readRate($session, [
            'tx-rate', 'tx/rate', 'tx-bits-per-second', 'tx-rate-bits-per-second',
        ]);

        if ($download === null && $upload === null) {
            return null;
        }

        return [
            'download_bps' => $download ?? 0,
            'upload_bps' => $upload ?? 0,
        ];
    }

    /**
     * Map interface rx/tx to customer download/upload (ISP PPPoE server view).
     */
    private static function matchInterfaceRates(string $username, array $interfaceStats): ?array
    {
        foreach (self::expectedInterfaceNames($username) as $candidate) {
            $stats = $interfaceStats[$candidate]
                ?? $interfaceStats[strtolower($candidate)]
                ?? null;

            if ($stats === null) {
                continue;
            }

            $download = (int) ($stats['rx_bps'] ?? 0);
            $upload = (int) ($stats['tx_bps'] ?? 0);

            if ($download > 0 || $upload > 0) {
                return [
                    'download_bps' => $download,
                    'upload_bps' => $upload,
                ];
            }
        }

        $needle = strtolower($username);
        $baseNeedle = strtolower(explode('@', $username)[0]);

        foreach ($interfaceStats as $ifName => $stats) {
            if (!is_string($ifName)) {
                continue;
            }

            $ifLower = strtolower($ifName);
            if (!str_contains($ifLower, 'pppoe') && !str_contains($ifLower, 'hotspot')) {
                continue;
            }

            $matchesUser = str_contains($ifLower, $needle)
                || str_contains($ifLower, $baseNeedle)
                || str_contains($ifLower, str_replace('@', '%40', $needle));

            if (!$matchesUser) {
                continue;
            }

            $download = (int) ($stats['rx_bps'] ?? 0);
            $upload = (int) ($stats['tx_bps'] ?? 0);

            if ($download > 0 || $upload > 0) {
                return [
                    'download_bps' => $download,
                    'upload_bps' => $upload,
                ];
            }
        }

        return null;
    }

    private static function matchQueueRates(string $username, array $queueStats): ?array
    {
        foreach (self::expectedInterfaceNames($username) as $candidate) {
            $stats = $queueStats[$candidate]
                ?? $queueStats[strtolower($candidate)]
                ?? null;

            if ($stats !== null && (($stats['download_bps'] ?? 0) > 0 || ($stats['upload_bps'] ?? 0) > 0)) {
                return $stats;
            }
        }

        $needle = strtolower(explode('@', $username)[0]);

        foreach ($queueStats as $target => $stats) {
            if (!is_string($target)) {
                continue;
            }

            if (str_contains(strtolower($target), $needle)) {
                return $stats;
            }
        }

        return null;
    }

    private static function expectedInterfaceNames(string $username): array
    {
        $base = explode('@', $username)[0];

        return array_values(array_unique([
            '<pppoe-' . $username . '>',
            'pppoe-' . $username,
            '<' . $username . '>',
            $username,
            '<pppoe-' . $base . '>',
            'pppoe-' . $base,
            '<hotspot-' . $username . '>',
            'hotspot-' . $username,
        ]));
    }

    private static function readRate(array $row, array $keys): ?int
    {
        foreach ($keys as $key) {
            if (!array_key_exists($key, $row)) {
                continue;
            }

            $value = self::normalizeRate($row[$key]);
            if ($value !== null) {
                return $value;
            }
        }

        return null;
    }

    public static function normalizeRate(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            return max(0, (int) $value);
        }

        $text = trim((string) $value);
        if ($text === '') {
            return null;
        }

        if (str_contains($text, '/')) {
            return null;
        }

        if (preg_match('/^([\d.]+)\s*([kKmMgG])?b?(?:ps|\/s)?$/', $text, $matches)) {
            $num = (float) $matches[1];
            $unit = strtolower($matches[2] ?? '');

            return max(0, (int) match ($unit) {
                'g' => $num * 1_000_000_000,
                'm' => $num * 1_000_000,
                'k' => $num * 1_000,
                default => $num,
            });
        }

        return max(0, (int) preg_replace('/[^\d]/', '', $text));
    }
}
