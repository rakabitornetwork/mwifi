/** Jam mulai mode terang (inklusif). */
export const THEME_LIGHT_START_HOUR = 6;

/** Jam mulai mode gelap (inklusif). */
export const THEME_DARK_START_HOUR = 18;

/**
 * Mode gelap aktif di luar jam kerja: 18:00–05:59 (zona waktu perangkat).
 */
export function isDarkByLocalTime(date = new Date()) {
    const hour = date.getHours();

    return hour >= THEME_DARK_START_HOUR || hour < THEME_LIGHT_START_HOUR;
}

/**
 * Preferensi tema berikutnya saat pengguna menekan toggle.
 * Membalik tampilan saat ini (gelap ↔ terang), bukan siklus auto → light → dark.
 */
export function resolveNextThemePreference(currentPreference, followsLocalTime) {
    const currentlyDark = currentPreference === 'dark'
        || (currentPreference === 'auto' && followsLocalTime);

    return currentlyDark ? 'light' : 'dark';
}

/**
 * Milidetik hingga pergantian tema berikutnya (06:00 atau 18:00).
 */
export function msUntilNextThemeBoundary(date = new Date()) {
    const now = date.getTime();
    const next = new Date(date);
    next.setSeconds(0, 0);

    const hour = next.getHours();

    if (hour < THEME_LIGHT_START_HOUR) {
        next.setHours(THEME_LIGHT_START_HOUR, 0, 0, 0);
    } else if (hour < THEME_DARK_START_HOUR) {
        next.setHours(THEME_DARK_START_HOUR, 0, 0, 0);
    } else {
        next.setDate(next.getDate() + 1);
        next.setHours(THEME_LIGHT_START_HOUR, 0, 0, 0);
    }

    return Math.max(1_000, next.getTime() - now);
}
