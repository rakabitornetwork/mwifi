import { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Edit, Layers, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import AdminLayout from '../../../Layouts/AdminLayout';
import TransitionModal from '../../../Components/Admin/TransitionModal';
import { useAdminFormTheme } from '../../../hooks/useAdminFormTheme';
import { formatRupiah } from '../../../utils/formatRupiah';

function PackagesPageContent({ packages = [], routers = [] }) {
    const theme = useAdminFormTheme();
    const {
        isDarkMode,
        themeCard,
        themeTextTitle,
        themeTextSub,
        themeTextDesc,
        themeInput,
        themeLabel,
    } = theme;

    const defaultRouterId = (() => {
        const activeRouter = routers.find((r) => r.status);
        return activeRouter ? String(activeRouter.id) : '';
    })();

    const [showPackageModal, setShowPackageModal] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);
    const [selectedPackageType, setSelectedPackageType] = useState('pppoe');
    const [routerFilter, setRouterFilter] = useState(defaultRouterId);
    const [routerProfiles, setRouterProfiles] = useState([]);
    const [isLoadingRouterProfiles, setIsLoadingRouterProfiles] = useState(false);
    const [routerProfileError, setRouterProfileError] = useState(null);

    const handleSavePackage = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const payload = Object.fromEntries(data.entries());

        router.post('/admin/packages/save', payload, {
            onSuccess: () => {
                setShowPackageModal(false);
                setEditingPackage(null);
            },
        });
    };

    const handleDeletePackage = (packageId) => {
        if (!confirm('Apakah Anda yakin ingin menghapus paket layanan ini?')) return;

        router.post('/admin/packages/delete', { id: packageId });
    };

    useEffect(() => {
        if (editingPackage) {
            setSelectedPackageType(editingPackage.type || 'pppoe');
        } else {
            setSelectedPackageType('pppoe');
        }
    }, [editingPackage, showPackageModal]);

    useEffect(() => {
        if (!routerFilter) {
            setRouterProfiles([]);
            setRouterProfileError(null);
            return;
        }

        let cancelled = false;
        setIsLoadingRouterProfiles(true);
        setRouterProfileError(null);

        fetch(`/admin/packages/router-profiles?router_id=${routerFilter}`, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then(async (res) => {
                const data = await res.json();
                if (cancelled) return;

                if (!res.ok) {
                    throw new Error(data.error || 'Gagal memuat profil dari router.');
                }

                setRouterProfiles(data.all_profiles || []);
            })
            .catch((error) => {
                if (cancelled) return;
                setRouterProfiles([]);
                setRouterProfileError(error?.message || 'Gagal memuat profil dari router.');
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingRouterProfiles(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [routerFilter]);

    const profileSet = useMemo(
        () => new Set(routerProfiles.map((name) => String(name).toLowerCase())),
        [routerProfiles],
    );

    const filteredPackages = useMemo(() => {
        const sorted = [...packages].sort((a, b) => String(a.name).localeCompare(String(b.name), 'id'));

        if (!routerFilter) {
            return sorted;
        }

        if (isLoadingRouterProfiles) {
            return sorted;
        }

        if (routerProfileError || profileSet.size === 0) {
            return [];
        }

        return sorted.filter((pkg) => profileSet.has(String(pkg.mikrotik_profile || '').toLowerCase()));
    }, [packages, routerFilter, isLoadingRouterProfiles, routerProfileError, profileSet]);

    const selectedRouter = routers.find((r) => String(r.id) === String(routerFilter));

    const openAddModal = () => {
        setEditingPackage(null);
        setShowPackageModal(true);
    };

    const openEditModal = (pkg) => {
        setEditingPackage(pkg);
        setShowPackageModal(true);
    };

    return (
        <>
            <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3 gap-3`}>
                    <div className="flex items-center space-x-2">
                        <Layers className="w-5 h-5 text-emerald-500" />
                        <h2 className={`text-sm font-bold ${themeTextTitle}`}>Paket Layanan Internet</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <select
                            value={routerFilter}
                            onChange={(e) => setRouterFilter(e.target.value)}
                            className={`p-1.5 border rounded-xl text-xs min-w-[160px] ${themeInput}`}
                            title="Filter berdasarkan router Mikrotik"
                        >
                            <option value="">Semua Router</option>
                            {routers.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}{r.status ? '' : ' (nonaktif)'}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={openAddModal}
                            title="Tambah Paket"
                            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {routerFilter && (
                    <div className={`text-[10px] font-semibold ${routerProfileError ? 'text-amber-500' : themeTextSub}`}>
                        {isLoadingRouterProfiles && (
                            <span className="inline-flex items-center gap-1.5">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Memuat profil dari {selectedRouter?.name || 'router'}...
                            </span>
                        )}
                        {!isLoadingRouterProfiles && routerProfileError && routerProfileError}
                        {!isLoadingRouterProfiles && !routerProfileError && (
                            <>
                                Menampilkan {filteredPackages.length} paket yang ada di router{' '}
                                <span className={themeTextTitle}>{selectedRouter?.name}</span>
                                {' '}({routerProfiles.length} profil RouterOS)
                            </>
                        )}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                <th className="py-3 px-2">Nama Paket</th>
                                <th className="py-3 px-2">Jenis</th>
                                <th className="py-3 px-2">Masa Aktif</th>
                                <th className="py-3 px-2">Harga</th>
                                <th className="py-3 px-2">Speed Limit</th>
                                <th className="py-3 px-2">Mikrotik Profile</th>
                                <th className="py-3 px-2">Local IP</th>
                                <th className="py-3 px-2">Remote IP</th>
                                <th className="py-3 px-2">DNS Server</th>
                                <th className="py-3 px-2">Parent Queue</th>
                                <th className="py-3 px-2">Queue Type</th>
                                <th className="py-3 px-2 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/20 text-xs">
                            {filteredPackages.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className={`py-8 text-center ${themeTextDesc}`}>
                                        {routerFilter
                                            ? (isLoadingRouterProfiles
                                                ? 'Memuat paket dari router terpilih...'
                                                : routerProfileError
                                                    ? 'Tidak dapat memuat profil router. Periksa koneksi RouterOS.'
                                                    : 'Tidak ada paket yang cocok dengan profil di router ini.')
                                            : 'Belum ada paket layanan terdaftar.'}
                                    </td>
                                </tr>
                            ) : filteredPackages.map((pkg) => (
                                <tr key={pkg.id} className={`${themeTextSub} hover:bg-zinc-900/10`}>
                                    <td className={`py-3 px-2 font-bold ${themeTextTitle}`}>{pkg.name}</td>
                                    <td className="py-3 px-2 font-bold">
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${pkg.type === 'hotspot' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'}`}>
                                            {pkg.type === 'hotspot' ? 'Hotspot' : 'PPPoE'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 font-mono">{pkg.validity || '-'}</td>
                                    <td className="py-3 px-2 font-bold text-emerald-500">{formatRupiah(pkg.price)}</td>
                                    <td className="py-3 px-2 font-mono">{pkg.bandwidth_limit}</td>
                                    <td className="py-3 px-2 font-mono">{pkg.mikrotik_profile}</td>
                                    <td className="py-3 px-2 font-mono">{pkg.local_address || '-'}</td>
                                    <td className="py-3 px-2 font-mono">{pkg.remote_address || '-'}</td>
                                    <td className="py-3 px-2 font-mono">{pkg.dns_server || '-'}</td>
                                    <td className="py-3 px-2 font-mono">{pkg.parent_queue || '-'}</td>
                                    <td className="py-3 px-2 font-mono">
                                        {pkg.queue_type_rx || pkg.queue_type_tx
                                            ? `${pkg.queue_type_rx || '-'}/${pkg.queue_type_tx || '-'}`
                                            : '-'
                                        }
                                    </td>
                                    <td className="py-3 px-2 text-right space-x-1">
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(pkg)}
                                            className="inline-block p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors"
                                            title="Edit Paket"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeletePackage(pkg.id)}
                                            className="inline-block p-1 text-rose-500 hover:text-rose-400 cursor-pointer transition-colors"
                                            title="Hapus Paket"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <TransitionModal show={showPackageModal} themeCard={themeCard} maxWidth="md">
                <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                        {editingPackage ? 'Edit Paket Layanan' : 'Tambah Paket Layanan'}
                    </h3>
                    <button type="button" onClick={() => setShowPackageModal(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSavePackage} className="space-y-3 text-xs">
                    <input type="hidden" name="id" value={editingPackage ? editingPackage.id : ''} />
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Jenis Layanan</label>
                            <select
                                name="type"
                                value={selectedPackageType}
                                onChange={(e) => setSelectedPackageType(e.target.value)}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            >
                                <option value="pppoe">PPPoE (Kabel/Rumahan)</option>
                                <option value="hotspot">Hotspot (Voucher)</option>
                            </select>
                        </div>
                        {selectedPackageType === 'hotspot' ? (
                            <div className="flex flex-col gap-1">
                                <label className={`font-bold ${themeLabel}`}>Masa Aktif</label>
                                <input required name="validity" type="text" defaultValue={editingPackage ? editingPackage.validity : ''} placeholder="e.g. 2h, 1d, 30d" className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <label className={`font-bold ${themeLabel}`}>Masa Aktif</label>
                                <input disabled placeholder="N/A (Khusus Hotspot)" className={`p-2 border rounded-lg opacity-50 ${isDarkMode ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'bg-zinc-100 text-zinc-400 border-zinc-200'}`} />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Nama Paket</label>
                        <input required name="name" type="text" defaultValue={editingPackage ? editingPackage.name : ''} className={`p-2 border rounded-lg ${themeInput}`} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Harga (Rp)</label>
                        <input required name="price" type="number" defaultValue={editingPackage ? editingPackage.price : ''} className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Batas Kecepatan (Speed Limit)</label>
                        <input required name="bandwidth_limit" type="text" defaultValue={editingPackage ? editingPackage.bandwidth_limit : ''} placeholder="e.g. 20M/20M" className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Nama Profile Mikrotik</label>
                        <input required name="mikrotik_profile" type="text" defaultValue={editingPackage ? editingPackage.mikrotik_profile : ''} placeholder="e.g. Family-20M" className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                    </div>
                    {selectedPackageType === 'pppoe' && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>Local Address</label>
                                    <input name="local_address" type="text" defaultValue={editingPackage ? editingPackage.local_address : ''} placeholder="e.g. 192.168.22.1" className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>Remote Address</label>
                                    <input name="remote_address" type="text" defaultValue={editingPackage ? editingPackage.remote_address : ''} placeholder="e.g. pool_ppp" className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>DNS Server</label>
                                    <input name="dns_server" type="text" defaultValue={editingPackage ? editingPackage.dns_server : ''} placeholder="e.g. 8.8.8.8, 8.8.4.4" className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>Parent Queue</label>
                                    <input name="parent_queue" type="text" defaultValue={editingPackage ? editingPackage.parent_queue : ''} placeholder="e.g. GLOBAL CONN" className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>Queue Type Rx</label>
                                    <input name="queue_type_rx" type="text" defaultValue={editingPackage ? editingPackage.queue_type_rx : ''} placeholder="e.g. my-cake" className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>Queue Type Tx</label>
                                    <input name="queue_type_tx" type="text" defaultValue={editingPackage ? editingPackage.queue_type_tx : ''} placeholder="e.g. my-cake" className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                                </div>
                            </div>
                        </>
                    )}
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Deskripsi Paket</label>
                        <textarea name="description" rows={2} defaultValue={editingPackage ? editingPackage.description : ''} className={`p-2 border rounded-lg ${themeInput}`} />
                    </div>
                    <div className="flex justify-end pt-3 gap-2">
                        <button type="button" onClick={() => setShowPackageModal(false)} title="Batal" className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}><X className="w-4 h-4" /></button>
                        <button type="submit" title="Simpan" className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer inline-flex items-center justify-center"><Save className="w-4 h-4" /></button>
                    </div>
                </form>
            </TransitionModal>
        </>
    );
}

export default function PackagesIndex({ packages, routers }) {
    return (
        <AdminLayout title="Paket Internet">
            <PackagesPageContent packages={packages} routers={routers} />
        </AdminLayout>
    );
}
