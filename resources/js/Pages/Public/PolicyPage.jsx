import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, FileText, Server } from 'lucide-react';
import SeoHead from '../../Components/SeoHead';
import PublicSiteFooter from '../../Components/PublicSiteFooter';
import PublicSupportContact from '../../Components/PublicSupportContact';
import { PolicySection, formatLegalText } from '../../Components/PolicySection';

export default function PolicyPage({
    policy = {},
    legalLinks = [],
    vpsCatalogUrl = null,
}) {
    const { branding = {} } = usePage().props;
    const {
        page_title: pageTitle = 'Kebijakan',
        meta_description: metaDescription = '',
        last_updated: lastUpdated = null,
        introduction = null,
        sections = [],
    } = policy;

    return (
        <>
            <SeoHead title={pageTitle} description={metaDescription} branding={branding} />
            <div className="min-h-screen flex flex-col bg-[#f4f7fb] text-slate-700 font-sans antialiased">
                <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl shadow-sm shadow-slate-200/30">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-700 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            Beranda
                        </Link>
                        {vpsCatalogUrl && (
                            <Link
                                href={vpsCatalogUrl}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                <Server className="w-3.5 h-3.5 text-sky-600" />
                                Layanan VPS
                            </Link>
                        )}
                    </div>
                </header>

                <main className="flex-1 py-10 sm:py-14">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700 text-[11px] font-bold uppercase tracking-widest mb-4">
                                <FileText className="w-3 h-3" />
                                Legal
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-800">
                                {pageTitle}
                            </h1>
                            {lastUpdated && (
                                <p className="text-sky-600 text-xs font-semibold mt-3">
                                    Terakhir diperbarui: {lastUpdated}
                                </p>
                            )}
                            {introduction && (
                                <p className="text-slate-500 mt-4 text-sm leading-relaxed">
                                    {formatLegalText(introduction)}
                                </p>
                            )}
                        </div>

                        {legalLinks.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {legalLinks.map((link) => (
                                    <Link
                                        key={link.url}
                                        href={link.url}
                                        className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wide transition-colors ${
                                            link.active
                                                ? 'border-sky-300 bg-sky-50 text-sky-700'
                                                : 'border-slate-200 bg-white text-slate-500 hover:text-sky-700 hover:border-sky-200'
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        )}

                        <article className="space-y-6">
                            {sections.map((section) => (
                                <PolicySection key={section.title} section={section} />
                            ))}
                        </article>

                        <PublicSupportContact branding={branding} />
                    </div>
                </main>

                <PublicSiteFooter
                    branding={branding}
                    legalLinks={legalLinks}
                    vpsCatalogUrl={vpsCatalogUrl || '/layanan/vps'}
                />
            </div>
        </>
    );
}
