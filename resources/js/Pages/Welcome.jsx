import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    ChevronRight,
    Server,
    UserCircle,
    Wifi,
    CreditCard,
    MessageSquare,
    Shield,
    Mail,
    Phone,
    MapPin,
    Globe,
    Menu,
    X,
    ArrowRight,
    Activity,
    Cpu,
    Code,
} from 'lucide-react';
import PullToRefresh from '../Components/PullToRefresh';
import SeoHead from '../Components/SeoHead';
import PublicSiteFooter from '../Components/PublicSiteFooter';
import BrandingTagline from '../Components/BrandingTagline';

const STARS = [
    { top: '8%', left: '12%', size: 'w-1 h-1', anim: 'star-twinkle-slow' },
    { top: '15%', left: '78%', size: 'w-1.5 h-1.5', anim: 'star-twinkle-medium' },
    { top: '22%', left: '45%', size: 'w-1 h-1', anim: 'star-twinkle-fast' },
    { top: '35%', left: '88%', size: 'w-1 h-1', anim: 'star-twinkle-slow' },
    { top: '48%', left: '15%', size: 'w-1.5 h-1.5', anim: 'star-twinkle-medium' },
    { top: '55%', left: '62%', size: 'w-1 h-1', anim: 'star-twinkle-fast' },
    { top: '70%', left: '80%', size: 'w-1 h-1', anim: 'star-twinkle-slow' },
    { top: '82%', left: '25%', size: 'w-1.5 h-1.5', anim: 'star-twinkle-medium' },
];

