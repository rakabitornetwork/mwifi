import { lazy, Suspense, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Filter, Search, TrendingUp } from 'lucide-react';
import AdminLayout from '../../../../Layouts/AdminLayout';
import AdminPageCard from '../../../../Components/Admin/AdminPageCard';
import AssignedRouterFilter from '../../../../Components/Admin/AssignedRouterFilter';
import { useAdminTheme } from '../../../../hooks/useAdminTheme.jsx';
import { useAssignedRouter } from '../../../../hooks/useAssignedRouter';
import { formatRupiah } from '../../../../utils/formatRupiah';

const chartModule = () => import('../../../../Components/Admin/DashboardCharts');
const DailyRevenueAreaChart = lazy(() => chartModule().then((module) => ({ default: module.DailyRevenueAreaChart })));

function ChartFallback({ className = 'h-52' }) {
    return <div className={`w-full rounded-lg ${className} bg-zinc-100/80 dark:bg-zinc-900/40`} aria-hidden="true" />;
}

function FinanceIncomeContent({
    routers = [],
    filters = {},
    report = {},
}) {
    const theme = useAdminTheme();
    const { lockedRouterId, initialRouterId } = useAssignedRouter(routers);
    const {
        isDarkMode,
        themeCard,
        themeTextTitle,
        themeTextSub,
        themeTextDesc,
    } = theme;

    const themeInput = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700'
        : 'bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300';
    const themeInnerWidget = isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';

    const [dateFrom, setDateFrom] = useState(filters.from || '');
    const [dateTo, setDateTo] = useState(filters.to || '');
    const [routerFilter, setRouterFilter] = useState(
        initialRouterId || (filters.router && filters.router !== 'all' ? filters.router : '')
    );
    const [searchTerm, setSearchTerm] = useState('');

    const summary = report.summary || {};
    const series = report.series || [];
    const entries = report.entries || [];

    const applyFilters = () => {
        router.get('/finance-income', {
            from: dateFrom,
            to: dateTo,
            router: lockedRouterId || routerFilter || 'all',
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const filteredEntries = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) {
            return entries;
        }

        return entries.filter((entry) => [
            entry.reference,
            entry.description,
            entry.router_name,
            entry.type_label,
            entry.payment_method,
        ].some((value) => String(value || '').toLowerCase().includes(term)));
    }, [entries, searchTerm]);

    const typeBadgeClass = (type) => {
        if (type === 'voucher') {
            return isDarkMode ? 'bg-sky-500/10 text-sky-300 border-sky-500/20' : 'bg-sky-50 text-sky-700 border-sky-200';
        }

        return isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    };

    return (
        <AdminPageCard
            icon={TrendingUp}
            accent="emerald"
            title="Laporan Pemasukan Keuangan"
            description="Rekap tagihan PPPoE lunas dan penjualan voucher hotspot berdasarkan tanggal transaksi."
            themeCard={themeCard}
            isDarkMode={isDarkMode}
            themeTextTitle={themeTextTitle}
            themeTextDesc={themeTextDesc}
        >
            <div className={`rounded-xl border p-3 space-y-3 ${themeInnerWidget}`}>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-emerald-500" />
                    <p className={`text-xs font-bold ${themeTextTitle}`}>Filter Laporan</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={`px-3 py-2 border rounded-xl text-xs ${themeInput}`} />
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={`px-3 py-2 border rounded-xl text-xs ${themeInput}`} />
                    <AssignedRouterFilter
                        routers={routers}
                        value={routerFilter}
                        onChange={(e) => setRouterFilter(e.target.value)}
                        showAllOption
                        className={`px-3 py-2 border rounded-xl text-xs font-bold ${themeInput}`}
                    />
                    <button type="button" onClick={applyFilters} className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer">
                        Terapkan Filter
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className={`rounded-xl border p-3.5 ${isDarkMode ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/80'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Total Pemasukan Bersih</p>
                    <p className={`text-2xl font-black mt-1 ${themeTextTitle}`}>{formatRupiah(summary.total || 0)}</p>
                    <p className={`text-[10px] mt-1 ${themeTextDesc}`}>{summary.entry_count || 0} transaksi</p>
                    {Number(summary.expense_total || 0) > 0 && (
                        <p className={`text-[10px] mt-1 font-semibold ${isDarkMode ? 'text-rose-300/90' : 'text-rose-700'}`}>
                            Bruto {formatRupiah(summary.gross_total || 0)} · −{formatRupiah(summary.expense_total || 0)} pengeluaran tagihan
                        </p>
                    )}
                </div>
                <div className={`rounded-xl border p-3.5 ${themeInnerWidget}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Tagihan PPPoE</p>
                    <p className={`text-2xl font-black mt-1 ${themeTextTitle}`}>{formatRupiah(summary.invoice_total || 0)}</p>
                    <p className={`text-[10px] mt-1 ${themeTextDesc}`}>{summary.invoice_count || 0} pembayaran</p>
                </div>
                <div className={`rounded-xl border p-3.5 ${themeInnerWidget}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Voucher Hotspot</p>
                    <p className={`text-2xl font-black mt-1 ${themeTextTitle}`}>{formatRupiah(summary.voucher_total || 0)}</p>
                    <p className={`text-[10px] mt-1 ${themeTextDesc}`}>{summary.voucher_count || 0} penjualan</p>
                </div>
            </div>

            <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={`text-[10px] font-bold ${themeTextSub}`}>Tren pemasukan harian</p>
                    <div className={`flex flex-wrap items-center gap-3 text-[10px] font-semibold ${themeTextDesc}`}>
                        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Tagihan</span>
                        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />Voucher</span>
                    </div>
                </div>
                <div className="h-52 w-full">
                    {series.every((row) => Number(row.total || 0) === 0) ? (
                        <div className={`h-full flex items-center justify-center text-[10px] font-bold uppercase ${themeTextDesc}`}>
                            Belum ada pemasukan pada periode ini
                        </div>
                    ) : (
                        <Suspense fallback={<ChartFallback />}>
                            <DailyRevenueAreaChart data={series} isDarkMode={isDarkMode} />
                        </Suspense>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <div className="relative">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${themeTextDesc}`} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Cari referensi, pelanggan, router..."
                        className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs ${themeInput}`}
                    />
                </div>

                <div className="admin-table-scroll">
                    <table>
                        <thead>
                            <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                <th className="py-3 px-2 text-left">Tanggal</th>
                                <th className="py-3 px-2 text-left">Jenis</th>
                                <th className="py-3 px-2 text-left">Referensi</th>
                                <th className="py-3 px-2 text-left">Keterangan</th>
                                <th className="py-3 px-2 text-left">Router</th>
                                <th className="py-3 px-2 text-left">Metode</th>
                                <th className="py-3 px-2 text-right">Nominal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/20 text-xs">
                            {filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className={`py-8 text-center ${themeTextDesc}`}>Tidak ada data pemasukan pada periode ini.</td>
                                </tr>
                            ) : filteredEntries.map((entry) => (
                                <tr key={entry.id} className={themeTextSub}>
                                    <td className="py-3 px-2 whitespace-nowrap">{entry.label}</td>
                                    <td className="py-3 px-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeBadgeClass(entry.type)}`}>
                                            {entry.type_label}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 font-mono text-[10px]">{entry.reference}</td>
                                    <td className="py-3 px-2">{entry.description}</td>
                                    <td className="py-3 px-2">{entry.router_name || '—'}</td>
                                    <td className="py-3 px-2">{entry.payment_method}</td>
                                    <td className="py-3 px-2 text-right font-bold text-emerald-500">{formatRupiah(entry.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminPageCard>
    );
}

export default function FinanceIncomeIndex(props) {
    return (
        <AdminLayout title="Laporan Pemasukan">
            <FinanceIncomeContent {...props} />
        </AdminLayout>
    );
}
