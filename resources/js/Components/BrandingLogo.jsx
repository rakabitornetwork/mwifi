import { Wifi } from 'lucide-react';

const VARIANTS = {
    icon: {
        wide: 'h-9 max-w-[140px] w-auto object-contain shrink-0 mx-auto',
        square: 'h-9 w-9 object-contain shrink-0',
    },
    sidebar: {
        wide: 'h-11 max-w-[220px] w-auto object-contain shrink-0 mx-auto',
        square: 'h-9 w-9 object-contain shrink-0',
    },
    header: {
        wide: 'h-11 sm:h-12 max-w-[min(320px,78vw)] w-auto object-contain shrink-0 mx-auto',
        square: 'h-9 w-9 object-contain shrink-0',
    },
    hero: {
        wide: 'h-16 sm:h-20 max-w-[min(400px,94vw)] w-auto object-contain mx-auto',
        square: 'h-14 w-14 object-contain mx-auto',
    },
    footer: {
        wide: 'h-12 sm:h-14 max-w-[280px] w-auto object-contain shrink-0 mx-auto',
        square: 'w-9 h-9 rounded-lg object-contain shrink-0',
    },
    preview: {
        wide: 'max-h-32 max-w-full w-auto object-contain mx-auto',
        square: 'max-h-24 max-w-full object-contain mx-auto',
    },
};

export function hasWideLogo(branding = {}) {
    return Boolean(branding.logo_wide_url);
}

export default function BrandingLogo({
    branding = {},
    variant = 'header',
    alt,
    className = '',
    fallbackIcon: FallbackIcon = Wifi,
    fallbackClassName = '',
}) {
    const preferWide = !['icon'].includes(variant);
    const wideUrl = branding.logo_wide_url;
    const squareUrl = branding.logo_url;
    const src = preferWide ? (wideUrl || squareUrl) : (squareUrl || wideUrl);
    const isWide = Boolean(src && src === wideUrl);
    const resolvedAlt = alt || branding.company_name || branding.app_name || 'Logo';

    if (!src) {
        if (!FallbackIcon) {
            return null;
        }

        return <FallbackIcon className={fallbackClassName || 'w-7 h-7'} />;
    }

    const sizeClass = isWide ? VARIANTS[variant]?.wide : VARIANTS[variant]?.square;

    return (
        <img
            src={src}
            alt={resolvedAlt}
            className={[sizeClass, className].filter(Boolean).join(' ')}
        />
    );
}
