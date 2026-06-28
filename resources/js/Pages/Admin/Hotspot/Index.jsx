import { useEffect, useMemo, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    Activity,
    CreditCard,
    Edit,
    LogOut,
    Plus,
    Printer,
    Radio,
    RefreshCw,
    Save,
    Search,
    ShoppingCart,
    TicketPlus,
    Trash2,
    Users,
    Wifi,
    X,
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import AdminLayout from '../../../Layouts/AdminLayout';
import AdminPageCard from '../../../Components/Admin/AdminPageCard';
import TransitionModal from '../../../Components/Admin/TransitionModal';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';
import { useAdminToast } from '../../../hooks/useAdminToast';
import { formatRupiah } from '../../../utils/formatRupiah';
import { formatBytes } from '../../../utils/formatBytes';
import { formatDateInputValue, todayDateInputValue } from '../../../utils/formatDateInputValue';
import getVisiblePages from '../../../utils/getVisiblePages';

function buildHotspotDailyRevenueChartData(sales, days = 10) {
    const groups = new Map();

    sales.forEach((sale) => {
        if (!sale.created_at) {
            return;
        }

        const date = new Date(sale.created_at);
        const sortKey = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0'),
        ].join('-');
        const label = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const revenue = parseFloat(sale.price || 0);
        const existing = groups.get(sortKey);

        if (existing) {
            existing.revenue += revenue;
        } else {
            groups.set(sortKey, { date: label, revenue });
        }
    });

    const sorted = [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => value);

    if (sorted.length === 0) {
        return [{ date: 'Tidak ada data', revenue: 0 }];
    }

    return sorted.slice(-days);
}

function displayRouterOsDuration(value) {
    const text = String(value ?? '').trim();
    return text !== '' ? text : '-';
}

