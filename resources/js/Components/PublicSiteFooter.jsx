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
        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-white text-sm font-extrabold shadow-sm ${isDark ? 'bg-indigo-600' : 'bg-sky-600'}`}>
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
        <footer className={`mt-auto border-t ${isDark ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200/90 bg-slate-100/90 text-slate-500'}`}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10 md:gap-8">
                    <div>
                        <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group min-w-0">
                            <BrandMark branding={branding} isDark={isDark} />
                            {!hasWideLogo(branding) && (
                            <span className={`text-sm font-extrabold tracking-[0.12em] transition-colors ${isDark ? 'text-slate-200 group-hover:text-indigo-400' : 'text-slate-800 group-hover:text-sky-700'}`}>
                                {brandLabel}
                            </span>
                            )}
                        </Link>
                        <p className={`text-sm leading-relaxed max-w-md ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {tagline}
                        </p>
                    </div>

                    <div>
                        <h4 className={`text-sm font-bold mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Layanan</h4>
                        <ul className="space-y-2">
                            {serviceLinks.map((item) => (
                                <li key={item.label}>
                                    <Link
                                        href={item.href}
                                        className={`text-sm transition-colors ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-sky-600 hover:text-sky-700'}`}
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className={`text-sm font-bold mb-3 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Kebijakan</h4>
                        <ul className="space-y-2">
                            {policies.map((link) => (
                                <li key={link.url}>
                                    <Link
                                        href={link.url}
                                        className={`text-sm transition-colors ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-sky-600 hover:text-sky-700'}`}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className={`mt-10 pt-5 border-t text-xs sm:text-sm ${
                    isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500'
                } ${centerCopyright ? 'text-center' : 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'}`}>
                    <span>{copyright}</span>
                    {showContactLine && contactLine && !centerCopyright && <span>{contactLine}</span>}
                </div>
            </div>
        </footer>
    );
}
