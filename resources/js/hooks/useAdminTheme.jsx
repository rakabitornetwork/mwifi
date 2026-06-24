import { createContext, useContext, useMemo, useState } from 'react';

const AdminThemeContext = createContext(null);

const THEME_STORAGE_KEY = 'mwifi.admin.theme';

function readStoredDarkMode() {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
    } catch {
        return false;
    }
}

function persistDarkMode(isDarkMode) {
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light');
    } catch {
        // Ignore private browsing / storage quota errors.
    }
}

export function AdminThemeProvider({ children }) {
    const [isDarkMode, setIsDarkMode] = useState(readStoredDarkMode);

    const theme = useMemo(() => {
        const toggleTheme = () => {
            setIsDarkMode((prev) => {
                const next = !prev;
                persistDarkMode(next);
                return next;
            });
        };

        return {
            isDarkMode,
            toggleTheme,
            themeBg: isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-800',
            themeSidebar: isDarkMode ? 'noc-sidebar noc-sidebar-dark' : 'noc-sidebar noc-sidebar-light',
            themeSidebarBottom: 'noc-sidebar-footer',
            sidebarTextTitle: 'text-white',
            sidebarTextSub: 'text-blue-100/80',
            sidebarTextDesc: 'text-blue-200/60',
            sidebarBorder: 'border-white/10',
            themeCard: isDarkMode ? 'bg-zinc-900/50 border-zinc-800/80 backdrop-blur-md' : 'bg-white border-zinc-200/80 shadow-xs',
            themeTextTitle: isDarkMode ? 'text-white' : 'text-zinc-900',
            themeTextSub: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
            themeTextDesc: isDarkMode ? 'text-zinc-500' : 'text-zinc-400',
            themeBrandBar: isDarkMode ? 'noc-brand-bar noc-brand-bar-dark' : 'noc-brand-bar noc-brand-bar-light',
            themeHeader: isDarkMode ? 'noc-navbar noc-navbar-dark noc-brand-bar' : 'noc-navbar noc-navbar-light noc-brand-bar',
            themeHeaderTextTitle: 'text-white',
            themeHeaderBtn: 'border-white/22 bg-white/10 text-white/90 hover:bg-white/18 hover:text-white hover:border-white/32 shadow-sm',
            themeMainPanel: isDarkMode ? 'bg-zinc-950' : 'bg-zinc-50',
            themeFooterBar: isDarkMode ? 'bg-zinc-950 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200',
            themeHeaderBorder: 'border-transparent',
        };
    }, [isDarkMode]);

    return (
        <AdminThemeContext.Provider value={theme}>
            {children}
        </AdminThemeContext.Provider>
    );
}

export function useAdminTheme() {
    const context = useContext(AdminThemeContext);
    if (!context) {
        throw new Error('useAdminTheme must be used within AdminThemeProvider');
    }
    return context;
}
