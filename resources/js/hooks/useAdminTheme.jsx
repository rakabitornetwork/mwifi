import { createContext, useContext, useEffect, useMemo } from 'react';
import { useScheduledTheme } from './useScheduledTheme';

const AdminThemeContext = createContext(null);

const THEME_STORAGE_KEY = 'mwifi.admin.theme';

export function AdminThemeProvider({ children }) {
    const { isDarkMode, themePreference, isAutoTheme, toggleTheme } = useScheduledTheme(THEME_STORAGE_KEY);

    useEffect(() => {
        document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
        document.body.classList.toggle('bg-zinc-950', isDarkMode);
        document.body.classList.toggle('text-zinc-100', isDarkMode);
        document.body.classList.toggle('bg-gray-50', !isDarkMode);
        document.body.classList.toggle('text-gray-900', !isDarkMode);
    }, [isDarkMode]);

    const theme = useMemo(() => ({
        isDarkMode,
        themePreference,
        isAutoTheme,
        toggleTheme,
        themeBg: isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-800',
        themeSidebar: isDarkMode ? 'noc-sidebar noc-sidebar-dark' : 'noc-sidebar noc-sidebar-light',
        themeSidebarBottom: isDarkMode ? 'noc-sidebar-footer noc-sidebar-footer-dark' : 'noc-sidebar-footer noc-sidebar-footer-light',
        sidebarTextTitle: isDarkMode ? 'text-sky-50' : 'text-slate-800',
        sidebarTextSub: isDarkMode ? 'text-sky-200/75' : 'text-slate-600',
        sidebarTextDesc: isDarkMode ? 'text-sky-300/55' : 'text-slate-500',
        sidebarBorder: isDarkMode ? 'border-white/10' : 'border-sky-300/35',
        themeCard: isDarkMode ? 'bg-zinc-900/30 border-zinc-800/80 backdrop-blur-[2px]' : 'bg-white border-zinc-200/80 shadow-xs',
        themeTextTitle: isDarkMode ? 'text-white' : 'text-zinc-900',
        themeTextSub: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
        themeTextDesc: isDarkMode ? 'text-zinc-500' : 'text-zinc-400',
        themeBrandBar: isDarkMode ? 'noc-brand-bar noc-brand-bar-dark' : 'noc-brand-bar noc-brand-bar-light',
        themeHeader: isDarkMode ? 'noc-navbar noc-navbar-dark noc-brand-bar' : 'noc-navbar noc-navbar-light noc-brand-bar',
        themeHeaderTextTitle: isDarkMode ? 'text-white' : 'text-slate-800',
        themeHeaderBtn: isDarkMode
            ? 'border-white/22 bg-white/10 text-white/90 hover:bg-white/18 hover:text-white hover:border-white/32 shadow-sm'
            : 'border-sky-200/80 bg-white/70 text-sky-900/75 hover:bg-white hover:text-sky-950 hover:border-sky-300/80 shadow-sm',
        themeMainPanel: isDarkMode ? 'bg-zinc-950' : 'bg-zinc-50',
        themeFooterBar: isDarkMode ? 'bg-zinc-950 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200',
        themeHeaderBorder: 'border-transparent',
    }), [isDarkMode, themePreference, isAutoTheme, toggleTheme]);

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
