import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Edit, Eye, Plus, RefreshCw, Save, Search, Trash2, Upload, Users, X } from 'lucide-react';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import AdminPageCard from '../../../Components/Admin/AdminPageCard';
import TransitionModal from '../../../Components/Admin/TransitionModal';
import CustomerDetailPanel from '../../../Components/Admin/CustomerDetailPanel';
import GpsCoordinateFields from '../../../Components/GpsCoordinateFields';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';
import { useStaffPermissions } from '../../../hooks/useStaffPermissions';
import { useAssignedRouter } from '../../../hooks/useAssignedRouter';
import AssignedRouterFilter from '../../../Components/Admin/AssignedRouterFilter';
import { ReadOnlyTableActionsPlaceholder } from '../../../Components/Admin/ReadOnlyStaffBanner';
import getVisiblePages from '../../../utils/getVisiblePages';
import { formatDateInputValue, formatDisplayDate, resolveCustomerDueDate, todayDateInputValue } from '../../../utils/formatDateInputValue';
import { fetchRouterPackageProfiles } from '../../../utils/fetchRouterPackageProfiles';
import { filterPppoePackagesForRouter } from '../../../utils/packageRouterFilter';
import {
    readAdminCustomersFilterPreference,
    writeAdminCustomersFilterPreference,
} from '../../../utils/adminCustomersFilterPreference';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 500, 1000];

function resolveInitialRouterFilter(routers, lockedRouterId, initialRouterId, savedRouterId) {
    if (lockedRouterId) {
        return lockedRouterId;
    }

    if (savedRouterId && routers.some((router) => String(router.id) === savedRouterId)) {
        return savedRouterId;
    }

    return initialRouterId;
}

function getCustomerEmail(customer) {
    return customer?.portal_email || customer?.user?.email || '';
}

function getCustomerBillingDateValue(customer) {
    return formatDateInputValue(resolveCustomerDueDate(customer)) || '';
}

function getModalEmailValue(customer) {
    if (!customer) {
        return '';
    }

    return customer.portal_email || '';
}

