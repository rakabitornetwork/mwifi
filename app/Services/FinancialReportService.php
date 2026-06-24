<?php

namespace App\Services;

use App\Models\FinancialExpense;
use App\Models\HotspotSale;
use App\Models\Invoice;
use App\Services\StaffRouterScope;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;

class FinancialReportService
{
    /**
     * @return array{
     *     days: int,
     *     total: float,
     *     entry_count: int,
     *     change_percent: float,
     *     series: list<array<string, mixed>>
     * }
     */
    public static function summarizeDailyExpenses(
        StaffRouterScope $scope,
        int $days = 14,
        ?Carbon $today = null,
    ): array {
        $today = ($today ?? Carbon::today())->copy()->startOfDay()->locale('id');
        $days = max(7, min(31, $days));

        $rangeStart = $today->copy()->subDays($days - 1)->startOfDay();
        $rangeEnd = $today->copy()->endOfDay();

        $query = FinancialExpense::query()
            ->whereDate('expense_date', '>=', $rangeStart)
            ->whereDate('expense_date', '<=', $rangeEnd);

        if ($scope->isScoped()) {
            $query->where('router_id', $scope->routerId());
        }

        $grouped = (clone $query)
            ->selectRaw('DATE(expense_date) as expense_day, SUM(amount) as total, COUNT(*) as entry_count')
            ->groupBy('expense_day')
            ->get()
            ->keyBy(fn ($row) => (string) $row->expense_day);

        $series = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $day = $today->copy()->subDays($i);
            $dateKey = $day->toDateString();
            $row = $grouped->get($dateKey);
            $total = round((float) ($row->total ?? 0), 2);

            $series[] = [
                'date' => $dateKey,
                'label' => $day->translatedFormat('d M'),
                'total' => $total,
                'entry_count' => (int) ($row->entry_count ?? 0),
            ];
        }

        $total = round((float) array_sum(array_column($series, 'total')), 2);
        $entryCount = (int) array_sum(array_column($series, 'entry_count'));

        $half = (int) floor($days / 2);
        $olderTotal = round((float) array_sum(array_column(array_slice($series, 0, $half), 'total')), 2);
        $recentTotal = round((float) array_sum(array_column(array_slice($series, $half), 'total')), 2);

        $changePercent = 0.0;
        if ($olderTotal > 0) {
            $changePercent = round((($recentTotal - $olderTotal) / $olderTotal) * 100, 1);
        } elseif ($recentTotal > 0) {
            $changePercent = 100.0;
        }

