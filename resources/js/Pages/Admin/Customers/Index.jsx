import { Fragment, useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronUp, Edit, Eye, Plus, Save, Search, Trash2, Users, X } from 'lucide-react';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import TransitionModal from '../../../Components/Admin/TransitionModal';
import CustomerDetailPanel from '../../../Components/Admin/CustomerDetailPanel';
import GpsCoordinateFields from '../../../Components/GpsCoordinateFields';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';

const PAGE_SIZE = 10;

function CustomersPageContent({
    customers = [],
    routers = [],
    packages = [],
    odps = [],
}) {
    const theme = useAdminTheme();
    const { showToast } = useAdminToast();
    const { branding = {} } = usePage().props;

    const {
        isDarkMode,
        themeCard,
        themeTextTitle,
        themeTextSub,
        themeTextDesc,
    } = theme;

    const themeInnerWidget = isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';
    const themeInput = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700'
        : 'bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300';
    const themeLabel = isDarkMode ? 'text-zinc-400' : 'text-zinc-650';

    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name_asc');
    const [customerPage, setCustomerPage] = useState(1);
    const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [bulkDeleteMode, setBulkDeleteMode] = useState('local_only');
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [customerLat, setCustomerLat] = useState('');
    const [customerLng, setCustomerLng] = useState('');
    const [showDeleteCustomerModal, setShowDeleteCustomerModal] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [deleteMode, setDeleteMode] = useState('local_only');
    const [expandedCustomerId, setExpandedCustomerId] = useState(null);

    const pppoePackages = packages.filter((p) => p.type === 'pppoe');

    const sortOptions = [
        { value: 'name_asc', label: 'Nama (A → Z)' },
        { value: 'name_desc', label: 'Nama (Z → A)' },
        { value: 'username_asc', label: 'Username (A → Z)' },
        { value: 'username_desc', label: 'Username (Z → A)' },
        { value: 'phone_asc', label: 'Telepon (A → Z)' },
        { value: 'phone_desc', label: 'Telepon (Z → A)' },
        { value: 'router_asc', label: 'Router (A → Z)' },
        { value: 'router_desc', label: 'Router (Z → A)' },
        { value: 'package_asc', label: 'Paket (A → Z)' },
        { value: 'package_desc', label: 'Paket (Z → A)' },
        { value: 'odp_asc', label: 'ODP (A → Z)' },
        { value: 'odp_desc', label: 'ODP (Z → A)' },
        { value: 'billing_date_asc', label: 'Tgl Tagih (kecil → besar)' },
        { value: 'billing_date_desc', label: 'Tgl Tagih (besar → kecil)' },
        { value: 'status_asc', label: 'Status (A → Z)' },
        { value: 'status_desc', label: 'Status (Z → A)' },
    ];

    useEffect(() => {
        setCustomerPage(1);
    }, [searchTerm, sortBy]);

    useEffect(() => {
        if (showCustomerModal) {
            setCustomerLat(
                editingCustomer?.latitude != null && editingCustomer?.latitude !== ''
                    ? String(editingCustomer.latitude)
                    : ''
            );
            setCustomerLng(
                editingCustomer?.longitude != null && editingCustomer?.longitude !== ''
                    ? String(editingCustomer.longitude)
                    : ''
            );
        }
    }, [showCustomerModal, editingCustomer]);

    const isPppoeCustomer = (cust) => cust?.service_type !== 'hotspot';

    const filteredCustomers = customers.filter((cust) => {
        if (!isPppoeCustomer(cust)) return false;
        const term = searchTerm.toLowerCase();
        return (
            cust.name.toLowerCase().includes(term) ||
            cust.username.toLowerCase().includes(term) ||
            (cust.phone_number && cust.phone_number.toLowerCase().includes(term)) ||
            (cust.router && cust.router.name.toLowerCase().includes(term)) ||
            (cust.package && cust.package.name.toLowerCase().includes(term))
        );
    });

    const getCustomerSortValue = (cust, field) => {
        switch (field) {
            case 'name':
                return cust.name || '';
            case 'username':
                return cust.username || '';
            case 'phone':
                return cust.phone_number || '';
            case 'router':
                return cust.router?.name || '';
            case 'package':
                return cust.package?.name || '';
            case 'odp':
                return cust.odp?.name || '';
            case 'billing_date':
                return Number(cust.billing_date) || 0;
            case 'status':
                return cust.status || '';
            default:
                return '';
        }
    };

    const sortedCustomers = [...filteredCustomers].sort((a, b) => {
        const separator = sortBy.lastIndexOf('_');
        const field = sortBy.slice(0, separator);
        const direction = sortBy.slice(separator + 1);

        const aVal = getCustomerSortValue(a, field);
        const bVal = getCustomerSortValue(b, field);

        if (field === 'billing_date') {
            return direction === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const compared = String(aVal).localeCompare(String(bVal), 'id', { sensitivity: 'base' });
        return direction === 'asc' ? compared : -compared;
    });

    const totalCustomerPages = Math.ceil(sortedCustomers.length / PAGE_SIZE) || 1;
    const paginatedCustomers = sortedCustomers.slice(
        (customerPage - 1) * PAGE_SIZE,
        customerPage * PAGE_SIZE
    );

    const openCustomerModal = (customer = null) => {
        setEditingCustomer(customer);
        setShowCustomerModal(true);
    };

    const toggleCustomerDetail = (customerId) => {
        setExpandedCustomerId((current) => (current === customerId ? null : customerId));
    };

    const handleSaveCustomer = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const payload = Object.fromEntries(data.entries());

        router.post('/admin/customers/save', payload, {
            onSuccess: () => {
                setShowCustomerModal(false);
                setEditingCustomer(null);
            },
        });
    };

    const handleDeleteCustomer = (cust) => {
        setCustomerToDelete(cust);
        setDeleteMode('local_only');
        setShowDeleteCustomerModal(true);
    };

    const confirmDeleteCustomer = () => {
        if (!customerToDelete) return;
        router.post('/admin/customers/delete', {
            id: customerToDelete.id,
            mode: deleteMode,
        }, {
            onSuccess: () => {
                setShowDeleteCustomerModal(false);
                setTimeout(() => setCustomerToDelete(null), 300);
            },
        });
    };

    const toggleSelectAllCustomers = () => {
        if (selectedCustomerIds.length === sortedCustomers.length) {
            setSelectedCustomerIds([]);
        } else {
            setSelectedCustomerIds(sortedCustomers.map((c) => c.id));
        }
    };

    const toggleSelectCustomer = (id) => {
        setSelectedCustomerIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const confirmBulkDeleteCustomer = () => {
        if (selectedCustomerIds.length === 0) return;
        router.post('/admin/customers/bulk-delete', {
            ids: selectedCustomerIds,
            mode: bulkDeleteMode,
        }, {
            onSuccess: () => {
                setShowBulkDeleteModal(false);
                setTimeout(() => setSelectedCustomerIds([]), 300);
            },
        });
    };

    return (
        <>
            <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3 gap-3`}>
                    <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-emerald-500" />
                        <h2 className={`text-sm font-bold ${themeTextTitle}`}>Manajemen Pelanggan PPPoE</h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                        {selectedCustomerIds.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setBulkDeleteMode('local_only');
                                    setShowBulkDeleteModal(true);
                                }}
                                title={`Hapus Terpilih (${selectedCustomerIds.length})`}
                                className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center animate-pulse"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => openCustomerModal()}
                            title="Tambah Pelanggan PPPoE"
                            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${themeTextDesc}`} />
                        <input
                            type="text"
                            placeholder="Cari nama, username, telepon, router, paket..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                        />
                    </div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={`sm:w-56 shrink-0 px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                    >
                        {sortOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                Urut: {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                <th className="py-3 px-2 w-8" />
                                <th className="py-3 px-2 w-8">
                                    <input
                                        type="checkbox"
                                        checked={sortedCustomers.length > 0 && selectedCustomerIds.length === sortedCustomers.length}
                                        onChange={toggleSelectAllCustomers}
                                        className={`rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                                    />
                                </th>
                                <th className="py-3 px-2">Nama</th>
                                <th className="py-3 px-2">Username</th>
                                <th className="py-3 px-2">Telepon</th>
                                <th className="py-3 px-2">Router</th>
                                <th className="py-3 px-2">Paket</th>
                                <th className="py-3 px-2">ODP</th>
                                <th className="py-3 px-2">Tgl Tagih</th>
                                <th className="py-3 px-2">Status</th>
                                <th className="py-3 px-2 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/20 text-xs">
                            {paginatedCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className={`py-8 text-center ${themeTextDesc}`}>
                                        {searchTerm.trim()
                                            ? 'Tidak ada pelanggan PPPoE yang cocok dengan pencarian.'
                                            : 'Belum ada pelanggan PPPoE terdaftar.'}
                                    </td>
                                </tr>
                            ) : paginatedCustomers.map((cust) => (
                                <Fragment key={cust.id}>
                                    <tr
                                        className={`${themeTextSub} hover:bg-zinc-900/10 ${selectedCustomerIds.includes(cust.id) ? 'bg-emerald-500/5' : ''} ${expandedCustomerId === cust.id ? (isDarkMode ? 'bg-zinc-900/20' : 'bg-zinc-50') : ''}`}
                                    >
                                        <td className="py-3 px-2 w-8">
                                            <button
                                                type="button"
                                                onClick={() => toggleCustomerDetail(cust.id)}
                                                className={`p-1 rounded-md border transition-colors cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                                                title={expandedCustomerId === cust.id ? 'Tutup detail' : 'Lihat detail lengkap'}
                                            >
                                                {expandedCustomerId === cust.id
                                                    ? <ChevronUp className="w-3.5 h-3.5" />
                                                    : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button>
                                        </td>
                                        <td className="py-3 px-2 w-8">
                                            <input
                                                type="checkbox"
                                                checked={selectedCustomerIds.includes(cust.id)}
                                                onChange={() => toggleSelectCustomer(cust.id)}
                                                className={`rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                                            />
                                        </td>
                                        <td className={`py-3 px-2 font-bold ${themeTextTitle}`}>
                                            <button
                                                type="button"
                                                onClick={() => toggleCustomerDetail(cust.id)}
                                                className="text-left hover:underline cursor-pointer"
                                            >
                                                {cust.name}
                                            </button>
                                        </td>
                                        <td className="py-3 px-2 font-mono">{cust.username}</td>
                                        <td className="py-3 px-2 font-mono text-[10px]">{cust.phone_number || '—'}</td>
                                        <td className="py-3 px-2">{cust.router ? cust.router.name : '—'}</td>
                                        <td className="py-3 px-2">{cust.package ? cust.package.name : '—'}</td>
                                        <td className="py-3 px-2 font-mono text-[10px]">{cust.odp ? cust.odp.name : '—'}</td>
                                        <td className="py-3 px-2">Tgl {cust.billing_date}</td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                cust.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                cust.status === 'isolated' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                            }`}>
                                                {cust.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-right space-x-1">
                                            <button
                                                type="button"
                                                onClick={() => toggleCustomerDetail(cust.id)}
                                                className={`inline-block p-1 cursor-pointer transition-colors ${expandedCustomerId === cust.id ? 'text-sky-400' : 'text-sky-500 hover:text-sky-400'}`}
                                                title="Detail lengkap"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => openCustomerModal(cust)}
                                                className="inline-block p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors"
                                                title="Edit"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteCustomer(cust)}
                                                className="inline-block p-1 text-rose-500 hover:text-rose-400 cursor-pointer transition-colors"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedCustomerId === cust.id && (
                                        <tr>
                                            <td colSpan={11} className="p-0">
                                                <CustomerDetailPanel
                                                    customer={cust}
                                                    theme={theme}
                                                    onEdit={openCustomerModal}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {sortedCustomers.length > PAGE_SIZE && (
                    <div className={`flex flex-col sm:flex-row items-center justify-between pt-4 border-t ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200'} gap-3 text-xs`}>
                        <span className={themeTextSub}>
                            Menampilkan <span className={`font-bold ${themeTextTitle}`}>{Math.min((customerPage - 1) * PAGE_SIZE + 1, sortedCustomers.length)}</span> hingga <span className={`font-bold ${themeTextTitle}`}>{Math.min(customerPage * PAGE_SIZE, sortedCustomers.length)}</span> dari <span className={`font-bold ${themeTextTitle}`}>{sortedCustomers.length}</span> pelanggan
                        </span>
                        <div className="flex items-center space-x-1">
                            <button
                                type="button"
                                disabled={customerPage === 1}
                                onClick={() => setCustomerPage((p) => Math.max(p - 1, 1))}
                                className={`px-3 py-1.5 border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
                            >
                                Sebelumnya
                            </button>
                            {Array.from({ length: totalCustomerPages }, (_, idx) => idx + 1).map((page) => {
                                const isCurrent = page === customerPage;
                                return (
                                    <button
                                        key={page}
                                        type="button"
                                        onClick={() => setCustomerPage(page)}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-150 cursor-pointer ${isCurrent
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : (isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-950')
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                disabled={customerPage === totalCustomerPages}
                                onClick={() => setCustomerPage((p) => Math.min(p + 1, totalCustomerPages))}
                                className={`px-3 py-1.5 border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
                            >
                                Berikutnya
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <TransitionModal show={showCustomerModal} themeCard={themeCard} maxWidth="lg" className="overflow-y-auto max-h-[90vh]">
                <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                        {editingCustomer ? 'Edit Pelanggan PPPoE' : 'Tambah Pelanggan PPPoE'}
                    </h3>
                    <button type="button" onClick={() => setShowCustomerModal(false)} className="text-zinc-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
                    <input type="hidden" name="id" value={editingCustomer ? editingCustomer.id : ''} />
                    <input type="hidden" name="service_type" value="pppoe" />

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Nama Lengkap</label>
                            <input required name="name" type="text" defaultValue={editingCustomer ? editingCustomer.name : ''} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Username Layanan</label>
                            <input required name="username" type="text" defaultValue={editingCustomer ? editingCustomer.username : ''} className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Password Portal</label>
                            <input required name="password" type="text" defaultValue={editingCustomer ? editingCustomer.password : ''} className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Nomor Telepon (WA)</label>
                            <input required name="phone_number" type="text" defaultValue={editingCustomer ? editingCustomer.phone_number : ''} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Alamat Lengkap</label>
                        <textarea required name="address" rows={2} defaultValue={editingCustomer ? editingCustomer.address : ''} className={`p-2 border rounded-lg ${themeInput}`} />
                    </div>

                    <GpsCoordinateFields
                        latitude={customerLat}
                        longitude={customerLng}
                        onLatitudeChange={setCustomerLat}
                        onLongitudeChange={setCustomerLng}
                        latLabel="Lintang GPS (Latitude)"
                        lngLabel="Bujur GPS (Longitude)"
                        latPlaceholder="-7.98xxx"
                        lngPlaceholder="112.62xxx"
                        themeInput={themeInput}
                        themeLabel={themeLabel}
                        isDarkMode={isDarkMode}
                        onError={(message) => showToast(message, 'error')}
                        onSuccess={() => showToast('Koordinat GPS berhasil diambil.', 'success')}
                    />

                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Router</label>
                            <select name="router_id" defaultValue={editingCustomer ? editingCustomer.router_id : (routers[0]?.id || '')} className={`p-2 border rounded-lg ${themeInput}`}>
                                {routers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Paket Internet</label>
                            <select
                                name="package_id"
                                required
                                defaultValue={editingCustomer?.package_id || pppoePackages[0]?.id || ''}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            >
                                {pppoePackages.length === 0 ? (
                                    <option value="" disabled>Paket belum tersedia</option>
                                ) : pppoePackages.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Titik ODP</label>
                            <select name="odp_id" defaultValue={editingCustomer ? (editingCustomer.odp_id || '') : ''} className={`p-2 border rounded-lg ${themeInput}`}>
                                <option value="">Tanpa ODP / Belum Terhubung</option>
                                {odps.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Status Akun</label>
                            <select name="status" defaultValue={editingCustomer ? editingCustomer.status : 'active'} className={`p-2 border rounded-lg ${themeInput}`}>
                                <option value="active">Active</option>
                                <option value="isolated">Isolated (Isolir)</option>
                                <option value="inactive">Inactive</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Tgl Jatuh Tempo</label>
                            <input required name="billing_date" type="number" min={1} max={31} defaultValue={editingCustomer ? editingCustomer.billing_date : 1} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Tgl Mulai Layanan</label>
                            <input
                                name="service_start_date"
                                type="date"
                                defaultValue={
                                    editingCustomer?.service_start_date
                                        ? String(editingCustomer.service_start_date).substring(0, 10)
                                        : new Date().toISOString().substring(0, 10)
                                }
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                            <span className={`text-[10px] ${themeTextDesc}`}>Dasar prorata bulan pertama: tgl mulai layanan s/d tgl jatuh tempo (billing date), dibagi 30 hari.</span>
                        </div>
                    </div>

                    <div className="flex justify-end pt-3 gap-2">
                        <button type="button" onClick={() => setShowCustomerModal(false)} title="Batal" className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}><X className="w-4 h-4" /></button>
                        <button type="submit" title="Simpan" className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg inline-flex items-center justify-center"><Save className="w-4 h-4" /></button>
                    </div>
                </form>
            </TransitionModal>

            <TransitionModal show={showDeleteCustomerModal} themeCard={themeCard} maxWidth="md">
                <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className="text-sm font-bold text-rose-500">
                        Hapus Pelanggan
                    </h3>
                    <button
                        type="button"
                        onClick={() => {
                            setShowDeleteCustomerModal(false);
                            setTimeout(() => setCustomerToDelete(null), 300);
                        }}
                        className={`text-zinc-500 ${isDarkMode ? 'hover:text-white' : 'hover:text-zinc-800'}`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="text-xs space-y-3">
                    <p className={themeTextTitle}>
                        Apakah Anda yakin ingin menghapus pelanggan <strong>{customerToDelete?.name || ''}</strong> (username: <strong>@{customerToDelete?.username || ''}</strong>)?
                    </p>

                    <div className={`p-3 ${themeInnerWidget} rounded-xl space-y-2`}>
                        <span className={`font-bold ${themeTextSub} block mb-1`}>Pilih Mode Penghapusan:</span>

                        <label className="flex items-start space-x-2.5 cursor-pointer group text-[11px]">
                            <input
                                type="radio"
                                name="delete_mode"
                                value="local_only"
                                checked={deleteMode === 'local_only'}
                                onChange={() => setDeleteMode('local_only')}
                                className={`mt-0.5 text-emerald-500 focus:ring-emerald-500 ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                            />
                            <div className="space-y-0.5">
                                <span className={`font-semibold ${themeTextTitle} ${isDarkMode ? 'group-hover:text-emerald-400' : 'group-hover:text-emerald-600'} transition-colors`}>Hapus Database Saja (Dual-Mode 1)</span>
                                <p className={`${themeTextDesc} leading-normal text-[10px]`}>Hanya menghapus data dari database {branding.app_name || 'aplikasi'}. Akun PPP Secret / Hotspot di Mikrotik akan tetap ada dan aktif.</p>
                            </div>
                        </label>

                        <div className={`border-t ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200/60'} my-2`} />

                        <label className="flex items-start space-x-2.5 cursor-pointer group text-[11px]">
                            <input
                                type="radio"
                                name="delete_mode"
                                value="total"
                                checked={deleteMode === 'total'}
                                onChange={() => setDeleteMode('total')}
                                className={`mt-0.5 text-rose-500 focus:ring-rose-500 ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                            />
                            <div className="space-y-0.5">
                                <span className="font-semibold text-rose-500 transition-colors">Hapus Database & Mikrotik (Dual-Mode 2)</span>
                                <p className={`${themeTextDesc} leading-normal text-[10px]`}>Menghapus data dari database {branding.app_name || 'aplikasi'} DAN menghapus secara permanen akun PPP Secret/Hotspot dari Router Mikrotik.</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end pt-2 gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() => {
                            setShowDeleteCustomerModal(false);
                            setTimeout(() => setCustomerToDelete(null), 300);
                        }}
                        title="Batal"
                        className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={confirmDeleteCustomer}
                        title="Konfirmasi Hapus"
                        className={`p-2 rounded-lg text-white transition-colors cursor-pointer inline-flex items-center justify-center ${deleteMode === 'total' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </TransitionModal>

            <TransitionModal show={showBulkDeleteModal} themeCard={themeCard} maxWidth="md">
                <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className="text-sm font-bold text-rose-500">
                        Hapus Masal Pelanggan
                    </h3>
                    <button
                        type="button"
                        onClick={() => setShowBulkDeleteModal(false)}
                        className={`text-zinc-500 ${isDarkMode ? 'hover:text-white' : 'hover:text-zinc-800'}`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="text-xs space-y-3">
                    <p className={themeTextTitle}>
                        Anda akan menghapus secara masal <strong>{selectedCustomerIds.length}</strong> pelanggan yang dipilih. Tindakan ini tidak bisa dibatalkan!
                    </p>

                    <div className={`p-3 ${themeInnerWidget} rounded-xl space-y-2`}>
                        <span className={`font-bold ${themeTextSub} block mb-1`}>Pilih Mode Penghapusan Masal:</span>

                        <label className="flex items-start space-x-2.5 cursor-pointer group text-[11px]">
                            <input
                                type="radio"
                                name="bulk_delete_mode"
                                value="local_only"
                                checked={bulkDeleteMode === 'local_only'}
                                onChange={() => setBulkDeleteMode('local_only')}
                                className={`mt-0.5 text-emerald-500 focus:ring-emerald-500 ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                            />
                            <div className="space-y-0.5">
                                <span className={`font-semibold ${themeTextTitle} ${isDarkMode ? 'group-hover:text-emerald-400' : 'group-hover:text-emerald-600'} transition-colors`}>Hapus Database Saja (Local Only)</span>
                                <p className={`${themeTextDesc} leading-normal text-[10px]`}>Hanya menghapus data terpilih dari database {branding.app_name || 'aplikasi'}. Akun PPP Secret / Hotspot di Mikrotik akan tetap ada dan aktif.</p>
                            </div>
                        </label>

                        <div className={`border-t ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200/60'} my-2`} />

                        <label className="flex items-start space-x-2.5 cursor-pointer group text-[11px]">
                            <input
                                type="radio"
                                name="bulk_delete_mode"
                                value="total"
                                checked={bulkDeleteMode === 'total'}
                                onChange={() => setBulkDeleteMode('total')}
                                className={`mt-0.5 text-rose-500 focus:ring-rose-500 ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                            />
                            <div className="space-y-0.5">
                                <span className="font-semibold text-rose-450 transition-colors">Hapus Database & Mikrotik (Total)</span>
                                <p className={`${themeTextDesc} leading-normal text-[10px]`}>Menghapus data terpilih dari database {branding.app_name || 'aplikasi'} DAN menghapus secara permanen akun PPP Secret/Hotspot terkait dari Router Mikrotik.</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end pt-2 gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() => setShowBulkDeleteModal(false)}
                        title="Batal"
                        className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={confirmBulkDeleteCustomer}
                        title="Konfirmasi Hapus Masal"
                        className={`p-2 rounded-lg text-white transition-colors cursor-pointer inline-flex items-center justify-center ${bulkDeleteMode === 'total' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </TransitionModal>
        </>
    );
}

export default function CustomersIndex({ customers, routers, packages, odps }) {
    return (
        <AdminLayout title="Manajemen PPPoE">
            <CustomersPageContent
                customers={customers}
                routers={routers}
                packages={packages}
                odps={odps}
            />
        </AdminLayout>
    );
}
