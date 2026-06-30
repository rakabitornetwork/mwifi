import React, { useEffect } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import { Phone, ShieldAlert, Wifi, MessageCircle, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import PullToRefresh from '../../Components/PullToRefresh';
import SeoHead from '../../Components/SeoHead';
import AppFooter from '../../Components/AppFooter';
import BrandingTagline from '../../Components/BrandingTagline';
import BrandingLogo, { hasWideLogo } from '../../Components/BrandingLogo';

export default function CustomerLogin({ phone: initialPhone = '', otp_sent: otpSent = false, masked_phone: maskedPhone = null }) {
    const { branding = {}, flash = {} } = usePage().props;

    const requestForm = useForm({
        phone_number: initialPhone,
    });

    const verifyForm = useForm({
        phone_number: initialPhone,
        otp: '',
    });

    useEffect(() => {
        requestForm.setData('phone_number', initialPhone);
        verifyForm.setData('phone_number', initialPhone);
    }, [initialPhone]);

    const handleRequestOtp = (e) => {
        e.preventDefault();
        requestForm.post('/portal/otp/request');
    };

    const handleVerifyOtp = (e) => {
        e.preventDefault();
        verifyForm.post('/portal/otp/verify');
    };

    const handleChangePhone = () => {
        verifyForm.post('/portal/otp/reset');
    };

    return (
        <>
            <SeoHead title="Portal Pelanggan" branding={branding} />
            <PullToRefresh
                useWindowScroll
                isDarkMode
                className="relative min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-950/20 via-slate-950 to-slate-950 font-sans"
                contentClassName="min-h-screen flex flex-col"
            >
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full max-w-md bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl space-y-6">
                        <div className="text-center space-y-2">
                            {hasWideLogo(branding) ? (
                                <div className="flex justify-center w-full mb-4 px-2">
                                    <BrandingLogo branding={branding} variant="hero" alt={branding.company_name} />
                                </div>
                            ) : (
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-2 overflow-hidden">
                                    <BrandingLogo branding={branding} variant="hero" alt={branding.company_name} fallbackClassName="w-7 h-7" />
                                </div>
                            )}
                            <h2 className="text-2xl font-bold tracking-tight text-white">Portal Pelanggan</h2>
                            <p className="text-slate-400 text-sm">
                                Masuk dengan OTP WhatsApp ke nomor yang terdaftar
                            </p>
                            <BrandingTagline lines={2} className="text-slate-500 text-[11px] leading-relaxed">
                                {branding.company_tagline}
                            </BrandingTagline>
                        </div>

                        {flash.success && (
                            <div className="flex items-start space-x-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <span>{flash.success}</span>
                            </div>
                        )}

                        {!otpSent ? (
                            <form onSubmit={handleRequestOtp} className="space-y-4">
                                {requestForm.errors.phone_number && (
                                    <div className="flex items-center space-x-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                                        <span>{requestForm.errors.phone_number}</span>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                                        Nomor WhatsApp
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                                            <Phone className="w-5 h-5" />
                                        </span>
                                        <input
                                            type="tel"
                                            value={requestForm.data.phone_number}
                                            onChange={(e) => requestForm.setData('phone_number', e.target.value)}
                                            placeholder="08xxxxxxxxxx"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all duration-200"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-500 pt-1">
                                        Gunakan nomor yang sama saat pendaftaran layanan internet Anda.
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={requestForm.processing}
                                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg shadow-sky-500/20 hover:shadow-sky-400/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                    <span>{requestForm.processing ? 'Mengirim...' : 'Kirim Kode OTP'}</span>
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOtp} className="space-y-4">
                                {verifyForm.errors.otp && (
                                    <div className="flex items-center space-x-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                                        <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                                        <span>{verifyForm.errors.otp}</span>
                                    </div>
                                )}

                                <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 text-sm text-slate-300">
                                    <p>
                                        Kode OTP dikirim ke WhatsApp{' '}
                                        <span className="font-semibold text-white">{maskedPhone || 'nomor Anda'}</span>.
                                    </p>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                                        Kode OTP (6 digit)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                                            <KeyRound className="w-5 h-5" />
                                        </span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            maxLength={6}
                                            value={verifyForm.data.otp}
                                            onChange={(e) => verifyForm.setData('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="123456"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white text-center text-xl tracking-[0.4em] font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition-all duration-200"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={verifyForm.processing || verifyForm.data.otp.length !== 6}
                                    className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl shadow-lg shadow-sky-500/20 hover:shadow-sky-400/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
                                >
                                    <KeyRound className="w-5 h-5" />
                                    <span>{verifyForm.processing ? 'Memverifikasi...' : 'Masuk ke Portal'}</span>
                                </button>

                                <div className="flex items-center justify-between gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={handleChangePhone}
                                        className="flex items-center space-x-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        <span>Ganti nomor</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => requestForm.post('/portal/otp/request')}
                                        disabled={requestForm.processing}
                                        className="text-sm text-sky-400 hover:text-sky-300 transition-colors disabled:opacity-50 cursor-pointer"
                                    >
                                        {requestForm.processing ? 'Mengirim...' : 'Kirim ulang OTP'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
                <AppFooter
                    branding={branding}
                    className="shrink-0 py-4 px-6 text-center"
                    textClassName="text-xs sm:text-sm text-slate-500 leading-relaxed"
                />
            </PullToRefresh>
        </>
    );
}
