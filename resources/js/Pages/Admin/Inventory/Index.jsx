import { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, Edit, History, Layers, Package, Plug, Plus, Router, Save, Search, Trash2, X } from 'lucide-react';
import AdminLayout from '../../../Layouts/AdminLayout';
import AdminPageCard from '../../../Components/Admin/AdminPageCard';
import TransitionModal from '../../../Components/Admin/TransitionModal';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';
import { useStaffPermissions } from '../../../hooks/useStaffPermissions';
import { ReadOnlyTableActionsPlaceholder } from '../../../Components/Admin/ReadOnlyStaffBanner';

const WATCH_CATEGORY_ICONS = {
    ont: Router,
    adaptor: Plug,
};

function isItemLowStock(item) {
    const minStock = Number(item?.min_stock || 0);
    return minStock > 0 && Number(item?.quantity || 0) <= minStock;
}

function InventoryPageContent({
    items = [],
    categories = {},
    conditions = {},
    units = {},
    watchCategories = {},
    recentMovements = [],
    customers = [],
}) {
    const theme = useAdminTheme();
    const { canWrite } = useStaffPermissions();
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
    const themeLabel = isDarkMode ? 'text-zinc-400' : 'text-zinc-650';

    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [stockFilter, setStockFilter] = useState('all');
    const [showItemModal, setShowItemModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [movementItem, setMovementItem] = useState(null);
    const [movementType, setMovementType] = useState('out');

    useEffect(() => {
        if (showItemModal) {
            return;
        }
        setEditingItem(null);
    }, [showItemModal]);

    useEffect(() => {
        if (showMovementModal) {
            return;
        }
        setMovementItem(null);
        setMovementType('out');
    }, [showMovementModal]);

    const stats = useMemo(() => {
        const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        const lowStockCount = items.filter((item) => isItemLowStock(item)).length;

        return {
            itemCount: items.length,
            totalQuantity,
            lowStockCount,
        };
    }, [items]);

    const filteredItems = useMemo(() => items.filter((item) => {
        if (categoryFilter !== 'all' && item.category !== categoryFilter) {
            return false;
        }

        const isLowStock = isItemLowStock(item);

        if (stockFilter === 'low' && !isLowStock) {
            return false;
        }

        if (stockFilter === 'ok' && isLowStock) {
            return false;
        }

        const term = searchTerm.trim().toLowerCase();
        if (!term) {
            return true;
        }

        return (
            item.name?.toLowerCase().includes(term)
            || item.sku?.toLowerCase().includes(term)
            || item.location?.toLowerCase().includes(term)
            || (categories[item.category] || item.category || '').toLowerCase().includes(term)
            || (conditions[item.condition] || item.condition || '').toLowerCase().includes(term)
        );
    }), [items, categoryFilter, stockFilter, searchTerm, categories, conditions]);

    const openCreateModal = () => {
        setEditingItem(null);
        setShowItemModal(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setShowItemModal(true);
    };

    const closeItemModal = () => {
        setShowItemModal(false);
    };

    const openDeleteModal = (item) => {
        setItemToDelete(item);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setTimeout(() => setItemToDelete(null), 300);
    };

    const handleSaveItem = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const payload = Object.fromEntries(data.entries());

        router.post('/admin/inventory/save', payload, {
            onSuccess: () => {
                setShowItemModal(false);
                setEditingItem(null);
            },
        });
    };

    const confirmDeleteItem = () => {
        if (!itemToDelete) return;

        router.post('/admin/inventory/delete', { id: itemToDelete.id }, {
            onSuccess: () => {
                setShowDeleteModal(false);
                setTimeout(() => setItemToDelete(null), 300);
            },
        });
    };

    const openMovementModal = (item, type = 'out') => {
        setMovementItem(item);
        setMovementType(type);
        setShowMovementModal(true);
    };

    const closeMovementModal = () => {
        setShowMovementModal(false);
    };

    const handleAdjustStock = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const payload = Object.fromEntries(data.entries());

        router.post('/admin/inventory/adjust', payload, {
            onSuccess: () => {
                setShowMovementModal(false);
                setMovementItem(null);
            },
        });
    };

    const movementTypeBadgeClass = (type) => {
        switch (type) {
            case 'in':
                return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'out':
                return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            default:
                return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
        }
    };

    const formatQuantityChange = (change) => {
        const value = Number(change || 0);
        if (value > 0) return `+${value.toLocaleString('id-ID')}`;
        return value.toLocaleString('id-ID');
    };

    const statCards = useMemo(() => [
        {
            label: 'Total Jenis Barang',
            value: stats.itemCount.toLocaleString('id-ID'),
            icon: Package,
            cardClass: 'bg-gradient-to-br from-sky-500 to-cyan-600 border-sky-400/20 text-white shadow-md shadow-sky-500/10',
            labelClass: 'text-sky-100/90',
            iconClass: 'text-sky-100/80',
            valueClass: 'text-white',
        },
        {
            label: 'Total Stok (Qty)',
            value: stats.totalQuantity.toLocaleString('id-ID'),
            icon: Layers,
            cardClass: 'bg-gradient-to-br from-violet-500 to-indigo-600 border-violet-400/20 text-white shadow-md shadow-violet-500/10',
            labelClass: 'text-violet-100/90',
            iconClass: 'text-violet-100/80',
            valueClass: 'text-white',
        },
        {
            label: 'Stok Menipis',
            value: stats.lowStockCount.toLocaleString('id-ID'),
            icon: AlertTriangle,
            cardClass: stats.lowStockCount > 0
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-400/20 text-white shadow-md shadow-amber-500/10'
                : 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400/20 text-white shadow-md shadow-emerald-500/10',
            labelClass: stats.lowStockCount > 0 ? 'text-amber-100/90' : 'text-emerald-100/90',
            iconClass: stats.lowStockCount > 0 ? 'text-amber-100/80' : 'text-emerald-100/80',
            valueClass: 'text-white',
        },
    ], [stats.itemCount, stats.totalQuantity, stats.lowStockCount]);

    const watchEntries = useMemo(
        () => Object.entries(watchCategories),
        [watchCategories],
    );

    const hasWatchAlert = useMemo(
        () => watchEntries.some(([, summary]) => summary.status === 'low'),
        [watchEntries],
    );

    const applyWatchFilter = (categoryKey, focusLowStock = false) => {
        setCategoryFilter(categoryKey);
        setStockFilter(focusLowStock ? 'low' : 'all');
        setSearchTerm('');
    };

    const conditionBadgeClass = (condition) => {
        switch (condition) {
            case 'new':
                return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'used':
                return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
            case 'damaged':
                return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            default:
                return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
        }
    };

    return (
        <>
            <AdminPageCard
                icon={Boxes}
                accent="sky"
                title="Manajemen Inventaris"
                description="Kelola stok perangkat jaringan, kabel, ODP, dan perlengkapan operasional."
                themeCard={themeCard}
                isDarkMode={isDarkMode}
                themeTextTitle={themeTextTitle}
                themeTextDesc={themeTextDesc}
                actions={canWrite ? (
                    <button
                        type="button"
                        onClick={openCreateModal}
                        title="Tambah Item"
                        className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                ) : null}
            >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {statCards.map((card) => {
                        const Icon = card.icon;

                        return (
                            <div
                                key={card.label}
                                className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] ${card.cardClass}`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className={`text-[10px] font-bold uppercase tracking-wide ${card.labelClass}`}>
                                        {card.label}
                                    </p>
                                    <Icon className={`w-4 h-4 shrink-0 ${card.iconClass}`} />
                                </div>
                                <p className={`text-2xl font-black mt-2 tracking-tight leading-none ${card.valueClass}`}>
                                    {card.value}
                                </p>
                            </div>
                        );
                    })}
                </div>

                <div className={`rounded-xl border p-3 space-y-3 ${isDarkMode ? 'border-zinc-800/80 bg-zinc-950/20' : 'border-zinc-200 bg-zinc-50/80'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <p className={`text-xs font-bold ${themeTextTitle}`}>Pantauan ONT & Adaptor</p>
                            <p className={`text-[10px] mt-0.5 ${themeTextDesc}`}>
                                Catat stok keluar saat pasang pelanggan. Isi <span className="font-semibold">Stok Minimum</span> — WhatsApp admin otomatis saat ONT/Adaptor menipis.
                            </p>
                        </div>
                        {hasWatchAlert && (
                            <span className="inline-flex items-center gap-1.5 self-start text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Ada stok ONT/Adaptor menipis
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {watchEntries.map(([categoryKey, summary]) => {
                            const Icon = WATCH_CATEGORY_ICONS[categoryKey] || Package;
                            const isLow = summary.status === 'low';
                            const isEmpty = summary.status === 'empty';

                            return (
                                <button
                                    key={categoryKey}
                                    type="button"
                                    onClick={() => applyWatchFilter(categoryKey, isLow)}
                                    className={`rounded-xl border p-3 text-left transition-all duration-200 hover:scale-[1.01] cursor-pointer ${
                                        isLow
                                            ? (isDarkMode ? 'border-amber-500/35 bg-amber-500/5' : 'border-amber-200 bg-amber-50/80')
                                            : isEmpty
                                                ? (isDarkMode ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-white')
                                                : (isDarkMode ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/70')
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className={`text-[10px] font-bold uppercase tracking-wide ${isLow ? 'text-amber-500' : isEmpty ? themeTextSub : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                {summary.label}
                                            </p>
                                            <p className={`text-2xl font-black mt-1 tabular-nums leading-none ${themeTextTitle}`}>
                                                {summary.total_quantity.toLocaleString('id-ID')}
                                                <span className={`text-xs font-bold ml-1 ${themeTextSub}`}>pcs total</span>
                                            </p>
                                        </div>
                                        <Icon className={`w-5 h-5 shrink-0 ${isLow ? 'text-amber-500' : isEmpty ? themeTextDesc : 'text-emerald-500'}`} />
                                    </div>

                                    <p className={`text-[10px] mt-2 ${themeTextDesc}`}>
                                        {isEmpty
                                            ? 'Belum ada item di kategori ini.'
                                            : `${summary.item_count} jenis barang · ${summary.low_stock_count} stok menipis`}
                                    </p>

                                    {!isEmpty && summary.low_stock_items?.length > 0 && (
                                        <ul className={`mt-2 space-y-1 text-[10px] ${isLow ? 'text-amber-700 dark:text-amber-300/90' : themeTextDesc}`}>
                                            {summary.low_stock_items.map((item) => (
                                                <li key={item.id} className="flex items-center gap-1.5 min-w-0">
                                                    <AlertTriangle className="w-3 h-3 shrink-0 text-amber-500" />
                                                    <span className="truncate font-semibold">{item.name}</span>
                                                    <span className="shrink-0 tabular-nums">
                                                        ({item.quantity}/{item.min_stock} {units[item.unit] || item.unit})
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${themeTextDesc}`} />
                        <input
                            type="text"
                            placeholder="Cari nama, SKU, lokasi, kategori..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className={`lg:w-52 shrink-0 px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                    >
                        <option value="all">Semua Kategori</option>
                        {Object.entries(categories).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <select
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        className={`lg:w-44 shrink-0 px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                    >
                        <option value="all">Semua Stok</option>
                        <option value="low">Stok Menipis</option>
                        <option value="ok">Stok Aman</option>
                    </select>
                </div>

                <div className="admin-table-scroll">
                    <table>
                        <thead>
                            <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                <th className="py-3 px-2">Nama Barang</th>
                                <th className="py-3 px-2">SKU</th>
                                <th className="py-3 px-2">Kategori</th>
                                <th className="py-3 px-2">Stok</th>
                                <th className="py-3 px-2">Min</th>
                                <th className="py-3 px-2">Lokasi</th>
                                <th className="py-3 px-2">Kondisi</th>
                                <th className="py-3 px-2 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/20 text-xs">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className={`py-8 text-center ${themeTextDesc}`}>
                                        {searchTerm.trim() || categoryFilter !== 'all' || stockFilter !== 'all'
                                            ? 'Tidak ada item inventaris yang cocok dengan filter.'
                                            : 'Belum ada data inventaris. Klik tombol + untuk menambah item.'}
                                    </td>
                                </tr>
                            ) : filteredItems.map((item) => {
                                const isLowStock = isItemLowStock(item);

                                return (
                                    <tr key={item.id} className={`${themeTextSub} hover:bg-zinc-900/10`}>
                                        <td className={`py-3 px-2 font-bold ${themeTextTitle}`}>
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {isLowStock && (
                                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Stok menipis" />
                                                )}
                                                <span className="truncate">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 font-mono text-[10px]">{item.sku || '—'}</td>
                                        <td className="py-3 px-2">{categories[item.category] || item.category}</td>
                                        <td className={`py-3 px-2 font-bold tabular-nums ${isLowStock ? 'text-amber-500' : themeTextTitle}`}>
                                            {Number(item.quantity || 0).toLocaleString('id-ID')} {units[item.unit] || item.unit}
                                        </td>
                                        <td className="py-3 px-2 tabular-nums">{Number(item.min_stock || 0).toLocaleString('id-ID')}</td>
                                        <td className="py-3 px-2">{item.location || '—'}</td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${conditionBadgeClass(item.condition)}`}>
                                                {conditions[item.condition] || item.condition}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-right">
                                            {canWrite ? (
                                            <div className="admin-table-actions">
                                                <button
                                                    type="button"
                                                    onClick={() => openMovementModal(item, 'out')}
                                                    title="Stok Keluar"
                                                    className="inline-block p-1 text-rose-500 hover:text-rose-400 cursor-pointer transition-colors"
                                                >
                                                    <ArrowDownRight className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openMovementModal(item, 'in')}
                                                    title="Stok Masuk"
                                                    className="inline-block p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors"
                                                >
                                                    <ArrowUpRight className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(item)}
                                                    title="Edit"
                                                    className="inline-block p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openDeleteModal(item)}
                                                    title="Hapus"
                                                    className="inline-block p-1 text-rose-500 hover:text-rose-400 cursor-pointer transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            ) : (
                                                <ReadOnlyTableActionsPlaceholder />
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className={`rounded-xl border p-3 space-y-3 ${isDarkMode ? 'border-zinc-800/80 bg-zinc-950/20' : 'border-zinc-200 bg-zinc-50/80'}`}>
                    <div className="flex items-center gap-2">
                        <History className={`w-4 h-4 ${themeTextDesc}`} />
                        <div>
                            <p className={`text-xs font-bold ${themeTextTitle}`}>Riwayat Stok Terbaru</p>
                            <p className={`text-[10px] ${themeTextDesc}`}>Catatan stok masuk, keluar, dan penyesuaian manual.</p>
                        </div>
                    </div>

                    <div className="admin-table-scroll">
                        <table>
                            <thead>
                                <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                    <th className="py-2 px-2">Waktu</th>
                                    <th className="py-2 px-2">Barang</th>
                                    <th className="py-2 px-2">Jenis</th>
                                    <th className="py-2 px-2">Perubahan</th>
                                    <th className="py-2 px-2">Stok Akhir</th>
                                    <th className="py-2 px-2">Pelanggan</th>
                                    <th className="py-2 px-2">Catatan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/20 text-xs">
                                {recentMovements.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className={`py-6 text-center ${themeTextDesc}`}>
                                            Belum ada riwayat stok. Gunakan tombol panah pada tabel item untuk catat stok keluar/masuk.
                                        </td>
                                    </tr>
                                ) : recentMovements.map((movement) => (
                                    <tr key={movement.id} className={themeTextSub}>
                                        <td className="py-2 px-2 whitespace-nowrap tabular-nums">{movement.created_at_label || '—'}</td>
                                        <td className={`py-2 px-2 font-bold ${themeTextTitle}`}>
                                            <div className="min-w-0">
                                                <p className="truncate">{movement.item?.name || '—'}</p>
                                                <p className={`text-[10px] font-normal ${themeTextDesc}`}>{movement.item?.category_label || ''}</p>
                                            </div>
                                        </td>
                                        <td className="py-2 px-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${movementTypeBadgeClass(movement.type)}`}>
                                                {movement.type_label}
                                            </span>
                                        </td>
                                        <td className={`py-2 px-2 font-bold tabular-nums ${Number(movement.quantity_change) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {formatQuantityChange(movement.quantity_change)}
                                        </td>
                                        <td className="py-2 px-2 tabular-nums">{Number(movement.quantity_after || 0).toLocaleString('id-ID')}</td>
                                        <td className="py-2 px-2">
                                            {movement.customer
                                                ? (
                                                    <span className="block truncate max-w-[140px]" title={movement.customer.name}>
                                                        {movement.customer.name}
                                                    </span>
                                                )
                                                : '—'}
                                        </td>
                                        <td className={`py-2 px-2 max-w-[180px] truncate ${themeTextDesc}`} title={movement.notes || ''}>
                                            {movement.notes || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </AdminPageCard>

            <TransitionModal show={showMovementModal} onClose={closeMovementModal} themeCard={themeCard} maxWidth="md">
                <div className={`flex items-start justify-between gap-3 pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                        {movementType === 'in' ? 'Stok Masuk' : 'Stok Keluar'}
                        {movementItem ? ` — ${movementItem.name}` : ''}
                    </h3>
                    <button type="button" onClick={closeMovementModal} className="text-zinc-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleAdjustStock} className="space-y-3 text-xs mt-3">
                    <input type="hidden" name="inventory_item_id" value={movementItem?.id || ''} />
                    <input type="hidden" name="type" value={movementType} />

                    <div className={`rounded-lg border p-2.5 ${isDarkMode ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-zinc-50'}`}>
                        <p className={`text-[10px] ${themeTextDesc}`}>Stok saat ini</p>
                        <p className={`text-lg font-black tabular-nums ${themeTextTitle}`}>
                            {Number(movementItem?.quantity || 0).toLocaleString('id-ID')}
                            {' '}
                            {units[movementItem?.unit] || movementItem?.unit || 'pcs'}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setMovementType('out')}
                            className={`flex-1 p-2 rounded-lg border font-bold cursor-pointer transition-colors ${movementType === 'out'
                                ? 'border-rose-500/50 bg-rose-500/10 text-rose-500'
                                : (isDarkMode ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-650')}`}
                        >
                            Stok Keluar
                        </button>
                        <button
                            type="button"
                            onClick={() => setMovementType('in')}
                            className={`flex-1 p-2 rounded-lg border font-bold cursor-pointer transition-colors ${movementType === 'in'
                                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500'
                                : (isDarkMode ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-650')}`}
                        >
                            Stok Masuk
                        </button>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Jumlah</label>
                        <input
                            required
                            name="quantity"
                            type="number"
                            min={1}
                            defaultValue={1}
                            className={`p-2 border rounded-lg ${themeInput}`}
                        />
                    </div>

                    {movementType === 'out' && (
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Pelanggan (opsional)</label>
                            <select name="customer_id" defaultValue="" className={`p-2 border rounded-lg ${themeInput}`}>
                                <option value="">— Tidak ditautkan —</option>
                                {customers.map((customer) => (
                                    <option key={customer.id} value={customer.id}>
                                        {customer.name} ({customer.username})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Catatan</label>
                        <textarea
                            name="notes"
                            rows={2}
                            placeholder={movementType === 'out' ? 'Contoh: Pasang pelanggan baru di ODP-12' : 'Contoh: Restock dari supplier'}
                            className={`p-2 border rounded-lg resize-none ${themeInput}`}
                        />
                    </div>

                    <div className="flex justify-end pt-2 gap-2">
                        <button
                            type="button"
                            onClick={closeMovementModal}
                            title="Batal"
                            className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button type="submit" title="Simpan" className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg inline-flex items-center justify-center">
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </TransitionModal>

            <TransitionModal show={showItemModal} onClose={closeItemModal} themeCard={themeCard} maxWidth="lg">
                <div className={`flex items-start justify-between gap-3 pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                        {editingItem ? 'Edit Item Inventaris' : 'Tambah Item Inventaris'}
                    </h3>
                    <button type="button" onClick={closeItemModal} className="text-zinc-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSaveItem} className="space-y-3 text-xs mt-3">
                    <input type="hidden" name="id" value={editingItem ? editingItem.id : ''} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className={`font-bold ${themeLabel}`}>Nama Barang</label>
                            <input
                                required
                                name="name"
                                type="text"
                                defaultValue={editingItem?.name || ''}
                                placeholder="Contoh: ONT Huawei HG8245H"
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>SKU / Kode</label>
                            <input
                                name="sku"
                                type="text"
                                defaultValue={editingItem?.sku || ''}
                                placeholder="ONT-HG8245H"
                                className={`p-2 border rounded-lg font-mono ${themeInput}`}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Kategori</label>
                            <select
                                name="category"
                                required
                                defaultValue={editingItem?.category || 'other'}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            >
                                {Object.entries(categories).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Jumlah Stok</label>
                            <input
                                required
                                name="quantity"
                                type="number"
                                min={0}
                                defaultValue={editingItem?.quantity ?? 0}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Satuan</label>
                            <select
                                name="unit"
                                required
                                defaultValue={editingItem?.unit || 'pcs'}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            >
                                {Object.entries(units).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Stok Minimum</label>
                            <input
                                required
                                name="min_stock"
                                type="number"
                                min={0}
                                defaultValue={editingItem?.min_stock ?? 0}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                            <p className={`text-[10px] leading-snug ${themeTextDesc}`}>
                                Wajib diisi untuk ONT/Adaptor agar peringatan stok menipis aktif (contoh: min 5).
                            </p>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Lokasi Penyimpanan</label>
                            <input
                                name="location"
                                type="text"
                                defaultValue={editingItem?.location || ''}
                                placeholder="Gudang / Rak A1"
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Kondisi</label>
                            <select
                                name="condition"
                                required
                                defaultValue={editingItem?.condition || 'new'}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            >
                                {Object.entries(conditions).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className={`font-bold ${themeLabel}`}>Catatan</label>
                            <textarea
                                name="notes"
                                rows={3}
                                defaultValue={editingItem?.notes || ''}
                                placeholder="Serial batch, supplier, atau keterangan lain..."
                                className={`p-2 border rounded-lg resize-none ${themeInput}`}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-3 gap-2">
                        <button
                            type="button"
                            onClick={closeItemModal}
                            title="Batal"
                            className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button type="submit" title="Simpan" className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg inline-flex items-center justify-center">
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            </TransitionModal>

            <TransitionModal show={showDeleteModal} onClose={closeDeleteModal} themeCard={themeCard} maxWidth="md">
                <div className={`flex items-start justify-between gap-3 pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className="text-sm font-bold text-rose-500">Hapus Item Inventaris</h3>
                    <button type="button" onClick={closeDeleteModal} className={`text-zinc-500 ${isDarkMode ? 'hover:text-white' : 'hover:text-zinc-800'}`}>
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className={`text-xs mt-3 ${themeTextTitle}`}>
                    Apakah Anda yakin ingin menghapus <strong>{itemToDelete?.name || ''}</strong> dari inventaris?
                </p>
                <div className="flex justify-end pt-4 gap-2">
                    <button
                        type="button"
                        onClick={closeDeleteModal}
                        title="Batal"
                        className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={confirmDeleteItem}
                        title="Konfirmasi Hapus"
                        className="p-2 rounded-lg text-white bg-rose-500 hover:bg-rose-600 cursor-pointer inline-flex items-center justify-center"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </TransitionModal>
        </>
    );
}

export default function InventoryIndex({
    items,
    categories,
    conditions,
    units,
    watchCategories,
    recentMovements,
    customers,
}) {
    return (
        <AdminLayout title="Manajemen Inventaris">
            <InventoryPageContent
                items={items}
                categories={categories}
                conditions={conditions}
                units={units}
                watchCategories={watchCategories}
                recentMovements={recentMovements}
                customers={customers}
            />
        </AdminLayout>
    );
}
