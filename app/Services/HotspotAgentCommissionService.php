<?php

namespace App\Services;

use App\Models\HotspotSale;
use App\Models\HotspotVoucher;
use App\Models\User;

class HotspotAgentCommissionService
{
    public const SETTING_DEFAULT_PERCENT = 'hotspot.default_commission_percent';

    /**
     * @return array{commission_percent: float, agent_amount: float, owner_amount: float}
     */
    public static function splitAmount(float $price, float $commissionPercent): array
    {
        $price = round(max(0, $price), 2);
        $commissionPercent = max(0, min(100, round($commissionPercent, 2)));

        $agentAmount = round($price * ($commissionPercent / 100), 2);
        $ownerAmount = round($price - $agentAmount, 2);

        return [
            'commission_percent' => $commissionPercent,
            'agent_amount' => $agentAmount,
            'owner_amount' => $ownerAmount,
        ];
    }

    public static function resolveCommissionPercent(?User $seller): float
    {
        if (!$seller || !$seller->isStaff()) {
            return 0.0;
        }

        if ($seller->hotspot_commission_percent !== null) {
            return max(0, min(100, (float) $seller->hotspot_commission_percent));
        }

        if ($seller->role === User::ROLE_OPERATOR) {
            return max(0, min(100, (float) SettingService::get(self::SETTING_DEFAULT_PERCENT, '0')));
        }

        return 0.0;
    }

    public static function defaultCommissionPercent(): float
    {
        return max(0, min(100, (float) SettingService::get(self::SETTING_DEFAULT_PERCENT, '0')));
    }

    public static function recordSale(
        HotspotVoucher $voucher,
        ?string $paymentMethod = null,
        ?User $seller = null,
    ): HotspotSale {
        if (!in_array($voucher->status, ['sold', 'expired'], true)) {
            throw new \InvalidArgumentException('Voucher belum dalam status terjual.');
        }

        $price = (float) $voucher->price;
        $split = self::splitAmount($price, self::resolveCommissionPercent($seller));

        $existing = HotspotSale::query()
            ->where('router_id', $voucher->router_id)
            ->where('username', $voucher->username)
            ->first();

        $payload = [
            'package_name' => 'Hotspot Profile: ' . ($voucher->mikrotik_profile ?? 'default'),
            'price' => $price,
            'payment_method' => $paymentMethod ?? 'Otomatis (Arsip Voucher)',
        ];

        if ($seller) {
            $payload = array_merge($payload, [
                'sold_by_user_id' => $seller->id,
                'commission_percent' => $split['commission_percent'],
                'agent_amount' => $split['agent_amount'],
                'owner_amount' => $split['owner_amount'],
            ]);
        } elseif (!$existing) {
            $payload = array_merge($payload, [
                'sold_by_user_id' => null,
                'commission_percent' => 0,
                'agent_amount' => 0,
                'owner_amount' => $price,
            ]);
        }

        if ($existing) {
            if ($seller && !$existing->sold_by_user_id) {
                $existing->update($payload);
            } elseif ($paymentMethod) {
                $existing->update(['payment_method' => $paymentMethod]);
            }

            return $existing->fresh();
        }

        return HotspotSale::create(array_merge([
            'router_id' => $voucher->router_id,
            'username' => $voucher->username,
        ], $payload));
    }
}