        return [
            'days' => $days,
            'total' => $total,
            'entry_count' => $entryCount,
            'change_percent' => $changePercent,
            'series' => $series,
        ];
    }

    /**
     * Pengeluaran hanya mengurangi pemasukan tagihan PPPoE, bukan penjualan voucher.
     */
    private static function calculateNetIncomeTotal(float $invoiceTotal, float $voucherTotal, float $expenseTotal): float
    {
        return round(max(0, $invoiceTotal - $expenseTotal) + $voucherTotal, 2);
    }

    /**
     * @param  array<string, mixed>  $revenue
     * @return array<string, mixed>
     */
    public static function applyNetIncomeToTodayRevenue(array $revenue, StaffRouterScope $scope, ?Carbon $today = null): array
    {
        $today = ($today ?? Carbon::today())->copy()->startOfDay();
        $expenseTotal = self::sumExpensesForRange(
            $today,
            $today->copy()->endOfDay(),
            $scope,
            null,
            null,
        );
        $invoiceTotal = round((float) ($revenue['total'] ?? 0), 2);

        return [
            ...$revenue,
            'gross_total' => $invoiceTotal,
            'expense_total' => $expenseTotal,
            'total' => self::calculateNetIncomeTotal($invoiceTotal, 0, $expenseTotal),
        ];
    }

    /**
     * @param  array<string, mixed>  $revenue
     * @return array<string, mixed>
     */
    public static function applyNetIncomeToDailyRevenue(array $revenue, StaffRouterScope $scope): array
    {
        $days = (int) ($revenue['days'] ?? 14);
        $expenses = self::summarizeDailyExpenses($scope, $days);
        $expenseByDate = collect($expenses['series'])->keyBy('date');

        $series = [];
        foreach ($revenue['series'] as $row) {
            $invoiceTotal = round((float) ($row['invoice_total'] ?? 0), 2);
            $voucherTotal = round((float) ($row['voucher_total'] ?? 0), 2);
            $grossTotal = round($invoiceTotal + $voucherTotal, 2);
            $expenseTotal = round((float) ($expenseByDate->get($row['date'])['total'] ?? 0), 2);

            $series[] = [
                ...$row,
                'gross_total' => $grossTotal,
                'expense_total' => $expenseTotal,
                'total' => self::calculateNetIncomeTotal($invoiceTotal, $voucherTotal, $expenseTotal),
            ];
        }

        $invoiceTotal = round((float) ($revenue['invoice_total'] ?? 0), 2);
        $voucherTotal = round((float) ($revenue['voucher_total'] ?? 0), 2);
        $grossTotal = round($invoiceTotal + $voucherTotal, 2);
        $expenseTotal = round((float) $expenses['total'], 2);

        $half = (int) floor($days / 2);
        $olderNet = round((float) array_sum(array_column(array_slice($series, 0, $half), 'total')), 2);
        $recentNet = round((float) array_sum(array_column(array_slice($series, $half), 'total')), 2);

        $changePercent = 0.0;
        if ($olderNet > 0) {
            $changePercent = round((($recentNet - $olderNet) / $olderNet) * 100, 1);
        } elseif ($recentNet > 0) {
            $changePercent = 100.0;
        } elseif ($recentNet < 0 && $olderNet < 0) {
            $changePercent = round((($recentNet - $olderNet) / abs($olderNet)) * 100, 1);
        }

        return [
            ...$revenue,
            'gross_total' => $grossTotal,
            'expense_total' => $expenseTotal,
            'total' => self::calculateNetIncomeTotal($invoiceTotal, $voucherTotal, $expenseTotal),
            'change_percent' => $changePercent,
            'series' => $series,
        ];
    }

    /**
     * @return array{
     *     from: string,
     *     to: string,
     *     summary: array<string, float|int>,
     *     series: list<array<string, mixed>>,
     *     entries: list<array<string, mixed>>
     * }
     */
    public static function incomeReport(
        Carbon $from,
        Carbon $to,
        StaffRouterScope $scope,
        ?int $routerFilter = null,
    ): array {
        $from = $from->copy()->startOfDay()->locale('id');
        $to = $to->copy()->endOfDay()->locale('id');

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        $invoiceQuery = Invoice::query()
            ->with(['customer.router', 'customer.package', 'payments'])
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$from, $to])
            ->orderByDesc('paid_at');

        $scope->scopeInvoices($invoiceQuery);
        if ($routerFilter) {
            $scope->ensureCanAccessRouter($routerFilter);
            $invoiceQuery->whereHas('customer', fn (Builder $query) => $query->where('router_id', $routerFilter));
        }

        $voucherQuery = HotspotSale::query()
            ->with('router')
            ->whereBetween('created_at', [$from, $to])
            ->orderByDesc('created_at');

        if ($scope->isScoped()) {
            $voucherQuery->where('router_id', $scope->routerId());
        } elseif ($routerFilter) {
            $voucherQuery->where('router_id', $routerFilter);
        }

        $invoiceTotal = 0.0;
        $invoiceCount = 0;
        $entries = [];

        foreach ($invoiceQuery->get() as $invoice) {
            $amount = (float) $invoice->total_amount;
            $invoiceTotal += $amount;
            $invoiceCount++;

            $latestPayment = $invoice->payments->sortByDesc('created_at')->first();

            $entries[] = [
                'id' => 'invoice-' . $invoice->id,
                'type' => 'invoice',
                'type_label' => 'Tagihan PPPoE',
                'occurred_at' => $invoice->paid_at?->toIso8601String(),
                'date' => $invoice->paid_at?->toDateString(),
                'label' => $invoice->paid_at?->locale('id')->translatedFormat('d M Y H:i'),
                'amount' => round($amount, 2),
                'reference' => $invoice->invoice_number,
                'description' => trim(($invoice->customer?->name ?? 'Pelanggan') . ($invoice->customer?->package?->name ? ' · ' . $invoice->customer->package->name : '')),
                'router_name' => $invoice->customer?->router?->name,
                'payment_method' => $latestPayment?->payment_method ?? $latestPayment?->gateway_name ?? '—',
            ];
        }

        $voucherTotal = 0.0;
        $voucherCount = 0;

        foreach ($voucherQuery->get() as $sale) {
            $amount = (float) $sale->price;
            $voucherTotal += $amount;
            $voucherCount++;

            $entries[] = [
                'id' => 'voucher-' . $sale->id,
                'type' => 'voucher',
                'type_label' => 'Voucher Hotspot',
                'occurred_at' => $sale->created_at?->toIso8601String(),
                'date' => $sale->created_at?->toDateString(),
                'label' => $sale->created_at?->locale('id')->translatedFormat('d M Y H:i'),
                'amount' => round($amount, 2),
                'reference' => $sale->username,
                'description' => $sale->package_name,
                'router_name' => $sale->router?->name,
                'payment_method' => $sale->payment_method ?? '—',
            ];
        }

        usort($entries, fn (array $a, array $b) => strcmp((string) ($b['occurred_at'] ?? ''), (string) ($a['occurred_at'] ?? '')));

        $series = self::buildDailySeries(
            $from,
            $to,
            fn (Carbon $dayStart, Carbon $dayEnd) => self::sumIncomeForRange($dayStart, $dayEnd, $scope, $routerFilter),
            ['invoice_total', 'voucher_total'],
        );

        $expenseTotal = self::sumExpensesForRange($from, $to, $scope, $routerFilter, null);
        $grossTotal = round($invoiceTotal + $voucherTotal, 2);

        $series = array_map(function (array $row) use ($scope, $routerFilter) {
            $dayStart = Carbon::parse($row['date'])->startOfDay();
            $dayEnd = $dayStart->copy()->endOfDay();
            $dayExpenseTotal = self::sumExpensesForRange($dayStart, $dayEnd, $scope, $routerFilter, null);
            $invoiceTotal = round((float) ($row['invoice_total'] ?? 0), 2);
            $voucherTotal = round((float) ($row['voucher_total'] ?? 0), 2);
            $dayGrossTotal = round($invoiceTotal + $voucherTotal, 2);

            return [
                ...$row,
                'gross_total' => $dayGrossTotal,
                'expense_total' => $dayExpenseTotal,
                'total' => self::calculateNetIncomeTotal($invoiceTotal, $voucherTotal, $dayExpenseTotal),
            ];
        }, $series);

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'summary' => [
                'total' => self::calculateNetIncomeTotal($invoiceTotal, $voucherTotal, $expenseTotal),
                'gross_total' => $grossTotal,
                'expense_total' => round($expenseTotal, 2),
                'invoice_total' => round($invoiceTotal, 2),
                'voucher_total' => round($voucherTotal, 2),
                'invoice_count' => $invoiceCount,
                'voucher_count' => $voucherCount,
                'entry_count' => $invoiceCount + $voucherCount,
            ],
            'series' => $series,
            'entries' => $entries,
        ];
    }

    /**
     * @return array{
     *     from: string,
     *     to: string,
     *     summary: array<string, float|int>,
     *     by_category: list<array<string, mixed>>,
     *     series: list<array<string, mixed>>,
     *     entries: list<array<string, mixed>>
     * }
     */
    public static function expenseReport(
        Carbon $from,
        Carbon $to,
        StaffRouterScope $scope,
        ?int $routerFilter = null,
        ?string $categoryFilter = null,
    ): array {
        $from = $from->copy()->startOfDay()->locale('id');
        $to = $to->copy()->endOfDay()->locale('id');

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to->copy()->startOfDay(), $from->copy()->endOfDay()];
        }

        $query = FinancialExpense::query()
            ->with(['router', 'recorder:id,name'])
            ->whereDate('expense_date', '>=', $from)
            ->whereDate('expense_date', '<=', $to)
            ->orderByDesc('expense_date')
            ->orderByDesc('id');

        if ($scope->isScoped()) {
            $query->where('router_id', $scope->routerId());
        } elseif ($routerFilter) {
            $scope->ensureCanAccessRouter($routerFilter);
            $query->where('router_id', $routerFilter);
        }

        if ($categoryFilter && $categoryFilter !== 'all') {
            $query->where('category', $categoryFilter);
        }

        $expenses = $query->get();
        $total = round((float) $expenses->sum('amount'), 2);

        $byCategory = $expenses
            ->groupBy('category')
            ->map(function ($items, $category) {
                return [
                    'category' => $category,
                    'label' => FinancialExpense::CATEGORIES[$category] ?? ucfirst((string) $category),
                    'total' => round((float) $items->sum('amount'), 2),
                    'count' => $items->count(),
                ];
            })
            ->sortByDesc('total')
            ->values()
            ->all();

        $entries = $expenses->map(fn (FinancialExpense $expense) => [
            'id' => $expense->id,
            'category' => $expense->category,
            'category_label' => $expense->categoryLabel(),
            'title' => $expense->title,
            'amount' => round((float) $expense->amount, 2),
            'expense_date' => $expense->expense_date?->toDateString(),
            'label' => $expense->expense_date?->locale('id')->translatedFormat('d M Y'),
            'router_name' => $expense->router?->name,
            'router_id' => $expense->router_id,
            'payment_method' => $expense->payment_method ?? '—',
            'notes' => $expense->notes,
            'recorded_by' => $expense->recorder?->name,
            'updated_at' => $expense->updated_at?->format('d/m/Y H:i'),
        ])->all();

        $series = self::buildDailySeries(
            $from,
            $to,
            fn (Carbon $dayStart, Carbon $dayEnd) => [
                'total' => self::sumExpensesForRange($dayStart, $dayEnd, $scope, $routerFilter, $categoryFilter),
            ],
            ['total'],
        );

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            'summary' => [
                'total' => $total,
                'entry_count' => $expenses->count(),
                'category_count' => count($byCategory),
            ],
            'by_category' => $byCategory,
            'series' => $series,
            'entries' => $entries,
        ];
    }

    /**
     * @param  callable(Carbon, Carbon): array<string, float>  $summarizeDay
     * @param  list<string>  $valueKeys
     * @return list<array<string, mixed>>
     */
    private static function buildDailySeries(Carbon $from, Carbon $to, callable $summarizeDay, array $valueKeys): array
    {
        $series = [];
        $cursor = $from->copy()->startOfDay();
        $end = $to->copy()->startOfDay();

        while ($cursor->lessThanOrEqualTo($end)) {
            $dayStart = $cursor->copy()->startOfDay();
            $dayEnd = $cursor->copy()->endOfDay();
            $values = $summarizeDay($dayStart, $dayEnd);

            $row = [
                'date' => $cursor->toDateString(),
                'label' => $cursor->translatedFormat('d M'),
            ];

            $rowTotal = 0.0;
            foreach ($valueKeys as $key) {
                $value = round((float) ($values[$key] ?? 0), 2);
                $row[$key] = $value;
                $rowTotal += $value;
            }

            $row['total'] = round($rowTotal, 2);
            $series[] = $row;
            $cursor->addDay();
        }

        return $series;
    }

    private static function sumIncomeForRange(
        Carbon $from,
        Carbon $to,
        StaffRouterScope $scope,
        ?int $routerFilter,
    ): array {
        $invoiceQuery = Invoice::query()
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$from, $to]);
        $scope->scopeInvoices($invoiceQuery);

        if ($routerFilter) {
            $invoiceQuery->whereHas('customer', fn (Builder $query) => $query->where('router_id', $routerFilter));
        }

        $voucherQuery = HotspotSale::query()
            ->whereBetween('created_at', [$from, $to]);

        if ($scope->isScoped()) {
            $voucherQuery->where('router_id', $scope->routerId());
        } elseif ($routerFilter) {
            $voucherQuery->where('router_id', $routerFilter);
        }

        return [
            'invoice_total' => round((float) $invoiceQuery->sum('total_amount'), 2),
            'voucher_total' => round((float) $voucherQuery->sum('price'), 2),
        ];
    }

    private static function sumExpensesForRange(
        Carbon $from,
        Carbon $to,
        StaffRouterScope $scope,
        ?int $routerFilter,
        ?string $categoryFilter,
    ): float {
        $query = FinancialExpense::query()
            ->whereDate('expense_date', '>=', $from)
            ->whereDate('expense_date', '<=', $to);

        if ($scope->isScoped()) {
            $query->where('router_id', $scope->routerId());
        } elseif ($routerFilter) {
            $query->where('router_id', $routerFilter);
        }

        if ($categoryFilter && $categoryFilter !== 'all') {
            $query->where('category', $categoryFilter);
        }

        return round((float) $query->sum('amount'), 2);
    }
}
