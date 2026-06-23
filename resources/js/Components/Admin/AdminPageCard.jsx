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
    bodyClassName = 'p-6 space-y-6',
}) {
    return (
        <div className={`${themeCard} border rounded-2xl overflow-hidden shadow-xs ${className}`}>
            <div className={bodyClassName}>
                <div className={`space-y-4 border-b pb-4 ${isDarkMode ? 'border-zinc-800/60' : 'border-zinc-100'}`}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-start gap-2.5 min-w-0">
                            {Icon && <Icon className="w-4.5 h-4.5 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />}
                            <div className="min-w-0">
                                <h2 className={`text-sm font-semibold tracking-tight ${themeTextTitle}`}>{title}</h2>
                                {description ? (
                                    <p className={`text-xs mt-0.5 text-zinc-500 dark:text-zinc-400`}>{description}</p>
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
    bodyClassName = 'p-6 space-y-5',
}) {
    return (
        <div className={`${themeCard} border rounded-2xl overflow-hidden shadow-xs hover:shadow-sm transition-shadow duration-200 ${className}`}>
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
    className = 'pb-3.5 border-b border-zinc-100 dark:border-zinc-800/60',
}) {
    return (
        <div className={`flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between ${className}`}>
            <div className="flex items-center gap-2.5 min-w-0">
                {Icon && <Icon className="w-4.5 h-4.5 text-zinc-400 dark:text-zinc-500 shrink-0" />}
                <div className="min-w-0">
                    <h3 className={`text-sm font-semibold tracking-tight ${themeTextTitle}`}>
                        {title}
                    </h3>
                    {subtitle ? (
                        <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-0.5">{subtitle}</p>
                    ) : null}
                </div>
            </div>
            {trailing}
        </div>
    );
}
