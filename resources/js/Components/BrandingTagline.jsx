/**
 * Branding tagline / subjudul dengan pembatas baris agar tidak overlap.
 */
export default function BrandingTagline({
    children,
    className = '',
    lines = 2,
    title,
    as: Component = 'span',
}) {
    if (children == null || children === '') {
        return null;
    }

    const text = typeof children === 'string' ? children : null;
    const lineClampClass = lines === 1
        ? 'line-clamp-1'
        : lines === 3
            ? 'line-clamp-3'
            : 'line-clamp-2';

    return (
        <Component
            title={title ?? text ?? undefined}
            className={`block min-w-0 break-words [overflow-wrap:anywhere] leading-snug ${lineClampClass} ${className}`}
        >
            {children}
        </Component>
    );
}

export function BrandingCompanyName({
    children,
    className = '',
    title,
    as: Component = 'span',
}) {
    if (children == null || children === '') {
        return null;
    }

    const text = typeof children === 'string' ? children : null;

    return (
        <Component
            title={title ?? text ?? undefined}
            className={`block min-w-0 truncate leading-tight ${className}`}
        >
            {children}
        </Component>
    );
}
