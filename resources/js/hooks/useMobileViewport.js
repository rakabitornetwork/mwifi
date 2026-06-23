import { useEffect, useState } from 'react';

const MOBILE_MEDIA_QUERY = '(max-width: 639px)';

export function useMobileViewport() {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
        const onChange = (event) => setIsMobile(event.matches);

        mediaQuery.addEventListener('change', onChange);
        setIsMobile(mediaQuery.matches);

        return () => mediaQuery.removeEventListener('change', onChange);
    }, []);

    return isMobile;
}
