import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
    Users, 
    Wifi, 
    CreditCard, 
    MessageSquare, 
    Layers, 
    Settings, 
    LogOut, 
    Activity, 
    AlertCircle, 
    CheckCircle2,
    Cpu,
    HardDrive,
    Search,
    RefreshCw,
    Sliders,
    Radio,
    Clock,
    UserX,
    Filter,
    Sun,
    Moon,
    Menu,
    X,
    Plus,
    Edit,
    Trash2,
    Save,
    Server
} from 'lucide-react';

export default function Dashboard({ 
    auth, 
    odps = [], 
    customers = [], 
    routers = [], 
    packages = [], 
    invoices = [], 
    settings = [],
    activeTabProp = 'dashboard'
}) {
    const [activeTab, setActiveTab] = useState(activeTabProp);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(false); // Default to Light mode
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile menu drawer state
    const [serverResources, setServerResources] = useState({ cpu: 15, ram: 35, disk: 20, os: 'VPS', hostname: 'vps-server' });
    const [customerPage, setCustomerPage] = useState(1);
    const customerPageSize = 10;

    useEffect(() => {
        setCustomerPage(1);
    }, [searchTerm]);

    // Toast Notifications State & Handler
    const [toasts, setToasts] = useState([]);
    const showToast = (message, type = 'success') => {
        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, 5000);
    };

    // Listen to Inertia flash messages
    const { flash } = usePage().props;
    useEffect(() => {
        if (flash?.success) {
            showToast(flash.success, 'success');
        }
        if (flash?.error) {
            showToast(flash.error, 'error');
        }
        if (flash?.warning) {
            showToast(flash.warning, 'warning');
        }
        if (flash?.info) {
            showToast(flash.info, 'info');
        }
    }, [flash]);

    // Router Modal State
    const [showRouterModal, setShowRouterModal] = useState(false);
    const [editingRouter, setEditingRouter] = useState(null);
    const [isTestingRouter, setIsTestingRouter] = useState(null);
    const [isSyncingRouter, setIsSyncingRouter] = useState(null);

    // Customer Deletion Modal State
    const [showDeleteCustomerModal, setShowDeleteCustomerModal] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);
    const [deleteMode, setDeleteMode] = useState('local_only'); // 'local_only' or 'total'

    // Customer Bulk Deletion State
    const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
    const [bulkDeleteMode, setBulkDeleteMode] = useState('local_only'); // 'local_only' or 'total'

    const handleTestConnection = async (routerId) => {
        setIsTestingRouter(routerId);
        try {
            const response = await fetch('/admin/routers/test-connection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({ router_id: routerId })
            });
            const result = await response.json();
            showToast(result.message, result.success ? 'success' : 'error');
        } catch (err) {
            showToast("Gagal melakukan tes koneksi: Jaringan error atau IP Router tidak dapat dihubungi.", "error");
        } finally {
            setIsTestingRouter(null);
        }
    };

    // Customer Modal State
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    // Package Modal State
    const [showPackageModal, setShowPackageModal] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);

    // Map settings key-value helper
    const settingsMap = {};
    settings.forEach(s => {
        settingsMap[s.key] = s.value;
    });

    const handleLogout = () => {
        router.post('/logout');
    };

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    // GenieACS ONT Optical power monitor state
    const [ontDevices, setOntDevices] = useState([]);
    const [isLoadingOnt, setIsLoadingOnt] = useState(true);

    const fetchOntDevices = async () => {
        setIsLoadingOnt(true);
        try {
            const res = await fetch('/admin/gpon/status');
            const data = await res.json();
            setOntDevices(data);
        } catch (err) {
            console.error("Failed to load ONT devices", err);
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
            console.error("Failed to load server resources", err);
        }
    };

    // Sync URL path with activeTab for clean SPA routing (e.g. /routers)
    useEffect(() => {
        const handlePopState = () => {
            const path = window.location.pathname.replace(/^\//, ''); // removes leading slash
            const validTabs = ['dashboard', 'routers', 'customers', 'packages', 'invoices', 'settings'];
            if (path && validTabs.includes(path)) {
                setActiveTab(path);
            } else {
                setActiveTab('dashboard');
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        const validTabs = ['dashboard', 'routers', 'customers', 'packages', 'invoices', 'settings'];
        if (validTabs.includes(activeTab)) {
            const targetPath = `/${activeTab}`;
            if (window.location.pathname !== targetPath) {
                window.history.pushState(null, '', targetPath);
            }
        }
        
        let interval;
        if (activeTab === 'dashboard') {
            fetchOntDevices();
            fetchServerResources();
            interval = setInterval(fetchServerResources, 15000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTab]);

    const handleRebootOnt = async (deviceId) => {
        if (!confirm("Apakah Anda yakin ingin me-reboot perangkat ONT ini?")) return;
        
        try {
            const response = await fetch('/admin/gpon/reboot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({ device_id: deviceId })
            });
            const result = await response.json();
            if (result.success) {
                showToast(result.message, 'success');
                fetchOntDevices();
            } else {
                showToast(result.message || "Gagal mengirimkan perintah reboot.", 'error');
            }
        } catch (err) {
            showToast("Error: Gagal me-reboot perangkat.", 'error');
        }
    };

    const handleSyncRouter = async (routerId) => {
        const id = routerId || (routers && routers[0] ? routers[0].id : null);
        if (!id) {
            showToast("Tidak ada router yang dapat disinkronkan.", "warning");
            return;
        }

        setIsSyncingRouter(id);
        try {
            const response = await fetch('/admin/routers/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({ router_id: id })
            });
            const result = await response.json();
            showToast(result.message, result.success ? 'success' : 'error');
            if (result.success) {
                // Reload Inertia props to update clients & packages
                router.reload();
            }
        } catch (err) {
            showToast("Error: Gagal menghubungi server saat melakukan sinkronisasi.", "error");
        } finally {
            setIsSyncingRouter(null);
        }
    };

    const handleScanOlt = () => {
        showToast("Pemindaian GPON OLT berhasil dijalankan. Data redaman diperbarui.", "success");
        fetchOntDevices();
    };

    // CRUD Submission Handlers
    const handleSaveRouter = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const payload = Object.fromEntries(data.entries());
        
        router.post('/admin/routers/save', payload, {
            onSuccess: () => {
                setShowRouterModal(false);
                setEditingRouter(null);
            }
        });
    };

    const handleSaveCustomer = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const payload = Object.fromEntries(data.entries());
        
        router.post('/admin/customers/save', payload, {
            onSuccess: () => {
                setShowCustomerModal(false);
                setEditingCustomer(null);
            }
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
            mode: deleteMode
        }, {
            onSuccess: () => {
                setShowDeleteCustomerModal(false);
                setCustomerToDelete(null);
            }
        });
    };

    const toggleSelectAllCustomers = (filtered) => {
        if (selectedCustomerIds.length === filtered.length) {
            setSelectedCustomerIds([]);
        } else {
            setSelectedCustomerIds(filtered.map(c => c.id));
        }
    };

    const toggleSelectCustomer = (id) => {
        setSelectedCustomerIds(prev => 
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const confirmBulkDeleteCustomer = () => {
        if (selectedCustomerIds.length === 0) return;
        router.post('/admin/customers/bulk-delete', {
            ids: selectedCustomerIds,
            mode: bulkDeleteMode
        }, {
            onSuccess: () => {
                setShowBulkDeleteModal(false);
                setSelectedCustomerIds([]);
            }
        });
    };

    const handleSavePackage = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const payload = Object.fromEntries(data.entries());
        
        router.post('/admin/packages/save', payload, {
            onSuccess: () => {
                setShowPackageModal(false);
                setEditingPackage(null);
            }
        });
    };

    const handleDeletePackage = (packageId) => {
        if (!confirm("Apakah Anda yakin ingin menghapus paket layanan ini?")) return;
        
        router.post('/admin/packages/delete', { id: packageId });
    };

    const handlePayManual = (invoiceId) => {
        if (!confirm("Konfirmasi terima pembayaran tunai secara manual untuk tagihan ini?")) return;
        
        router.post('/admin/invoices/pay-manual', { invoice_id: invoiceId });
    };

    const handleGenerateInvoices = () => {
        if (!confirm("Generate tagihan bulanan otomatis untuk periode bulan ini sekarang?")) return;
        
        router.post('/admin/invoices/generate');
    };

    const handleSaveSettings = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const payload = Object.fromEntries(data.entries());
        
        router.post('/admin/settings/save', payload);
    };

    // Leaflet map initialization hook
    useEffect(() => {
        if (activeTab !== 'dashboard') return;

        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;

        const defaultCenter = [-7.9818, 112.6265];
        const center = odps.length > 0 ? [parseFloat(odps[0].latitude), parseFloat(odps[0].longitude)] : defaultCenter;

        const map = L.map('map-container', {
            center: center,
            zoom: 15,
            zoomControl: false,
            layers: []
        });

        L.control.zoom({ position: 'topright' }).addTo(map);

        const darkTiles = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        const lightTiles = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        const tilesUrl = isDarkMode ? darkTiles : lightTiles;

        L.tileLayer(tilesUrl, {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        const odpIcon = L.divIcon({
            className: 'custom-odp-marker',
            html: `<div class="w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-[8px] font-black text-white shadow-lg ring-2 ring-blue-500/25">ODP</div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });

        const customerIcon = (status) => L.divIcon({
            className: 'custom-customer-marker',
            html: `<div class="w-3.5 h-3.5 rounded-full ${status === 'active' ? 'bg-emerald-500 ring-emerald-500/35' : 'bg-rose-500 ring-rose-500/35'} border border-white dark:border-zinc-950 shadow-md ring-2"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        });

        const odpCoordsMap = {};

        odps.forEach(odp => {
            const lat = parseFloat(odp.latitude);
            const lng = parseFloat(odp.longitude);
            odpCoordsMap[odp.id] = [lat, lng];

            L.marker([lat, lng], { icon: odpIcon })
                .addTo(map)
                .bindPopup(`
                    <div class="text-[11px] font-sans text-zinc-900 leading-normal p-0.5">
                        <p class="font-extrabold text-blue-600 uppercase tracking-wider">${odp.name}</p>
                        <p class="text-zinc-500 font-semibold mt-0.5">${odp.description || 'No description'}</p>
                        <div class="flex items-center gap-1.5 mt-1 pt-1 border-t border-zinc-100 font-bold text-[10px]">
                            <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <span>Port: ${odp.used_ports} / ${odp.total_ports} Terpakai</span>
                        </div>
                    </div>
                `);
        });

        customers.forEach(cust => {
            if (!cust.latitude || !cust.longitude) return;

            const lat = parseFloat(cust.latitude);
            const lng = parseFloat(cust.longitude);

            L.marker([lat, lng], { icon: customerIcon(cust.status) })
                .addTo(map)
                .bindPopup(`
                    <div class="text-[11px] font-sans text-zinc-900 leading-normal p-0.5">
                        <p class="font-extrabold">${cust.name}</p>
                        <p class="text-[10px] text-zinc-500 font-mono mt-0.5">@${cust.username} | ${cust.service_type.toUpperCase()}</p>
                        <p class="text-zinc-600 mt-1">${cust.address}</p>
                        <div class="flex items-center gap-1 mt-1.5 pt-1 border-t border-zinc-100 font-bold text-[9px]">
                            <span class="w-1.5 h-1.5 rounded-full ${cust.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                            <span class="${cust.status === 'active' ? 'text-emerald-600' : 'text-rose-600'}">STATUS: ${cust.status.toUpperCase()}</span>
                        </div>
                    </div>
                `);

            if (cust.odp_id && odpCoordsMap[cust.odp_id]) {
                const odpCoords = odpCoordsMap[cust.odp_id];
                const customerCoords = [lat, lng];
                const cableColor = cust.status === 'active' ? '#10b981' : '#f59e0b';

                L.polyline([odpCoords, customerCoords], {
                    color: cableColor,
                    weight: 2,
                    opacity: 0.75,
                    className: 'optical-cable-flow'
                }).addTo(map);
            }
        });

        return () => {
            map.remove();
        };
    }, [odps, customers, isDarkMode, activeTab]);

    // System resource metrics
    const systemMetrics = [
        { label: 'CPU Usage', value: `${serverResources.cpu}%`, icon: Cpu, progress: serverResources.cpu },
        { label: 'RAM Usage', value: `${serverResources.ram}%`, icon: Sliders, progress: serverResources.ram },
        { label: 'Disk Space', value: `${serverResources.disk}%`, icon: HardDrive, progress: serverResources.disk }
    ];

    // High-density stats cards (5 cards)
    const stats = [
        { 
            name: 'PPP Active', 
            value: customers.filter(c => c.service_type === 'pppoe' && c.status === 'active').length, 
            change: 'ONT Terhubung', 
            icon: Users, 
            cardClass: 'bg-gradient-to-br from-emerald-500 to-teal-600 border-emerald-400/20 text-white shadow-md shadow-emerald-500/5', 
            iconClass: 'text-emerald-100', 
            nameClass: 'text-emerald-100/80', 
            valClass: 'text-white', 
            changeClass: 'text-emerald-100/70' 
        },
        { 
            name: 'Hotspot Active', 
            value: customers.filter(c => c.service_type === 'hotspot' && c.status === 'active').length, 
            change: 'Voucher aktif', 
            icon: Radio, 
            cardClass: 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-400/20 text-white shadow-md shadow-blue-500/5', 
            iconClass: 'text-blue-100', 
            nameClass: 'text-blue-100/80', 
            valClass: 'text-white', 
            changeClass: 'text-blue-100/70' 
        },
        { 
            name: 'Terisolir', 
            value: customers.filter(c => c.status === 'isolated').length, 
            change: 'Menunggak', 
            icon: UserX, 
            cardClass: 'bg-gradient-to-br from-rose-500 to-red-600 border-rose-400/20 text-white shadow-md shadow-rose-500/5', 
            iconClass: 'text-rose-100', 
            nameClass: 'text-rose-100/80', 
            valClass: 'text-white', 
            changeClass: 'text-rose-100/70' 
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
            changeClass: 'text-purple-100/70' 
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
            changeClass: 'text-amber-100/70' 
        },
    ];

    // WhatsApp Gateway real-time simulation logs
    const waLogs = [
        { type: 'Billing', target: '628123456789', text: 'Invoice terbit otomatis...', status: 'sent', time: '10m lalu' },
        { type: 'Receipt', target: '628527711223', text: 'Kuitansi pembayaran Rp 150K...', status: 'sent', time: '12m lalu' },
        { type: 'Isolir', target: '628994433221', text: 'Peringatan isolir: Akun dinonaktifkan...', status: 'sent', time: '1h lalu' },
        { type: 'System', target: 'Admin', text: 'WhatsApp Gateway terhubung...', status: 'system', time: '3h lalu' }
    ];

    // Theme Tokens
    const themeBg = isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-800';
    const themeSidebar = isDarkMode ? 'bg-zinc-950' : 'bg-white';
    const themeSidebarBottom = isDarkMode ? 'bg-zinc-950' : 'bg-zinc-50/50';
    const themeCard = isDarkMode ? 'bg-zinc-900/50 border-zinc-800/80 backdrop-blur-md' : 'bg-white border-zinc-200/80 shadow-xs';
    const themeTextTitle = isDarkMode ? 'text-white' : 'text-zinc-900';
    const themeTextSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
    const themeTextDesc = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';
    const themeBorderSep = isDarkMode ? 'border-zinc-900' : 'border-zinc-200';
    const themeHeader = isDarkMode ? 'bg-zinc-950/80' : 'bg-white/80';
    const themeInnerWidget = isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';
    const themeInput = isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700' : 'bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300';
    const themeLabel = isDarkMode ? 'text-zinc-400' : 'text-zinc-650';
    const getNavLinkClass = (tabName) => {
        const isActive = activeTab === tabName;
        if (isActive) {
            return isDarkMode 
                ? 'w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-bold text-xs transition-all duration-150 border bg-zinc-900 text-emerald-400 border-zinc-800/40 shadow-xs cursor-pointer'
                : 'w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-bold text-xs transition-all duration-150 border bg-emerald-50 text-emerald-600 border-emerald-100 shadow-xs cursor-pointer';
        } else {
            return isDarkMode
                ? 'w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all duration-150 border border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-emerald-400 hover:border-zinc-800/40 cursor-pointer'
                : 'w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all duration-150 border border-transparent text-zinc-650 hover:bg-zinc-100 hover:text-emerald-600 hover:border-zinc-200/50 cursor-pointer';
        }
    };

    const filteredCustomers = customers.filter(cust => 
        cust.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cust.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cust.package && cust.package.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const totalCustomerPages = Math.ceil(filteredCustomers.length / customerPageSize) || 1;
    const paginatedCustomers = filteredCustomers.slice(
        (customerPage - 1) * customerPageSize,
        customerPage * customerPageSize
    );

    return (
        <>
            <Head title="mWiFi NOC Control Console" />
            <div className={`flex h-screen overflow-hidden font-sans antialiased transition-colors duration-250 ${themeBg}`}>
                
                {/* Left Sidebar */}
                <aside className={`hidden md:flex flex-col w-56 shrink-0 border-r ${themeBorderSep} transition-colors duration-250 ${themeSidebar}`}>
                    <div className="flex-1 overflow-y-auto">
                        
                        {/* Logo header */}
                        <div className={`h-14 px-4 border-b ${themeBorderSep} flex items-center space-x-2.5 shrink-0`}>
                            <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <Wifi className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <span className={`text-xs font-black tracking-wider ${themeTextTitle} block leading-none`}>
                                    {settingsMap['system.company_name'] || 'mWiFi Manager'}
                                </span>
                                <span className={`text-[8px] font-bold ${themeTextDesc} tracking-widest uppercase mt-0.5 block`}>NOC CONSOLE</span>
                            </div>
                        </div>

                        {/* Navigation Links */}
                        <nav className="p-2.5 space-y-0.5">
                            <button 
                                onClick={() => setActiveTab('dashboard')} 
                                className={getNavLinkClass('dashboard')}
                            >
                                <Activity className="w-4 h-4" />
                                <span>Dashboard (NOC)</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('routers')} 
                                className={getNavLinkClass('routers')}
                            >
                                <Wifi className="w-4 h-4" />
                                <span>Router Mikrotik</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('customers')} 
                                className={getNavLinkClass('customers')}
                            >
                                <Users className="w-4 h-4" />
                                <span>Pelanggan</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('packages')} 
                                className={getNavLinkClass('packages')}
                            >
                                <Layers className="w-4 h-4" />
                                <span>Paket Internet</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('invoices')} 
                                className={getNavLinkClass('invoices')}
                            >
                                <CreditCard className="w-4 h-4" />
                                <span>Tagihan / Billing</span>
                            </button>
                            <button 
                                onClick={() => setActiveTab('settings')} 
                                className={getNavLinkClass('settings')}
                            >
                                <Settings className="w-4 h-4" />
                                <span>Pengaturan</span>
                            </button>
                        </nav>
                    </div>

                    <div className={`p-3 border-t ${themeBorderSep} ${themeSidebarBottom} transition-colors duration-200`}>
                        <div className="flex items-center space-x-2.5 mb-2.5 px-1.5">
                            <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
                                SA
                            </div>
                            <div className="truncate min-w-0">
                                <p className={`text-xs font-semibold ${themeTextTitle} truncate leading-none mb-0.5`}>{auth.user.name}</p>
                                <span className={`text-[10px] ${themeTextSub} font-medium tracking-wide uppercase`}>Super Admin</span>
                            </div>
                        </div>
                        <button 
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-rose-500 hover:text-rose-400 hover:bg-rose-500/5 font-bold text-xs transition-all duration-150 cursor-pointer"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Keluar</span>
                        </button>
                    </div>
                </aside>

                {/* Dashboard Main Viewport */}
                <div className="flex-1 flex flex-col min-w-0">
                    
                    {/* Header */}
                    <header className={`h-14 border-b ${themeBorderSep} ${themeHeader} flex items-center justify-between px-4 sm:px-6 backdrop-blur-md z-10 transition-colors duration-250`}>
                        
                        <div className="flex items-center space-x-3">
                            <button 
                                onClick={() => setIsMobileMenuOpen(true)}
                                className={`p-1.5 rounded-lg border md:hidden cursor-pointer ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900'}`}
                            >
                                <Menu className="w-4 h-4" />
                            </button>

                            <div className="hidden lg:flex items-center space-x-6">
                                {/* VPS Server Info */}
                                <div className={`flex items-center space-x-2.5 border-r ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'} pr-5`}>
                                    <div className={`p-1.5 rounded border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-emerald-500' : 'bg-emerald-50 border-emerald-100 text-emerald-600'} flex items-center justify-center`}>
                                        <Server className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <p className={`text-[10px] font-bold ${themeTextSub} uppercase leading-none tracking-wide`}>VPS Server</p>
                                        <p className={`text-[10px] font-extrabold ${themeTextTitle} mt-1.5 leading-none`}>
                                            {serverResources.hostname} <span className="text-[9px] opacity-60">({serverResources.os})</span>
                                        </p>
                                    </div>
                                </div>

                                {systemMetrics.map((metric, idx) => {
                                    const Icon = metric.icon;
                                    return (
                                        <div key={idx} className="flex items-center space-x-2.5">
                                            <div className={`p-1.5 rounded border ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-500'} flex items-center justify-center`}>
                                                <Icon className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <p className={`text-[10px] font-bold ${themeTextSub} uppercase leading-none tracking-wide`}>{metric.label}</p>
                                                <div className="flex items-center space-x-2 mt-1">
                                                    <div className="w-16 bg-zinc-800 rounded-full h-1 overflow-hidden">
                                                        <div className="bg-emerald-500 h-1" style={{ width: `${metric.progress}%` }}></div>
                                                    </div>
                                                    <span className={`text-[10px] font-extrabold ${themeTextTitle}`}>{metric.value}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center space-x-3">
                            {/* Search */}
                            <div className="relative hidden sm:block">
                                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                                <input 
                                    type="text" 
                                    placeholder="Search nodes..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-40 sm:w-48 pl-8 pr-3 py-1.5 rounded-xl border text-[10px] sm:text-xs font-semibold focus:outline-hidden ${isDarkMode ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300 focus:border-zinc-700' : 'bg-zinc-100 border-zinc-200 text-zinc-700 focus:border-zinc-300'}`}
                                />
                            </div>

                            {/* WA Gateway Pulse Indicator */}
                            <div className="flex items-center space-x-1.5 mr-2 select-none" title={settingsMap['whatsapp.api_key'] ? "WhatsApp Gateway: Terinstal/Online" : "WhatsApp Gateway: Offline"}>
                                <div className="relative flex h-2.5 w-2.5">
                                    {settingsMap['whatsapp.api_key'] && (
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    )}
                                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${settingsMap['whatsapp.api_key'] ? 'bg-emerald-500' : 'bg-zinc-500'}`}></span>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${themeTextTitle}`}>
                                    WA: {settingsMap['whatsapp.api_key'] ? 'Online' : 'Offline'}
                                </span>
                            </div>

                            {/* Theme switcher */}
                            <button 
                                onClick={toggleTheme}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-white border-zinc-200 text-zinc-600 hover:text-zinc-900'}`}
                            >
                                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </button>
                        </div>
                    </header>

                    {/* Main Content Area */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                        
                        {/* TAB 1: NOC DASHBOARD */}
                        {activeTab === 'dashboard' && (
                            <>
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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

                                {/* Leaflet Map Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 space-y-2">
                                        <div className="flex justify-between items-center px-1">
                                            <div className="flex items-center space-x-2">
                                                <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                                                <h2 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Topologi Jaringan Pelanggan & ODP</h2>
                                            </div>
                                            <span className="text-[10px] text-zinc-500 font-bold">Animasi Aliran Aktif</span>
                                        </div>
                                        <div className={`border rounded-2xl overflow-hidden shadow-xs ${isDarkMode ? 'border-zinc-800/80' : 'border-zinc-200'}`}>
                                            <div id="map-container" className="h-[380px] w-full z-0"></div>
                                        </div>
                                    </div>

                                    {/* GenieACS ONT & WhatsApp Log */}
                                    <div className="space-y-4">
                                        
                                        {/* GenieACS ONT Monitor */}
                                        <div className={`${themeCard} rounded-2xl p-4 shadow-sm space-y-3 transition-colors duration-250`}>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center space-x-2">
                                                    <Layers className="w-4 h-4 text-emerald-500" />
                                                    <h3 className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>GenieACS: Monitor Redaman ONT</h3>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <button 
                                                        onClick={fetchOntDevices} 
                                                        disabled={isLoadingOnt}
                                                        className={`p-1 rounded-lg transition-colors cursor-pointer ${isDarkMode ? 'hover:bg-zinc-900 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900'} ${isLoadingOnt ? 'animate-spin' : ''}`}
                                                    >
                                                        <RefreshCw className="w-3 h-3" />
                                                    </button>
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                                                {isLoadingOnt ? (
                                                    <div className="py-8 text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                                        Loading ONT status...
                                                    </div>
                                                ) : ontDevices.filter(dev => dev.status !== 'offline').length === 0 ? (
                                                    <div className="py-8 text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                                        No active/online ONT devices found.
                                                    </div>
                                                ) : (
                                                    ontDevices.filter(dev => dev.status !== 'offline').map((dev, idx) => {
                                                        const rxColor = 
                                                            dev.status === 'good' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                            dev.status === 'warning' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                                            dev.status === 'offline' ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' : 
                                                            'bg-rose-500/10 text-rose-500 border-rose-500/20';
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

                                        {/* WhatsApp Message Logs */}
                                        <div className={`${themeCard} rounded-2xl p-4 shadow-sm space-y-3 transition-colors duration-250`}>
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center space-x-2">
                                                    <MessageSquare className="w-4 h-4 text-emerald-500" />
                                                    <h3 className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>WhatsApp Logs (Real-Time)</h3>
                                                </div>
                                                <span className={`text-xs ${themeTextSub} font-medium`}>Auto Refresh</span>
                                            </div>

                                            <div className="space-y-2 max-h-[195px] overflow-y-auto pr-1">
                                                {!settingsMap['whatsapp.api_key'] ? (
                                                    <div className="py-8 text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                                        WhatsApp Gateway belum aktif / terinstal.
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

                                        {/* Quick Tools Panel */}
                                        <div className={`p-3 border rounded-2xl flex items-center justify-between text-xs sm:text-[13px] font-bold transition-colors duration-250 ${themeInnerWidget}`}>
                                            <div className="flex items-center space-x-2">
                                                <Sliders className={`w-3.5 h-3.5 ${themeTextSub}`} />
                                                <span className={themeTextTitle}>Quick Tools Panel</span>
                                            </div>
                                            <div className="flex space-x-1.5">
                                                <button 
                                                    onClick={() => handleSyncRouter()}
                                                    disabled={isSyncingRouter !== null}
                                                    className={`px-2 py-1 border rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 ${isDarkMode ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 shadow-xs'}`}
                                                >
                                                    {isSyncingRouter !== null ? 'Syncing...' : 'Sync Router'}
                                                </button>
                                                <button 
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
                        )}

                        {/* TAB 2: ROUTER MANAGEMENT */}
                        {activeTab === 'routers' && (
                            <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                                <div className="flex justify-between items-center border-b border-zinc-800/40 pb-3">
                                    <div className="flex items-center space-x-2">
                                        <Wifi className="w-5 h-5 text-emerald-500" />
                                        <h2 className={`text-sm font-bold ${themeTextTitle}`}>Manajemen Router Mikrotik</h2>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setEditingRouter(null);
                                            setShowRouterModal(true);
                                        }}
                                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Tambah Router</span>
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                                <th className="py-3 px-2">Nama Router</th>
                                                <th className="py-3 px-2">IP / Host</th>
                                                <th className="py-3 px-2">Port</th>
                                                <th className="py-3 px-2">Protokol</th>
                                                <th className="py-3 px-2">Status</th>
                                                <th className="py-3 px-2 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/20 text-xs">
                                            {routers.map((router) => (
                                                <tr key={router.id} className={`${themeTextSub} hover:bg-zinc-900/10`}>
                                                    <td className={`py-3 px-2 font-bold ${themeTextTitle}`}>{router.name}</td>
                                                    <td className="py-3 px-2 font-mono">{router.host}</td>
                                                    <td className="py-3 px-2">{router.port}</td>
                                                    <td className="py-3 px-2 uppercase font-semibold">{router.protocol_type}</td>
                                                    <td className="py-3 px-2">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${router.status ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                                            {router.status ? 'Aktif' : 'Non-Aktif'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-2 flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleTestConnection(router.id)}
                                                            disabled={isTestingRouter === router.id}
                                                            className="px-2 py-0.5 border border-zinc-500/30 text-[10px] text-zinc-400 hover:text-white rounded cursor-pointer font-bold disabled:opacity-50"
                                                        >
                                                            {isTestingRouter === router.id ? 'Loading...' : 'Tes Koneksi'}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleSyncRouter(router.id)}
                                                            disabled={isSyncingRouter === router.id}
                                                            className="px-2 py-0.5 border border-emerald-500/30 text-[10px] text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/50 rounded cursor-pointer font-bold disabled:opacity-50"
                                                        >
                                                            {isSyncingRouter === router.id ? 'Syncing...' : 'Sync Pelanggan'}
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                setEditingRouter(router);
                                                                setShowRouterModal(true);
                                                            }}
                                                            className="p-1 text-zinc-400 hover:text-emerald-500 cursor-pointer flex items-center justify-center"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: CUSTOMER MANAGEMENT */}
                        {activeTab === 'customers' && (
                            <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800/40 pb-3 gap-3">
                                    <div className="flex items-center space-x-2">
                                        <Users className="w-5 h-5 text-emerald-500" />
                                        <h2 className={`text-sm font-bold ${themeTextTitle}`}>Manajemen Pelanggan</h2>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                                        {/* Search Input Pelanggan */}
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                                            <input 
                                                type="text" 
                                                placeholder="Cari nama / username / paket..." 
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className={`pl-8 pr-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-hidden w-44 sm:w-56 ${isDarkMode ? 'bg-zinc-900/60 border-zinc-800 text-zinc-300 focus:border-zinc-700' : 'bg-zinc-100 border-zinc-200 text-zinc-700 focus:border-zinc-300'}`}
                                            />
                                        </div>
                                        {selectedCustomerIds.length > 0 && (
                                            <button 
                                                onClick={() => {
                                                    setBulkDeleteMode('local_only');
                                                    setShowBulkDeleteModal(true);
                                                }}
                                                className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer animate-pulse"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>Hapus Terpilih ({selectedCustomerIds.length})</span>
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => {
                                                setEditingCustomer(null);
                                                setShowCustomerModal(true);
                                            }}
                                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Tambah Pelanggan</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                                <th className="py-3 px-2 w-8">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={filteredCustomers.length > 0 && selectedCustomerIds.length === filteredCustomers.length}
                                                        onChange={() => toggleSelectAllCustomers(filteredCustomers)}
                                                        className="rounded text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800 cursor-pointer"
                                                    />
                                                </th>
                                                <th className="py-3 px-2">Nama</th>
                                                <th className="py-3 px-2">Username</th>
                                                <th className="py-3 px-2">Paket</th>
                                                <th className="py-3 px-2">ODP</th>
                                                <th className="py-3 px-2">Tgl Tagih</th>
                                                <th className="py-3 px-2">Status</th>
                                                <th className="py-3 px-2 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/20 text-xs">
                                             {paginatedCustomers.map((cust) => (
                                                <tr key={cust.id} className={`${themeTextSub} hover:bg-zinc-900/10 ${selectedCustomerIds.includes(cust.id) ? 'bg-emerald-500/5' : ''}`}>
                                                    <td className="py-3 px-2 w-8">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedCustomerIds.includes(cust.id)}
                                                            onChange={() => toggleSelectCustomer(cust.id)}
                                                            className="rounded text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className={`py-3 px-2 font-bold ${themeTextTitle}`}>{cust.name}</td>
                                                    <td className="py-3 px-2 font-mono">{cust.username}</td>
                                                    <td className="py-3 px-2">{cust.package ? cust.package.name : '-'}</td>
                                                    <td className="py-3 px-2 font-mono text-[10px]">{cust.odp ? cust.odp.name : '-'}</td>
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
                                                    <td className="py-3 px-2 text-right space-x-2">
                                                        <button 
                                                            onClick={() => {
                                                                setEditingCustomer(cust);
                                                                setShowCustomerModal(true);
                                                            }}
                                                            className="inline-block p-1 text-zinc-400 hover:text-emerald-500 cursor-pointer"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteCustomer(cust)}
                                                            className="inline-block p-1 text-zinc-400 hover:text-rose-500 cursor-pointer"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Customer Pagination Controls */}
                                {filteredCustomers.length > customerPageSize && (
                                    <div className={`flex flex-col sm:flex-row items-center justify-between pt-4 border-t ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200'} gap-3 text-xs`}>
                                        <span className={themeTextSub}>
                                            Menampilkan <span className={`font-bold ${themeTextTitle}`}>{Math.min((customerPage - 1) * customerPageSize + 1, filteredCustomers.length)}</span> hingga <span className={`font-bold ${themeTextTitle}`}>{Math.min(customerPage * customerPageSize, filteredCustomers.length)}</span> dari <span className={`font-bold ${themeTextTitle}`}>{filteredCustomers.length}</span> pelanggan
                                        </span>
                                        <div className="flex items-center space-x-1">
                                            <button 
                                                disabled={customerPage === 1}
                                                onClick={() => setCustomerPage(p => Math.max(p - 1, 1))}
                                                className={`px-3 py-1.5 border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
                                            >
                                                Sebelumnya
                                            </button>
                                            {Array.from({ length: totalCustomerPages }, (_, idx) => idx + 1).map(page => {
                                                const isCurrent = page === customerPage;
                                                return (
                                                    <button 
                                                        key={page}
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
                                                disabled={customerPage === totalCustomerPages}
                                                onClick={() => setCustomerPage(p => Math.min(p + 1, totalCustomerPages))}
                                                className={`px-3 py-1.5 border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
                                            >
                                                Berikutnya
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 4: PACKAGE MANAGEMENT */}
                        {activeTab === 'packages' && (
                            <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                                <div className="flex justify-between items-center border-b border-zinc-800/40 pb-3">
                                    <div className="flex items-center space-x-2">
                                        <Layers className="w-5 h-5 text-emerald-500" />
                                        <h2 className={`text-sm font-bold ${themeTextTitle}`}>Paket Layanan Internet</h2>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setEditingPackage(null);
                                            setShowPackageModal(true);
                                        }}
                                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Tambah Paket</span>
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                                <th className="py-3 px-2">Nama Paket</th>
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
                                            {packages.map((pkg) => (
                                                <tr key={pkg.id} className={`${themeTextSub} hover:bg-zinc-900/10`}>
                                                    <td className={`py-3 px-2 font-bold ${themeTextTitle}`}>{pkg.name}</td>
                                                    <td className="py-3 px-2 font-bold text-emerald-500">Rp {pkg.price.toLocaleString('id-ID')}</td>
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
                                                    <td className="py-3 px-2 text-right">
                                                        <div className="flex justify-end gap-1.5">
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingPackage(pkg);
                                                                    setShowPackageModal(true);
                                                                }}
                                                                className="p-1 text-zinc-400 hover:text-emerald-500 cursor-pointer"
                                                                title="Edit Paket"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeletePackage(pkg.id)}
                                                                className="p-1 text-zinc-400 hover:text-rose-500 cursor-pointer"
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
                        )}

                        {/* TAB 5: BILLING & INVOICES */}
                        {activeTab === 'invoices' && (
                            <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                                <div className="flex justify-between items-center border-b border-zinc-800/40 pb-3">
                                    <div className="flex items-center space-x-2">
                                        <CreditCard className="w-5 h-5 text-emerald-500" />
                                        <h2 className={`text-sm font-bold ${themeTextTitle}`}>Log Tagihan / Invoice</h2>
                                    </div>
                                    <button 
                                        onClick={handleGenerateInvoices}
                                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        <span>Generate Tagihan Bulan Ini</span>
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                                <th className="py-3 px-2">No. Invoice</th>
                                                <th className="py-3 px-2">Pelanggan</th>
                                                <th className="py-3 px-2">Periode</th>
                                                <th className="py-3 px-2">Total Amount</th>
                                                <th className="py-3 px-2">Jatuh Tempo</th>
                                                <th className="py-3 px-2">Status</th>
                                                <th className="py-3 px-2 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/20 text-xs">
                                            {invoices.map((inv) => (
                                                <tr key={inv.id} className={`${themeTextSub} hover:bg-zinc-900/10`}>
                                                    <td className={`py-3 px-2 font-mono font-bold ${themeTextTitle}`}>{inv.invoice_number}</td>
                                                    <td className="py-3 px-2">{inv.customer ? inv.customer.name : 'Unknown'}</td>
                                                    <td className="py-3 px-2 font-mono">{inv.billing_period}</td>
                                                    <td className="py-3 px-2 font-bold text-emerald-500">Rp {inv.total_amount.toLocaleString('id-ID')}</td>
                                                    <td className="py-3 px-2 font-mono">{inv.due_date ? inv.due_date.substring(0, 10) : '-'}</td>
                                                    <td className="py-3 px-2">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                                            {inv.status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-2 text-right">
                                                        {inv.status === 'unpaid' && (
                                                            <button 
                                                                onClick={() => handlePayManual(inv.id)}
                                                                className="px-2 py-0.5 border border-emerald-500/30 text-[10px] text-emerald-500 hover:bg-emerald-500/10 rounded cursor-pointer font-bold"
                                                            >
                                                                Bayar Manual
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* TAB 6: SETTINGS FORM */}
                        {activeTab === 'settings' && (
                            <form onSubmit={handleSaveSettings} className="space-y-6">
                                
                                {/* WhatsApp & GenieACS Config */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Konfigurasi WhatsApp Gateway</h3>
                                        <div className="space-y-3 text-xs">
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Gateway URL</label>
                                                <input name="whatsapp.api_url" type="text" defaultValue={settingsMap['whatsapp.api_url'] || ''} className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Session ID</label>
                                                <input name="whatsapp.session_id" type="text" defaultValue={settingsMap['whatsapp.session_id'] || ''} className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>API Key / Token (Opsional)</label>
                                                <input name="whatsapp.api_key" type="password" placeholder="Tetap kosong jika tidak diubah" className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Konfigurasi TR-069 GenieACS</h3>
                                        <div className="space-y-3 text-xs">
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>NBI API URL</label>
                                                <input name="genieacs.api_url" type="text" defaultValue={settingsMap['genieacs.api_url'] || ''} className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Nama Perusahaan (System Company)</label>
                                                <input name="system.company_name" type="text" defaultValue={settingsMap['system.company_name'] || ''} className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Gateways Config */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Tripay */}
                                    <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Tripay Gateway</h3>
                                        <div className="space-y-3 text-xs">
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>API Key</label>
                                                <input name="payment.tripay.api_key" type="password" placeholder="Tetap kosong jika tidak diubah" className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Merchant Code</label>
                                                <input name="payment.tripay.merchant_code" type="text" defaultValue={settingsMap['payment.tripay.merchant_code'] || ''} className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Private Key</label>
                                                <input name="payment.tripay.private_key" type="password" placeholder="Tetap kosong jika tidak diubah" className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Midtrans */}
                                    <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Midtrans Gateway</h3>
                                        <div className="space-y-3 text-xs">
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Server Key</label>
                                                <input name="payment.midtrans.server_key" type="password" placeholder="Tetap kosong jika tidak diubah" className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Client Key</label>
                                                <input name="payment.midtrans.client_key" type="text" defaultValue={settingsMap['payment.midtrans.client_key'] || ''} className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button type="submit" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer shadow-md">
                                        <Save className="w-4 h-4" />
                                        <span>Simpan Seluruh Pengaturan</span>
                                    </button>
                                </div>
                            </form>
                        )}
                        
                    </div>
                </div>

                {/* MODALS SECTION */}
                
                {/* Router Modal */}
                {showRouterModal && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className={`w-full max-w-md border rounded-2xl p-6 space-y-4 shadow-xl ${themeCard}`}>
                            <div className="flex justify-between items-center pb-2 border-b border-zinc-800/40">
                                <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                                    {editingRouter ? 'Edit Router Mikrotik' : 'Tambah Router Mikrotik'}
                                </h3>
                                <button onClick={() => setShowRouterModal(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                            <form onSubmit={handleSaveRouter} className="space-y-3 text-xs">
                                <input type="hidden" name="id" value={editingRouter ? editingRouter.id : ''} />
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>Nama Router</label>
                                    <input required name="name" type="text" defaultValue={editingRouter ? editingRouter.name : ''} className={`p-2 border rounded-lg ${themeInput}`} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>IP Address / Host</label>
                                    <input required name="host" type="text" defaultValue={editingRouter ? editingRouter.host : ''} className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className={`font-bold ${themeLabel}`}>Port API</label>
                                        <input required name="port" type="number" defaultValue={editingRouter ? editingRouter.port : 8728} className={`p-2 border rounded-lg ${themeInput}`} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className={`font-bold ${themeLabel}`}>Protokol</label>
                                        <select name="protocol_type" defaultValue={editingRouter ? editingRouter.protocol_type : 'rest_api'} className={`p-2 border rounded-lg ${themeInput}`}>
                                            <option value="rest_api">REST API (v7)</option>
                                            <option value="legacy_socket">Socket API (v6)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-2.5 bg-zinc-950/60 border border-zinc-800/80 rounded-lg text-[10px] text-zinc-500 leading-normal space-y-1">
                                    <div>💡 <strong>REST API (v7):</strong> Menggunakan port layanan web Mikrotik (<strong>WWW</strong>, default <strong>80</strong> atau <strong>443</strong>).</div>
                                    <div>💡 <strong>Socket API (v6):</strong> Menggunakan port layanan API binary Mikrotik (<strong>api</strong>, default <strong>8728</strong> atau <strong>8729 SSL</strong>).</div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>Username</label>
                                    <input required name="username" type="text" defaultValue={editingRouter ? editingRouter.username : 'admin'} className={`p-2 border rounded-lg ${themeInput}`} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>Password</label>
                                    <input name="password" type="password" placeholder={editingRouter ? 'Kosongkan jika tidak diubah' : 'Password router'} className={`p-2 border rounded-lg ${themeInput}`} />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>Status</label>
                                    <select name="status" defaultValue={editingRouter ? (editingRouter.status ? 1 : 0) : 1} className={`p-2 border rounded-lg ${themeInput}`}>
                                        <option value={1}>Aktif / Hubungkan</option>
                                        <option value={0}>Non-Aktifkan</option>
                                    </select>
                                </div>
                                <div className="flex justify-end pt-3 gap-2">
                                    <button type="button" onClick={() => setShowRouterModal(false)} className="px-4 py-2 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white">Batal</button>
                                    <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold">Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Customer Modal */}
                {showCustomerModal && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className={`w-full max-w-lg border rounded-2xl p-6 space-y-4 shadow-xl ${themeCard} overflow-y-auto max-h-[90vh]`}>
                            <div className="flex justify-between items-center pb-2 border-b border-zinc-800/40">
                                <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                                    {editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
                                </h3>
                                <button onClick={() => setShowCustomerModal(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
                                <input type="hidden" name="id" value={editingCustomer ? editingCustomer.id : ''} />
                                
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

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className={`font-bold ${themeLabel}`}>Router</label>
                                        <select name="router_id" defaultValue={editingCustomer ? editingCustomer.router_id : (routers[0]?.id || '')} className={`p-2 border rounded-lg ${themeInput}`}>
                                            {routers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className={`font-bold ${themeLabel}`}>Paket Internet</label>
                                        <select name="package_id" defaultValue={editingCustomer ? editingCustomer.package_id : (packages[0]?.id || '')} className={`p-2 border rounded-lg ${themeInput}`}>
                                            {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className={`font-bold ${themeLabel}`}>Titik ODP</label>
                                        <select name="odp_id" defaultValue={editingCustomer ? editingCustomer.odp_id : (odps[0]?.id || '')} className={`p-2 border rounded-lg ${themeInput}`}>
                                            {odps.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className={`font-bold ${themeLabel}`}>Jenis Layanan</label>
                                        <select name="service_type" defaultValue={editingCustomer ? editingCustomer.service_type : 'pppoe'} className={`p-2 border rounded-lg ${themeInput}`}>
                                            <option value="pppoe">PPPoE Secret</option>
                                            <option value="hotspot">Hotspot Active</option>
                                        </select>
                                    </div>
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
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className={`font-bold ${themeLabel}`}>Lintang GPS (Latitude)</label>
                                        <input name="latitude" type="text" defaultValue={editingCustomer ? editingCustomer.latitude : ''} placeholder="-7.98xxx" className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className={`font-bold ${themeLabel}`}>Bujur GPS (Longitude)</label>
                                        <input name="longitude" type="text" defaultValue={editingCustomer ? editingCustomer.longitude : ''} placeholder="112.62xxx" className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-3 gap-2">
                                    <button type="button" onClick={() => setShowCustomerModal(false)} className="px-4 py-2 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white">Batal</button>
                                    <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold">Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Customer Confirmation Modal */}
                {showDeleteCustomerModal && customerToDelete && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className={`w-full max-w-md border rounded-2xl p-6 space-y-4 shadow-xl ${themeCard}`}>
                            <div className="flex justify-between items-center pb-2 border-b border-zinc-800/40">
                                <h3 className={`text-sm font-bold text-rose-500`}>
                                    Hapus Pelanggan
                                </h3>
                                <button onClick={() => {
                                    setShowDeleteCustomerModal(false);
                                    setCustomerToDelete(null);
                                }} className={`text-zinc-500 ${isDarkMode ? 'hover:text-white' : 'hover:text-zinc-800'}`}><X className="w-4 h-4" /></button>
                            </div>
                            
                            <div className="text-xs space-y-3">
                                <p className={themeTextTitle}>
                                    Apakah Anda yakin ingin menghapus pelanggan <strong>{customerToDelete.name}</strong> (username: <strong>@{customerToDelete.username}</strong>)?
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
                                            <p className={`${themeTextDesc} leading-normal text-[10px]`}>Hanya menghapus data dari database mWiFi. Akun PPP Secret / Hotspot di Mikrotik akan tetap ada dan aktif.</p>
                                        </div>
                                    </label>

                                    <div className={`border-t ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200/60'} my-2`}></div>

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
                                            <p className={`${themeTextDesc} leading-normal text-[10px]`}>Menghapus data dari database mWiFi DAN menghapus secara permanen akun PPP Secret/Hotspot dari Router Mikrotik.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2 gap-2 text-xs">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setShowDeleteCustomerModal(false);
                                        setCustomerToDelete(null);
                                    }} 
                                    className={`px-4 py-2 border rounded-lg cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}
                                >
                                    Batal
                                </button>
                                <button 
                                    type="button" 
                                    onClick={confirmDeleteCustomer} 
                                    className={`px-4 py-2 rounded-lg font-bold text-white transition-colors cursor-pointer ${deleteMode === 'total' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                                >
                                    Konfirmasi Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Delete Customer Confirmation Modal */}
                {showBulkDeleteModal && selectedCustomerIds.length > 0 && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className={`w-full max-w-md border rounded-2xl p-6 space-y-4 shadow-xl ${themeCard}`}>
                            <div className="flex justify-between items-center pb-2 border-b border-zinc-800/40">
                                <h3 className={`text-sm font-bold text-rose-500`}>
                                    Hapus Masal Pelanggan
                                </h3>
                                <button onClick={() => {
                                    setShowBulkDeleteModal(false);
                                }} className={`text-zinc-500 ${isDarkMode ? 'hover:text-white' : 'hover:text-zinc-800'}`}><X className="w-4 h-4" /></button>
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
                                            <p className={`${themeTextDesc} leading-normal text-[10px]`}>Hanya menghapus data terpilih dari database mWiFi. Akun PPP Secret / Hotspot di Mikrotik akan tetap ada dan aktif.</p>
                                        </div>
                                    </label>

                                    <div className={`border-t ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200/60'} my-2`}></div>

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
                                            <p className={`${themeTextDesc} leading-normal text-[10px]`}>Menghapus data terpilih dari database mWiFi DAN menghapus secara permanen akun PPP Secret/Hotspot terkait dari Router Mikrotik.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2 gap-2 text-xs">
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setShowBulkDeleteModal(false);
                                    }} 
                                    className={`px-4 py-2 border rounded-lg cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}
                                >
                                    Batal
                                </button>
                                <button 
                                    type="button" 
                                    onClick={confirmBulkDeleteCustomer} 
                                    className={`px-4 py-2 rounded-lg font-bold text-white transition-colors cursor-pointer ${bulkDeleteMode === 'total' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                                >
                                    Konfirmasi Hapus Masal
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Package Modal */}
                {showPackageModal && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                        <div className={`w-full max-w-md border rounded-2xl p-6 space-y-4 shadow-xl ${themeCard}`}>
                            <div className="flex justify-between items-center pb-2 border-b border-zinc-800/40">
                                <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                                    {editingPackage ? 'Edit Paket Layanan' : 'Tambah Paket Layanan'}
                                </h3>
                                <button onClick={() => setShowPackageModal(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                            </div>
                            <form onSubmit={handleSavePackage} className="space-y-3 text-xs">
                                <input type="hidden" name="id" value={editingPackage ? editingPackage.id : ''} />
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
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>Deskripsi Paket</label>
                                    <textarea name="description" rows={2} defaultValue={editingPackage ? editingPackage.description : ''} className={`p-2 border rounded-lg ${themeInput}`} />
                                </div>
                                <div className="flex justify-end pt-3 gap-2">
                                    <button type="button" onClick={() => setShowPackageModal(false)} className={`px-4 py-2 border rounded-lg cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}>Batal</button>
                                    <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold cursor-pointer">Simpan</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            </div>
            
            {/* Toast Notifications Container */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
                {toasts.map(toast => {
                    const isSuccess = toast.type === 'success';
                    const isError = toast.type === 'error';
                    const isWarning = toast.type === 'warning';
                    
                    let cardStyles = '';
                    let iconColor = '';
                    let IconComponent = CheckCircle2; // default
                    
                    if (isSuccess) {
                        cardStyles = isDarkMode 
                            ? 'bg-emerald-950/80 border-emerald-500/40 border-l-emerald-500 text-emerald-100' 
                            : 'bg-emerald-50 border-emerald-300 border-l-emerald-500 text-emerald-900';
                        iconColor = 'text-emerald-500 dark:text-emerald-400';
                        IconComponent = CheckCircle2;
                    } else if (isError) {
                        cardStyles = isDarkMode 
                            ? 'bg-rose-950/80 border-rose-500/40 border-l-rose-500 text-rose-100' 
                            : 'bg-rose-50 border-rose-300 border-l-rose-500 text-rose-900';
                        iconColor = 'text-rose-500 dark:text-rose-400';
                        IconComponent = AlertCircle;
                    } else if (isWarning) {
                        cardStyles = isDarkMode 
                            ? 'bg-amber-950/80 border-amber-500/40 border-l-amber-500 text-amber-100' 
                            : 'bg-amber-50 border-amber-300 border-l-amber-500 text-amber-900';
                        iconColor = 'text-amber-500 dark:text-amber-400';
                        IconComponent = AlertCircle;
                    } else {
                        cardStyles = isDarkMode 
                            ? 'bg-blue-950/80 border-blue-500/40 border-l-blue-500 text-blue-100' 
                            : 'bg-blue-50 border-blue-300 border-l-blue-500 text-blue-900';
                        iconColor = 'text-blue-500 dark:text-blue-400';
                        IconComponent = Sliders;
                    }
                    
                    return (
                        <div 
                            key={toast.id} 
                            className={`p-3.5 border border-l-4 rounded-xl shadow-lg backdrop-blur-md flex items-start space-x-3 pointer-events-auto transition-all duration-300 transform translate-x-0 animate-slide-in ${cardStyles}`}
                        >
                            <IconComponent className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
                            <div className="flex-1 text-xs font-semibold leading-relaxed">
                                {toast.message}
                            </div>
                            <button 
                                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                                className="text-current opacity-60 hover:opacity-100 cursor-pointer transition-opacity"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in {
                    animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
        </>
    );
}
