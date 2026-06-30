import { Wifi } from 'lucide-react';

const VARIANTS = {
    icon: {
        wide: 'h-8 max-w-[120px] w-auto object-contain shrink-0',
        square: 'h-8 w-8 object-contain shrink-0',
    },
    sidebar: {
        wide: 'h-8 max-w-[148px] w-auto object-contain shrink-0',
        square: 'h-9 w-9 object-contain shrink-0',
    },
    header: {
        wide: 'h-9 max-w-[200px] w-auto object-contain shrink-0',
        square: 'h-9 w-9 object-contain shrink-0',
    },
    hero: {
        wide: 'h-12 sm:h-14 max-w-[min(280px,88vw)] w-auto object-contain',
        square: 'h-14 w-14 object-contain',
    },
    footer: {
        wide: 'h-9 max-w-[180px] w-auto object-contain shrink-0',
        square: 'w-9 h-9 rounded-lg object-contain shrink-0',
    },
    preview: {
        wide: 'max-h-24 max-w-full w-auto object-contain',
        square: 'max-h-20 max-w-full object-contain',
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
