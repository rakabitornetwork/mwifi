import { useAdminTheme } from './useAdminTheme.jsx';

export function useAdminFormTheme() {
    const theme = useAdminTheme();
    const { isDarkMode } = theme;

    return {
        ...theme,
        themeInput: isDarkMode
            ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700'
            : 'bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300',
        themeLabel: isDarkMode ? 'text-zinc-400' : 'text-zinc-650',
        themeInnerWidget: isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60',
        themeBorderSep: isDarkMode ? 'border-zinc-900' : 'border-zinc-200',
    };
}
