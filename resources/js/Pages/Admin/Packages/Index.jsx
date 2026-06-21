import { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { Edit, Layers, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import AdminLayout from '../../../Layouts/AdminLayout';
import TransitionModal from '../../../Components/Admin/TransitionModal';
import { useAdminFormTheme } from '../../../hooks/useAdminFormTheme';
import { formatRupiah } from '../../../utils/formatRupiah';

const HOTSPOT_VALIDITY_PRESETS = ['1h', '2h', '6h', '12h', '1d', '7d', '30d'];

const emptyPackageForm = {
    name: '',
    price: '',
    bandwidth_limit: '',
    mikrotik_profile: '',
    local_address: '',
    remote_address: '',
    dns_server: '',
    parent_queue: '',
    queue_type_rx: '',
    queue_type_tx: '',
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
    const [routerProfileError, setRouterProfileError] = useState(null);
    const [modalRouterId, setModalRouterId] = useState('');
    const [isLoadingModalOptions, setIsLoadingModalOptions] = useState(false);
    const [modalOptionsError, setModalOptionsError] = useState(null);
    const [packageForm, setPackageForm] = useState(emptyPackageForm);

    const loadRouterOsData = async (routerId) => {
        if (!routerId) {
            return null;
        }

        if (routerOsCache[routerId]) {
            return routerOsCache[routerId];
        }

        const res = await fetch(`/admin/packages/router-profiles?router_id=${routerId}`, {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || 'Gagal memuat data RouterOS.');
        }

        setRouterOsCache((prev) => ({ ...prev, [routerId]: data }));
        return data;
    };

    const handleSavePackage = (e) => {
        e.preventDefault();
        const payload = {
            id: editingPackage ? editingPackage.id : '',
            type: selectedPackageType,
            ...packageForm,
        };

        router.post('/admin/packages/save', payload, {
            onSuccess: () => {
                setShowPackageModal(false);
                setEditingPackage(null);
                setPackageForm(emptyPackageForm);
            },
        });
    };

    const handleDeletePackage = (packageId) => {
        if (!confirm('Apakah Anda yakin ingin menghapus paket layanan ini?')) return;

        router.post('/admin/packages/delete', { id: packageId });
    };

    useEffect(() => {
        if (!routerFilter) {
            setRouterProfileError(null);
            return;
        }

        let cancelled = false;
        setIsLoadingRouterProfiles(true);
        setRouterProfileError(null);

        loadRouterOsData(routerFilter)
            .catch((error) => {
                if (cancelled) return;
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

    useEffect(() => {
        if (!showPackageModal) {
            return;
        }

        const initialRouterId = routerFilter || defaultRouterId;
        setModalRouterId(initialRouterId);
        setModalOptionsError(null);

        if (editingPackage) {
            setSelectedPackageType(editingPackage.type || 'pppoe');
            setPackageForm({
                name: editingPackage.name || '',
                price: editingPackage.price ?? '',
                bandwidth_limit: editingPackage.bandwidth_limit || '',
                mikrotik_profile: editingPackage.mikrotik_profile || '',
                local_address: editingPackage.local_address || '',
                remote_address: editingPackage.remote_address || '',
                dns_server: editingPackage.dns_server || '',
                parent_queue: editingPackage.parent_queue || '',
                queue_type_rx: editingPackage.queue_type_rx || '',
                queue_type_tx: editingPackage.queue_type_tx || '',
                validity: editingPackage.validity || '',
                description: editingPackage.description || '',
            });
        } else {
            setSelectedPackageType('pppoe');
            setPackageForm(emptyPackageForm);
        }
    }, [showPackageModal, editingPackage, routerFilter, defaultRouterId]);

    useEffect(() => {
        if (!showPackageModal || !modalRouterId) {
            return;
        }

        let cancelled = false;
        setIsLoadingModalOptions(true);
        setModalOptionsError(null);

        loadRouterOsData(modalRouterId)
            .catch((error) => {
                if (cancelled) return;
                setModalOptionsError(error?.message || 'Gagal memuat opsi RouterOS.');
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingModalOptions(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [showPackageModal, modalRouterId]);

    const filterRouterOs = routerFilter ? routerOsCache[routerFilter] : null;
    const routerProfiles = filterRouterOs?.all_profiles || [];

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
    const modalRouterOs = modalRouterId ? routerOsCache[modalRouterId] : null;
    const modalFormOptions = modalRouterOs?.form_options || null;

    const profileNameOptions = selectedPackageType === 'hotspot'
        ? (modalFormOptions?.hotspot_profile_names || [])
        : (modalFormOptions?.ppp_profile_names || []);

    const updatePackageForm = (field, value) => {
        setPackageForm((prev) => ({ ...prev, [field]: value }));
    };

    const applyProfileDefaults = (profileName) => {
        if (!profileName || !modalFormOptions) {
            updatePackageForm('mikrotik_profile', profileName);
            return;
        }

        const details = selectedPackageType === 'hotspot'
            ? modalFormOptions.hotspot_profile_details?.[profileName]
            : modalFormOptions.ppp_profile_details?.[profileName];

        setPackageForm((prev) => ({
            ...prev,
            mikrotik_profile: profileName,
            bandwidth_limit: details?.bandwidth_limit || prev.bandwidth_limit,
            local_address: details?.local_address || prev.local_address,
            remote_address: details?.remote_address || prev.remote_address,
            dns_server: details?.dns_server || prev.dns_server,
            parent_queue: details?.parent_queue || prev.parent_queue,
            queue_type_rx: details?.queue_type_rx || prev.queue_type_rx,
            queue_type_tx: details?.queue_type_tx || prev.queue_type_tx,
        }));
    };

    const validityOptions = useMemo(() => {
        const fromPackages = packages
            .filter((pkg) => pkg.type === 'hotspot' && pkg.validity)
            .map((pkg) => pkg.validity);
        return [...new Set([...HOTSPOT_VALIDITY_PRESETS, ...fromPackages])];
    }, [packages]);

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
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Router Mikrotik</label>
                        <select
                            value={modalRouterId}
                            onChange={(e) => setModalRouterId(e.target.value)}
                            className={`p-2 border rounded-lg ${themeInput}`}
                        >
                            <option value="">— Pilih router —</option>
                            {routers.map((r) => (
                                <option key={r.id} value={r.id}>
                                    {r.name}{r.status ? '' : ' (nonaktif)'}
                                </option>
                            ))}
                        </select>
                        {isLoadingModalOptions && (
                            <span className={`text-[10px] inline-flex items-center gap-1 ${themeTextSub}`}>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Memuat opsi dari RouterOS...
                            </span>
                        )}
                        {modalOptionsError && (
                            <span className="text-[10px] text-amber-500">{modalOptionsError}</span>
                        )}
                    </div>

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
                    <RouterOsField
                        label="Batas Kecepatan (Speed Limit)"
                        name="bandwidth_limit"
                        value={packageForm.bandwidth_limit}
                        onChange={(value) => updatePackageForm('bandwidth_limit', value)}
                        options={modalFormOptions?.bandwidth_limits || []}
                        placeholder="e.g. 20M/20M"
                        required
                        themeInput={themeInput}
                        themeLabel={themeLabel}
                        allowEmpty={false}
                    />
                    <RouterOsField
                        label="Nama Profile Mikrotik"
                        name="mikrotik_profile"
                        value={packageForm.mikrotik_profile}
                        onChange={applyProfileDefaults}
                        options={profileNameOptions}
                        placeholder="e.g. Family-20M"
                        required
                        themeInput={themeInput}
                        themeLabel={themeLabel}
                        allowEmpty={false}
                    />
                    {selectedPackageType === 'pppoe' && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <RouterOsField
                                    label="Local Address"
                                    name="local_address"
                                    value={packageForm.local_address}
                                    onChange={(value) => updatePackageForm('local_address', value)}
                                    options={modalFormOptions?.local_addresses || []}
                                    placeholder="e.g. 192.168.22.1"
                                    themeInput={themeInput}
                                    themeLabel={themeLabel}
                                />
                                <RouterOsField
                                    label="Remote Address"
                                    name="remote_address"
                                    value={packageForm.remote_address}
                                    onChange={(value) => updatePackageForm('remote_address', value)}
                                    options={modalFormOptions?.remote_addresses || modalFormOptions?.ip_pool_names || []}
                                    placeholder="e.g. pool_ppp"
                                    themeInput={themeInput}
                                    themeLabel={themeLabel}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <RouterOsField
                                    label="DNS Server"
                                    name="dns_server"
                                    value={packageForm.dns_server}
                                    onChange={(value) => updatePackageForm('dns_server', value)}
                                    options={modalFormOptions?.dns_servers || []}
                                    placeholder="e.g. 8.8.8.8, 8.8.4.4"
                                    themeInput={themeInput}
                                    themeLabel={themeLabel}
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
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <RouterOsField
                                    label="Queue Type Rx"
                                    name="queue_type_rx"
                                    value={packageForm.queue_type_rx}
                                    onChange={(value) => updatePackageForm('queue_type_rx', value)}
                                    options={modalFormOptions?.queue_types || []}
                                    placeholder="e.g. my-cake"
                                    themeInput={themeInput}
                                    themeLabel={themeLabel}
                                />
                                <RouterOsField
                                    label="Queue Type Tx"
                                    name="queue_type_tx"
                                    value={packageForm.queue_type_tx}
                                    onChange={(value) => updatePackageForm('queue_type_tx', value)}
                                    options={modalFormOptions?.queue_types || []}
                                    placeholder="e.g. my-cake"
                                    themeInput={themeInput}
                                    themeLabel={themeLabel}
                                />
                            </div>
                        </>
                    )}
                    {selectedPackageType === 'hotspot' && (
                        <div className="grid grid-cols-2 gap-3">
                            <RouterOsField
                                label="Address Pool"
                                name="remote_address"
                                value={packageForm.remote_address}
                                onChange={(value) => updatePackageForm('remote_address', value)}
                                options={modalFormOptions?.ip_pool_names || modalFormOptions?.remote_addresses || []}
                                placeholder="e.g. pool_hotspot"
                                themeInput={themeInput}
                                themeLabel={themeLabel}
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
