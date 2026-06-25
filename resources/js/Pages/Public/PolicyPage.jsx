import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, FileText } from 'lucide-react';
import SeoHead from '../../Components/SeoHead';
import PublicSiteFooter from '../../Components/PublicSiteFooter';
import PublicSupportContact from '../../Components/PublicSupportContact';
import { PolicySection, formatLegalText } from '../../Components/PolicySection';

export default function PolicyPage({
    policy = {},
    legalLinks = [],
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
            <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200 font-sans antialiased selection:bg-indigo-600/40 selection:text-indigo-200">
                <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-400 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            Beranda
                        </Link>
                    </div>
                </header>

                <main className="flex-1 py-10 sm:py-14">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[11px] font-bold uppercase tracking-widest mb-4">
                                <FileText className="w-3 h-3" />
                                Legal
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                                {pageTitle}
                            </h1>
                            {lastUpdated && (
                                <p className="text-indigo-400 text-xs font-semibold mt-3">
                                    Terakhir diperbarui: {lastUpdated}
                                </p>
                            )}
                            {introduction && (
                                <p className="text-slate-450 mt-4 text-sm leading-relaxed">
                                    {formatLegalText(introduction, true)}
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
                                                ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400'
                                                : 'border-slate-900 bg-slate-900/40 text-slate-400 hover:text-indigo-400 hover:border-slate-700'
                                        }`}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        )}

                        <article className="space-y-6">
                            {sections.map((section) => (
                                <PolicySection key={section.title} section={section} isDark={true} />
                            ))}
                        </article>

                        <PublicSupportContact branding={branding} isDark={true} />
                    </div>
                </main>

                <PublicSiteFooter
                    branding={branding}
                    legalLinks={legalLinks}
                    isDark={true}
                />
            </div>
        </>
    );
}
