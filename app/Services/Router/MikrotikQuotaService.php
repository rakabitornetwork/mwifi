<?php

namespace App\Services\Router;

class MikrotikQuotaService
{
    /**
     * Build cumulative quota map keyed by PPP/hotspot username.
     *
     * Values use customer perspective: download = to customer, upload = from customer.
     *
     * @return array<string, array<string, mixed>>
     */
    public static function fetchForConnector(RouterConnectorInterface $connector): array
    {
        $quota = [];

        foreach ($connector->getSimpleQueueStats() as $queue) {
            if (!is_array($queue)) {
                continue;
            }

            $bytes = self::parseDirectionalBytes($queue['bytes'] ?? null);
            if ($bytes === null) {
                continue;
            }

            $keys = array_filter([
                trim((string) ($queue['name'] ?? '')),
                trim((string) ($queue['target'] ?? '')),
            ]);

            foreach ($keys as $key) {
                self::assignQuota($quota, $key, $bytes, 'simple-queue');
            }
        }

        foreach ($connector->getActiveConnections() as $session) {
            if (!is_array($session)) {
                continue;
            }

            $username = trim((string) ($session['name'] ?? ''));
            if ($username === '') {
                continue;
            }

            $bytes = self::parsePppActiveBytes($session);
            if ($bytes === null) {
                continue;
            }

            $limits = self::parsePppActiveLimits($session);
            self::assignQuota($quota, $username, $bytes, 'ppp-active', $limits);
        }

        try {
            $hotspotUsers = $connector->getHotspotUsers();
        } catch (\Throwable) {
            $hotspotUsers = [];
        }

        foreach ($hotspotUsers as $user) {
            if (!is_array($user)) {
                continue;
            }

            $username = trim((string) ($user['name'] ?? $user['user'] ?? ''));
            if ($username === '') {
                continue;
            }

            $download = self::normalizeBytes($user['bytes-out'] ?? $user['bytes_out'] ?? null);
            $upload = self::normalizeBytes($user['bytes-in'] ?? $user['bytes_in'] ?? null);

            if ($download === 0 && $upload === 0) {
                continue;
            }

            self::assignQuota($quota, $username, [
                'download_bytes' => $download,
                'upload_bytes' => $upload,
            ], 'hotspot-user');
        }

        return $quota;
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function resolveForUsername(array $quotaMap, string $username): ?array
    {
        $username = trim($username);
        if ($username === '') {
            return null;
        }

        $directKeys = [
            $username,
            explode('@', $username)[0],
            strtolower($username),
            strtolower(explode('@', $username)[0]),
        ];

        foreach ($directKeys as $key) {
            if ($key !== '' && isset($quotaMap[$key])) {
                return $quotaMap[$key];
            }
        }

        $lower = strtolower($username);
        $base = explode('@', $lower)[0];

        foreach ($quotaMap as $key => $entry) {
            $keyLower = strtolower((string) $key);
            $keyBase = explode('@', $keyLower)[0];

            if ($keyLower === $lower || $keyBase === $base || str_contains($keyLower, $base)) {
                return $entry;
            }
        }

        return null;
    }

    /**
     * @return array{upload_bytes:int, download_bytes:int}|null
     */
    public static function parseDirectionalBytes(mixed $value): ?array
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            $total = self::normalizeBytes($value);

            return [
                'upload_bytes' => 0,
                'download_bytes' => $total,
            ];
        }

        $text = trim((string) $value);
        if ($text === '') {
            return null;
        }

        if (str_contains($text, '/')) {
            [$upload, $download] = array_pad(explode('/', $text, 2), 2, '0');

            return [
                'upload_bytes' => self::normalizeBytes($upload),
                'download_bytes' => self::normalizeBytes($download),
            ];
        }

        $single = self::normalizeBytes($text);

