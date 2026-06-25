import { useState } from 'react';
import { usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    ChevronRight,
    Cpu,
    Globe,
    HardDrive,
    Headphones,
    Lock,
    Network,
    Server,
    Shield,
    Sparkles,
    Zap,
} from 'lucide-react';
import SeoHead from '../../Components/SeoHead';
import AppFooter from '../../Components/AppFooter';
import PublicSupportContact from '../../Components/PublicSupportContact';
import { formatRupiah } from '../../utils/formatRupiah';

const INCLUDED_FEATURES = [
    { icon: Zap, label: 'SSD NVMe performa tinggi' },
    { icon: Globe, label: 'Panel manajemen server' },
    { icon: Network, label: 'IPv4 dedicated' },
    { icon: HardDrive, label: 'Backup mingguan otomatis' },
    { icon: Shield, label: 'Monitoring 24/7' },
    { icon: Headphones, label: 'Dukungan teknis via WhatsApp' },
];

const TRUST_STATS = [
    { value: '99.9%', label: 'Uptime SLA' },
    { value: '< 5 ms', label: 'Latency lokal' },
    { value: 'Tier-3', label: 'Data center' },
    { value: '24/7', label: 'NOC support' },
];

const PAYMENT_METHODS = ['QRIS', 'GoPay', 'ShopeePay', 'OVO', 'DANA', 'Virtual Account', 'Alfamart'];

function GridBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_60%,transparent_100%)]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/20 rounded-full blur-[120px]" />
            <div className="absolute top-32 right-0 w-[400px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px]" />
        </div>
    );
}

function SpecRow({ icon: Icon, label, value }) {
    return (
        <li className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.06] last:border-0">
            <span className="flex items-center gap-2.5 text-sm text-slate-400">
                <Icon className="w-4 h-4 text-violet-400/80 shrink-0" />
                {label}
            </span>
            <span className="text-sm font-semibold text-slate-200 text-right">{value}</span>
        </li>
    );
}

