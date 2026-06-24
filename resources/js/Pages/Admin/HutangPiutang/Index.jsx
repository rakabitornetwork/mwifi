import { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Edit, Filter, HandCoins, Plus, Save, Search, Trash2 } from 'lucide-react';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import AdminPageCard from '../../../Components/Admin/AdminPageCard';
import TransitionModal from '../../../Components/Admin/TransitionModal';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';
import { useStaffPermissions } from '../../../hooks/useStaffPermissions';
import { ReadOnlyTableActionsPlaceholder } from '../../../Components/Admin/ReadOnlyStaffBanner';
import { formatRupiah } from '../../../utils/formatRupiah';
import { todayDateInputValue } from '../../../utils/formatDateInputValue';

const PIUTANG_TYPES = ['kasbon', 'pelunasan'];
const HUTANG_TYPES = ['hutang', 'bayar_hutang'];

function HutangPiutangContent({
    technicians = [],
    types = {},
    filters = {},
    report = {},
}) {
    const theme = useAdminTheme();
    const { canWrite } = useStaffPermissions();
    const { showToast } = useAdminToast();
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
    const [staffFilter, setStaffFilter] = useState(filters.staff || 'all');
    const [typeFilter, setTypeFilter] = useState(filters.type || 'all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [entryToDelete, setEntryToDelete] = useState(null);
    const [formType, setFormType] = useState('kasbon');

    useEffect(() => {
        if (!showModal) {
            setEditingEntry(null);
            setFormType('kasbon');
        }
    }, [showModal]);

    const summary = report.summary || {};
    const staffBalances = report.staff_balances || [];
    const entries = report.entries || [];

    const applyFilters = () => {
        router.get('/hutang-piutang', {
            from: dateFrom,
            to: dateTo,
            staff: staffFilter || 'all',
            type: typeFilter || 'all',
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
            entry.type_label,
            entry.staff_name,
            entry.counterparty,
            entry.notes,
            entry.payment_method,
        ].some((value) => String(value || '').toLowerCase().includes(term)));
    }, [entries, searchTerm]);

    const openModal = (entry = null, defaultType = 'kasbon') => {
        setEditingEntry(entry);
        setFormType(entry?.type || defaultType);
        setShowModal(true);
    };

    const submitEntry = (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);

        router.post('/admin/hutang-piutang/save', formData, {
            preserveScroll: true,
            onSuccess: () => {
                setShowModal(false);
            },
            onError: () => showToast('Gagal menyimpan transaksi.', 'error'),
        });
    };

    const confirmDelete = () => {
        if (!entryToDelete) {
            return;
        }

        router.post('/admin/hutang-piutang/delete', { id: entryToDelete.id }, {
            preserveScroll: true,
            onSuccess: () => {
                setEntryToDelete(null);
            },
            onError: () => showToast('Gagal menghapus transaksi.', 'error'),
        });
    };

    const typeBadgeClass = (type) => {
        if (type === 'kasbon') {
            return isDarkMode ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-amber-50 text-amber-700 border-amber-200';
        }
        if (type === 'pelunasan') {
            return isDarkMode ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
        }
        if (type === 'hutang') {
            return isDarkMode ? 'bg-rose-500/10 text-rose-300 border-rose-500/20' : 'bg-rose-50 text-rose-700 border-rose-200';
        }

        return isDarkMode ? 'bg-sky-500/10 text-sky-300 border-sky-500/20' : 'bg-sky-50 text-sky-700 border-sky-200';
    };

    const amountClass = (type) => {
        if (type === 'pelunasan' || type === 'bayar_hutang') {
            return 'text-emerald-500';
        }

        return type === 'kasbon' ? 'text-amber-500' : 'text-rose-500';
    };

    const isPiutangForm = PIUTANG_TYPES.includes(formType);
    const isHutangForm = HUTANG_TYPES.includes(formType);

    return (
        <>
            <AdminPageCard
                icon={HandCoins}
                accent="violet"
                title="Hutang & Piutang"
                description="Catat kasbon teknisi lapangan, pelunasan, serta hutang operasional perusahaan."
                themeCard={themeCard}
                isDarkMode={isDarkMode}
                themeTextTitle={themeTextTitle}
                themeTextDesc={themeTextDesc}
                actions={canWrite ? (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => openModal(null, 'kasbon')}
                            title="Tambah Kasbon"
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl cursor-pointer inline-flex items-center gap-1.5 text-[10px] font-bold"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Kasbon
                        </button>
                        <button
                            type="button"
                            onClick={() => openModal(null, 'pelunasan')}
                            title="Catat Pelunasan"
                            className="px-3 py-1.5 bg-violet-500 hover:bg-violet-600 text-white rounded-xl cursor-pointer inline-flex items-center gap-1.5 text-[10px] font-bold"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Transaksi
                        </button>
                    </div>
                ) : undefined}
            >
                <div className={`rounded-xl border p-3 space-y-3 ${themeInnerWidget}`}>
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-violet-500" />
                        <p className={`text-xs font-bold ${themeTextTitle}`}>Filter Laporan</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={`px-3 py-2 border rounded-xl text-xs min-w-0 ${themeInput}`} />
                        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={`px-3 py-2 border rounded-xl text-xs min-w-0 ${themeInput}`} />
                        <select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} className={`col-span-2 md:col-span-1 px-3 py-2 border rounded-xl text-xs font-bold min-w-0 ${themeInput}`}>
                            <option value="all">Semua teknisi</option>
                            {technicians.map((technician) => (
                                <option key={technician.id} value={technician.id}>
                                    {technician.name}{technician.router_name ? ` · ${technician.router_name}` : ''}
                                </option>
                            ))}
                        </select>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={`col-span-2 md:col-span-1 px-3 py-2 border rounded-xl text-xs font-bold min-w-0 ${themeInput}`}>
                            <option value="all">Semua jenis</option>
                            {Object.entries(types).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                        <button type="button" onClick={applyFilters} className="col-span-2 md:col-span-1 px-3 py-2 rounded-xl text-xs font-bold bg-violet-500 hover:bg-violet-600 text-white cursor-pointer">
                            Terapkan Filter
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className={`rounded-xl border p-3.5 ${isDarkMode ? 'border-amber-500/20 bg-amber-500/5' : 'border-amber-200 bg-amber-50/80'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-amber-300' : 'text-amber-700'}`}>Piutang Kasbon Aktif</p>
                        <p className={`text-2xl font-black mt-1 ${themeTextTitle}`}>{formatRupiah(summary.total_piutang || 0)}</p>
                        <p className={`text-[10px] mt-1 ${themeTextDesc}`}>{summary.staff_with_balance || 0} teknisi masih punya saldo</p>
                    </div>
                    <div className={`rounded-xl border p-3.5 ${isDarkMode ? 'border-rose-500/20 bg-rose-500/5' : 'border-rose-200 bg-rose-50/80'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-rose-300' : 'text-rose-700'}`}>Hutang Aktif</p>
                        <p className={`text-2xl font-black mt-1 ${themeTextTitle}`}>{formatRupiah(summary.total_hutang || 0)}</p>
                        <p className={`text-[10px] mt-1 ${themeTextDesc}`}>Hutang belum lunas</p>
                    </div>
                    <div className={`rounded-xl border p-3.5 ${themeInnerWidget}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Kasbon Periode</p>
                        <p className={`text-2xl font-black mt-1 ${themeTextTitle}`}>{formatRupiah(summary.period_kasbon || 0)}</p>
                        <p className={`text-[10px] mt-1 ${themeTextDesc}`}>Pelunasan {formatRupiah(summary.period_pelunasan || 0)}</p>
                    </div>
                    <div className={`rounded-xl border p-3.5 ${themeInnerWidget}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Hutang Periode</p>
                        <p className={`text-2xl font-black mt-1 ${themeTextTitle}`}>{formatRupiah(summary.period_hutang || 0)}</p>
                        <p className={`text-[10px] mt-1 ${themeTextDesc}`}>Dibayar {formatRupiah(summary.period_bayar_hutang || 0)}</p>
                    </div>
                </div>

                {staffBalances.length > 0 && (
                    <div className="space-y-2">
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Saldo Kasbon per Teknisi</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {staffBalances.map((staff) => (
                                <div key={staff.staff_user_id} className={`rounded-lg border p-3 ${themeInnerWidget}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className={`text-xs font-bold ${themeTextTitle}`}>{staff.name}</p>
                                            <p className={`text-[10px] ${themeTextDesc}`}>{staff.router_name || 'Tanpa router'}</p>
                                        </div>
                                        <p className={`text-sm font-black ${staff.balance > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                            {formatRupiah(staff.balance)}
                                        </p>
                                    </div>
                                    <p className={`text-[10px] mt-2 ${themeTextDesc}`}>
                                        Kasbon {formatRupiah(staff.kasbon_total)} · Lunas {formatRupiah(staff.pelunasan_total)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <div className="relative">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${themeTextDesc}`} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Cari teknisi, judul, pihak hutang..."
                            className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs ${themeInput}`}
                        />
                    </div>

                    <div className="admin-table-scroll">
                        <table>
                            <thead>
                                <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                    <th className="py-3 px-2 text-left">Tanggal</th>
                                    <th className="py-3 px-2 text-left">Jenis</th>
                                    <th className="py-3 px-2 text-left">Teknisi / Pihak</th>
                                    <th className="py-3 px-2 text-left">Keterangan</th>
                                    <th className="py-3 px-2 text-left">Metode</th>
                                    <th className="py-3 px-2 text-right">Nominal</th>
                                    <th className="py-3 px-2 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/20 text-xs">
                                {filteredEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className={`py-8 text-center ${themeTextDesc}`}>Belum ada transaksi pada periode ini.</td>
                                    </tr>
                                ) : filteredEntries.map((entry) => (
                                    <tr key={entry.id} className={themeTextSub}>
                                        <td className="py-3 px-2 whitespace-nowrap">{entry.label}</td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${typeBadgeClass(entry.type)}`}>
                                                {entry.type_label}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2">
                                            <p className={`font-bold ${themeTextTitle}`}>{entry.staff_name || entry.counterparty || '—'}</p>
                                            {entry.router_name && <p className={`text-[10px] ${themeTextDesc}`}>{entry.router_name}</p>}
                                        </td>
                                        <td className="py-3 px-2">
                                            <p className={`font-semibold ${themeTextTitle}`}>{entry.title}</p>
                                            {entry.notes && <p className={`text-[10px] mt-0.5 ${themeTextDesc}`}>{entry.notes}</p>}
                                        </td>
                                        <td className="py-3 px-2">{entry.payment_method}</td>
                                        <td className={`py-3 px-2 text-right font-bold ${amountClass(entry.type)}`}>
                                            {entry.type === 'pelunasan' || entry.type === 'bayar_hutang' ? '−' : '+'}
                                            {formatRupiah(entry.amount)}
                                        </td>
                                        <td className="py-3 px-2 text-right">
                                            {canWrite ? (
                                                <div className="admin-table-actions justify-end">
                                                    <button type="button" onClick={() => openModal(entry)} className="p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer" title="Edit">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button type="button" onClick={() => setEntryToDelete(entry)} className="p-1 text-rose-500 hover:text-rose-400 cursor-pointer" title="Hapus">
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

            <TransitionModal show={showModal} onClose={() => setShowModal(false)} maxWidth="lg" themeCard={themeCard}>
                <form onSubmit={submitEntry} className="space-y-3 text-xs">
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>{editingEntry ? 'Edit Transaksi' : 'Catat Transaksi'}</h3>
                    {editingEntry && <input type="hidden" name="id" value={editingEntry.id} />}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="space-y-1">
                            <span className={`font-bold ${themeTextSub}`}>Jenis Transaksi</span>
                            <select
                                name="type"
                                required
                                value={formType}
                                onChange={(e) => setFormType(e.target.value)}
                                className={`w-full px-3 py-2 border rounded-xl ${themeInput}`}
                            >
                                {Object.entries(types).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-1">
                            <span className={`font-bold ${themeTextSub}`}>Tanggal</span>
                            <input
                                type="date"
                                name="transaction_date"
                                required
                                defaultValue={editingEntry?.transaction_date || todayDateInputValue()}
                                className={`w-full px-3 py-2 border rounded-xl ${themeInput}`}
                            />
                        </label>
                        {isPiutangForm && (
                            <label className="space-y-1 md:col-span-2">
                                <span className={`font-bold ${themeTextSub}`}>Teknisi Lapangan</span>
                                <select
                                    name="staff_user_id"
                                    required={isPiutangForm}
                                    defaultValue={editingEntry?.staff_user_id ? String(editingEntry.staff_user_id) : ''}
                                    className={`w-full px-3 py-2 border rounded-xl ${themeInput}`}
                                >
                                    <option value="">Pilih teknisi</option>
                                    {technicians.map((technician) => (
                                        <option key={technician.id} value={technician.id}>
                                            {technician.name}{technician.router_name ? ` · ${technician.router_name}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        )}
                        {isHutangForm && (
                            <label className="space-y-1 md:col-span-2">
                                <span className={`font-bold ${themeTextSub}`}>Pihak / Vendor Hutang</span>
                                <input
                                    type="text"
                                    name="counterparty"
                                    defaultValue={editingEntry?.counterparty || ''}
                                    placeholder="Nama vendor, supplier, atau pihak hutang"
                                    className={`w-full px-3 py-2 border rounded-xl ${themeInput}`}
                                />
                            </label>
                        )}
                        <label className="space-y-1 md:col-span-2">
                            <span className={`font-bold ${themeTextSub}`}>Judul / Keterangan</span>
                            <input
                                type="text"
                                name="title"
                                required
                                maxLength={150}
                                defaultValue={editingEntry?.title || ''}
                                placeholder="Contoh: Kasbon BBM lapangan, Hutang sewa alat"
                                className={`w-full px-3 py-2 border rounded-xl ${themeInput}`}
                            />
                        </label>
                        <label className="space-y-1">
                            <span className={`font-bold ${themeTextSub}`}>Nominal (Rp)</span>
                            <input
                                type="number"
                                name="amount"
                                required
                                min="0"
                                step="0.01"
                                defaultValue={editingEntry?.amount ?? ''}
                                className={`w-full px-3 py-2 border rounded-xl ${themeInput}`}
                            />
                        </label>
                        <label className="space-y-1">
                            <span className={`font-bold ${themeTextSub}`}>Metode Pembayaran</span>
                            <input
                                type="text"
                                name="payment_method"
                                defaultValue={editingEntry?.payment_method || ''}
                                placeholder="Cash, transfer, dll."
                                className={`w-full px-3 py-2 border rounded-xl ${themeInput}`}
                            />
                        </label>
                        <label className="space-y-1 md:col-span-2">
                            <span className={`font-bold ${themeTextSub}`}>Catatan</span>
                            <textarea
                                name="notes"
                                rows={3}
                                defaultValue={editingEntry?.notes || ''}
                                className={`w-full px-3 py-2 border rounded-xl ${themeInput}`}
                            />
                        </label>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={() => setShowModal(false)} className={`px-3 py-2 border rounded-xl cursor-pointer ${themeInput}`}>Batal</button>
                        <button type="submit" className="px-3 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-bold cursor-pointer inline-flex items-center gap-1.5">
                            <Save className="w-4 h-4" />
                            Simpan
                        </button>
                    </div>
                </form>
            </TransitionModal>

            <TransitionModal show={Boolean(entryToDelete)} onClose={() => setEntryToDelete(null)} maxWidth="sm" themeCard={themeCard}>
                <div className="space-y-3 text-xs">
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>Hapus Transaksi?</h3>
                    <p className={themeTextDesc}>
                        {entryToDelete?.type_label} — {entryToDelete?.title} ({formatRupiah(entryToDelete?.amount || 0)})
                    </p>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setEntryToDelete(null)} className={`px-3 py-2 border rounded-xl cursor-pointer ${themeInput}`}>Batal</button>
                        <button type="button" onClick={confirmDelete} className="px-3 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold cursor-pointer">Hapus</button>
                    </div>
                </div>
            </TransitionModal>
        </>
    );
}

export default function HutangPiutangIndex(props) {
    return (
        <AdminLayout title="Hutang & Piutang">
            <HutangPiutangContent {...props} />
        </AdminLayout>
    );
}
