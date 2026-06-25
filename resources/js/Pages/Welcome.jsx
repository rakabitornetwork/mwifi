import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { ChevronRight, Server, UserCircle } from 'lucide-react';
import PullToRefresh from '../Components/PullToRefresh';
import SeoHead from '../Components/SeoHead';
import AppFooter from '../Components/AppFooter';
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
            <PullToRefresh useWindowScroll isDarkMode className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <div className="max-w-lg w-full space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 overflow-hidden">
                                {branding.logo_url ? (
                                    <img src={branding.logo_url} alt={branding.company_name} className="w-full h-full object-contain p-2" />
                                ) : (
                                    <Server className="w-8 h-8" />
                                )}
                            </div>
                            <div>
                                <h1 className="text-3xl font-extrabold tracking-tight text-emerald-400">
                                    {branding.company_name || 'mWiFi RT RW NET'}
                                </h1>
                                <BrandingTagline lines={3} className="text-slate-400 mt-2 font-medium leading-relaxed">
                                    {branding.company_tagline || 'Aplikasi Manajemen Pelanggan & Billing Terintegrasi'}
                                </BrandingTagline>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                {vpsCatalogUrl && (
                                    <Link
                                        href={vpsCatalogUrl}
                                        className="inline-flex items-center justify-center gap-2 flex-1 py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl shadow-lg shadow-violet-600/20 transition-all"
                                    >
                                        <Server className="w-5 h-5" />
                                        Layanan VPS
                                        <ChevronRight className="w-4 h-4 opacity-70" />
                                    </Link>
                                )}
                                <Link
                                    href="/portal"
                                    className="inline-flex items-center justify-center gap-2 flex-1 py-3 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all"
                                >
                                    <UserCircle className="w-5 h-5" />
                                    Portal Pelanggan
                                </Link>
                            </div>
                        </div>

                        <PublicSupportContact branding={branding} variant="light" />

                        <PublicTermsPreview
                            termsDocument={termsDocument}
                            termsSections={termsSections}
                            variant="light"
                        />
                    </div>
                </div>
                <AppFooter
                    branding={branding}
                    legalLinks={legalLinks}
                    className="py-4 px-6 border-t border-slate-800 text-center space-y-2"
                    textClassName="text-xs sm:text-sm text-slate-500 leading-relaxed"
                />
            </PullToRefresh>
        </>
    );
}
