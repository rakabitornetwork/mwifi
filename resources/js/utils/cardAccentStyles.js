export const CARD_ACCENT_STYLES = {
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
    rose: {
        barLight: 'bg-gradient-to-r from-rose-500 via-pink-400 to-rose-500',
        barDark: 'bg-gradient-to-r from-rose-500/80 via-pink-400/60 to-rose-500/80',
        icon: 'text-rose-500',
        wrapLight: 'bg-rose-50 border border-rose-100',
        wrapDark: 'bg-rose-500/10 border border-rose-500/20',
    },
};

export function getCardAccentStyles(accent = 'emerald') {
    return CARD_ACCENT_STYLES[accent] || CARD_ACCENT_STYLES.emerald;
}
