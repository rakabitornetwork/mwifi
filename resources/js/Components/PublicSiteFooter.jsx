import { Link } from '@inertiajs/react';
import BrandingLogo, { hasWideLogo } from './BrandingLogo';

const DEFAULT_TAGLINE =
    'Penyedia jasa teknologi informasi: pembuatan website & aplikasi, cloud VPS & web hosting, '
    + 'serta konsultasi IT dan instalasi jaringan kantor di Indonesia.';

function BrandMark({ branding, isDark }) {
    if (branding.logo_wide_url || branding.logo_url) {
        return (
            <BrandingLogo
                branding={branding}
                variant="footer"
                alt=""
            />
        );
    }

    const letter = (branding.company_name || branding.app_name || 'T').charAt(0).toUpperCase();

    return (
        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-md text-sm font-medium shadow-sm ${isDark ? 'bg-[#c9b896] text-[#0a0908]' : 'bg-[#1a1814] text-[#f0ebe3]'}`}>
            {letter}
        </span>
    );
}

export default function PublicSiteFooter({
    branding = {},
    legalLinks = null,
    vpsCatalogUrl = null,
    isDark = false,
    showContactLine = true,
    centerCopyright = false,
}) {
    const companyName = branding.company_name || branding.display_name || 'Teslatech';
    const brandLabel = companyName.toUpperCase();
    const tagline = branding.seo?.description || DEFAULT_TAGLINE;
    const email = branding.company_email || '';
    const phone = branding.company_phone || '';
    const policies = legalLinks || branding.legal_links || [];
    const year = new Date().getFullYear();
    const copyright = branding.footer_copyright || `© ${year} ${companyName}. Seluruh hak cipta dilindungi.`;

    const serviceLinks = [
        { label: 'Jasa Pembuatan Aplikasi', href: '#fitur' },
        { label: 'Setting & Maintenance WiFi', href: '#fitur' },
        ...(vpsCatalogUrl ? [{ label: 'Sewa VPS Cloud Premium', href: vpsCatalogUrl }] : []),
        { label: 'Layanan IT Support & Umum', href: '#fitur' },
    ];

    const contactLine = [email, phone].filter(Boolean).join(' · ');

    return (
        <footer className={`mt-auto border-t ${isDark ? 'border-[#c9b896]/10 bg-[#0a0908] text-[#9a958c]' : 'border-[#2a2824]/08 bg-[#e3e1dc] text-[#6e6a62]'}`}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10 md:gap-8">
                    <div>
                        <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group min-w-0">
                            <BrandMark branding={branding} isDark={isDark} />
                            {!hasWideLogo(branding) && (
                            <span className={`font-display text-lg font-medium tracking-[0.06em] transition-colors ${isDark ? 'text-[#f0ebe3] group-hover:text-[#c9b896]' : 'text-[#1a1814] group-hover:text-[#8a7355]'}`}>
                                {brandLabel}
                            </span>
                            )}
                        </Link>
                        <p className={`text-sm leading-relaxed max-w-md ${isDark ? 'text-[#9a958c]' : 'text-[#6e6a62]'}`}>
                            {tagline}
                        </p>
                    </div>

                    <div>
                        <h4 className={`text-[11px] font-medium uppercase tracking-[0.2em] mb-4 ${isDark ? 'text-[#c9b896]' : 'text-[#8a7355]'}`}>Layanan</h4>
                        <ul className="space-y-2.5">
                            {serviceLinks.map((item) => (
                                <li key={item.label}>
                                    <Link
                                        href={item.href}
                                        className={`text-sm transition-colors ${isDark ? 'text-[#9a958c] hover:text-[#c9b896]' : 'text-[#6e6a62] hover:text-[#8a7355]'}`}
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className={`text-[11px] font-medium uppercase tracking-[0.2em] mb-4 ${isDark ? 'text-[#c9b896]' : 'text-[#8a7355]'}`}>Kebijakan</h4>
                        <ul className="space-y-2.5">
                            {policies.map((link) => (
                                <li key={link.url}>
                                    <Link
                                        href={link.url}
                                        className={`text-sm transition-colors ${isDark ? 'text-[#9a958c] hover:text-[#c9b896]' : 'text-[#6e6a62] hover:text-[#8a7355]'}`}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className={`mt-10 pt-5 border-t text-xs sm:text-sm ${
                    isDark ? 'border-[#c9b896]/10 text-[#5c5850]' : 'border-[#2a2824]/08 text-[#9a958c]'
                } ${centerCopyright ? 'text-center' : 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'}`}>
                    <span>{copyright}</span>
                    {showContactLine && contactLine && !centerCopyright && <span>{contactLine}</span>}
                </div>
            </div>
        </footer>
    );
}
