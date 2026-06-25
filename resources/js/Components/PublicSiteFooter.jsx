import { Link } from '@inertiajs/react';

const DEFAULT_TAGLINE =
    'Penyedia jasa teknologi informasi: pembuatan website & aplikasi, cloud VPS & web hosting, '
    + 'serta konsultasi IT dan instalasi jaringan kantor di Indonesia.';

function BrandMark({ branding }) {
    if (branding.logo_url) {
        return (
            <img
                src={branding.logo_url}
                alt=""
                className="w-9 h-9 rounded-lg object-contain bg-white border border-slate-200 p-1"
            />
        );
    }

    const letter = (branding.company_name || branding.app_name || 'T').charAt(0).toUpperCase();

    return (
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-sky-600 text-white text-sm font-extrabold shadow-sm">
            {letter}
        </span>
    );
}

export default function PublicSiteFooter({
    branding = {},
    legalLinks = null,
    vpsCatalogUrl = '/layanan/vps',
}) {
    const companyName = branding.company_name || branding.display_name || 'Teslatech';
    const brandLabel = companyName.toUpperCase();
    const tagline = branding.company_tagline || DEFAULT_TAGLINE;
    const email = branding.company_email || '';
    const phone = branding.company_phone || '';
    const policies = legalLinks || branding.legal_links || [];
    const year = new Date().getFullYear();
    const copyright = branding.footer_copyright || `© ${year} ${companyName}. Seluruh hak cipta dilindungi.`;

    const serviceLinks = [
        { label: 'Pembuatan Website & Aplikasi', href: '/' },
        { label: 'Cloud VPS & Web Hosting', href: vpsCatalogUrl || '/layanan/vps' },
        { label: 'Konsultasi IT & Instalasi LAN', href: `${vpsCatalogUrl || '/layanan/vps'}#kontak` },
    ];

    const contactLine = [email, phone].filter(Boolean).join(' · ');

    return (
        <footer className="mt-auto border-t border-slate-200/90 bg-slate-100/90">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10 md:gap-8">
                    <div>
                        <Link href="/" className="inline-flex items-center gap-2.5 mb-4 group">
                            <BrandMark branding={branding} />
                            <span className="text-sm font-extrabold tracking-[0.12em] text-slate-800 group-hover:text-sky-700 transition-colors">
                                {brandLabel}
                            </span>
                        </Link>
                        <p className="text-sm leading-relaxed text-slate-500 max-w-md">
                            {tagline}
                        </p>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-3">Layanan</h4>
                        <ul className="space-y-2">
                            {serviceLinks.map((item) => (
                                <li key={item.label}>
                                    <Link
                                        href={item.href}
                                        className="text-sm text-sky-600 hover:text-sky-700 transition-colors"
                                    >
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-3">Kebijakan</h4>
                        <ul className="space-y-2">
                            {policies.map((link) => (
                                <li key={link.url}>
                                    <Link
                                        href={link.url}
                                        className="text-sm text-sky-600 hover:text-sky-700 transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="mt-10 pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs sm:text-sm text-slate-500">
                    <span>{copyright}</span>
                    {contactLine && <span>{contactLine}</span>}
                </div>
            </div>
        </footer>
    );
}
