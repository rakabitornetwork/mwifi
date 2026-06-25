import React from 'react';
import { Link } from '@inertiajs/react';

export default function AppFooter({
    branding = {},
    className = '',
    textClassName = 'text-xs sm:text-sm leading-relaxed',
    termsUrl = null,
}) {
    const text = branding.footer_copyright;
    const resolvedTermsUrl = termsUrl || branding.terms_url || '/syarat-ketentuan';

    if (!text && !resolvedTermsUrl) {
        return null;
    }

    return (
        <footer className={className}>
            {text && <p className={textClassName}>{text}</p>}
            {resolvedTermsUrl && (
                <p className={`${textClassName} mt-2`}>
                    <Link href={resolvedTermsUrl} className="hover:underline opacity-80 hover:opacity-100">
                        Syarat & Ketentuan
                    </Link>
                </p>
            )}
        </footer>
    );
}
