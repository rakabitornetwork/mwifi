<?php

namespace App\Services\Router;

class MikrotikResourceService
{
    /**
     * @param  array<string, mixed>  $resource
     * @param  array<string, mixed>  $identity
     * @return array<string, mixed>
     */
    public static function normalize(array $resource, array $identity = []): array
    {
        $cpuLoad = (int) ($resource['cpu-load'] ?? 0);

        $totalMem = (int) ($resource['total-memory'] ?? 0);
        $freeMem = (int) ($resource['free-memory'] ?? 0);
        $ramUsage = $totalMem > 0
            ? (int) round((($totalMem - $freeMem) / $totalMem) * 100)
            : 0;

        $totalHdd = (int) ($resource['total-hdd-space'] ?? 0);
        $freeHdd = (int) ($resource['free-hdd-space'] ?? 0);
        $diskUsage = $totalHdd > 0
            ? (int) round((($totalHdd - $freeHdd) / $totalHdd) * 100)
            : 0;

        $version = trim((string) ($resource['version'] ?? ''));
        $platform = trim((string) ($resource['platform'] ?? ''));
        $board = trim((string) ($resource['board-name'] ?? ''));

        $osLabel = $version !== ''
            ? 'RouterOS ' . $version
            : ($platform !== '' ? $platform : 'RouterOS');

        $hostname = trim((string) ($identity['name'] ?? ''));
        if ($hostname === '') {
            $hostname = $board !== '' ? $board : 'Mikrotik';
        }

        return [
            'cpu' => min(100, max(0, $cpuLoad)),
            'ram' => min(100, max(0, $ramUsage)),
            'disk' => min(100, max(0, $diskUsage)),
            'os' => $osLabel,
            'hostname' => $hostname,
            'board_name' => $board,
            'platform' => $platform,
            'uptime' => (string) ($resource['uptime'] ?? ''),
        ];
    }
}