export default function Welcome({
    termsDocument = null,
    termsSections = [],
    legalLinks = [],
    vpsCatalogUrl = null,
}) {
    const { branding = {} } = usePage().props;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Form states for service booking
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        service_type: 'pembuatan_aplikasi',
        payment_method: 'all',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);
        
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const response = await fetch('/layanan/pesan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify(formData),
            });
            
            const result = await response.json();
            if (result.success && result.payment_url) {
                setSuccess('Pesanan berhasil dibuat. Mengalihkan ke halaman pembayaran...');
                window.location.href = result.payment_url;
            } else {
                setError(result.message || 'Gagal membuat pesanan. Silakan coba lagi.');
            }
        } catch (err) {
            setError('Terjadi kesalahan jaringan atau sistem. Periksa koneksi Anda.');
        } finally {
            setLoading(false);
        }
    };

    const {
        company_name: companyName = 'Solusi IT & Jaringan',
        company_tagline: tagline = 'Jasa Pembuatan Aplikasi, Setting & Maintenance Jaringan WiFi, Sewa VPS Cloud, dan Solusi IT Lainnya',
        company_email: email,
        company_phone: phone,
        company_address: address,
        company_website: website,
    } = branding;

    const phoneHref = phone ? `tel:${phone.replace(/\s+/g, '')}` : null;
    const emailHref = email ? `mailto:${email}` : null;
    const websiteHref = website && !website.startsWith('http') ? `https://${website}` : website;

    return (
        <>
            <SeoHead title="Home" branding={branding} />
            <PullToRefresh
                useWindowScroll
                isDarkMode={true}
                className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-indigo-600/40 selection:text-indigo-200"
            >
                {/* STICKY GLASSMORPHIC HEADER */}
                <header className="sticky top-0 z-50 w-full border-b border-slate-900 bg-slate-950/80 backdrop-blur-md">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                        {/* Logo & Brand */}
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 text-white font-extrabold shadow-md shadow-indigo-600/10 overflow-hidden">
                                {branding.logo_url ? (
                                    <img src={branding.logo_url} alt="" className="w-full h-full object-contain p-1.5 bg-white/5" />
                                ) : (
                                    <Server className="w-4 h-4" />
                                )}
                            </div>
                            <span className="text-sm font-black tracking-widest text-white group-hover:text-indigo-400 transition-colors uppercase">
                                {companyName}
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
                            <Link href="/" className="text-white hover:text-indigo-400 transition-colors">
                                Beranda
                            </Link>
                            {vpsCatalogUrl && (
                                <Link href={vpsCatalogUrl} className="hover:text-indigo-400 transition-colors">
                                    Layanan VPS
                                </Link>
                            )}
                            <a href="#fitur" className="hover:text-indigo-400 transition-colors">
                                Layanan Kami
                            </a>
                            <a href="#pesan" className="hover:text-indigo-400 transition-colors font-bold text-indigo-400 border-b-2 border-indigo-500/20 pb-0.5">
                                Pesan Layanan
                            </a>
                            <a href="#kontak" className="hover:text-indigo-400 transition-colors">
                                Hubungi Kami
                            </a>
                        </nav>

                        {/* Desktop CTA */}
                        <div className="hidden md:flex items-center">
                            <Link
                                href="/portal"
                                className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-all shadow-sm"
                            >
                                <UserCircle className="w-4 h-4 text-indigo-400" />
                                Portal Pelanggan
                            </Link>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-300 hover:text-white transition-colors"
                        >
                            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Mobile Navigation Drawer */}
                    {mobileMenuOpen && (
                        <div className="md:hidden absolute top-16 left-0 w-full border-b border-slate-900 bg-slate-950/95 backdrop-blur-lg animate-in fade-in slide-in-from-top-4 duration-200">
                            <nav className="flex flex-col p-5 gap-4 text-sm font-semibold text-slate-300">
                                <Link
                                    href="/"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="pb-2 border-b border-slate-900 text-white"
                                >
                                    Beranda
                                </Link>
                                {vpsCatalogUrl && (
                                    <Link
                                        href={vpsCatalogUrl}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="pb-2 border-b border-slate-900"
                                    >
                                        Layanan VPS
                                    </Link>
                                )}
                                <a
                                    href="#fitur"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="pb-2 border-b border-slate-900"
                                >
                                    Layanan Kami
                                </a>
                                <a
                                    href="#pesan"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="pb-2 border-b border-slate-900 text-indigo-400"
                                >
                                    Pesan Layanan
                                </a>
                                <a
                                    href="#kontak"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="pb-2 border-b border-slate-900"
                                >
                                    Hubungi Kami
                                </a>
                                <Link
                                    href="/portal"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors mt-2"
                                >
                                    <UserCircle className="w-4 h-4" />
                                    Portal Pelanggan
                                </Link>
                            </nav>
                        </div>
                    )}
                </header>

                {/* CELESTIAL HERO SECTION */}
                <section className="relative overflow-hidden pt-12 pb-24 md:py-32 flex items-center justify-center">
                    {/* Glowing Blur Blobs */}
                    <div className="absolute top-[-10%] left-[10%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] rounded-full bg-indigo-600/10 blur-[80px] md:blur-[140px] pointer-events-none" />
                    <div className="absolute bottom-[-10%] right-[10%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] rounded-full bg-sky-500/10 blur-[80px] md:blur-[140px] pointer-events-none" />

                    {/* Twinkling Stars */}
                    {STARS.map((star, idx) => (
                        <div
                            key={idx}
                            className={`absolute ${star.size} bg-white rounded-full ${star.anim} opacity-60 pointer-events-none`}
                            style={{ top: star.top, left: star.left }}
                        />
                    ))}

                    {/* Shooting Meteors */}
                    <div className="absolute top-10 right-1/4 w-40 h-px bg-gradient-to-l from-indigo-500 to-transparent rotate-[-40deg] meteor-1 opacity-40 pointer-events-none" />
                    <div className="absolute top-32 right-10 w-60 h-px bg-gradient-to-l from-purple-500 to-transparent rotate-[-40deg] meteor-2 opacity-30 pointer-events-none" />
                    <div className="absolute top-60 right-1/3 w-44 h-px bg-gradient-to-l from-sky-400 to-transparent rotate-[-40deg] meteor-3 opacity-40 pointer-events-none" />

                    <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                            {/* Left Column: Hero Text */}
                            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                                    <Shield className="w-3.5 h-3.5" />
                                    Premium IT & Network Solutions
                                </div>
                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-white">
                                    Solusi IT &{' '}
                                    <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                                        Jaringan Profesional
                                    </span>{' '}
                                    Terpercaya
                                </h1>
                                <BrandingTagline lines={3} className="text-base sm:text-lg text-slate-400 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                                    {tagline}
                                </BrandingTagline>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
                                    {vpsCatalogUrl ? (
                                        <>
                                            <Link
                                                href={vpsCatalogUrl}
                                                className="inline-flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all group shrink-0"
                                            >
                                                <Server className="w-5 h-5" />
                                                Layanan VPS
                                                <ChevronRight className="w-4 h-4 opacity-80 group-hover:translate-x-0.5 transition-transform" />
                                            </Link>
                                            <Link
                                                href="/portal"
                                                className="inline-flex items-center justify-center gap-2 py-3.5 px-6 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-bold rounded-2xl transition-all"
                                            >
                                                <UserCircle className="w-5 h-5 text-indigo-400" />
                                                Portal Pelanggan
                                            </Link>
                                        </>
                                    ) : (
                                        <Link
                                            href="/portal"
                                            className="inline-flex items-center justify-center gap-2 py-3.5 px-8 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all group shrink-0"
                                        >
                                            <UserCircle className="w-5 h-5" />
                                            Portal Pelanggan
                                            <ChevronRight className="w-4 h-4 opacity-80 group-hover:translate-x-0.5 transition-transform" />
                                        </Link>
                                    )}
                                </div>

                                {/* Floating Micro-stats */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-slate-900">
                                    <div className="space-y-1">
                                        <p className="text-xl sm:text-2xl font-black text-white">Custom</p>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Desain Aplikasi</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xl sm:text-2xl font-black text-white">Optimasi</p>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jaringan WiFi</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xl sm:text-2xl font-black text-white">99.9%</p>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SLA Uptime VPS</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xl sm:text-2xl font-black text-white">Profesional</p>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Layanan IT</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Premium SVG Illustration */}
                            <div className="lg:col-span-5 hidden lg:flex items-center justify-center relative">
                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/20 to-purple-600/0 blur-[60px] rounded-full" />
                                <svg
                                    className="w-full max-w-[420px] h-auto drop-shadow-[0_0_35px_rgba(99,102,241,0.15)] relative z-10"
                                    viewBox="0 0 400 400"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    {/* Circles */}
                                    <circle cx="200" cy="200" r="160" stroke="rgba(99,102,241,0.08)" strokeWidth="1.5" strokeDasharray="6 6" />
                                    <circle cx="200" cy="200" r="110" stroke="rgba(14,165,233,0.12)" strokeWidth="1" />
                                    <circle cx="200" cy="200" r="60" stroke="rgba(168,85,247,0.15)" strokeWidth="1" strokeDasharray="3 3" />

                                    {/* Lines */}
                                    <line x1="200" y1="40" x2="200" y2="360" stroke="rgba(99,102,241,0.08)" strokeWidth="1.5" />
                                    <line x1="40" y1="200" x2="360" y2="200" stroke="rgba(99,102,241,0.08)" strokeWidth="1.5" />
                                    <line x1="87" y1="87" x2="313" y2="313" stroke="rgba(99,102,241,0.05)" strokeWidth="1" />
                                    <line x1="87" y1="313" x2="313" y2="87" stroke="rgba(99,102,241,0.05)" strokeWidth="1" />

                                    {/* Central Node */}
                                    <g className="animate-pulse">
                                        <circle cx="200" cy="200" r="30" fill="url(#heroHubGlow)" opacity="0.3" />
                                        <circle cx="200" cy="200" r="12" fill="#6366f1" />
                                        <circle cx="200" cy="200" r="6" fill="#ffffff" />
                                    </g>

                                    {/* Secondary Nodes */}
                                    <g className="cursor-pointer">
                                        <circle cx="90" cy="90" r="18" fill="rgba(14,165,233,0.15)" />
                                        <circle cx="90" cy="90" r="6" fill="#0ea5e9" />
                                    </g>
                                    <g className="cursor-pointer">
                                        <circle cx="310" cy="90" r="18" fill="rgba(168,85,247,0.15)" />
                                        <circle cx="310" cy="90" r="6" fill="#a855f7" />
                                    </g>
                                    <g className="cursor-pointer">
                                        <circle cx="310" cy="310" r="18" fill="rgba(99,102,241,0.15)" />
                                        <circle cx="310" cy="310" r="6" fill="#6366f1" />
                                    </g>
                                    <g className="cursor-pointer">
                                        <circle cx="90" cy="310" r="18" fill="rgba(16,185,129,0.15)" />
                                        <circle cx="90" cy="310" r="6" fill="#10b981" />
                                    </g>

                                    {/* Dashed flowing indicators */}
                                    <path d="M 200 40 L 200 200" stroke="#0ea5e9" strokeWidth="2" strokeDasharray="10 15" strokeLinecap="round">
                                        <animate attributeName="stroke-dashoffset" values="100;0" dur="5s" repeatCount="indefinite" />
                                    </path>
                                    <path d="M 90 90 L 200 200" stroke="#a855f7" strokeWidth="2" strokeDasharray="12 18" strokeLinecap="round">
                                        <animate attributeName="stroke-dashoffset" values="100;0" dur="4s" repeatCount="indefinite" />
                                    </path>
                                    <path d="M 310 310 L 200 200" stroke="#6366f1" strokeWidth="2" strokeDasharray="10 12" strokeLinecap="round">
                                        <animate attributeName="stroke-dashoffset" values="100;0" dur="6s" repeatCount="indefinite" />
                                    </path>
                                    <path d="M 90 310 L 200 200" stroke="#10b981" strokeWidth="2" strokeDasharray="14 16" strokeLinecap="round">
                                        <animate attributeName="stroke-dashoffset" values="100;0" dur="4.5s" repeatCount="indefinite" />
                                    </path>

                                    <defs>
                                        <radialGradient id="heroHubGlow" cx="50%" cy="50%" r="50%">
                                            <stop offset="0%" stopColor="#6366f1" />
                                            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                                        </radialGradient>
                                    </defs>
                                </svg>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PREMIUM FEATURES SECTION */}
                <section id="fitur" className="py-20 border-t border-slate-900 bg-slate-950 relative overflow-hidden">
                    <div className="absolute top-[20%] left-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-[20%] right-[-10%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[100px] pointer-events-none" />

                    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
                        {/* Section Title */}
                        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
                            <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-400">
                                Layanan IT Profesional
                            </h2>
                            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                                Solusi Teknologi Handal untuk Bisnis Anda
                            </p>
                            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
                                Kami menyediakan jasa pembuatan software, setup infrastruktur jaringan WiFi, hosting server cloud, serta layanan IT support profesional lainnya.
                            </p>
                        </div>

                        {/* Features Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Feature 1 */}
                            <div className="group rounded-3xl border border-slate-900 bg-slate-900/30 p-6 space-y-4 hover:border-slate-800 hover:bg-slate-900/50 hover:shadow-xl hover:shadow-indigo-950/10 transition-all duration-300">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                                    <Code className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                                    Jasa Pembuatan Aplikasi
                                </h3>
                                <p className="text-xs sm:text-sm leading-relaxed text-slate-400">
                                    Pembuatan website company profile, aplikasi web kustom, sistem e-commerce, dan aplikasi mobile dengan desain modern serta UI/UX premium.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="group rounded-3xl border border-slate-900 bg-slate-900/30 p-6 space-y-4 hover:border-slate-800 hover:bg-slate-900/50 hover:shadow-xl hover:shadow-sky-950/10 transition-all duration-300">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white transition-all duration-300">
                                    <Wifi className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition-colors">
                                    Setting & Maintenance WiFi
                                </h3>
                                <p className="text-xs sm:text-sm leading-relaxed text-slate-400">
                                    Instalasi MikroTik, konfigurasi jaringan hotspot voucher, optimasi bandwidth, troubleshooting, dan pemeliharaan rutin untuk kantor, cafe, atau RT/RW Net.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="group rounded-3xl border border-slate-900 bg-slate-900/30 p-6 space-y-4 hover:border-slate-800 hover:bg-slate-900/50 hover:shadow-xl hover:shadow-purple-950/10 transition-all duration-300">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                                    <Server className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                                    Sewa VPS Premium
                                </h3>
                                <p className="text-xs sm:text-sm leading-relaxed text-slate-400">
                                    Penyewaan server virtual privat dengan media penyimpanan SSD NVMe berkecepatan tinggi, backup otomatis harian, dan uptime server terjamin.
                                </p>
                            </div>

                            {/* Feature 4 */}
                            <div className="group rounded-3xl border border-slate-900 bg-slate-900/30 p-6 space-y-4 hover:border-slate-800 hover:bg-slate-900/50 hover:shadow-xl hover:shadow-emerald-950/10 transition-all duration-300">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                                    Jasa IT Support Umum
                                </h3>
                                <p className="text-xs sm:text-sm leading-relaxed text-slate-400">
                                    Konsultasi IT, instalasi CCTV, administrasi server Linux/Windows, setup cloud backup data, dan penanganan keamanan cyber.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PREMIUM ORDER SERVICE SECTION */}
                <section id="pesan" className="py-20 border-t border-slate-900 bg-slate-950 relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[10%] w-[350px] h-[350px] rounded-full bg-indigo-600/5 blur-[120px] pointer-events-none" />
                    <div className="absolute bottom-[-10%] left-[10%] w-[350px] h-[350px] rounded-full bg-sky-500/5 blur-[120px] pointer-events-none" />

                    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                            {/* Left Info Column */}
                            <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                    <Shield className="w-3.5 h-3.5" />
                                    Transaksi Aman & Instan
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                                    Pesan Layanan IT & WiFi Jaringan Sekarang
                                </h2>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Isi data diri Anda di formulir, pilih jenis layanan yang Anda butuhkan, dan lakukan pembayaran langsung via QRIS, Virtual Account, atau E-Wallet pilihan Anda secara otomatis.
                                </p>

                                <div className="space-y-4 pt-4 border-t border-slate-900 text-left">
                                    <div className="flex items-start gap-3">
                                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
                                            ✓
                                        </div>
                                        <p className="text-xs sm:text-sm text-slate-350">
                                            <strong>Integrasi Gateway Otomatis</strong>: Pembayaran Anda langsung diproses menggunakan merchant payment gateway resmi.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
                                            ✓
                                        </div>
                                        <p className="text-xs sm:text-sm text-slate-350">
                                            <strong>E-Invoice Resmi</strong>: Invoice tagihan dikirim secara otomatis ke email & WhatsApp Anda setelah pesanan dibuat.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
                                            ✓
                                        </div>
                                        <p className="text-xs sm:text-sm text-slate-350">
                                            <strong>Proses Cepat & Responsif</strong>: Setelah pembayaran selesai, tim technical support kami akan segera memproses detail pesanan Anda.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Form Column */}
                            <div className="lg:col-span-7">
                                <div className="rounded-3xl border border-slate-900 bg-slate-900/20 p-6 sm:p-8 backdrop-blur-md shadow-2xl relative">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-600/10 blur-2xl rounded-full pointer-events-none" />

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* Toast Success / Error */}
                                        {error && (
                                            <div className="p-3.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-400 text-xs sm:text-sm font-semibold">
                                                {error}
                                            </div>
                                        )}
                                        {success && (
                                            <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs sm:text-sm font-semibold">
                                                {success}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Input Name */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nama Lengkap</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Nama Anda"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="p-3 text-xs sm:text-sm border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                                />
                                            </div>

                                            {/* Input Phone */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Nomor WhatsApp</label>
                                                <input
                                                    type="tel"
                                                    required
                                                    placeholder="Contoh: 081234567890"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    className="p-3 text-xs sm:text-sm border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {/* Input Email */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Alamat Email</label>
                                            <input
                                                type="email"
                                                required
                                                placeholder="email@anda.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="p-3 text-xs sm:text-sm border border-slate-800 rounded-xl bg-slate-950/60 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {/* Select Service Type */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Pilih Layanan</label>
                                                <select
                                                    value={formData.service_type}
                                                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                                                    className="p-3 text-xs sm:text-sm border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                                >
                                                    <option value="pembuatan_aplikasi">Jasa Pembuatan Aplikasi — Rp 5.000.000</option>
                                                    <option value="setting_wifi">Setting & Maintenance WiFi — Rp 1.500.000</option>
                                                    <option value="sewa_vps">Sewa VPS Premium — Rp 250.000</option>
                                                    <option value="it_support">Jasa IT Support Umum — Rp 500.000</option>
                                                </select>
                                            </div>

                                            {/* Select Payment Method */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Pilih Pembayaran</label>
                                                <select
                                                    value={formData.payment_method}
                                                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                                    className="p-3 text-xs sm:text-sm border border-slate-800 rounded-xl bg-slate-950/60 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                                                >
                                                    <option value="all">Semua Metode Pembayaran (Otomatis)</option>
                                                    <option value="qris">QRIS / E-Wallet</option>
                                                    <option value="bcava">Transfer Bank / Virtual Account BCA</option>
                                                    <option value="mandiriva">Transfer Bank / Virtual Account Mandiri</option>
                                                    <option value="briva">Transfer Bank / Virtual Account BRI</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20 transition-all cursor-pointer mt-2"
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    Memproses...
                                                </>
                                            ) : (
                                                <>
                                                    Pesan & Bayar Sekarang
                                                    <ArrowRight className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PREMIUM CONTACT SECTION */}
                <section id="kontak" className="py-20 border-t border-slate-900 bg-slate-950 relative overflow-hidden">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
                        {/* Section Header */}
                        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
                            <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-400">
                                Layanan Support & Kontak
                            </h2>
                            <p className="text-3xl font-extrabold tracking-tight text-white leading-tight">
                                Ada Pertanyaan? Hubungi Tim Kami
                            </p>
                            <p className="text-slate-400 text-sm max-w-lg mx-auto">
                                Kami siap melayani konsultasi pembuatan website, instalasi jaringan, sewa VPS, dan kebutuhan IT profesional lainnya.
                            </p>
                        </div>

                        {/* Contact Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Card 1: Email */}
                            {email && (
                                <div className="flex flex-col justify-between p-6 rounded-3xl border border-slate-900 bg-slate-900/30 hover:border-slate-800 hover:bg-slate-900/50 transition-all duration-300">
                                    <div className="space-y-4">
                                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Resmi</p>
                                            <p className="text-sm font-semibold text-white mt-1 break-all">{email}</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 mt-6 border-t border-slate-950">
                                        <a
                                            href={emailHref}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                                        >
                                            Kirim Email <ArrowRight className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Card 2: Phone */}
                            {phone && (
                                <div className="flex flex-col justify-between p-6 rounded-3xl border border-slate-900 bg-slate-900/30 hover:border-slate-800 hover:bg-slate-900/50 transition-all duration-300">
                                    <div className="space-y-4">
                                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                            <Phone className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">WhatsApp / Telp</p>
                                            <p className="text-sm font-semibold text-white mt-1 break-all">{phone}</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 mt-6 border-t border-slate-950">
                                        <a
                                            href={phoneHref}
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
                                        >
                                            Hubungi Sekarang <ArrowRight className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Card 3: Address */}
                            {address && (
                                <div className="flex flex-col justify-between p-6 rounded-3xl border border-slate-900 bg-slate-900/30 hover:border-slate-800 hover:bg-slate-900/50 transition-all duration-300 sm:col-span-2 lg:col-span-1">
                                    <div className="space-y-4">
                                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Alamat Kantor</p>
                                            <p className="text-xs sm:text-sm font-semibold text-white mt-1 leading-relaxed">
                                                {address}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pt-4 mt-6 border-t border-slate-950">
                                        <span className="text-[10px] font-bold text-slate-600 uppercase">OFFICE</span>
                                    </div>
                                </div>
                            )}

                            {/* Card 4: Website */}
                            {website && (
                                <div className="flex flex-col justify-between p-6 rounded-3xl border border-slate-900 bg-slate-900/30 hover:border-slate-800 hover:bg-slate-900/50 transition-all duration-300">
                                    <div className="space-y-4">
                                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                            <Globe className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Website</p>
                                            <p className="text-sm font-semibold text-white mt-1 break-all">
                                                {website}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pt-4 mt-6 border-t border-slate-950">
                                        <a
                                            href={websiteHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                                        >
                                            Kunjungi Situs <ArrowRight className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* FOOTER */}
                <PublicSiteFooter
                    branding={branding}
                    legalLinks={legalLinks}
                    vpsCatalogUrl={vpsCatalogUrl || '/layanan/vps'}
                    isDark={true}
                />
            </PullToRefresh>
        </>
    );
}
