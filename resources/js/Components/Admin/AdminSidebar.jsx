import { Link, router } from '@inertiajs/react';
import {
    Activity,
    Boxes,
    CreditCard,
    Database,
    GitBranch,
    Layers,
    LogOut,
    Map,
    MessageSquare,
    Radio,
    Settings,
    Users,
    Wifi,
    X,
} from 'lucide-react';
import BrandingTagline, { BrandingCompanyName } from '../BrandingTagline';

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
    { tab: 'inventory', icon: Boxes, label: 'Manajemen Inventaris' },
    // Administrasi sistem
    { tab: 'messaging', icon: MessageSquare, label: 'WhatsApp & Telegram' },
    { tab: 'settings', icon: Settings, label: 'Pengaturan' },
    { tab: 'database', icon: Database, label: 'Database' },
    { tab: 'update', icon: GitBranch, label: 'Update' },
];

export function getAdminNavLinkClass(tabName, activeTab) {
    const isActive = activeTab === tabName;
    if (isActive) {
        return 'w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-bold text-xs transition-all duration-150 border bg-white/16 text-white border-white/22 shadow-sm backdrop-blur-sm cursor-pointer';
    }
    return 'w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg font-medium text-xs transition-all duration-150 border border-transparent text-blue-50/85 hover:bg-white/12 hover:text-white hover:border-white/14 cursor-pointer';
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
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div
                    className={`min-h-14 py-2.5 px-4 flex items-center shrink-0 ${themeBrandBar} ${showCloseButton ? 'justify-between gap-2' : 'gap-2.5'}`}
                    key={`sidebar-brand-${branding.version}`}
                >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
                        {branding.logo_url ? (
                            <img
                                src={branding.logo_url}
                                alt={branding.company_name || branding.app_name || 'Logo'}
                                className="w-9 h-9 object-contain shrink-0"
                            />
                        ) : (
                            <div className="w-7 h-7 rounded-lg noc-sidebar-logo flex items-center justify-center shrink-0">
                                <Wifi className="w-4 h-4 text-white" />
                            </div>
                        )}
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
                    {adminNavItems.map(({ tab, icon: Icon, label }) => (
                        <Link
                            key={tab}
                            href={`/${tab}`}
                            onClick={onNavClick}
                            className={getAdminNavLinkClass(tab, activeTab)}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{label}</span>
                        </Link>
                    ))}
                </nav>
            </div>

            <div className={`shrink-0 p-3 ${themeSidebarBottom} transition-colors duration-200`}>
                <div className="flex items-center gap-3 mb-2.5 px-1.5">
                    {auth.user.avatar_url ? (
                        <img
                            src={auth.user.avatar_url}
                            alt={auth.user.name}
                            className="w-11 h-11 rounded-lg object-cover shrink-0 border border-white/18"
                        />
                    ) : (
                        <div className="w-11 h-11 rounded-lg bg-white/12 text-white border border-white/18 flex items-center justify-center font-bold text-sm shrink-0">
                            {auth.user.initials || '?'}
                        </div>
                    )}
                    <div className="truncate min-w-0 flex flex-col gap-0 leading-tight">
                        <p className="flex items-center gap-1.5 mb-1 leading-none">
                            <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.95)]" />
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-300 tracking-wide">Online</span>
                        </p>
                        <p className={`text-xs font-semibold ${sidebarTextTitle} truncate`}>{auth.user.name}</p>
                        <Link
                            href="/profile"
                            onClick={onNavClick}
                            className={`text-[10px] ${sidebarTextSub} font-medium tracking-wide uppercase text-left hover:underline cursor-pointer transition-colors leading-tight ${isDarkMode ? 'hover:text-white' : 'hover:text-indigo-900'}`}
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
