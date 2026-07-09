import { Link, router } from '@inertiajs/react';
import {
    Activity,
    Boxes,
    CreditCard,
    Database,
    GitBranch,
    HandCoins,
    Layers,
    LogOut,
    Map,
    MessageSquare,
    Radio,
    Server,
    ShieldCheck,
    Settings,
    Users,
    Wallet,
    Wifi,
    X,
} from 'lucide-react';
import BrandingTagline, { BrandingCompanyName } from '../BrandingTagline';
import BrandingLogo, { hasWideLogo } from '../BrandingLogo';
import SidebarMountain from './SidebarMountain';

export const adminNavItems = [
    // Ringkasan
    { tab: 'dashboard', icon: Activity, label: 'Dashboard' },
    // Infrastruktur & layanan
    { tab: 'routers', icon: Wifi, label: 'Router Mikrotik' },
    { tab: 'network-map', icon: Map, label: 'Peta Jaringan' },
    { tab: 'packages', icon: Layers, label: 'Paket Internet' },
    // Operasional pelanggan
    { tab: 'customers', icon: Users, label: 'Manajemen PPPoE' },
    { tab: 'hotspot', icon: Radio, label: 'Manajemen Hotspot' },
    { tab: 'invoices', icon: CreditCard, label: 'Tagihan / Billing' },
    { tab: 'finance', icon: Wallet, label: 'Laporan Keuangan' },
    { tab: 'hutang-piutang', icon: HandCoins, label: 'Hutang & Piutang' },
    { tab: 'inventory', icon: Boxes, label: 'Manajemen Inventaris' },
    // Administrasi sistem
    { tab: 'users', icon: ShieldCheck, label: 'Manajemen User' },
    { tab: 'messaging', icon: MessageSquare, label: 'WhatsApp & Telegram' },
    { tab: 'layanan-vps', icon: Server, label: 'Layanan VPS' },
    { tab: 'settings', icon: Settings, label: 'Pengaturan' },
    { tab: 'database', icon: Database, label: 'Database' },
    { tab: 'update', icon: GitBranch, label: 'Update' },
];

export function getAdminNavLinkClass(tabName, activeTab, isDarkMode = true) {
    const isActive = activeTab === tabName;

    if (isDarkMode) {
        if (isActive) {
            return 'w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-bold text-xs transition-all duration-150 border bg-white/14 text-sky-50 border-white/20 shadow-sm backdrop-blur-sm cursor-pointer';
        }

        return 'w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all duration-150 border border-transparent text-sky-100/80 hover:bg-white/10 hover:text-white hover:border-white/12 cursor-pointer';
    }

    if (isActive) {
        return 'w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-bold text-xs transition-all duration-150 border bg-white/55 text-slate-800 border-sky-300/45 shadow-sm backdrop-blur-sm cursor-pointer';
    }

    return 'w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all duration-150 border border-transparent text-slate-700 hover:bg-white/40 hover:text-slate-900 hover:border-sky-200/50 cursor-pointer';
}

