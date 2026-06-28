<?php

namespace App\Services;

use App\Models\HotspotSale;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

class HotspotAgentReportService
{
    /**
     * @return array<string, mixed>
     */
    public static function build(
        User $viewer,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        ?int $agentId = null,
    ): array {
        [$start, $end] = self::resolveDateRange($dateFrom, $dateTo);

        $query = self::baseQuery($start, $end);
        $scopedAgentId = self::resolveScopedAgentId($viewer, $agentId);

        if ($scopedAgentId) {
            $query->where('sold_by_user_id', $scopedAgentId);
        }

        $sales = (clone $query)
            ->with(['router:id,name', 'soldBy:id,name,role'])
            ->orderByDesc('created_at')
            ->get();

        $summary = [
            'sale_count' => $sales->count(),
            'gross_revenue' => round((float) $sales->sum('price'), 2),
            'agent_total' => round((float) $sales->sum('agent_amount'), 2),
            'owner_total' => round((float) $sales->sum('owner_amount'), 2),
            'unattributed_revenue' => round((float) $sales->whereNull('sold_by_user_id')->sum('price'), 2),
        ];

        $agents = $sales
            ->filter(fn (HotspotSale $sale) => $sale->sold_by_user_id)
            ->groupBy('sold_by_user_id')
            ->map(function ($group) {
                $agent = $group->first()->soldBy;

                return [
                    'agent_id' => $agent?->id,
                    'agent_name' => $agent?->name ?? 'Agen',
                    'sale_count' => $group->count(),
                    'gross_revenue' => round((float) $group->sum('price'), 2),
                    'agent_amount' => round((float) $group->sum('agent_amount'), 2),
                    'owner_amount' => round((float) $group->sum('owner_amount'), 2),
                    'average_commission_percent' => round((float) $group->avg('commission_percent'), 2),
                ];
            })
            ->sortByDesc('gross_revenue')
            ->values()
            ->all();

        return [
            'date_from' => $start->toDateString(),
            'date_to' => $end->toDateString(),
            'default_commission_percent' => HotspotAgentCommissionService::defaultCommissionPercent(),
            'is_agent_view' => $viewer->role === User::ROLE_OPERATOR,
            'summary' => $summary,
            'agents' => $agents,
            'sales' => $sales->map(fn (HotspotSale $sale) => [
                'id' => $sale->id,
                'created_at' => $sale->created_at?->toIso8601String(),
                'router_name' => $sale->router?->name,
                'username' => $sale->username,
                'package_name' => $sale->package_name,
                'price' => (float) $sale->price,
                'payment_method' => $sale->payment_method,
                'agent_id' => $sale->sold_by_user_id,
                'agent_name' => $sale->soldBy?->name,
                'commission_percent' => (float) $sale->commission_percent,
                'agent_amount' => (float) $sale->agent_amount,
                'owner_amount' => (float) $sale->owner_amount,
            ])->values()->all(),
        ];
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private static function resolveDateRange(?string $dateFrom, ?string $dateTo): array
    {
        $end = $dateTo
            ? Carbon::parse($dateTo)->endOfDay()
            : Carbon::today()->endOfDay();

        $start = $dateFrom
            ? Carbon::parse($dateFrom)->startOfDay()
            : Carbon::today()->startOfMonth()->startOfDay();

        if ($start->greaterThan($end)) {
            [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
        }

        return [$start, $end];
    }

    private static function baseQuery(Carbon $start, Carbon $end): Builder
    {
        return HotspotSale::query()
            ->whereBetween('created_at', [$start, $end]);
    }

    private static function resolveScopedAgentId(User $viewer, ?int $agentId): ?int
    {
        if ($viewer->role === User::ROLE_OPERATOR) {
            return $viewer->id;
        }

        return $agentId;
    }
}
