import { createRoot } from 'react-dom/client';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

let brandingAppName = 'mWiFi';

const resolveSiteTitle = (branding) => branding?.seo?.title || branding?.app_name || brandingAppName;

createInertiaApp({
    title: (title) => {
        const siteName = brandingAppName;
        if (!title) {
            return siteName;
        }
        if (title === siteName) {
            return siteName;
        }
        return `${title} — ${siteName}`;
    },
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        brandingAppName = resolveSiteTitle(props.initialPage?.props?.branding) || brandingAppName;
        createRoot(el).render(<App {...props} />);
    },
});

router.on('success', (event) => {
    const resolved = resolveSiteTitle(event.detail.page.props?.branding);
    if (resolved) {
        brandingAppName = resolved;
    }
});
