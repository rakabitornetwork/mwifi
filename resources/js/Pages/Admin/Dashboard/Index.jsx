import { lazy, Suspense, useState, useEffect, useMemo } from 'react';
import { router } from '@inertiajs/react';
import {
    Users,
    UserX,
    Radio,
    Cpu,
    Sliders,
    Layers,
    MessageSquare,
    Power,
    Radar,
    RefreshCw,
    TrendingUp,
    Wallet,
    ArrowDownLeft,
    ArrowUpRight,
} from 'lucide-react';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';
import { formatRupiah } from '../../../utils/formatRupiah';
import { bpsToMbps, formatSpeedBps } from '../../../utils/formatSpeedBps';

const chartModule = () => import('../../../Components/Admin/DashboardCharts');
const RevenueBarChart = lazy(() => chartModule().then((module) => ({ default: module.RevenueBarChart })));
const ResourceAreaChart = lazy(() => chartModule().then((module) => ({ default: module.ResourceAreaChart })));
const TrafficAreaChart = lazy(() => chartModule().then((module) => ({ default: module.TrafficAreaChart })));

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
    unpaidInvoicesSummary = {},
    odpSummary = {},
    billingActivityLogs = [],
    monthlyRevenue = {},
    todayRevenue = {},
}) {
    const theme = useAdminTheme();
    const { showToast } = useAdminToast();
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
    const [ontDevices, setOntDevices] = useState([]);
    const [isLoadingOnt, setIsLoadingOnt] = useState(true);
    const [isSyncingRouter, setIsSyncingRouter] = useState(null);
    const monitorIntervalMs = 7000;

    const fetchOntDevices = async () => {
        setIsLoadingOnt(true);
        try {
            const res = await fetch('/admin/gpon/status');
            const data = await res.json();
            setOntDevices(data);
        } catch (err) {
            console.error('Failed to load ONT devices', err);
        } finally {
            setIsLoadingOnt(false);
        }
    };

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
        fetchOntDevices();
    }, []);

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

    const handleRebootOnt = async (deviceId) => {
        if (!confirm('Apakah Anda yakin ingin me-reboot perangkat ONT ini?')) return;

        try {
            const response = await fetch('/admin/gpon/reboot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ device_id: deviceId }),
            });
            const result = await response.json();
            if (result.success) {
                showToast(result.message, 'success');
                fetchOntDevices();
            } else {
                showToast(result.message || 'Gagal mengirimkan perintah reboot.', 'error');
            }
        } catch {
            showToast('Error: Gagal me-reboot perangkat.', 'error');
        }
    };

    const handleSyncRouter = async (routerId) => {
        const id = routerId || (routers && routers[0] ? routers[0].id : null);
        if (!id) {
            showToast('Tidak ada router yang dapat disinkronkan.', 'warning');
            return;
        }

        setIsSyncingRouter(id);
        try {
            const response = await fetch('/admin/routers/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ router_id: id }),
            });
            const result = await response.json();
            showToast(result.message, result.success ? 'success' : 'error');
            if (result.success) {
                router.reload();
            }
        } catch {
            showToast('Error: Gagal menghubungi server saat melakukan sinkronisasi.', 'error');
        } finally {
            setIsSyncingRouter(null);
        }
    };

    const handleScanOlt = () => {
        showToast('Pemindaian GPON OLT berhasil dijalankan. Data redaman diperbarui.', 'success');
        fetchOntDevices();
    };

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
            change: 'ONT Terhubung',
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
            change: 'Menunggak',
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

    const activeOntDevices = ontDevices.filter((dev) => dev.status !== 'offline' && dev.username !== 'unknown_ont');

    const revenueSeries = monthlyRevenue?.series ?? [];
    const currentRevenue = monthlyRevenue?.current_month ?? {};
    const previousRevenue = monthlyRevenue?.previous_month ?? {};
    const revenueChangePercent = Number(monthlyRevenue?.change_percent ?? 0);
    const revenueTrendLabel = revenueChangePercent > 0
        ? `+${revenueChangePercent}% vs bulan lalu`
        : revenueChangePercent < 0
        ? `${revenueChangePercent}% vs bulan lalu`
        : 'Sama dengan bulan lalu';

    const unpaidTotal = Number(unpaidInvoicesSummary?.total ?? 0);
    const unpaidCount = Number(unpaidInvoicesSummary?.count ?? 0);
    const odpNodeCount = Number(odpSummary?.node_count ?? 0);
    const odpTotalPorts = Number(odpSummary?.total_ports ?? 0);
    const odpUsedPorts = Number(odpSummary?.used_ports ?? 0);
    const odpUtilizationPercent = odpTotalPorts > 0 ? Math.round((odpUsedPorts / odpTotalPorts) * 100) : 0;

    const revenueCards = useMemo(() => [
        {
            label: `Bulan Ini · ${currentRevenue.label || '-'}`,
            value: formatRupiah(currentRevenue.total || 0),
            sub: `${currentRevenue.invoice_count || 0} pembayaran · ${revenueTrendLabel}`,
            cardClass: 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400/20 text-white shadow-md shadow-emerald-500/10',
            labelClass: 'text-emerald-100/90',
            valueClass: 'text-white',
            subClass: 'text-emerald-100/75',
        },
        {
            label: `Bulan Lalu · ${previousRevenue.label || '-'}`,
            value: formatRupiah(previousRevenue.total || 0),
            sub: `${previousRevenue.invoice_count || 0} pembayaran lunas`,
            cardClass: 'bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-400/20 text-white shadow-md shadow-indigo-500/10',
            labelClass: 'text-indigo-100/90',
            valueClass: 'text-white',
            subClass: 'text-indigo-100/75',
        },
        {
            label: 'Belum Tertagih (Aktif)',
            value: formatRupiah(unpaidTotal),
            sub: `${unpaidCount} invoice belum bayar`,
            cardClass: 'bg-gradient-to-br from-rose-500 to-red-600 border-rose-400/20 text-white shadow-md shadow-rose-500/10',
            labelClass: 'text-rose-100/90',
            valueClass: 'text-white',
            subClass: 'text-rose-100/75',
        },
    ], [currentRevenue.invoice_count, currentRevenue.label, currentRevenue.total, previousRevenue.invoice_count, previousRevenue.label, previousRevenue.total, revenueTrendLabel, unpaidCount, unpaidTotal]);

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

            <div className={`${themeCard} border rounded-2xl p-4 shadow-xs space-y-4`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-200/50 dark:border-zinc-800/40">
                    <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <h3 className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Pendapatan Bulanan</h3>
                    </div>
                    <span className={`text-[10px] ${themeTextDesc}`}>Berdasarkan invoice lunas (tanggal bayar)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {revenueCards.map((card) => (
                        <div
                            key={card.label}
                            className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all duration-200 hover:scale-[1.02] ${card.cardClass}`}
                        >
                            <p className={`text-[10px] font-bold uppercase tracking-wide ${card.labelClass}`}>
                                {card.label}
                            </p>
                            <div className="mt-2">
                                <p className={`text-xl sm:text-2xl font-extrabold tracking-tight leading-none ${card.valueClass}`}>
                                    {card.value}
                                </p>
                                <p className={`text-[10px] font-bold mt-1.5 ${card.subClass}`}>
                                    {card.sub}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="space-y-1.5">
                    <p className={`text-[10px] font-bold ${themeTextSub}`}>Tren 6 Bulan Terakhir</p>
                    <div className="h-48 w-full">
                        {revenueSeries.length === 0 ? (
                            <div className={`h-full flex items-center justify-center text-[10px] font-bold uppercase ${themeTextDesc}`}>
                                Belum ada data pendapatan
                            </div>
                        ) : (
                            <Suspense fallback={<ChartFallback className="h-48" />}>
                                <RevenueBarChart data={revenueSeries} isDarkMode={isDarkMode} />
                            </Suspense>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div className={`${themeCard} border rounded-2xl p-4 shadow-xs space-y-4`}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-zinc-200/50 dark:border-zinc-800/40">
                            <div className="flex items-center gap-2 min-w-0">
                                <Cpu className="w-4 h-4 text-emerald-500 animate-pulse shrink-0" />
                                <h3 className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate ${themeTextTitle}`}>NOC Monitor Kinerja Server & ODP</h3>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider whitespace-nowrap">Live Monitoring</span>
                            </div>
                        </div>

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
                    </div>
                </div>

                <div className="space-y-4">
                    <div className={`${themeCard} rounded-2xl p-4 shadow-sm space-y-3 transition-colors duration-250`}>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <Layers className="w-4 h-4 text-emerald-500" />
                                <h3 className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>GenieACS: Monitor Redaman ONT</h3>
                            </div>
                            <div className="flex items-center space-x-2">
                                <button
                                    type="button"
                                    onClick={fetchOntDevices}
                                    disabled={isLoadingOnt}
                                    title="Refresh daftar ONT"
                                    className={`p-1 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'hover:bg-zinc-900 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'} ${isLoadingOnt ? 'animate-spin' : ''}`}
                                >
                                    <RefreshCw className="w-3 h-3" />
                                </button>
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            </div>
                        </div>

                        <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                            {isLoadingOnt ? (
                                <div className="py-8 text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                    Loading ONT status...
                                </div>
                            ) : activeOntDevices.length === 0 ? (
                                <div className="py-8 text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                    No active/online ONT devices found.
                                </div>
                            ) : (
                                activeOntDevices.map((dev, idx) => {
                                    const rxColor =
                                        dev.status === 'good' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                            : dev.status === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                : dev.status === 'offline' ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                                    : 'bg-rose-500/10 text-rose-500 border-rose-500/20';
                                    return (
                                        <div key={idx} className={`p-2 border rounded-xl flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-[13px] font-semibold transition-colors duration-150 ${themeInnerWidget}`}>
                                            <div className="space-y-0.5 min-w-0 flex-1">
                                                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                                    <span className={`font-bold truncate max-w-full ${themeTextTitle}`}>{dev.username}</span>
                                                    <span className={`text-[10px] sm:text-[11px] ${themeTextSub} font-mono shrink-0`}>({dev.model})</span>
                                                </div>
                                                <p className={`text-[10px] sm:text-[11px] ${themeTextSub} font-mono leading-none truncate`}>SN: {dev.sn}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRebootOnt(dev.id)}
                                                    title="Reboot ONT"
                                                    className={`p-1.5 rounded border transition-colors cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-300' : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-600 shadow-2xs'}`}
                                                >
                                                    <Power className="w-3.5 h-3.5" />
                                                </button>
                                                <span className={`inline-block w-[85px] text-center px-1 py-0.5 rounded font-mono text-[11px] sm:text-xs font-bold border whitespace-nowrap shrink-0 ${rxColor}`}>
                                                    {dev.rx}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className={`${themeCard} rounded-2xl p-4 shadow-sm space-y-3 transition-colors duration-250`}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                                <MessageSquare className="w-4 h-4 text-emerald-500 shrink-0" />
                                <h3 className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Log Generate Tagihan Otomatis</h3>
                            </div>
                            <span className={`text-xs ${themeTextSub} font-medium shrink-0`}>Auto Refresh</span>
                        </div>

                        <div className="space-y-2 max-h-[195px] overflow-y-auto pr-1">
                            {waLogs.length === 0 ? (
                                <div className="py-8 text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                    Belum ada log generate tagihan otomatis.
                                </div>
                            ) : (
                                waLogs.map((log, idx) => (
                                    <div key={idx} className={`p-2 border rounded-lg flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between text-xs sm:text-[13px] font-medium transition-colors duration-150 ${isDarkMode ? 'bg-zinc-950/40 border-zinc-900/50' : 'bg-zinc-50 border-zinc-200/50'}`}>
                                        <div className="space-y-0.5 min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase border shrink-0 ${isDarkMode ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-zinc-200 text-zinc-600 border-zinc-300'}`}>
                                                    {log.type}
                                                </span>
                                                <span className={`${themeTextTitle} font-bold truncate`}>{log.target}</span>
                                            </div>
                                            <p className={`${themeTextDesc} line-clamp-2 sm:line-clamp-1`}>{log.text}</p>
                                        </div>
                                        <span className={`text-[10px] sm:text-[11px] ${themeTextSub} font-mono shrink-0 self-end sm:self-auto`}>{log.time}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className={`p-3 border rounded-2xl flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-[13px] font-bold transition-colors duration-250 ${themeInnerWidget}`}>
                        <div className="flex items-center gap-2 min-w-0">
                            <Sliders className={`w-3.5 h-3.5 shrink-0 ${themeTextSub}`} />
                            <span className={`truncate ${themeTextTitle}`}>Quick Tools Panel</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 shrink-0 self-end sm:self-auto">
                            <button
                                type="button"
                                onClick={() => handleSyncRouter()}
                                disabled={isSyncingRouter !== null}
                                title={isSyncingRouter !== null ? 'Sinkronisasi...' : 'Sync Router'}
                                className={`p-2 border rounded-lg transition-all duration-150 cursor-pointer inline-flex items-center justify-center disabled:opacity-50 ${isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 shadow-xs'}`}
                            >
                                <RefreshCw className={`w-4 h-4 ${isSyncingRouter !== null ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                type="button"
                                onClick={handleScanOlt}
                                title="Scan OLT"
                                className={`p-2 border rounded-lg transition-all duration-150 cursor-pointer inline-flex items-center justify-center ${isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 shadow-xs'}`}
                            >
                                <Radar className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
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
