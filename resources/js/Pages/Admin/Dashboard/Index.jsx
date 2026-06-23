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
                    <PremiumPanel accent="emerald" themeCard={themeCard} isDarkMode={isDarkMode} bodyClassName="p-4 space-y-4">
                        <PremiumPanelHeader
                            icon={Cpu}
                            accent="emerald"
                            isDarkMode={isDarkMode}
                            themeTextTitle={themeTextTitle}
                            title="NOC Monitor Kinerja Server & ODP"
                            trailing={(
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider whitespace-nowrap">Live Monitoring</span>
                                </div>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-zinc-500 font-bold">
                                    <span>Beban Resource CPU & RAM (Real-time) Mikrotik</span>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {routers.length > 0 ? (
                                            <select
                                                value={selectedRouterId}
                                                onChange={(e) => setSelectedRouterId(e.target.value)}
                                                className={`text-[10px] font-semibold px-2 py-1 rounded-lg border max-w-[180px] truncate ${themeSelect}`}
                                                title="Pilih router Mikrotik"
                                            >
                                                {routers.map((r) => (
                                                    <option key={r.id} value={r.id}>
                                                        {r.name} ({r.host})
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className="text-amber-500">Belum ada router</span>
                                        )}
                                        <span className="font-mono text-emerald-500 shrink-0">
                                            {isLoadingResources ? 'Memuat...' : 'Interval: 7s'}
                                        </span>
                                    </div>
                                </div>
                                {resourceError && (
                                    <p className="text-[10px] font-semibold text-amber-500">{resourceError}</p>
                                )}
                                <div className="h-44 w-full">
                                    {resourceHistory.length === 0 ? (
                                        <div className={`h-full flex items-center justify-center text-[10px] font-bold uppercase tracking-wider ${themeTextSub}`}>
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

                                <div className="space-y-2 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-zinc-500 font-bold">
                                        <span>Trafik Interface (Real-time)</span>
                                        <select
                                            value={selectedInterface}
                                            onChange={(e) => setSelectedInterface(e.target.value)}
                                            disabled={interfaceList.length === 0 || isLoadingInterfaces}
                                            className={`text-[10px] font-semibold px-2 py-1 rounded-lg border max-w-[220px] truncate disabled:opacity-50 ${themeSelect}`}
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
                                        <p className="text-[10px] font-semibold text-amber-500">{interfaceError}</p>
                                    )}

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className={`rounded-lg border p-2.5 ${isDarkMode ? 'border-sky-500/20 bg-sky-500/5' : 'border-sky-200 bg-sky-50/80'}`}>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                                RX (terima)
                                            </div>
                                            <p className={`text-sm font-black mt-1 ${themeTextTitle}`}>
                                                {selectedInterface ? formatSpeedBps(interfaceTraffic.rx_bps) : '—'}
                                            </p>
                                        </div>
                                        <div className={`rounded-lg border p-2.5 ${isDarkMode ? 'border-violet-500/20 bg-violet-500/5' : 'border-violet-200 bg-violet-50/80'}`}>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                                TX (kirim)
                                            </div>
                                            <p className={`text-sm font-black mt-1 ${themeTextTitle}`}>
                                                {selectedInterface ? formatSpeedBps(interfaceTraffic.tx_bps) : '—'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="h-28 w-full">
                                        {trafficHistory.length === 0 ? (
                                            <div className={`h-full flex items-center justify-center text-[10px] font-bold uppercase tracking-wider ${themeTextSub}`}>
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
                                    <p className="text-[9px] text-zinc-500 dark:text-zinc-400">
                                        RX/TX dari perspektif router via RouterOS monitor-traffic.
                                        {interfaceTraffic.sampled_at && (
                                            <> Terakhir diukur: {new Date(interfaceTraffic.sampled_at).toLocaleTimeString('id-ID')}.</>
                                        )}
                                        {' '}Refresh otomatis setiap 7 detik.
                                    </p>
                                </div>
                            </div>

                            <div className={`p-3 rounded-xl border flex flex-col justify-between space-y-2.5 ${isDarkMode ? 'bg-zinc-950/30 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'}`}>
                                <div className="space-y-2 text-[11px] sm:text-xs">
                                    <div className="flex justify-between items-center font-bold gap-2">
                                        <span className={themeTextSub}>Router</span>
                                        <span className={`${themeTextTitle} truncate max-w-[110px] text-right`} title={serverResources.router_name}>
                                            {serverResources.router_name || '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center font-bold">
                                        <span className={themeTextSub}>RouterOS</span>
                                        <span className={`${themeTextTitle} truncate max-w-[110px] text-right`} title={serverResources.os}>
                                            {serverResources.os}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center font-bold">
                                        <span className={themeTextSub}>Identity</span>
                                        <span className={`${themeTextTitle} truncate max-w-[110px] font-mono text-right`} title={serverResources.hostname}>
                                            {serverResources.hostname}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center font-bold">
                                        <span className={themeTextSub}>Storage</span>
                                        <span className={themeTextTitle}>{serverResources.disk ?? 0}%</span>
                                    </div>
                                    <div className="flex justify-between items-center font-bold">
                                        <span className={themeTextSub}>Total ODP</span>
                                        <span className={themeTextTitle}>{odpNodeCount} Node</span>
                                    </div>
                                    <div className="space-y-1.5 pt-1.5 border-t border-zinc-200/50 dark:border-zinc-800/50">
                                        <div className="flex justify-between items-center text-[10px] font-bold">
                                            <span className={themeTextSub}>Utilisasi Port ODP</span>
                                            <span className="text-emerald-500">{odpUsedPorts}/{odpTotalPorts} ({odpUtilizationPercent}%)</span>
                                        </div>
                                        <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="bg-emerald-500 h-1.5 rounded-full"
                                                style={{ width: `${odpUtilizationPercent}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium leading-tight pt-1.5 border-t border-zinc-200/50 dark:border-zinc-800/50">
                                    Peta topologi jaringan dan detail ODP dipindahkan ke menu utama **Peta Jaringan**.
                                </div>
                            </div>
                        </div>
                    </PremiumPanel>
                </div>

                <div className="space-y-4">
                    <PremiumPanel accent="sky" themeCard={themeCard} isDarkMode={isDarkMode} bodyClassName="p-4 space-y-3">
                        <PremiumPanelHeader
                            icon={Boxes}
                            accent="sky"
                            isDarkMode={isDarkMode}
                            themeTextTitle={themeTextTitle}
                            title="Inventaris ONT & Adaptor"
                            trailing={(
                                <Link
                                    href="/inventory"
                                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${isDarkMode ? 'border-sky-500/30 text-sky-300 hover:bg-sky-500/10' : 'border-sky-200 text-sky-700 hover:bg-sky-50'}`}
                                >
                                    Kelola
                                </Link>
                            )}
                        />

                        {inventoryLowStockCount > 0 && (
                            <div className={`rounded-lg border px-2.5 py-2 flex items-start gap-2 ${isDarkMode ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-200 bg-amber-50/80'}`}>
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className={`text-[10px] font-bold leading-snug ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>
                                    {inventoryLowStockCount} item ONT/Adaptor stok menipis — segera restock.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {inventoryWatchEntries.map(([key, summary]) => {
                                const Icon = WATCH_CATEGORY_ICONS[key] || Boxes;
                                const isLow = summary.status === 'low';

                                return (
                                    <div
                                        key={key}
                                        className={`rounded-xl border p-2.5 ${isLow
                                            ? (isDarkMode ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-200 bg-amber-50/70')
                                            : themeInnerWidget}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className={`text-[10px] font-bold uppercase tracking-wide ${isLow ? 'text-amber-500' : themeTextSub}`}>
                                                    {summary.label}
                                                </p>
                                                <p className={`text-xl font-black mt-1 tabular-nums ${themeTextTitle}`}>
                                                    {Number(summary.total_quantity || 0).toLocaleString('id-ID')}
                                                    <span className={`text-[10px] font-bold ml-1 ${themeTextSub}`}>pcs</span>
                                                </p>
                                            </div>
                                            <Icon className={`w-4 h-4 shrink-0 ${isLow ? 'text-amber-500' : 'text-sky-500'}`} />
                                        </div>
                                        <p className={`text-[10px] mt-1.5 ${themeTextDesc}`}>
                                            {summary.item_count} jenis · {summary.low_stock_count} menipis
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {lowStockItems.length > 0 ? (
                            <div className="space-y-1.5">
                                <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Perlu restock</p>
                                {lowStockItems.slice(0, 4).map((item) => (
                                    <div key={item.id} className={`p-2 border rounded-lg text-[10px] font-semibold flex items-center justify-between gap-2 ${themeInnerWidget}`}>
                                        <span className={`truncate ${themeTextTitle}`}>{item.name}</span>
                                        <span className="text-amber-500 tabular-nums shrink-0">{item.quantity}/{item.min_stock}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={`text-[10px] ${themeTextDesc}`}>Semua stok ONT & Adaptor dalam batas aman.</p>
                        )}

                        {recentInventoryMovements.length > 0 && (
                            <div className="space-y-1.5 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/50">
                                <div className="flex items-center gap-1.5">
                                    <History className={`w-3.5 h-3.5 ${themeTextDesc}`} />
                                    <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Stok terakhir berubah</p>
                                </div>
                                {recentInventoryMovements.slice(0, 3).map((movement) => (
                                    <div key={movement.id} className={`p-2 border rounded-lg text-[10px] ${themeInnerWidget}`}>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className={`font-bold truncate ${themeTextTitle}`}>{movement.item?.name || '—'}</span>
                                            <span className={`font-black tabular-nums shrink-0 ${movementTypeClass(movement.type)}`}>
                                                {Number(movement.quantity_change) > 0 ? '+' : ''}{Number(movement.quantity_change).toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                        <p className={`mt-0.5 truncate ${themeTextDesc}`}>
                                            {movement.type_label}
                                            {movement.customer?.name ? ` · ${movement.customer.name}` : ''}
                                            {' · '}{movement.created_at_label}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </PremiumPanel>

                    <PremiumPanel accent="rose" themeCard={themeCard} isDarkMode={isDarkMode} bodyClassName="p-4 space-y-3">
                        <PremiumPanelHeader
                            icon={CreditCard}
                            accent="rose"
                            isDarkMode={isDarkMode}
                            themeTextTitle={themeTextTitle}
                            title="Ringkasan Tagihan & Operasional"
                            trailing={(
                                <Link
                                    href="/invoices"
                                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${isDarkMode ? 'border-rose-500/30 text-rose-300 hover:bg-rose-500/10' : 'border-rose-200 text-rose-700 hover:bg-rose-50'}`}
                                >
                                    Tagihan
                                </Link>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-2">
                            <div className={`rounded-xl border p-2.5 ${isDarkMode ? 'border-rose-500/20 bg-rose-500/5' : 'border-rose-200 bg-rose-50/70'}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wide ${isDarkMode ? 'text-rose-300/90' : 'text-rose-700'}`}>Belum Lunas</p>
                                <p className={`text-lg font-black mt-1 leading-none ${themeTextTitle}`}>{unpaidCount}</p>
                                <p className={`text-[10px] font-bold mt-1 ${themeTextDesc}`}>{formatRupiah(unpaidTotal)}</p>
                            </div>
                            <div className={`rounded-xl border p-2.5 ${overdueCount > 0
                                ? (isDarkMode ? 'border-amber-500/30 bg-amber-500/5' : 'border-amber-200 bg-amber-50/70')
                                : themeInnerWidget}`}
                            >
                                <p className={`text-[10px] font-bold uppercase tracking-wide ${overdueCount > 0 ? 'text-amber-500' : themeTextSub}`}>Jatuh Tempo Lewat</p>
                                <p className={`text-lg font-black mt-1 leading-none ${overdueCount > 0 ? 'text-amber-500' : themeTextTitle}`}>{overdueCount}</p>
                                <p className={`text-[10px] font-bold mt-1 ${themeTextDesc}`}>Invoice terlambat</p>
                            </div>
                            <div className={`rounded-xl border p-2.5 ${themeInnerWidget}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Penundaan Aktif</p>
                                <p className={`text-lg font-black mt-1 leading-none ${themeTextTitle}`}>{pendingDeferrals}</p>
                                <p className={`text-[10px] font-bold mt-1 ${themeTextDesc}`}>Menunggu generate</p>
                            </div>
                            <div className={`rounded-xl border p-2.5 ${themeInnerWidget}`}>
                                <div className="flex items-center gap-1.5">
                                    <Wifi className={`w-3.5 h-3.5 ${themeTextDesc}`} />
                                    <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Router Aktif</p>
                                </div>
                                <p className={`text-lg font-black mt-1 leading-none ${themeTextTitle}`}>{routerActive}/{routerTotal}</p>
                                <p className={`text-[10px] font-bold mt-1 ${themeTextDesc}`}>Mikrotik online</p>
                            </div>
                        </div>

                        {(overdueCount > 0 || customerStats.isolated > 0) && (
                            <div className={`rounded-lg border px-2.5 py-2 ${isDarkMode ? 'border-rose-500/25 bg-rose-500/5' : 'border-rose-200 bg-rose-50/80'}`}>
                                <p className={`text-[10px] font-bold leading-snug ${isDarkMode ? 'text-rose-300' : 'text-rose-800'}`}>
                                    {overdueCount > 0 && `${overdueCount} tagihan lewat jatuh tempo. `}
                                    {customerStats.isolated > 0 && `${customerStats.isolated} pelanggan terisolir.`}
                                </p>
                            </div>
                        )}
                    </PremiumPanel>

                    <PremiumPanel accent="amber" themeCard={themeCard} isDarkMode={isDarkMode} bodyClassName="p-4 space-y-3">
                        <PremiumPanelHeader
                            icon={MessageSquare}
                            accent="amber"
                            isDarkMode={isDarkMode}
                            themeTextTitle={themeTextTitle}
                            themeTextDesc={themeTextDesc}
                            title="Log Generate Tagihan Otomatis"
                            trailing={<span className={`text-[10px] ${themeTextSub} font-bold shrink-0`}>Auto Refresh</span>}
                        />

                        <div className="space-y-1.5 max-h-[195px] overflow-y-auto pr-1">
                            {waLogs.length === 0 ? (
                                <div className="py-6 text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                    Belum ada log generate tagihan otomatis.
                                </div>
                            ) : (
                                waLogs.map((log, idx) => (
                                    <div key={idx} className={`p-2 border rounded-lg flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between text-[10px] font-semibold transition-colors duration-150 ${isDarkMode ? 'bg-zinc-950/40 border-zinc-900/50' : 'bg-zinc-50 border-zinc-200/50'}`}>
                                        <div className="space-y-0.5 min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border shrink-0 ${isDarkMode ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-zinc-200 text-zinc-600 border-zinc-300'}`}>
                                                    {log.type}
                                                </span>
                                                <span className={`${themeTextTitle} font-bold truncate`}>{log.target}</span>
                                            </div>
                                            <p className={`${themeTextDesc} text-[10px] leading-snug line-clamp-2 sm:line-clamp-1`}>{log.text}</p>
                                        </div>
                                        <span className={`text-[10px] ${themeTextSub} font-mono shrink-0 self-end sm:self-auto`}>{log.time}</span>
                                    </div>
                                ))
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
