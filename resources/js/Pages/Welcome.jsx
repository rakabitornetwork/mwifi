import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, Server, UserCircle } from 'lucide-react';
import PullToRefresh from '../Components/PullToRefresh';
import SeoHead from '../Components/SeoHead';
import PublicSiteFooter from '../Components/PublicSiteFooter';
import BrandingTagline from '../Components/BrandingTagline';
import PublicSupportContact from '../Components/PublicSupportContact';
import PublicTermsPreview from '../Components/PublicTermsPreview';

export default function Welcome({
    termsDocument = null,
    termsSections = [],
    legalLinks = [],
    vpsCatalogUrl = null,
}) {
    const { branding = {} } = usePage().props;

    return (
        <>
            <SeoHead title="Selamat Datang" branding={branding} />
            <PullToRefresh useWindowScroll className="min-h-screen flex flex-col bg-[#f4f7fb] text-slate-700 font-sans">
                <div className="flex-1 flex flex-col items-center justify-center p-6 py-12">
                    <div className="max-w-lg w-full space-y-6">
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-8 shadow-sm text-center space-y-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 overflow-hidden">
                                {branding.logo_url ? (
                                    <img src={branding.logo_url} alt={branding.company_name} className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Server className="w-8 h-8" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
                                    {branding.company_name || 'Teslatech'}
                                </h1>
                                <BrandingTagline lines={3} className="text-slate-500 mt-2 font-medium leading-relaxed">
                                    {branding.company_tagline || 'Penyedia jasa teknologi informasi profesional'}
                                </BrandingTagline>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                {vpsCatalogUrl && (
                                    <Link
                                        href={vpsCatalogUrl}
                                        className="inline-flex items-center justify-center gap-2 flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md shadow-sky-600/15 transition-all"
                                    >
                                        <Server className="w-5 h-5" />
                                        Layanan VPS
                                        <ChevronRight className="w-4 h-4 opacity-80" />
                                    </Link>
                                )}
                                <Link
                                    href="/portal"
                                    className="inline-flex items-center justify-center gap-2 flex-1 py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-xl border border-slate-200 transition-all"
                                >
                                    <UserCircle className="w-5 h-5 text-sky-600" />
                                    Portal Pelanggan
                                </Link>
                            </div>
                        </div>

                        <PublicSupportContact branding={branding} />

                        <PublicTermsPreview
                            termsDocument={termsDocument}
                            termsSections={termsSections}
                        />
                    </div>
                </div>
                <PublicSiteFooter
                    branding={branding}
                    legalLinks={legalLinks}
                    vpsCatalogUrl={vpsCatalogUrl || '/layanan/vps'}
                />
            </PullToRefresh>
        </>
    );
}
