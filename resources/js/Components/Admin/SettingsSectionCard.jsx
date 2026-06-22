const ACCENT_STYLES = {
    emerald: {
        barLight: 'bg-gradient-to-r from-emerald-500 via-indigo-400 to-emerald-500',
        barDark: 'bg-gradient-to-r from-emerald-500/80 via-indigo-400/60 to-emerald-500/80',
        icon: 'text-emerald-500',
        wrapLight: 'bg-emerald-50 border border-emerald-100',
        wrapDark: 'bg-emerald-500/10 border border-emerald-500/20',
    },
    indigo: {
        barLight: 'bg-gradient-to-r from-indigo-500 via-violet-400 to-indigo-500',
        barDark: 'bg-gradient-to-r from-indigo-500/80 via-violet-400/60 to-indigo-500/80',
        icon: 'text-indigo-500',
        wrapLight: 'bg-indigo-50 border border-indigo-100',
        wrapDark: 'bg-indigo-500/10 border border-indigo-500/20',
    },
    amber: {
        barLight: 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500',
        barDark: 'bg-gradient-to-r from-amber-500/80 via-orange-400/60 to-amber-500/80',
        icon: 'text-amber-500',
        wrapLight: 'bg-amber-50 border border-amber-100',
        wrapDark: 'bg-amber-500/10 border border-amber-500/20',
    },
    violet: {
        barLight: 'bg-gradient-to-r from-violet-500 via-indigo-400 to-violet-500',
        barDark: 'bg-gradient-to-r from-violet-500/80 via-indigo-400/60 to-violet-500/80',
        icon: 'text-violet-500',
        wrapLight: 'bg-violet-50 border border-violet-100',
        wrapDark: 'bg-violet-500/10 border border-violet-500/20',
    },
    sky: {
        barLight: 'bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-500',
        barDark: 'bg-gradient-to-r from-sky-500/80 via-cyan-400/60 to-sky-500/80',
        icon: 'text-sky-500',
        wrapLight: 'bg-sky-50 border border-sky-100',
        wrapDark: 'bg-sky-500/10 border border-sky-500/20',
    },
};

export default function SettingsSectionCard({
    icon: Icon,
    title,
    description,
    accent = 'emerald',
    themeCard,
    isDarkMode,
    themeTextTitle,
    themeTextSub,
    children,
    className = '',
}) {
    const styles = ACCENT_STYLES[accent] || ACCENT_STYLES.emerald;

    return (
        <div className={`${themeCard} border rounded-2xl overflow-hidden ${className}`}>
            <div className={`h-0.5 ${isDarkMode ? styles.barDark : styles.barLight}`} />
            <div className="p-4 sm:p-5 space-y-4">
                <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 ${isDarkMode ? styles.wrapDark : styles.wrapLight}`}>
                        <Icon className={`w-5 h-5 ${styles.icon}`} />
                    </div>
                    <div className="min-w-0">
                        <h2 className={`text-sm font-bold tracking-tight ${themeTextTitle}`}>{title}</h2>
                        {description ? (
                            <p className={`text-[11px] leading-relaxed mt-0.5 ${themeTextSub}`}>{description}</p>
                        ) : null}
                    </div>
                </div>
                {children}
            </div>
        </div>
    );
}
