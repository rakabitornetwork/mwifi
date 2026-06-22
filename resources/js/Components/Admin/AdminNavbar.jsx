import { useEffect, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { ChevronDown, LogOut, Menu, MessageCircle, Moon, Sun, User, UserX, Wallet, Wifi } from 'lucide-react';
import { formatRupiah } from '../../utils/formatRupiah';

function formatRupiahShort(value) {
    const num = Number(value) || 0;

    if (num >= 1_000_000) {
        const jt = num / 1_000_000;
        return `Rp ${Number.isInteger(jt) ? jt : jt.toFixed(1)}jt`;
    }

    if (num >= 1_000) {
        return `Rp ${Math.round(num / 1_000)}rb`;
    }

    return formatRupiah(num);
}

function NavbarChip({ href, icon: Icon, label, tone = 'neutral', title }) {
    const toneClass = {
        danger: 'border-rose-400/35 bg-rose-500/15 text-rose-50 hover:bg-rose-500/25',
        warning: 'border-amber-400/35 bg-amber-500/15 text-amber-50 hover:bg-amber-500/25',
        success: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25',
        neutral: 'border-white/22 bg-white/10 text-white/90 hover:bg-white/18',
    }[tone];

    return (
        <Link
            href={href}
            title={title || label}
            className={`hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-colors ${toneClass}`}
        >
            <Icon className="w-3 h-3 shrink-0" />
            <span className="whitespace-nowrap">{label}</span>
        </Link>
    );
}

function WhatsAppStatusChip({ whatsapp }) {
    const state = whatsapp?.state || 'unreachable';
    const label = whatsapp?.label || 'WhatsApp';

    const meta = {
        connected: { dot: 'bg-emerald-400', tone: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-50 hover:bg-emerald-500/25' },
        pairing: { dot: 'bg-sky-400 animate-pulse', tone: 'border-sky-400/35 bg-sky-500/15 text-sky-50 hover:bg-sky-500/25' },
        disconnected: { dot: 'bg-amber-400', tone: 'border-amber-400/35 bg-amber-500/15 text-amber-50 hover:bg-amber-500/25' },
        disabled: { dot: 'bg-zinc-400', tone: 'border-white/22 bg-white/10 text-white/70 hover:bg-white/18' },
        unconfigured: { dot: 'bg-zinc-400', tone: 'border-white/22 bg-white/10 text-white/70 hover:bg-white/18' },
        unreachable: { dot: 'bg-rose-400', tone: 'border-rose-400/35 bg-rose-500/15 text-rose-50 hover:bg-rose-500/25' },
    }[state] || { dot: 'bg-zinc-400', tone: 'border-white/22 bg-white/10 text-white/70' };

    return (
        <Link
            href="/settings"
            title={`WhatsApp: ${label}`}
            className={`inline-flex items-center gap-1.5 px-2 py-1 sm:px-2.5 rounded-lg border text-[10px] font-bold transition-colors ${meta.tone}`}
        >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dot}`} />
            <MessageCircle className="w-3 h-3 shrink-0 hidden sm:block" />
            <span className="whitespace-nowrap hidden sm:inline">WA</span>
            <span className="whitespace-nowrap hidden md:inline text-white/80 font-semibold">{label}</span>
        </Link>
    );
}

function AdminProfileMenu({ user, themeHeaderBtn }) {
    const [open, setOpen] = useState(false);
    const [renderMenu, setRenderMenu] = useState(false);
    const [menuActive, setMenuActive] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (open) {
            setRenderMenu(true);
            const frame = window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => setMenuActive(true));
            });

            return () => window.cancelAnimationFrame(frame);
        }

        setMenuActive(false);
        const timer = window.setTimeout(() => setRenderMenu(false), 200);

        return () => window.clearTimeout(timer);
    }, [open]);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const handlePointer = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointer);
        window.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointer);
            window.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    if (!user) {
        return null;
    }

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className={`inline-flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg border transition-colors cursor-pointer ${themeHeaderBtn}`}
                aria-expanded={open}
                aria-haspopup="menu"
            >
                {user.avatar_url ? (
                    <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="w-7 h-7 rounded-md object-cover border border-white/20"
                    />
                ) : (
                    <span className="w-7 h-7 rounded-md border border-white/20 bg-white/12 text-white text-[10px] font-bold inline-flex items-center justify-center">
                        {user.initials || '?'}
                    </span>
                )}
                <span className="hidden sm:flex flex-col items-start leading-tight min-w-0 max-w-[120px]">
                    <span className="text-[11px] font-bold truncate w-full text-left">{user.name}</span>
                    <span className="text-[9px] text-white/70 truncate w-full text-left">{user.profile_title || 'Admin'}</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {renderMenu && (
                <div
                    role="menu"
                    className={`absolute right-0 mt-2 w-44 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg py-1 z-50 origin-top-right transform transition-all duration-200 ease-out ${
                        menuActive
                            ? 'opacity-100 translate-y-0 scale-100'
                            : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'
                    }`}
                >
                    <Link
                        href="/profile"
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <User className="w-3.5 h-3.5" />
                        Profil
                    </Link>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            setOpen(false);
                            router.post('/logout');
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Keluar
                    </button>
                </div>
            )}
        </div>
    );
}

export default function AdminNavbar({
    pageTitle,
    navbarStats,
    auth,
    theme,
    isMobileMenuOpen,
    onOpenMobileMenu,
}) {
    const {
        themeHeader,
        themeHeaderTextTitle,
        themeHeaderBtn,
        isDarkMode,
        toggleTheme,
    } = theme;

    const stats = navbarStats || {};
    const unpaidCount = Number(stats.unpaid_invoices ?? 0);
    const isolatedCount = Number(stats.isolated_customers ?? 0);
    const routersOnline = Number(stats.routers_online ?? 0);
    const routersTotal = Number(stats.routers_total ?? 0);
    const routersOffline = Math.max(0, routersTotal - routersOnline);
    const todayRevenue = Number(stats.today_revenue ?? 0);

    return (
        <header className={`h-14 ${themeHeader} flex items-center justify-between gap-3 px-4 sm:px-6 z-10 transition-colors duration-250`}>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                    type="button"
                    onClick={onOpenMobileMenu}
                    className={`p-1.5 rounded-lg border md:hidden cursor-pointer shrink-0 transition-colors ${themeHeaderBtn}`}
                    aria-label="Buka menu navigasi"
                    aria-expanded={isMobileMenuOpen}
                >
                    <Menu className="w-4 h-4" />
                </button>
                <h1 className={`text-xs sm:text-sm font-bold truncate ${themeHeaderTextTitle}`}>{pageTitle}</h1>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {unpaidCount > 0 && (
                    <NavbarChip
                        href="/invoices"
                        icon={Wallet}
                        label={`${unpaidCount} tagihan`}
                        tone="danger"
                        title={`${unpaidCount} invoice belum lunas`}
                    />
                )}

                {isolatedCount > 0 && (
                    <NavbarChip
                        href="/customers"
                        icon={UserX}
                        label={`${isolatedCount} isolir`}
                        tone="warning"
                        title={`${isolatedCount} pelanggan terisolir`}
                    />
                )}

                {routersTotal > 0 && routersOffline > 0 && (
                    <NavbarChip
                        href="/routers"
                        icon={Wifi}
                        label={`${routersOffline} router off`}
                        tone="warning"
                        title={`${routersOnline}/${routersTotal} router online`}
                    />
                )}

                {todayRevenue > 0 && (
                    <NavbarChip
                        href="/dashboard"
                        icon={Wallet}
                        label={formatRupiahShort(todayRevenue)}
                        tone="success"
                        title={`Pendapatan hari ini ${formatRupiah(todayRevenue)}`}
                    />
                )}

                <WhatsAppStatusChip whatsapp={stats.whatsapp} />

                <button
                    type="button"
                    onClick={toggleTheme}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${themeHeaderBtn}`}
                    aria-label="Ganti tema"
                >
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                <AdminProfileMenu user={auth?.user} themeHeaderBtn={themeHeaderBtn} />
            </div>
        </header>
    );
}
