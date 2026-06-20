import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import {
    Users,
    CreditCard,
    Activity,
    AlertCircle,
    UserX,
    Radio,
    Cpu,
    Sliders,
    Layers,
    MessageSquare,
    RefreshCw,
} from 'lucide-react';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';

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
    customers = [],
    routers = [],
    invoices = [],
    billingActivityLogs = [],
    odps = [],
}) {
    const theme = useAdminTheme();
    const { showToast } = useAdminToast();
    const { isDarkMode, themeCard, themeTextTitle, themeTextSub, themeTextDesc } = theme;
    const themeInnerWidget = isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';

    const [serverResources, setServerResources] = useState({ cpu: 15, ram: 35, disk: 20, os: 'VPS', hostname: 'vps-server' });
    const [resourceHistory, setResourceHistory] = useState([]);
    const [ontDevices, setOntDevices] = useState([]);
    const [isLoadingOnt, setIsLoadingOnt] = useState(true);
    const [isSyncingRouter, setIsSyncingRouter] = useState(null);

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
        try {
            const res = await fetch('/admin/server/resources');
            const data = await res.json();
            setServerResources(data);
        } catch (err) {
            console.error('Failed to load server resources', err);
        }
    };

    useEffect(() => {
        fetchOntDevices();
        fetchServerResources();
        const interval = setInterval(fetchServerResources, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timeNow = new Date();
        const initialHistory = [];
        for (let i = 9; i >= 0; i--) {
            const t = new Date(timeNow.getTime() - i * 15000);
            initialHistory.push({
                time: t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                cpu: 10 + Math.floor(Math.random() * 8),
                ram: 32 + Math.floor(Math.random() * 4),
            });
        }
        setResourceHistory(initialHistory);
    }, []);

    useEffect(() => {
        if (!serverResources) return;
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

    const stats = [
        {
            name: 'PPP Active',
            value: customers.filter((c) => c.service_type === 'pppoe' && c.status === 'active').length,
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
            value: customers.filter((c) => c.service_type === 'hotspot' && c.status === 'active').length,
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
            value: customers.filter((c) => c.status === 'isolated').length,
            change: 'Menunggak',
            icon: UserX,
            cardClass: 'bg-gradient-to-br from-rose-500 to-red-600 border-rose-400/20 text-white shadow-md shadow-rose-500/5',
            iconClass: 'text-rose-100',
            nameClass: 'text-rose-100/80',
            valClass: 'text-white',
            changeClass: 'text-rose-100/70',
        },
        {
            name: 'Total Pelanggan',
            value: customers.length,
            change: 'Basis Data',
            icon: Activity,
            cardClass: 'bg-gradient-to-br from-purple-500 to-violet-600 border-purple-400/20 text-white shadow-md shadow-purple-500/5',
            iconClass: 'text-purple-100',
            nameClass: 'text-purple-100/80',
            valClass: 'text-white',
            changeClass: 'text-purple-100/70',
        },
        {
            name: 'Total Invoice',
            value: invoices.length,
            change: 'Terbit bulanan',
            icon: CreditCard,
            cardClass: 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-400/20 text-white shadow-md shadow-amber-500/5',
            iconClass: 'text-amber-100',
            nameClass: 'text-amber-100/80',
            valClass: 'text-white',
            changeClass: 'text-amber-100/70',
        },
        {
            name: 'Belum Bayar',
            value: invoices.filter((inv) => inv.status === 'unpaid').length,
            change: 'Tagihan pending',
            icon: AlertCircle,
            cardClass: 'bg-gradient-to-br from-cyan-500 to-sky-600 border-cyan-400/20 text-white shadow-md shadow-cyan-500/5',
            iconClass: 'text-cyan-100',
            nameClass: 'text-cyan-100/80',
            valClass: 'text-white',
            changeClass: 'text-cyan-100/70',
        },
    ];

    const waLogs = (billingActivityLogs || []).slice(0, 8).map((log) => ({
        type: 'Billing',
        target: log.meta?.admin_phone || (log.meta?.invoice_count > 0 ? 'Admin' : 'Scheduler'),
        text: log.message,
        status: log.meta?.admin_notified ? 'sent' : (log.meta?.invoice_count > 0 ? 'pending' : 'system'),
        time: formatTimeAgo(log.created_at),
    }));

    const activeOntDevices = ontDevices.filter((dev) => dev.status !== 'offline' && dev.username !== 'unknown_ont');

    return (
        <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <div className={`${themeCard} border rounded-2xl p-4 shadow-xs space-y-4`}>
                        <div className="flex justify-between items-center pb-2 border-b border-zinc-200/50 dark:border-zinc-800/40">
                            <div className="flex items-center space-x-2">
                                <Cpu className="w-4 h-4 text-emerald-500 animate-pulse" />
                                <h3 className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>NOC Monitor Kinerja Server & ODP</h3>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Live Monitoring</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2 space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold">
                                    <span>Beban Resource CPU & RAM (Real-time)</span>
                                    <span className="font-mono text-emerald-500">Interval: 15s</span>
                                </div>
                                <div className="h-44 w-full">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <AreaChart data={resourceHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#27272a' : '#e4e4e7'} />
                                            <XAxis dataKey="time" stroke={isDarkMode ? '#a1a1aa' : '#71717a'} fontSize={8} tickLine={false} />
                                            <YAxis domain={[0, 100]} stroke={isDarkMode ? '#a1a1aa' : '#71717a'} fontSize={8} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderColor: isDarkMode ? '#27272a' : '#e4e4e7', borderRadius: '8px', fontSize: '10px' }}
                                            />
                                            <Area type="monotone" dataKey="cpu" name="CPU" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#colorCpu)" />
                                            <Area type="monotone" dataKey="ram" name="RAM" stroke="#6366f1" strokeWidth={1.5} fillOpacity={1} fill="url(#colorRam)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className={`p-3 rounded-xl border flex flex-col justify-between space-y-2.5 ${isDarkMode ? 'bg-zinc-950/30 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'}`}>
                                <div className="space-y-2 text-[11px] sm:text-xs">
                                    <div className="flex justify-between items-center font-bold">
                                        <span className={themeTextSub}>Sistem OS</span>
                                        <span className={themeTextTitle}>{serverResources.os}</span>
                                    </div>
                                    <div className="flex justify-between items-center font-bold">
                                        <span className={themeTextSub}>Hostname</span>
                                        <span className={`${themeTextTitle} truncate max-w-[80px] font-mono`} title={serverResources.hostname}>{serverResources.hostname}</span>
                                    </div>
                                    <div className="flex justify-between items-center font-bold">
                                        <span className={themeTextSub}>Total ODP</span>
                                        <span className={themeTextTitle}>{odps.length} Node</span>
                                    </div>
                                    {(() => {
                                        const totalPorts = odps.reduce((acc, o) => acc + parseInt(o.total_ports || 0, 10), 0);
                                        const usedPorts = odps.reduce((acc, o) => acc + parseInt(o.used_ports || 0, 10), 0);
                                        const percent = totalPorts > 0 ? Math.round((usedPorts / totalPorts) * 100) : 0;
                                        return (
                                            <div className="space-y-1.5 pt-1.5 border-t border-zinc-200/50 dark:border-zinc-800/50">
                                                <div className="flex justify-between items-center text-[10px] font-bold">
                                                    <span className={themeTextSub}>Utilisasi Port ODP</span>
                                                    <span className="text-emerald-500">{usedPorts}/{totalPorts} ({percent}%)</span>
                                                </div>
                                                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                                    <div
                                                        className="bg-emerald-500 h-1.5 rounded-full"
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })()}
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
                                    className={`p-1 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-zinc-900 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'} ${isLoadingOnt ? 'animate-spin' : ''}`}
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
                                        <div key={idx} className={`p-2 border rounded-xl flex items-center justify-between text-xs sm:text-[13px] font-semibold transition-colors duration-150 ${themeInnerWidget}`}>
                                            <div className="space-y-0.5">
                                                <div className="flex items-center space-x-1.5">
                                                    <span className={`font-bold ${themeTextTitle}`}>{dev.username}</span>
                                                    <span className={`text-[10px] sm:text-[11px] ${themeTextSub} font-mono`}>({dev.model})</span>
                                                </div>
                                                <p className={`text-[10px] sm:text-[11px] ${themeTextSub} font-mono leading-none`}>SN: {dev.sn}</p>
                                            </div>
                                            <div className="flex items-center space-x-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRebootOnt(dev.id)}
                                                    className={`px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold border transition-colors cursor-pointer ${isDarkMode ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-zinc-700 text-zinc-300' : 'bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-600 shadow-2xs'}`}
                                                >
                                                    Reboot
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
                        <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                                <MessageSquare className="w-4 h-4 text-emerald-500" />
                                <h3 className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Log Generate Tagihan Otomatis</h3>
                            </div>
                            <span className={`text-xs ${themeTextSub} font-medium`}>Auto Refresh</span>
                        </div>

                        <div className="space-y-2 max-h-[195px] overflow-y-auto pr-1">
                            {waLogs.length === 0 ? (
                                <div className="py-8 text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                    Belum ada log generate tagihan otomatis.
                                </div>
                            ) : (
                                waLogs.map((log, idx) => (
                                    <div key={idx} className={`p-2 border rounded-lg flex items-start justify-between text-xs sm:text-[13px] font-medium space-x-3 transition-colors duration-150 ${isDarkMode ? 'bg-zinc-950/40 border-zinc-900/50' : 'bg-zinc-50 border-zinc-200/50'}`}>
                                        <div className="space-y-0.5">
                                            <div className="flex items-center space-x-1.5">
                                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase border ${isDarkMode ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-zinc-200 text-zinc-600 border-zinc-300'}`}>
                                                    {log.type}
                                                </span>
                                                <span className={`${themeTextTitle} font-bold`}>{log.target}</span>
                                            </div>
                                            <p className={`${themeTextDesc} line-clamp-1`}>{log.text}</p>
                                        </div>
                                        <span className={`text-[10px] sm:text-[11px] ${themeTextSub} font-mono whitespace-nowrap`}>{log.time}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className={`p-3 border rounded-2xl flex items-center justify-between text-xs sm:text-[13px] font-bold transition-colors duration-250 ${themeInnerWidget}`}>
                        <div className="flex items-center space-x-2">
                            <Sliders className={`w-3.5 h-3.5 ${themeTextSub}`} />
                            <span className={themeTextTitle}>Quick Tools Panel</span>
                        </div>
                        <div className="flex space-x-1.5">
                            <button
                                type="button"
                                onClick={() => handleSyncRouter()}
                                disabled={isSyncingRouter !== null}
                                className={`px-2 py-1 border rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 ${isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 shadow-xs'}`}
                            >
                                {isSyncingRouter !== null ? 'Syncing...' : 'Sync Router'}
                            </button>
                            <button
                                type="button"
                                onClick={handleScanOlt}
                                className={`px-2 py-1 border rounded-lg transition-all duration-150 cursor-pointer ${isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 shadow-xs'}`}
                            >
                                Scan OLT
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
