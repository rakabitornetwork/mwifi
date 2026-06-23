import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownLeft,
    ArrowUpRight,
    Boxes,
    CreditCard,
    Cpu,
    History,
    MessageSquare,
    Plug,
    Router as RouterIcon,
    UserX,
    Users,
    Radio,
    Wallet,
    Wifi,
} from 'lucide-react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { PremiumPanel, PremiumPanelHeader } from '../../../Components/Admin/AdminPageCard';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';
import { formatRupiah } from '../../../utils/formatRupiah';
import { bpsToMbps, formatSpeedBps } from '../../../utils/formatSpeedBps';

const chartModule = () => import('../../../Components/Admin/DashboardCharts');
const ResourceAreaChart = lazy(() => chartModule().then((module) => ({ default: module.ResourceAreaChart })));
const TrafficAreaChart = lazy(() => chartModule().then((module) => ({ default: module.TrafficAreaChart })));

const WATCH_CATEGORY_ICONS = {
    ont: RouterIcon,
    adaptor: Plug,
};

function ChartFallback({ className = 'h-48' }) {
    return <div className={`w-full rounded-lg ${className} ${'bg-zinc-100/80 dark:bg-zinc-900/40'}`} aria-hidden="true" />;
}

function formatTimeAgo(isoString) {
    if (!isoString) return '-';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'baru saja';
    if (mins < 60) return `${mins}m lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    return `${days}h lalu`;
}

function DashboardContent({
    routers = [],
    customerStats = {},
    odpSummary = {},
    billingActivityLogs = [],
    todayRevenue = {},
    inventorySummary = {},
    recentInventoryMovements = [],
    billingSummary = {},
    routerSummary = {},
}) {
    const theme = useAdminTheme();
    const { isDarkMode, themeCard, themeTextTitle, themeTextSub, themeTextDesc } = theme;
    const themeInnerWidget = isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';
    const themeSelect = isDarkMode
        ? 'bg-zinc-900 border-zinc-700 text-zinc-100'
        : 'bg-white border-zinc-200 text-zinc-800';

    const defaultRouterId = (() => {
        const activeRouter = routers.find((r) => r.status);
        return activeRouter?.id ?? routers[0]?.id ?? '';
    })();

    const [selectedRouterId, setSelectedRouterId] = useState(String(defaultRouterId || ''));
    const [serverResources, setServerResources] = useState({
        cpu: 0,
        ram: 0,
        disk: 0,
        os: '—',
        hostname: '—',
        router_name: '',
        router_host: '',
    });
    const [resourceHistory, setResourceHistory] = useState([]);
    const [resourceError, setResourceError] = useState(null);
    const [isLoadingResources, setIsLoadingResources] = useState(false);
    const [interfaceList, setInterfaceList] = useState([]);
    const [selectedInterface, setSelectedInterface] = useState('');
    const [interfaceTraffic, setInterfaceTraffic] = useState({ rx_bps: 0, tx_bps: 0, running: false });
    const [trafficHistory, setTrafficHistory] = useState([]);
    const [interfaceError, setInterfaceError] = useState(null);
    const [isLoadingInterfaces, setIsLoadingInterfaces] = useState(false);
    const monitorIntervalMs = 7000;

    const fetchServerResources = async () => {
        if (!selectedRouterId) {
            setResourceError('Belum ada router Mikrotik terdaftar.');
            return;
        }

        setIsLoadingResources(true);
        try {
            const res = await fetch(`/admin/server/resources?router_id=${selectedRouterId}`);
            const data = await res.json();

            if (!res.ok) {
                setResourceError(data.error || 'Gagal membaca resource dari Mikrotik.');
                return;
            }

            setResourceError(null);
            setServerResources(data);
        } catch (err) {
            console.error('Failed to load Mikrotik resources', err);
            setResourceError('Gagal terhubung ke Mikrotik.');
        } finally {
            setIsLoadingResources(false);
        }
    };

    const fetchInterfaceList = async () => {
        if (!selectedRouterId) {
            setInterfaceList([]);
            setSelectedInterface('');
            return;
        }

        setIsLoadingInterfaces(true);
        try {
            const res = await fetch(`/admin/server/interface-traffic?router_id=${selectedRouterId}`);
            const data = await res.json();

            if (!res.ok) {
                setInterfaceError(data.error || 'Gagal memuat daftar interface.');
                setInterfaceList([]);
                setSelectedInterface('');
                return;
            }

            setInterfaceError(null);
            const interfaces = data.interfaces || [];
            setInterfaceList(interfaces);

            setSelectedInterface((current) => {
                if (current && interfaces.some((item) => item.name === current)) {
                    return current;
                }

                return data.default_interface || interfaces[0]?.name || '';
            });
        } catch (err) {
            console.error('Failed to load Mikrotik interfaces', err);
            setInterfaceError('Gagal memuat daftar interface.');
            setInterfaceList([]);
            setSelectedInterface('');
        } finally {
            setIsLoadingInterfaces(false);
        }
    };

    const fetchInterfaceTraffic = async () => {
        if (!selectedRouterId || !selectedInterface) {
            return;
        }

        try {
            const params = new URLSearchParams({
                router_id: selectedRouterId,
                interface: selectedInterface,
            });
            const res = await fetch(`/admin/server/interface-traffic?${params.toString()}`);
            const data = await res.json();

            if (!res.ok) {
                setInterfaceError(data.error || 'Gagal membaca trafik interface.');
                return;
            }

            setInterfaceError(null);
            setInterfaceTraffic(data);
        } catch (err) {
            console.error('Failed to load interface traffic', err);
            setInterfaceError('Gagal membaca trafik interface.');
        }
    };

    useEffect(() => {
        if (!selectedRouterId) {
            setResourceHistory([]);
            setInterfaceList([]);
            setSelectedInterface('');
            setTrafficHistory([]);
            return;
        }

        setResourceHistory([]);
        setTrafficHistory([]);
        fetchServerResources();
        fetchInterfaceList();

        const interval = setInterval(fetchServerResources, monitorIntervalMs);

        return () => clearInterval(interval);
    }, [selectedRouterId]);

    useEffect(() => {
        if (!selectedRouterId || !selectedInterface) {
            setTrafficHistory([]);
            return;
        }

        setTrafficHistory([]);
        fetchInterfaceTraffic();

        const interval = setInterval(fetchInterfaceTraffic, monitorIntervalMs);
        return () => clearInterval(interval);
    }, [selectedRouterId, selectedInterface]);

    useEffect(() => {
        if (!serverResources || serverResources.cpu === undefined) return;
        setResourceHistory((prev) => {
            const newHistory = [...prev];
            if (newHistory.length >= 15) {
                newHistory.shift();
            }
            const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            newHistory.push({
                time: timeStr,
                cpu: serverResources.cpu,
                ram: serverResources.ram,
            });
            return newHistory;
        });
    }, [serverResources]);

    useEffect(() => {
        if (interfaceTraffic?.rx_bps === undefined && interfaceTraffic?.tx_bps === undefined) {
            return;
        }

        setTrafficHistory((prev) => {
            const next = [...prev];
            if (next.length >= 15) {
                next.shift();
            }

            const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            next.push({
                time: timeStr,
                rx_mbps: bpsToMbps(interfaceTraffic.rx_bps),
                tx_mbps: bpsToMbps(interfaceTraffic.tx_bps),
            });

            return next;
        });
    }, [interfaceTraffic]);

    const todayPaymentCount = todayRevenue?.payment_count ?? 0;

    const stats = useMemo(() => [
        {
            name: 'Pendapatan Hari Ini',
            value: formatRupiah(todayRevenue?.total || 0),
            change: todayPaymentCount === 1
                ? '1 pembayaran lunas hari ini'
                : `${todayPaymentCount} pembayaran lunas hari ini`,
            icon: Wallet,
            cardClass: 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-400/20 text-white shadow-md shadow-amber-500/5',
            iconClass: 'text-amber-100',
            nameClass: 'text-amber-100/80',
            valClass: 'text-white',
            changeClass: 'text-amber-100/70',
        },
        {
            name: 'PPP Active',
            value: customerStats.ppp_active ?? 0,
            change: 'Pelanggan PPPoE aktif',
            icon: Users,
            cardClass: 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400/20 text-white shadow-md shadow-emerald-500/5',
            iconClass: 'text-emerald-100',
            nameClass: 'text-emerald-100/80',
            valClass: 'text-white',
            changeClass: 'text-emerald-100/70',
        },
        {
            name: 'Hotspot Active',
            value: customerStats.hotspot_active ?? 0,
            change: 'Voucher aktif',
            icon: Radio,
            cardClass: 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400/20 text-white shadow-md shadow-blue-500/5',
            iconClass: 'text-blue-100',
            nameClass: 'text-blue-100/80',
            valClass: 'text-white',
            changeClass: 'text-blue-100/70',
        },
        {
            name: 'Terisolir',
            value: customerStats.isolated ?? 0,
            change: 'Menunggak / isolir',
            icon: UserX,
            cardClass: 'bg-gradient-to-br from-rose-500 to-red-600 border-rose-400/20 text-white shadow-md shadow-rose-500/5',
            iconClass: 'text-rose-100',
            nameClass: 'text-rose-100/80',
            valClass: 'text-white',
            changeClass: 'text-rose-100/70',
        },
    ], [customerStats.hotspot_active, customerStats.isolated, customerStats.ppp_active, todayPaymentCount, todayRevenue?.total]);

    const waLogs = useMemo(
        () => (billingActivityLogs || []).map((log) => ({
            type: 'Billing',
            target: log.meta?.admin_phone || (log.meta?.invoice_count > 0 ? 'Admin' : 'Scheduler'),
            text: log.message,
            status: log.meta?.admin_notified ? 'sent' : (log.meta?.invoice_count > 0 ? 'pending' : 'system'),
            time: formatTimeAgo(log.created_at),
        })),
        [billingActivityLogs],
    );

    const inventoryWatchEntries = useMemo(
        () => Object.entries(inventorySummary || {}),
        [inventorySummary],
    );

    const inventoryLowStockCount = useMemo(
        () => inventoryWatchEntries.reduce((sum, [, summary]) => sum + Number(summary.low_stock_count || 0), 0),
        [inventoryWatchEntries],
    );

    const lowStockItems = useMemo(
        () => inventoryWatchEntries.flatMap(([, summary]) => summary.low_stock_items || []),
        [inventoryWatchEntries],
    );

    const odpNodeCount = Number(odpSummary?.node_count ?? 0);
    const odpTotalPorts = Number(odpSummary?.total_ports ?? 0);
    const odpUsedPorts = Number(odpSummary?.used_ports ?? 0);
    const odpUtilizationPercent = odpTotalPorts > 0 ? Math.round((odpUsedPorts / odpTotalPorts) * 100) : 0;

    const unpaidCount = Number(billingSummary?.unpaid_count ?? 0);
    const unpaidTotal = Number(billingSummary?.unpaid_total ?? 0);
    const overdueCount = Number(billingSummary?.overdue_count ?? 0);
    const pendingDeferrals = Number(billingSummary?.pending_deferrals ?? 0);
    const routerActive = Number(routerSummary?.active ?? 0);
    const routerTotal = Number(routerSummary?.total ?? 0);

    const movementTypeClass = (type) => {
        switch (type) {
            case 'in':
                return 'text-emerald-500';
            case 'out':
                return 'text-rose-500';
            default:
                return 'text-sky-500';
        }
    };

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} className={`border rounded-2xl p-3.5 flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] ${stat.cardClass}`}>
                            <div className="flex justify-between items-start">
                                <span className={`text-xs font-bold uppercase tracking-wider ${stat.nameClass}`}>{stat.name}</span>
                                <Icon className={`w-4 h-4 ${stat.iconClass}`} />
                            </div>
                            <div className="mt-3">
                                <p className={`text-xl sm:text-2xl font-extrabold tracking-tight leading-none ${stat.valClass}`}>{stat.value}</p>
                                <span className={`text-[10px] font-bold block mt-1 ${stat.changeClass}`}>{stat.change}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <PremiumPanel accent="emerald" themeCard={themeCard} isDarkMode={isDarkMode} bodyClassName="p-6 space-y-5">
                        <PremiumPanelHeader
                            icon={Cpu}
                            accent="emerald"
                            isDarkMode={isDarkMode}
                            themeTextTitle={themeTextTitle}
                            title="NOC Monitor Kinerja Server & ODP"
                            trailing={(
                                <div className="flex items-center gap-1.5 shrink-0 select-none">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium tracking-tight">Live</span>
                                </div>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-500 font-medium">
                                    <span>Beban Resource CPU & RAM (Real-time) Mikrotik</span>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {routers.length > 0 ? (
                                            <select
                                                value={selectedRouterId}
                                                onChange={(e) => setSelectedRouterId(e.target.value)}
                                                className={`text-xs font-medium px-2.5 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-zinc-400 max-w-[180px] truncate ${themeSelect}`}
                                                title="Pilih router Mikrotik"
                                            >
                                                {routers.map((r) => (
                                                    <option key={r.id} value={r.id}>
                                                        {r.name} ({r.host})
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="text-amber-500 font-medium">Belum ada router</span>
                                        )}
                                        <span className="font-mono text-emerald-500 shrink-0">
                                            {isLoadingResources ? 'Memuat...' : 'Interval: 7s'}
                                        </span>
                                    </div>
                                </div>
                                {resourceError && (
                                    <p className="text-xs font-semibold text-amber-500">{resourceError}</p>
                                )}
                                <div className="h-44 w-full">
                                    {resourceHistory.length === 0 ? (
                                        <div className={`h-full flex items-center justify-center text-xs font-medium tracking-tight ${themeTextSub}`}>
                                            {routers.length === 0
                                                ? 'Tambahkan router di menu Router'
                                                : isLoadingResources
                                                    ? 'Menghubungkan ke Mikrotik...'
                                                    : 'Menunggu data resource...'}
                                        </div>
                                    ) : (
                                    <Suspense fallback={<ChartFallback className="h-44" />}>
                                        <ResourceAreaChart data={resourceHistory} isDarkMode={isDarkMode} />
                                    </Suspense>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-500 font-medium">
                                        <span>Trafik Interface (Real-time)</span>
                                        <select
                                            value={selectedInterface}
                                            onChange={(e) => setSelectedInterface(e.target.value)}
                                            disabled={interfaceList.length === 0 || isLoadingInterfaces}
                                            className={`text-xs font-medium px-2.5 py-1 rounded-md border focus:outline-none focus:ring-1 focus:ring-zinc-400 max-w-[220px] truncate disabled:opacity-50 ${themeSelect}`}
                                            title="Pilih interface Mikrotik"
                                        >
                                            {interfaceList.length === 0 ? (
                                                <option value="">Tidak ada interface</option>
                                            ) : (
                                                interfaceList.map((iface) => (
                                                    <option key={iface.name} value={iface.name}>
                                                        {iface.name} ({iface.type}{iface.running ? ', aktif' : ''})
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </div>

                                    {interfaceError && (
                                        <p className="text-xs font-semibold text-amber-500">{interfaceError}</p>
                                    )}

                                    <div className="grid grid-cols-2 gap-6 py-2">
                                        <div className="space-y-1">
                                            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">RX (Receive)</span>
                                            <p className={`text-xl font-bold tracking-tight ${themeTextTitle}`}>
                                                {selectedInterface ? formatSpeedBps(interfaceTraffic.rx_bps) : '—'}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">TX (Send)</span>
                                            <p className={`text-xl font-bold tracking-tight ${themeTextTitle}`}>
                                                {selectedInterface ? formatSpeedBps(interfaceTraffic.tx_bps) : '—'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="h-28 w-full">
                                        {trafficHistory.length === 0 ? (
                                            <div className={`h-full flex items-center justify-center text-xs font-medium tracking-tight ${themeTextSub}`}>
                                                {isLoadingInterfaces
                                                    ? 'Memuat interface...'
                                                    : selectedInterface
                                                        ? 'Menunggu data trafik...'
                                                        : 'Pilih interface terlebih dahulu'}
                                            </div>
                                        ) : (
                                            <Suspense fallback={<ChartFallback className="h-28" />}>
                                                <TrafficAreaChart data={trafficHistory} isDarkMode={isDarkMode} />
                                            </Suspense>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-zinc-450 dark:text-zinc-550 font-normal">
                                        RX/TX dari perspektif router via RouterOS monitor-traffic.
                                        {interfaceTraffic.sampled_at && (
                                            <> Terakhir diukur: {new Date(interfaceTraffic.sampled_at).toLocaleTimeString('id-ID')}.</>
                                        )}
                                        {' '}Refresh otomatis setiap 7 detik.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 pt-1">
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-xs">
                                    <div className="flex justify-between items-center py-2.5">
                                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Router</span>
                                        <span className={`font-semibold ${themeTextTitle} truncate max-w-[120px]`} title={serverResources.router_name}>
                                            {serverResources.router_name || '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2.5">
                                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">RouterOS</span>
                                        <span className={`font-semibold ${themeTextTitle}`}>{serverResources.os || '—'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2.5">
                                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Identity</span>
                                        <span className={`font-mono font-semibold ${themeTextTitle} truncate max-w-[120px]`} title={serverResources.hostname}>
                                            {serverResources.hostname || '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2.5">
                                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Storage</span>
                                        <span className={`font-semibold ${themeTextTitle}`}>{serverResources.disk ?? 0}%</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2.5">
                                        <span className="text-zinc-500 dark:text-zinc-400 font-medium">Total ODP</span>
                                        <span className={`font-semibold ${themeTextTitle}`}>{odpNodeCount} Node</span>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-1">
                                    <div className="flex justify-between items-center text-xs font-medium">
                                        <span className="text-zinc-550 dark:text-zinc-400">Utilisasi Port ODP</span>
                                        <span className="text-emerald-550 dark:text-emerald-450 font-semibold">{odpUsedPorts}/{odpTotalPorts} ({odpUtilizationPercent}%)</span>
                                    </div>
                                    <div className="w-full bg-zinc-100 dark:bg-zinc-800/80 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="bg-emerald-550 dark:bg-emerald-500 h-1.5 rounded-full"
                                            style={{ width: `${odpUtilizationPercent}%` }}
                                        />
                                    </div>
                                </div>

                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed font-normal pt-2 border-t border-zinc-100 dark:border-zinc-850/50">
                                    Peta topologi jaringan dan detail ODP dipindahkan ke menu utama **Peta Jaringan**.
                                </p>
                            </div>
                        </div>
                    </PremiumPanel>
                </div>

                <div className="space-y-4">
                    <PremiumPanel accent="sky" themeCard={themeCard} isDarkMode={isDarkMode} bodyClassName="p-6 space-y-4">
                        <PremiumPanelHeader
                            icon={Boxes}
                            accent="sky"
                            isDarkMode={isDarkMode}
                            themeTextTitle={themeTextTitle}
                            title="Inventaris ONT & Adaptor"
                            trailing={(
                                <Link
                                    href="/inventory"
                                    className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${isDarkMode ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
                                >
                                    Kelola
                                </Link>
                            )}
                        />

                        {inventoryLowStockCount > 0 && (
                            <div className="border-l-2 border-amber-500 pl-3 py-1">
                                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium leading-relaxed">
                                    {inventoryLowStockCount} item ONT/Adaptor stok menipis — segera restock.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {inventoryWatchEntries.map(([key, summary]) => {
                                const Icon = WATCH_CATEGORY_ICONS[key] || Boxes;
                                const isLow = summary.status === 'low';

                                return (
                                    <div
                                        key={key}
                                        className={`rounded-xl border p-4 transition-all duration-155 ${isLow
                                            ? 'border-amber-500/20 bg-amber-500/5'
                                            : 'border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/10'}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`text-xs font-medium ${isLow ? 'text-amber-500' : 'text-zinc-450 dark:text-zinc-400'}`}>
                                                {summary.label}
                                            </span>
                                            <Icon className={`w-4 h-4 shrink-0 ${isLow ? 'text-amber-500' : 'text-zinc-400 dark:text-zinc-500'}`} />
                                        </div>
                                        <p className={`text-2xl font-bold mt-2 tracking-tight ${themeTextTitle}`}>
                                            {Number(summary.total_quantity || 0).toLocaleString('id-ID')}
                                            <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-1 font-normal">pcs</span>
                                        </p>
                                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                                            {summary.item_count} jenis · {summary.low_stock_count} menipis
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {lowStockItems.length > 0 ? (
                            <div className="space-y-2.5">
                                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Perlu restock</p>
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                                    {lowStockItems.slice(0, 4).map((item) => (
                                        <div key={item.id} className="flex justify-between items-center py-2 text-xs">
                                            <span className={`font-medium ${themeTextTitle} truncate`}>{item.name}</span>
                                            <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">{item.quantity}/{item.min_stock}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">Semua stok ONT & Adaptor dalam batas aman.</p>
                        )}

                        {recentInventoryMovements.length > 0 && (
                            <div className="space-y-3.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                                <div className="flex items-center gap-1.5">
                                    <History className="w-3.5 h-3.5 text-zinc-405 dark:text-zinc-500" />
                                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Stok terakhir berubah</p>
                                </div>
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                                    {recentInventoryMovements.slice(0, 3).map((movement) => (
                                        <div key={movement.id} className="py-2.5 text-xs">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className={`font-semibold ${themeTextTitle} truncate`}>{movement.item?.name || '—'}</span>
                                                <span className={`font-bold tabular-nums shrink-0 ${movementTypeClass(movement.type)}`}>
                                                    {Number(movement.quantity_change) > 0 ? '+' : ''}{Number(movement.quantity_change).toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500 truncate">
                                                {movement.type_label}
                                                {movement.customer?.name ? ` · ${movement.customer.name}` : ''}
                                                {' · '}{movement.created_at_label}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </PremiumPanel>

                    <PremiumPanel accent="rose" themeCard={themeCard} isDarkMode={isDarkMode} bodyClassName="p-6 space-y-4">
                        <PremiumPanelHeader
                            icon={CreditCard}
                            accent="rose"
                            isDarkMode={isDarkMode}
                            themeTextTitle={themeTextTitle}
                            title="Ringkasan Tagihan & Operasional"
                            trailing={(
                                <Link
                                    href="/invoices"
                                    className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${isDarkMode ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}
                                >
                                    Tagihan
                                </Link>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="border border-zinc-100 dark:border-zinc-800/60 rounded-xl p-4 bg-white dark:bg-zinc-900/10 shadow-xxs">
                                <p className="text-xs font-semibold text-rose-500 dark:text-rose-400">Belum Lunas</p>
                                <p className={`text-xl font-bold mt-1.5 ${themeTextTitle}`}>{unpaidCount}</p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium">{formatRupiah(unpaidTotal)}</p>
                            </div>
                            <div className={`border rounded-xl p-4 transition-all duration-150 shadow-xxs ${overdueCount > 0
                                ? 'border-amber-500/20 bg-amber-500/5'
                                : 'border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/10'}`}
                            >
                                <p className={`text-xs font-semibold ${overdueCount > 0 ? 'text-amber-550' : 'text-zinc-450 dark:text-zinc-400'}`}>Jatuh Tempo Lewat</p>
                                <p className={`text-xl font-bold mt-1.5 ${overdueCount > 0 ? 'text-amber-500' : themeTextTitle}`}>{overdueCount}</p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-550 mt-1 font-medium">Invoice terlambat</p>
                            </div>
                            <div className="border border-zinc-100 dark:border-zinc-800/60 rounded-xl p-4 bg-white dark:bg-zinc-900/10 shadow-xxs">
                                <p className="text-xs font-semibold text-zinc-450 dark:text-zinc-400">Penundaan Aktif</p>
                                <p className={`text-xl font-bold mt-1.5 ${themeTextTitle}`}>{pendingDeferrals}</p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-550 mt-1 font-medium">Menunggu generate</p>
                            </div>
                            <div className="border border-zinc-100 dark:border-zinc-800/60 rounded-xl p-4 bg-white dark:bg-zinc-900/10 shadow-xxs">
                                <div className="flex items-center gap-1.5">
                                    <Wifi className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                                    <span className="text-xs font-semibold text-zinc-450 dark:text-zinc-400">Router Aktif</span>
                                </div>
                                <p className={`text-xl font-bold mt-1.5 ${themeTextTitle}`}>{routerActive}/{routerTotal}</p>
                                <p className="text-xs text-zinc-400 dark:text-zinc-550 mt-1 font-medium">Mikrotik online</p>
                            </div>
                        </div>

                        {(overdueCount > 0 || customerStats.isolated > 0) && (
                            <div className="border-l-2 border-rose-500 pl-3 py-1">
                                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium leading-relaxed">
                                    {overdueCount > 0 && `${overdueCount} tagihan lewat jatuh tempo. `}
                                    {customerStats.isolated > 0 && `${customerStats.isolated} pelanggan terisolir.`}
                                </p>
                            </div>
                        )}
                    </PremiumPanel>

                    <PremiumPanel accent="amber" themeCard={themeCard} isDarkMode={isDarkMode} bodyClassName="p-6 space-y-4">
                        <PremiumPanelHeader
                            icon={MessageSquare}
                            accent="amber"
                            isDarkMode={isDarkMode}
                            themeTextTitle={themeTextTitle}
                            themeTextDesc={themeTextDesc}
                            title="Log Generate Tagihan Otomatis"
                            trailing={<span className={`text-xs ${themeTextSub} font-semibold shrink-0`}>Auto Refresh</span>}
                        />

                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                            {waLogs.length === 0 ? (
                                <div className="py-6 text-center text-xs text-zinc-450 dark:text-zinc-500 font-medium">
                                    Belum ada log generate tagihan otomatis.
                                </div>
                            ) : (
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                                    {waLogs.map((log, idx) => (
                                        <div key={idx} className="py-3 flex flex-col gap-1 text-xs">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50 shrink-0">
                                                        {log.type}
                                                    </span>
                                                    <span className={`${themeTextTitle} font-semibold truncate`}>{log.target}</span>
                                                </div>
                                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono shrink-0">{log.time}</span>
                                            </div>
                                            <p className={`${themeTextDesc} text-xs leading-relaxed mt-0.5`}>{log.text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </PremiumPanel>
                </div>
            </div>
        </>
    );
}

export default function DashboardIndex(props) {
    return (
        <AdminLayout title="Dashboard">
            <DashboardContent {...props} />
        </AdminLayout>
    );
}
