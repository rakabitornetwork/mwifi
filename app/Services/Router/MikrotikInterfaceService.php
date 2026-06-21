<?php

namespace App\Services\Router;

class MikrotikInterfaceService
{
    public static function isTruthy(mixed $value): bool
    {
        return $value === true
            || $value === 'true'
            || $value === 'yes'
            || $value === 1
            || $value === '1';
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array<int, array<string, mixed>>
     */
    public static function normalizeList(array $rows): array
    {
        $interfaces = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            $name = trim((string) ($row['name'] ?? ''));
            if ($name === '' || str_starts_with($name, '*')) {
                continue;
            }

            $interfaces[] = [
                'name' => $name,
                'type' => (string) ($row['type'] ?? ''),
                'running' => self::isTruthy($row['running'] ?? false),
                'disabled' => self::isTruthy($row['disabled'] ?? false),
                'rx_bps' => MikrotikTrafficService::normalizeRate($row['rx-bits-per-second'] ?? $row['rx-rate'] ?? 0) ?? 0,
                'tx_bps' => MikrotikTrafficService::normalizeRate($row['tx-bits-per-second'] ?? $row['tx-rate'] ?? 0) ?? 0,
            ];
        }

        usort($interfaces, fn (array $a, array $b) => strnatcasecmp($a['name'], $b['name']));

        return $interfaces;
    }

    /**
     * @param  array<int, array<string, mixed>>  $interfaces
     */
    public static function pickDefaultInterfaceName(array $interfaces): ?string
    {
        $candidates = self::filterForDashboard($interfaces);
        if ($candidates === []) {
            $candidates = $interfaces;
        }

        foreach ($candidates as $iface) {
            $name = strtolower((string) ($iface['name'] ?? ''));
            if (str_contains($name, 'wan') && !str_contains($name, 'pppoe') && !($iface['disabled'] ?? false)) {
                return (string) $iface['name'];
            }
        }

        foreach ($candidates as $iface) {
            if (strtolower((string) ($iface['type'] ?? '')) === 'ether'
                && ($iface['running'] ?? false)
                && !($iface['disabled'] ?? false)) {
                return (string) $iface['name'];
            }
        }

        foreach ($candidates as $iface) {
            if (($iface['name'] ?? '') === 'ether1' && !($iface['disabled'] ?? false)) {
                return 'ether1';
            }
        }

        foreach ($candidates as $iface) {
            if (($iface['running'] ?? false) && !($iface['disabled'] ?? false)) {
                return (string) $iface['name'];
            }
        }

        return isset($candidates[0]['name']) ? (string) $candidates[0]['name'] : null;
    }

    /**
     * @param  array<int, array<string, mixed>>  $interfaces
     * @return array<int, array<string, mixed>>
     */
    public static function filterForDashboard(array $interfaces): array
    {
        $filtered = array_values(array_filter($interfaces, [self::class, 'isDashboardInterface']));

        return $filtered !== [] ? $filtered : $interfaces;
    }

    /**
     * @param  array<string, mixed>  $iface
     */
    public static function isDashboardInterface(array $iface): bool
    {
        $type = strtolower((string) ($iface['type'] ?? ''));

        return in_array($type, [
            'ether',
            'vlan',
            'bridge',
            'bonding',
            'combo',
            'pppoe-out',
            'wg',
            'gre',
            'l2tp',
            'ovpn',
            'sfp',
        ], true);
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{rx_bps:int, tx_bps:int}
     */
    public static function parseMonitorTrafficRow(array $row): array
    {
        return [
            'rx_bps' => MikrotikTrafficService::normalizeRate($row['rx-bits-per-second'] ?? $row['rx-rate'] ?? 0) ?? 0,
            'tx_bps' => MikrotikTrafficService::normalizeRate($row['tx-bits-per-second'] ?? $row['tx-rate'] ?? 0) ?? 0,
        ];
    }
}
