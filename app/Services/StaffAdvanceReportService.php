<?php

namespace App\Services;

use App\Models\StaffAdvanceLedger;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class StaffAdvanceReportService
{
    /**
     * @return array{
     *     from: string,
     *     to: string,
     *     summary: array<string, float|int>,
     *     staff_balances: list<array<string, mixed>>,
     *     entries: list<array<string, mixed>>
     * }
     */
    public static function report(
        Carbon $from,
        Carbon $to,
        ?int $staffFilter = null,
        ?string $typeFilter = null,
    ): array {
        $from = $from->copy()->startOfDay()->locale('id');
        $to = $to->copy()->endOfDay()->locale('id');

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        $query = StaffAdvanceLedger::query()
            ->with(['staffUser:id,name,role,assigned_router_id', 'staffUser.assignedRouter:id,name', 'recorder:id,name'])
            ->whereDate('transaction_date', '>=', $from)
            ->whereDate('transaction_date', '<=', $to)
            ->orderByDesc('transaction_date')
            ->orderByDesc('id');

        if ($staffFilter) {
            $query->where('staff_user_id', $staffFilter);
        }

        if ($typeFilter && $typeFilter !== 'all') {
            $query->where('type', $typeFilter);
        }

        $entries = $query->get();

        $allLedgers = StaffAdvanceLedger::query()
            ->when($staffFilter, fn ($builder) => $builder->where('staff_user_id', $staffFilter))
            ->get();

        $totalPiutang = self::calculatePiutangBalance($allLedgers);
        $totalHutang = self::calculateHutangBalance($allLedgers);

        $periodKasbon = round((float) $entries->where('type', StaffAdvanceLedger::TYPE_KASBON)->sum('amount'), 2);
        $periodPelunasan = round((float) $entries->where('type', StaffAdvanceLedger::TYPE_PELUNASAN)->sum('amount'), 2);
        $periodHutang = round((float) $entries->where('type', StaffAdvanceLedger::TYPE_HUTANG)->sum('amount'), 2);
        $periodBayarHutang = round((float) $entries->where('type', StaffAdvanceLedger::TYPE_BAYAR_HUTANG)->sum('amount'), 2);

        $staffBalances = self::buildStaffBalances($allLedgers);

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'summary' => [
                'total_piutang' => $totalPiutang,
                'total_hutang' => $totalHutang,
                'period_kasbon' => $periodKasbon,
                'period_pelunasan' => $periodPelunasan,
                'period_hutang' => $periodHutang,
                'period_bayar_hutang' => $periodBayarHutang,
                'entry_count' => $entries->count(),
                'staff_with_balance' => collect($staffBalances)->where(fn (array $row) => (float) ($row['balance'] ?? 0) > 0)->count(),
            ],
            'staff_balances' => $staffBalances,
            'entries' => $entries->map(fn (StaffAdvanceLedger $entry) => self::formatEntry($entry))->all(),
        ];
    }

    /**
     * @return list<array{id: int, name: string, router_name: ?string}>
     */
    public static function technicianOptions(): array
    {
        return User::query()
            ->where('role', User::ROLE_TECHNICIAN)
            ->where('is_active', true)
            ->with('assignedRouter:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'assigned_router_id'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'router_name' => $user->assignedRouter?->name,
            ])
            ->all();
    }

    /**
     * @param  Collection<int, StaffAdvanceLedger>  $ledgers
     */
    private static function calculatePiutangBalance(Collection $ledgers): float
    {
        return round((float) $ledgers
            ->filter(fn (StaffAdvanceLedger $entry) => $entry->isPiutangType())
            ->sum(fn (StaffAdvanceLedger $entry) => $entry->signedAmount()), 2);
    }

    /**
     * @param  Collection<int, StaffAdvanceLedger>  $ledgers
     */
    private static function calculateHutangBalance(Collection $ledgers): float
    {
        return round((float) $ledgers
            ->filter(fn (StaffAdvanceLedger $entry) => $entry->isHutangType())
            ->sum(fn (StaffAdvanceLedger $entry) => $entry->signedAmount()), 2);
    }

    /**
     * @param  Collection<int, StaffAdvanceLedger>  $ledgers
     * @return list<array<string, mixed>>
     */
    private static function buildStaffBalances(Collection $ledgers): array
    {
        return $ledgers
            ->filter(fn (StaffAdvanceLedger $entry) => $entry->isPiutangType() && $entry->staff_user_id)
            ->groupBy('staff_user_id')
            ->map(function (Collection $items, $staffUserId) {
                $staff = $items->first()?->staffUser;
                $kasbonTotal = round((float) $items->where('type', StaffAdvanceLedger::TYPE_KASBON)->sum('amount'), 2);
                $pelunasanTotal = round((float) $items->where('type', StaffAdvanceLedger::TYPE_PELUNASAN)->sum('amount'), 2);
                $balance = round($kasbonTotal - $pelunasanTotal, 2);

                return [
                    'staff_user_id' => (int) $staffUserId,
                    'name' => $staff?->name ?? 'Teknisi',
                    'router_name' => $staff?->assignedRouter?->name,
                    'kasbon_total' => $kasbonTotal,
                    'pelunasan_total' => $pelunasanTotal,
                    'balance' => $balance,
                    'transaction_count' => $items->count(),
                ];
            })
            ->sortByDesc('balance')
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private static function formatEntry(StaffAdvanceLedger $entry): array
    {
        return [
            'id' => $entry->id,
            'type' => $entry->type,
            'type_label' => $entry->typeLabel(),
            'staff_user_id' => $entry->staff_user_id,
            'staff_name' => $entry->staffUser?->name,
            'router_name' => $entry->staffUser?->assignedRouter?->name,
            'counterparty' => $entry->counterparty,
            'title' => $entry->title,
            'amount' => round((float) $entry->amount, 2),
            'signed_amount' => round($entry->signedAmount(), 2),
            'transaction_date' => $entry->transaction_date?->toDateString(),
            'label' => $entry->transaction_date?->locale('id')->translatedFormat('d M Y'),
            'payment_method' => $entry->payment_method ?? '—',
            'notes' => $entry->notes,
            'recorded_by' => $entry->recorder?->name,
            'updated_at' => $entry->updated_at?->format('d/m/Y H:i'),
        ];
    }
}