function HotspotPageContent({
    routers = [],
    packages = [],
    customers = [],
    hotspotVouchers = [],
    hotspotSales = [],
    hotspotAgents = [],
    defaultHotspotCommissionPercent = 0,
}) {
    const theme = useAdminTheme();
    const { showToast } = useAdminToast();
    const { branding = {}, auth } = usePage().props;
    const canManageCommissionSettings = Boolean(auth?.user?.can_write) && auth?.user?.role !== 'operator';
    const isOperatorView = auth?.user?.role === 'operator';

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
    const themeInnerWidget = isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';

    const [searchTerm, setSearchTerm] = useState('');
    const [hotspotSubTab, setHotspotSubTab] = useState('vouchers');
    const [voucherRouterFilter, setVoucherRouterFilter] = useState('');
    const [voucherStatusFilter, setVoucherStatusFilter] = useState('');
    const [voucherCommentFilter, setVoucherCommentFilter] = useState('');
    const [voucherMacMap, setVoucherMacMap] = useState({});
    const [voucherPage, setVoucherPage] = useState(1);
    const [salesPage, setSalesPage] = useState(1);
    const [isSyncingHotspot, setIsSyncingHotspot] = useState(false);
    const [showGenerateVoucherModal, setShowGenerateVoucherModal] = useState(false);
    const [isGeneratingVouchers, setIsGeneratingVouchers] = useState(false);
    const [showSellVoucherModal, setShowSellVoucherModal] = useState(false);
    const [selectedVoucherForSale, setSelectedVoucherForSale] = useState(null);
    const [isSellingVoucher, setIsSellingVoucher] = useState(false);
    const voucherPageSize = 10;
    const salesPageSize = 10;
    const customerPageSize = 10;

    const [showPrintVouchersModal, setShowPrintVouchersModal] = useState(false);
    const [printRouterId, setPrintRouterId] = useState('');
    const [printComment, setPrintComment] = useState('');
    const [printLoginUrl, setPrintLoginUrl] = useState('http://10.0.0.1');
    const [printColorPalette, setPrintColorPalette] = useState('price_based');

    const [showBulkDeleteVouchersModal, setShowBulkDeleteVouchersModal] = useState(false);
    const [bulkDeleteVouchersRouterId, setBulkDeleteVouchersRouterId] = useState('');
    const [bulkDeleteVouchersComment, setBulkDeleteVouchersComment] = useState('');

    const [generateRouterId, setGenerateRouterId] = useState('');
    const [hotspotServers, setHotspotServers] = useState([]);
    const [isLoadingServers, setIsLoadingServers] = useState(false);
    const [generateComment, setGenerateComment] = useState('');
    const [generateServerDnsName, setGenerateServerDnsName] = useState('');
    const [generatePackageId, setGeneratePackageId] = useState('');
    const [generateBasePrice, setGenerateBasePrice] = useState(0);
    const [generateAgentProfit, setGenerateAgentProfit] = useState(0);

    const [hotspotMemberPage, setHotspotMemberPage] = useState(1);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [showDeleteMemberModal, setShowDeleteMemberModal] = useState(false);
    const [memberToDelete, setMemberToDelete] = useState(null);
    const [deleteMode, setDeleteMode] = useState('local_only');

    const [sessionRouterFilter, setSessionRouterFilter] = useState('');
    const [activeSessions, setActiveSessions] = useState([]);
    const [sessionErrors, setSessionErrors] = useState([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [sessionLoadError, setSessionLoadError] = useState(null);
    const [sessionPage, setSessionPage] = useState(1);
    const [kickingSessionKey, setKickingSessionKey] = useState(null);
    const sessionPageSize = 10;

    const [agentDateFrom, setAgentDateFrom] = useState(() => {
        const now = new Date();
        return formatDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
    });
    const [agentDateTo, setAgentDateTo] = useState(todayDateInputValue);
    const [agentFilterId, setAgentFilterId] = useState('');
    const [agentReport, setAgentReport] = useState(null);
    const [isLoadingAgentReport, setIsLoadingAgentReport] = useState(false);
    const [agentReportError, setAgentReportError] = useState(null);
    const [defaultCommissionInput, setDefaultCommissionInput] = useState(String(defaultHotspotCommissionPercent ?? 0));
    const [isSavingCommissionSettings, setIsSavingCommissionSettings] = useState(false);
    const [agentReportPage, setAgentReportPage] = useState(1);
    const agentReportPageSize = 10;

    useEffect(() => {
        setDefaultCommissionInput(String(defaultHotspotCommissionPercent ?? 0));
    }, [defaultHotspotCommissionPercent]);

    const fetchAgentReport = async () => {
        setIsLoadingAgentReport(true);
        setAgentReportError(null);

        try {
            const params = new URLSearchParams();
            if (agentDateFrom) params.set('date_from', agentDateFrom);
            if (agentDateTo) params.set('date_to', agentDateTo);
            if (!isOperatorView && agentFilterId) params.set('agent_id', agentFilterId);

            const response = await fetch(`/admin/hotspot/agent-report?${params.toString()}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Gagal memuat laporan bagi hasil agen.');
            }

            setAgentReport(data);
            setAgentReportPage(1);
        } catch (error) {
            setAgentReportError(error?.message || 'Gagal memuat laporan bagi hasil agen.');
        } finally {
            setIsLoadingAgentReport(false);
        }
    };

    useEffect(() => {
        if (hotspotSubTab !== 'agents') {
            return undefined;
        }

        fetchAgentReport();
    }, [hotspotSubTab, agentDateFrom, agentDateTo, agentFilterId, isOperatorView]);

    const handleSaveDefaultCommission = async () => {
        setIsSavingCommissionSettings(true);

        try {
            const response = await fetch('/admin/hotspot/commission-settings', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    default_commission_percent: Number(defaultCommissionInput),
                }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Gagal menyimpan pengaturan bagi hasil.');
            }

            showToast('Persentase bagi hasil default berhasil disimpan.', 'success');
            fetchAgentReport();
        } catch (error) {
            showToast(error?.message || 'Gagal menyimpan pengaturan bagi hasil.', 'error');
        } finally {
            setIsSavingCommissionSettings(false);
        }
    };

    useEffect(() => {
        setVoucherPage(1);
    }, [searchTerm, voucherRouterFilter, voucherStatusFilter, voucherCommentFilter]);

    useEffect(() => {
        setVoucherCommentFilter('');
    }, [voucherRouterFilter]);

    useEffect(() => {
        setHotspotMemberPage(1);
    }, [searchTerm]);

    useEffect(() => {
        setSessionPage(1);
    }, [searchTerm, sessionRouterFilter]);

    const fetchActiveSessions = async ({ silent = false } = {}) => {
        if (!silent) {
            setIsLoadingSessions(true);
        }
        setSessionLoadError(null);

        try {
            const params = new URLSearchParams();
            if (sessionRouterFilter) {
                params.set('router_id', sessionRouterFilter);
            }

            const query = params.toString();
            const response = await fetch(`/admin/hotspot/active-sessions${query ? `?${query}` : ''}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Gagal memuat sesi aktif hotspot.');
            }

            setActiveSessions(data.sessions || []);
            setSessionErrors(data.errors || []);
        } catch (error) {
            setSessionLoadError(error?.message || 'Gagal memuat sesi aktif hotspot.');
        } finally {
            if (!silent) {
                setIsLoadingSessions(false);
            }
        }
    };

    useEffect(() => {
        if (hotspotSubTab !== 'sessions') {
            return undefined;
        }

        fetchActiveSessions();
        const interval = setInterval(() => fetchActiveSessions({ silent: true }), 3000);

        return () => clearInterval(interval);
    }, [hotspotSubTab, sessionRouterFilter]);

    const handleKickActiveSession = async (session) => {
        const username = session?.username;
        const routerId = session?.router_id;
        if (!username || !routerId) {
            return;
        }

        if (!confirm(`Putuskan sesi hotspot "${username}"?`)) {
            return;
        }

        const sessionKey = `${routerId}:${username}:${session.address || ''}`;
        setKickingSessionKey(sessionKey);

        try {
            const response = await fetch('/admin/hotspot/kick-active', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    router_id: routerId,
                    username,
                }),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Gagal memutus sesi hotspot.');
            }

            showToast(data.message || 'Sesi hotspot berhasil diputus.', 'success');
            await fetchActiveSessions({ silent: true });
        } catch (error) {
            showToast(error?.message || 'Gagal memutus sesi hotspot.', 'error');
        } finally {
            setKickingSessionKey(null);
        }
    };

    const fetchHotspotVoucherMacAddresses = async () => {
        try {
            const res = await fetch('/admin/hotspot/voucher-mac-addresses');
            const data = await res.json();
            if (data.success && data.mac_addresses) {
                setVoucherMacMap(data.mac_addresses);
            }
            if (data.success && (data.sold_count > 0 || data.purged_count > 0)) {
                router.reload({ only: ['hotspotVouchers', 'hotspotSales'], preserveScroll: true });
            }
        } catch (err) {
            console.error('Failed to load hotspot voucher MAC addresses', err);
        }
    };

    const resolveVoucherMacAddress = (voucher) => {
        const mac = voucherMacMap[voucher.id] ?? voucher.mac_address;
        return mac || '-';
    };

    useEffect(() => {
        fetchHotspotVoucherMacAddresses();
        const interval = setInterval(fetchHotspotVoucherMacAddresses, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleSyncHotspot = (routerId) => {
        if (!routerId) {
            showToast('Pilih router terlebih dahulu untuk sinkronisasi profil hotspot.', 'warning');
            return;
        }
        setIsSyncingHotspot(true);
        router.post('/admin/hotspot/sync-profiles', { router_id: routerId }, {
            onSuccess: () => setIsSyncingHotspot(false),
            onError: () => setIsSyncingHotspot(false),
        });
    };

    const handleGenerateVouchersSubmit = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const payload = Object.fromEntries(data.entries());

        setIsGeneratingVouchers(true);
        router.post('/admin/hotspot/generate-vouchers', payload, {
            onSuccess: () => {
                setIsGeneratingVouchers(false);
                setShowGenerateVoucherModal(false);
            },
            onError: () => setIsGeneratingVouchers(false),
        });
    };

    const generateDefaultComment = (routerId) => {
        const routerName = routers.find((r) => String(r.id) === String(routerId))?.name || 'Router';
        const cleanRouterName = routerName.replace(/[^a-zA-Z0-9]/g, '');
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `${cleanRouterName}_${dd}${mm}${yyyy}_${hh}${min}`;
    };

    const fetchHotspotServers = async (routerId) => {
        setGenerateServerDnsName('');
        if (!routerId) {
            setHotspotServers([]);
            return;
        }
        setIsLoadingServers(true);
        try {
            const response = await fetch(`/admin/hotspot/get-servers?router_id=${routerId}`, {
                method: 'GET',
                headers: { Accept: 'application/json' },
            });
            const result = await response.json();
            if (result.success) {
                setHotspotServers(result.servers || []);
            } else {
                showToast(result.message || 'Gagal mengambil daftar server hotspot.', 'error');
                setHotspotServers([]);
            }
        } catch {
            showToast('Terjadi kesalahan saat menghubungi server.', 'error');
            setHotspotServers([]);
        } finally {
            setIsLoadingServers(false);
        }
    };

    const handlePrintVouchersSubmit = (e) => {
        e.preventDefault();
        if (!printRouterId || !printComment) {
            showToast('Pilih router dan informasi tambahan terlebih dahulu.', 'warning');
            return;
        }
        const url = `/admin/hotspot/print-vouchers?router_id=${printRouterId}&comment=${encodeURIComponent(printComment)}&login_url=${encodeURIComponent(printLoginUrl)}&color_palette=${printColorPalette}`;
        window.open(url, '_blank');
        setShowPrintVouchersModal(false);
    };

    const handleBulkDeleteVouchersSubmit = (e) => {
        e.preventDefault();
        if (!bulkDeleteVouchersRouterId || !bulkDeleteVouchersComment) {
            showToast('Pilih router dan informasi tambahan terlebih dahulu.', 'warning');
            return;
        }
        if (!confirm(`Apakah Anda yakin ingin menghapus massal voucher dengan Informasi Tambahan "${bulkDeleteVouchersComment}"? Tindakan ini akan menghapus akun dari Mikrotik dan basis data lokal.`)) {
            return;
        }
        router.post('/admin/hotspot/bulk-delete-vouchers', {
            router_id: bulkDeleteVouchersRouterId,
            comment: bulkDeleteVouchersComment,
        }, {
            onSuccess: () => {
                setShowBulkDeleteVouchersModal(false);
                setBulkDeleteVouchersRouterId('');
                setBulkDeleteVouchersComment('');
            },
        });
    };

    const handleSellVoucherSubmit = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const payload = Object.fromEntries(data.entries());

        setIsSellingVoucher(true);
        router.post('/admin/hotspot/sell-voucher', payload, {
            onSuccess: () => {
                setIsSellingVoucher(false);
                setShowSellVoucherModal(false);
                setSelectedVoucherForSale(null);
            },
            onError: () => setIsSellingVoucher(false),
        });
    };

    const handleDeleteVoucher = (voucherId) => {
        if (!confirm('Apakah Anda yakin ingin menghapus voucher ini? Tindakan ini akan menghapus akun user dari Mikrotik dan basis data lokal.')) return;
        router.post('/admin/hotspot/delete-voucher', { id: voucherId });
    };

    const openMemberModal = (member = null) => {
        setEditingMember(member);
        setShowMemberModal(true);
    };

    const closeMemberModal = () => {
        setShowMemberModal(false);
    };

    const closeDeleteMemberModal = () => {
        setShowDeleteMemberModal(false);
        setTimeout(() => setMemberToDelete(null), 300);
    };

    const closeSellVoucherModal = () => {
        setShowSellVoucherModal(false);
        setSelectedVoucherForSale(null);
    };

    const closeGenerateVoucherModal = () => {
        setShowGenerateVoucherModal(false);
        setGeneratePackageId('');
        setGenerateBasePrice(0);
        setGenerateAgentProfit(0);
    };

    const closePrintVouchersModal = () => {
        setShowPrintVouchersModal(false);
    };

    const closeBulkDeleteVouchersModal = () => {
        setShowBulkDeleteVouchersModal(false);
    };

    const handleSaveMember = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const payload = Object.fromEntries(data.entries());

        router.post('/admin/customers/save', payload, {
            onSuccess: () => {
                setShowMemberModal(false);
                setEditingMember(null);
            },
        });
    };

    const handleDeleteMember = (member) => {
        setMemberToDelete(member);
        setDeleteMode('local_only');
        setShowDeleteMemberModal(true);
    };

    const confirmDeleteMember = () => {
        if (!memberToDelete) return;
        router.post('/admin/customers/delete', {
            id: memberToDelete.id,
            mode: deleteMode,
        }, {
            onSuccess: () => {
                setShowDeleteMemberModal(false);
                setTimeout(() => setMemberToDelete(null), 300);
            },
        });
    };

    const filteredHotspotMembers = customers.filter((cust) => {
        const term = searchTerm.toLowerCase();
        return (
            cust.name.toLowerCase().includes(term) ||
            cust.username.toLowerCase().includes(term) ||
            cust.phone_number?.toLowerCase().includes(term) ||
            (cust.package && cust.package.name.toLowerCase().includes(term))
        );
    });

    const totalHotspotMemberPages = Math.ceil(filteredHotspotMembers.length / customerPageSize) || 1;
    const visibleHotspotMemberPages = getVisiblePages(hotspotMemberPage, totalHotspotMemberPages);
    const paginatedHotspotMembers = filteredHotspotMembers.slice(
        (hotspotMemberPage - 1) * customerPageSize,
        hotspotMemberPage * customerPageSize,
    );

    const filteredHotspotVouchers = hotspotVouchers.filter((v) => {
        const term = searchTerm.toLowerCase();
        const matchSearch = !term ||
            v.username.toLowerCase().includes(term) ||
            (v.comment && v.comment.toLowerCase().includes(term)) ||
            (v.server && v.server.toLowerCase().includes(term));
        const matchRouter = voucherRouterFilter === '' || String(v.router_id) === String(voucherRouterFilter);
        const matchStatus = voucherStatusFilter === '' || v.status === voucherStatusFilter;
        const matchComment = voucherCommentFilter === '' || v.comment === voucherCommentFilter;
        return matchSearch && matchRouter && matchStatus && matchComment;
    });

    const availableVoucherComments = [...new Set(
        hotspotVouchers
            .filter((v) => voucherRouterFilter === '' || String(v.router_id) === String(voucherRouterFilter))
            .map((v) => v.comment)
            .filter(Boolean),
    )].sort((a, b) => a.localeCompare(b, 'id'));

    const totalVoucherPages = Math.ceil(filteredHotspotVouchers.length / voucherPageSize) || 1;
    const paginatedHotspotVouchers = filteredHotspotVouchers.slice(
        (voucherPage - 1) * voucherPageSize,
        voucherPage * voucherPageSize,
    );

    const filteredActiveSessions = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        return activeSessions.filter((session) => {
            const matchRouter = sessionRouterFilter === ''
                || String(session.router_id || '') === String(sessionRouterFilter);
            if (!matchRouter) {
                return false;
            }

            if (!term) {
                return true;
            }

            return [
                session.username,
                session.address,
                session.mac_address,
                session.server,
                session.router_name,
                session.login_by,
            ].some((value) => String(value || '').toLowerCase().includes(term));
        });
    }, [activeSessions, searchTerm, sessionRouterFilter]);

    const totalSessionPages = Math.ceil(filteredActiveSessions.length / sessionPageSize) || 1;
    const paginatedActiveSessions = filteredActiveSessions.slice(
        (sessionPage - 1) * sessionPageSize,
        sessionPage * sessionPageSize,
    );

    const searchPlaceholder = hotspotSubTab === 'vouchers'
        ? 'Cari kode voucher...'
        : hotspotSubTab === 'sessions'
            ? 'Cari username, IP, atau MAC...'
            : hotspotSubTab === 'members'
                ? 'Cari member hotspot...'
                : 'Cari transaksi...';

    const uniqueCommentsForPrintRouter = [...new Set(
        hotspotVouchers
            .filter((v) => String(v.router_id) === String(printRouterId) && v.comment)
            .map((v) => v.comment),
    )];

    const uniqueCommentsForRouter = [...new Set(
        hotspotVouchers
            .filter((v) => String(v.router_id) === String(bulkDeleteVouchersRouterId) && v.comment)
            .map((v) => v.comment),
    )];

    return (
        <>
            <AdminPageCard
                icon={Radio}
                accent="violet"
                title="Manajemen Hotspot & Voucher"
                themeCard={themeCard}
                isDarkMode={isDarkMode}
                themeTextTitle={themeTextTitle}
                themeTextDesc={themeTextDesc}
                headerBottom={(
                    <div className="flex flex-wrap gap-2 w-full">
                        <button
                            type="button"
                            onClick={() => setHotspotSubTab('vouchers')}
                            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${hotspotSubTab === 'vouchers' ? 'bg-emerald-500 text-white shadow-xs' : `${isDarkMode ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800' : 'bg-zinc-100 text-zinc-650 hover:bg-zinc-200 border border-zinc-200'}`}`}
                        >
                            Voucher Hotspot
                        </button>
                        <button
                            type="button"
                            onClick={() => setHotspotSubTab('sessions')}
                            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${hotspotSubTab === 'sessions' ? 'bg-sky-500 text-white shadow-xs' : `${isDarkMode ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800' : 'bg-zinc-100 text-zinc-650 hover:bg-zinc-200 border border-zinc-200'}`}`}
                        >
                            Sesi Aktif
                        </button>
                        <button
                            type="button"
                            onClick={() => setHotspotSubTab('members')}
                            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${hotspotSubTab === 'members' ? 'bg-emerald-500 text-white shadow-xs' : `${isDarkMode ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800' : 'bg-zinc-100 text-zinc-650 hover:bg-zinc-200 border border-zinc-200'}`}`}
                        >
                            Member Hotspot
                        </button>
                        <button
                            type="button"
                            onClick={() => setHotspotSubTab('sales')}
                            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${hotspotSubTab === 'sales' ? 'bg-emerald-500 text-white shadow-xs' : `${isDarkMode ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800' : 'bg-zinc-100 text-zinc-650 hover:bg-zinc-200 border border-zinc-200'}`}`}
                        >
                            Laporan Penjualan
                        </button>
                        <button
                            type="button"
                            onClick={() => setHotspotSubTab('agents')}
                            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${hotspotSubTab === 'agents' ? 'bg-violet-500 text-white shadow-xs' : `${isDarkMode ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800' : 'bg-zinc-100 text-zinc-650 hover:bg-zinc-200 border border-zinc-200'}`}`}
                        >
                            Bagi Hasil Agen
                        </button>
                    </div>
                )}
            >
                {(hotspotSubTab === 'vouchers' || hotspotSubTab === 'sessions' || hotspotSubTab === 'members') && (
                    <div className="relative">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${themeTextDesc}`} />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                        />
                    </div>
                )}

                {hotspotSubTab === 'vouchers' ? (
                    <div className="space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:flex-1 lg:max-w-3xl">
                                <select
                                    value={voucherRouterFilter}
                                    onChange={(e) => setVoucherRouterFilter(e.target.value)}
                                    className={`w-full min-w-0 px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                                >
                                    <option value="">Semua Router</option>
                                    {routers.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={voucherStatusFilter}
                                    onChange={(e) => setVoucherStatusFilter(e.target.value)}
                                    className={`w-full min-w-0 px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                                >
                                    <option value="">Semua Status</option>
                                    <option value="unused">Belum Terpakai</option>
                                    <option value="sold">Terjual</option>
                                    <option value="expired">Kedaluwarsa</option>
                                </select>
                                <select
                                    value={voucherCommentFilter}
                                    onChange={(e) => setVoucherCommentFilter(e.target.value)}
                                    className={`w-full min-w-0 px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                                >
                                    <option value="">Semua Info Tambahan</option>
                                    {availableVoucherComments.map((comment) => (
                                        <option key={comment} value={comment}>{comment}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-wrap gap-2 w-full lg:w-auto justify-end shrink-0">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowGenerateVoucherModal(true);
                                        setGenerateRouterId('');
                                        setHotspotServers([]);
                                        setGenerateComment('');
                                        setGenerateServerDnsName('');
                                    }}
                                    title="Generate Voucher"
                                    className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center shadow-xs"
                                >
                                    <TicketPlus className="w-4 h-4" />
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPrintVouchersModal(true);
                                        setPrintRouterId('');
                                        setPrintComment('');
                                        setPrintLoginUrl('http://10.0.0.1');
                                    }}
                                    title="Cetak Massal"
                                    className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center shadow-xs"
                                >
                                    <Printer className="w-4 h-4" />
                                </button>

                                <div className="relative inline-flex items-center justify-center" title={isSyncingHotspot ? 'Sinkronisasi...' : 'Sync Profil Hotspot'}>
                                    <select
                                        id="sync-router-select"
                                        defaultValue=""
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleSyncHotspot(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                        disabled={isSyncingHotspot}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        <option value="" disabled>Sync Profil Hotspot</option>
                                        {routers.map((r) => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                    <div className={`w-9 h-9 flex items-center justify-center rounded-xl border ${
                                        isDarkMode
                                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                            : 'bg-amber-50 border-amber-200 text-amber-600'
                                    }`}>
                                        <RefreshCw className={`w-4 h-4 ${isSyncingHotspot ? 'animate-spin' : ''}`} />
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowBulkDeleteVouchersModal(true);
                                        setBulkDeleteVouchersRouterId('');
                                        setBulkDeleteVouchersComment('');
                                    }}
                                    title="Hapus Massal"
                                    className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center shadow-xs"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="admin-table-scroll">
                            <table>
                                <thead>
                                    <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                        <th className="py-3 px-2">Router</th>
                                        <th className="py-3 px-2">Hotspot Server</th>
                                        <th className="py-3 px-2">Profil Mikrotik</th>
                                        <th className="py-3 px-2">Kode / Username</th>
                                        <th className="py-3 px-2">Harga</th>
                                        <th className="py-3 px-2">Masa Aktif</th>
                                        <th className="py-3 px-2">Status</th>
                                        <th className="py-3 px-2">MAC Address</th>
                                        <th className="py-3 px-2">Terjual Pada</th>
                                        <th className="py-3 px-2">Info Tambahan</th>
                                        <th className="py-3 px-2 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/20 text-xs">
                                    {paginatedHotspotVouchers.length === 0 ? (
                                        <tr>
                                            <td colSpan="11" className={`py-8 text-center font-medium ${themeTextDesc}`}>Tidak ada data voucher ditemukan.</td>
                                        </tr>
                                    ) : paginatedHotspotVouchers.map((v) => (
                                        <tr key={v.id} className={`${themeTextSub} hover:bg-zinc-900/10`}>
                                            <td className="py-3 px-2 font-semibold">{v.router ? v.router.name : '-'}</td>
                                            <td className="py-3 px-2 font-semibold font-mono">{v.server || 'all'}</td>
                                            <td className="py-3 px-2 font-mono">{v.mikrotik_profile}</td>
                                            <td className={`py-3 px-2 font-mono ${themeTextTitle}`}>
                                                <div className="font-bold">{v.username}</div>
                                                {v.password && v.password !== v.username && (
                                                    <div className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                                                        Pass: <span className="font-mono">{v.password}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-2 font-bold text-emerald-500">{formatRupiah(v.price)}</td>
                                            <td className="py-3 px-2 font-mono">{v.validity || '-'}</td>
                                            <td className="py-3 px-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    v.status === 'unused' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                    v.status === 'sold' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                    'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                                }`}>
                                                    {v.status === 'unused' ? 'Belum Terpakai' :
                                                     v.status === 'sold' ? 'Terjual' : 'Kedaluwarsa'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-2 font-mono text-[11px]">{resolveVoucherMacAddress(v)}</td>
                                            <td className="py-3 px-2 font-mono">{v.sold_at ? new Date(v.sold_at).toLocaleString('id-ID') : '-'}</td>
                                            <td className="py-3 px-2 font-mono text-zinc-500">{v.comment || '-'}</td>
                                            <td className="py-3 px-2 text-right">
                                                <div className="admin-table-actions">
                                                    {v.status === 'unused' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedVoucherForSale(v);
                                                                setShowSellVoucherModal(true);
                                                            }}
                                                            title="Jual Voucher"
                                                            className="inline-block p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors"
                                                        >
                                                            <ShoppingCart className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteVoucher(v.id)}
                                                        className="inline-block p-1 text-rose-500 hover:text-rose-400 cursor-pointer transition-colors"
                                                        title="Hapus Voucher"
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

                        {totalVoucherPages > 1 && (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-zinc-800/10 text-xs">
                                <span className={`text-center sm:text-left ${themeTextSub}`}>Halaman {voucherPage} dari {totalVoucherPages} ({filteredHotspotVouchers.length} voucher)</span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setVoucherPage((p) => Math.max(1, p - 1))}
                                        disabled={voucherPage === 1}
                                        className={`px-3 py-1 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 disabled:opacity-30 hover:bg-zinc-100'}`}
                                    >
                                        Sebelumnya
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setVoucherPage((p) => Math.min(totalVoucherPages, p + 1))}
                                        disabled={voucherPage === totalVoucherPages}
                                        className={`px-3 py-1 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 disabled:opacity-30 hover:bg-zinc-100'}`}
                                    >
                                        Berikutnya
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : hotspotSubTab === 'sessions' ? (
                    <div className="space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
                            <div className="space-y-2 flex-1">
                                <p className={`text-[11px] leading-relaxed ${themeTextSub}`}>
                                    Daftar pengguna hotspot yang sedang online di RouterOS (<span className="font-mono">IP → Hotspot → Active</span>).
                                    Data diperbarui otomatis setiap 3 detik.
                                </p>
                                <select
                                    value={sessionRouterFilter}
                                    onChange={(e) => setSessionRouterFilter(e.target.value)}
                                    className={`w-full max-w-xs px-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${themeInput}`}
                                >
                                    <option value="">Semua Router</option>
                                    {routers.map((r) => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
                                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border ${isDarkMode ? 'border-sky-500/20 bg-sky-500/10 text-sky-300' : 'border-sky-200 bg-sky-50 text-sky-700'}`}>
                                    {filteredActiveSessions.length} sesi aktif
                                </span>
                                <button
                                    type="button"
                                    onClick={() => fetchActiveSessions()}
                                    disabled={isLoadingSessions}
                                    title="Muat ulang sesi aktif"
                                    className={`p-2 border rounded-xl cursor-pointer inline-flex items-center justify-center disabled:opacity-50 ${isDarkMode ? 'border-zinc-800 text-sky-400 hover:bg-zinc-900' : 'border-zinc-200 text-sky-600 hover:bg-sky-50'}`}
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoadingSessions ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {sessionLoadError && (
                            <div className={`text-[11px] font-semibold rounded-xl border px-3 py-2 ${isDarkMode ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                                {sessionLoadError}
                            </div>
                        )}

                        {sessionErrors.length > 0 && (
                            <div className={`text-[11px] rounded-xl border px-3 py-2 space-y-1 ${isDarkMode ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                                {sessionErrors.map((error) => (
                                    <p key={`${error.router_id}-${error.message}`}>
                                        Gagal memuat router <span className="font-semibold">{error.router_name}</span>: {error.message}
                                    </p>
                                ))}
                            </div>
                        )}

                        <div className="admin-table-scroll">
                            <table>
                                <thead>
                                    <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                        <th className="py-3 px-2">Router</th>
                                        <th className="py-3 px-2">Username</th>
                                        <th className="py-3 px-2">Hotspot Server</th>
                                        <th className="py-3 px-2">IP Address</th>
                                        <th className="py-3 px-2">MAC Address</th>
                                        <th className="py-3 px-2">Uptime</th>
                                        <th className="py-3 px-2">Sisa Waktu</th>
                                        <th className="py-3 px-2">Idle</th>
                                        <th className="py-3 px-2">Download</th>
                                        <th className="py-3 px-2">Upload</th>
                                        <th className="py-3 px-2">Login By</th>
                                        <th className="py-3 px-2 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/20 text-xs">
                                    {isLoadingSessions && paginatedActiveSessions.length === 0 ? (
                                        <tr>
                                            <td colSpan={12} className={`py-10 text-center ${themeTextDesc}`}>
                                                <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" />
                                                Memuat sesi aktif hotspot...
                                            </td>
                                        </tr>
                                    ) : paginatedActiveSessions.length === 0 ? (
                                        <tr>
                                            <td colSpan={12} className={`py-10 text-center ${themeTextDesc}`}>
                                                <Wifi className={`w-8 h-8 mx-auto mb-2 ${isDarkMode ? 'text-sky-400/70' : 'text-sky-500/70'}`} />
                                                <p className="font-semibold">Tidak ada sesi hotspot aktif.</p>
                                                <p className="text-[10px] mt-1">Pengguna akan muncul di sini setelah login ke hotspot.</p>
                                            </td>
                                        </tr>
                                    ) : paginatedActiveSessions.map((session) => {
                                        const sessionKey = `${session.router_id}:${session.username}:${session.address || ''}`;
                                        const isKicking = kickingSessionKey === sessionKey;

                                        return (
                                            <tr key={sessionKey} className={`${themeTextSub} hover:bg-zinc-900/10`}>
                                                <td className="py-3 px-2 font-semibold">{session.router_name || '-'}</td>
                                                <td className={`py-3 px-2 font-mono font-bold ${themeTextTitle}`}>{session.username || '-'}</td>
                                                <td className="py-3 px-2 font-mono">{session.server || 'all'}</td>
                                                <td className="py-3 px-2 font-mono">{session.address || '-'}</td>
                                                <td className="py-3 px-2 font-mono text-[11px]">{session.mac_address || '-'}</td>
                                                <td className="py-3 px-2 font-mono">{displayRouterOsDuration(session.uptime)}</td>
                                                <td className="py-3 px-2 font-mono">{displayRouterOsDuration(session.session_time_left)}</td>
                                                <td className="py-3 px-2 font-mono">{displayRouterOsDuration(session.idle_time)}</td>
                                                <td className="py-3 px-2 font-mono text-sky-500">{formatBytes(session.bytes_out)}</td>
                                                <td className="py-3 px-2 font-mono text-emerald-500">{formatBytes(session.bytes_in)}</td>
                                                <td className="py-3 px-2 font-mono text-[10px]">{session.login_by || '-'}</td>
                                                <td className="py-3 px-2 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleKickActiveSession(session)}
                                                        disabled={isKicking}
                                                        title="Putuskan Sesi"
                                                        className="inline-block p-1 text-rose-500 hover:text-rose-400 cursor-pointer transition-colors disabled:opacity-50"
                                                    >
                                                        <LogOut className={`w-4 h-4 ${isKicking ? 'animate-pulse' : ''}`} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {totalSessionPages > 1 && (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-zinc-800/10 text-xs">
                                <span className={`text-center sm:text-left ${themeTextSub}`}>
                                    Halaman {sessionPage} dari {totalSessionPages} ({filteredActiveSessions.length} sesi)
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
                                        disabled={sessionPage === 1}
                                        className={`px-3 py-1 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 disabled:opacity-30 hover:bg-zinc-100'}`}
                                    >
                                        Sebelumnya
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSessionPage((p) => Math.min(totalSessionPages, p + 1))}
                                        disabled={sessionPage === totalSessionPages}
                                        className={`px-3 py-1 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 disabled:opacity-30 hover:bg-zinc-100'}`}
                                    >
                                        Berikutnya
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : hotspotSubTab === 'sales' ? (
                    <div className="space-y-6">
                        {(() => {
                            const totalSalesRevenue = hotspotSales.reduce((acc, sale) => acc + parseFloat(sale.price || 0), 0);
                            const totalSalesCount = hotspotSales.length;
                            const averageSalePrice = totalSalesCount > 0 ? (totalSalesRevenue / totalSalesCount) : 0;
                            return (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className={`border rounded-2xl p-4 flex flex-col justify-between ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-emerald-50/50 border-emerald-100'}`}>
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-emerald-700'}`}>Total Pendapatan Hotspot</span>
                                            <CreditCard className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                                        </div>
                                        <div className="mt-3">
                                            <p className={`text-2xl font-extrabold tracking-tight leading-none ${themeTextTitle}`}>{formatRupiah(totalSalesRevenue)}</p>
                                            <span className={`text-[10px] font-bold block mt-1 ${themeTextSub}`}>Akumulasi semua transaksi hotspot</span>
                                        </div>
                                    </div>

                                    <div className={`border rounded-2xl p-4 flex flex-col justify-between ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-blue-50/50 border-blue-100'}`}>
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-blue-700'}`}>Voucher Terjual</span>
                                            <Users className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                        </div>
                                        <div className="mt-3">
                                            <p className={`text-2xl font-extrabold tracking-tight leading-none ${themeTextTitle}`}>{totalSalesCount} Voucher</p>
                                            <span className={`text-[10px] font-bold block mt-1 ${themeTextSub}`}>Jumlah voucher tercatat di database</span>
                                        </div>
                                    </div>

                                    <div className={`border rounded-2xl p-4 flex flex-col justify-between ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-amber-50/50 border-amber-100'}`}>
                                        <div className="flex justify-between items-start">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-400' : 'text-amber-700'}`}>Rata-rata Transaksi</span>
                                            <Activity className={`w-4 h-4 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                                        </div>
                                        <div className="mt-3">
                                            <p className={`text-2xl font-extrabold tracking-tight leading-none ${themeTextTitle}`}>{formatRupiah(averageSalePrice)}</p>
                                            <span className={`text-[10px] font-bold block mt-1 ${themeTextSub}`}>Nilai rata-rata per penjualan</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {(() => {
                            const finalChartData = buildHotspotDailyRevenueChartData(hotspotSales);

                            return (
                                <div className={`border rounded-2xl p-5 ${themeInnerWidget} space-y-3`}>
                                    <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Grafik Tren Pendapatan Harian (10 Hari Terakhir)</h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                            <AreaChart data={finalChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#27272a' : '#e4e4e7'} />
                                                <XAxis dataKey="date" stroke={isDarkMode ? '#a1a1aa' : '#71717a'} fontSize={10} tickLine={false} />
                                                <YAxis stroke={isDarkMode ? '#a1a1aa' : '#71717a'} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => formatRupiah(v)} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderColor: isDarkMode ? '#27272a' : '#e4e4e7', borderRadius: '12px' }}
                                                    labelStyle={{ color: isDarkMode ? '#ffffff' : '#18181b', fontWeight: 'bold', fontSize: '12px' }}
                                                    itemStyle={{ color: '#10b981', fontSize: '12px' }}
                                                    formatter={(value) => [formatRupiah(value), 'Pendapatan']}
                                                />
                                                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="space-y-3">
                            <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Riwayat Transaksi Penjualan</h3>
                            <div className="admin-table-scroll">
                                <table>
                                    <thead>
                                        <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                            <th className="py-3 px-2">Router</th>
                                            <th className="py-3 px-2">Voucher / Username</th>
                                            <th className="py-3 px-2">Paket</th>
                                            <th className="py-3 px-2">Harga</th>
                                            <th className="py-3 px-2">Agen</th>
                                            <th className="py-3 px-2">Bagi Hasil</th>
                                            <th className="py-3 px-2">Metode Pembayaran</th>
                                            <th className="py-3 px-2">Waktu Penjualan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/20 text-xs">
                                        {(() => {
                                            const totalSalesPages = Math.ceil(hotspotSales.length / salesPageSize) || 1;
                                            const paginatedSales = hotspotSales.slice(
                                                (salesPage - 1) * salesPageSize,
                                                salesPage * salesPageSize,
                                            );

                                            if (paginatedSales.length === 0) {
                                                return (
                                                    <tr>
                                                        <td colSpan="8" className={`py-8 text-center font-medium ${themeTextDesc}`}>Belum ada data penjualan tercatat.</td>
                                                    </tr>
                                                );
                                            }

                                            return paginatedSales.map((sale) => (
                                                <tr key={sale.id} className={`${themeTextSub} hover:bg-zinc-900/10`}>
                                                    <td className="py-3 px-2 font-semibold">{sale.router ? sale.router.name : '-'}</td>
                                                    <td className={`py-3 px-2 font-mono font-bold ${themeTextTitle}`}>{sale.username}</td>
                                                    <td className="py-3 px-2">{sale.package_name || '-'}</td>
                                                    <td className="py-3 px-2 font-bold text-emerald-500">{formatRupiah(sale.price)}</td>
                                                    <td className="py-3 px-2">
                                                        {sale.sold_by?.name || (
                                                            <span className={`text-[10px] ${themeTextDesc}`}>Otomatis</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-2 font-mono text-[10px]">
                                                        {Number(sale.agent_amount || 0) > 0 ? (
                                                            <span className="text-violet-500 font-bold">
                                                                {formatRupiah(sale.agent_amount)}
                                                                <span className={`block ${themeTextDesc}`}>{sale.commission_percent || 0}%</span>
                                                            </span>
                                                        ) : (
                                                            <span className={themeTextDesc}>—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            sale.payment_method === 'Cash' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                        }`}>
                                                            {sale.payment_method}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-2 font-mono">{sale.created_at ? new Date(sale.created_at).toLocaleString('id-ID') : '-'}</td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>

                            {(() => {
                                const totalSalesPages = Math.ceil(hotspotSales.length / salesPageSize) || 1;
                                if (totalSalesPages > 1) {
                                    return (
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-zinc-800/10 text-xs">
                                            <span className={`text-center sm:text-left ${themeTextSub}`}>Halaman {salesPage} dari {totalSalesPages} ({hotspotSales.length} transaksi)</span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
                                                    disabled={salesPage === 1}
                                                    className={`px-3 py-1 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 disabled:opacity-30 hover:bg-zinc-100'}`}
                                                >
                                                    Sebelumnya
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setSalesPage((p) => Math.min(totalSalesPages, p + 1))}
                                                    disabled={salesPage === totalSalesPages}
                                                    className={`px-3 py-1 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 disabled:opacity-30 hover:bg-zinc-100'}`}
                                                >
                                                    Berikutnya
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </div>
                ) : hotspotSubTab === 'agents' ? (
                    <div className="space-y-4">
                        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 flex-1">
                                <div className="flex flex-col gap-1">
                                    <label className={`text-[10px] font-bold uppercase ${themeLabel}`}>Dari Tanggal</label>
                                    <input
                                        type="date"
                                        value={agentDateFrom}
                                        onChange={(e) => setAgentDateFrom(e.target.value)}
                                        className={`px-3 py-2 border rounded-xl text-xs ${themeInput}`}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className={`text-[10px] font-bold uppercase ${themeLabel}`}>Sampai Tanggal</label>
                                    <input
                                        type="date"
                                        value={agentDateTo}
                                        onChange={(e) => setAgentDateTo(e.target.value)}
                                        className={`px-3 py-2 border rounded-xl text-xs ${themeInput}`}
                                    />
                                </div>
                                {!isOperatorView && (
                                    <div className="flex flex-col gap-1 sm:col-span-2">
                                        <label className={`text-[10px] font-bold uppercase ${themeLabel}`}>Filter Agen</label>
                                        <select
                                            value={agentFilterId}
                                            onChange={(e) => setAgentFilterId(e.target.value)}
                                            className={`px-3 py-2 border rounded-xl text-xs ${themeInput}`}
                                        >
                                            <option value="">Semua Agen</option>
                                            {hotspotAgents.map((agent) => (
                                                <option key={agent.id} value={agent.id}>
                                                    {agent.name}
                                                    {agent.hotspot_commission_percent != null ? ` (${agent.hotspot_commission_percent}%)` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={fetchAgentReport}
                                disabled={isLoadingAgentReport}
                                title="Muat ulang laporan"
                                className={`p-2 border rounded-xl cursor-pointer inline-flex items-center justify-center disabled:opacity-50 shrink-0 ${isDarkMode ? 'border-zinc-800 text-violet-400 hover:bg-zinc-900' : 'border-zinc-200 text-violet-600 hover:bg-violet-50'}`}
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoadingAgentReport ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {canManageCommissionSettings && (
                            <div className={`border rounded-2xl p-4 ${themeInnerWidget} flex flex-col sm:flex-row sm:items-end gap-3`}>
                                <div className="flex-1 space-y-1">
                                    <p className={`text-xs font-bold ${themeTextTitle}`}>Persentase Bagi Hasil Default (Operator Hotspot)</p>
                                    <p className={`text-[10px] ${themeTextSub}`}>
                                        Dipakai saat agen tidak punya persentase khusus di menu User. Penjualan otomatis tidak mendapat komisi agen.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={defaultCommissionInput}
                                        onChange={(e) => setDefaultCommissionInput(e.target.value)}
                                        className={`w-24 px-3 py-2 border rounded-lg text-xs font-mono ${themeInput}`}
                                    />
                                    <span className={`text-xs font-bold ${themeTextSub}`}>%</span>
                                    <button
                                        type="button"
                                        onClick={handleSaveDefaultCommission}
                                        disabled={isSavingCommissionSettings}
                                        title="Simpan persentase default"
                                        className="p-2 bg-violet-500 hover:bg-violet-600 text-white rounded-lg cursor-pointer inline-flex items-center justify-center disabled:opacity-50"
                                    >
                                        <Save className={`w-4 h-4 ${isSavingCommissionSettings ? 'animate-pulse' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {agentReportError && (
                            <div className={`text-[11px] font-semibold rounded-xl border px-3 py-2 ${isDarkMode ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                                {agentReportError}
                            </div>
                        )}

                        {isLoadingAgentReport && !agentReport ? (
                            <div className={`py-12 text-center text-xs ${themeTextDesc}`}>
                                <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" />
                                Memuat laporan bagi hasil...
                            </div>
                        ) : agentReport && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                    <div className={`border rounded-2xl p-4 ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-emerald-50/50 border-emerald-100'}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${themeTextSub}`}>Total Penjualan</span>
                                        <p className={`text-2xl font-extrabold mt-2 ${themeTextTitle}`}>{formatRupiah(agentReport.summary?.gross_revenue || 0)}</p>
                                        <span className={`text-[10px] font-bold block mt-1 ${themeTextSub}`}>{agentReport.summary?.sale_count || 0} transaksi</span>
                                    </div>
                                    <div className={`border rounded-2xl p-4 ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-violet-50/50 border-violet-100'}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${themeTextSub}`}>Bagian Agen</span>
                                        <p className="text-2xl font-extrabold mt-2 text-violet-500">{formatRupiah(agentReport.summary?.agent_total || 0)}</p>
                                        <span className={`text-[10px] font-bold block mt-1 ${themeTextSub}`}>Total komisi agen</span>
                                    </div>
                                    <div className={`border rounded-2xl p-4 ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-sky-50/50 border-sky-100'}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${themeTextSub}`}>Bagian Pemilik</span>
                                        <p className="text-2xl font-extrabold mt-2 text-sky-500">{formatRupiah(agentReport.summary?.owner_total || 0)}</p>
                                        <span className={`text-[10px] font-bold block mt-1 ${themeTextSub}`}>Setelah bagi hasil agen</span>
                                    </div>
                                    <div className={`border rounded-2xl p-4 ${isDarkMode ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-amber-50/50 border-amber-100'}`}>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${themeTextSub}`}>Tanpa Agen</span>
                                        <p className="text-2xl font-extrabold mt-2 text-amber-500">{formatRupiah(agentReport.summary?.unattributed_revenue || 0)}</p>
                                        <span className={`text-[10px] font-bold block mt-1 ${themeTextSub}`}>Penjualan otomatis / tanpa pencatat</span>
                                    </div>
                                </div>

                                {!isOperatorView && (agentReport.agents?.length || 0) > 0 && (
                                    <div className="space-y-3">
                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Ringkasan per Agen</h3>
                                        <div className="admin-table-scroll">
                                            <table>
                                                <thead>
                                                    <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                                        <th className="py-3 px-2">Agen</th>
                                                        <th className="py-3 px-2">Transaksi</th>
                                                        <th className="py-3 px-2">Omzet</th>
                                                        <th className="py-3 px-2">Komisi Agen</th>
                                                        <th className="py-3 px-2">Bagian Pemilik</th>
                                                        <th className="py-3 px-2">Rata-rata %</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-800/20 text-xs">
                                                    {agentReport.agents.map((agent) => (
                                                        <tr key={agent.agent_id} className={`${themeTextSub} hover:bg-zinc-900/10`}>
                                                            <td className={`py-3 px-2 font-bold ${themeTextTitle}`}>{agent.agent_name}</td>
                                                            <td className="py-3 px-2 font-mono">{agent.sale_count}</td>
                                                            <td className="py-3 px-2 font-bold text-emerald-500">{formatRupiah(agent.gross_revenue)}</td>
                                                            <td className="py-3 px-2 font-bold text-violet-500">{formatRupiah(agent.agent_amount)}</td>
                                                            <td className="py-3 px-2 font-bold text-sky-500">{formatRupiah(agent.owner_amount)}</td>
                                                            <td className="py-3 px-2 font-mono">{agent.average_commission_percent}%</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>
                                        {isOperatorView ? 'Riwayat Penjualan Saya' : 'Detail Transaksi Bagi Hasil'}
                                    </h3>
                                    <div className="admin-table-scroll">
                                        <table>
                                            <thead>
                                                <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                                    <th className="py-3 px-2">Waktu</th>
                                                    <th className="py-3 px-2">Voucher</th>
                                                    <th className="py-3 px-2">Paket</th>
                                                    <th className="py-3 px-2">Harga</th>
                                                    {!isOperatorView && <th className="py-3 px-2">Agen</th>}
                                                    <th className="py-3 px-2">Komisi</th>
                                                    <th className="py-3 px-2">Bagian Pemilik</th>
                                                    <th className="py-3 px-2">Metode</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/20 text-xs">
                                                {(() => {
                                                    const sales = agentReport.sales || [];
                                                    const totalPages = Math.ceil(sales.length / agentReportPageSize) || 1;
                                                    const paginated = sales.slice(
                                                        (agentReportPage - 1) * agentReportPageSize,
                                                        agentReportPage * agentReportPageSize,
                                                    );

                                                    if (paginated.length === 0) {
                                                        return (
                                                            <tr>
                                                                <td colSpan={isOperatorView ? 7 : 8} className={`py-8 text-center ${themeTextDesc}`}>
                                                                    Tidak ada penjualan pada periode ini.
                                                                </td>
                                                            </tr>
                                                        );
                                                    }

                                                    return paginated.map((sale) => (
                                                        <tr key={sale.id} className={`${themeTextSub} hover:bg-zinc-900/10`}>
                                                            <td className="py-3 px-2 font-mono text-[10px]">
                                                                {sale.created_at ? new Date(sale.created_at).toLocaleString('id-ID') : '-'}
                                                            </td>
                                                            <td className={`py-3 px-2 font-mono font-bold ${themeTextTitle}`}>{sale.username}</td>
                                                            <td className="py-3 px-2">{sale.package_name || '-'}</td>
                                                            <td className="py-3 px-2 font-bold text-emerald-500">{formatRupiah(sale.price)}</td>
                                                            {!isOperatorView && (
                                                                <td className="py-3 px-2">{sale.agent_name || 'Otomatis'}</td>
                                                            )}
                                                            <td className="py-3 px-2 font-bold text-violet-500">
                                                                {formatRupiah(sale.agent_amount)}
                                                                {Number(sale.commission_percent) > 0 && (
                                                                    <span className={`block text-[10px] font-mono ${themeTextDesc}`}>{sale.commission_percent}%</span>
                                                                )}
                                                            </td>
                                                            <td className="py-3 px-2 font-bold text-sky-500">{formatRupiah(sale.owner_amount)}</td>
                                                            <td className="py-3 px-2 text-[10px]">{sale.payment_method || '-'}</td>
                                                        </tr>
                                                    ));
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>

                                    {(() => {
                                        const totalPages = Math.ceil((agentReport.sales?.length || 0) / agentReportPageSize) || 1;
                                        if (totalPages <= 1) return null;

                                        return (
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-zinc-800/10 text-xs">
                                                <span className={`text-center sm:text-left ${themeTextSub}`}>
                                                    Halaman {agentReportPage} dari {totalPages} ({agentReport.sales.length} transaksi)
                                                </span>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAgentReportPage((p) => Math.max(1, p - 1))}
                                                        disabled={agentReportPage === 1}
                                                        className={`px-3 py-1 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 disabled:opacity-30 hover:bg-zinc-100'}`}
                                                    >
                                                        Sebelumnya
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAgentReportPage((p) => Math.min(totalPages, p + 1))}
                                                        disabled={agentReportPage === totalPages}
                                                        className={`px-3 py-1 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 disabled:opacity-30 hover:bg-zinc-100'}`}
                                                    >
                                                        Berikutnya
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <p className={`text-[11px] ${themeTextSub}`}>
                                Kelola akun member hotspot (bukan voucher). Data ini terpisah dari pelanggan PPPoE.
                            </p>
                            <button
                                type="button"
                                onClick={() => openMemberModal()}
                                title="Tambah Member Hotspot"
                                className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="admin-table-scroll">
                            <table>
                                <thead>
                                    <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                        <th className="py-3 px-2">Nama</th>
                                        <th className="py-3 px-2">Username</th>
                                        <th className="py-3 px-2">Paket Hotspot</th>
                                        <th className="py-3 px-2">Router</th>
                                        <th className="py-3 px-2">Telepon</th>
                                        <th className="py-3 px-2">Status</th>
                                        <th className="py-3 px-2 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/20 text-xs">
                                    {paginatedHotspotMembers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className={`py-8 text-center ${themeTextDesc}`}>
                                                {searchTerm.trim()
                                                    ? 'Tidak ada member hotspot yang cocok dengan pencarian.'
                                                    : 'Belum ada member hotspot terdaftar.'}
                                            </td>
                                        </tr>
                                    ) : paginatedHotspotMembers.map((cust) => (
                                        <tr key={cust.id} className={`${themeTextSub} hover:bg-zinc-900/10`}>
                                            <td className={`py-3 px-2 font-bold ${themeTextTitle}`}>{cust.name}</td>
                                            <td className="py-3 px-2 font-mono">{cust.username}</td>
                                            <td className="py-3 px-2">{cust.package ? cust.package.name : '-'}</td>
                                            <td className="py-3 px-2">{cust.router ? cust.router.name : '-'}</td>
                                            <td className="py-3 px-2 font-mono text-[10px]">{cust.phone_number}</td>
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
                                                    onClick={() => openMemberModal(cust)}
                                                    title="Edit"
                                                    className="inline-block p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteMember(cust)}
                                                    title="Hapus"
                                                    className="inline-block p-1 text-rose-500 hover:text-rose-400 cursor-pointer transition-colors"
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

                        {filteredHotspotMembers.length > customerPageSize && (
                            <div className={`flex flex-col gap-3 pt-4 border-t ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200'} text-xs`}>
                                <span className={`text-center sm:text-left ${themeTextSub}`}>
                                    Menampilkan <span className={`font-bold ${themeTextTitle}`}>{Math.min((hotspotMemberPage - 1) * customerPageSize + 1, filteredHotspotMembers.length)}</span>–<span className={`font-bold ${themeTextTitle}`}>{Math.min(hotspotMemberPage * customerPageSize, filteredHotspotMembers.length)}</span> dari <span className={`font-bold ${themeTextTitle}`}>{filteredHotspotMembers.length}</span> member
                                </span>
                                <nav aria-label="Navigasi halaman member hotspot" className="flex flex-wrap items-center justify-center sm:justify-end gap-1">
                                    <button
                                        type="button"
                                        disabled={hotspotMemberPage === 1}
                                        onClick={() => setHotspotMemberPage((p) => Math.max(p - 1, 1))}
                                        className={`inline-flex items-center justify-center min-w-8 h-8 px-2 border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
                                    >
                                        ‹
                                    </button>
                                    {visibleHotspotMemberPages.map((page, index) => (
                                        page === 'ellipsis' ? (
                                            <span key={`ellipsis-${index}`} className={`inline-flex items-center justify-center w-8 h-8 text-[11px] select-none ${themeTextDesc}`} aria-hidden="true">…</span>
                                        ) : (
                                            <button
                                                key={page}
                                                type="button"
                                                onClick={() => setHotspotMemberPage(page)}
                                                aria-current={page === hotspotMemberPage ? 'page' : undefined}
                                                className={`inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg border text-[11px] font-bold tabular-nums transition-all duration-150 cursor-pointer ${page === hotspotMemberPage
                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                    : (isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-950')
                                                }`}
                                            >
                                                {page}
                                            </button>
                                        )
                                    ))}
                                    <button
                                        type="button"
                                        disabled={hotspotMemberPage === totalHotspotMemberPages}
                                        onClick={() => setHotspotMemberPage((p) => Math.min(p + 1, totalHotspotMemberPages))}
                                        className={`inline-flex items-center justify-center min-w-8 h-8 px-2 border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
                                    >
                                        ›
                                    </button>
                                </nav>
                            </div>
                        )}
                    </div>
                )}
            </AdminPageCard>

            <TransitionModal show={showMemberModal} onClose={closeMemberModal} themeCard={themeCard} maxWidth="lg" className="overflow-y-auto max-h-[90vh]">
                <div className={`flex items-start justify-between gap-3 pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                        {editingMember ? 'Edit Member Hotspot' : 'Tambah Member Hotspot'}
                    </h3>
                    <button type="button" onClick={() => setShowMemberModal(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleSaveMember} className="space-y-3 text-xs">
                    <input type="hidden" name="id" value={editingMember ? editingMember.id : ''} />
                    <input type="hidden" name="service_type" value="hotspot" />
                    <input type="hidden" name="billing_date" value={editingMember?.billing_date ? String(editingMember.billing_date).slice(0, 10) : new Date().toISOString().slice(0, 10)} />
                    <input type="hidden" name="odp_id" value="" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Nama Lengkap</label>
                            <input required name="name" type="text" defaultValue={editingMember ? editingMember.name : ''} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Username Layanan</label>
                            <input required name="username" type="text" defaultValue={editingMember ? editingMember.username : ''} className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Password Portal</label>
                            <input required name="password" type="text" defaultValue={editingMember ? editingMember.password : ''} className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Nomor Telepon (WA)</label>
                            <input required name="phone_number" type="text" defaultValue={editingMember ? editingMember.phone_number : ''} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Alamat Lengkap</label>
                        <textarea required name="address" rows={2} defaultValue={editingMember ? editingMember.address : ''} className={`p-2 border rounded-lg ${themeInput}`} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Router</label>
                            <select name="router_id" defaultValue={editingMember ? editingMember.router_id : (routers[0]?.id || '')} className={`p-2 border rounded-lg ${themeInput}`}>
                                {routers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Paket Hotspot</label>
                            <select
                                name="package_id"
                                required
                                defaultValue={editingMember?.package_id || packages[0]?.id || ''}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            >
                                {packages.length === 0 ? (
                                    <option value="" disabled>Paket belum tersedia</option>
                                ) : packages.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Status Akun</label>
                        <select name="status" defaultValue={editingMember ? editingMember.status : 'active'} className={`p-2 border rounded-lg ${themeInput}`}>
                            <option value="active">Active</option>
                            <option value="isolated">Isolated (Isolir)</option>
                            <option value="inactive">Inactive</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>

                    <div className="flex justify-end pt-3 gap-2">
                        <button type="button" onClick={() => setShowMemberModal(false)} title="Batal" className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}><X className="w-4 h-4" /></button>
                        <button type="submit" title="Simpan" className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg inline-flex items-center justify-center"><Save className="w-4 h-4" /></button>
                    </div>
                </form>
            </TransitionModal>

            <TransitionModal show={showDeleteMemberModal} onClose={closeDeleteMemberModal} themeCard={themeCard} maxWidth="md">
                <div className={`flex items-start justify-between gap-3 pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className="text-sm font-bold text-rose-500">Hapus Member Hotspot</h3>
                    <button
                        type="button"
                        onClick={() => {
                            setShowDeleteMemberModal(false);
                            setTimeout(() => setMemberToDelete(null), 300);
                        }}
                        className={`text-zinc-500 ${isDarkMode ? 'hover:text-white' : 'hover:text-zinc-800'}`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="text-xs space-y-3">
                    <p className={themeTextTitle}>
                        Apakah Anda yakin ingin menghapus member <strong>{memberToDelete?.name || ''}</strong> (username: <strong>@{memberToDelete?.username || ''}</strong>)?
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
                                <span className={`font-semibold ${themeTextTitle} ${isDarkMode ? 'group-hover:text-emerald-400' : 'group-hover:text-emerald-600'} transition-colors`}>Hapus Database Saja</span>
                                <p className={`${themeTextDesc} leading-normal text-[10px]`}>Hanya menghapus data dari database {branding.app_name || 'aplikasi'}. Akun Hotspot di Mikrotik akan tetap ada.</p>
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
                                <span className="font-semibold text-rose-500 transition-colors">Hapus Database & Mikrotik</span>
                                <p className={`${themeTextDesc} leading-normal text-[10px]`}>Menghapus data dari database {branding.app_name || 'aplikasi'} dan akun Hotspot dari Router Mikrotik.</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end pt-2 gap-2 text-xs">
                    <button
                        type="button"
                        onClick={() => {
                            setShowDeleteMemberModal(false);
                            setTimeout(() => setMemberToDelete(null), 300);
                        }}
                        title="Batal"
                        className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={confirmDeleteMember}
                        title="Konfirmasi Hapus"
                        className={`p-2 rounded-lg text-white transition-colors cursor-pointer inline-flex items-center justify-center ${deleteMode === 'total' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </TransitionModal>

            <TransitionModal show={showGenerateVoucherModal} onClose={closeGenerateVoucherModal} themeCard={themeCard} maxWidth="md">
                <div className={`flex items-start justify-between gap-3 pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>Generate Voucher Hotspot (Bulk)</h3>
                    <button type="button" onClick={() => setShowGenerateVoucherModal(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleGenerateVouchersSubmit} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Router Mikrotik</label>
                            <select
                                required
                                name="router_id"
                                value={generateRouterId}
                                onChange={(e) => {
                                    const rId = e.target.value;
                                    setGenerateRouterId(rId);
                                    fetchHotspotServers(rId);
                                    setGenerateComment(generateDefaultComment(rId));
                                }}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            >
                                <option value="" disabled>Pilih Router</option>
                                {routers.map((r) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Hotspot Server</label>
                            <select
                                required
                                name="server"
                                onChange={(e) => {
                                    const sVal = e.target.value;
                                    const found = hotspotServers.find((s) => s.name === sVal);
                                    setGenerateServerDnsName(found?.dns_name || '');
                                }}
                                className={`p-2 border rounded-lg ${themeInput}`}
                                disabled={isLoadingServers}
                            >
                                <option value="" disabled>
                                    {isLoadingServers ? 'Mengambil server...' : (hotspotServers.length === 0 ? 'Pilih router terlebih dahulu' : 'Pilih Server')}
                                </option>
                                <option value="all">all (Semua Server)</option>
                                {hotspotServers.map((srv) => (
                                    <option key={srv.name} value={srv.name}>{srv.name}</option>
                                ))}
                            </select>
                            {generateServerDnsName && (
                                <p className="text-[10px] text-amber-500 font-bold mt-1">
                                    DNS Name: <span className="font-mono bg-amber-500/10 px-1 py-0.5 rounded">{generateServerDnsName}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Paket Hotspot (Profile)</label>
                            <select
                                required
                                name="package_id"
                                value={generatePackageId}
                                onChange={(e) => {
                                    const pId = e.target.value;
                                    setGeneratePackageId(pId);
                                    const pkg = packages.find((p) => String(p.id) === String(pId));
                                    if (pkg) {
                                        setGenerateBasePrice(Number(pkg.price));
                                    }
                                }}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            >
                                <option value="" disabled>Pilih Paket Hotspot</option>
                                {packages.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name} ({formatRupiah(p.price)})</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Format Kode Voucher</label>
                            <select required name="code_format" className={`p-2 border rounded-lg ${themeInput}`}>
                                <option value="12345">12345 (Hanya Angka)</option>
                                <option value="ABCDE">ABCDE (Huruf Kapital)</option>
                                <option value="abcde">abcde (Huruf Kecil)</option>
                                <option value="123ABC">123ABC (Angka & Kapital)</option>
                                <option value="123abc">123abc (Angka & Huruf Kecil)</option>
                                <option value="1A2B3C">1A2B3C (Kombinasi Angka & Kapital Selang-seling)</option>
                                <option value="1a2b3c">1a2b3c (Kombinasi Angka & Huruf Kecil Selang-seling)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 border-t border-b py-2 my-1 border-zinc-200 dark:border-zinc-800/40">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Harga Dasar (Rp)</label>
                            <input
                                required
                                type="number"
                                value={generateBasePrice}
                                onChange={(e) => setGenerateBasePrice(Math.max(0, Number(e.target.value)))}
                                className={`p-2 border rounded-lg font-mono ${themeInput}`}
                                min="0"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Keuntungan Agen (Rp)</label>
                            <input
                                required
                                name="agent_commission_amount"
                                type="number"
                                value={generateAgentProfit}
                                onChange={(e) => setGenerateAgentProfit(Math.max(0, Number(e.target.value)))}
                                className={`p-2 border rounded-lg font-mono ${themeInput}`}
                                min="0"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Harga Voucher (Total)</label>
                            <input
                                readOnly
                                name="price"
                                type="number"
                                value={generateBasePrice + generateAgentProfit}
                                className={`p-2 border rounded-lg font-mono font-bold bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-550 dark:text-zinc-400`}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Nama WiFi (Judul Voucher)</label>
                            <input required name="wifi_name" type="text" placeholder="Contoh: hotspot-wifi" className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Tipe Login Voucher</label>
                            <select required name="login_type" className={`p-2 border rounded-lg ${themeInput}`}>
                                <option value="same">Username = Password (Sama)</option>
                                <option value="different">Username & Password (Berbeda)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Jumlah Voucher</label>
                            <input required name="qty" type="number" defaultValue="10" min="1" max="500" className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Panjang Kode</label>
                            <input required name="code_length" type="number" defaultValue="6" min="4" max="12" className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Prefix-</label>
                            <input name="prefix" type="text" defaultValue="WIFI-" placeholder="Optional" className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Informasi Tambahan (Comment / Batch)</label>
                        <input
                            required
                            name="comment"
                            type="text"
                            value={generateComment}
                            onChange={(e) => setGenerateComment(e.target.value)}
                            placeholder="Auto-generated"
                            className={`p-2 border rounded-lg font-mono ${themeInput}`}
                        />
                    </div>

                    <div className="flex justify-end pt-3 gap-2">
                        <button type="button" onClick={() => setShowGenerateVoucherModal(false)} title="Batal" className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}><X className="w-4 h-4" /></button>
                        <button type="submit" disabled={isGeneratingVouchers} title={isGeneratingVouchers ? 'Generating...' : 'Generate'} className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer inline-flex items-center justify-center disabled:opacity-50">
                            <TicketPlus className={`w-4 h-4 ${isGeneratingVouchers ? 'animate-pulse' : ''}`} />
                        </button>
                    </div>
                </form>
            </TransitionModal>

            <TransitionModal show={showSellVoucherModal} onClose={closeSellVoucherModal} themeCard={themeCard} maxWidth="sm">
                <div className={`flex items-start justify-between gap-3 pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>Konfirmasi Penjualan Voucher</h3>
                    <button type="button" onClick={() => { setShowSellVoucherModal(false); setSelectedVoucherForSale(null); }} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                {selectedVoucherForSale && (
                    <form onSubmit={handleSellVoucherSubmit} className="space-y-3 text-xs">
                        <input type="hidden" name="voucher_id" value={selectedVoucherForSale.id} />

                        <div className={`p-3 rounded-lg border ${themeInnerWidget} space-y-2`}>
                            <div className="flex justify-between">
                                <span className={themeTextSub}>Kode Voucher:</span>
                                <span className={`font-mono font-bold ${themeTextTitle}`}>{selectedVoucherForSale.username}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className={themeTextSub}>Profil:</span>
                                <span className={`font-mono ${themeTextTitle}`}>{selectedVoucherForSale.mikrotik_profile}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className={themeTextSub}>Harga:</span>
                                <span className="font-bold text-emerald-500">{formatRupiah(selectedVoucherForSale.price)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className={themeTextSub}>Masa Aktif:</span>
                                <span className={`font-mono ${themeTextTitle}`}>{selectedVoucherForSale.validity || '-'}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Metode Pembayaran</label>
                            <select required name="payment_method" className={`p-2 border rounded-lg ${themeInput}`}>
                                <option value="Cash">Cash (Tunai)</option>
                                <option value="QRIS">QRIS / E-Wallet</option>
                            </select>
                        </div>

                        <div className="flex justify-end pt-3 gap-2">
                            <button type="button" onClick={() => { setShowSellVoucherModal(false); setSelectedVoucherForSale(null); }} title="Batal" className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}><X className="w-4 h-4" /></button>
                            <button type="submit" disabled={isSellingVoucher} title={isSellingVoucher ? 'Memproses...' : 'Catat Penjualan'} className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer inline-flex items-center justify-center disabled:opacity-50">
                                <ShoppingCart className={`w-4 h-4 ${isSellingVoucher ? 'animate-pulse' : ''}`} />
                            </button>
                        </div>
                    </form>
                )}
            </TransitionModal>

            <TransitionModal show={showPrintVouchersModal} onClose={closePrintVouchersModal} themeCard={themeCard} maxWidth="md">
                <div className={`flex items-start justify-between gap-3 pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>Cetak Voucher Hotspot (Bulk)</h3>
                    <button type="button" onClick={() => setShowPrintVouchersModal(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handlePrintVouchersSubmit} className="space-y-3 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Router Mikrotik</label>
                        <select
                            required
                            value={printRouterId}
                            onChange={(e) => {
                                const rId = e.target.value;
                                setPrintRouterId(rId);
                                setPrintComment('');
                                fetchHotspotServers(rId);
                            }}
                            className={`p-2 border rounded-lg ${themeInput}`}
                        >
                            <option value="" disabled>Pilih Router</option>
                            {routers.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Informasi Tambahan (Comment / Batch)</label>
                        <select
                            required
                            value={printComment}
                            onChange={(e) => {
                                const commentVal = e.target.value;
                                setPrintComment(commentVal);

                                const batchVouchers = hotspotVouchers.filter((v) =>
                                    String(v.router_id) === String(printRouterId) &&
                                    v.comment === commentVal,
                                );
                                const serverName = batchVouchers[0]?.server;
                                if (serverName) {
                                    const serverObj = hotspotServers.find((s) => s.name === serverName);
                                    if (serverObj?.dns_name) {
                                        const dns = serverObj.dns_name;
                                        setPrintLoginUrl(dns.startsWith('http://') || dns.startsWith('https://') ? dns : `http://${dns}`);
                                    } else {
                                        setPrintLoginUrl('http://10.0.0.1');
                                    }
                                } else {
                                    setPrintLoginUrl('http://10.0.0.1');
                                }
                            }}
                            className={`p-2 border rounded-lg ${themeInput}`}
                            disabled={!printRouterId}
                        >
                            <option value="" disabled>
                                {!printRouterId ? 'Pilih router terlebih dahulu' : (uniqueCommentsForPrintRouter.length === 0 ? 'Tidak ada batch voucher untuk router ini' : 'Pilih Batch / Comment')}
                            </option>
                            {uniqueCommentsForPrintRouter.map((comment) => (
                                <option key={comment} value={comment}>{comment}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Hotspot Login URL (DNS Name)</label>
                        <input
                            required
                            type="text"
                            value={printLoginUrl}
                            onChange={(e) => setPrintLoginUrl(e.target.value)}
                            className={`p-2 border rounded-lg font-mono ${themeInput}`}
                        />
                        <p className="text-[10px] text-zinc-500">Contoh: http://10.0.0.1 atau nama DNS hotspot router Anda.</p>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Skema Warna Voucher (Color Palette)</label>
                        <select
                            value={printColorPalette}
                            onChange={(e) => setPrintColorPalette(e.target.value)}
                            className={`p-2 border rounded-lg ${themeInput}`}
                        >
                            <option value="price_based">Otomatis (Sesuaikan Harga Jual)</option>
                            <option value="amber">Amber / Orange (Ekonomis)</option>
                            <option value="teal">Teal / Cyan (Segar)</option>
                            <option value="emerald">Emerald / Green (Harian)</option>
                            <option value="blue">Blue / Indigo (Mingguan)</option>
                            <option value="violet">Purple / Violet (Premium)</option>
                            <option value="rose">Pink / Rose (Super Premium)</option>
                            <option value="gold">Gold / Bronze (Bulanan)</option>
                            <option value="slate">Slate / Gray (Monokrom / Cetak Hemat)</option>
                        </select>
                    </div>
                    <div className="flex justify-end pt-3 gap-2">
                        <button type="button" onClick={() => setShowPrintVouchersModal(false)} title="Batal" className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}><X className="w-4 h-4" /></button>
                        <button type="submit" title="Cetak" className="p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg cursor-pointer inline-flex items-center justify-center"><Printer className="w-4 h-4" /></button>
                    </div>
                </form>
            </TransitionModal>

            <TransitionModal show={showBulkDeleteVouchersModal} onClose={closeBulkDeleteVouchersModal} themeCard={themeCard} maxWidth="md">
                <div className={`flex items-start justify-between gap-3 pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className="text-sm font-bold text-rose-500 flex items-center gap-1.5">
                        <Trash2 className="w-4.5 h-4.5" />
                        Hapus Voucher Massal (Batch)
                    </h3>
                    <button type="button" onClick={() => setShowBulkDeleteVouchersModal(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={handleBulkDeleteVouchersSubmit} className="space-y-3 text-xs">
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Router Mikrotik</label>
                        <select
                            required
                            value={bulkDeleteVouchersRouterId}
                            onChange={(e) => {
                                setBulkDeleteVouchersRouterId(e.target.value);
                                setBulkDeleteVouchersComment('');
                            }}
                            className={`p-2 border rounded-lg ${themeInput}`}
                        >
                            <option value="" disabled>Pilih Router</option>
                            {routers.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Informasi Tambahan (Comment / Batch)</label>
                        <select
                            required
                            value={bulkDeleteVouchersComment}
                            onChange={(e) => setBulkDeleteVouchersComment(e.target.value)}
                            className={`p-2 border rounded-lg ${themeInput}`}
                            disabled={!bulkDeleteVouchersRouterId}
                        >
                            <option value="" disabled>
                                {!bulkDeleteVouchersRouterId ? 'Pilih router terlebih dahulu' : (uniqueCommentsForRouter.length === 0 ? 'Tidak ada batch voucher untuk router ini' : 'Pilih Batch / Comment')}
                            </option>
                            {uniqueCommentsForRouter.map((comment) => (
                                <option key={comment} value={comment}>{comment}</option>
                            ))}
                        </select>
                    </div>
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg space-y-1">
                        <p className="font-semibold">Peringatan:</p>
                        <p>Tindakan ini akan menghapus seluruh data voucher pada batch terpilih dari database lokal dan menghapus user hotspot terkait dari MikroTik.</p>
                    </div>
                    <div className="flex justify-end pt-3 gap-2">
                        <button type="button" onClick={() => setShowBulkDeleteVouchersModal(false)} title="Batal" className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}><X className="w-4 h-4" /></button>
                        <button type="submit" title="Hapus Massal" className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg cursor-pointer inline-flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </form>
            </TransitionModal>
        </>
    );
}

export default function HotspotIndex({
    routers,
    packages,
    customers,
    hotspotVouchers,
    hotspotSales,
    hotspotAgents,
    defaultHotspotCommissionPercent,
}) {
    return (
        <AdminLayout title="Manajemen Hotspot">
            <HotspotPageContent
                routers={routers}
                packages={packages}
                customers={customers}
                hotspotVouchers={hotspotVouchers}
                hotspotSales={hotspotSales}
                hotspotAgents={hotspotAgents}
                defaultHotspotCommissionPercent={defaultHotspotCommissionPercent}
            />
        </AdminLayout>
    );
}
