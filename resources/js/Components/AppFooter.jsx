import React from 'react';

export default function AppFooter({ branding = {}, className = '', textClassName = 'text-xs sm:text-sm leading-relaxed' }) {
    const text = branding.footer_copyright;

    if (!text) {
        return null;
    }

    return (
        <footer className={className}>
            <p className={textClassName}>{text}</p>
        </footer>
    );
}