export default function AdminSidebar({
    branding,
    auth,
    activeTab,
    sidebarBorder,
    sidebarTextTitle,
    sidebarTextSub,
    sidebarTextDesc,
    themeSidebarBottom,
    themeBrandBar,
    isDarkMode,
    onNavClick,
    showCloseButton = false,
    onClose,
}) {
    return (
        <div className="flex flex-col h-full min-h-0 w-full">
            <div
                className={`admin-topbar relative flex items-center shrink-0 px-2.5 ${themeBrandBar} ${
                    !hasWideLogo(branding) && showCloseButton ? 'justify-between gap-2' : !hasWideLogo(branding) ? 'gap-2.5 px-4' : 'justify-start'
                }`}
                key={`sidebar-brand-${branding.version}`}
            >
                {hasWideLogo(branding) ? (
                    <div className="flex h-full w-full items-center justify-start min-w-0 px-1">
                        <BrandingLogo
                            branding={branding}
                            variant="sidebar"
                            alt={branding.company_name || branding.app_name || 'Logo'}
                            fallbackIcon={Wifi}
                            fallbackClassName={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}
                        />
                    </div>
                ) : (
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden h-full">
                        <BrandingLogo
                            branding={branding}
                            variant="sidebar"
                            alt={branding.company_name || branding.app_name || 'Logo'}
                            fallbackIcon={Wifi}
                            fallbackClassName={`w-4 h-4 ${isDarkMode ? 'text-white' : 'text-slate-700'}`}
                        />
                        <div className="min-w-0 flex-1 overflow-hidden">
                            <BrandingCompanyName className={`text-xs font-black tracking-wide ${sidebarTextTitle}`}>
                                {branding.company_name || branding.app_name || ''}
                            </BrandingCompanyName>
                            <BrandingTagline
                                lines={2}
                                className={`text-[8px] font-bold ${sidebarTextDesc} tracking-wide uppercase mt-0.5`}
                            >
                                {branding.company_tagline}
                            </BrandingTagline>
                        </div>
                    </div>
                )}
                {showCloseButton && (
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                            hasWideLogo(branding) ? 'absolute right-2 top-1/2 -translate-y-1/2' : ''
                        } ${
                            isDarkMode
                                ? 'border-white/20 text-white/80 hover:text-white hover:bg-white/10'
                                : 'border-sky-200/70 text-slate-600 hover:text-slate-800 hover:bg-white/60'
                        }`}
                        aria-label="Tutup menu"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
                <nav className="p-2.5 space-y-0.5">
                    {adminNavItems
                        .filter(({ tab }) => (auth?.user?.allowed_tabs || []).includes(tab))
                        .map(({ tab, icon: Icon, label }) => (
                        <Link
                            key={tab}
                            href={`/${tab}`}
                            onClick={onNavClick}
                            className={getAdminNavLinkClass(tab, activeTab, isDarkMode)}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                        </Link>
                    ))}
                </nav>
            </div>

            <div className={`shrink-0 p-3 ${themeSidebarBottom} transition-colors duration-200`}>
                <div className="-mx-3 -mt-3 mb-2.5 overflow-hidden">
                    <SidebarMountain isDarkMode={isDarkMode} />
                </div>
                <div className="flex items-center gap-3 mb-2.5 px-1.5">
                    {auth.user.avatar_url ? (
                        <img
                            src={auth.user.avatar_url}
                            alt={auth.user.name}
                            className={`w-11 h-11 rounded-lg object-cover shrink-0 border ${
                                isDarkMode ? 'border-white/18' : 'border-sky-300/40'
                            }`}
                        />
                    ) : (
                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 border ${
                            isDarkMode
                                ? 'bg-white/12 text-white border-white/18'
                                : 'bg-white/50 text-slate-700 border-sky-300/40'
                        }`}>
                            {auth.user.initials || '?'}
                        </div>
                    )}
                    <div className="truncate min-w-0 flex flex-col gap-0 leading-tight">
                        <p className="flex items-center gap-1.5 mb-1 leading-none">
                            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                                    isDarkMode ? 'bg-emerald-400' : 'bg-emerald-500'
                                }`} />
                                <span className={`relative inline-flex h-2 w-2 rounded-full ${
                                    isDarkMode
                                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.95)]'
                                        : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.55)]'
                                }`} />
                            </span>
                            <span className={`text-[10px] font-semibold tracking-wide ${
                                isDarkMode ? 'text-emerald-300' : 'text-emerald-700'
                            }`}>Online</span>
                        </p>
                        <p className={`text-xs font-semibold ${sidebarTextTitle} truncate`}>{auth.user.name}</p>
                        <Link
                            href="/profile"
                            onClick={onNavClick}
                            className={`text-[10px] ${sidebarTextSub} font-medium tracking-wide uppercase text-left hover:underline cursor-pointer transition-colors leading-tight ${
                                isDarkMode ? 'hover:text-white' : 'hover:text-sky-900'
                            }`}
                            title="Buka pengaturan profil"
                        >
                            {auth.user.profile_title || 'Super Admin'}
                        </Link>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => router.post('/logout')}
                    className="w-full flex items-center justify-center space-x-2 px-2.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all duration-150 cursor-pointer shadow-sm"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar</span>
                </button>
            </div>
        </div>
    );
}