function CustomersPageContent({
    customers = [],
    routers = [],
    packages = [],
    odps = [],
}) {
    const theme = useAdminTheme();
    const { canWrite, canCreateCustomers } = useStaffPermissions();
    const { lockedRouterId, initialRouterId } = useAssignedRouter(routers);
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

    const savedFilters = useMemo(() => readAdminCustomersFilterPreference(), []);

    const [searchTerm, setSearchTerm] = useState(savedFilters.searchTerm);
    const [routerFilter, setRouterFilter] = useState(() => resolveInitialRouterFilter(
        routers,
        lockedRouterId,
        initialRouterId,
        savedFilters.routerId,
    ));
    const [pageSize, setPageSize] = useState(10);
    const [sortColumn, setSortColumn] = useState('package');
    const [sortDirection, setSortDirection] = useState('desc');
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
    const [expandedCustomerId, setExpandedCustomerId] = useState(savedFilters.expandedCustomerId);
    const customerDetailPanelRef = useRef(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importCsvFile, setImportCsvFile] = useState(null);
    const [importRouterId, setImportRouterId] = useState(() => String(routers[0]?.id ?? ''));
    const [importSkipExisting, setImportSkipExisting] = useState(false);
    const [importEmailOnly, setImportEmailOnly] = useState(false);
    const [importDryRun, setImportDryRun] = useState(true);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [isSyncingCustomers, setIsSyncingCustomers] = useState(false);

    const [selectedRouterId, setSelectedRouterId] = useState('');
    const [selectedPackageId, setSelectedPackageId] = useState('');
    const [routerProfilesMap, setRouterProfilesMap] = useState({});
    const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

    const [activeSessions, setActiveSessions] = useState([]);
    const [isLoadingActiveSessions, setIsLoadingActiveSessions] = useState(false);
    const [activeSessionsError, setActiveSessionsError] = useState(null);

    const fetchActiveSessions = async () => {
        setIsLoadingActiveSessions(true);
        setActiveSessionsError(null);
        try {
            const params = new URLSearchParams();
            if (routerFilter) {
                params.set('router_id', routerFilter);
            }
            const res = await fetch(`/admin/pppoe/active-sessions?${params.toString()}`);
            const data = await res.json();
            if (res.ok && data.success) {
                setActiveSessions(data.sessions || []);
            } else {
                setActiveSessionsError(data.message || 'Gagal memuat sesi aktif.');
            }
        } catch (err) {
            setActiveSessionsError(err.message || 'Gagal memuat sesi aktif.');
        } finally {
            setIsLoadingActiveSessions(false);
        }
    };

    const handleKickActiveSession = async (session) => {
        if (!session) return;
        if (!confirm(`Putuskan sesi PPPoE aktif untuk user '${session.username}'? Pelanggan akan terputus sementara dan melakukan koneksi ulang.`)) {
            return;
        }

        try {
            const res = await fetch('/admin/pppoe/kick-active', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    router_id: session.router_id,
                    username: session.username,
                }),
            });

            const data = await res.json();
            if (res.ok && data.success) {
                showToast(data.message || 'Sesi berhasil diputus.', 'success');
                fetchActiveSessions();
            } else {
                showToast(data.message || 'Gagal memutus sesi.', 'error');
            }
        } catch (err) {
            showToast(err.message || 'Gagal memutus sesi.', 'error');
        }
    };

    const getActiveSessionForCustomer = (username) => {
        if (!username) return null;
        return activeSessions.find((s) => String(s.username).toLowerCase() === String(username).toLowerCase());
    };

    useEffect(() => {
        fetchActiveSessions();
        const interval = setInterval(fetchActiveSessions, 30000);
        return () => clearInterval(interval);
    }, [routerFilter]);

    const pppoePackages = packages.filter((p) => p.type === 'pppoe');

    const modalPackages = useMemo(() => {
        let filtered = filterPppoePackagesForRouter(pppoePackages, selectedRouterId, {
            allowedProfiles: routerProfilesMap[selectedRouterId],
            isLoadingProfiles,
        });

        if (editingCustomer?.package_id && showCustomerModal) {
            const currentPackage = pppoePackages.find(
                (pkg) => String(pkg.id) === String(editingCustomer.package_id),
            );

            if (currentPackage && !filtered.some((pkg) => String(pkg.id) === String(currentPackage.id))) {
                filtered = [...filtered, currentPackage].sort((a, b) =>
                    String(a.name).localeCompare(String(b.name), 'id'),
                );
            }
        }

        return filtered;
    }, [pppoePackages, selectedRouterId, routerProfilesMap, isLoadingProfiles, editingCustomer, showCustomerModal]);

    useEffect(() => {
        if (lockedRouterId) {
            setRouterFilter(lockedRouterId);
        }
    }, [lockedRouterId]);

    useEffect(() => {
        writeAdminCustomersFilterPreference({
            routerId: lockedRouterId ?? routerFilter,
            searchTerm,
            expandedCustomerId,
        });
    }, [routerFilter, searchTerm, lockedRouterId, expandedCustomerId]);

    useEffect(() => {
        setCustomerPage(1);
    }, [searchTerm, routerFilter, pageSize, sortColumn, sortDirection]);

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

            const rId = editingCustomer ? String(editingCustomer.router_id) : (routers[0] ? String(routers[0].id) : '');
            setSelectedRouterId(rId);
            setSelectedPackageId(editingCustomer ? String(editingCustomer.package_id || '') : '');
        }
    }, [showCustomerModal, editingCustomer, routers]);

    useEffect(() => {
        if (!selectedRouterId || !showCustomerModal) {
            return;
        }

        if (routerProfilesMap[selectedRouterId] !== undefined) {
            return;
        }

        let cancelled = false;
        const controller = new AbortController();
        setIsLoadingProfiles(true);

        fetchRouterPackageProfiles(selectedRouterId, { signal: controller.signal })
            .then((data) => {
                if (cancelled) return;
                setRouterProfilesMap((prev) => ({
                    ...prev,
                    [selectedRouterId]: data?.all_profiles || [],
                }));
            })
            .catch((err) => {
                if (cancelled || err?.name === 'AbortError') return;
                console.error('Gagal memuat profil router:', err);
                setRouterProfilesMap((prev) => ({
                    ...prev,
                    [selectedRouterId]: [],
                }));
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoadingProfiles(false);
                }
            });

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [selectedRouterId, showCustomerModal, routerProfilesMap]);

    useEffect(() => {
        if (!showCustomerModal) return;

        if (modalPackages.length > 0) {
            const hasSelected = modalPackages.some((p) => String(p.id) === String(selectedPackageId));
            if (!hasSelected) {
                setSelectedPackageId(String(modalPackages[0].id));
            }
        } else {
            setSelectedPackageId('');
        }
    }, [modalPackages, showCustomerModal, selectedPackageId]);

    const isPppoeCustomer = (cust) => cust?.service_type !== 'hotspot';

    const selectedRouter = routers.find((router) => String(router.id) === String(routerFilter));

    const routerScopedCustomers = customers.filter((cust) => {
        if (!isPppoeCustomer(cust)) {
            return false;
        }

        if (!routerFilter) {
            return true;
        }

        return String(cust.router_id) === String(routerFilter);
    });

    const routerCustomerCounts = customers.reduce((counts, cust) => {
        if (!isPppoeCustomer(cust)) {
            return counts;
        }

        const routerId = cust.router_id ?? 'none';
        counts[routerId] = (counts[routerId] || 0) + 1;

        return counts;
    }, {});

    const packageCustomerCounts = routerScopedCustomers.reduce((counts, cust) => {
        const packageId = cust.package_id ?? 'none';
        counts[packageId] = (counts[packageId] || 0) + 1;

        return counts;
    }, {});

    const filteredCustomers = routerScopedCustomers.filter((cust) => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) {
            return true;
        }

        const billingDateIso = getCustomerBillingDateValue(cust).toLowerCase();
        const billingDateLabel = formatDisplayDate(resolveCustomerDueDate(cust)).toLowerCase();

        return (
            cust.name.toLowerCase().includes(term) ||
            cust.username.toLowerCase().includes(term) ||
            (cust.phone_number && cust.phone_number.toLowerCase().includes(term)) ||
            getCustomerEmail(cust).toLowerCase().includes(term) ||
            (cust.package && cust.package.name.toLowerCase().includes(term)) ||
            (cust.odp && cust.odp.name.toLowerCase().includes(term)) ||
            billingDateIso.includes(term) ||
            billingDateLabel.includes(term)
        );
    });

    const getCustomerSortValue = (cust, column) => {
        switch (column) {
            case 'name':
                return cust.name || '';
            case 'username':
                return cust.username || '';
            case 'phone':
                return cust.phone_number || '';
            case 'email':
                return getCustomerEmail(cust);
            case 'router':
                return cust.router?.name || '';
            case 'package':
                return packageCustomerCounts[cust.package_id ?? 'none'] || 0;
            case 'odp':
                return cust.odp?.name || '';
            case 'billing_date':
                return getCustomerBillingDateValue(cust);
            case 'status':
                return cust.status || '';
            default:
                return '';
        }
    };

    const sortedCustomers = [...filteredCustomers].sort((a, b) => {
        const valueA = getCustomerSortValue(a, sortColumn);
        const valueB = getCustomerSortValue(b, sortColumn);

        let comparison = 0;

        if (sortColumn === 'package') {
            comparison = Number(valueA) - Number(valueB);
        } else if (sortColumn === 'billing_date') {
            comparison = String(valueA).localeCompare(String(valueB));
        } else {
            comparison = String(valueA).localeCompare(String(valueB), 'id', { sensitivity: 'base' });
        }

        if (comparison !== 0) {
            return sortDirection === 'desc' ? -comparison : comparison;
        }

        return String(a.name || '').localeCompare(String(b.name || ''), 'id', { sensitivity: 'base' });
    });

    const toggleColumnSort = (column) => {
        if (sortColumn === column) {
            setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'));
            return;
        }

        setSortColumn(column);
        setSortDirection(column === 'package' ? 'desc' : 'asc');
    };

    const columnSortButtonClass = `inline-flex flex-col items-center justify-center w-5 h-5 rounded-md border transition-colors cursor-pointer shrink-0 ${
        isDarkMode
            ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 hover:border-zinc-700'
            : 'border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 hover:border-zinc-300'
    }`;

    const renderColumnSortButton = (column, label) => {
        const isActive = sortColumn === column;

        return (
            <button
                type="button"
                onClick={() => toggleColumnSort(column)}
                title={
                    isActive && sortDirection === 'desc'
                        ? `${label} (menurun, klik untuk terbalik)`
                        : isActive
                            ? `${label} (menaik, klik untuk terbalik)`
                            : label
                }
                aria-label={
                    isActive && sortDirection === 'desc'
                        ? `${label} menurun`
                        : isActive
                            ? `${label} menaik`
                            : label
                }
                className={columnSortButtonClass}
            >
                <ChevronUp
                    className={`w-2.5 h-2.5 -mb-0.5 ${
                        isActive && sortDirection === 'asc' ? 'text-emerald-500' : 'opacity-35'
                    }`}
                    aria-hidden="true"
                />
                <ChevronDown
                    className={`w-2.5 h-2.5 -mt-0.5 ${
                        isActive && sortDirection === 'desc' ? 'text-emerald-500' : 'opacity-35'
                    }`}
                    aria-hidden="true"
                />
            </button>
        );
    };

    const totalCustomerPages = Math.ceil(sortedCustomers.length / pageSize) || 1;
    const paginatedCustomers = sortedCustomers.slice(
        (customerPage - 1) * pageSize,
        customerPage * pageSize
    );

    const paginationRangeStart = sortedCustomers.length === 0
        ? 0
        : (customerPage - 1) * pageSize + 1;
    const paginationRangeEnd = Math.min(customerPage * pageSize, sortedCustomers.length);
    const visiblePages = getVisiblePages(customerPage, totalCustomerPages);
    const expandedCustomer = useMemo(
        () => sortedCustomers.find((cust) => cust.id === expandedCustomerId) ?? null,
        [sortedCustomers, expandedCustomerId]
    );
    const paginationNavButton = isDarkMode
        ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-zinc-400'
        : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-zinc-600';
    const paginationPageButton = isDarkMode
        ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white'
        : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-950';

    const openCustomerModal = (customer = null) => {
        setEditingCustomer(customer);
        setShowCustomerModal(true);
    };

    const closeCustomerModal = () => {
        setShowCustomerModal(false);
    };

    const closeDeleteCustomerModal = () => {
        setShowDeleteCustomerModal(false);
        setTimeout(() => setCustomerToDelete(null), 300);
    };

    const closeBulkDeleteModal = () => {
        setShowBulkDeleteModal(false);
    };

    const closeImportModal = () => {
        setShowImportModal(false);
    };

    const toggleCustomerDetail = (customerId) => {
        setExpandedCustomerId((current) => (current === customerId ? null : customerId));
    };

    useEffect(() => {
        if (!expandedCustomerId) {
            return;
        }

        const index = sortedCustomers.findIndex((cust) => cust.id === expandedCustomerId);
        if (index === -1) {
            setExpandedCustomerId(null);
            return;
        }

        const targetPage = Math.floor(index / pageSize) + 1;
        setCustomerPage((current) => (current === targetPage ? current : targetPage));
    }, [expandedCustomerId, sortedCustomers, pageSize]);

    useEffect(() => {
        if (!expandedCustomerId || !customerDetailPanelRef.current) {
            return;
        }

        customerDetailPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [expandedCustomerId, expandedCustomer]);

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

    const openImportModal = () => {
        setImportCsvFile(null);
        setImportRouterId(String(routers[0]?.id ?? ''));
        setImportSkipExisting(false);
        setImportDryRun(true);
        setImportResult(null);
        setShowImportModal(true);
    };

    const handleSyncCustomers = async () => {
        const id = routerFilter || (routers[0] ? String(routers[0].id) : '');
        if (!id) {
            showToast('Pilih router terlebih dahulu untuk sinkronisasi.', 'warning');
            return;
        }

        setIsSyncingCustomers(true);
        try {
            const response = await fetch('/admin/routers/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ router_id: Number(id) }),
            });
            const result = await response.json();
            showToast(result.message, result.success ? 'success' : 'error');
            if (result.success) {
                router.reload({ only: ['customers', 'packages'] });
            }
        } catch {
            showToast('Error: Gagal menghubungi server saat melakukan sinkronisasi.', 'error');
        } finally {
            setIsSyncingCustomers(false);
        }
    };

    const handleImportCsv = async (e) => {
        e.preventDefault();

        if (!importCsvFile) {
            showToast('Pilih file CSV terlebih dahulu.', 'warning');
            return;
        }

        if (!importRouterId) {
            showToast('Pilih router tujuan impor.', 'warning');
            return;
        }

        setIsImporting(true);
        setImportResult(null);

        const formData = new FormData();
        formData.append('csv_file', importCsvFile);
        formData.append('router_id', importRouterId);
        if (importSkipExisting) {
            formData.append('skip_existing', '1');
        }
        if (importEmailOnly) {
            formData.append('email_only', '1');
        }
        if (importDryRun) {
            formData.append('dry_run', '1');
        }

        try {
            const response = await fetch('/admin/customers/import-csv', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: formData,
            });

            const rawBody = await response.text();
            let payload = null;
            try {
                payload = rawBody ? JSON.parse(rawBody) : null;
            } catch {
                throw new Error(
                    response.status === 419
                        ? 'Sesi login kedaluwarsa. Muat ulang halaman lalu coba lagi.'
                        : `Server mengembalikan respons tidak valid (HTTP ${response.status}).`
                );
            }

            if (!response.ok && !payload?.message) {
                throw new Error(`Permintaan impor gagal (HTTP ${response.status}).`);
            }

            setImportResult(payload?.result ?? null);

            if (payload?.success) {
                showToast(payload.message, 'success');
                if (!payload.dry_run) {
                    router.reload({ only: ['customers', 'packages'] });
                }
            } else {
                showToast(payload?.message || 'Impor gagal.', 'error');
            }
        } catch (error) {
            showToast(error?.message || 'Gagal menghubungi server saat impor CSV.', 'error');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <>
            <AdminPageCard
                icon={Users}
                accent="emerald"
                title="Manajemen Pelanggan PPPoE"
                description={selectedRouter ? `Router: ${selectedRouter.name} · ${routerScopedCustomers.length} pelanggan` : undefined}
                themeCard={themeCard}
                isDarkMode={isDarkMode}
                themeTextTitle={themeTextTitle}
                themeTextDesc={themeTextDesc}
                actions={canWrite ? (
                    <>
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
                            onClick={handleSyncCustomers}
                            disabled={isSyncingCustomers || !routerFilter}
                            title={isSyncingCustomers ? 'Sinkronisasi...' : 'Sync Pelanggan dari Mikrotik'}
                            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isSyncingCustomers ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            type="button"
                            onClick={openImportModal}
                            title="Impor CSV"
                            className={`p-2 border rounded-xl cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}
                        >
                            <Upload className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => openCustomerModal()}
                            title="Tambah Pelanggan PPPoE"
                            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </>
                ) : canCreateCustomers ? (
                    <button
                        type="button"
                        onClick={() => openCustomerModal()}
                        title="Tambah Pelanggan PPPoE"
                        className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                ) : undefined}
            >
                <div className="flex flex-col lg:flex-row gap-2">
                    <div className="flex w-full lg:w-auto gap-2 items-center flex-1 lg:flex-none">
                        <AssignedRouterFilter
                            routers={routers}
                            value={routerFilter}
                            onChange={(e) => setRouterFilter(e.target.value)}
                            className={`w-full lg:w-56 shrink-0 px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                            renderOption={(routerItem) => `${routerItem.name} (${routerCustomerCounts[routerItem.id] || 0})`}
                        />
                    </div>
                    <div className="relative flex-1 w-full flex gap-2">
                        <div className="relative flex-1">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${themeTextDesc}`} />
                            <input
                                type="text"
                                placeholder="Cari nama, username, telepon, email, paket, ODP, tanggal tagih..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={fetchActiveSessions}
                            disabled={isLoadingActiveSessions}
                            title="Segarkan Sesi Aktif"
                            className={`p-2 border rounded-xl cursor-pointer inline-flex items-center justify-center disabled:opacity-50 shrink-0 ${isDarkMode ? 'border-zinc-800 text-emerald-400 hover:bg-zinc-900' : 'border-zinc-200 text-emerald-600 hover:bg-emerald-50'}`}
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoadingActiveSessions ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="admin-table-scroll">
                    <table>
                        <thead>
                            <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                {canWrite && (
                                <th className="py-3 px-2 w-8">
                                    <input
                                        type="checkbox"
                                        checked={sortedCustomers.length > 0 && selectedCustomerIds.length === sortedCustomers.length}
                                        onChange={toggleSelectAllCustomers}
                                        className={`rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                                    />
                                </th>
                                )}
                                <th className="py-3 px-2">
                                    <div className="flex items-center gap-1">
                                        <span>Nama</span>
                                        {renderColumnSortButton('name', 'Urut berdasarkan nama')}
                                    </div>
                                </th>
                                <th className="py-3 px-2">
                                    <div className="flex items-center gap-1">
                                        <span>Username</span>
                                        {renderColumnSortButton('username', 'Urut berdasarkan username')}
                                    </div>
                                </th>
                                <th className="py-3 px-2">
                                    <div className="flex items-center gap-1">
                                        <span>Telepon</span>
                                        {renderColumnSortButton('phone', 'Urut berdasarkan telepon')}
                                    </div>
                                </th>
                                <th className="py-3 px-2">
                                    <div className="flex items-center gap-1">
                                        <span>Email</span>
                                        {renderColumnSortButton('email', 'Urut berdasarkan email')}
                                    </div>
                                </th>
                                <th className="py-3 px-2">
                                    <div className="flex items-center gap-1">
                                        <span>Router</span>
                                        {renderColumnSortButton('router', 'Urut berdasarkan router')}
                                    </div>
                                </th>
                                <th className="py-3 px-2">
                                    <div className="flex items-center gap-1">
                                        <span>Paket</span>
                                        {renderColumnSortButton('package', 'Urut berdasarkan jumlah pelanggan per paket')}
                                    </div>
                                </th>
                                <th className="py-3 px-2">
                                    <div className="flex items-center gap-1">
                                        <span>ODP</span>
                                        {renderColumnSortButton('odp', 'Urut berdasarkan ODP')}
                                    </div>
                                </th>
                                <th className="py-3 px-2">
                                    <div className="flex items-center gap-1">
                                        <span>Tgl Tagih</span>
                                        {renderColumnSortButton('billing_date', 'Urut berdasarkan tanggal tagih')}
                                    </div>
                                </th>
                                <th className="py-3 px-2">
                                    <div className="flex items-center gap-1">
                                        <span>Status</span>
                                        {renderColumnSortButton('status', 'Urut berdasarkan status')}
                                    </div>
                                </th>
                                <th className="py-3 px-2 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/20 text-xs">
                            {paginatedCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={canWrite ? 11 : 10} className={`py-8 text-center ${themeTextDesc}`}>
                                        {!routerFilter
                                            ? 'Pilih router Mikrotik terlebih dahulu.'
                                            : searchTerm.trim()
                                                ? `Tidak ada pelanggan PPPoE di ${selectedRouter?.name || 'router ini'} yang cocok dengan pencarian.`
                                                : `Belum ada pelanggan PPPoE di ${selectedRouter?.name || 'router ini'}.`}
                                    </td>
                                </tr>
                            ) : paginatedCustomers.map((cust) => (
                                    <Fragment key={cust.id}>
                                    <tr
                                        className={`${themeTextSub} hover:bg-zinc-900/10 ${selectedCustomerIds.includes(cust.id) ? 'bg-emerald-500/5' : ''} ${expandedCustomerId === cust.id ? (isDarkMode ? 'bg-zinc-900/20' : 'bg-zinc-50') : ''}`}
                                    >
                                        {canWrite && (
                                        <td className="py-3 px-2 w-8">
                                            <input
                                                type="checkbox"
                                                checked={selectedCustomerIds.includes(cust.id)}
                                                onChange={() => toggleSelectCustomer(cust.id)}
                                                className={`rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                                            />
                                        </td>
                                        )}
                                        <td className={`py-3 px-2 font-bold ${themeTextTitle}`}>
                                            <div className="flex items-center gap-1.5">
                                                {(() => {
                                                    const session = getActiveSessionForCustomer(cust.username);
                                                    if (session) {
                                                        return (
                                                            <span className="relative flex h-2 w-2 shrink-0 animate-pulse" title={`Online - IP: ${session.address || '-'}`}>
                                                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.95)]" />
                                                            </span>
                                                        );
                                                    }
                                                    return (
                                                        <span className="h-2 w-2 rounded-full bg-zinc-400/60 shrink-0" title="Offline" />
                                                    );
                                                })()}
                                                <span>{cust.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 font-mono">{cust.username}</td>
                                        <td className="py-3 px-2 font-mono text-[10px]">{cust.phone_number || '—'}</td>
                                        <td className={`py-3 px-2 font-mono text-[10px] max-w-[140px] truncate ${getCustomerEmail(cust) ? themeTextSub : themeTextDesc}`} title={getCustomerEmail(cust) || undefined}>
                                            {getCustomerEmail(cust) || '—'}
                                        </td>
                                        <td className="py-3 px-2">{cust.router ? cust.router.name : '—'}</td>
                                        <td className="py-3 px-2">{cust.package ? cust.package.name : '—'}</td>
                                        <td className="py-3 px-2 font-mono text-[10px]">{cust.odp ? cust.odp.name : '—'}</td>
                                        <td className="py-3 px-2">{formatDisplayDate(resolveCustomerDueDate(cust))}</td>
                                        <td className="py-3 px-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                cust.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                cust.status === 'isolated' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                            }`}>
                                                {cust.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-right">
                                            <div className="admin-table-actions">
                                            <button
                                                type="button"
                                                onClick={() => toggleCustomerDetail(cust.id)}
                                                className={`inline-block p-1 cursor-pointer transition-colors ${expandedCustomerId === cust.id ? 'text-sky-400' : 'text-sky-500 hover:text-sky-400'}`}
                                                title={expandedCustomerId === cust.id ? 'Tutup detail' : 'Detail lengkap'}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            {canWrite && (
                                            <>
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
                                            </>
                                            )}
                                            </div>
                                        </td>
                                    </tr>
                                    </Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {expandedCustomer && (
                    <div
                        ref={customerDetailPanelRef}
                        className={`w-full min-w-0 max-w-full overflow-hidden mt-4 rounded-2xl border ${
                            isDarkMode ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50/20'
                        }`}
                    >
                        <CustomerDetailPanel
                            customer={expandedCustomer}
                            theme={theme}
                            onEdit={openCustomerModal}
                            canWrite={canWrite}
                            activeSession={getActiveSessionForCustomer(expandedCustomer.username)}
                            onKickActive={handleKickActiveSession}
                            onClose={() => setExpandedCustomerId(null)}
                        />
                    </div>
                )}

                {sortedCustomers.length > 0 && (
                    <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between pt-4 mt-1 border-t ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200'} gap-4`}>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
                            <label className={`flex items-center gap-2 text-[11px] ${themeTextSub}`}>
                                <span>Tampilkan</span>
                                <select
                                    value={pageSize}
                                    onChange={(e) => setPageSize(Number(e.target.value))}
                                    className={`px-2 py-1 border rounded-lg text-[11px] font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                                >
                                    {PAGE_SIZE_OPTIONS.map((size) => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                                <span>entri</span>
                            </label>
                            <span className={`hidden sm:block w-px h-3.5 ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} aria-hidden="true" />
                            <p className={`text-[11px] leading-relaxed ${themeTextSub}`}>
                                Menampilkan{' '}
                                <span className={`font-semibold tabular-nums ${themeTextTitle}`}>
                                    {paginationRangeStart.toLocaleString('id-ID')}–{paginationRangeEnd.toLocaleString('id-ID')}
                                </span>
                                {' '}dari{' '}
                                <span className={`font-semibold tabular-nums ${themeTextTitle}`}>
                                    {sortedCustomers.length.toLocaleString('id-ID')}
                                </span>
                                {' '}pelanggan
                            </p>
                            <span className={`hidden sm:block w-px h-3.5 ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} aria-hidden="true" />
                            <p className={`text-[10px] font-medium tracking-wide uppercase ${themeTextDesc}`}>
                                Halaman{' '}
                                <span className={`tabular-nums normal-case font-semibold ${themeTextTitle}`}>{customerPage}</span>
                                {' '}/
                                {' '}
                                <span className={`tabular-nums normal-case font-semibold ${themeTextTitle}`}>{totalCustomerPages}</span>
                            </p>
                        </div>

                        {totalCustomerPages > 1 && (
                            <nav
                                aria-label="Navigasi halaman pelanggan"
                                className="flex items-center justify-center sm:justify-end gap-1 shrink-0"
                            >
                                <button
                                    type="button"
                                    disabled={customerPage === 1}
                                    onClick={() => setCustomerPage((page) => Math.max(page - 1, 1))}
                                    title="Halaman sebelumnya"
                                    aria-label="Halaman sebelumnya"
                                    className={`inline-flex items-center justify-center w-8 h-8 border rounded-lg transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed ${paginationNavButton}`}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                {visiblePages.map((page, index) => (
                                    page === 'ellipsis' ? (
                                        <span
                                            key={`ellipsis-${index}`}
                                            className={`inline-flex items-center justify-center w-8 h-8 text-[11px] select-none ${themeTextDesc}`}
                                            aria-hidden="true"
                                        >
                                            …
                                        </span>
                                    ) : (
                                        <button
                                            key={page}
                                            type="button"
                                            onClick={() => setCustomerPage(page)}
                                            aria-label={`Halaman ${page}`}
                                            aria-current={page === customerPage ? 'page' : undefined}
                                            className={`inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg border text-[11px] font-semibold tabular-nums transition-all duration-150 cursor-pointer ${page === customerPage
                                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                                                : paginationPageButton
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    )
                                ))}

                                <button
                                    type="button"
                                    disabled={customerPage === totalCustomerPages}
                                    onClick={() => setCustomerPage((page) => Math.min(page + 1, totalCustomerPages))}
                                    title="Halaman berikutnya"
                                    aria-label="Halaman berikutnya"
                                    className={`inline-flex items-center justify-center w-8 h-8 border rounded-lg transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed ${paginationNavButton}`}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </nav>
                        )}
                    </div>
                )}
            </AdminPageCard>

            <TransitionModal show={showCustomerModal} onClose={closeCustomerModal} themeCard={themeCard} maxWidth="lg" className="!flex !flex-col !overflow-hidden !space-y-0">
                <div className={`flex items-start justify-between gap-3 pb-3 border-b shrink-0 ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className={`text-sm font-bold min-w-0 flex-1 pr-2 ${themeTextTitle}`}>
                        {editingCustomer ? 'Edit Pelanggan PPPoE' : 'Tambah Pelanggan PPPoE'}
                    </h3>
                    <button type="button" onClick={() => setShowCustomerModal(false)} className="text-zinc-500 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSaveCustomer} className="flex flex-col flex-1 min-h-0 mt-4">
                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3 text-xs pr-0.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
                    <input type="hidden" name="id" value={editingCustomer ? editingCustomer.id : ''} />
                    <input type="hidden" name="service_type" value="pppoe" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Nama Lengkap</label>
                            <input required name="name" type="text" defaultValue={editingCustomer ? editingCustomer.name : ''} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Username Layanan</label>
                            <input required name="username" type="text" defaultValue={editingCustomer ? editingCustomer.username : ''} className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <label className={`font-bold ${themeLabel}`}>Email Portal</label>
                        <input
                            name="email"
                            type="email"
                            placeholder={editingCustomer?.username ? `${editingCustomer.username}@mwifi.test` : 'username@mwifi.test'}
                            defaultValue={getModalEmailValue(editingCustomer)}
                            className={`p-2 border rounded-lg font-mono ${themeInput}`}
                        />
                        <span className={`text-[10px] ${themeTextDesc}`}>
                            Opsional. Kosongkan untuk memakai email otomatis <span className="font-mono">{editingCustomer?.username ? `${editingCustomer.username}@mwifi.test` : 'username@mwifi.test'}</span>.
                        </span>
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Router</label>
                            <select 
                                name="router_id" 
                                value={selectedRouterId} 
                                onChange={(e) => {
                                    const nextRouterId = e.target.value;
                                    setSelectedRouterId(nextRouterId);
                                    setSelectedPackageId('');
                                }}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            >
                                {routers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Paket Internet</label>
                            <select
                                name="package_id"
                                required
                                value={selectedPackageId}
                                onChange={(e) => setSelectedPackageId(e.target.value)}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            >
                                {modalPackages.length === 0 ? (
                                    <option value="" disabled>
                                        {isLoadingProfiles ? 'Memuat paket...' : 'Paket belum tersedia'}
                                    </option>
                                ) : modalPackages.map((p) => (
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                            <label className={`font-bold ${themeLabel}`}>Tgl Mulai Layanan</label>
                            <input
                                name="service_start_date"
                                type="date"
                                defaultValue={
                                    editingCustomer?.service_start_date
                                        ? formatDateInputValue(editingCustomer.service_start_date)
                                        : todayDateInputValue()
                                }
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                            <span className={`text-[10px] ${themeTextDesc}`}>Dasar prorata bulan pertama: tgl mulai layanan s/d tgl jatuh tempo, dibagi 30 hari.</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Tgl Jatuh Tempo</label>
                            <input
                                required
                                name="billing_date"
                                type="date"
                                defaultValue={
                                    editingCustomer?.billing_date
                                        ? formatDateInputValue(editingCustomer.billing_date)
                                        : todayDateInputValue()
                                }
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowCustomerModal(false)}
                            title="Tutup"
                            className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button
                            type="submit"
                            title="Simpan"
                            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer inline-flex items-center justify-center"
                        >
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
                    </div>
                </form>
            </TransitionModal>

            <TransitionModal show={showDeleteCustomerModal} onClose={closeDeleteCustomerModal} themeCard={themeCard} maxWidth="md">
                <div className={`flex items-start justify-between gap-3 pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
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

            <TransitionModal show={showBulkDeleteModal} onClose={closeBulkDeleteModal} themeCard={themeCard} maxWidth="md">
                <div className={`flex items-start justify-between gap-3 pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
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

            <TransitionModal show={showImportModal} onClose={closeImportModal} themeCard={themeCard} maxWidth="md">
                <form onSubmit={handleImportCsv} className="space-y-4 text-xs">
                    <div className={`flex items-start justify-between gap-3 pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                        <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4 text-emerald-500" />
                            <h3 className={`text-sm font-bold ${themeTextTitle}`}>Impor Pelanggan CSV</h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowImportModal(false)}
                            className={`text-zinc-500 ${isDarkMode ? 'hover:text-white' : 'hover:text-zinc-800'}`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <p className={`${themeTextDesc} leading-relaxed text-[11px]`}>
                        Upload export CSV dari aplikasi billing lama (format Mikhmon). Kolom wajib: Login, Password, FullName, Plan.
                        Impor hanya ke database — secret PPP di Mikrotik tidak diubah.
                    </p>

                    <div className="space-y-1">
                        <label className={`block font-semibold ${themeLabel}`}>Router Tujuan</label>
                        <select
                            value={importRouterId}
                            onChange={(e) => setImportRouterId(e.target.value)}
                            required
                            className={`w-full px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                        >
                            <option value="">Pilih router...</option>
                            {routers.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className={`block font-semibold ${themeLabel}`}>File CSV</label>
                        <label className={`flex items-center justify-center gap-2 w-full px-3 py-3 rounded-xl border border-dashed cursor-pointer transition-colors ${isDarkMode ? 'border-zinc-700 bg-zinc-950/40 hover:bg-zinc-900/60' : 'border-zinc-300 bg-zinc-50 hover:bg-white'}`}>
                            <Upload className="w-3.5 h-3.5" />
                            <span className={`truncate ${themeTextSub}`}>
                                {importCsvFile?.name || 'Pilih file .csv'}
                            </span>
                            <input
                                type="file"
                                accept=".csv,text/csv"
                                className="sr-only"
                                onChange={(e) => setImportCsvFile(e.target.files?.[0] ?? null)}
                            />
                        </label>
                    </div>

                    <div className={`p-3 ${themeInnerWidget} rounded-xl space-y-2`}>
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={importDryRun}
                                onChange={(e) => setImportDryRun(e.target.checked)}
                                className={`mt-0.5 rounded text-emerald-500 focus:ring-emerald-500 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'}`}
                            />
                            <span className={themeTextSub}>
                                <span className={`font-semibold ${themeTextTitle}`}>Simulasi dulu (dry-run)</span>
                                <span className={`block ${themeTextDesc} text-[10px] mt-0.5`}>Cek hasil tanpa menyimpan ke database.</span>
                            </span>
                        </label>
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={importEmailOnly}
                                onChange={(e) => {
                                    setImportEmailOnly(e.target.checked);
                                    if (e.target.checked) {
                                        setImportSkipExisting(false);
                                    }
                                }}
                                className={`mt-0.5 rounded text-emerald-500 focus:ring-emerald-500 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'}`}
                            />
                            <span className={themeTextSub}>
                                <span className={`font-semibold ${themeTextTitle}`}>Hanya perbarui email</span>
                                <span className={`block ${themeTextDesc} text-[10px] mt-0.5`}>Cocokkan username (Login) lalu ubah email saja. Data pelanggan lain tidak disentuh. Username tidak ditemukan dilewati.</span>
                            </span>
                        </label>
                        <label className={`flex items-start gap-2 ${importEmailOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                            <input
                                type="checkbox"
                                checked={importSkipExisting}
                                disabled={importEmailOnly}
                                onChange={(e) => setImportSkipExisting(e.target.checked)}
                                className={`mt-0.5 rounded text-emerald-500 focus:ring-emerald-500 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'}`}
                            />
                            <span className={themeTextSub}>
                                <span className={`font-semibold ${themeTextTitle}`}>Lewati username yang sudah ada</span>
                                <span className={`block ${themeTextDesc} text-[10px] mt-0.5`}>Pelanggan dengan username sama tidak akan diperbarui, termasuk email dari CSV.</span>
                            </span>
                        </label>
                    </div>

                    {importResult && (
                        <div className={`p-3 rounded-xl border text-[11px] space-y-1 ${isDarkMode ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50'}`}>
                            <p className={`font-bold ${themeTextTitle}`}>Ringkasan</p>
                            <p className={themeTextSub}>Total baris: {importResult.total}</p>
                            {importResult.email_only ? (
                                <p className={themeTextSub}>Email diperbarui: {importResult.updated} · Dilewati: {importResult.skipped}</p>
                            ) : (
                                <p className={themeTextSub}>Baru: {importResult.created} · Diperbarui: {importResult.updated} · Dilewati: {importResult.skipped}</p>
                            )}
                            {!importResult.email_only && (
                                <p className={themeTextSub}>Paket baru: {importResult.packages_created} · Error: {importResult.errors?.length ?? 0}</p>
                            )}
                            {importResult.email_only && (
                                <p className={themeTextSub}>Error: {importResult.errors?.length ?? 0}</p>
                            )}
                            {importResult.errors?.length > 0 && (
                                <ul className={`mt-2 space-y-0.5 max-h-24 overflow-y-auto ${themeTextDesc}`}>
                                    {importResult.errors.slice(0, 5).map((err) => (
                                        <li key={err}>- {err}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setShowImportModal(false)}
                            className={`px-3 py-2 border rounded-lg cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100'}`}
                        >
                            Tutup
                        </button>
                        <button
                            type="submit"
                            disabled={isImporting || !importCsvFile || !importRouterId}
                            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg cursor-pointer inline-flex items-center gap-2"
                        >
                            {isImporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            {importDryRun ? 'Jalankan Simulasi' : 'Impor Sekarang'}
                        </button>
                    </div>
                </form>
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
