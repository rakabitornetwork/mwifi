import { getCardAccentStyles } from '../../utils/cardAccentStyles';

export default function AdminPageCard({
    icon: Icon,
    title,
    description,
    accent = 'emerald',
    themeCard,
    isDarkMode,
    themeTextTitle,
    themeTextDesc,
    actions = null,
    headerBottom = null,
    children,
    className = '',
    bodyClassName = 'p-5 space-y-4',
}) {
    const styles = getCardAccentStyles(accent);

    return (
        <div className={`${themeCard} border rounded-2xl overflow-hidden ${className}`}>
            <div className={`h-0.5 ${isDarkMode ? styles.barDark : styles.barLight}`} />
            <div className={bodyClassName}>
                <div className={`space-y-3 border-b pb-3 ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className={`p-2 rounded-xl shrink-0 ${isDarkMode ? styles.wrapDark : styles.wrapLight}`}>
                                <Icon className={`w-5 h-5 ${styles.icon}`} />
                            </div>
                            <div className="min-w-0">
                                <h2 className={`text-sm font-bold ${themeTextTitle}`}>{title}</h2>
                                {description ? (
                                    <p className={`text-[10px] mt-0.5 ${themeTextDesc}`}>{description}</p>
                                ) : null}
                            </div>
                        </div>
                        {actions ? (
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                                {actions}
                            </div>
                        ) : null}
                    </div>
                    {headerBottom}
                </div>
                {children}
            </div>
        </div>
    );
}

export function PremiumPanel({
    accent = 'emerald',
    themeCard,
    isDarkMode,
    children,
    className = '',
    bodyClassName = 'p-4 space-y-4',
}) {
    const styles = getCardAccentStyles(accent);

    return (
        <div className={`${themeCard} border rounded-2xl overflow-hidden shadow-xs ${className}`}>
            <div className={`h-0.5 ${isDarkMode ? styles.barDark : styles.barLight}`} />
            <div className={bodyClassName}>{children}</div>
        </div>
    );
}

export function PremiumPanelHeader({
    icon: Icon,
    accent = 'emerald',
    isDarkMode,
    themeTextTitle,
    themeTextDesc,
    title,
    subtitle,
    trailing = null,
    className = 'pb-2 border-b border-zinc-200/50 dark:border-zinc-800/40',
}) {
    const styles = getCardAccentStyles(accent);

    return (
        <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${className}`}>
            <div className="flex items-center gap-2 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 ${isDarkMode ? styles.wrapDark : styles.wrapLight}`}>
                    <Icon className={`w-4 h-4 ${styles.icon}`} />
                </div>
                <div className="min-w-0">
                    <h3 className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate ${themeTextTitle}`}>
                        {title}
                    </h3>
                    {subtitle ? (
                        <p className={`text-[10px] mt-0.5 ${themeTextDesc || ''}`}>{subtitle}</p>
                    ) : null}
                </div>
            </div>
            {trailing}
        </div>
    );
}
