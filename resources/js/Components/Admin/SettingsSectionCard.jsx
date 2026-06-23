import { getCardAccentStyles } from '../../utils/cardAccentStyles';

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
    const styles = getCardAccentStyles(accent);

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