export default function VpsCatalog({
    pageTitle,
    pageDescription,
    plans = [],
    canOrder = false,
    guestVerification = false,
    isLoggedIn = false,
    customerName = null,
    activeGateway = 'midtrans',
    legalLinks = [],
}) {
    const { branding = {} } = usePage().props;
    const [orderingPlan, setOrderingPlan] = useState(null);
    const [toast, setToast] = useState(null);

    const gatewayLabel = activeGateway
        ? activeGateway.charAt(0).toUpperCase() + activeGateway.slice(1)
        : 'Gateway';

    const showToast = (message, type = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4500);
    };

    const handleOrder = async (planId) => {
        if (!canOrder) {
            showToast(
                guestVerification
                    ? 'Verifikasi pembayaran belum tersedia. Hubungi administrator.'
                    : 'Halaman verifikasi gateway belum dikonfigurasi. Hubungi administrator.',
            );
            return;
        }

        setOrderingPlan(planId);

        try {
            const response = await fetch('/layanan/vps/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    plan_id: planId,
                    payment_method: activeGateway === 'midtrans' || activeGateway === 'duitku' ? 'all' : 'qris',
                }),
            });

            const result = await response.json();

            if (response.status === 401 && result.login_url) {
                showToast('Sesi verifikasi tidak valid. Muat ulang halaman atau gunakan link demo dari admin.');
                return;
            }

            if (result.success && result.payment_url) {
                window.location.href = result.payment_url;
                return;
            }

            showToast(result.message || 'Gagal memproses pembayaran.');
        } catch {
            showToast('Terjadi kesalahan koneksi. Coba lagi.');
        } finally {
            setOrderingPlan(null);
        }
    };

    const getCtaLabel = (planId) => {
        if (orderingPlan === planId) return 'Memproses...';
        if (!canOrder) return 'Verifikasi Belum Siap';
        if (guestVerification) return 'Coba Pembayaran';
        if (isLoggedIn) return 'Pesan Sekarang';
        return 'Coba Pembayaran';
    };

    return (
        <>
            <SeoHead title={pageTitle} description={pageDescription} branding={branding} />
            <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 font-sans antialiased">
                {toast && (
                    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] px-4 py-3 rounded-2xl border text-sm font-medium shadow-2xl backdrop-blur-md ${
                        toast.type === 'error'
                            ? 'bg-rose-950/90 border-rose-500/30 text-rose-100'
                            : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100'
                    }`}>
                        {toast.message}
                    </div>
                )}

                {/* Header */}
                <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#070b14]/80 backdrop-blur-xl">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            {branding.logo_url ? (
                                <img src={branding.logo_url} alt="" className="w-9 h-9 rounded-xl object-contain bg-white/5 border border-white/10 p-1" />
                            ) : (
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                                    <Server className="w-4 h-4 text-white" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-white truncate tracking-tight">
                                    {branding.company_name || 'Cloud VPS'}
                                </p>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
                                    Enterprise Cloud Hosting
                                </p>
                            </div>
                        </div>

                        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
                            <a href="#paket" className="hover:text-white transition-colors">Paket</a>
                            <a href="#fitur" className="hover:text-white transition-colors">Fitur</a>
                            <a href="#pembayaran" className="hover:text-white transition-colors">Pembayaran</a>
                            <a href="#kontak" className="hover:text-white transition-colors">Kontak</a>
                        </nav>

                        {(guestVerification || (isLoggedIn && canOrder)) ? (
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs font-semibold text-white">{customerName}</p>
                                    <p className={`text-[10px] font-bold uppercase tracking-wide ${canOrder ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {canOrder
                                            ? `${gatewayLabel} · ${guestVerification ? 'uji coba tanpa login' : 'siap memesan'}`
                                            : `${gatewayLabel} · akses terbatas`}
                                    </p>
                                </div>
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                                    canOrder
                                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                                        : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                                }`}>
                                    {canOrder ? <Check className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                </div>
                            </div>
                        ) : !isLoggedIn ? (
                            <div className="hidden sm:block text-right shrink-0">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-amber-400">
                                    Verifikasi belum dikonfigurasi
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs font-semibold text-white">{customerName}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-amber-400">
                                        {gatewayLabel} · akses terbatas
                                    </p>
                                </div>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center border bg-amber-500/10 border-amber-500/25 text-amber-400">
                                    <Lock className="w-4 h-4" />
                                </div>
                            </div>
                        )}
                    </div>
                </header>

                <main className="flex-1">
                    {/* Hero */}
                    <section className="relative overflow-hidden">
                        <GridBackground />
                        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
                            <div className="max-w-3xl">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/25 bg-violet-500/10 text-violet-300 text-[11px] font-bold uppercase tracking-widest mb-6">
                                    <Sparkles className="w-3 h-3" />
                                    Cloud Infrastructure
                                </div>
                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
                                    {pageTitle}
                                </h1>
                                <p className="mt-5 text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl">
                                    {pageDescription}
                                </p>
                                {guestVerification && (
                                    <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 max-w-2xl">
                                        Halaman uji coba payment gateway. Pilih paket di bawah untuk langsung menuju halaman
                                        pembayaran {gatewayLabel} — <strong>tanpa login WhatsApp</strong> atau pendaftaran akun.
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-3 mt-8">
                                    <a
                                        href="#paket"
                                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold shadow-xl shadow-violet-600/25 transition-all hover:shadow-violet-500/30"
                                    >
                                        Lihat Paket
                                        <ChevronRight className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>

                            {/* Trust stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-14 sm:mt-20">
                                {TRUST_STATS.map((stat) => (
                                    <div
                                        key={stat.label}
                                        className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm px-4 py-4 text-center"
                                    >
                                        <p className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{stat.value}</p>
                                        <p className="text-[10px] sm:text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Pricing */}
                    <section id="paket" className="relative py-16 sm:py-24">
                        <div className="max-w-6xl mx-auto px-4 sm:px-6">
                            <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
                                <p className="text-violet-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Pricing</p>
                                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                                    Paket VPS untuk Setiap Skala
                                </h2>
                                <p className="text-slate-400 mt-3 text-sm sm:text-base">
                                    Tagihan bulanan berulang · Pembayaran aman via gateway terintegrasi
                                </p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-5 lg:gap-6 items-stretch">
                                {plans.map((plan) => {
                                    const featured = !!plan.featured;
                                    const isOrdering = orderingPlan === plan.id;
                                    const ctaDisabled = isOrdering || !canOrder;

                                    return (
                                        <article
                                            key={plan.id}
                                            className={`relative flex flex-col rounded-3xl p-6 sm:p-7 transition-all duration-300 ${
                                                featured
                                                    ? 'border border-violet-500/40 bg-gradient-to-b from-violet-500/[0.12] via-[#0d1220] to-[#070b14] shadow-2xl shadow-violet-500/15 md:-mt-2 md:mb-2 md:py-8 ring-1 ring-violet-500/20'
                                                    : 'border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]'
                                            }`}
                                        >
                                            {featured && (
                                                <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
                                            )}
                                            {featured && (
                                                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                                                    <Sparkles className="w-3 h-3" />
                                                    Paling Populer
                                                </span>
                                            )}

                                            <div className="mb-6">
                                                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-2">
                                                    {plan.id}
                                                </p>
                                                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                                <p className="text-sm text-slate-500 mt-2 leading-relaxed min-h-[2.75rem]">
                                                    {plan.description}
                                                </p>
                                            </div>

                                            <div className="mb-6 pb-6 border-b border-white/[0.06]">
                                                <div className="flex items-end gap-1">
                                                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                                                        {formatRupiah(plan.price)}
                                                    </span>
                                                    <span className="text-sm text-slate-500 font-medium mb-1">/bulan</span>
                                                </div>
                                            </div>

                                            <ul className="flex-1 space-y-0">
                                                <SpecRow icon={Cpu} label="Processor" value={plan.cpu} />
                                                <SpecRow icon={Server} label="Memory" value={plan.ram} />
                                                <SpecRow icon={HardDrive} label="Storage" value={plan.storage} />
                                                <SpecRow icon={Network} label="Bandwidth" value={plan.bandwidth} />
                                            </ul>

                                            <button
                                                type="button"
                                                onClick={() => handleOrder(plan.id)}
                                                disabled={ctaDisabled}
                                                className={`mt-7 w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                                    featured
                                                        ? 'bg-white text-slate-950 hover:bg-slate-100 shadow-lg'
                                                        : 'bg-white/[0.08] text-white border border-white/10 hover:bg-white/[0.12]'
                                                }`}
                                            >
                                                {getCtaLabel(plan.id)}
                                                {!isOrdering && <ArrowRight className="w-4 h-4" />}
                                            </button>
                                        </article>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    {/* Features */}
                    <section id="fitur" className="border-y border-white/[0.06] bg-white/[0.02]">
                        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                                <div>
                                    <p className="text-violet-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">Included</p>
                                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                        Semua yang Anda Butuhkan untuk Produksi
                                    </h2>
                                    <p className="text-slate-400 mt-3 text-sm leading-relaxed">
                                        Setiap paket mencakup infrastruktur andal, keamanan dasar, dan dukungan teknis
                                        agar server Anda siap digunakan sejak hari pertama.
                                    </p>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {INCLUDED_FEATURES.map(({ icon: Icon, label }) => (
                                        <div
                                            key={label}
                                            className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#070b14]/60 px-4 py-3.5"
                                        >
                                            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                                                <Icon className="w-4 h-4 text-violet-400" />
                                            </div>
                                            <span className="text-sm font-medium text-slate-300">{label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Payment */}
                    <section id="pembayaran" className="py-16 sm:py-20">
                        <div className="max-w-6xl mx-auto px-4 sm:px-6">
                            <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.08] via-transparent to-indigo-500/[0.05] p-8 sm:p-10 text-center">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/25 text-violet-400 mb-5">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-extrabold text-white">Pembayaran Aman & Terintegrasi</h2>
                                <p className="text-slate-400 text-sm mt-2 max-w-lg mx-auto">
                                    Checkout melalui payment gateway resmi. Transaksi tercatat otomatis via webhook.
                                </p>
                                <div className="flex flex-wrap justify-center gap-2 mt-6">
                                    {PAYMENT_METHODS.map((method) => (
                                        <span
                                            key={method}
                                            className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[11px] font-bold text-slate-300 uppercase tracking-wide"
                                        >
                                            {method}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section id="kontak" className="border-t border-white/[0.06] bg-white/[0.02]">
                        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
                            <div className="max-w-xl">
                                <PublicSupportContact branding={branding} variant="vps" />
                            </div>
                        </div>
                    </section>
                </main>

                <AppFooter
                    branding={branding}
                    legalLinks={legalLinks}
                    className="py-5 px-6 border-t border-white/[0.06] text-center bg-[#070b14]"
                    textClassName="text-xs text-slate-600 leading-relaxed"
                />
            </div>
        </>
    );
}
