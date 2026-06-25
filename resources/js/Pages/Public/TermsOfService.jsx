import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, FileText, Server } from 'lucide-react';
import SeoHead from '../../Components/SeoHead';
import AppFooter from '../../Components/AppFooter';
import PublicSupportContact from '../../Components/PublicSupportContact';

export default function TermsOfService({ termsSections = [], vpsCatalogUrl = null }) {
    const { branding = {} } = usePage().props;

    return (
        <>
            <SeoHead title="Syarat & Ketentuan" branding={branding} />
            <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 font-sans antialiased">
                <header className="border-b border-white/[0.06] bg-[#070b14]/90 backdrop-blur-xl">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            Beranda
                        </Link>
                        {vpsCatalogUrl && (
                            <Link
                                href={vpsCatalogUrl}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs font-bold text-slate-200 hover:bg-white/10 transition-colors"
                            >
                                <Server className="w-3.5 h-3.5" />
                                Layanan VPS
                            </Link>
                        )}
                    </div>
                </header>

                <main className="flex-1 py-10 sm:py-14">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/25 bg-violet-500/10 text-violet-300 text-[11px] font-bold uppercase tracking-widest mb-4">
                                <FileText className="w-3 h-3" />
                                Legal
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                                Syarat & Ketentuan
                            </h1>
                            <p className="text-slate-400 mt-3 text-sm leading-relaxed">
                                Ketentuan penggunaan website dan layanan {branding.company_name || 'kami'}.
                            </p>
                        </div>

                        <article className="space-y-6">
                            {termsSections.map((section) => (
                                <section
                                    key={section.title}
                                    className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6"
                                >
                                    <h2 className="text-base font-bold text-white">{section.title}</h2>
                                    <p className="text-sm text-slate-400 mt-2 leading-relaxed whitespace-pre-line">
                                        {section.body}
                                    </p>
                                </section>
                            ))}
                        </article>

                        <PublicSupportContact branding={branding} variant="vps" />
                    </div>
                </main>

                <AppFooter
                    branding={branding}
                    className="py-5 px-6 border-t border-white/[0.06] text-center"
                    textClassName="text-xs text-slate-600 leading-relaxed"
                />
            </div>
        </>
    );
}
