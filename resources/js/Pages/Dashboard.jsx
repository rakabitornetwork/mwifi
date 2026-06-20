import React, { useState, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import SeoHead from '../Components/SeoHead';
import AppFooter from '../Components/AppFooter';
import GpsCoordinateFields from '../Components/GpsCoordinateFields';
import { readDeviceCoordinates } from '../utils/deviceGps';
import { formatRupiah } from '../utils/formatRupiah';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    BarChart, 
    Bar 
} from 'recharts';
import { 
    User,
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
    Server,
    Printer,
    Map,
    Building2,
    Globe,
    Mail,
    Phone,
    MapPin,
    Image as ImageIcon,
    Upload,
    Copyright,
    FileText,
    Receipt,
    ShieldOff,
    Database,
    Download,
    RotateCcw,
    GitBranch,
    ArrowUpCircle,
    ExternalLink
} from 'lucide-react';

function BrandingFileUpload({ name, accept, buttonLabel, hint, isDarkMode }) {
    const [fileName, setFileName] = useState('');

    const buttonClass = isDarkMode
        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-400/60'
        : 'border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-500';

    const hintClass = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';
    const fileNameClass = isDarkMode ? 'text-emerald-400' : 'text-emerald-700';

    return (
        <div className="space-y-2 pt-1">
            <label
                className={`inline-flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg border-2 border-dashed font-semibold text-xs cursor-pointer transition-colors ${buttonClass}`}
            >
                <Upload className="w-4 h-4 shrink-0" />
                <span>{buttonLabel}</span>
                <input
                    type="file"
                    name={name}
                    accept={accept}
                    className="sr-only"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
                />
            </label>
            {fileName && (
                <p className={`text-[10px] font-medium truncate ${fileNameClass}`}>
                    File dipilih: {fileName}
                </p>
            )}
            <p className={`text-[10px] leading-relaxed border-t pt-2 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'} ${hintClass}`}>
                {hint}
            </p>
        </div>
    );
}

