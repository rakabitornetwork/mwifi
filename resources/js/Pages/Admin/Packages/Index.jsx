import { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Edit, Layers, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import AdminLayout from '../../../Layouts/AdminLayout';
import TransitionModal from '../../../Components/Admin/TransitionModal';
import { useAdminFormTheme } from '../../../hooks/useAdminFormTheme';
import { useAdminToast } from '../../../hooks/useAdminToast';
import { formatRupiah } from '../../../utils/formatRupiah';
import {
    clearRouterPackageProfilesCache,
    fetchRouterPackageProfiles,
    peekRouterPackageProfiles,
} from '../../../utils/fetchRouterPackageProfiles';

const HOTSPOT_VALIDITY_PRESETS = ['1h', '2h', '6h', '12h', '1d', '7d', '30d'];

function packageHasNumericPrefix(pkg) {
    const name = String(pkg?.name ?? '').trim();

    return /^\d/.test(name);
}

function profileHasNumericPrefix(name) {
    return /^\d/.test(String(name ?? '').trim());
}

function dedupePackagesByMikrotikProfile(items = []) {
    const byProfile = new Map();

    for (const pkg of items) {
        const key = String(pkg.mikrotik_profile || pkg.name || '').trim().toLowerCase();
        if (key === '') {
            continue;
        }

        const existing = byProfile.get(key);
        if (!existing || Number(pkg.id) > Number(existing.id)) {
            byProfile.set(key, pkg);
        }
    }

    return Array.from(byProfile.values()).sort((a, b) => String(a.name).localeCompare(String(b.name), 'id'));
}

function listDuplicatePackages(items = []) {
    const kept = dedupePackagesByMikrotikProfile(items);
    const keptIds = new Set(kept.map((pkg) => pkg.id));

    return items
        .filter((pkg) => !keptIds.has(pkg.id))
        .sort((a, b) => Number(a.id) - Number(b.id));
}

const emptyPackageForm = {
    name: '',
    price: '',
    bandwidth_limit: '',
    local_address: '',
    remote_address: '',
    dns_server: '',
    parent_queue: '',
    queue_type_rx: '',
    queue_type_tx: '',
    only_one: true,
    validity: '',
    description: '',
};

function RouterOsField({
    label,
    name,
    value,
    onChange,
    options = [],
    placeholder = '',
    required = false,
    themeInput,
    themeLabel,
    allowEmpty = true,
    disabled = false,
}) {
    const normalizedOptions = [...new Set(options.filter(Boolean))];
    const hasOptions = normalizedOptions.length > 0;
    const isCustomValue = value && !normalizedOptions.includes(value);

    return (
        <div className="flex flex-col gap-1">
            <label className={`font-bold ${themeLabel}`}>{label}</label>
            {hasOptions ? (
                <select
                    name={name}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    disabled={disabled}
                    className={`p-2 border rounded-lg font-mono ${themeInput} disabled:opacity-50`}
                >
                    {allowEmpty && <option value="">— Pilih —</option>}
                    {normalizedOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                    {isCustomValue && (
                        <option value={value}>{value} (kustom)</option>
                    )}
                </select>
            ) : (
                <input
                    name={name}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    required={required}
                    disabled={disabled}
                    placeholder={placeholder}
                    className={`p-2 border rounded-lg font-mono ${themeInput} disabled:opacity-50`}
                />
            )}
        </div>
    );
}

function PackagesPageContent({ packages = [], routers = [] }) {
    const theme = useAdminFormTheme();
    const { showToast } = useAdminToast();
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
    const [routerOsCache, setRouterOsCache] = useState({});
    const [isLoadingRouterProfiles, setIsLoadingRouterProfiles] = useState(false);
    const [isLoadingFormOptions, setIsLoadingFormOptions] = useState(false);
    const [isSyncingPackages, setIsSyncingPackages] = useState(false);
    const [routerProfileError, setRouterProfileError] = useState(null);
    const [packageForm, setPackageForm] = useState(emptyPackageForm);

    const loadRouterOsData = async (routerId, { force = false, scope = 'list', signal } = {}) => {
        if (!routerId) {
            return null;
        }

        if (force) {
            clearRouterPackageProfilesCache(routerId);
        }

        const data = await fetchRouterPackageProfiles(routerId, { force, scope, signal });
        setRouterOsCache((prev) => ({
            ...prev,
            [routerId]: data,
        }));

        return data;
    };

    const ensureFormOptions = async (routerId, { force = false } = {}) => {
        if (!routerId) {
            return null;
        }

        const cached = peekRouterPackageProfiles(routerId, 'form')?.form_options
            ?? routerOsCache[routerId]?.form_options;
        if (!force && cached) {
            return routerOsCache[routerId] ?? peekRouterPackageProfiles(routerId, 'form');
        }

        setIsLoadingFormOptions(true);

        try {
            return await loadRouterOsData(routerId, { force, scope: 'form' });
        } finally {
            setIsLoadingFormOptions(false);
        }
    };

    const refreshRouterOsData = async (routerId) => {
        if (!routerId) {
            return null;
        }

        clearRouterPackageProfilesCache(routerId);
        setRouterOsCache((prev) => ({
            ...prev,
            [routerId]: {
                ...(prev[routerId] || {}),
                form_options: null,
            },
        }));

        setIsLoadingRouterProfiles(true);
        setRouterProfileError(null);

        try {
            return await loadRouterOsData(routerId, { force: true, scope: 'list' });
        } catch (error) {
            setRouterProfileError(error?.message || 'Gagal memuat profil dari router.');
            return null;
        } finally {
            setIsLoadingRouterProfiles(false);
        }
    };

    const handleSavePackage = (e) => {
        e.preventDefault();
        const payload = {
            id: editingPackage ? editingPackage.id : '',
            type: selectedPackageType,
            router_id: routerFilter,
            ...packageForm,
        };

        router.post('/admin/packages/save', payload, {
            onSuccess: (page) => {
                const flash = page.props.flash || {};
                if (flash.success) {
                    showToast(flash.success, 'success');
                } else if (flash.warning) {
                    showToast(flash.warning, 'warning');
                }

                setShowPackageModal(false);
                setEditingPackage(null);
                setPackageForm(emptyPackageForm);
                refreshRouterOsData(routerFilter);
            },
            onError: (errors) => {
                const messages = Object.values(errors).flat().filter(Boolean);
                showToast(messages[0] || 'Gagal menyimpan paket layanan.', 'error');
            },
        });
    };

    const handleDeletePackage = (packageId, { dbOnly = false } = {}) => {
        if (!routerFilter) {
            alert('Pilih router Mikrotik di halaman utama terlebih dahulu.');
            return;
        }

        const message = dbOnly
            ? 'Hapus paket ini hanya dari database aplikasi? Profil di MikroTik tidak akan diubah.'
            : 'Apakah Anda yakin ingin menghapus paket layanan ini? Profil akan dihapus dari RouterOS jika tidak dipakai paket lain.';

        if (!confirm(message)) return;

        router.post('/admin/packages/delete', { id: packageId, router_id: routerFilter, db_only: dbOnly ? 1 : 0 }, {
            onSuccess: (page) => {
                const flash = page.props.flash || {};
                if (flash.success) {
                    showToast(flash.success, 'success');
                } else if (flash.error) {
                    showToast(flash.error, 'error');
                } else if (flash.warning) {
                    showToast(flash.warning, 'warning');
                }
                refreshRouterOsData(routerFilter);
            },
            onError: () => {
                showToast('Gagal menghapus paket layanan.', 'error');
            },
        });
    };

    useEffect(() => {
        if (!routerFilter) {
            setRouterProfileError(null);
            return;
        }

        let cancelled = false;
        setIsLoadingRouterProfiles(true);
        setRouterProfileError(null);

        const controller = new AbortController();

        loadRouterOsData(routerFilter, { signal: controller.signal })
            .catch((error) => {
                if (cancelled || error?.name === 'AbortError') return;
                setRouterProfileError(error?.message || 'Gagal memuat profil dari router.');
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingRouterProfiles(false);
                }
            });

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [routerFilter]);

    useEffect(() => {
        if (!showPackageModal) {
            return;
        }

        if (editingPackage) {
            setSelectedPackageType(editingPackage.type || 'pppoe');
            setPackageForm({
                name: editingPackage.name || '',
                price: editingPackage.price ?? '',
                bandwidth_limit: editingPackage.bandwidth_limit || '',
                local_address: editingPackage.local_address || '',
                remote_address: editingPackage.remote_address || '',
                dns_server: editingPackage.dns_server || '',
                parent_queue: editingPackage.parent_queue || '',
                queue_type_rx: editingPackage.queue_type_rx || '',
                queue_type_tx: editingPackage.queue_type_tx || '',
                only_one: editingPackage.only_one !== false && editingPackage.only_one !== 0,
                validity: editingPackage.validity || '',
                description: editingPackage.description || '',
            });
        } else {
            setSelectedPackageType('pppoe');
            setPackageForm(emptyPackageForm);
        }
    }, [showPackageModal, editingPackage]);

    const filterRouterOs = routerFilter ? routerOsCache[routerFilter] : null;
    const routerProfiles = filterRouterOs?.all_profiles || [];

    const numericRouterProfiles = useMemo(
        () => routerProfiles.filter((name) => profileHasNumericPrefix(name)),
        [routerProfiles],
    );

    const profileSet = useMemo(
        () => new Set(numericRouterProfiles.map((name) => String(name).toLowerCase())),
        [numericRouterProfiles],
    );

    const filteredPackages = useMemo(() => {
        const sorted = [...packages]
            .filter(packageHasNumericPrefix)
            .sort((a, b) => String(a.name).localeCompare(String(b.name), 'id'));

        if (!routerFilter) {
            return dedupePackagesByMikrotikProfile(sorted);
        }

        if (isLoadingRouterProfiles) {
            return [];
        }

        if (routerProfileError || profileSet.size === 0) {
            return [];
        }

        const matched = sorted.filter((pkg) => profileSet.has(String(pkg.mikrotik_profile || '').toLowerCase()));

        return dedupePackagesByMikrotikProfile(matched);
    }, [packages, routerFilter, isLoadingRouterProfiles, routerProfileError, profileSet]);

    const duplicatePackages = useMemo(
        () => listDuplicatePackages(packages.filter(packageHasNumericPrefix)),
        [packages],
    );

    const duplicatePackageCount = duplicatePackages.length;

    const selectedRouter = routers.find((r) => String(r.id) === String(routerFilter));
    const modalFormOptions = filterRouterOs?.form_options || null;

    const updatePackageForm = (field, value) => {
        setPackageForm((prev) => ({ ...prev, [field]: value }));
    };

    const validityOptions = useMemo(() => {
        const fromPackages = packages
            .filter((pkg) => pkg.type === 'hotspot' && pkg.validity)
            .map((pkg) => pkg.validity);
        return [...new Set([...HOTSPOT_VALIDITY_PRESETS, ...fromPackages])];
    }, [packages]);

    const openAddModal = async () => {
        if (!routerFilter) {
            alert('Pilih router Mikrotik di halaman utama terlebih dahulu.');
            return;
        }
        setEditingPackage(null);
        setShowPackageModal(true);
        try {
            await ensureFormOptions(routerFilter);
        } catch (error) {
            showToast(error?.message || 'Gagal memuat opsi form RouterOS.', 'error');
        }
    };

    const openEditModal = async (pkg) => {
        if (!routerFilter) {
            alert('Pilih router Mikrotik di halaman utama terlebih dahulu.');
            return;
        }
        setEditingPackage(pkg);
        setShowPackageModal(true);
        try {
            await ensureFormOptions(routerFilter);
        } catch (error) {
            showToast(error?.message || 'Gagal memuat opsi form RouterOS.', 'error');
        }
    };

    const handleSyncPackages = () => {
        if (!routerFilter) {
            alert('Pilih router Mikrotik terlebih dahulu.');
            return;
        }

        const routerName = selectedRouter?.name || 'router ini';
        const confirmed = confirm(
            `Sinkronkan paket dari ${routerName}?\n\n`
            + '• Profil PPPoE & Hotspot di RouterOS akan diimpor/diperbarui ke database.\n'
            + '• Paket di database yang tidak ada di router ini akan dihapus (kecuali masih dipakai pelanggan).\n'
            + '• Harga paket yang sudah ada tidak diubah otomatis.',
        );

        if (!confirmed) {
            return;
        }

        setIsSyncingPackages(true);

        router.post('/admin/packages/sync-from-router', { router_id: routerFilter }, {
            onSuccess: (page) => {
                const flash = page.props.flash || {};
                if (flash.success) {
                    showToast(flash.success, 'success');
                } else if (flash.error) {
                    showToast(flash.error, 'error');
                }
                clearRouterPackageProfilesCache(routerFilter);
                refreshRouterOsData(routerFilter);
            },
            onError: () => {
                showToast('Gagal sinkron paket dari router.', 'error');
            },
            onFinish: () => {
                setIsSyncingPackages(false);
            },
        });
    };

    return (
        <>
            <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3 gap-3`}>
                    <div className="flex items-center gap-2 min-w-0">
                        <Layers className="w-5 h-5 text-emerald-500 shrink-0" />
                        <h2 className={`text-sm font-bold truncate ${themeTextTitle}`}>Paket Layanan Internet</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end">
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
                            onClick={handleSyncPackages}
                            disabled={!routerFilter || isSyncingPackages}
                            title="Sinkronkan paket dari RouterOS"
                            className="p-2 border rounded-xl cursor-pointer inline-flex items-center justify-center disabled:opacity-50 border-sky-300/60 text-sky-600 hover:bg-sky-50 dark:border-sky-500/30 dark:text-sky-300 dark:hover:bg-sky-500/10"
                        >
                            <RefreshCw className={`w-4 h-4 ${isSyncingPackages ? 'animate-spin' : ''}`} />
                        </button>
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
                                {' '}({numericRouterProfiles.length} profil RouterOS berawalan angka)
                                {duplicatePackageCount > 0 && (
                                    <span className="block mt-1 text-amber-500">
                                        {duplicatePackageCount} paket duplikat di database — hapus dari daftar di bawah.
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                )}

                {duplicatePackageCount > 0 && (
                    <div className={`rounded-xl border p-3 space-y-2 ${isDarkMode ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-200 bg-amber-50/80'}`}>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                            Paket duplikat (profil MikroTik sama)
                        </p>
                        <p className={`text-[10px] leading-relaxed ${themeTextSub}`}>
                            Sistem menyimpan satu paket aktif per profil. Hapus entri lama yang tidak dipakai agar tidak bentrok saat simpan/edit.
                        </p>
                        <ul className="space-y-2">
                            {duplicatePackages.map((pkg) => (
                                <li
                                    key={pkg.id}
                                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border px-3 py-2 ${isDarkMode ? 'border-amber-500/20 bg-zinc-950/30' : 'border-amber-100 bg-white/80'}`}
                                >
                                    <div className="min-w-0">
                                        <p className={`text-xs font-bold truncate ${themeTextTitle}`}>{pkg.name}</p>
                                        <p className={`text-[10px] font-mono truncate ${themeTextSub}`}>
                                            Profil: {pkg.mikrotik_profile || pkg.name} · ID #{pkg.id}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeletePackage(pkg.id)}
                                        className="self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-rose-600 border border-rose-300/60 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10 cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Hapus duplikat
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="admin-table-scroll">
                    <table>
                        <thead>
                            <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                <th className="py-3 px-2">Nama Paket</th>
                                <th className="py-3 px-2">Jenis</th>
                                <th className="py-3 px-2">Masa Aktif</th>
                                <th className="py-3 px-2">Harga</th>
                                <th className="py-3 px-2">Speed Limit</th>
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
                                    <td colSpan={11} className={`py-8 text-center ${themeTextDesc}`}>
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
                                    <td className="py-3 px-2 text-right">
                                        <div className="admin-table-actions">
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
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <TransitionModal show={showPackageModal} onClose={() => setShowPackageModal(false)} themeCard={themeCard} maxWidth="md">
                <div className={`flex items-start justify-between gap-3 pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                        {editingPackage ? 'Edit Paket Layanan' : 'Tambah Paket Layanan'}
                    </h3>
                    <button type="button" onClick={() => setShowPackageModal(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSavePackage} className="space-y-3 text-xs">
                    {routerFilter && (
                        <div className={`text-[10px] font-semibold ${routerProfileError ? 'text-amber-500' : themeTextSub}`}>
                            Router: <span className={themeTextTitle}>{selectedRouter?.name || '—'}</span>
                            {isLoadingRouterProfiles && (
                                <span className="inline-flex items-center gap-1 ml-2">
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    Memuat opsi RouterOS...
                                </span>
                            )}
                            {isLoadingFormOptions && !isLoadingRouterProfiles && (
                                <span className="inline-flex items-center gap-1 ml-2">
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    Memuat opsi form...
                                </span>
                            )}
                            {routerProfileError && (
                                <span className="block mt-1">{routerProfileError}</span>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            <RouterOsField
                                label="Masa Aktif"
                                name="validity"
                                value={packageForm.validity}
                                onChange={(value) => updatePackageForm('validity', value)}
                                options={validityOptions}
                                placeholder="e.g. 2h, 1d, 30d"
                                required
                                themeInput={themeInput}
                                themeLabel={themeLabel}
                                allowEmpty={false}
                            />
                        ) : (
                            <div className="flex flex-col gap-1">
                                <label className={`font-bold ${themeLabel}`}>Masa Aktif</label>
                                <input disabled placeholder="N/A (Khusus Hotspot)" className={`p-2 border rounded-lg opacity-50 ${isDarkMode ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'bg-zinc-100 text-zinc-400 border-zinc-200'}`} />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Nama Paket</label>
                        <input
                            required
                            name="name"
                            type="text"
                            value={packageForm.name}
                            onChange={(e) => updatePackageForm('name', e.target.value)}
                            className={`p-2 border rounded-lg ${themeInput}`}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Harga (Rp)</label>
                        <input
                            required
                            name="price"
                            type="number"
                            value={packageForm.price}
                            onChange={(e) => updatePackageForm('price', e.target.value)}
                            className={`p-2 border rounded-lg font-mono ${themeInput}`}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Batas Kecepatan (Speed Limit)</label>
                        <input
                            required
                            name="bandwidth_limit"
                            type="text"
                            value={packageForm.bandwidth_limit}
                            onChange={(e) => updatePackageForm('bandwidth_limit', e.target.value)}
                            placeholder="e.g. 20M/20M"
                            className={`p-2 border rounded-lg font-mono ${themeInput}`}
                        />
                    </div>
                    {selectedPackageType === 'pppoe' && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>Local Address</label>
                                    <input
                                        name="local_address"
                                        type="text"
                                        value={packageForm.local_address}
                                        onChange={(e) => updatePackageForm('local_address', e.target.value)}
                                        placeholder="e.g. 192.168.22.1"
                                        className={`p-2 border rounded-lg font-mono ${themeInput}`}
                                    />
                                </div>
                                <RouterOsField
                                    label="Remote Address"
                                    name="remote_address"
                                    value={packageForm.remote_address}
                                    onChange={(value) => updatePackageForm('remote_address', value)}
                                    options={modalFormOptions?.ip_pool_names || []}
                                    placeholder="e.g. pool_ppp"
                                    themeInput={themeInput}
                                    themeLabel={themeLabel}
                                    disabled={isLoadingRouterProfiles || isLoadingFormOptions}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>DNS Server</label>
                                    <input
                                        name="dns_server"
                                        type="text"
                                        value={packageForm.dns_server}
                                        onChange={(e) => updatePackageForm('dns_server', e.target.value)}
                                        placeholder="e.g. 8.8.8.8, 8.8.4.4"
                                        className={`p-2 border rounded-lg font-mono ${themeInput}`}
                                    />
                                </div>
                                <RouterOsField
                                    label="Parent Queue"
                                    name="parent_queue"
                                    value={packageForm.parent_queue}
                                    onChange={(value) => updatePackageForm('parent_queue', value)}
                                    options={modalFormOptions?.parent_queues || []}
                                    placeholder="e.g. GLOBAL CONN"
                                    themeInput={themeInput}
                                    themeLabel={themeLabel}
                                    disabled={isLoadingRouterProfiles || isLoadingFormOptions}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <RouterOsField
                                    label="Queue Type Rx"
                                    name="queue_type_rx"
                                    value={packageForm.queue_type_rx}
                                    onChange={(value) => updatePackageForm('queue_type_rx', value)}
                                    options={modalFormOptions?.queue_types || []}
                                    placeholder="e.g. fq-codel"
                                    themeInput={themeInput}
                                    themeLabel={themeLabel}
                                    disabled={isLoadingRouterProfiles || isLoadingFormOptions}
                                />
                                <RouterOsField
                                    label="Queue Type Tx"
                                    name="queue_type_tx"
                                    value={packageForm.queue_type_tx}
                                    onChange={(value) => updatePackageForm('queue_type_tx', value)}
                                    options={modalFormOptions?.queue_types || []}
                                    placeholder="e.g. fq-codel"
                                    themeInput={themeInput}
                                    themeLabel={themeLabel}
                                    disabled={isLoadingRouterProfiles || isLoadingFormOptions}
                                />
                            </div>
                            <div className={`flex flex-col gap-1 p-2.5 rounded-lg border ${isDarkMode ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50'}`}>
                                <label className="inline-flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="only_one"
                                        checked={Boolean(packageForm.only_one)}
                                        onChange={(e) => updatePackageForm('only_one', e.target.checked)}
                                        className="rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500"
                                    />
                                    <span className={`font-bold ${themeLabel}`}>Only One</span>
                                </label>
                                <p className={`text-[10px] leading-relaxed ${themeTextSub}`}>
                                    Batasi setiap pengguna PPPoE hanya satu sesi aktif pada saat yang sama (setara opsi Only One di RouterOS).
                                </p>
                            </div>
                        </>
                    )}
                    {selectedPackageType === 'hotspot' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <RouterOsField
                                label="Address Pool"
                                name="remote_address"
                                value={packageForm.remote_address}
                                onChange={(value) => updatePackageForm('remote_address', value)}
                                options={modalFormOptions?.ip_pool_names || []}
                                placeholder="e.g. pool_hotspot"
                                themeInput={themeInput}
                                themeLabel={themeLabel}
                                disabled={isLoadingRouterProfiles}
                            />
                            <RouterOsField
                                label="Parent Queue"
                                name="parent_queue"
                                value={packageForm.parent_queue}
                                onChange={(value) => updatePackageForm('parent_queue', value)}
                                options={modalFormOptions?.parent_queues || []}
                                placeholder="e.g. GLOBAL CONN"
                                themeInput={themeInput}
                                themeLabel={themeLabel}
                                disabled={isLoadingRouterProfiles}
                            />
                        </div>
                    )}
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Deskripsi Paket</label>
                        <textarea
                            name="description"
                            rows={2}
                            value={packageForm.description}
                            onChange={(e) => updatePackageForm('description', e.target.value)}
                            className={`p-2 border rounded-lg ${themeInput}`}
                        />
                    </div>
                    <div className={`sticky bottom-0 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mt-1 flex justify-end gap-2 border-t ${isDarkMode ? 'border-zinc-800/40 bg-zinc-900/95' : 'border-zinc-200 bg-white/95'} backdrop-blur-sm`}>
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
