import React from 'react';
import { Link } from '@inertiajs/react';

export default function AppFooter({
    branding = {},
    className = '',
    textClassName = 'text-xs sm:text-sm leading-relaxed',
    legalLinks = null,
}) {
    const text = branding.footer_copyright;
    const links = legalLinks || branding.legal_links || [];

    if (!text && links.length === 0) {
        return null;
    }

    return (
        <footer className={className}>
            {text && <p className={textClassName}>{text}</p>}
            {links.length > 0 && (
                <p className={`${textClassName} mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1`}>
                    {links.map((link, index) => (
                        <React.Fragment key={link.url}>
                            {index > 0 && <span className="opacity-40">&middot;</span>}
                            <Link href={link.url} className="hover:underline opacity-80 hover:opacity-100">
                                {link.label}
                            </Link>
                        </React.Fragment>
                    ))}
                </p>
            )}
        </footer>
    );
}