function SidebarPanel({
    branding,
    auth,
    sidebarBorder,
    sidebarTextTitle,
    sidebarTextSub,
    sidebarTextDesc,
    themeSidebarBottom,
    isDarkMode,
    getNavLinkClass,
    onNavigate,
    onOpenProfile,
    onLogout,
    showCloseButton = false,
    onClose,
}) {
    const navItems = [
        { tab: 'dashboard', icon: Activity, label: 'Dashboard' },
        { tab: 'routers', icon: Wifi, label: 'Router Mikrotik' },
        { tab: 'customers', icon: Users, label: 'Pelanggan PPPoE' },
        { tab: 'network-map', icon: Map, label: 'Peta Jaringan' },
        { tab: 'packages', icon: Layers, label: 'Paket Internet' },
        { tab: 'invoices', icon: CreditCard, label: 'Tagihan / Billing' },
        { tab: 'hotspot', icon: Radio, label: 'Hotspot' },
        { tab: 'database', icon: Database, label: 'Database' },
        { tab: 'update', icon: GitBranch, label: 'Update App' },
        { tab: 'settings', icon: Settings, label: 'Pengaturan' },
    ];

    return (
        <div className="flex flex-col h-full min-h-0 w-full">
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div
                    className={`h-14 px-4 border-b ${sidebarBorder} flex items-center shrink-0 ${showCloseButton ? 'justify-between gap-2' : 'space-x-2.5'}`}
                    key={`sidebar-brand-${branding.version}`}
                >
                    <div className="flex items-center space-x-2.5 min-w-0">
                        {branding.logo_url ? (
                            <img
                                src={branding.logo_url}
                                alt={branding.company_name || branding.app_name || 'Logo'}
                                className="w-9 h-9 object-contain shrink-0"
                            />
                        ) : (
                            <div className="w-7 h-7 rounded-lg noc-sidebar-logo flex items-center justify-center">
                                <Wifi className="w-4 h-4 text-white" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <span className={`text-xs font-black tracking-wider ${sidebarTextTitle} block leading-none truncate`}>
                                {branding.company_name || branding.app_name || ''}
                            </span>
                            {branding.company_tagline && (
                                <span className={`text-[8px] font-bold ${sidebarTextDesc} tracking-widest uppercase mt-0.5 block truncate`}>
                                    {branding.company_tagline.toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>
                    {showCloseButton && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg border border-white/20 text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                            aria-label="Tutup menu"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <nav className="p-2.5 space-y-0.5">
                    {navItems.map(({ tab, icon: Icon, label }) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => onNavigate(tab)}
                            className={getNavLinkClass(tab)}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            <div className={`shrink-0 p-3 ${themeSidebarBottom} transition-colors duration-200`}>
                <div className="flex items-center space-x-2.5 mb-2.5 px-1.5">
                    {auth.user.avatar_url ? (
                        <img
                            src={auth.user.avatar_url}
                            alt={auth.user.name}
                            className="w-7 h-7 rounded-md object-cover shrink-0 border border-white/18"
                        />
                    ) : (
                        <div className="w-7 h-7 rounded-md bg-white/12 text-white border border-white/18 flex items-center justify-center font-bold text-xs shrink-0">
                            {auth.user.initials || '?'}
                        </div>
                    )}
                    <div className="truncate min-w-0">
                        <p className={`text-xs font-semibold ${sidebarTextTitle} truncate leading-none mb-0.5`}>{auth.user.name}</p>
                        <button
                            type="button"
                            onClick={onOpenProfile}
                            className={`text-[10px] ${sidebarTextSub} font-medium tracking-wide uppercase text-left hover:underline cursor-pointer transition-colors ${isDarkMode ? 'hover:text-white' : 'hover:text-indigo-900'}`}
                            title="Buka pengaturan profil"
                        >
                            {auth.user.profile_title || 'Super Admin'}
                        </button>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onLogout}
                    className="w-full flex items-center justify-center space-x-2 px-2.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all duration-150 cursor-pointer shadow-sm"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar</span>
                </button>
            </div>
        </div>
    );
}

function escapeMapHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function parseBandwidthLimit(limit) {
    if (!limit) return { down: 0, up: 0 };
    const parts = String(limit).split('/');
    const parsePart = (part) => {
        const normalized = String(part || '').trim().toUpperCase();
        const num = parseFloat(normalized);
        if (Number.isNaN(num)) return 0;
        if (normalized.includes('G')) return num * 1000;
        if (normalized.includes('K')) return num / 1000;
        return num;
    };
    return {
        down: parsePart(parts[0]),
        up: parsePart(parts[1] ?? parts[0]),
    };
}

function formatSpeedBps(bps) {
    const value = Number(bps) || 0;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} Mbps`;
    if (value >= 1_000) return `${Math.round(value / 1_000)} Kbps`;
    return `${Math.round(value)} bps`;
}

function resolveOntMetrics(metrics, username) {
    if (!username) return {};

    const ontMap = metrics?.ont || {};
    const directKeys = [
        username,
        String(username).split('@')[0],
        String(username).toLowerCase(),
        String(username).split('@')[0].toLowerCase(),
    ];

    for (const key of directKeys) {
        if (key && ontMap[key]) {
            return ontMap[key];
        }
    }

    const lower = String(username).toLowerCase();
    const base = lower.split('@')[0];

    for (const [key, device] of Object.entries(ontMap)) {
        const keyLower = String(key).toLowerCase();
        const keyBase = keyLower.split('@')[0];

        if (keyLower === lower || keyBase === base) {
            return device;
        }
    }

    const devices = metrics?.ont_devices || [];
    return devices.find((device) => {
        const ontUser = String(device.username || '').toLowerCase();
        if (!ontUser || ontUser === 'unknown_ont') return false;
        return ontUser === lower || ontUser.split('@')[0] === base;
    }) || {};
}

function mapPopupBadge(text, variant = 'neutral') {
    return `<span class="map-popup-badge map-popup-badge--${variant}">${escapeMapHtml(text)}</span>`;
}

function mapPopupStat(label, value, valueClass = '') {
    return `
        <div class="map-popup-stat">
            <span class="map-popup-stat-label">${escapeMapHtml(label)}</span>
            <span class="map-popup-stat-value ${valueClass}">${value}</span>
        </div>
    `;
}

function mapPopupSection(title, iconSvg, bodyHtml) {
    return `
        <section class="map-popup-card">
            <div class="map-popup-card-head">
                <span class="map-popup-card-icon">${iconSvg}</span>
                <span class="map-popup-card-title">${escapeMapHtml(title)}</span>
            </div>
            ${bodyHtml}
        </section>
    `;
}

function mapPopupStatusVariant(status) {
    if (status === 'active') return { label: 'Aktif', variant: 'success' };
    if (status === 'isolated') return { label: 'Isolir', variant: 'warning' };
    if (status === 'suspended') return { label: 'Suspend', variant: 'danger' };
    return { label: 'Nonaktif', variant: 'neutral' };
}

function mapPopupRxClass(status) {
    if (status === 'good') return 'map-popup-stat-value--good';
    if (status === 'warning') return 'map-popup-stat-value--warn';
    if (status === 'critical') return 'map-popup-stat-value--bad';
    return '';
}

function buildSpeedometerGauge(label, bps, maxMbps, type) {
    const maxBps = maxMbps > 0 ? maxMbps * 1_000_000 : 0;
    const pct = maxBps > 0 ? Math.min(100, ((Number(bps) || 0) / maxBps) * 100) : 0;
    const cx = 50;
    const cy = 48;
    const radius = 36;
    const arcLength = Math.PI * radius;
    const dash = (pct / 100) * arcLength;
    const needleAngle = 180 - (pct / 100) * 180;
    const needleRad = (needleAngle * Math.PI) / 180;
    const needleLen = radius - 10;
    const needleX = cx + needleLen * Math.cos(needleRad);
    const needleY = cy - needleLen * Math.sin(needleRad);
    const stroke = type === 'down' ? '#059669' : '#2563eb';
    const strokeSoft = type === 'down' ? '#34d399' : '#60a5fa';
    const maxLabel = maxMbps > 0 ? `${maxMbps}M` : 'N/A';
    const midLabel = maxMbps > 0 ? `${Math.round(maxMbps / 2)}M` : '';

    return `
        <div class="map-speedometer map-speedometer--${type}">
            <div class="map-speedometer-shell">
                <svg viewBox="0 0 100 62" class="map-speedometer-svg" aria-hidden="true">
                    <defs>
                        <linearGradient id="gauge-grad-${type}" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="${stroke}" />
                            <stop offset="100%" stop-color="${strokeSoft}" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M 14 48 A 36 36 0 0 1 86 48"
                        fill="none"
                        stroke="#e4e4e7"
                        stroke-width="6"
                        stroke-linecap="round"
                        opacity="0.9"
                    />
                    <path
                        d="M 14 48 A 36 36 0 0 1 86 48"
                        fill="none"
                        stroke="url(#gauge-grad-${type})"
                        stroke-width="6"
                        stroke-linecap="round"
                        stroke-dasharray="${dash.toFixed(2)} ${arcLength.toFixed(2)}"
                        class="map-speedometer-arc"
                    />
                    <line x1="${cx}" y1="${cy}" x2="${needleX.toFixed(2)}" y2="${needleY.toFixed(2)}" stroke="${stroke}" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
                    <circle cx="${cx}" cy="${cy}" r="3" fill="#fff" stroke="${stroke}" stroke-width="1.5"/>
                    <text x="8" y="58" font-size="5.5" fill="#94a3b8" font-weight="600">0</text>
                    <text x="46" y="11" font-size="5.5" fill="#94a3b8" font-weight="600">${midLabel}</text>
                    <text x="82" y="58" font-size="5.5" fill="#94a3b8" font-weight="600">${maxLabel}</text>
                </svg>
            </div>
            <p class="map-speedometer-label">${label}</p>
            <p class="map-speedometer-value">${formatSpeedBps(bps)}</p>
        </div>
    `;
}

function resolveTrafficMetrics(metrics, cust) {
    const username = cust?.username;
    if (!username) return {};

    const routerMap = metrics?.traffic_by_router?.[String(cust.router_id)]
        || metrics?.traffic_by_router?.[cust.router_id];
    const trafficMap = routerMap || metrics?.traffic || {};

    const directKeys = [
        username,
        String(username).split('@')[0],
        String(username).toLowerCase(),
        String(username).split('@')[0].toLowerCase(),
    ];

    for (const key of directKeys) {
        if (key && trafficMap[key]) {
            return trafficMap[key];
        }
    }

    const lower = String(username).toLowerCase();
    const base = lower.split('@')[0];

    for (const [key, entry] of Object.entries(trafficMap)) {
        const keyLower = String(key).toLowerCase();
        const keyBase = keyLower.split('@')[0];
        if (keyLower === lower || keyBase === base) {
            return entry;
        }
    }

    return {};
}

function getCustomerPopupOptions() {
    const mobile = window.matchMedia('(max-width: 639px)').matches;

    return {
        maxWidth: mobile ? 292 : 400,
        minWidth: mobile ? 268 : 340,
        maxHeight: Math.min(Math.round(window.innerHeight * 0.48), 380),
        autoPanPadding: mobile ? [32, 20] : [48, 48],
        className: 'customer-detail-popup',
    };
}

function buildCustomerMapPopup(cust, metrics = {}) {
    const ont = resolveOntMetrics(metrics, cust.username);
    const traffic = resolveTrafficMetrics(metrics, cust);
    const metricsLoaded = metrics && (Object.keys(metrics.ont || {}).length > 0 || (metrics.ont_devices || []).length > 0);
    const pkg = cust.package || {};
    const bandwidth = parseBandwidthLimit(pkg.bandwidth_limit);
    const isOnline = !!traffic.online;
    const statusMeta = mapPopupStatusVariant(cust.status);
    const odpName = cust.odp?.name || '-';
    const rxText = ont.rx || (metricsLoaded ? 'Tidak tersedia' : 'Memuat...');
    const rxStatus = ont.status || 'offline';
    const displayOrDash = (val) => (val === null || val === undefined || val === '') ? '—' : escapeMapHtml(val);
    const initial = escapeMapHtml(String(cust.name || '?').charAt(0).toUpperCase());
    const serviceLabel = escapeMapHtml(String(cust.service_type || 'pppoe').toUpperCase());

    const iconPackage = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7.6 12 12.8l8.7-5.2"/><path d="M12 22.8V12.7"/></svg>';
    const iconNetwork = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>';
    const iconWifi = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.5a14 14 0 0 1 14 0"/><path d="M8.5 15.5a9 9 0 0 1 7 0"/><path d="M12 19h.01"/><path d="M2 8.5a20 20 0 0 1 20 0"/></svg>';
    const iconTraffic = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/></svg>';

    return `
        <div class="map-popup-customer" data-customer-id="${cust.id}">
            <header class="map-popup-hero">
                <div class="map-popup-hero-glow"></div>
                <div class="map-popup-hero-row">
                    <div class="map-popup-avatar">${initial}</div>
                    <div class="map-popup-hero-text">
                        <h3 class="map-popup-name">${escapeMapHtml(cust.name)}</h3>
                        <p class="map-popup-sub">${escapeMapHtml(cust.username)} · ${serviceLabel}</p>
                    </div>
                </div>
                <div class="map-popup-badges">
                    ${mapPopupBadge(statusMeta.label, statusMeta.variant)}
                    ${mapPopupBadge(isOnline ? 'Online' : 'Offline', isOnline ? 'online' : 'offline')}
                </div>
            </header>

            <div class="map-popup-body">
                ${mapPopupSection('Paket & Tagihan', iconPackage, `
                    <div class="map-popup-stats-grid">
                        ${mapPopupStat('Paket', displayOrDash(pkg.name))}
                        ${mapPopupStat('Harga / bulan', pkg.price ? formatRupiah(pkg.price) : '—', 'map-popup-stat-value--accent')}
                        ${mapPopupStat('Bandwidth', displayOrDash(pkg.bandwidth_limit))}
                        ${mapPopupStat('Titik ODP', escapeMapHtml(odpName))}
                    </div>
                `)}

                ${mapPopupSection('ONT & Jaringan', iconNetwork, `
                    <div class="map-popup-stats-grid">
                        ${mapPopupStat('Redaman', escapeMapHtml(rxText), mapPopupRxClass(rxStatus))}
                        ${mapPopupStat('Suhu ONT', displayOrDash(ont.temperature))}
                        ${mapPopupStat('Perangkat WiFi', ont.connected_devices !== null && ont.connected_devices !== undefined ? `${ont.connected_devices} unit` : '—')}
                        ${mapPopupStat('Product Class', displayOrDash(ont.product_class || ont.model))}
                    </div>
                `)}

                ${mapPopupSection('WiFi Pelanggan', iconWifi, `
                    <div class="map-popup-credential-grid">
                        <div class="map-popup-credential">
                            <span class="map-popup-stat-label">Nama WiFi</span>
                            <span class="map-popup-credential-value">${displayOrDash(ont.wifi_ssid)}</span>
                        </div>
                        <div class="map-popup-credential">
                            <span class="map-popup-stat-label">Sandi WiFi</span>
                            <span class="map-popup-credential-value">${displayOrDash(ont.wifi_password)}</span>
                        </div>
                    </div>
                `)}

                ${mapPopupSection('Traffic Langsung', iconTraffic, `
                    <div class="map-speedometer-grid">
                        ${buildSpeedometerGauge('Download', traffic.download_bps || 0, bandwidth.down, 'down')}
                        ${buildSpeedometerGauge('Upload', traffic.upload_bps || 0, bandwidth.up, 'up')}
                    </div>
                `)}

                <footer class="map-popup-footer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
                    <span>${escapeMapHtml(cust.address)}</span>
                </footer>
            </div>
        </div>
    `;
}

function TransitionModal({ show, children, maxWidth = 'md', className = '', themeCard = '' }) {
    const [render, setRender] = useState(show);
    const [animateShow, setAnimateShow] = useState(show);

    useEffect(() => {
        if (show) {
            setRender(true);
            const timer = setTimeout(() => setAnimateShow(true), 10);
            return () => clearTimeout(timer);
        } else {
            setAnimateShow(false);
            const timer = setTimeout(() => setRender(false), 300);
            return () => clearTimeout(timer);
        }
    }, [show]);

    if (!render) return null;

    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
    };

    return (
        <div className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${animateShow ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`w-full ${maxWidthClasses[maxWidth] || 'max-w-md'} border rounded-2xl p-6 space-y-4 shadow-xl ${themeCard} transition-all duration-300 ease-out transform ${animateShow ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'} ${className}`}>
                {children}
            </div>
        </div>
    );
}

export default function Dashboard({ 
    auth, 
    odps = [], 
    customers = [], 
    routers = [], 
    packages = [], 
    invoices = [], 
    billingActivityLogs = [],
    settings = [],
    hotspotVouchers = [],
    hotspotSales = [],
    databaseInfo = {},
    databaseBackups = [],
    appUpdateInfo = {},
    activeTabProp = 'dashboard'
}) {
    const isHotspotCustomer = (cust) => cust?.service_type === 'hotspot';
    const isPppoeCustomer = (cust) => cust?.service_type !== 'hotspot';

    const [activeTab, setActiveTab] = useState(activeTabProp);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(false); // Default to Light mode
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile menu drawer state
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
    const mobileSearchInputRef = useRef(null);
    const mainScrollRef = useRef(null);
    const [serverResources, setServerResources] = useState({ cpu: 15, ram: 35, disk: 20, os: 'VPS', hostname: 'vps-server' });
    const [resourceHistory, setResourceHistory] = useState([]);
    const [customerPage, setCustomerPage] = useState(1);
    const customerPageSize = 10;
    const [invoicePage, setInvoicePage] = useState(1);
    const invoicePageSize = 10;

    // Hotspot State
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
    const [selectedPackageType, setSelectedPackageType] = useState('pppoe');
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    const [isRestoringDatabase, setIsRestoringDatabase] = useState(false);
    const [restoreSource, setRestoreSource] = useState('existing');
    const [selectedRestoreFilename, setSelectedRestoreFilename] = useState('');
    const [restoreConfirmText, setRestoreConfirmText] = useState('');
    const [restoreUploadName, setRestoreUploadName] = useState('');
    const [isResettingDatabase, setIsResettingDatabase] = useState(false);
    const [resetConfirmText, setResetConfirmText] = useState('');
    const [isRunningUpdate, setIsRunningUpdate] = useState(false);
    const [updateTerminalLines, setUpdateTerminalLines] = useState([]);
    const [updateTerminalStatus, setUpdateTerminalStatus] = useState('idle');
    const updateTerminalRef = useRef(null);
    const voucherPageSize = 10;
    const salesPageSize = 10;

    // Bulk Print & Delete Vouchers States
    const [showPrintVouchersModal, setShowPrintVouchersModal] = useState(false);
    const [printRouterId, setPrintRouterId] = useState('');
    const [printComment, setPrintComment] = useState('');
    const [printLoginUrl, setPrintLoginUrl] = useState('http://10.0.0.1');
    const [printColorPalette, setPrintColorPalette] = useState('price_based');

    const [showBulkDeleteVouchersModal, setShowBulkDeleteVouchersModal] = useState(false);
    const [bulkDeleteVouchersRouterId, setBulkDeleteVouchersRouterId] = useState('');
    const [bulkDeleteVouchersComment, setBulkDeleteVouchersComment] = useState('');

    // ODP CRUD States
    const [showOdpModal, setShowOdpModal] = useState(false);
    const [editingOdp, setEditingOdp] = useState(null);
    const mapRef = React.useRef(null);
    const customerMarkersRef = React.useRef({});
    const openCustomerPopupIdRef = React.useRef(null);
    const [networkMapMetrics, setNetworkMapMetrics] = useState({ ont: {}, traffic: {} });
    const networkMapMetricsRef = React.useRef(networkMapMetrics);
    networkMapMetricsRef.current = networkMapMetrics;
    const [odpSearchTerm, setOdpSearchTerm] = useState('');
    const [odpLat, setOdpLat] = useState('');
    const [odpLng, setOdpLng] = useState('');
    const [customerLat, setCustomerLat] = useState('');
    const [customerLng, setCustomerLng] = useState('');

    useEffect(() => {
        if (showOdpModal) {
            setOdpLat(editingOdp ? String(editingOdp.latitude) : '');
            setOdpLng(editingOdp ? String(editingOdp.longitude) : '');
        }
    }, [showOdpModal, editingOdp]);

    const [generateRouterId, setGenerateRouterId] = useState('');
    const [hotspotServers, setHotspotServers] = useState([]);
    const [isLoadingServers, setIsLoadingServers] = useState(false);
    const [generateComment, setGenerateComment] = useState('');
    const [generateServerDnsName, setGenerateServerDnsName] = useState('');

    const [isolirRouterId, setIsolirRouterId] = useState('');
    const [isolirPppProfiles, setIsolirPppProfiles] = useState([]);
    const [isLoadingIsolirProfiles, setIsLoadingIsolirProfiles] = useState(false);
    const [selectedIsolirProfile, setSelectedIsolirProfile] = useState('');

    useEffect(() => {
        setVoucherPage(1);
    }, [searchTerm, voucherRouterFilter, voucherStatusFilter, voucherCommentFilter]);

    useEffect(() => {
        setVoucherCommentFilter('');
    }, [voucherRouterFilter]);

    useEffect(() => {
        setCustomerPage(1);
    }, [searchTerm]);

    useEffect(() => {
        setInvoicePage(1);
    }, [searchTerm]);

    useEffect(() => {
        setHotspotMemberPage(1);
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
    const { flash, branding = {} } = usePage().props;
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
    const [customerModalServiceType, setCustomerModalServiceType] = useState('pppoe');
    const [hotspotMemberPage, setHotspotMemberPage] = useState(1);

    useEffect(() => {
        if (showCustomerModal) {
            setCustomerLat(editingCustomer?.latitude != null && editingCustomer?.latitude !== '' ? String(editingCustomer.latitude) : '');
            setCustomerLng(editingCustomer?.longitude != null && editingCustomer?.longitude !== '' ? String(editingCustomer.longitude) : '');
        }
    }, [showCustomerModal, editingCustomer]);

    // Package Modal State
    const [showPackageModal, setShowPackageModal] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);

    // Map settings key-value helper
    const settingsMap = {};
    settings.forEach(s => {
        settingsMap[s.key] = s.value;
    });

    const storedTaxRate = parseFloat(settingsMap['system.tax_rate'] || '0') || 0;
    const taxEnabledDefault = storedTaxRate > 0;
    const storedTaxPercent = parseFloat(settingsMap['system.tax_rate_percent'] || '');
    const taxRatePercentDefault = Number.isFinite(storedTaxPercent) && storedTaxPercent > 0
        ? storedTaxPercent
        : (taxEnabledDefault ? Math.round(storedTaxRate * 10000) / 100 : 11);

    const prorataEnabledDefault = settingsMap['system.billing_prorata_enabled'] !== '0';
    const billingGenerateDaysBeforeDefault = Math.min(30, Math.max(1, parseInt(settingsMap['system.billing_generate_days_before'] || '5', 10) || 5));
    const billingNotifyAdminDefault = settingsMap['system.billing_notify_admin'] !== '0';
    const billingAdminPhoneDefault = settingsMap['system.billing_admin_phone'] || '';

    const formatTimeAgo = (isoString) => {
        if (!isoString) return '-';
        const diffMs = Date.now() - new Date(isoString).getTime();
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'baru saja';
        if (mins < 60) return `${mins}m lalu`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}j lalu`;
        const days = Math.floor(hours / 24);
        return `${days}h lalu`;
    };

    const savedIsolirProfile = settingsMap['mikrotik.isolir_profile'] || 'ISOLIR';
    const isolirProfileOptions = [...new Set([
        selectedIsolirProfile || savedIsolirProfile,
        savedIsolirProfile,
        ...isolirPppProfiles,
    ])].filter(Boolean);

    const handleLogout = () => {
        router.post('/logout');
    };

    const handleSidebarNavigate = (tab) => {
        setIsMobileMenuOpen(false);
        setIsMobileSearchOpen(false);

        if (tab === activeTab) {
            return;
        }

        router.get(`/${tab}`, {}, { preserveState: true, preserveScroll: false });
    };

    const handleOpenProfile = () => {
        setIsMobileMenuOpen(false);
        router.get('/profile', {}, { preserveState: true, preserveScroll: false });
    };

    useEffect(() => {
        const previousBodyOverflow = document.body.style.overflow;
        const previousHtmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overflow = previousHtmlOverflow;
        };
    }, []);

    useEffect(() => {
        if (!isMobileMenuOpen) {
            return undefined;
        }

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener('keydown', handleEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isMobileMenuOpen]);

    useEffect(() => {
        if (!isMobileSearchOpen) {
            return undefined;
        }

        mobileSearchInputRef.current?.focus();

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsMobileSearchOpen(false);
            }
        };

        window.addEventListener('keydown', handleEscape);

        return () => {
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isMobileSearchOpen]);

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

    const fetchNetworkMapMetrics = async () => {
        try {
            const res = await fetch('/admin/network-map/metrics');
            const data = await res.json();
            setNetworkMapMetrics(data);
        } catch (err) {
            console.error('Failed to load network map metrics', err);
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

    const fetchServerResources = async () => {
        try {
            const res = await fetch('/admin/server/resources');
            const data = await res.json();
            setServerResources(data);
        } catch (err) {
            console.error("Failed to load server resources", err);
        }
    };

    useEffect(() => {
        setActiveTab(activeTabProp);
    }, [activeTabProp]);

    useEffect(() => {
        mainScrollRef.current?.scrollTo(0, 0);
    }, [activeTab]);

    // Sync URL path with activeTab for clean SPA routing (e.g. /routers)
    useEffect(() => {
        const handlePopState = () => {
            const path = window.location.pathname.replace(/^\//, ''); // removes leading slash
            const validTabs = ['dashboard', 'routers', 'customers', 'packages', 'invoices', 'hotspot', 'database', 'update', 'settings', 'profile', 'network-map'];
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
        let interval;
        if (activeTab === 'dashboard') {
            fetchOntDevices();
            fetchServerResources();
            interval = setInterval(fetchServerResources, 15000);
        } else if (activeTab === 'network-map') {
            fetchNetworkMapMetrics();
            interval = setInterval(fetchNetworkMapMetrics, 15000);
        } else if (activeTab === 'hotspot') {
            fetchHotspotVoucherMacAddresses();
            interval = setInterval(fetchHotspotVoucherMacAddresses, 30000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [activeTab]);

    useEffect(() => {
        const custId = openCustomerPopupIdRef.current;
        if (!custId || activeTab !== 'network-map') return;

        const marker = customerMarkersRef.current[custId];
        const cust = customers.find((c) => c.id === custId);
        if (marker && cust && marker.isPopupOpen()) {
            marker.setPopupContent(buildCustomerMapPopup(cust, networkMapMetrics));
        }
    }, [networkMapMetrics, customers, activeTab]);

    useEffect(() => {
        // Initialize resource history with some initial points to look nice on start
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
        setResourceHistory(prev => {
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

    const handleOdpRowClick = (odp) => {
        if (mapRef.current && odp.latitude && odp.longitude) {
            mapRef.current.flyTo([parseFloat(odp.latitude), parseFloat(odp.longitude)], 17, {
                animate: true,
                duration: 1.2
            });
        }
    };

    const handleSaveOdpSubmit = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const payload = Object.fromEntries(data.entries());
        
        router.post('/admin/odps/save', payload, {
            onSuccess: () => {
                setShowOdpModal(false);
                setEditingOdp(null);
            }
        });
    };

    const handleDeleteOdp = (odp) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus ODP "${odp.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
        router.post('/admin/odps/delete', { id: odp.id });
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
                setTimeout(() => setCustomerToDelete(null), 300);
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
                setTimeout(() => setSelectedCustomerIds([]), 300);
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
        if (!confirm("Konfirmasi terima pembayaran tunai secara manual?\n\nPratinjau cetak akan dibuka di tab baru.\nJika salah klik, gunakan tombol \"Batalkan\" pada invoice lunas (khusus bayar manual).")) return;

        const printUrl = `/admin/invoices/${invoiceId}/print?position=top`;
        const printWindow = window.open('about:blank', '_blank');

        router.post('/admin/invoices/pay-manual', { invoice_id: invoiceId }, {
            preserveScroll: true,
            onSuccess: () => {
                if (printWindow && !printWindow.closed) {
                    printWindow.location.href = printUrl;
                    printWindow.focus();
                } else {
                    window.open(printUrl, '_blank', 'noopener,noreferrer');
                }
            },
            onError: () => {
                printWindow?.close();
            },
        });
    };

    const handleVoidPayment = (invoiceId, invoiceNumber) => {
        if (!confirm(`Batalkan pembayaran manual untuk invoice ${invoiceNumber}?\n\nStatus akan kembali \"Belum Bayar\". Jika sudah lewat jatuh tempo, pelanggan dapat di-isolir kembali.`)) return;

        router.post('/admin/invoices/void-payment', { invoice_id: invoiceId }, {
            preserveScroll: true,
        });
    };

    const handleGenerateInvoices = () => {
        if (!confirm("Generate tagihan bulanan otomatis untuk periode bulan ini sekarang?")) return;
        
        router.post('/admin/invoices/generate');
    };

    const handleCreateBackup = () => {
        if (!confirm('Buat backup database sekarang?\n\nFile akan disimpan di server (storage/app/backups/database).')) return;

        setIsCreatingBackup(true);
        router.post('/admin/database/backup', {}, {
            preserveScroll: true,
            onFinish: () => setIsCreatingBackup(false),
            onSuccess: () => router.reload(),
        });
    };

    const handleDeleteBackup = (filename) => {
        if (!confirm(`Hapus file backup "${filename}"?\n\nTindakan ini tidak dapat dibatalkan.`)) return;

        router.post('/admin/database/backups/delete', { filename }, {
            preserveScroll: true,
            onSuccess: () => router.reload(),
        });
    };

    const handleRestoreDatabase = (e) => {
        e.preventDefault();

        if (restoreConfirmText !== 'RESTORE') {
            showToast('Ketik RESTORE untuk mengonfirmasi pemulihan database.', 'warning');
            return;
        }

        if (restoreSource === 'existing' && !selectedRestoreFilename) {
            showToast('Pilih file backup yang akan dipulihkan.', 'warning');
            return;
        }

        if (restoreSource === 'upload' && !restoreUploadName) {
            showToast('Unggah file backup (.sql atau .sqlite).', 'warning');
            return;
        }

        if (!confirm('PERINGATAN: Restore akan MENIMPA seluruh data database saat ini.\n\nPastikan Anda sudah punya backup terbaru. Lanjutkan?')) return;

        const form = e.target;
        const formData = new FormData(form);
        formData.set('source', restoreSource);
        formData.set('confirm', restoreConfirmText);

        if (restoreSource === 'existing') {
            formData.set('filename', selectedRestoreFilename);
        } else {
            const fileInput = form.querySelector('input[name="backup_file"]');
            if (fileInput?.files?.[0]) {
                formData.set('backup_file', fileInput.files[0]);
            }
        }

        setIsRestoringDatabase(true);
        router.post('/admin/database/restore', formData, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setIsRestoringDatabase(false),
            onSuccess: () => {
                setRestoreConfirmText('');
                setRestoreUploadName('');
                router.reload();
            },
            onError: (errors) => {
                const messages = Object.values(errors).flat().filter(Boolean);
                showToast(messages[0] || 'Gagal restore database.', 'error');
            },
        });
    };

    const handleResetDatabase = (e) => {
        e.preventDefault();

        if (resetConfirmText !== 'RESET') {
            showToast('Ketik RESET untuk mengonfirmasi reset database.', 'warning');
            return;
        }

        if (!confirm(
            'PERINGATAN: Semua data operasional akan dihapus:\n' +
            '• Pelanggan & akun portal pelanggan\n' +
            '• Tagihan, pembayaran, log billing\n' +
            '• Router, paket, ODP, voucher hotspot\n\n' +
            'Yang TETAP AMAN:\n' +
            '• Akun administrator (Super Admin)\n' +
            '• Pengaturan aplikasi (branding, payment, WA, dll)\n' +
            '• File backup di server\n\n' +
            'Disarankan buat backup dulu. Lanjutkan reset?'
        )) return;

        setIsResettingDatabase(true);
        router.post('/admin/database/reset', { confirm: resetConfirmText }, {
            preserveScroll: true,
            onFinish: () => setIsResettingDatabase(false),
            onSuccess: () => {
                setResetConfirmText('');
                router.reload();
            },
            onError: (errors) => {
                const messages = Object.values(errors).flat().filter(Boolean);
                showToast(messages[0] || 'Gagal reset database.', 'error');
            },
        });
    };

    const handleRunUpdate = async () => {
        if (!appUpdateInfo.update_available || !appUpdateInfo.available || appUpdateInfo.enabled === false) {
            return;
        }

        if (!confirm(
            'Pembaruan akan menarik kode terbaru dari GitHub, menjalankan Composer & NPM, migrasi database, dan rebuild frontend.\n\n' +
            'Disarankan buat backup database dulu. Proses bisa memakan beberapa menit.\n\nLanjutkan?'
        )) return;

        setIsRunningUpdate(true);
        setUpdateTerminalStatus('running');
        setUpdateTerminalLines([
            { text: 'Menghubungkan ke server update...', type: 'info' },
        ]);

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        const appendLine = (line, type = 'stdout') => {
            setUpdateTerminalLines((prev) => [...prev, { text: line, type }]);
        };

        const parseSseChunk = (chunk, onEvent) => {
            const blocks = chunk.split('\n\n');
            blocks.forEach((block) => {
                if (!block.trim()) return;

                let eventName = 'message';
                let dataStr = '';

                block.split('\n').forEach((line) => {
                    if (line.startsWith('event:')) {
                        eventName = line.slice(6).trim();
                    } else if (line.startsWith('data:')) {
                        dataStr += line.slice(5).trim();
                    }
                });

                if (dataStr) {
                    try {
                        onEvent(eventName, JSON.parse(dataStr));
                    } catch {
                        // ignore malformed chunks
                    }
                }
            });
        };

        try {
            const response = await fetch('/admin/update/run-stream', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'text/event-stream',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                throw new Error(`Server merespons ${response.status}.`);
            }

            if (!response.body) {
                throw new Error('Stream update tidak tersedia di browser ini.');
            }

            appendLine('Terhubung. Menjalankan perintah shell...', 'info');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split('\n\n');
                buffer = parts.pop() || '';

                parts.forEach((part) => {
                    parseSseChunk(part + '\n\n', (eventName, data) => {
                        if (eventName === 'log' && data?.line) {
                            appendLine(data.line, data.type || 'stdout');
                        } else if (eventName === 'done') {
                            setUpdateTerminalStatus(data?.success ? 'success' : 'error');
                            if (data?.success) {
                                showToast(data.message || 'Pembaruan berhasil.', 'success');
                                setTimeout(() => router.reload(), 1800);
                            } else {
                                showToast(data?.message || 'Gagal memperbarui aplikasi.', 'error');
                            }
                        }
                    });
                });
            }

            if (buffer.trim()) {
                parseSseChunk(buffer + '\n\n', (eventName, data) => {
                    if (eventName === 'log' && data?.line) {
                        appendLine(data.line, data.type || 'stdout');
                    } else if (eventName === 'done') {
                        setUpdateTerminalStatus(data?.success ? 'success' : 'error');
                    }
                });
            }
        } catch (error) {
            const message = error?.message || 'Gagal memperbarui aplikasi.';
            appendLine(message, 'error');
            setUpdateTerminalStatus('error');
            showToast(message, 'error');
        } finally {
            setIsRunningUpdate(false);
        }
    };

    useEffect(() => {
        if (updateTerminalRef.current) {
            updateTerminalRef.current.scrollTop = updateTerminalRef.current.scrollHeight;
        }
    }, [updateTerminalLines, updateTerminalStatus]);

    const canRunAppUpdate = Boolean(
        appUpdateInfo.update_available
        && appUpdateInfo.available
        && appUpdateInfo.enabled !== false
    );

    const handleSaveProfile = (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const avatarInput = form.querySelector('input[name="avatar"]');
        if (avatarInput?.files?.[0]) {
            formData.set('avatar', avatarInput.files[0]);
        }

        router.post('/admin/profile/save', formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => router.reload(),
            onError: (errors) => {
                const messages = Object.values(errors).flat().filter(Boolean);
                showToast(messages[0] || 'Gagal menyimpan profil administrator.', 'error');
            },
        });
    };

    const handleSaveSettings = (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const logoInput = form.querySelector('input[name="system[logo]"]');
        const faviconInput = form.querySelector('input[name="system[favicon]"]');
        if (logoInput?.files?.[0]) {
            formData.set('system[logo]', logoInput.files[0]);
        }
        if (faviconInput?.files?.[0]) {
            formData.set('system[favicon]', faviconInput.files[0]);
        }

        const taxCheckbox = form.querySelector('input[name="system_tax_enabled_ui"]');
        formData.set('system[tax_enabled]', taxCheckbox?.checked ? '1' : '0');

        const prorataCheckbox = form.querySelector('input[name="system_billing_prorata_ui"]');
        formData.set('system[billing_prorata_enabled]', prorataCheckbox?.checked ? '1' : '0');

        const billingNotifyCheckbox = form.querySelector('input[name="system_billing_notify_admin_ui"]');
        formData.set('system[billing_notify_admin]', billingNotifyCheckbox?.checked ? '1' : '0');

        router.post('/admin/settings/save', formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => router.reload(),
            onError: (errors) => {
                const messages = Object.values(errors).flat().filter(Boolean);
                showToast(messages[0] || 'Gagal menyimpan pengaturan. Periksa kembali form Anda.', 'error');
            },
        });
    };

    // Hotspot Action Handlers
    const handleSyncHotspot = (routerId) => {
        if (!routerId) {
            showToast("Pilih router terlebih dahulu untuk sinkronisasi profil hotspot.", "warning");
            return;
        }
        setIsSyncingHotspot(true);
        router.post('/admin/hotspot/sync-profiles', { router_id: routerId }, {
            onSuccess: () => {
                setIsSyncingHotspot(false);
            },
            onError: () => {
                setIsSyncingHotspot(false);
            }
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
            onError: () => {
                setIsGeneratingVouchers(false);
            }
        });
    };

    const generateDefaultComment = (routerId) => {
        const routerName = routers.find(r => String(r.id) === String(routerId))?.name || 'Router';
        const cleanRouterName = routerName.replace(/[^a-zA-Z0-9]/g, '');
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `${cleanRouterName}_${dd}${mm}${yyyy}_${hh}${min}`;
    };

    const fetchIsolirPppProfiles = async (routerId) => {
        if (!routerId) {
            setIsolirPppProfiles([]);
            return;
        }
        setIsLoadingIsolirProfiles(true);
        try {
            const response = await fetch('/admin/routers/get-profiles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ router_id: routerId, type: 'pppoe' }),
            });
            const result = await response.json();
            if (result.success) {
                setIsolirPppProfiles(result.profiles || []);
            } else {
                showToast(result.message || 'Gagal mengambil profile PPP dari RouterOS.', 'error');
                setIsolirPppProfiles([]);
            }
        } catch (error) {
            showToast('Terjadi kesalahan saat menghubungi router.', 'error');
            setIsolirPppProfiles([]);
        } finally {
            setIsLoadingIsolirProfiles(false);
        }
    };

    useEffect(() => {
        if (activeTab !== 'settings') return;

        const map = {};
        settings.forEach((s) => { map[s.key] = s.value; });

        const savedProfile = map['mikrotik.isolir_profile'] || 'ISOLIR';
        setSelectedIsolirProfile(savedProfile);

        const savedRouterId = map['mikrotik.isolir_source_router_id'];
        const defaultRouterId = savedRouterId && routers.some((r) => String(r.id) === String(savedRouterId))
            ? String(savedRouterId)
            : String(routers.find((r) => r.status)?.id || routers[0]?.id || '');

        if (defaultRouterId) {
            setIsolirRouterId(defaultRouterId);
            fetchIsolirPppProfiles(defaultRouterId);
        } else {
            setIsolirRouterId('');
            setIsolirPppProfiles([]);
        }
    }, [activeTab, settings, routers]);

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
                headers: {
                    'Accept': 'application/json',
                }
            });
            const result = await response.json();
            if (result.success) {
                setHotspotServers(result.servers || []);
            } else {
                showToast(result.message || "Gagal mengambil daftar server hotspot.", "error");
                setHotspotServers([]);
            }
        } catch (error) {
            showToast("Terjadi kesalahan saat menghubungi server.", "error");
            setHotspotServers([]);
        } finally {
            setIsLoadingServers(false);
        }
    };

    const handlePrintVouchersSubmit = (e) => {
        e.preventDefault();
        if (!printRouterId || !printComment) {
            showToast("Pilih router dan informasi tambahan terlebih dahulu.", "warning");
            return;
        }
        const url = `/admin/hotspot/print-vouchers?router_id=${printRouterId}&comment=${encodeURIComponent(printComment)}&login_url=${encodeURIComponent(printLoginUrl)}&color_palette=${printColorPalette}`;
        window.open(url, '_blank');
        setShowPrintVouchersModal(false);
    };

    const handleBulkDeleteVouchersSubmit = (e) => {
        e.preventDefault();
        if (!bulkDeleteVouchersRouterId || !bulkDeleteVouchersComment) {
            showToast("Pilih router dan informasi tambahan terlebih dahulu.", "warning");
            return;
        }
        if (!confirm(`Apakah Anda yakin ingin menghapus massal voucher dengan Informasi Tambahan "${bulkDeleteVouchersComment}"? Tindakan ini akan menghapus akun dari Mikrotik dan basis data lokal.`)) {
            return;
        }
        router.post('/admin/hotspot/bulk-delete-vouchers', {
            router_id: bulkDeleteVouchersRouterId,
            comment: bulkDeleteVouchersComment
        }, {
            onSuccess: () => {
                setShowBulkDeleteVouchersModal(false);
                setBulkDeleteVouchersRouterId('');
                setBulkDeleteVouchersComment('');
            }
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
            onError: () => {
                setIsSellingVoucher(false);
            }
        });
    };

    const handleDeleteVoucher = (voucherId) => {
        if (!confirm("Apakah Anda yakin ingin menghapus voucher ini? Tindakan ini akan menghapus akun user dari Mikrotik dan basis data lokal.")) return;
        
        router.post('/admin/hotspot/delete-voucher', { id: voucherId });
    };

    useEffect(() => {
        if (editingPackage) {
            setSelectedPackageType(editingPackage.type || 'pppoe');
        } else {
            setSelectedPackageType('pppoe');
        }
    }, [editingPackage, showPackageModal]);

    // Leaflet map initialization hook
    useEffect(() => {
        if (activeTab !== 'network-map') return;

        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;

        const defaultCenter = [-6.3263, 108.3201];
        const center = odps.length > 0 ? [parseFloat(odps[0].latitude), parseFloat(odps[0].longitude)] : defaultCenter;

        const map = L.map('map-container', {
            center: center,
            zoom: 15,
            zoomControl: false,
            layers: []
        });

        mapRef.current = map;

        L.control.zoom({ position: 'topright' }).addTo(map);

        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            setOdpLat(lat.toFixed(6));
            setOdpLng(lng.toFixed(6));
            setEditingOdp(null);
            
            L.popup()
                .setLatLng(e.latlng)
                .setContent(`
                    <form id="mini-odp-form" class="p-2 space-y-3 w-56 font-sans text-zinc-800 leading-normal">
                        <div class="flex items-center gap-1.5 border-b border-zinc-100 pb-2">
                            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span class="font-extrabold text-[11px] text-zinc-900 tracking-wider uppercase">Tambah ODP Baru</span>
                        </div>
                        
                        <div class="space-y-2">
                            <div class="flex flex-col gap-1">
                                <label class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Nama ODP</label>
                                <input required id="mini-odp-name" type="text" placeholder="Contoh: ODP-IND-01" class="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-[10px] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs" style="color:#27272a !important; background-color:#ffffff !important;" />
                            </div>
                            
                            <div class="grid grid-cols-2 gap-2">
                                <div class="flex flex-col gap-1">
                                    <label class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Latitude</label>
                                    <input readonly id="mini-odp-lat" type="text" value="${lat.toFixed(6)}" class="w-full px-2 py-1.5 border border-zinc-100 rounded-lg text-[9px] font-mono bg-zinc-50 text-zinc-450 focus:outline-none" style="color:#71717a !important; background-color:#f4f4f5 !important;" />
                                </div>
                                <div class="flex flex-col gap-1">
                                    <label class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Longitude</label>
                                    <input readonly id="mini-odp-lng" type="text" value="${lng.toFixed(6)}" class="w-full px-2 py-1.5 border border-zinc-100 rounded-lg text-[9px] font-mono bg-zinc-50 text-zinc-450 focus:outline-none" style="color:#71717a !important; background-color:#f4f4f5 !important;" />
                                </div>
                            </div>
                            
                            <div class="flex flex-col gap-1">
                                <label class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Jumlah Port</label>
                                <input required id="mini-odp-ports" type="number" min="1" value="8" class="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-[10px] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs" style="color:#27272a !important; background-color:#ffffff !important;" />
                            </div>
                            
                            <div class="flex flex-col gap-1">
                                <label class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Deskripsi Lokasi</label>
                                <textarea id="mini-odp-desc" placeholder="Contoh: Depan warung..." class="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-[10px] h-12 resize-none transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs" style="color:#27272a !important; background-color:#ffffff !important;"></textarea>
                            </div>
                        </div>

                        <button type="button" id="mini-odp-gps-btn" class="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-bold text-[10px] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
                            Ambil GPS Perangkat
                        </button>
                        
                        <button type="submit" class="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-bold text-[10px] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-1">
                            Simpan ODP
                        </button>
                    </form>
                `)
                .openOn(map);
        });

        map.on('popupopen', (e) => {
            const popupNode = e.popup.getElement();
            if (!popupNode) return;
            const form = popupNode.querySelector('#mini-odp-form');
            if (form) {
                setTimeout(() => {
                    const nameInput = form.querySelector('#mini-odp-name');
                    if (nameInput) nameInput.focus();
                }, 100);

                form.addEventListener('submit', (evt) => {
                    evt.preventDefault();
                    const name = form.querySelector('#mini-odp-name').value;
                    const total_ports = form.querySelector('#mini-odp-ports').value;
                    const description = form.querySelector('#mini-odp-desc').value;
                    const latitude = form.querySelector('#mini-odp-lat').value;
                    const longitude = form.querySelector('#mini-odp-lng').value;
                    
                    router.post('/admin/odps/save', {
                        name,
                        latitude,
                        longitude,
                        total_ports,
                        description
                    }, {
                        onSuccess: () => {
                            map.closePopup();
                        }
                    });
                });

                const gpsBtn = form.querySelector('#mini-odp-gps-btn');
                if (gpsBtn) {
                    gpsBtn.addEventListener('click', async () => {
                        const defaultLabel = 'Ambil GPS Perangkat';
                        gpsBtn.disabled = true;
                        gpsBtn.textContent = 'Membaca GPS...';
                        try {
                            const coords = await readDeviceCoordinates();
                            const latInput = form.querySelector('#mini-odp-lat');
                            const lngInput = form.querySelector('#mini-odp-lng');
                            if (latInput) latInput.value = coords.latitude;
                            if (lngInput) lngInput.value = coords.longitude;
                            setOdpLat(coords.latitude);
                            setOdpLng(coords.longitude);
                            map.flyTo([parseFloat(coords.latitude), parseFloat(coords.longitude)], 17, { duration: 0.8 });
                            showToast('Koordinat GPS berhasil diambil.', 'success');
                        } catch (error) {
                            showToast(error.message || 'Gagal membaca GPS perangkat.', 'error');
                        } finally {
                            gpsBtn.disabled = false;
                            gpsBtn.textContent = defaultLabel;
                        }
                    });
                }
            }
        });

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

        customerMarkersRef.current = {};

        customers.forEach(cust => {
            if (!isPppoeCustomer(cust)) return;
            if (!cust.latitude || !cust.longitude) return;

            const lat = parseFloat(cust.latitude);
            const lng = parseFloat(cust.longitude);

            const marker = L.marker([lat, lng], { icon: customerIcon(cust.status) })
                .addTo(map)
                .bindPopup(() => buildCustomerMapPopup(cust, networkMapMetricsRef.current), getCustomerPopupOptions());

            marker.on('popupopen', () => {
                openCustomerPopupIdRef.current = cust.id;
                marker.setPopupContent(buildCustomerMapPopup(cust, networkMapMetricsRef.current));
            });

            marker.on('popupclose', () => {
                if (openCustomerPopupIdRef.current === cust.id) {
                    openCustomerPopupIdRef.current = null;
                }
            });

            customerMarkersRef.current[cust.id] = marker;

            if (cust.odp_id && odpCoordsMap[cust.odp_id]) {
                const odpCoords = odpCoordsMap[cust.odp_id];
                const customerCoords = [lat, lng];
                const cableColor = cust.status === 'active' ? '#10b981' : '#f59e0b';

                L.polyline([odpCoords, customerCoords], {
                    color: cableColor,
                    weight: 2,
                    opacity: 0.75,
                    className: 'optical-cable-flow',
                    smoothFactor: 0,
                }).addTo(map);
            }
        });

        const cableDashPeriod = 20;
        const cableFlowDurationMs = 2400;
        const cableFlowStart = performance.now();
        let cableFlowFrameId = null;

        const animateCableFlow = (now) => {
            const elapsed = now - cableFlowStart;
            const offset = -((elapsed % cableFlowDurationMs) / cableFlowDurationMs) * cableDashPeriod;

            map.getPane('overlayPane')?.querySelectorAll('path.optical-cable-flow').forEach((path) => {
                path.style.strokeDashoffset = `${offset}`;
            });

            cableFlowFrameId = requestAnimationFrame(animateCableFlow);
        };

        cableFlowFrameId = requestAnimationFrame(animateCableFlow);

        return () => {
            if (cableFlowFrameId !== null) {
                cancelAnimationFrame(cableFlowFrameId);
            }
            mapRef.current = null;
            map.remove();
        };
    }, [odps, customers, isDarkMode, activeTab]);

    // System resource metrics
    const systemMetrics = [
        { label: 'CPU Usage', value: `${serverResources.cpu}%`, icon: Cpu, progress: serverResources.cpu },
        { label: 'RAM Usage', value: `${serverResources.ram}%`, icon: Sliders, progress: serverResources.ram },
        { label: 'Disk Space', value: `${serverResources.disk}%`, icon: HardDrive, progress: serverResources.disk }
    ];

    // High-density stats cards (6 cards)
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
        { 
            name: 'Belum Bayar', 
            value: invoices.filter(inv => inv.status === 'unpaid').length, 
            change: 'Tagihan pending', 
            icon: AlertCircle, 
            cardClass: 'bg-gradient-to-br from-cyan-500 to-sky-600 border-cyan-400/20 text-white shadow-md shadow-cyan-500/5', 
            iconClass: 'text-cyan-100', 
            nameClass: 'text-cyan-100/80', 
            valClass: 'text-white', 
            changeClass: 'text-cyan-100/70' 
        },
    ];

    const waLogs = (billingActivityLogs || []).slice(0, 8).map((log) => ({
        type: 'Billing',
        target: log.meta?.admin_phone || (log.meta?.invoice_count > 0 ? 'Admin' : 'Scheduler'),
        text: log.message,
        status: log.meta?.admin_notified ? 'sent' : (log.meta?.invoice_count > 0 ? 'pending' : 'system'),
        time: formatTimeAgo(log.created_at),
    }));

    // Theme Tokens
    const themeBg = isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-800';
    const themeSidebar = isDarkMode ? 'noc-sidebar noc-sidebar-dark' : 'noc-sidebar noc-sidebar-light';
    const themeSidebarBottom = 'noc-sidebar-footer';
    const sidebarTextTitle = 'text-white';
    const sidebarTextSub = 'text-blue-100/80';
    const sidebarTextDesc = 'text-blue-200/60';
    const sidebarBorder = 'border-white/10';
    const themeCard = isDarkMode ? 'bg-zinc-900/50 border-zinc-800/80 backdrop-blur-md' : 'bg-white border-zinc-200/80 shadow-xs';
    const themeTextTitle = isDarkMode ? 'text-white' : 'text-zinc-900';
    const themeTextSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
    const themeTextDesc = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';
    const themeBorderSep = isDarkMode ? 'border-zinc-900' : 'border-zinc-200';
    const themeHeader = isDarkMode ? 'noc-navbar noc-navbar-dark' : 'noc-navbar noc-navbar-light';
    const themeMainPanel = isDarkMode ? 'bg-zinc-950' : 'bg-zinc-50';
    const themeFooterBar = isDarkMode ? 'bg-zinc-950 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200';
    const themeHeaderBorder = isDarkMode ? 'border-transparent' : 'border-transparent';
    const themeInnerWidget = isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';
    const themeInput = isDarkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700' : 'bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300';
    const themeLabel = isDarkMode ? 'text-zinc-400' : 'text-zinc-650';
    const getNavLinkClass = (tabName) => {
        const isActive = activeTab === tabName;
        if (isActive) {
            return 'w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-bold text-xs transition-all duration-150 border bg-white/16 text-white border-white/22 shadow-sm backdrop-blur-sm cursor-pointer';
        }
        return 'w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all duration-150 border border-transparent text-blue-50/85 hover:bg-white/12 hover:text-white hover:border-white/14 cursor-pointer';
    };

    const isHotspotCustomerModal = customerModalServiceType === 'hotspot';

    const openCustomerModal = (serviceType, customer = null) => {
        setCustomerModalServiceType(serviceType);
        setEditingCustomer(customer);
        setShowCustomerModal(true);
    };

    const modalPackages = packages.filter((p) => p.type === customerModalServiceType);

    const filteredCustomers = customers.filter((cust) => {
        if (!isPppoeCustomer(cust)) return false;
        const term = searchTerm.toLowerCase();
        return (
            cust.name.toLowerCase().includes(term) ||
            cust.username.toLowerCase().includes(term) ||
            (cust.package && cust.package.name.toLowerCase().includes(term))
        );
    });

    const filteredHotspotMembers = customers.filter((cust) => {
        if (!isHotspotCustomer(cust)) return false;
        const term = searchTerm.toLowerCase();
        return (
            cust.name.toLowerCase().includes(term) ||
            cust.username.toLowerCase().includes(term) ||
            cust.phone_number?.toLowerCase().includes(term) ||
            (cust.package && cust.package.name.toLowerCase().includes(term))
        );
    });

    const filteredOdps = odps.filter(o => 
        o.name.toLowerCase().includes(odpSearchTerm.toLowerCase()) ||
        (o.description && o.description.toLowerCase().includes(odpSearchTerm.toLowerCase()))
    );

    const totalCustomerPages = Math.ceil(filteredCustomers.length / customerPageSize) || 1;
    const paginatedCustomers = filteredCustomers.slice(
        (customerPage - 1) * customerPageSize,
        customerPage * customerPageSize
    );

    const totalHotspotMemberPages = Math.ceil(filteredHotspotMembers.length / customerPageSize) || 1;
    const paginatedHotspotMembers = filteredHotspotMembers.slice(
        (hotspotMemberPage - 1) * customerPageSize,
        hotspotMemberPage * customerPageSize
    );

    const filteredInvoices = invoices.filter((inv) => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) {
            return true;
        }

        const customerName = inv.customer?.name?.toLowerCase() || '';
        const customerUsername = inv.customer?.username?.toLowerCase() || '';
        const statusLabel = inv.status === 'paid' ? 'lunas paid' : 'belum bayar unpaid';
        const amountText = String(inv.total_amount ?? inv.amount ?? '');

        return (
            inv.invoice_number?.toLowerCase().includes(term) ||
            customerName.includes(term) ||
            customerUsername.includes(term) ||
            inv.billing_period?.toLowerCase().includes(term) ||
            inv.due_date?.substring(0, 10).includes(term) ||
            statusLabel.includes(term) ||
            amountText.includes(term)
        );
    });

    const totalInvoicePages = Math.ceil(filteredInvoices.length / invoicePageSize) || 1;
    const paginatedInvoices = filteredInvoices.slice(
        (invoicePage - 1) * invoicePageSize,
        invoicePage * invoicePageSize
    );

    const isManualPaidInvoice = (inv) => {
        if (inv.status !== 'paid' || !Array.isArray(inv.payments)) {
            return false;
        }

        return inv.payments.some((payment) => payment.gateway_name === 'manual');
    };

    const filteredHotspotVouchers = hotspotVouchers.filter(v => {
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
            .filter(v => voucherRouterFilter === '' || String(v.router_id) === String(voucherRouterFilter))
            .map(v => v.comment)
            .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'id'));

    const totalVoucherPages = Math.ceil(filteredHotspotVouchers.length / voucherPageSize) || 1;
    const paginatedHotspotVouchers = filteredHotspotVouchers.slice(
        (voucherPage - 1) * voucherPageSize,
        voucherPage * voucherPageSize
    );

    const globalSearchPlaceholder = activeTab === 'hotspot' && hotspotSubTab === 'vouchers'
        ? 'Cari kode voucher...'
        : activeTab === 'hotspot' && hotspotSubTab === 'members'
            ? 'Cari member hotspot...'
            : activeTab === 'invoices'
            ? 'Cari invoice / pelanggan...'
            : 'Cari pelanggan...';

    // Compute unique comments/batches for the chosen router
    const uniqueCommentsForPrintRouter = [...new Set(
        hotspotVouchers
            .filter(v => String(v.router_id) === String(printRouterId) && v.comment)
            .map(v => v.comment)
    )];

    const uniqueCommentsForRouter = [...new Set(
        hotspotVouchers
            .filter(v => String(v.router_id) === String(bulkDeleteVouchersRouterId) && v.comment)
            .map(v => v.comment)
    )];

    return (
        <>
            <SeoHead title={branding.display_name || branding.app_name || 'Dashboard'} branding={branding} />
            <div className={`flex h-dvh overflow-hidden font-sans antialiased transition-colors duration-250 ${themeBg}`}>
                
                {/* Left Sidebar — Desktop */}
                <aside className={`hidden md:flex flex-col w-56 shrink-0 min-h-0 overflow-hidden transition-colors duration-250 ${themeSidebar}`}>
                    <SidebarPanel
                        branding={branding}
                        auth={auth}
                        sidebarBorder={sidebarBorder}
                        sidebarTextTitle={sidebarTextTitle}
                        sidebarTextSub={sidebarTextSub}
                        sidebarTextDesc={sidebarTextDesc}
                        themeSidebarBottom={themeSidebarBottom}
                        isDarkMode={isDarkMode}
                        getNavLinkClass={getNavLinkClass}
                        onNavigate={handleSidebarNavigate}
                        onOpenProfile={handleOpenProfile}
                        onLogout={handleLogout}
                    />
                </aside>

                {/* Mobile Sidebar Drawer */}
                <div
                    className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ease-out ${
                        isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                    aria-hidden={!isMobileMenuOpen}
                >
                    <div
                        className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
                            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <aside
                        className={`absolute inset-y-0 left-0 w-[min(16rem,85vw)] flex flex-col shadow-2xl transition-transform duration-300 ease-out will-change-transform ${themeSidebar} ${
                            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Menu navigasi"
                    >
                        <SidebarPanel
                            branding={branding}
                            auth={auth}
                            sidebarBorder={sidebarBorder}
                            sidebarTextTitle={sidebarTextTitle}
                            sidebarTextSub={sidebarTextSub}
                            sidebarTextDesc={sidebarTextDesc}
                            themeSidebarBottom={themeSidebarBottom}
                            isDarkMode={isDarkMode}
                            getNavLinkClass={getNavLinkClass}
                            onNavigate={handleSidebarNavigate}
                            onOpenProfile={handleOpenProfile}
                            onLogout={handleLogout}
                            showCloseButton
                            onClose={() => setIsMobileMenuOpen(false)}
                        />
                    </aside>
                </div>

                {/* Dashboard Main Viewport */}
                <div className={`flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden ${themeMainPanel}`}>
                    
                    {/* Header */}
                    <header className={`h-14 ${themeHeaderBorder} ${themeHeader} flex items-center justify-between px-4 sm:px-6 z-10 transition-colors duration-250`}>
                        
                        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                            <button
                                type="button"
                                onClick={() => setIsMobileMenuOpen(true)}
                                className={`p-1.5 rounded-lg border md:hidden cursor-pointer shrink-0 ${isDarkMode ? 'bg-slate-900/70 border-indigo-500/25 text-slate-300 hover:text-white' : 'bg-white/95 border-indigo-300 text-indigo-800 hover:bg-indigo-100 shadow-sm'}`}
                                aria-label="Buka menu navigasi"
                                aria-expanded={isMobileMenuOpen}
                            >
                                <Menu className="w-4 h-4" />
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    setIsMobileSearchOpen((prev) => !prev);
                                }}
                                className={`p-1.5 rounded-lg border md:hidden cursor-pointer shrink-0 ${
                                    isMobileSearchOpen || searchTerm.trim()
                                        ? (isDarkMode ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-200' : 'bg-indigo-100 border-indigo-400 text-indigo-800')
                                        : (isDarkMode ? 'bg-slate-900/70 border-slate-700/70 text-slate-300 hover:text-white' : 'bg-white/95 border-indigo-300 text-indigo-800 hover:bg-indigo-100 shadow-sm')
                                }`}
                                aria-label="Buka pencarian global"
                                aria-expanded={isMobileSearchOpen}
                            >
                                <Search className="w-4 h-4" />
                            </button>

                            <div className="hidden lg:flex items-center space-x-6">
                                {/* VPS Server Info */}
                                <div className={`flex items-center space-x-2.5 border-r ${isDarkMode ? 'border-indigo-400/20' : 'border-indigo-300/80'} pr-5`}>
                                    <div className={`p-1.5 rounded border ${isDarkMode ? 'bg-indigo-500/12 border-indigo-400/25 text-indigo-300' : 'bg-indigo-100 border-indigo-300 text-indigo-700 shadow-sm'} flex items-center justify-center`}>
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
                                            <div className={`p-1.5 rounded border ${isDarkMode ? 'bg-slate-900/70 border-slate-700/70 text-slate-300' : 'bg-white/95 border-indigo-200 text-indigo-700 shadow-sm'} flex items-center justify-center`}>
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

                        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
                            {/* Search — desktop */}
                            <div className="relative hidden md:block">
                                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                                <input 
                                    type="text" 
                                    placeholder={globalSearchPlaceholder}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`w-40 lg:w-48 pl-8 pr-3 py-1.5 rounded-xl border text-[10px] sm:text-xs font-semibold focus:outline-hidden ${isDarkMode ? 'bg-slate-900/75 border-slate-700/70 text-slate-200 focus:border-indigo-500/45' : 'bg-white/95 border-indigo-300 text-slate-800 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/70 shadow-sm'}`}
                                />
                            </div>

                            {/* WA Gateway Pulse Indicator */}
                            <div className="flex items-center space-x-1.5 mr-1 md:mr-2 select-none shrink-0" title={settingsMap['whatsapp.api_key'] ? "WhatsApp Gateway: Terinstal/Online" : "WhatsApp Gateway: Offline"}>
                                <div className="relative flex h-2.5 w-2.5">
                                    {settingsMap['whatsapp.api_key'] && (
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    )}
                                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${settingsMap['whatsapp.api_key'] ? 'bg-emerald-500' : 'bg-zinc-500'}`}></span>
                                </div>
                                <span className={`hidden md:inline text-[10px] font-bold uppercase tracking-wider ${themeTextTitle}`}>
                                    WA: {settingsMap['whatsapp.api_key'] ? 'Online' : 'Offline'}
                                </span>
                            </div>

                            {/* Theme switcher */}
                            <button 
                                onClick={toggleTheme}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${isDarkMode ? 'bg-slate-900/75 border-slate-700/70 text-slate-300 hover:text-white hover:border-indigo-400/35' : 'bg-indigo-100 border-indigo-300 text-indigo-800 hover:bg-indigo-200 shadow-sm'}`}
                            >
                                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </button>
                        </div>
                    </header>

                    {/* Mobile global search panel */}
                    <div
                        className={`md:hidden overflow-hidden transition-all duration-200 ease-out border-b ${
                            isDarkMode ? 'border-indigo-400/15 bg-slate-950/95' : 'border-indigo-200/80 bg-white/95'
                        } ${isMobileSearchOpen ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
                        aria-hidden={!isMobileSearchOpen}
                    >
                        <div className="px-4 py-2.5">
                            <div className="relative flex items-center gap-2">
                                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    ref={mobileSearchInputRef}
                                    type="search"
                                    enterKeyHint="search"
                                    placeholder={globalSearchPlaceholder}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={`flex-1 min-w-0 pl-9 pr-3 py-2 rounded-xl border text-xs font-semibold focus:outline-hidden ${
                                        isDarkMode
                                            ? 'bg-slate-900/75 border-slate-700/70 text-slate-200 focus:border-indigo-500/45'
                                            : 'bg-white border-indigo-300 text-slate-800 placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200/70'
                                    }`}
                                />
                                {searchTerm.trim() && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                            isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-900'
                                        }`}
                                    >
                                        Hapus
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsMobileSearchOpen(false)}
                                    className={`p-1.5 rounded-lg border shrink-0 cursor-pointer ${
                                        isDarkMode ? 'border-slate-700 text-slate-400 hover:text-white' : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100'
                                    }`}
                                    aria-label="Tutup pencarian"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div ref={mainScrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-4 sm:p-6 space-y-6">
                        
                        {/* TAB 1: NOC DASHBOARD */}
                        {activeTab === 'dashboard' && (
                            <>
                                {/* Stats Grid */}
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

                                {/* NOC Server Resources & Network Statistics Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 space-y-4">
                                        <div className={`${themeCard} border rounded-2xl p-4 shadow-xs space-y-4`}>
                                            {/* Header */}
                                            <div className="flex justify-between items-center pb-2 border-b border-zinc-200/50 dark:border-zinc-800/40">
                                                <div className="flex items-center space-x-2">
                                                    <Cpu className="w-4 h-4 text-emerald-500 animate-pulse" />
                                                    <h3 className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>NOC Monitor Kinerja Server & ODP</h3>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Live Monitoring</span>
                                                </div>
                                            </div>

                                            {/* Content grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {/* Real-time chart */}
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
                                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                                                    </linearGradient>
                                                                    <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
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

                                                {/* Network & ODP Stats Panel */}
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
                                                            const totalPorts = odps.reduce((acc, o) => acc + parseInt(o.total_ports || 0), 0);
                                                            const usedPorts = odps.reduce((acc, o) => acc + parseInt(o.used_ports || 0), 0);
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
                                                                        ></div>
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
                                                ) : ontDevices.filter(dev => dev.status !== 'offline' && dev.username !== 'unknown_ont').length === 0 ? (
                                                    <div className="py-8 text-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                                        No active/online ONT devices found.
                                                    </div>
                                                ) : (
                                                    ontDevices.filter(dev => dev.status !== 'offline' && dev.username !== 'unknown_ont').map((dev, idx) => {
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
                                <div className={`flex justify-between items-center border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3`}>
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
                                <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3 gap-3`}>
                                    <div className="flex items-center space-x-2">
                                        <Users className="w-5 h-5 text-emerald-500" />
                                        <h2 className={`text-sm font-bold ${themeTextTitle}`}>Manajemen Pelanggan PPPoE</h2>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
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
                                            onClick={() => openCustomerModal('pppoe')}
                                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Tambah Pelanggan PPPoE</span>
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
                                                        className={`rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
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
                                                            className={`rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
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
                                                            onClick={() => openCustomerModal('pppoe', cust)}
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
                                <div className={`flex justify-between items-center border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3`}>
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
                                            {packages.map((pkg) => (
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
                                <div className={`flex justify-between items-center border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3`}>
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

                                <div className={`border rounded-xl p-4 space-y-3 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center space-x-2">
                                            <Activity className="w-4 h-4 text-amber-500" />
                                            <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Log Generate Tagihan Otomatis</h3>
                                        </div>
                                        <span className={`text-[10px] ${themeTextDesc}`}>Scheduler harian H-N jatuh tempo</span>
                                    </div>
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                        {billingActivityLogs.length === 0 ? (
                                            <p className={`text-xs text-center py-6 ${themeTextDesc}`}>Belum ada riwayat generate otomatis.</p>
                                        ) : billingActivityLogs.map((log) => (
                                            <div key={log.id} className={`p-3 border rounded-xl text-xs ${themeInnerWidget}`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <p className={`font-bold ${themeTextTitle}`}>{log.message}</p>
                                                        <p className={`text-[10px] ${themeTextDesc}`}>
                                                            {log.run_date?.substring?.(0, 10) || '-'}
                                                            {log.meta?.invoice_count > 0 ? ` · ${log.meta.invoice_count} invoice` : ''}
                                                            {log.meta?.admin_notified ? ' · WA admin terkirim' : (log.meta?.invoice_count > 0 ? ' · WA admin belum terkirim' : '')}
                                                        </p>
                                                        {Array.isArray(log.meta?.invoices) && log.meta.invoices.length > 0 && (
                                                            <ul className={`text-[10px] ${themeTextSub} space-y-0.5 pt-1`}>
                                                                {log.meta.invoices.slice(0, 5).map((item, idx) => (
                                                                    <li key={idx}>
                                                                        {item.invoice_number} — {item.customer_name} · {formatRupiah(item.total_amount || 0)}
                                                                    </li>
                                                                ))}
                                                                {log.meta.invoices.length > 5 && (
                                                                    <li className={themeTextDesc}>+ {log.meta.invoices.length - 5} invoice lainnya</li>
                                                                )}
                                                            </ul>
                                                        )}
                                                    </div>
                                                    <span className={`text-[10px] ${themeTextSub} font-mono whitespace-nowrap`}>{formatTimeAgo(log.created_at)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                                <th className="py-3 px-2">No. Invoice</th>
                                                <th className="py-3 px-2">Pelanggan</th>
                                                <th className="py-3 px-2">Periode</th>
                                                <th className="py-3 px-2">Nominal</th>
                                                <th className="py-3 px-2">Total Amount</th>
                                                <th className="py-3 px-2">Jatuh Tempo</th>
                                                <th className="py-3 px-2">Status</th>
                                                <th className="py-3 px-2">Tagihan Selanjutnya</th>
                                                <th className="py-3 px-2 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/20 text-xs">
                                            {paginatedInvoices.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} className={`py-8 text-center text-xs ${themeTextDesc}`}>
                                                        {searchTerm.trim()
                                                            ? 'Tidak ada invoice yang cocok dengan pencarian.'
                                                            : 'Belum ada data tagihan.'}
                                                    </td>
                                                </tr>
                                            ) : paginatedInvoices.map((inv) => (
                                                <tr key={inv.id} className={`${themeTextSub} hover:bg-zinc-900/10`}>
                                                    <td className={`py-3 px-2 font-mono font-bold ${themeTextTitle}`}>{inv.invoice_number}</td>
                                                    <td className="py-3 px-2">{inv.customer ? inv.customer.name : 'Unknown'}</td>
                                                    <td className="py-3 px-2 font-mono">{inv.billing_period}</td>
                                                    <td className="py-3 px-2">
                                                        <div className="flex flex-col gap-0.5">
                                                            <span className={`font-bold ${themeTextTitle}`}>{formatRupiah(inv.amount)}</span>
                                                            {inv.is_prorated ? (
                                                                <span className="text-[10px] text-amber-500 font-bold">Prorata {inv.days_billed}/30 hari</span>
                                                            ) : (
                                                                <span className={`text-[10px] ${themeTextDesc}`}>Penuh 30 hari</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-2 font-bold text-emerald-500">{formatRupiah(inv.total_amount)}</td>
                                                    <td className="py-3 px-2 font-mono">{inv.due_date ? inv.due_date.substring(0, 10) : '-'}</td>
                                                    <td className="py-3 px-2">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                                            {inv.status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-2">
                                                        {inv.status === 'paid' && inv.next_billing ? (
                                                            <div className="flex flex-col gap-0.5 max-w-[150px]">
                                                                <span className={`font-mono font-bold ${themeTextTitle}`}>{inv.next_billing.period}</span>
                                                                <span className="font-bold text-cyan-500">{formatRupiah(inv.next_billing.total_amount)}</span>
                                                                <span className={`text-[10px] ${themeTextDesc}`}>
                                                                    Jatuh tempo {inv.next_billing.due_date?.substring?.(0, 10) || '-'}
                                                                </span>
                                                                {inv.next_billing.is_prorated && (
                                                                    <span className="text-[10px] text-amber-500 font-bold">Prorata {inv.next_billing.days_billed}/30</span>
                                                                )}
                                                                {inv.next_billing.already_generated ? (
                                                                    <span className="text-[10px] text-emerald-500 font-bold">Sudah: {inv.next_billing.invoice_number}</span>
                                                                ) : (
                                                                    <span className={`text-[10px] ${themeTextDesc}`}>Estimasi (belum terbit)</span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className={themeTextDesc}>-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-2 text-right">
                                                        {inv.status === 'unpaid' ? (
                                                            <button 
                                                                onClick={() => handlePayManual(inv.id)}
                                                                className="px-2 py-0.5 border border-emerald-500/30 text-[10px] text-emerald-500 hover:bg-emerald-500/10 rounded cursor-pointer font-bold"
                                                            >
                                                                Bayar Manual
                                                            </button>
                                                        ) : isManualPaidInvoice(inv) ? (
                                                            <button
                                                                onClick={() => handleVoidPayment(inv.id, inv.invoice_number)}
                                                                className="px-2 py-0.5 border border-rose-500/30 text-[10px] text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer font-bold"
                                                            >
                                                                Batalkan
                                                            </button>
                                                        ) : (
                                                            <span className={`text-[10px] ${themeTextDesc}`}>—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Invoice Pagination Controls */}
                                {filteredInvoices.length > invoicePageSize && (
                                    <div className={`flex flex-col sm:flex-row items-center justify-between pt-4 border-t ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200'} gap-3 text-xs`}>
                                        <span className={themeTextSub}>
                                            Menampilkan <span className={`font-bold ${themeTextTitle}`}>{Math.min((invoicePage - 1) * invoicePageSize + 1, filteredInvoices.length)}</span> hingga <span className={`font-bold ${themeTextTitle}`}>{Math.min(invoicePage * invoicePageSize, filteredInvoices.length)}</span> dari <span className={`font-bold ${themeTextTitle}`}>{filteredInvoices.length}</span> tagihan
                                        </span>
                                        <div className="flex items-center space-x-1">
                                            <button 
                                                disabled={invoicePage === 1}
                                                onClick={() => setInvoicePage(p => Math.max(p - 1, 1))}
                                                className={`px-3 py-1.5 border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
                                            >
                                                Sebelumnya
                                            </button>
                                            {Array.from({ length: totalInvoicePages }, (_, idx) => idx + 1).map(page => {
                                                const isCurrent = page === invoicePage;
                                                return (
                                                    <button 
                                                        key={page}
                                                        onClick={() => setInvoicePage(page)}
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
                                                disabled={invoicePage === totalInvoicePages}
                                                onClick={() => setInvoicePage(p => Math.min(p + 1, totalInvoicePages))}
                                                className={`px-3 py-1.5 border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
                                            >
                                                Berikutnya
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 5.5: HOTSPOT & VOUCHERS */}
                        {activeTab === 'hotspot' && (
                            <div className="space-y-6">
                                <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                                    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3 gap-3`}>
                                        <div className="flex items-center space-x-2">
                                            <Radio className="w-5 h-5 text-emerald-500" />
                                            <h2 className={`text-sm font-bold ${themeTextTitle}`}>Manajemen Hotspot & Voucher</h2>
                                        </div>
                                        <div className="flex items-center space-x-2 w-full sm:w-auto">
                                            <button
                                                onClick={() => setHotspotSubTab('vouchers')}
                                                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${hotspotSubTab === 'vouchers' ? 'bg-emerald-500 text-white shadow-xs' : `${isDarkMode ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800' : 'bg-zinc-100 text-zinc-650 hover:bg-zinc-200 border border-zinc-200'}`}`}
                                            >
                                                Voucher Hotspot
                                            </button>
                                            <button
                                                onClick={() => setHotspotSubTab('members')}
                                                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${hotspotSubTab === 'members' ? 'bg-emerald-500 text-white shadow-xs' : `${isDarkMode ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800' : 'bg-zinc-100 text-zinc-650 hover:bg-zinc-200 border border-zinc-200'}`}`}
                                            >
                                                Member Hotspot
                                            </button>
                                            <button
                                                onClick={() => setHotspotSubTab('sales')}
                                                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${hotspotSubTab === 'sales' ? 'bg-emerald-500 text-white shadow-xs' : `${isDarkMode ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800' : 'bg-zinc-100 text-zinc-650 hover:bg-zinc-200 border border-zinc-200'}`}`}
                                            >
                                                Laporan Penjualan
                                            </button>
                                        </div>
                                    </div>

                                    {hotspotSubTab === 'vouchers' ? (
                                        <div className="space-y-4">
                                            <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
                                                <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                                                    <select
                                                        value={voucherRouterFilter}
                                                        onChange={(e) => setVoucherRouterFilter(e.target.value)}
                                                        className={`p-1.5 border rounded-xl text-xs ${themeInput}`}
                                                    >
                                                        <option value="">Semua Router</option>
                                                        {routers.map(r => (
                                                            <option key={r.id} value={r.id}>{r.name}</option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={voucherStatusFilter}
                                                        onChange={(e) => setVoucherStatusFilter(e.target.value)}
                                                        className={`p-1.5 border rounded-xl text-xs ${themeInput}`}
                                                    >
                                                        <option value="">Semua Status</option>
                                                        <option value="unused">Belum Terpakai</option>
                                                        <option value="sold">Terjual</option>
                                                        <option value="expired">Kedaluwarsa</option>
                                                    </select>
                                                    <select
                                                        value={voucherCommentFilter}
                                                        onChange={(e) => setVoucherCommentFilter(e.target.value)}
                                                        className={`p-1.5 border rounded-xl text-xs max-w-[180px] ${themeInput}`}
                                                    >
                                                        <option value="">Semua Info Tambahan</option>
                                                        {availableVoucherComments.map(comment => (
                                                            <option key={comment} value={comment}>{comment}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                
                                                <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                                                    {/* Generate Voucher (Green) */}
                                                    <button
                                                        onClick={() => {
                                                            setShowGenerateVoucherModal(true);
                                                            setGenerateRouterId('');
                                                            setHotspotServers([]);
                                                            setGenerateComment('');
                                                            setGenerateServerDnsName('');
                                                        }}
                                                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>Generate Voucher</span>
                                                    </button>

                                                    {/* Cetak Massal (Blue) */}
                                                    <button
                                                        onClick={() => {
                                                            setShowPrintVouchersModal(true);
                                                            setPrintRouterId('');
                                                            setPrintComment('');
                                                            setPrintLoginUrl('http://10.0.0.1');
                                                        }}
                                                        className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                        <span>Cetak Massal</span>
                                                    </button>

                                                    {/* Sync Profil Hotspot (Yellow) */}
                                                    <select
                                                        id="sync-router-select"
                                                        defaultValue=""
                                                        onChange={(e) => {
                                                            if (e.target.value) {
                                                                handleSyncHotspot(e.target.value);
                                                                e.target.value = "";
                                                            }
                                                        }}
                                                        className={`p-1.5 border rounded-xl text-xs font-bold cursor-pointer ${
                                                            isDarkMode 
                                                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' 
                                                                : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                                                        }`}
                                                        disabled={isSyncingHotspot}
                                                    >
                                                        <option value="" disabled>{isSyncingHotspot ? 'Singkronisasi...' : 'Sync Profil Hotspot'}</option>
                                                        {routers.map(r => (
                                                            <option key={r.id} value={r.id}>{r.name}</option>
                                                        ))}
                                                    </select>

                                                    {/* Hapus Massal (Red) */}
                                                    <button
                                                        onClick={() => {
                                                            setShowBulkDeleteVouchersModal(true);
                                                            setBulkDeleteVouchersRouterId('');
                                                            setBulkDeleteVouchersComment('');
                                                        }}
                                                        className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-xs"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        <span>Hapus Massal</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
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
                                                                    <div className="flex justify-end gap-2">
                                                                        {v.status === 'unused' && (
                                                                            <button 
                                                                                onClick={() => {
                                                                                    setSelectedVoucherForSale(v);
                                                                                    setShowSellVoucherModal(true);
                                                                                }}
                                                                                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                                                                            >
                                                                                Jual
                                                                            </button>
                                                                        )}
                                                                        <button 
                                                                            onClick={() => handleDeleteVoucher(v.id)}
                                                                            className="p-1 text-zinc-400 hover:text-rose-500 cursor-pointer"
                                                                            title="Hapus Voucher"
                                                                        >
                                                                            <Trash2 className="w-4.5 h-4.5" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {totalVoucherPages > 1 && (
                                                <div className="flex justify-between items-center pt-4 border-t border-zinc-800/10 text-xs">
                                                    <span className={themeTextSub}>Halaman {voucherPage} dari {totalVoucherPages} ({filteredHotspotVouchers.length} voucher)</span>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => setVoucherPage(p => Math.max(1, p - 1))}
                                                            disabled={voucherPage === 1}
                                                            className={`px-3 py-1 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 disabled:opacity-30 hover:bg-zinc-100'}`}
                                                        >
                                                            Sebelumnya
                                                        </button>
                                                        <button 
                                                            onClick={() => setVoucherPage(p => Math.min(totalVoucherPages, p + 1))}
                                                            disabled={voucherPage === totalVoucherPages}
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
                                            {/* Stats Cards */}
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

                                            {/* Recharts Analytics */}
                                            {(() => {
                                                const groups = {};
                                                hotspotSales.forEach(sale => {
                                                    const dateStr = sale.created_at ? new Date(sale.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'N/A';
                                                    groups[dateStr] = (groups[dateStr] || 0) + parseFloat(sale.price || 0);
                                                });
                                                const array = Object.keys(groups).map(date => ({ date, revenue: groups[date] }));
                                                const finalChartData = array.length > 0 ? array.slice(-10) : [{ date: 'Tidak ada data', revenue: 0 }];

                                                return (
                                                    <div className={`border rounded-2xl p-5 ${themeInnerWidget} space-y-3`}>
                                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Grafik Tren Pendapatan Harian (10 Hari Terakhir)</h3>
                                                        <div className="h-64 w-full">
                                                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                                                <AreaChart data={finalChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                                    <defs>
                                                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                                                                        </linearGradient>
                                                                    </defs>
                                                                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#27272a' : '#e4e4e7'} />
                                                                    <XAxis dataKey="date" stroke={isDarkMode ? '#a1a1aa' : '#71717a'} fontSize={10} tickLine={false} />
                                                                    <YAxis stroke={isDarkMode ? '#a1a1aa' : '#71717a'} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => {
                                                                        if (v === 0) return formatRupiah(0);
                                                                        return formatRupiah(v);
                                                                    }} />
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

                                            {/* Transaction history list */}
                                            <div className="space-y-3">
                                                <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Riwayat Transaksi Penjualan</h3>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left border-collapse">
                                                        <thead>
                                                            <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${themeTextSub}`}>
                                                                <th className="py-3 px-2">Router</th>
                                                                <th className="py-3 px-2">Voucher / Username</th>
                                                                <th className="py-3 px-2">Paket</th>
                                                                <th className="py-3 px-2">Harga</th>
                                                                <th className="py-3 px-2">Metode Pembayaran</th>
                                                                <th className="py-3 px-2">Waktu Penjualan</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-zinc-800/20 text-xs">
                                                            {(() => {
                                                                const totalSalesPages = Math.ceil(hotspotSales.length / salesPageSize) || 1;
                                                                const paginatedSales = hotspotSales.slice(
                                                                    (salesPage - 1) * salesPageSize,
                                                                    salesPage * salesPageSize
                                                                );

                                                                if (paginatedSales.length === 0) {
                                                                    return (
                                                                        <tr>
                                                                            <td colSpan="6" className={`py-8 text-center font-medium ${themeTextDesc}`}>Belum ada data penjualan tercatat.</td>
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
                                                            <div className="flex justify-between items-center pt-4 border-t border-zinc-800/10 text-xs">
                                                                <span className={themeTextSub}>Halaman {salesPage} dari {totalSalesPages} ({hotspotSales.length} transaksi)</span>
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => setSalesPage(p => Math.max(1, p - 1))}
                                                                        disabled={salesPage === 1}
                                                                        className={`px-3 py-1 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 disabled:opacity-30 hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 disabled:opacity-30 hover:bg-zinc-100'}`}
                                                                    >
                                                                        Sebelumnya
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => setSalesPage(p => Math.min(totalSalesPages, p + 1))}
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
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                <p className={`text-[11px] ${themeTextSub}`}>
                                                    Kelola akun member hotspot (bukan voucher). Data ini terpisah dari pelanggan PPPoE.
                                                </p>
                                                <button
                                                    onClick={() => openCustomerModal('hotspot')}
                                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer shrink-0"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>Tambah Member Hotspot</span>
                                                </button>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left border-collapse">
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
                                                                <td className="py-3 px-2 text-right space-x-2">
                                                                    <button
                                                                        onClick={() => openCustomerModal('hotspot', cust)}
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

                                            {filteredHotspotMembers.length > customerPageSize && (
                                                <div className={`flex flex-col sm:flex-row items-center justify-between pt-4 border-t ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200'} gap-3 text-xs`}>
                                                    <span className={themeTextSub}>
                                                        Menampilkan <span className={`font-bold ${themeTextTitle}`}>{Math.min((hotspotMemberPage - 1) * customerPageSize + 1, filteredHotspotMembers.length)}</span> hingga <span className={`font-bold ${themeTextTitle}`}>{Math.min(hotspotMemberPage * customerPageSize, filteredHotspotMembers.length)}</span> dari <span className={`font-bold ${themeTextTitle}`}>{filteredHotspotMembers.length}</span> member
                                                    </span>
                                                    <div className="flex items-center space-x-1">
                                                        <button
                                                            disabled={hotspotMemberPage === 1}
                                                            onClick={() => setHotspotMemberPage((p) => Math.max(p - 1, 1))}
                                                            className={`px-3 py-1.5 border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
                                                        >
                                                            Sebelumnya
                                                        </button>
                                                        {Array.from({ length: totalHotspotMemberPages }, (_, idx) => idx + 1).map((page) => (
                                                            <button
                                                                key={page}
                                                                onClick={() => setHotspotMemberPage(page)}
                                                                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-150 cursor-pointer ${page === hotspotMemberPage
                                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                                    : (isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-950')
                                                                }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        ))}
                                                        <button
                                                            disabled={hotspotMemberPage === totalHotspotMemberPages}
                                                            onClick={() => setHotspotMemberPage((p) => Math.min(p + 1, totalHotspotMemberPages))}
                                                            className={`px-3 py-1.5 border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
                                                        >
                                                            Berikutnya
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB: PROFIL ADMINISTRATOR */}
                        {activeTab === 'profile' && (
                            <form
                                key={`profile-${auth.user.updated_at || auth.user.id}`}
                                onSubmit={handleSaveProfile}
                                encType="multipart/form-data"
                                className={`${themeCard} border rounded-2xl p-5 space-y-5 max-w-4xl`}
                            >
                                <div className={`flex items-center gap-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3`}>
                                    <User className="w-5 h-5 text-indigo-500" />
                                    <div>
                                        <h3 className={`text-sm font-bold ${themeTextTitle}`}>Profil Administrator</h3>
                                        <p className={`text-[10px] ${themeTextSub} mt-0.5`}>Kelola nama, email, jabatan, kata sandi, dan foto profil Anda.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
                                    <div className={`border rounded-xl p-4 space-y-3 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                                        <div className="flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4 text-indigo-500" />
                                            <span className={`font-bold ${themeTextTitle}`}>Avatar Profil</span>
                                        </div>
                                        <div className="flex justify-center">
                                            {auth.user.avatar_url ? (
                                                <img
                                                    src={auth.user.avatar_url}
                                                    alt={auth.user.name}
                                                    className="w-24 h-24 rounded-2xl object-cover"
                                                />
                                            ) : (
                                                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center font-bold text-2xl ${isDarkMode ? 'bg-zinc-900 text-zinc-300' : 'bg-white text-indigo-700 border border-zinc-200'}`}>
                                                    {auth.user.initials || '?'}
                                                </div>
                                            )}
                                        </div>
                                        <BrandingFileUpload
                                            key={`avatar-upload-${auth.user.updated_at || auth.user.id}`}
                                            name="avatar"
                                            accept="image/png,image/jpeg,image/webp"
                                            buttonLabel="Pilih & Upload Avatar"
                                            hint="Format: PNG, JPG, WEBP · Maks. 2MB · Tampil di sidebar admin."
                                            isDarkMode={isDarkMode}
                                        />
                                    </div>

                                    <div className="lg:col-span-2 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Nama Lengkap</label>
                                                <input name="name" type="text" defaultValue={auth.user.name || ''} required className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Email Login</label>
                                                <div className="relative">
                                                    <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                                                    <input name="email" type="email" defaultValue={auth.user.email || ''} required className={`pl-8 p-2 border rounded-lg w-full ${themeInput}`} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className={`font-bold ${themeLabel}`}>Jabatan / Label Role</label>
                                            <input
                                                name="profile_title"
                                                type="text"
                                                defaultValue={auth.user.profile_title || 'Super Admin'}
                                                placeholder="Super Admin"
                                                className={`p-2 border rounded-lg ${themeInput}`}
                                            />
                                            <span className={`text-[10px] ${themeTextDesc}`}>Teks kecil di bawah nama pada sidebar (mis. Super Admin, NOC Manager).</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Kata Sandi Baru</label>
                                                <input name="password" type="password" placeholder="Kosongkan jika tidak diubah" autoComplete="new-password" className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Konfirmasi Kata Sandi</label>
                                                <input name="password_confirmation" type="password" placeholder="Ulangi kata sandi baru" autoComplete="new-password" className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button type="submit" className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center space-x-2 cursor-pointer shadow-md">
                                        <Save className="w-4 h-4" />
                                        <span>Simpan Profil</span>
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* TAB: DATABASE */}
                        {activeTab === 'database' && (
                            <div className="max-w-3xl mx-auto space-y-4 pb-2">
                                {/* Header + info */}
                                <div className={`${themeCard} border rounded-2xl overflow-hidden`}>
                                    <div className={`h-0.5 ${isDarkMode ? 'bg-gradient-to-r from-emerald-500/80 via-indigo-400/60 to-emerald-500/80' : 'bg-gradient-to-r from-emerald-500 via-indigo-400 to-emerald-500'}`} />
                                    <div className="p-4 sm:p-5 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className={`p-2 rounded-xl shrink-0 ${isDarkMode ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'}`}>
                                                    <Database className="w-5 h-5 text-emerald-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h2 className={`text-sm font-bold tracking-tight ${themeTextTitle}`}>Manajemen Database</h2>
                                                    <p className={`text-[11px] leading-relaxed mt-0.5 ${themeTextSub}`}>
                                                        Cadangkan, pulihkan, atau kosongkan data operasional — aman untuk akun admin & pengaturan.
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleCreateBackup}
                                                disabled={isCreatingBackup}
                                                className="shrink-0 w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
                                            >
                                                {isCreatingBackup ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                                <span>{isCreatingBackup ? 'Memproses...' : 'Backup Baru'}</span>
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {[
                                                { label: databaseInfo.driver_label || databaseInfo.driver || '—', tone: 'neutral' },
                                                { label: databaseInfo.database || '—', tone: 'neutral' },
                                                {
                                                    label: databaseInfo.host
                                                        ? `${databaseInfo.host}${databaseInfo.port ? ':' + databaseInfo.port : ''}`
                                                        : 'Lokal',
                                                    tone: 'neutral',
                                                },
                                                {
                                                    label: databaseInfo.mysqldump_available ? 'mysqldump OK' : 'Export PHP',
                                                    tone: databaseInfo.mysqldump_available ? 'ok' : 'neutral',
                                                },
                                            ].map(({ label, tone }) => (
                                                <span
                                                    key={label}
                                                    className={`inline-flex max-w-full truncate px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                                                        tone === 'ok'
                                                            ? (isDarkMode ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-emerald-200 text-emerald-700 bg-emerald-50')
                                                            : (isDarkMode ? 'border-zinc-700/80 text-zinc-400 bg-zinc-900/50' : 'border-zinc-200 text-zinc-600 bg-zinc-50')
                                                    }`}
                                                    title={label}
                                                >
                                                    {label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Backup list */}
                                <div className={`${themeCard} border rounded-2xl p-4 sm:p-5`}>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            <HardDrive className="w-4 h-4 text-indigo-500" />
                                            <h3 className={`text-xs font-bold uppercase tracking-wide ${themeTextTitle}`}>
                                                File Backup
                                            </h3>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
                                            {databaseBackups.length} file
                                        </span>
                                    </div>

                                    {databaseBackups.length === 0 ? (
                                        <p className={`text-[11px] text-center py-6 rounded-xl border border-dashed ${themeInnerWidget} ${themeTextSub}`}>
                                            Belum ada backup. Simpan cadangan sebelum restore atau reset.
                                        </p>
                                    ) : (
                                        <div className={`rounded-xl border divide-y ${isDarkMode ? 'border-zinc-800 divide-zinc-800/80' : 'border-zinc-200 divide-zinc-100'}`}>
                                            {databaseBackups.map((backup) => (
                                                <div key={backup.filename} className="flex items-center gap-2 p-2.5 sm:p-3">
                                                    <div className="min-w-0 flex-1">
                                                        <p className={`text-xs font-semibold truncate ${themeTextTitle}`} title={backup.filename}>
                                                            {backup.filename}
                                                        </p>
                                                        <p className={`text-[10px] mt-0.5 ${themeTextSub}`}>
                                                            {backup.size_human} · {backup.created_at}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <a
                                                            href={`/admin/database/backups/${encodeURIComponent(backup.filename)}/download`}
                                                            className={`p-1.5 rounded-lg border transition-colors ${isDarkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'}`}
                                                            title="Unduh"
                                                        >
                                                            <Download className="w-3.5 h-3.5" />
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteBackup(backup.filename)}
                                                            className="p-1.5 rounded-lg border border-rose-500/25 text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <p className={`text-[10px] mt-2.5 ${themeTextDesc}`}>
                                        Disimpan di <code className="font-mono opacity-80">storage/app/backups/database</code>
                                    </p>
                                </div>

                                {/* Restore + Reset */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <form
                                        onSubmit={handleRestoreDatabase}
                                        className={`rounded-2xl overflow-hidden border shadow-md transition-colors ${
                                            isDarkMode
                                                ? 'border-indigo-500/10 bg-gradient-to-br from-slate-800 via-indigo-900/55 to-slate-900 shadow-black/15'
                                                : 'border-indigo-200/70 bg-gradient-to-br from-indigo-50/90 via-slate-50 to-sky-100/60 shadow-indigo-900/5'
                                        }`}
                                    >
                                        <div className="p-4 sm:p-5 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg border ${
                                                    isDarkMode
                                                        ? 'bg-white/8 border-white/12'
                                                        : 'bg-indigo-500/8 border-indigo-200/80'
                                                }`}>
                                                    <RotateCcw className={`w-4 h-4 ${isDarkMode ? 'text-indigo-200' : 'text-indigo-600'}`} />
                                                </div>
                                                <div>
                                                    <h3 className={`text-xs font-bold ${isDarkMode ? 'text-indigo-50' : 'text-indigo-900'}`}>Restore</h3>
                                                    <p className={`text-[10px] ${isDarkMode ? 'text-indigo-200/75' : 'text-indigo-700/70'}`}>Menimpa seluruh database. Backup dulu.</p>
                                                </div>
                                            </div>

                                            <div className={`inline-flex w-full rounded-lg border p-0.5 ${
                                                isDarkMode
                                                    ? 'border-white/10 bg-white/5'
                                                    : 'border-indigo-200/60 bg-white/50'
                                            }`}>
                                                {[
                                                    { id: 'existing', label: 'Dari server' },
                                                    { id: 'upload', label: 'Upload file' },
                                                ].map(({ id, label }) => (
                                                    <button
                                                        key={id}
                                                        type="button"
                                                        onClick={() => setRestoreSource(id)}
                                                        className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all duration-200 cursor-pointer ${
                                                            restoreSource === id
                                                                ? (isDarkMode
                                                                    ? 'bg-indigo-500/25 text-indigo-50 shadow-sm ring-1 ring-white/10'
                                                                    : 'bg-white text-indigo-800 shadow-sm ring-1 ring-indigo-100')
                                                                : (isDarkMode
                                                                    ? 'text-indigo-200/70 hover:text-indigo-100 hover:bg-white/5'
                                                                    : 'text-indigo-600/70 hover:text-indigo-800 hover:bg-indigo-50/80')
                                                        }`}
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>

                                            {restoreSource === 'existing' ? (
                                                <select
                                                    value={selectedRestoreFilename}
                                                    onChange={(e) => setSelectedRestoreFilename(e.target.value)}
                                                    className={`w-full p-2 border rounded-lg text-xs focus:outline-none focus:ring-2 ${
                                                        isDarkMode
                                                            ? 'border-white/12 bg-slate-900/40 text-indigo-50 focus:ring-indigo-400/25'
                                                            : 'border-indigo-200/80 bg-white/90 text-slate-800 focus:ring-indigo-300/40'
                                                    }`}
                                                >
                                                    <option value="">Pilih file backup...</option>
                                                    {databaseBackups.map((backup) => (
                                                        <option key={backup.filename} value={backup.filename}>
                                                            {backup.filename}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <label className={`flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg border border-dashed text-xs font-semibold cursor-pointer transition-colors duration-200 ${
                                                    isDarkMode
                                                        ? 'border-white/15 bg-white/5 text-indigo-100/90 hover:bg-white/8'
                                                        : 'border-indigo-300/50 bg-white/60 text-indigo-800/80 hover:bg-white/90'
                                                }`}>
                                                    <Upload className="w-3.5 h-3.5" />
                                                    <span className="truncate">{restoreUploadName || 'Pilih .sql / .sqlite'}</span>
                                                    <input
                                                        type="file"
                                                        name="backup_file"
                                                        accept=".sql,.sqlite"
                                                        className="sr-only"
                                                        onChange={(e) => setRestoreUploadName(e.target.files?.[0]?.name || '')}
                                                    />
                                                </label>
                                            )}

                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={restoreConfirmText}
                                                    onChange={(e) => setRestoreConfirmText(e.target.value)}
                                                    placeholder="Ketik RESTORE"
                                                    className={`flex-1 min-w-0 p-2 border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 ${
                                                        isDarkMode
                                                            ? 'border-white/12 bg-slate-900/40 text-indigo-50 placeholder:text-indigo-200/40 focus:ring-indigo-400/25'
                                                            : 'border-indigo-200/80 bg-white/90 text-slate-800 placeholder:text-slate-400 focus:ring-indigo-300/40'
                                                    }`}
                                                    autoComplete="off"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isRestoringDatabase || restoreConfirmText !== 'RESTORE'}
                                                    className={`shrink-0 px-3 py-2 disabled:opacity-45 rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all duration-200 shadow-sm ${
                                                        isDarkMode
                                                            ? 'bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-50 ring-1 ring-white/10'
                                                            : 'bg-indigo-600/85 hover:bg-indigo-600 text-white'
                                                    }`}
                                                >
                                                    {isRestoringDatabase ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                                    Pulihkan
                                                </button>
                                            </div>
                                        </div>
                                    </form>

                                    <form
                                        onSubmit={handleResetDatabase}
                                        className={`rounded-2xl overflow-hidden border shadow-md transition-colors ${
                                            isDarkMode
                                                ? 'border-rose-500/10 bg-gradient-to-br from-slate-800 via-rose-950/45 to-red-950/40 shadow-black/15'
                                                : 'border-rose-200/60 bg-gradient-to-br from-rose-50/90 via-red-50/70 to-rose-100/50 shadow-rose-900/5'
                                        }`}
                                    >
                                        <div className="p-4 sm:p-5 space-y-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg border ${
                                                    isDarkMode
                                                        ? 'bg-white/8 border-white/12'
                                                        : 'bg-rose-500/8 border-rose-200/80'
                                                }`}>
                                                    <ShieldOff className={`w-4 h-4 ${isDarkMode ? 'text-rose-200' : 'text-rose-600'}`} />
                                                </div>
                                                <div>
                                                    <h3 className={`text-xs font-bold ${isDarkMode ? 'text-rose-50' : 'text-rose-900'}`}>Reset Data</h3>
                                                    <p className={`text-[10px] ${isDarkMode ? 'text-rose-200/75' : 'text-rose-700/70'}`}>Kosongkan pelanggan, tagihan, router & voucher.</p>
                                                </div>
                                            </div>

                                            <p className={`text-[10px] leading-relaxed rounded-lg px-2.5 py-2 border ${
                                                isDarkMode
                                                    ? 'bg-black/12 border-white/8 text-rose-100/85'
                                                    : 'bg-white/45 border-rose-200/50 text-rose-800/75'
                                            }`}>
                                                <span className={`font-semibold ${isDarkMode ? 'text-rose-100' : 'text-rose-900'}`}>Aman:</span>{' '}
                                                admin, pengaturan & file backup.{' '}
                                                <span className={`font-semibold ${isDarkMode ? 'text-rose-100/90' : 'text-rose-900/90'}`}>Mikrotik tidak terpengaruh.</span>
                                            </p>

                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={resetConfirmText}
                                                    onChange={(e) => setResetConfirmText(e.target.value)}
                                                    placeholder="Ketik RESET"
                                                    className={`flex-1 min-w-0 p-2 border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 ${
                                                        isDarkMode
                                                            ? 'border-white/12 bg-slate-900/40 text-rose-50 placeholder:text-rose-200/40 focus:ring-rose-400/25'
                                                            : 'border-rose-200/80 bg-white/90 text-slate-800 placeholder:text-slate-400 focus:ring-rose-300/40'
                                                    }`}
                                                    autoComplete="off"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={isResettingDatabase || resetConfirmText !== 'RESET'}
                                                    className={`shrink-0 px-3 py-2 disabled:opacity-45 rounded-lg text-[10px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all duration-200 shadow-sm ${
                                                        isDarkMode
                                                            ? 'bg-rose-500/30 hover:bg-rose-500/40 text-rose-50 ring-1 ring-white/10'
                                                            : 'bg-rose-600/85 hover:bg-rose-600 text-white'
                                                    }`}
                                                >
                                                    {isResettingDatabase ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                    Reset
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {activeTab === 'update' && (
                            <div className="max-w-3xl mx-auto space-y-4 pb-2">
                                <div className={`${themeCard} border rounded-2xl overflow-hidden`}>
                                    <div className={`h-0.5 ${isDarkMode ? 'bg-gradient-to-r from-violet-500/70 via-indigo-400/50 to-violet-500/70' : 'bg-gradient-to-r from-violet-400 via-indigo-300 to-violet-400'}`} />
                                    <div className="p-4 sm:p-5 space-y-4">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className={`p-2 rounded-xl shrink-0 ${isDarkMode ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-violet-50 border border-violet-100'}`}>
                                                    <GitBranch className="w-5 h-5 text-violet-500" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h2 className={`text-sm font-bold tracking-tight ${themeTextTitle}`}>Pembaruan Aplikasi</h2>
                                                    <p className={`text-[11px] leading-relaxed mt-0.5 ${themeTextSub}`}>
                                                        Status dicek otomatis dari GitHub saat halaman dibuka.
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`self-start shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                                appUpdateInfo.update_available
                                                    ? (isDarkMode ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' : 'bg-amber-50 text-amber-700 border border-amber-200')
                                                    : (isDarkMode ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                                            }`}>
                                                {appUpdateInfo.update_available
                                                    ? (appUpdateInfo.behind_count > 0 ? `${appUpdateInfo.behind_count} commit baru` : 'Pembaruan tersedia')
                                                    : 'Sudah versi terbaru'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                                                <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Versi lokal</p>
                                                <p className={`text-base font-black font-mono mt-1 ${themeTextTitle}`}>{appUpdateInfo.local?.commit_short || '—'}</p>
                                                <p className={`text-[10px] mt-1 line-clamp-2 ${themeTextSub}`}>{appUpdateInfo.local?.commit_message || '—'}</p>
                                            </div>
                                            <div className={`rounded-xl border p-3 ${appUpdateInfo.update_available ? (isDarkMode ? 'border-violet-500/20 bg-violet-500/5' : 'border-violet-200 bg-violet-50/50') : (isDarkMode ? 'border-zinc-800 bg-zinc-900/30' : 'border-zinc-200 bg-zinc-50/80')}`}>
                                                <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Versi GitHub</p>
                                                <p className={`text-base font-black font-mono mt-1 ${themeTextTitle}`}>{appUpdateInfo.remote?.commit_short || '—'}</p>
                                                <p className={`text-[10px] mt-1 line-clamp-2 ${themeTextSub}`}>{appUpdateInfo.remote?.commit_message || '—'}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                                            <p className={`text-[10px] ${themeTextSub}`}>
                                                Backup database dulu via menu <span className="font-semibold">Database</span>.
                                                {appUpdateInfo.repository?.github_url && (
                                                    <>
                                                        {' · '}
                                                        <a href={appUpdateInfo.repository.github_url} target="_blank" rel="noopener noreferrer" className={`font-semibold hover:underline ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
                                                            GitHub
                                                        </a>
                                                    </>
                                                )}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={handleRunUpdate}
                                                disabled={isRunningUpdate || !canRunAppUpdate}
                                                className="w-full sm:w-auto px-5 py-2.5 disabled:opacity-45 disabled:cursor-not-allowed bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
                                            >
                                                {isRunningUpdate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
                                                <span>{isRunningUpdate ? 'Memperbarui...' : 'Update Sekarang'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {updateTerminalStatus !== 'idle' && (
                                    <div className="rounded-2xl overflow-hidden border border-zinc-800/80 shadow-2xl shadow-black/30">
                                        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800">
                                            <span className="w-2.5 h-2.5 rounded-full bg-red-500/90" />
                                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90" />
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/90" />
                                            <span className="ml-2 text-[10px] font-mono text-zinc-500 truncate">
                                                mwifi-update — bash
                                                {updateTerminalStatus === 'running' && (
                                                    <span className="ml-2 text-violet-400 animate-pulse">running</span>
                                                )}
                                                {updateTerminalStatus === 'success' && (
                                                    <span className="ml-2 text-emerald-400">done</span>
                                                )}
                                                {updateTerminalStatus === 'error' && (
                                                    <span className="ml-2 text-red-400">failed</span>
                                                )}
                                            </span>
                                        </div>
                                        <div
                                            ref={updateTerminalRef}
                                            className="bg-[#0b0f14] p-3 sm:p-4 max-h-72 overflow-y-auto font-mono text-[11px] leading-relaxed scroll-smooth"
                                        >
                                            {updateTerminalLines.map((entry, index) => (
                                                <div
                                                    key={`${index}-${entry.text.slice(0, 24)}`}
                                                    className={`whitespace-pre-wrap break-all ${
                                                        entry.type === 'cmd'
                                                            ? 'text-emerald-400'
                                                            : entry.type === 'info'
                                                                ? 'text-sky-400/90'
                                                                : entry.type === 'stderr'
                                                                    ? 'text-amber-300/85'
                                                                    : entry.type === 'success'
                                                                        ? 'text-emerald-300 font-semibold'
                                                                        : entry.type === 'error'
                                                                            ? 'text-red-400 font-semibold'
                                                                            : 'text-zinc-300/90'
                                                    }`}
                                                >
                                                    {entry.text}
                                                </div>
                                            ))}
                                            {updateTerminalStatus === 'running' && (
                                                <div className="flex items-center gap-1 mt-1 text-emerald-400">
                                                    <span className="text-zinc-500">$</span>
                                                    <span className="inline-block w-2 h-3.5 bg-emerald-400/90 animate-pulse" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 6: SETTINGS FORM */}
                        {activeTab === 'settings' && (
                            <form key={`settings-${branding.version}`} onSubmit={handleSaveSettings} encType="multipart/form-data" className="space-y-6">

                                {/* Branding & Company Identity */}
                                <div className={`${themeCard} border rounded-2xl p-5 space-y-5`}>
                                    <div className={`flex items-center gap-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3`}>
                                        <Building2 className="w-5 h-5 text-emerald-500" />
                                        <div>
                                            <h3 className={`text-sm font-bold ${themeTextTitle}`}>Identitas & Branding Aplikasi</h3>
                                            <p className={`text-[10px] ${themeTextSub} mt-0.5`}>Nama aplikasi, logo perusahaan, favicon browser, dan informasi kontak resmi.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        <div className="lg:col-span-2 space-y-3 text-xs">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <label className={`font-bold ${themeLabel}`}>Nama Aplikasi</label>
                                                    <input name="system[app_name]" type="text" defaultValue={branding.app_name || settingsMap['system.app_name'] || ''} placeholder="Nama aplikasi" className={`p-2 border rounded-lg ${themeInput}`} />
                                                    <span className={`text-[10px] ${themeTextDesc}`}>Dipakai di tab browser & judul halaman.</span>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className={`font-bold ${themeLabel}`}>Nama Perusahaan / ISP</label>
                                                    <input name="system[company_name]" type="text" defaultValue={branding.company_name || settingsMap['system.company_name'] || ''} placeholder="RT RW NET Anda" className={`p-2 border rounded-lg ${themeInput}`} />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Tagline / Subjudul</label>
                                                <input name="system[company_tagline]" type="text" defaultValue={branding.company_tagline || settingsMap['system.company_tagline'] || ''} placeholder="Network Operations Console" className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="flex flex-col gap-1">
                                                    <label className={`font-bold ${themeLabel}`}>Email Resmi</label>
                                                    <div className="relative">
                                                        <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                                                        <input name="system[company_email]" type="email" defaultValue={branding.company_email || settingsMap['system.company_email'] || ''} className={`pl-8 p-2 border rounded-lg w-full ${themeInput}`} />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    <label className={`font-bold ${themeLabel}`}>Telepon / WhatsApp</label>
                                                    <div className="relative">
                                                        <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                                                        <input name="system[company_phone]" type="text" defaultValue={branding.company_phone || settingsMap['system.company_phone'] || ''} placeholder="62812..." className={`pl-8 p-2 border rounded-lg w-full ${themeInput}`} />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Alamat Kantor</label>
                                                <div className="relative">
                                                    <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                                                    <textarea name="system[company_address]" rows={2} defaultValue={branding.company_address || settingsMap['system.company_address'] || ''} className={`pl-8 p-2 border rounded-lg w-full ${themeInput}`} />
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Website</label>
                                                <div className="relative">
                                                    <Globe className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                                                    <input name="system[company_website]" type="url" defaultValue={branding.company_website || settingsMap['system.company_website'] || ''} placeholder="https://..." className={`pl-8 p-2 border rounded-lg w-full ${themeInput}`} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 text-xs">
                                            <div className={`border rounded-xl p-4 space-y-3 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                                                <div className="flex items-center gap-2">
                                                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                                                    <span className={`font-bold ${themeTextTitle}`}>Logo Perusahaan</span>
                                                </div>
                                                <div className={`h-24 rounded-lg flex items-center justify-center overflow-hidden ${isDarkMode ? 'bg-zinc-900/40' : 'bg-zinc-50/80'}`}>
                                                    {branding.logo_url ? (
                                                        <img src={branding.logo_url} alt="Logo" className="max-h-20 max-w-full object-contain p-2" />
                                                    ) : (
                                                        <span className={`text-[10px] ${themeTextDesc}`}>Belum ada logo</span>
                                                    )}
                                                </div>
                                                <BrandingFileUpload
                                                    key={`logo-upload-${branding.version}`}
                                                    name="system[logo]"
                                                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                                    buttonLabel="Pilih & Upload Logo"
                                                    hint="Format: PNG, JPG, WEBP, SVG · Maks. 2MB · Tampil di sidebar admin & portal pelanggan."
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>

                                            <div className={`border rounded-xl p-4 space-y-3 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                                                <div className="flex items-center gap-2">
                                                    <Globe className="w-4 h-4 text-indigo-500" />
                                                    <span className={`font-bold ${themeTextTitle}`}>Favicon Browser</span>
                                                </div>
                                                <div className={`h-16 rounded-lg border flex items-center justify-center gap-3 ${isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}`}>
                                                    {branding.favicon_url ? (
                                                        <img src={branding.favicon_url} alt="Favicon" className="w-8 h-8 object-contain" />
                                                    ) : (
                                                        <span className={`text-[10px] ${themeTextDesc}`}>Belum ada favicon</span>
                                                    )}
                                                </div>
                                                <BrandingFileUpload
                                                    key={`favicon-upload-${branding.version}`}
                                                    name="system[favicon]"
                                                    accept="image/png,image/jpeg,image/webp,image/x-icon,.ico"
                                                    buttonLabel="Pilih & Upload Favicon"
                                                    hint="Format: ICO, PNG, WEBP · Maks. 512KB · Ikon kecil di tab browser."
                                                    isDarkMode={isDarkMode}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Copyright & SEO Meta */}
                                <div className={`${themeCard} border rounded-2xl p-5 space-y-5`}>
                                    <div className={`flex items-center gap-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3`}>
                                        <Copyright className="w-5 h-5 text-indigo-500" />
                                        <div>
                                            <h3 className={`text-sm font-bold ${themeTextTitle}`}>Footer Copyright & Meta SEO</h3>
                                            <p className={`text-[10px] ${themeTextSub} mt-0.5`}>Teks copyright di footer halaman dan meta tag untuk mesin pencari / media sosial.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                                        <div className="space-y-3">
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Teks Copyright Footer</label>
                                                <textarea
                                                    name="system[footer_copyright]"
                                                    rows={3}
                                                    defaultValue={settingsMap['system.footer_copyright'] || '© {year} {company}. All rights reserved.'}
                                                    placeholder="© {year} {company}. All rights reserved."
                                                    className={`p-2 border rounded-lg ${themeInput}`}
                                                />
                                                <span className={`text-[10px] ${themeTextDesc}`}>
                                                    Placeholder: <code className="opacity-80">{'{year}'}</code>, <code className="opacity-80">{'{company}'}</code>, <code className="opacity-80">{'{app}'}</code>
                                                </span>
                                            </div>
                                            {branding.footer_copyright && (
                                                <div className={`rounded-lg border px-3 py-2 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50'}`}>
                                                    <p className={`text-[10px] font-bold ${themeTextSub} mb-1`}>Pratinjau footer:</p>
                                                    <p className={`text-[11px] ${themeTextTitle}`}>{branding.footer_copyright}</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <FileText className="w-4 h-4 text-emerald-500" />
                                                <span className={`font-bold ${themeTextTitle}`}>Meta SEO</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Judul Situs (Meta Title)</label>
                                                <input
                                                    name="system[seo_title]"
                                                    type="text"
                                                    defaultValue={settingsMap['system.seo_title'] || ''}
                                                    placeholder={branding.app_name || 'Nama aplikasi'}
                                                    className={`p-2 border rounded-lg ${themeInput}`}
                                                />
                                                <span className={`text-[10px] ${themeTextDesc}`}>Kosongkan untuk memakai Nama Aplikasi. Dipakai di tab browser & Open Graph.</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Meta Description</label>
                                                <textarea
                                                    name="system[seo_description]"
                                                    rows={2}
                                                    maxLength={320}
                                                    defaultValue={settingsMap['system.seo_description'] || ''}
                                                    placeholder="Deskripsi singkat layanan ISP Anda untuk Google..."
                                                    className={`p-2 border rounded-lg ${themeInput}`}
                                                />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Meta Keywords</label>
                                                <input
                                                    name="system[seo_keywords]"
                                                    type="text"
                                                    defaultValue={settingsMap['system.seo_keywords'] || ''}
                                                    placeholder="wifi, hotspot, billing, isp, rt rw net"
                                                    className={`p-2 border rounded-lg ${themeInput}`}
                                                />
                                                <span className={`text-[10px] ${themeTextDesc}`}>Pisahkan dengan koma.</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Robots Meta</label>
                                                <select
                                                    name="system[seo_robots]"
                                                    defaultValue={settingsMap['system.seo_robots'] || 'index,follow'}
                                                    className={`p-2 border rounded-lg ${themeInput}`}
                                                >
                                                    <option value="index,follow">index, follow (tampil di Google)</option>
                                                    <option value="noindex,nofollow">noindex, nofollow (sembunyikan)</option>
                                                    <option value="index,nofollow">index, nofollow</option>
                                                    <option value="noindex,follow">noindex, follow</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Billing: PPN & Isolir PPP */}
                                <div className={`${themeCard} border rounded-2xl p-5 space-y-5`}>
                                    <div className={`flex items-center gap-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3`}>
                                        <Receipt className="w-5 h-5 text-amber-500" />
                                        <div>
                                            <h3 className={`text-sm font-bold ${themeTextTitle}`}>Tagihan & Isolir Otomatis</h3>
                                            <p className={`text-[10px] ${themeTextSub} mt-0.5`}>PPN pada invoice baru, prorata 30 hari, generate tagihan H-N sebelum jatuh tempo, profile PPP isolir saat jatuh tempo, dan pemulihan otomatis setelah pelanggan bayar.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                                        <div className={`border rounded-xl p-4 space-y-4 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                                            <div className="flex items-center gap-2">
                                                <Receipt className="w-4 h-4 text-amber-500" />
                                                <span className={`font-bold ${themeTextTitle}`}>PPN (Pajak)</span>
                                            </div>
                                            <label className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-white'}`}>
                                                <div>
                                                    <span className={`font-bold block ${themeTextTitle}`}>Aktifkan PPN pada tagihan</span>
                                                    <span className={`text-[10px] ${themeTextDesc}`}>Berlaku untuk invoice yang digenerate setelah disimpan.</span>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    name="system_tax_enabled_ui"
                                                    defaultChecked={taxEnabledDefault}
                                                    className={`rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer shrink-0 ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                                                />
                                            </label>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Tarif PPN (%)</label>
                                                <input
                                                    name="system[tax_rate_percent]"
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    defaultValue={taxRatePercentDefault}
                                                    placeholder="11"
                                                    className={`p-2 border rounded-lg ${themeInput}`}
                                                />
                                                <span className={`text-[10px] ${themeTextDesc}`}>Contoh: 11 untuk PPN 11%. Nonaktifkan toggle di atas jika tagihan tanpa PPN.</span>
                                            </div>
                                            <label className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-white'}`}>
                                                <div>
                                                    <span className={`font-bold block ${themeTextTitle}`}>Aktifkan tagihan prorata 30 hari</span>
                                                    <span className={`text-[10px] ${themeTextDesc}`}>Pelanggan baru di tengah bulan ditagih proporsional: (harga paket ÷ 30) × hari aktif s/d tgl jatuh tempo.</span>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    name="system_billing_prorata_ui"
                                                    defaultChecked={prorataEnabledDefault}
                                                    className={`rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer shrink-0 ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                                                />
                                            </label>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Generate tagihan (hari sebelum jatuh tempo)</label>
                                                <input
                                                    name="system[billing_generate_days_before]"
                                                    type="number"
                                                    min="1"
                                                    max="30"
                                                    step="1"
                                                    defaultValue={billingGenerateDaysBeforeDefault}
                                                    placeholder="5"
                                                    className={`p-2 border rounded-lg ${themeInput}`}
                                                />
                                                <span className={`text-[10px] ${themeTextDesc}`}>Scheduler harian membuat invoice per pelanggan saat H-N (default 5 = lima hari sebelum tanggal jatuh tempo di profil pelanggan).</span>
                                            </div>
                                            <label className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-white'}`}>
                                                <div>
                                                    <span className={`font-bold block ${themeTextTitle}`}>Notifikasi WhatsApp ke admin</span>
                                                    <span className={`text-[10px] ${themeTextDesc}`}>Kirim ringkasan invoice otomatis ke nomor admin setelah scheduler selesai.</span>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    name="system_billing_notify_admin_ui"
                                                    defaultChecked={billingNotifyAdminDefault}
                                                    className={`rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer shrink-0 ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                                                />
                                            </label>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Nomor WhatsApp Admin (opsional)</label>
                                                <input
                                                    name="system[billing_admin_phone]"
                                                    type="text"
                                                    defaultValue={billingAdminPhoneDefault}
                                                    placeholder={settingsMap['system.company_phone'] || '62812...'}
                                                    className={`p-2 border rounded-lg ${themeInput}`}
                                                />
                                                <span className={`text-[10px] ${themeTextDesc}`}>Kosongkan untuk memakai telepon perusahaan dari tab Branding.</span>
                                            </div>
                                        </div>

                                        <div className={`border rounded-xl p-4 space-y-4 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                                            <div className="flex items-center gap-2">
                                                <ShieldOff className="w-4 h-4 text-rose-500" />
                                                <span className={`font-bold ${themeTextTitle}`}>Profile PPP Isolir</span>
                                            </div>
                                            <input type="hidden" name="mikrotik[isolir_source_router_id]" value={isolirRouterId} />
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Router MikroTik</label>
                                                <div className="flex gap-2">
                                                    <select
                                                        value={isolirRouterId}
                                                        onChange={(e) => {
                                                            const routerId = e.target.value;
                                                            setIsolirRouterId(routerId);
                                                            fetchIsolirPppProfiles(routerId);
                                                        }}
                                                        className={`flex-1 p-2 border rounded-lg ${themeInput}`}
                                                        disabled={routers.length === 0}
                                                    >
                                                        <option value="" disabled>
                                                            {routers.length === 0 ? 'Belum ada router terdaftar' : 'Pilih router'}
                                                        </option>
                                                        {routers.map((r) => (
                                                            <option key={r.id} value={r.id}>
                                                                {r.name}{r.status ? '' : ' (offline)'}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchIsolirPppProfiles(isolirRouterId)}
                                                        disabled={!isolirRouterId || isLoadingIsolirProfiles}
                                                        title="Muat ulang profile dari RouterOS"
                                                        className={`px-3 py-2 border rounded-lg shrink-0 transition-colors disabled:opacity-50 ${isDarkMode ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-200 hover:bg-zinc-100 text-zinc-600'}`}
                                                    >
                                                        <RefreshCw className={`w-4 h-4 ${isLoadingIsolirProfiles ? 'animate-spin' : ''}`} />
                                                    </button>
                                                </div>
                                                <span className={`text-[10px] ${themeTextDesc}`}>Profile diambil langsung dari `/ppp/profile` RouterOS router yang dipilih.</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Profile PPP Isolir</label>
                                                <select
                                                    name="mikrotik[isolir_profile]"
                                                    value={selectedIsolirProfile || savedIsolirProfile}
                                                    onChange={(e) => setSelectedIsolirProfile(e.target.value)}
                                                    className={`p-2 border rounded-lg font-mono ${themeInput}`}
                                                    disabled={!isolirRouterId || isLoadingIsolirProfiles}
                                                    required
                                                >
                                                    <option value="" disabled>
                                                        {!isolirRouterId
                                                            ? 'Pilih router terlebih dahulu'
                                                            : (isLoadingIsolirProfiles ? 'Mengambil profile...' : (isolirProfileOptions.length === 0 ? 'Profile tidak ditemukan' : 'Pilih profile isolir'))}
                                                    </option>
                                                    {isolirProfileOptions.map((profileName) => (
                                                        <option key={profileName} value={profileName}>{profileName}</option>
                                                    ))}
                                                </select>
                                                <span className={`text-[10px] ${themeTextDesc}`}>Profile ini dipasang otomatis ke secret PPP pelanggan yang melewati jatuh tempo (cek isolir setiap jam).</span>
                                            </div>
                                            <div className={`rounded-lg border px-3 py-2 space-y-1 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-white'}`}>
                                                <p className={`text-[10px] font-bold ${themeTextSub}`}>Alur otomatis:</p>
                                                <ul className={`text-[10px] ${themeTextDesc} space-y-1 list-disc list-inside`}>
                                                    <li>Tagihan unpaid + lewat jatuh tempo → status isolir + profile PPP di atas</li>
                                                    <li>Pelanggan bayar (manual / Tripay / Midtrans) → profile kembali ke paket asli</li>
                                                    <li>Hanya pelanggan PPPoE; router harus online agar sync ke MikroTik jalan</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* WhatsApp & GenieACS Config */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Konfigurasi WhatsApp Gateway</h3>
                                        <div className="space-y-3 text-xs">
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Gateway URL</label>
                                                <input name="whatsapp[api_url]" type="text" defaultValue={settingsMap['whatsapp.api_url'] || ''} className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Session ID</label>
                                                <input name="whatsapp[session_id]" type="text" defaultValue={settingsMap['whatsapp.session_id'] || ''} className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>API Key / Token (Opsional)</label>
                                                <input name="whatsapp[api_key]" type="password" placeholder="Tetap kosong jika tidak diubah" className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Konfigurasi TR-069 GenieACS</h3>
                                        <div className="space-y-3 text-xs">
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>NBI API URL</label>
                                                <input name="genieacs[api_url]" type="text" defaultValue={settingsMap['genieacs.api_url'] || ''} className={`p-2 border rounded-lg ${themeInput}`} />
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
                                                <input name="payment[tripay][api_key]" type="password" placeholder="Tetap kosong jika tidak diubah" className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Merchant Code</label>
                                                <input name="payment[tripay][merchant_code]" type="text" defaultValue={settingsMap['payment.tripay.merchant_code'] || ''} className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Private Key</label>
                                                <input name="payment[tripay][private_key]" type="password" placeholder="Tetap kosong jika tidak diubah" className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Midtrans */}
                                    <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                                        <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Midtrans Gateway</h3>
                                        <div className="space-y-3 text-xs">
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Server Key</label>
                                                <input name="payment[midtrans][server_key]" type="password" placeholder="Tetap kosong jika tidak diubah" className={`p-2 border rounded-lg ${themeInput}`} />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className={`font-bold ${themeLabel}`}>Client Key</label>
                                                <input name="payment[midtrans][client_key]" type="text" defaultValue={settingsMap['payment.midtrans.client_key'] || ''} className={`p-2 border rounded-lg ${themeInput}`} />
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
                        
                        {/* TAB 8: PETA JARINGAN */}
                        {activeTab === 'network-map' && (
                            <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                                <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3 gap-3`}>
                                    <div className="flex items-center space-x-2">
                                        <Map className="w-5 h-5 text-emerald-500" />
                                        <h2 className={`text-sm font-bold ${themeTextTitle}`}>Peta Jaringan Pelanggan & ODP</h2>
                                    </div>
                                    <span className="text-[10px] text-zinc-500 font-bold">Teknologi Optical Distribution Point (ODP)</span>
                                </div>
                                
                                <div className="flex flex-col lg:flex-row gap-5">
                                    {/* PANEL KIRI: DAFTAR ODP */}
                                    <div className="w-full lg:w-80 xl:w-96 flex flex-col space-y-3 flex-shrink-0">
                                        <div className="flex justify-between items-center">
                                            <h3 className={`text-xs font-bold ${themeTextTitle}`}>Daftar ODP ({filteredOdps.length})</h3>
                                            <button 
                                                onClick={() => { setEditingOdp(null); setShowOdpModal(true); }}
                                                className="px-2.5 py-1.5 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                            >
                                                <Plus className="w-3 h-3" />
                                                Tambah ODP
                                            </button>
                                        </div>
                                        
                                        {/* Search ODP */}
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                placeholder="Cari ODP..." 
                                                value={odpSearchTerm} 
                                                onChange={(e) => setOdpSearchTerm(e.target.value)} 
                                                className={`w-full p-2 pl-8 border rounded-lg text-xs ${themeInput}`}
                                            />
                                            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-3" />
                                        </div>
                                        
                                        {/* List ODP scrollable */}
                                        <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
                                            {filteredOdps.length === 0 ? (
                                                <div className={`text-center py-8 text-xs ${themeTextSub} ${themeInnerWidget} rounded-xl border border-dashed`}>
                                                    Tidak ada ODP ditemukan
                                                </div>
                                            ) : (
                                                filteredOdps.map(odp => {
                                                    const connectedCount = customers.filter(c => c.odp_id === odp.id).length;
                                                    const isFull = connectedCount >= odp.total_ports;
                                                    return (
                                                        <div 
                                                            key={odp.id}
                                                            onClick={() => handleOdpRowClick(odp)}
                                                            className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer flex justify-between items-start gap-2 ${
                                                                isDarkMode 
                                                                    ? 'bg-zinc-950/40 border-zinc-900 hover:bg-zinc-900/60 hover:border-zinc-800' 
                                                                    : 'bg-zinc-50/50 border-zinc-150 hover:bg-zinc-100/60 hover:border-zinc-200'
                                                            }`}
                                                        >
                                                            <div className="space-y-1 min-w-0 flex-1">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className={`w-2 h-2 rounded-full ${isFull ? 'bg-rose-500' : 'bg-blue-500'}`}></div>
                                                                    <span className={`text-xs font-bold truncate ${themeTextTitle}`}>{odp.name}</span>
                                                                </div>
                                                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold truncate">
                                                                    {odp.description || 'Tidak ada deskripsi lokasi'}
                                                                </p>
                                                                <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-500 dark:text-zinc-450 mt-1">
                                                                    <span className={`px-1.5 py-0.5 rounded-md ${
                                                                        isFull 
                                                                            ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400' 
                                                                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                                    }`}>
                                                                        Port: {connectedCount} / {odp.total_ports}
                                                                    </span>
                                                                    <span className="font-mono text-[9px]">{parseFloat(odp.latitude).toFixed(5)}, {parseFloat(odp.longitude).toFixed(5)}</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                                <button 
                                                                    onClick={() => { setEditingOdp(odp); setShowOdpModal(true); }}
                                                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                                                        isDarkMode 
                                                                            ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' 
                                                                            : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'
                                                                    }`}
                                                                    title="Edit ODP"
                                                                >
                                                                    <Edit className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteOdp(odp)}
                                                                    className={`p-1.5 rounded-lg border border-transparent transition-colors text-rose-500 hover:bg-rose-500/10 hover:border-rose-500/20 cursor-pointer`}
                                                                    title="Hapus ODP"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* PANEL KANAN: PETA LEAFLET */}
                                    <div className="flex-1 flex flex-col space-y-2">
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Peta di bawah menggambarkan jalur kabel fiber optik dari masing-masing kotak ODP (biru) ke titik rumah pelanggan (hijau: aktif, merah: nonaktif).</p>
                                        <div className={`border rounded-2xl overflow-hidden shadow-xs relative ${isDarkMode ? 'border-zinc-800/80' : 'border-zinc-200'}`}>
                                            <div id="map-container" className="h-[550px] w-full z-0"></div>
                                            <div className="absolute bottom-2.5 right-2.5 z-[400] bg-zinc-950/85 border border-zinc-800/60 backdrop-blur-xs px-2.5 py-1.5 rounded-lg flex gap-3 text-[9px] font-bold text-zinc-400 shadow-md">
                                                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> ODP</div>
                                                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Aktif</div>
                                                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Nonaktif</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                    </div>

                    <AppFooter
                        branding={branding}
                        className={`noc-main-footer relative z-10 shrink-0 px-4 sm:px-6 py-2 border-t text-center ${themeFooterBar}`}
                        textClassName={`text-[10px] ${themeTextDesc}`}
                    />
                </div>

                {/* MODALS SECTION */}
                
                {/* ODP Modal */}
                <TransitionModal show={showOdpModal} themeCard={themeCard} maxWidth="md">
                    <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                        <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                            {editingOdp ? 'Edit Kotak ODP' : 'Tambah Kotak ODP'}
                        </h3>
                        <button onClick={() => { setShowOdpModal(false); setEditingOdp(null); }} className="text-zinc-500 hover:text-white transition-colors cursor-pointer"><X className="w-4 h-4" /></button>
                    </div>
                    <form onSubmit={handleSaveOdpSubmit} className="space-y-3 text-xs">
                        <input type="hidden" name="id" value={editingOdp ? editingOdp.id : ''} />
                        
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Nama ODP</label>
                            <input required name="name" type="text" placeholder="Contoh: ODP-JBG-01" defaultValue={editingOdp ? editingOdp.name : ''} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        
                        <GpsCoordinateFields
                            latitude={odpLat}
                            longitude={odpLng}
                            onLatitudeChange={setOdpLat}
                            onLongitudeChange={setOdpLng}
                            themeInput={themeInput}
                            themeLabel={themeLabel}
                            isDarkMode={isDarkMode}
                            required
                            inputType="number"
                            onError={(message) => showToast(message, 'error')}
                            onSuccess={() => showToast('Koordinat GPS berhasil diambil.', 'success')}
                        />

                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Jumlah Port Total</label>
                            <input required name="total_ports" type="number" min="1" placeholder="8" defaultValue={editingOdp ? editingOdp.total_ports : 8} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Deskripsi Lokasi / Keterangan</label>
                            <textarea name="description" placeholder="Dekat tiang listrik depan toko A..." defaultValue={editingOdp ? editingOdp.description : ''} className={`p-2 border rounded-lg h-20 resize-none ${themeInput}`} />
                        </div>

                        <div className={`p-2.5 ${themeInnerWidget} rounded-xl text-[10px] ${themeTextSub} leading-normal`}>
                            💡 <strong className={themeTextTitle}>Tips:</strong> Klik peta jaringan, gunakan tombol GPS perangkat, atau isi koordinat manual.
                        </div>
                        
                        <div className="flex justify-end pt-3 gap-2">
                            <button type="button" onClick={() => { setShowOdpModal(false); setEditingOdp(null); }} className={`px-4 py-2 border rounded-lg cursor-pointer transition-colors ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}>Batal</button>
                            <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold">Simpan</button>
                        </div>
                    </form>
                </TransitionModal>

                {/* Router Modal */}
                <TransitionModal show={showRouterModal} themeCard={themeCard} maxWidth="md">
                    <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
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
                        <div className={`p-2.5 ${themeInnerWidget} rounded-xl text-[10px] ${themeTextSub} leading-normal space-y-1`}>
                            <div>💡 <strong className={themeTextTitle}>REST API (v7):</strong> Menggunakan port layanan web Mikrotik (<strong className={themeTextTitle}>WWW</strong>, default <strong className={themeTextTitle}>80</strong> atau <strong className={themeTextTitle}>443</strong>).</div>
                            <div>💡 <strong className={themeTextTitle}>Socket API (v6):</strong> Menggunakan port layanan API binary Mikrotik (<strong className={themeTextTitle}>api</strong>, default <strong className={themeTextTitle}>8728</strong> atau <strong className={themeTextTitle}>8729 SSL</strong>).</div>
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
                            <button type="button" onClick={() => setShowRouterModal(false)} className={`px-4 py-2 border rounded-lg cursor-pointer transition-colors ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}>Batal</button>
                            <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold">Simpan</button>
                        </div>
                    </form>
                </TransitionModal>

                {/* Customer Modal */}
                <TransitionModal show={showCustomerModal} themeCard={themeCard} maxWidth="lg" className="overflow-y-auto max-h-[90vh]">
                    <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                        <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                            {editingCustomer
                                ? (isHotspotCustomerModal ? 'Edit Member Hotspot' : 'Edit Pelanggan PPPoE')
                                : (isHotspotCustomerModal ? 'Tambah Member Hotspot' : 'Tambah Pelanggan PPPoE')}
                        </h3>
                        <button onClick={() => setShowCustomerModal(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
                        <input type="hidden" name="id" value={editingCustomer ? editingCustomer.id : ''} />
                        <input type="hidden" name="service_type" value={customerModalServiceType} />
                        {isHotspotCustomerModal && (
                            <>
                                <input type="hidden" name="billing_date" value={editingCustomer?.billing_date || 1} />
                                <input type="hidden" name="odp_id" value="" />
                            </>
                        )}

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

                        {!isHotspotCustomerModal && (
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
                        )}

                        <div className={`grid gap-3 ${isHotspotCustomerModal ? 'grid-cols-2' : 'grid-cols-3'}`}>
                            <div className="flex flex-col gap-1">
                                <label className={`font-bold ${themeLabel}`}>Router</label>
                                <select name="router_id" defaultValue={editingCustomer ? editingCustomer.router_id : (routers[0]?.id || '')} className={`p-2 border rounded-lg ${themeInput}`}>
                                    {routers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className={`font-bold ${themeLabel}`}>{isHotspotCustomerModal ? 'Paket Hotspot' : 'Paket Internet'}</label>
                                <select
                                    name="package_id"
                                    required
                                    defaultValue={editingCustomer?.package_id || modalPackages[0]?.id || ''}
                                    className={`p-2 border rounded-lg ${themeInput}`}
                                >
                                    {modalPackages.length === 0 ? (
                                        <option value="" disabled>Paket belum tersedia</option>
                                    ) : modalPackages.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            {!isHotspotCustomerModal && (
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>Titik ODP</label>
                                    <select name="odp_id" defaultValue={editingCustomer ? (editingCustomer.odp_id || '') : ''} className={`p-2 border rounded-lg ${themeInput}`}>
                                        <option value="">Tanpa ODP / Belum Terhubung</option>
                                        {odps.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className={`grid gap-3 ${isHotspotCustomerModal ? 'grid-cols-1' : 'grid-cols-3'}`}>
                            <div className="flex flex-col gap-1">
                                <label className={`font-bold ${themeLabel}`}>Status Akun</label>
                                <select name="status" defaultValue={editingCustomer ? editingCustomer.status : 'active'} className={`p-2 border rounded-lg ${themeInput}`}>
                                    <option value="active">Active</option>
                                    <option value="isolated">Isolated (Isolir)</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                            {!isHotspotCustomerModal && (
                                <>
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
                                </>
                            )}
                        </div>

                        <div className="flex justify-end pt-3 gap-2">
                            <button type="button" onClick={() => setShowCustomerModal(false)} className={`px-4 py-2 border rounded-lg cursor-pointer transition-colors ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}>Batal</button>
                            <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold">Simpan</button>
                        </div>
                    </form>
                </TransitionModal>

                {/* Delete Customer Confirmation Modal */}
                <TransitionModal show={showDeleteCustomerModal} themeCard={themeCard} maxWidth="md">
                    <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                        <h3 className={`text-sm font-bold text-rose-500`}>
                            Hapus Pelanggan
                        </h3>
                        <button onClick={() => {
                            setShowDeleteCustomerModal(false);
                            setTimeout(() => setCustomerToDelete(null), 300);
                        }} className={`text-zinc-500 ${isDarkMode ? 'hover:text-white' : 'hover:text-zinc-800'}`}><X className="w-4 h-4" /></button>
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
                </TransitionModal>

                {/* Bulk Delete Customer Confirmation Modal */}
                <TransitionModal show={showBulkDeleteModal} themeCard={themeCard} maxWidth="md">
                    <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
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
                                    <p className={`${themeTextDesc} leading-normal text-[10px]`}>Hanya menghapus data terpilih dari database {branding.app_name || 'aplikasi'}. Akun PPP Secret / Hotspot di Mikrotik akan tetap ada dan aktif.</p>
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
                                    <p className={`${themeTextDesc} leading-normal text-[10px]`}>Menghapus data terpilih dari database {branding.app_name || 'aplikasi'} DAN menghapus secara permanen akun PPP Secret/Hotspot terkait dari Router Mikrotik.</p>
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
                </TransitionModal>

                {/* Package Modal */}
                <TransitionModal show={showPackageModal} themeCard={themeCard} maxWidth="md">
                    <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                        <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                            {editingPackage ? 'Edit Paket Layanan' : 'Tambah Paket Layanan'}
                        </h3>
                        <button onClick={() => setShowPackageModal(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                    <form onSubmit={handleSavePackage} className="space-y-3 text-xs">
                        <input type="hidden" name="id" value={editingPackage ? editingPackage.id : ''} />
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
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>Masa Aktif</label>
                                    <input required name="validity" type="text" defaultValue={editingPackage ? editingPackage.validity : ''} placeholder="e.g. 2h, 1d, 30d" className={`p-2 border rounded-lg font-mono ${themeInput}`} />
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1">
                                    <label className={`font-bold ${themeLabel}`}>Masa Aktif</label>
                                    <input disabled placeholder="N/A (Khusus Hotspot)" className={`p-2 border rounded-lg opacity-50 ${isDarkMode ? 'bg-zinc-800 text-zinc-500 border-zinc-700' : 'bg-zinc-100 text-zinc-400 border-zinc-200'}`} />
                                </div>
                            )}
                        </div>
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
                        {selectedPackageType === 'pppoe' && (
                            <>
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
                            </>
                        )}
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Deskripsi Paket</label>
                            <textarea name="description" rows={2} defaultValue={editingPackage ? editingPackage.description : ''} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex justify-end pt-3 gap-2">
                            <button type="button" onClick={() => setShowPackageModal(false)} className={`px-4 py-2 border rounded-lg cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}>Batal</button>
                            <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold cursor-pointer">Simpan</button>
                        </div>
                    </form>
                </TransitionModal>

                {/* Generate Voucher Modal */}
                <TransitionModal show={showGenerateVoucherModal} themeCard={themeCard} maxWidth="md">
                    <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                        <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                            Generate Voucher Hotspot (Bulk)
                        </h3>
                        <button onClick={() => setShowGenerateVoucherModal(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
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
                                    {routers.map(r => (
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
                                        const found = hotspotServers.find(s => s.name === sVal);
                                        setGenerateServerDnsName(found?.dns_name || '');
                                    }}
                                    className={`p-2 border rounded-lg ${themeInput}`}
                                    disabled={isLoadingServers}
                                >
                                    <option value="" disabled selected={!generateRouterId}>
                                        {isLoadingServers ? 'Mengambil server...' : (hotspotServers.length === 0 ? 'Pilih router terlebih dahulu' : 'Pilih Server')}
                                    </option>
                                    <option value="all">all (Semua Server)</option>
                                    {hotspotServers.map(srv => (
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
                                <select required name="package_id" className={`p-2 border rounded-lg ${themeInput}`}>
                                    <option value="" disabled selected>Pilih Paket Hotspot</option>
                                    {packages.filter(p => p.type === 'hotspot').map(p => (
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
                            <button type="button" onClick={() => setShowGenerateVoucherModal(false)} className={`px-4 py-2 border rounded-lg cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}>Batal</button>
                            <button type="submit" disabled={isGeneratingVouchers} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold cursor-pointer disabled:opacity-50">
                                {isGeneratingVouchers ? 'Generating...' : 'Generate'}
                            </button>
                        </div>
                    </form>
                </TransitionModal>

                {/* Sell Voucher Modal */}
                <TransitionModal show={showSellVoucherModal} themeCard={themeCard} maxWidth="sm">
                    <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                        <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                            Konfirmasi Penjualan Voucher
                        </h3>
                        <button onClick={() => { setShowSellVoucherModal(false); setSelectedVoucherForSale(null); }} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
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
                                <button type="button" onClick={() => { setShowSellVoucherModal(false); setSelectedVoucherForSale(null); }} className={`px-4 py-2 border rounded-lg cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}>Batal</button>
                                <button type="submit" disabled={isSellingVoucher} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold cursor-pointer disabled:opacity-50">
                                    {isSellingVoucher ? 'Memproses...' : 'Catat Penjualan'}
                                </button>
                            </div>
                        </form>
                    )}
                </TransitionModal>

                {/* Print Vouchers Modal */}
                <TransitionModal show={showPrintVouchersModal} themeCard={themeCard} maxWidth="md">
                    <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                        <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                            Cetak Voucher Hotspot (Bulk)
                        </h3>
                        <button onClick={() => setShowPrintVouchersModal(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
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
                                {routers.map(r => (
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
                                    
                                    // Find server name from vouchers of this batch
                                    const batchVouchers = hotspotVouchers.filter(v => 
                                        String(v.router_id) === String(printRouterId) && 
                                        v.comment === commentVal
                                    );
                                    const serverName = batchVouchers[0]?.server;
                                    if (serverName) {
                                        // Lookup DNS Name from hotspotServers list
                                        const serverObj = hotspotServers.find(s => s.name === serverName);
                                        if (serverObj && serverObj.dns_name) {
                                            const dns = serverObj.dns_name;
                                            const formattedUrl = dns.startsWith('http://') || dns.startsWith('https://') 
                                                ? dns 
                                                : `http://${dns}`;
                                            setPrintLoginUrl(formattedUrl);
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
                                {uniqueCommentsForPrintRouter.map(comment => (
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
                            <p className="text-[10px] text-zinc-500">Contoh: http://10.0.0.1 atau nama DNS hotspot router Anda. QR-Code akan otomatis mengarah ke URL ini dengan username voucher.</p>
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
                            <p className="text-[10px] text-zinc-500">Pilih 'Otomatis' untuk membedakan warna berdasarkan harga voucher, atau pilih warna tertentu untuk menyeragamkan tampilan cetak.</p>
                        </div>
                        <div className="flex justify-end pt-3 gap-2">
                            <button type="button" onClick={() => setShowPrintVouchersModal(false)} className={`px-4 py-2 border rounded-lg cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}>Batal</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-bold cursor-pointer">
                                Cetak
                            </button>
                        </div>
                    </form>
                </TransitionModal>

                {/* Bulk Delete Vouchers Modal */}
                <TransitionModal show={showBulkDeleteVouchersModal} themeCard={themeCard} maxWidth="md">
                    <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                        <h3 className="text-sm font-bold text-rose-500 flex items-center gap-1.5">
                            <Trash2 className="w-4.5 h-4.5" />
                            Hapus Voucher Massal (Batch)
                        </h3>
                        <button onClick={() => setShowBulkDeleteVouchersModal(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
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
                                {routers.map(r => (
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
                                {uniqueCommentsForRouter.map(comment => (
                                    <option key={comment} value={comment}>{comment}</option>
                                ))}
                            </select>
                        </div>
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg space-y-1">
                            <p className="font-semibold">Peringatan:</p>
                            <p>Tindakan ini akan menghapus seluruh data voucher pada batch terpilih dari database lokal dan menghapus secara otomatis user hotspot terkait dari MikroTik.</p>
                        </div>
                        <div className="flex justify-end pt-3 gap-2">
                            <button type="button" onClick={() => setShowBulkDeleteVouchersModal(false)} className={`px-4 py-2 border rounded-lg cursor-pointer ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}>Batal</button>
                            <button type="submit" className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-bold cursor-pointer">
                                Hapus Massal
                            </button>
                        </div>
                    </form>
                </TransitionModal>

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