        return [
            'upload_bytes' => 0,
            'download_bytes' => $single,
        ];
    }

    /**
     * @param  array<string, mixed>  $session
     * @return array{upload_bytes:int, download_bytes:int}|null
     */
    public static function parsePppActiveBytes(array $session): ?array
    {
        $upload = self::normalizeBytes($session['bytes-in'] ?? $session['bytes_in'] ?? null);
        $download = self::normalizeBytes($session['bytes-out'] ?? $session['bytes_out'] ?? null);

        if ($upload === 0 && $download === 0) {
            return null;
        }

        return [
            'upload_bytes' => $upload,
            'download_bytes' => $download,
        ];
    }

    /**
     * @param  array<string, mixed>  $session
     * @return array{download_limit_bytes:?int, upload_limit_bytes:?int}
     */
    public static function parsePppActiveLimits(array $session): array
    {
        return [
            'upload_limit_bytes' => self::normalizeBytesOrNull($session['limit-bytes-in'] ?? $session['limit_bytes_in'] ?? null),
            'download_limit_bytes' => self::normalizeBytesOrNull($session['limit-bytes-out'] ?? $session['limit_bytes_out'] ?? null),
        ];
    }

    public static function normalizeBytes(mixed $value): int
    {
        if ($value === null || $value === '') {
            return 0;
        }

        if (is_numeric($value)) {
            return max(0, (int) $value);
        }

        $text = trim((string) $value);
        if ($text === '') {
            return 0;
        }

        if (preg_match('/^([\d.]+)\s*([kKmMgG])?i?b?$/i', $text, $matches)) {
            $num = (float) $matches[1];
            $unit = strtolower($matches[2] ?? '');

            return max(0, (int) round($num * match ($unit) {
                'g' => 1024 * 1024 * 1024,
                'm' => 1024 * 1024,
                'k' => 1024,
                default => 1,
            }));
        }

        return max(0, (int) preg_replace('/[^\d]/', '', $text));
    }

    public static function normalizeBytesOrNull(mixed $value): ?int
    {
        if ($value === null || $value === '' || $value === '0') {
            return null;
        }

        $bytes = self::normalizeBytes($value);

        return $bytes > 0 ? $bytes : null;
    }

    /**
     * @param  array<string, mixed>  $quota
     * @param  array{upload_bytes:int, download_bytes:int}  $bytes
     * @param  array{download_limit_bytes:?int, upload_limit_bytes:?int}  $limits
     */
    private static function assignQuota(array &$quota, string $username, array $bytes, string $source, array $limits = []): void
    {
        $username = trim($username);
        if ($username === '') {
            return;
        }

        $entry = [
            'download_bytes' => $bytes['download_bytes'],
            'upload_bytes' => $bytes['upload_bytes'],
            'total_bytes' => $bytes['download_bytes'] + $bytes['upload_bytes'],
            'source' => $source,
            'download_limit_bytes' => $limits['download_limit_bytes'] ?? null,
            'upload_limit_bytes' => $limits['upload_limit_bytes'] ?? null,
        ];

        $aliases = array_unique(array_filter([
            $username,
            strtolower($username),
            explode('@', $username)[0],
            strtolower(explode('@', $username)[0]),
        ]));

        foreach ($aliases as $alias) {
            if ($alias === '') {
                continue;
            }

            if (isset($quota[$alias]) && self::sourcePriority($quota[$alias]['source'] ?? '') <= self::sourcePriority($source)) {
                continue;
            }

            $existingLimits = $quota[$alias] ?? [];
            $quota[$alias] = array_merge($entry, [
                'download_limit_bytes' => $entry['download_limit_bytes'] ?? $existingLimits['download_limit_bytes'] ?? null,
                'upload_limit_bytes' => $entry['upload_limit_bytes'] ?? $existingLimits['upload_limit_bytes'] ?? null,
            ]);
        }
    }

    private static function sourcePriority(string $source): int
    {
        return match ($source) {
            'simple-queue' => 1,
            'hotspot-user' => 2,
            'ppp-active' => 3,
            default => 99,
        };
    }
}
