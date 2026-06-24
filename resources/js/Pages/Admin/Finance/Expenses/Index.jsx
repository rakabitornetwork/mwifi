import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Edit, Filter, Plus, Save, Search, Trash2, TrendingDown } from 'lucide-react';
import AdminLayout, { useAdminToast } from '../../../../Layouts/AdminLayout';
import AdminPageCard from '../../../../Components/Admin/AdminPageCard';
import AssignedRouterFilter from '../../../../Components/Admin/AssignedRouterFilter';
import TransitionModal from '../../../../Components/Admin/TransitionModal';
import { useAdminTheme } from '../../../../hooks/useAdminTheme.jsx';
import { useAssignedRouter } from '../../../../hooks/useAssignedRouter';
import { useStaffPermissions } from '../../../../hooks/useStaffPermissions';
import { ReadOnlyTableActionsPlaceholder } from '../../../../Components/Admin/ReadOnlyStaffBanner';
import { formatRupiah } from '../../../../utils/formatRupiah';
import { todayDateInputValue } from '../../../../utils/formatDateInputValue';

const chartModule = () => import('../../../../Components/Admin/DashboardCharts');
const ExpenseAreaChart = lazy(() => chartModule().then((module) => ({ default: module.ExpenseAreaChart })));

function ChartFallback({ className = 'h-52' }) {
    return <div className={`w-full rounded-lg ${className} bg-zinc-100/80 dark:bg-zinc-900/40`} aria-hidden="true" />;
}

