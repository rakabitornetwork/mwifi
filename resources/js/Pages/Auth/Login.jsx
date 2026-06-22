import React from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { Mail, Lock, LogIn, ShieldAlert, Wifi } from 'lucide-react';
import SeoHead from '../../Components/SeoHead';
import AppFooter from '../../Components/AppFooter';
import BrandingTagline from '../../Components/BrandingTagline';

export default function Login() {
    const { branding = {} } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <>
            <SeoHead title="Login Admin" branding={branding} />
            <div className="min-h-screen flex flex-col bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/20 via-slate-950 to-slate-950 font-sans">
                <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl space-y-6">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2 overflow-hidden">
                            {branding.logo_url ? (
                                <img src={branding.logo_url} alt={branding.company_name} className="w-full h-full object-contain p-2" />
                            ) : (
                                <Wifi className="w-7 h-7" />
                            )}
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-white">Selamat Datang</h2>
                        <p className="text-slate-400 text-sm">
                            Masuk ke Panel Kontrol {branding.company_name || branding.app_name || 'mWiFi'}
                        </p>
                        <BrandingTagline lines={3} className="text-slate-500 text-[11px] leading-relaxed">
                            {branding.company_tagline}
                        </BrandingTagline>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {errors.email && (
                            <div className="flex items-center space-x-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                                <span>{errors.email}</span>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Email</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                                    <Mail className="w-5 h-5" />
                                </span>
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="admin@mwifi.test"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Password</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                                    <Lock className="w-5 h-5" />
                                </span>
                                <input
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center space-x-2 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="w-4.5 h-4.5 bg-slate-950 border-slate-800 rounded text-emerald-500 focus:ring-0 focus:ring-offset-0 focus:outline-none accent-emerald-500"
                                />
                                <span className="text-sm text-slate-400 font-medium">Ingat Saya</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
                        >
                            <LogIn className="w-5 h-5" />
                            <span>{processing ? 'Memproses...' : 'Masuk'}</span>
                        </button>
                    </form>
                </div>
                </div>
                <AppFooter
                    branding={branding}
                    className="py-4 px-6 border-t border-slate-800/80 text-center"
                    textClassName="text-[11px] text-slate-500"
                />
            </div>
        </>
    );
}
