import { getCardAccentStyles } from '../../utils/cardAccentStyles';

function accentBarClass(styles, isDarkMode, isEmphasis) {
    return `${isEmphasis ? 'h-1' : 'h-0.5'} ${isDarkMode ? styles.barDark : styles.barLight}`;
}

function iconWrapClass(styles, isDarkMode, isEmphasis) {
    if (isEmphasis) {
        return isDarkMode ? styles.emphasisIconWrapDark : styles.emphasisIconWrapLight;
    }

    return isDarkMode ? styles.wrapDark : styles.wrapLight;
}

function iconClass(styles, isEmphasis) {
    return isEmphasis ? styles.emphasisIcon : styles.icon;
}

export default function AdminPageCard({
    icon: Icon,
    title,
    description,
    accent = 'emerald',
    variant = 'emphasis',
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
    const isEmphasis = variant === 'emphasis';

    const headerBlock = (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div className={`p-2 rounded-xl shrink-0 ${iconWrapClass(styles, isDarkMode, isEmphasis)}`}>
                        <Icon className={`w-5 h-5 ${iconClass(styles, isEmphasis)}`} />
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
        </>
    );

    if (isEmphasis) {
        return (
            <div className={`${themeCard} border rounded-2xl overflow-hidden ${className}`}>
                <div className={accentBarClass(styles, isDarkMode, isEmphasis)} />
                <div className={`space-y-3 border-b px-5 pt-4 pb-3 ${isDarkMode ? styles.emphasisHeaderDark : styles.emphasisHeaderLight}`}>
                    {headerBlock}
                </div>
                <div className={`${bodyClassName} !pt-4`}>
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className={`${themeCard} border rounded-2xl overflow-hidden ${className}`}>
            <div className={accentBarClass(styles, isDarkMode, isEmphasis)} />
            <div className={bodyClassName}>
                <div className={`space-y-3 border-b pb-3 ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    {headerBlock}
                </div>
                {children}
            </div>
        </div>
    );
}

export function PremiumPanel({
    accent = 'emerald',
    variant = 'emphasis',
    themeCard,
    isDarkMode,
    children,
    className = '',
    bodyClassName = 'p-4 space-y-4',
}) {
    const styles = getCardAccentStyles(accent);
    const isEmphasis = variant === 'emphasis';

    return (
        <div className={`${themeCard} border rounded-2xl overflow-hidden shadow-xs ${className}`}>
            <div className={accentBarClass(styles, isDarkMode, isEmphasis)} />
            <div className={bodyClassName}>{children}</div>
        </div>
    );
}

export function PremiumPanelHeader({
    icon: Icon,
    accent = 'emerald',
    variant = 'emphasis',
    isDarkMode,
    themeTextTitle,
    themeTextDesc,
    title,
    subtitle,
    trailing = null,
    className = '',
}) {
    const styles = getCardAccentStyles(accent);
    const isEmphasis = variant === 'emphasis';

    const resolvedClassName = className || (
        isEmphasis
            ? `rounded-xl border px-3 py-2.5 mb-1 ${isDarkMode ? styles.emphasisHeaderDark : styles.emphasisHeaderLight}`
            : 'pb-2 border-b border-zinc-200/50 dark:border-zinc-800/40'
    );

    return (
        <div className={resolvedClassName}>
            <div className="flex items-center gap-2 min-h-[28px]">
                <div className={`p-1.5 rounded-lg shrink-0 flex items-center justify-center ${iconWrapClass(styles, isDarkMode, isEmphasis)}`}>
                    <Icon className={`w-4 h-4 ${iconClass(styles, isEmphasis)}`} />
                </div>
                <h3 className={`flex-1 min-w-0 truncate text-[11px] sm:text-xs font-bold uppercase tracking-wider leading-tight ${themeTextTitle}`}>
                    {title}
                </h3>
                {trailing ? (
                    <div className="shrink-0 flex items-center">
                        {trailing}
                    </div>
                ) : null}
            </div>
            {subtitle ? (
                <div className={`text-[10px] mt-1.5 pl-9 min-w-0 ${themeTextDesc || ''}`}>{subtitle}</div>
            ) : null}
        </div>
    );
}
