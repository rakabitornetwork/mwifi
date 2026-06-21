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
        foreach ($interfaces as $iface) {
            if (($iface['name'] ?? '') === 'ether1' && !($iface['disabled'] ?? false)) {
                return 'ether1';
            }
        }

        foreach ($interfaces as $iface) {
            if (($iface['running'] ?? false) && !($iface['disabled'] ?? false)) {
                return (string) $iface['name'];
            }
        }

        return isset($interfaces[0]['name']) ? (string) $interfaces[0]['name'] : null;
    }
}