function FinanceExpensesContent({
    routers = [],
    categories = {},
    filters = {},
    report = {},
}) {
    const theme = useAdminTheme();
    const { canWrite } = useStaffPermissions();
    const { showToast } = useAdminToast();
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
    const [categoryFilter, setCategoryFilter] = useState(filters.category || 'all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [expenseToDelete, setExpenseToDelete] = useState(null);

    useEffect(() => {
        if (!showExpenseModal) {
            setEditingExpense(null);
        }
    }, [showExpenseModal]);

    const summary = report.summary || {};
    const series = report.series || [];
    const entries = report.entries || [];
    const byCategory = report.by_category || [];

    const applyFilters = () => {
        router.get('/finance-expenses', {
            from: dateFrom,
            to: dateTo,
            router: lockedRouterId || routerFilter || 'all',
            category: categoryFilter,
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
            entry.title,
            entry.category_label,
            entry.router_name,
            entry.notes,
            entry.payment_method,
        ].some((value) => String(value || '').toLowerCase().includes(term)));
    }, [entries, searchTerm]);

    const openExpenseModal = (expense = null) => {
        setEditingExpense(expense);
        setShowExpenseModal(true);
    };

    const submitExpense = (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);

        router.post('/admin/finance/expenses/save', formData, {
            preserveScroll: true,
            onSuccess: () => {
                setShowExpenseModal(false);
                showToast(editingExpense ? 'Pengeluaran diperbarui.' : 'Pengeluaran dicatat.', 'success');
            },
            onError: () => showToast('Gagal menyimpan pengeluaran.', 'error'),
        });
    };

    const confirmDeleteExpense = () => {
        if (!expenseToDelete) {
            return;
        }

        router.post('/admin/finance/expenses/delete', { id: expenseToDelete.id }, {
            preserveScroll: true,
            onSuccess: () => {
                setExpenseToDelete(null);
                showToast('Pengeluaran dihapus.', 'success');
            },
            onError: () => showToast('Gagal menghapus pengeluaran.', 'error'),
        });
    };

    return (
        <>
            <AdminPageCard
                icon={TrendingDown}
                accent="rose"
                title="Laporan Pengeluaran Keuangan"
                description="Catat dan pantau pengeluaran operasional perusahaan."
                themeCard={themeCard}
                isDarkMode={isDarkMode}
                themeTextTitle={themeTextTitle}
                themeTextDesc={themeTextDesc}
                actions={canWrite ? (
                    <button
                        type="button"
                        onClick={() => openExpenseModal()}
                        title="Tambah Pengeluaran"
                        className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                ) : undefined}
            >
                <div className={`rounded-xl border p-3 space-y-3 ${themeInnerWidget}`}>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-rose-500" />
                        <p className={`text-xs font-bold ${themeTextTitle}`}>Filter Laporan</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={`px-3 py-2 border rounded-xl text-xs ${themeInput}`} />
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={`px-3 py-2 border rounded-xl text-xs ${themeInput}`} />
                        <AssignedRouterFilter
                            routers={routers}
                            value={routerFilter}
                            onChange={(e) => setRouterFilter(e.target.value)}
                            showAllOption
                            className={`px-3 py-2 border rounded-xl text-xs font-bold ${themeInput}`}
                        />
                        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`px-3 py-2 border rounded-xl text-xs font-bold ${themeInput}`}>
                            <option value="all">Semua kategori</option>
                            {Object.entries(categories).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                        <button type="button" onClick={applyFilters} className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white cursor-pointer">
                            Terapkan Filter
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className={`rounded-xl border p-3.5 ${isDarkMode ? 'border-rose-500/20 bg-rose-500/5' : 'border-rose-200 bg-rose-50/80'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-rose-300' : 'text-rose-700'}`}>Total Pengeluaran</p>
                        <p className={`text-2xl font-black mt-1 ${themeTextTitle}`}>{formatRupiah(summary.total || 0)}</p>
                        <p className={`text-[10px] mt-1 ${themeTextDesc}`}>{summary.entry_count || 0} entri</p>
                    </div>
                    <div className={`rounded-xl border p-3.5 ${themeInnerWidget}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Kategori Aktif</p>
                        <p className={`text-2xl font-black mt-1 ${themeTextTitle}`}>{summary.category_count || 0}</p>
                        <p className={`text-[10px] mt-1 ${themeTextDesc}`}>Jenis pengeluaran</p>
                    </div>
                    <div className={`rounded-xl border p-3.5 ${themeInnerWidget}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Periode</p>
                        <p className={`text-sm font-bold mt-1 ${themeTextTitle}`}>{filters.from} — {filters.to}</p>
                        <p className={`text-[10px] mt-1 ${themeTextDesc}`}>Rentang laporan</p>
                    </div>
                </div>

                {byCategory.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {byCategory.map((item) => (
                            <div key={item.category} className={`rounded-lg border p-2.5 ${themeInnerWidget}`}>
                                <p className={`text-[10px] font-bold uppercase ${themeTextSub}`}>{item.label}</p>
                                <p className={`text-lg font-black mt-1 ${themeTextTitle}`}>{formatRupiah(item.total)}</p>
                                <p className={`text-[10px] ${themeTextDesc}`}>{item.count} transaksi</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="space-y-1.5">
                    <p className={`text-[10px] font-bold ${themeTextSub}`}>Tren pengeluaran harian</p>
                    <div className="h-52 w-full">
                        {series.every((row) => Number(row.total || 0) === 0) ? (
                            <div className={`h-full flex items-center justify-center text-[10px] font-bold uppercase ${themeTextDesc}`}>
                                Belum ada pengeluaran pada periode ini
                            </div>
                        ) : (
                            <Suspense fallback={<ChartFallback />}>
                                <ExpenseAreaChart data={series} isDarkMode={isDarkMode} />
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
                            placeholder="Cari judul, kategori, catatan..."
                            className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs ${themeInput}`}
                        />
                    </div>

                    <div className="admin-table-scroll">
                        <table>
                            <thead>
                                <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                    <th className="py-3 px-2 text-left">Tanggal</th>
                                    <th className="py-3 px-2 text-left">Kategori</th>
                                    <th className="py-3 px-2 text-left">Judul</th>
                                    <th className="py-3 px-2 text-left">Router</th>
                                    <th className="py-3 px-2 text-left">Metode</th>
                                    <th className="py-3 px-2 text-right">Nominal</th>
                                    <th className="py-3 px-2 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/20 text-xs">
                                {filteredEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className={`py-8 text-center ${themeTextDesc}`}>Tidak ada pengeluaran pada periode ini.</td>
                                    </tr>
                                ) : filteredEntries.map((entry) => (
                                    <tr key={entry.id} className={themeTextSub}>
                                        <td className="py-3 px-2 whitespace-nowrap">{entry.label}</td>
                                        <td className="py-3 px-2">{entry.category_label}</td>
                                        <td className="py-3 px-2">
                                            <p className={`font-bold ${themeTextTitle}`}>{entry.title}</p>
                                            {entry.notes && <p className={`text-[10px] mt-0.5 ${themeTextDesc}`}>{entry.notes}</p>}
                                        </td>
                                        <td className="py-3 px-2">{entry.router_name || '—'}</td>
                                        <td className="py-3 px-2">{entry.payment_method}</td>
                                        <td className="py-3 px-2 text-right font-bold text-rose-500">{formatRupiah(entry.amount)}</td>
                                        <td className="py-3 px-2 text-right">
                                            {canWrite ? (
                                                <div className="admin-table-actions justify-end">
                                                    <button type="button" onClick={() => openExpenseModal(entry)} className="p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer" title="Edit">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button type="button" onClick={() => setExpenseToDelete(entry)} className="p-1 text-rose-500 hover:text-rose-400 cursor-pointer" title="Hapus">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <ReadOnlyTableActionsPlaceholder />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </AdminPageCard>

            <TransitionModal show={showExpenseModal} onClose={() => setShowExpenseModal(false)} maxWidth="lg" themeCard={themeCard}>
                <form onSubmit={submitExpense} className="space-y-3 text-xs">
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>{editingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h3>
                    {editingExpense && <input type="hidden" name="id" value={editingExpense.id} />}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="space-y-1">
                            <span className={`font-bold ${themeTextSub}`}>Tanggal</span>
                            <input type="date" name="expense_date" required defaultValue={editingExpense?.expense_date || todayDateInputValue()} className={`w-full px-3 py-2 border rounded-xl ${themeInput}`} />
                        </label>
                        <label className="space-y-1">
                            <span className={`font-bold ${themeTextSub}`}>Kategori</span>
                            <select name="category" required defaultValue={editingExpense?.category || 'operasional'} className={`w-full px-3 py-2 border rounded-xl ${themeInput}`}>
                                {Object.entries(categories).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-1 md:col-span-2">
                            <span className={`font-bold ${themeTextSub}`}>Judul / Keterangan</span>
                            <input type="text" name="title" required maxLength={150} defaultValue={editingExpense?.title || ''} className={`w-full px-3 py-2 border rounded-xl ${themeInput}`} />
                        </label>
                        <label className="space-y-1">
                            <span className={`font-bold ${themeTextSub}`}>Nominal (Rp)</span>
                            <input type="number" name="amount" required min="0" step="0.01" defaultValue={editingExpense?.amount ?? ''} className={`w-full px-3 py-2 border rounded-xl ${themeInput}`} />
                        </label>
                        <label className="space-y-1">
                            <span className={`font-bold ${themeTextSub}`}>Metode Pembayaran</span>
                            <input type="text" name="payment_method" defaultValue={editingExpense?.payment_method || ''} placeholder="Cash, transfer, dll." className={`w-full px-3 py-2 border rounded-xl ${themeInput}`} />
                        </label>
                        {!lockedRouterId && (
                            <label className="space-y-1 md:col-span-2">
                                <span className={`font-bold ${themeTextSub}`}>Router (opsional)</span>
                                <select
                                    name="router_id"
                                    defaultValue={editingExpense?.router_id ? String(editingExpense.router_id) : ''}
                                    className={`w-full px-3 py-2 border rounded-xl ${themeInput}`}
                                >
                                    <option value="">Tidak terkait router</option>
                                    {routers.map((routerItem) => (
                                        <option key={routerItem.id} value={routerItem.id}>{routerItem.name}</option>
                                    ))}
                                </select>
                            </label>
                        )}
                        <label className="space-y-1 md:col-span-2">
                            <span className={`font-bold ${themeTextSub}`}>Catatan</span>
                            <textarea name="notes" rows={3} defaultValue={editingExpense?.notes || ''} className={`w-full px-3 py-2 border rounded-xl ${themeInput}`} />
                        </label>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowExpenseModal(false)} className={`px-3 py-2 border rounded-xl cursor-pointer ${themeInput}`}>Batal</button>
                        <button type="submit" className="px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold cursor-pointer inline-flex items-center gap-1.5">
                            <Save className="w-4 h-4" />
                            Simpan
                        </button>
                    </div>
                </form>
            </TransitionModal>

            <TransitionModal show={Boolean(expenseToDelete)} onClose={() => setExpenseToDelete(null)} maxWidth="sm" themeCard={themeCard}>
                <div className="space-y-3 text-xs">
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>Hapus Pengeluaran?</h3>
                    <p className={themeTextDesc}>
                        {expenseToDelete?.title} — {formatRupiah(expenseToDelete?.amount || 0)}
                    </p>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setExpenseToDelete(null)} className={`px-3 py-2 border rounded-xl cursor-pointer ${themeInput}`}>Batal</button>
                        <button type="button" onClick={confirmDeleteExpense} className="px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold cursor-pointer">Hapus</button>
                    </div>
                </div>
            </TransitionModal>
        </>
    );
}

export default function FinanceExpensesIndex(props) {
    return (
        <AdminLayout title="Laporan Pengeluaran">
            <FinanceExpensesContent {...props} />
        </AdminLayout>
    );
}
