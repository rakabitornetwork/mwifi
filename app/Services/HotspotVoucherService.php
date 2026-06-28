<?php

namespace App\Services;

use App\Models\HotspotVoucher;
use App\Models\Router;
use App\Models\User;
use App\Services\Router\RouterConnectorInterface;
use Illuminate\Support\Facades\Log;

class HotspotVoucherService
{
    /**
     * Parse MikroTik duration string (e.g. 1d, 2h30m, 1w2d) to seconds.
     * Returns null for unlimited / empty / unparseable values.
     */
    public static function parseMikrotikDuration(?string $duration): ?int
    {
        if ($duration === null) {
            return null;
        }

        $duration = strtolower(trim($duration));
        if ($duration === '' || $duration === '0' || $duration === '0s' || $duration === 'unlimited') {
            return null;
        }

        if (!preg_match_all('/(\d+)([wdhms])/i', $duration, $matches, PREG_SET_ORDER)) {
            return null;
        }

        $seconds = 0;
        foreach ($matches as $match) {
            $value = (int) $match[1];
            $seconds += match (strtolower($match[2])) {
                'w' => $value * 604800,
                'd' => $value * 86400,
                'h' => $value * 3600,
                'm' => $value * 60,
                's' => $value,
                default => 0,
            };
        }

        return $seconds > 0 ? $seconds : null;
    }

    /**
     * Sold voucher with MAC is expired when uptime limit is reached (sold_at + validity or MikroTik counters).
     */
    public static function isSoldVoucherExpired(HotspotVoucher $voucher, ?array $mikrotikUser = null): bool
    {
        if ($voucher->status !== 'sold' || !$voucher->mac_address) {
            return false;
        }

        if ($mikrotikUser) {
            $limit = $mikrotikUser['limit-uptime'] ?? $mikrotikUser['limit_uptime'] ?? null;
            $uptime = $mikrotikUser['uptime'] ?? null;

            if ($limit && $uptime) {
                $limitSeconds = self::parseMikrotikDuration($limit);
                $uptimeSeconds = self::parseMikrotikDuration($uptime);

                if ($limitSeconds && $uptimeSeconds !== null && $uptimeSeconds >= $limitSeconds) {
                    return true;
                }
            }
        }

        if (!$voucher->sold_at) {
            return false;
        }

        $validitySeconds = self::parseMikrotikDuration($voucher->validity);
        if ($validitySeconds === null) {
            return false;
        }

        return $voucher->sold_at->copy()->addSeconds($validitySeconds)->isPast();
    }

    public static function ensureSaleRecorded(HotspotVoucher $voucher, ?string $paymentMethod = null, ?User $seller = null): void
    {
        if (!in_array($voucher->status, ['sold', 'expired'], true)) {
            return;
        }

        HotspotAgentCommissionService::recordSale($voucher, $paymentMethod, $seller);
    }

    /**
     * Remove expired sold vouchers (with MAC) from RouterOS and database.
     */
    public static function purgeExpiredSoldVouchers(Router $router, RouterConnectorInterface $connector): int
    {
        $usersByName = collect($connector->getHotspotUsers())
            ->filter(fn ($user) => !empty($user['name']))
            ->keyBy('name');

        $purged = 0;

        HotspotVoucher::where('router_id', $router->id)
            ->where('status', 'sold')
            ->whereNotNull('mac_address')
            ->get()
            ->each(function (HotspotVoucher $voucher) use ($usersByName, $connector, &$purged) {
                $mikrotikUser = $usersByName->get($voucher->username);

                if (!self::isSoldVoucherExpired($voucher, $mikrotikUser)) {
                    return;
                }

                if (self::purgeVoucherFromRouterAndDb($voucher, $connector)) {
                    $purged++;
                }
            });

        return $purged;
    }

    public static function purgeVoucherFromRouterAndDb(HotspotVoucher $voucher, RouterConnectorInterface $connector): bool
    {
        self::ensureSaleRecorded($voucher, 'Otomatis (Masa Aktif Habis)');

        try {
            $connector->deleteHotspotUser($voucher->username);
            $connector->kickHotspotActive($voucher->username);
        } catch (\Exception $e) {
            Log::warning("Gagal menghapus voucher expired {$voucher->username} di Mikrotik: " . $e->getMessage());
        }

        $voucher->delete();

        return true;
    }
}
