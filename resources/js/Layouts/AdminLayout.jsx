import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import SeoHead from '../Components/SeoHead';
import AppFooter from '../Components/AppFooter';
import AdminSidebar from '../Components/Admin/AdminSidebar';
import AdminNavbar from '../Components/Admin/AdminNavbar';
import ToastStack from '../Components/Admin/ToastStack';
import ReadOnlyStaffBanner from '../Components/Admin/ReadOnlyStaffBanner';
import NightSkyBackground from '../Components/Admin/NightSkyBackground';
import PullToRefresh from '../Components/PullToRefresh';
import { AdminToastProvider, useAdminToast } from '../hooks/useAdminToast';
import { AdminThemeProvider, useAdminTheme } from '../hooks/useAdminTheme.jsx';

function resolveActiveTab(url) {
    const pathname = new URL(url, window.location.origin).pathname.replace(/^\//, '');
    const validTabs = [
        'dashboard', 'routers', 'customers', 'packages', 'invoices', 'finance', 'hutang-piutang', 'inventory', 'users',
        'hotspot', 'database', 'update', 'messaging', 'settings', 'layanan-vps', 'profile', 'network-map',
    ];
    return validTabs.includes(pathname) ? pathname : 'dashboard';
}

function AdminLayoutShell({ title, children }) {
    const { auth, branding = {} } = usePage().props;
    const pageUrl = usePage().url;
    const theme = useAdminTheme();
    const { toasts, setToasts } = useAdminToast();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const mobileMenuRef = useRef(null);
    const menuToggleRef = useRef(null);

    const activeTab = useMemo(() => resolveActiveTab(pageUrl), [pageUrl]);

    const closeMobileMenu = useCallback(() => {
        setIsMobileMenuOpen(false);
    }, []);

    const handleSidebarNavClick = useCallback(() => {
        closeMobileMenu();
    }, [closeMobileMenu]);

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
                closeMobileMenu();
            }
        };

        window.addEventListener('keydown', handleEscape);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isMobileMenuOpen, closeMobileMenu]);

    useEffect(() => {
        if (isMobileMenuOpen || !mobileMenuRef.current) {
            return;
        }

        const { activeElement } = document;
        if (activeElement instanceof HTMLElement && mobileMenuRef.current.contains(activeElement)) {
            activeElement.blur();
            menuToggleRef.current?.focus();
        }
    }, [isMobileMenuOpen]);

    const pageTitle = title || branding.display_name || branding.app_name || 'Dasbor';

    return (
        <>
            <SeoHead title={pageTitle} branding={branding} />
            <div className={`flex h-dvh overflow-hidden font-sans antialiased transition-colors duration-250 ${theme.themeBg}`}>
                <aside className={`hidden md:flex flex-col w-56 shrink-0 min-h-0 overflow-hidden transition-colors duration-250 ${theme.themeSidebar}`}>
                    <AdminSidebar
                        branding={branding}
                        auth={auth}
                        activeTab={activeTab}
                        sidebarBorder={theme.sidebarBorder}
                        sidebarTextTitle={theme.sidebarTextTitle}
                        sidebarTextSub={theme.sidebarTextSub}
                        sidebarTextDesc={theme.sidebarTextDesc}
                        themeSidebarBottom={theme.themeSidebarBottom}
                        themeBrandBar={theme.themeBrandBar}
                        isDarkMode={theme.isDarkMode}
                        onNavClick={handleSidebarNavClick}
                    />
                </aside>

                <div
                    ref={mobileMenuRef}
                    className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ease-out ${
                        isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                    inert={isMobileMenuOpen ? undefined : ''}
                >
                    <div
                        className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
                            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
                        }`}
                        onClick={closeMobileMenu}
                    />
                    <aside
                        id="admin-mobile-nav"
                        className={`absolute inset-y-0 left-0 w-[min(16rem,85vw)] flex flex-col shadow-2xl transition-transform duration-300 ease-out will-change-transform ${theme.themeSidebar} ${
                            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                        role={isMobileMenuOpen ? 'dialog' : undefined}
                        aria-modal={isMobileMenuOpen ? 'true' : undefined}
                        aria-label={isMobileMenuOpen ? 'Menu navigasi' : undefined}
                    >
                        <AdminSidebar
                            branding={branding}
                            auth={auth}
                            activeTab={activeTab}
                            sidebarBorder={theme.sidebarBorder}
                            sidebarTextTitle={theme.sidebarTextTitle}
                            sidebarTextSub={theme.sidebarTextSub}
                            sidebarTextDesc={theme.sidebarTextDesc}
                            themeSidebarBottom={theme.themeSidebarBottom}
                            themeBrandBar={theme.themeBrandBar}
                            isDarkMode={theme.isDarkMode}
                            onNavClick={handleSidebarNavClick}
                            showCloseButton
                            onClose={closeMobileMenu}
                        />
                    </aside>
                </div>

                <div className={`flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative ${theme.themeMainPanel}`}>
                    {theme.isDarkMode && <NightSkyBackground />}
                    <AdminNavbar
                        pageTitle={pageTitle}
                        theme={theme}
                        isMobileMenuOpen={isMobileMenuOpen}
                        menuButtonRef={menuToggleRef}
                        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
                    />

                    <PullToRefresh
                        disabled={isMobileMenuOpen}
                        isDarkMode={theme.isDarkMode}
                        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain relative z-10"
                        contentClassName="p-4 sm:p-6 space-y-6"
                    >
                        <ReadOnlyStaffBanner />
                        {children}
                    </PullToRefresh>

                    <AppFooter
                        branding={branding}
                        className={`noc-main-footer relative z-10 shrink-0 px-4 sm:px-6 py-2.5 sm:py-3 border-t text-center ${theme.themeFooterBar}`}
                        textClassName={`text-xs sm:text-sm leading-relaxed ${theme.themeTextDesc}`}
                    />
                </div>
            </div>

            <ToastStack toasts={toasts} setToasts={setToasts} isDarkMode={theme.isDarkMode} />
        </>
    );
}

export default function AdminLayout({ title, children }) {
    return (
        <AdminThemeProvider>
            <AdminToastProvider>
                <AdminLayoutShell title={title}>{children}</AdminLayoutShell>
            </AdminToastProvider>
        </AdminThemeProvider>
    );
}

export { useAdminToast };
