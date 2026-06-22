import { lazy, Suspense, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { formatRupiah } from '../../utils/formatRupiah';

const chartModule = () => import('./DashboardCharts');
const RevenueBarChart = lazy(() => chartModule().then((module) => ({ default: module.RevenueBarChart })));

function ChartFallback({ className = 'h-48' }) {
    return <div className={`w-full rounded-lg ${className} bg-zinc-100/80 dark:bg-zinc-900/40`} aria-hidden="true" />;
}

export default function MonthlyRevenuePanel({
    monthlyRevenue = {},
    unpaidTotal = 0,
    unpaidCount = 0,
    isDarkMode,
    themeCard,
    themeTextTitle,
    themeTextSub,
    themeTextDesc,
}) {
    const revenueSeries = monthlyRevenue?.series ?? [];
    const currentRevenue = monthlyRevenue?.current_month ?? {};
    const previousRevenue = monthlyRevenue?.previous_month ?? {};
    const revenueChangePercent = Number(monthlyRevenue?.change_percent ?? 0);
    const revenueTrendLabel = revenueChangePercent > 0
        ? `+${revenueChangePercent}% vs bulan lalu`
        : revenueChangePercent < 0
        ? `${revenueChangePercent}% vs bulan lalu`
        : 'Sama dengan bulan lalu';

    const revenueCards = useMemo(() => [
        {
            label: `Bulan Ini · ${currentRevenue.label || '-'}`,
            value: formatRupiah(currentRevenue.total || 0),
            sub: `${currentRevenue.invoice_count || 0} pembayaran · ${revenueTrendLabel}`,
            cardClass: 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400/20 text-white shadow-md shadow-emerald-500/10',
            labelClass: 'text-emerald-100/90',
            valueClass: 'text-white',
            subClass: 'text-emerald-100/75',
        },
        {
            label: `Bulan Lalu · ${previousRevenue.label || '-'}`,
            value: formatRupiah(previousRevenue.total || 0),
            sub: `${previousRevenue.invoice_count || 0} pembayaran lunas`,
            cardClass: 'bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-400/20 text-white shadow-md shadow-indigo-500/10',
            labelClass: 'text-indigo-100/90',
            valueClass: 'text-white',
            subClass: 'text-indigo-100/75',
        },
        {
            label: 'Belum Tertagih (Aktif)',
            value: formatRupiah(unpaidTotal),
            sub: `${unpaidCount} invoice belum bayar`,
            cardClass: 'bg-gradient-to-br from-rose-500 to-red-600 border-rose-400/20 text-white shadow-md shadow-rose-500/10',
            labelClass: 'text-rose-100/90',
            valueClass: 'text-white',
            subClass: 'text-rose-100/75',
        },
    ], [
        currentRevenue.invoice_count,
        currentRevenue.label,
        currentRevenue.total,
        previousRevenue.invoice_count,
        previousRevenue.label,
        previousRevenue.total,
        revenueTrendLabel,
        unpaidCount,
        unpaidTotal,
    ]);

    return (
        <div className={`${themeCard} border rounded-2xl p-4 shadow-xs space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-200/50 dark:border-zinc-800/40">
                <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <h3 className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Pendapatan Bulanan</h3>
                </div>
                <span className={`text-[10px] ${themeTextDesc}`}>Berdasarkan invoice lunas (tanggal bayar)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {revenueCards.map((card) => (
                    <div
                        key={card.label}
                        className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] ${card.cardClass}`}
                    >
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${card.labelClass}`}>
                            {card.label}
                        </p>
                        <div className="mt-2">
                            <p className={`text-xl sm:text-2xl font-extrabold tracking-tight leading-none ${card.valueClass}`}>
                                {card.value}
                            </p>
                            <p className={`text-[10px] font-bold mt-1.5 ${card.subClass}`}>
                                {card.sub}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="space-y-1.5">
                <p className={`text-[10px] font-bold ${themeTextSub}`}>Tren 6 Bulan Terakhir</p>
                <div className="h-48 w-full">
                    {revenueSeries.length === 0 ? (
                        <div className={`h-full flex items-center justify-center text-[10px] font-bold uppercase ${themeTextDesc}`}>
                            Belum ada data pendapatan
                        </div>
                    ) : (
                        <Suspense fallback={<ChartFallback className="h-48" />}>
                            <RevenueBarChart data={revenueSeries} isDarkMode={isDarkMode} />
                        </Suspense>
                    )}
                </div>
            </div>
        </div>
    );
}
