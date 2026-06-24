import { useCallback, useEffect, useMemo, useState } from 'react';
import { isDarkByLocalTime, msUntilNextThemeBoundary } from '../utils/themeSchedule';

export const THEME_PREFERENCE_AUTO = 'auto';
export const THEME_PREFERENCE_LIGHT = 'light';
export const THEME_PREFERENCE_DARK = 'dark';

function readStoredPreference(storageKey) {
    if (typeof window === 'undefined') {
        return THEME_PREFERENCE_AUTO;
    }

    try {
        const value = window.localStorage.getItem(storageKey);
        if (value === THEME_PREFERENCE_AUTO || value === THEME_PREFERENCE_LIGHT || value === THEME_PREFERENCE_DARK) {
            return value;
        }

        if (value === 'dark') {
            return THEME_PREFERENCE_DARK;
        }

        if (value === 'light') {
            return THEME_PREFERENCE_LIGHT;
        }
    } catch {
        // Ignore private browsing / storage quota errors.
    }

    return THEME_PREFERENCE_AUTO;
}

function persistPreference(storageKey, preference) {
    try {
        window.localStorage.setItem(storageKey, preference);
    } catch {
        // Ignore private browsing / storage quota errors.
    }
}

function resolveIsDarkMode(preference, followsLocalTime) {
    if (preference === THEME_PREFERENCE_DARK) {
        return true;
    }

    if (preference === THEME_PREFERENCE_LIGHT) {
        return false;
    }

    return followsLocalTime;
}

/**
 * @param {string} storageKey
 * @returns {{ isDarkMode: boolean, themePreference: string, isAutoTheme: boolean, toggleTheme: () => void }}
 */
export function useScheduledTheme(storageKey) {
    const [themePreference, setThemePreference] = useState(() => readStoredPreference(storageKey));
    const [followsLocalTime, setFollowsLocalTime] = useState(() => (
        typeof window !== 'undefined' ? isDarkByLocalTime() : false
    ));

    useEffect(() => {
        if (themePreference !== THEME_PREFERENCE_AUTO) {
            return undefined;
        }

        const syncLocalTime = () => {
            setFollowsLocalTime(isDarkByLocalTime());
        };

        syncLocalTime();

        let timeoutId;
        const scheduleNextBoundary = () => {
            timeoutId = window.setTimeout(() => {
                syncLocalTime();
                scheduleNextBoundary();
            }, msUntilNextThemeBoundary());
        };

        scheduleNextBoundary();

        const intervalId = window.setInterval(syncLocalTime, 60_000);

        return () => {
            window.clearTimeout(timeoutId);
            window.clearInterval(intervalId);
        };
    }, [themePreference]);

    const toggleTheme = useCallback(() => {
        setThemePreference((current) => {
            const next = current === THEME_PREFERENCE_AUTO
                ? THEME_PREFERENCE_LIGHT
                : current === THEME_PREFERENCE_LIGHT
                    ? THEME_PREFERENCE_DARK
                    : THEME_PREFERENCE_AUTO;

            persistPreference(storageKey, next);

            if (next === THEME_PREFERENCE_AUTO) {
                setFollowsLocalTime(isDarkByLocalTime());
            }

            return next;
        });
    }, [storageKey]);

    const isDarkMode = useMemo(
        () => resolveIsDarkMode(themePreference, followsLocalTime),
        [themePreference, followsLocalTime],
    );

    return {
        isDarkMode,
        themePreference,
        isAutoTheme: themePreference === THEME_PREFERENCE_AUTO,
        toggleTheme,
    };
}
