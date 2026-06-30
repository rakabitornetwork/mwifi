import { useMemo, useState } from 'react';
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
    Headphones,
    Clock,
    Sun,
    Moon,
} from 'lucide-react';
import PullToRefresh from '../Components/PullToRefresh';
import SeoHead from '../Components/SeoHead';
import PublicSiteFooter from '../Components/PublicSiteFooter';
import BrandingTagline from '../Components/BrandingTagline';
import BrandingLogo, { hasWideLogo } from '../Components/BrandingLogo';
import { useScheduledTheme } from '../hooks/useScheduledTheme';
import { getLandingTheme } from '../utils/landingTheme';

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

function formatWhatsappHref(phone) {
    if (!phone) {
        return null;
    }

    const digits = phone.replace(/\D/g, '');
    const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;

    return normalized ? `https://wa.me/${normalized}` : null;
}

const LANDING_HEADER_OFFSET = 64;

function getScrollBehavior() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: getScrollBehavior() });
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

function scrollToSection(sectionId) {
    const el = document.getElementById(sectionId);
    if (!el) {
        return;
    }

    const top = el.getBoundingClientRect().top + window.scrollY - LANDING_HEADER_OFFSET;

    window.scrollTo({
        top: Math.max(0, top),
        behavior: getScrollBehavior(),
    });

    window.history.replaceState(null, '', `#${sectionId}`);
}

function ContactChannelCard({
    icon: Icon,
    label,
    value,
    href = null,
    actionLabel = null,
    accentClass,
    iconWrapClass,
    className = '',
    theme,
}) {
    const wrapperClass = `${theme.contactCard} ${href ? 'cursor-pointer' : ''} ${className}`;

    const content = (
        <>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] via-transparent to-sky-500/[0.05] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="relative space-y-4">
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl border ${iconWrapClass}`}>
                    <Icon className={`w-5 h-5 ${accentClass}`} />
                </div>
                <div>
                    <p className={theme.contactLabel}>{label}</p>
                    <p className={theme.contactValue}>{value}</p>
                </div>
            </div>
            {actionLabel && href && (
                <div className={theme.contactDivider}>
                    <span className={`text-xs font-bold ${accentClass}`}>{actionLabel}</span>
                    <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${accentClass} opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all`} />
                </div>
            )}
        </>
    );

    if (href) {
        const external = href.startsWith('http');

        return (
            <a
                href={href}
                className={wrapperClass}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
                {content}
            </a>
        );
    }

    return <div className={wrapperClass}>{content}</div>;
}

export default function Welcome({
    termsDocument = null,
    termsSections = [],
    legalLinks = [],
    vpsPlans = [],
}) {
    const { branding = {} } = usePage().props;
    const { isDarkMode, isAutoTheme, toggleTheme } = useScheduledTheme('mwifi.landing.theme');
    const t = useMemo(() => getLandingTheme(isDarkMode), [isDarkMode]);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleSectionNav = (e, sectionId) => {
        e.preventDefault();
        setMobileMenuOpen(false);
        scrollToSection(sectionId);
    };

    const handleBerandaNav = (e) => {
        const onLanding = window.location.pathname === '/' || window.location.pathname === '';
        if (!onLanding) {
            return;
        }

        e.preventDefault();
        setMobileMenuOpen(false);
        scrollToTop();
    };

    // Form states for service booking
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        service_type: vpsPlans[0]?.id || '',
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
                body: JSON.stringify({ ...formData, payment_method: 'all' }),
            });
            
            const result = await response.json();
            if (result.success && result.payment_url) {
                setSuccess('Pesanan berhasil dibuat. Mengalihkan ke halaman pembayaran...');
                window.location.href = result.payment_url;
            } else {
                if (result.errors) {
                    const errorMsg = Object.values(result.errors).flat().join(' | ');
                    setError(errorMsg || result.message || 'Gagal membuat pesanan.');
                } else {
                    setError(result.message || 'Gagal membuat pesanan. Silakan coba lagi.');
                }
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
    const whatsappHref = formatWhatsappHref(phone);
    const emailHref = email ? `mailto:${email}` : null;
    const websiteHref = website && !website.startsWith('http') ? `https://${website}` : website;

    return (
        <>
            <SeoHead title="Home" branding={branding} />
            <PullToRefresh
                useWindowScroll
                isDarkMode={isDarkMode}
                className={t.page}
            >
                <header className={t.header}>
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                        <Link href="/" onClick={handleBerandaNav} className="flex items-center gap-3 group min-w-0 shrink-0">
                            <BrandingLogo branding={branding} variant="header" alt="" />
                            {!hasWideLogo(branding) && (
                            <span className={t.brand}>
                                {companyName}
                            </span>
                            )}
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-8">
                            <a href="/" onClick={handleBerandaNav} className={t.navLink}>
                                Beranda
                            </a>
                            <a href="#fitur" onClick={(e) => handleSectionNav(e, 'fitur')} className={t.navLink}>
                                Layanan Kami
                            </a>
                            <a href="#pesan" onClick={(e) => handleSectionNav(e, 'pesan')} className={t.navLink}>
                                Pesan Layanan
                            </a>
                            <a href="#kontak" onClick={(e) => handleSectionNav(e, 'kontak')} className={t.navLink}>
                                Hubungi Kami
                            </a>
                        </nav>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={toggleTheme}
                                className={t.themeToggle}
                                aria-label={isAutoTheme ? 'Tema otomatis. Klik untuk ganti.' : isDarkMode ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
                                title={isAutoTheme ? 'Otomatis (06:00–18:00 terang)' : undefined}
                            >
                                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                            </button>

                            <div className="hidden md:flex items-center">
                                <Link href="/portal" className={t.portalBtn}>
                                    <UserCircle className="w-4 h-4 text-indigo-400" />
                                    Portal Pelanggan
                                </Link>
                            </div>

                            <button
                                type="button"
                                aria-expanded={mobileMenuOpen}
                                aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className={t.hamburger}
                            >
                                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <div
                        aria-hidden={!mobileMenuOpen}
                        className={`${t.mobileMenuOpen} ${
                            mobileMenuOpen
                                ? 'max-h-96 opacity-100 translate-y-0 border-b pointer-events-auto'
                                : 'max-h-0 opacity-0 -translate-y-1 border-b-0 pointer-events-none'
                        }`}
                    >
                        <nav className="flex flex-col p-5 gap-4">
                                <a
                                    href="/"
                                    onClick={handleBerandaNav}
                                    className={t.mobileNavLink}
                                >
                                    Beranda
                                </a>
                                <a
                                    href="#fitur"
                                    onClick={(e) => handleSectionNav(e, 'fitur')}
                                    className={t.mobileNavLink}
                                >
                                    Layanan Kami
                                </a>
                                <a
                                    href="#pesan"
                                    onClick={(e) => handleSectionNav(e, 'pesan')}
                                    className={t.mobileNavLink}
                                >
                                    Pesan Layanan
                                </a>
                                <a
                                    href="#kontak"
                                    onClick={(e) => handleSectionNav(e, 'kontak')}
                                    className={t.mobileNavLink}
                                >
                                    Hubungi Kami
                                </a>
                                <Link
                                    href="/portal"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors mt-1"
                                >
                                    <UserCircle className="w-4 h-4" />
                                    Portal Pelanggan
                                </Link>
                            </nav>
                    </div>
                </header>

                {/* CELESTIAL HERO SECTION */}
                <section className="relative overflow-hidden pt-12 pb-24 md:py-32 flex items-center justify-center">
                    {/* Glowing Blur Blobs */}
                    <div className="absolute top-[-10%] left-[10%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] rounded-full bg-indigo-600/10 blur-[80px] md:blur-[140px] pointer-events-none" />
                    <div className="absolute bottom-[-10%] right-[10%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] rounded-full bg-sky-500/10 blur-[80px] md:blur-[140px] pointer-events-none" />

                    {/* Twinkling Stars */}
                    {isDarkMode && STARS.map((star, idx) => (
                        <div
                            key={idx}
                            className={`absolute ${star.size} bg-white rounded-full ${star.anim} opacity-60 pointer-events-none`}
                            style={{ top: star.top, left: star.left }}
                        />
                    ))}

                    {/* Shooting Meteors */}
                    {isDarkMode && (
                        <>
                            <div className="absolute top-10 right-1/4 w-40 h-px bg-gradient-to-l from-indigo-500 to-transparent rotate-[-40deg] meteor-1 opacity-40 pointer-events-none" />
                            <div className="absolute top-32 right-10 w-60 h-px bg-gradient-to-l from-purple-500 to-transparent rotate-[-40deg] meteor-2 opacity-30 pointer-events-none" />
                            <div className="absolute top-60 right-1/3 w-44 h-px bg-gradient-to-l from-sky-400 to-transparent rotate-[-40deg] meteor-3 opacity-40 pointer-events-none" />
                        </>
                    )}

                    <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                            {/* Left Column: Hero Text */}
                            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                                <div className={t.heroBadge}>
                                    <Shield className="w-3.5 h-3.5" />
                                    Premium IT & Network Solutions
                                </div>
                                <h1 className={t.headingXl}>
                                    Solusi IT &{' '}
                                    <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                                        Jaringan Profesional
                                    </span>{' '}
                                    Terpercaya
                                </h1>
                                <BrandingTagline lines={3} className={t.heroTagline}>
                                    {tagline}
                                </BrandingTagline>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
                                    <a
                                        href="#pesan"
                                        onClick={(e) => handleSectionNav(e, 'pesan')}
                                        className="inline-flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold rounded-2xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all group shrink-0"
                                    >
                                        Pesan Layanan
                                        <ChevronRight className="w-4 h-4 opacity-80 group-hover:translate-x-0.5 transition-transform" />
                                    </a>
                                </div>

                                {/* Floating Micro-stats */}
                                <div className={t.heroStatsBorder}>
                                    <div className="space-y-1">
                                        <p className={t.statValue}>Custom</p>
                                        <p className={t.statLabel}>Desain Aplikasi</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className={t.statValue}>Optimasi</p>
                                        <p className={t.statLabel}>Jaringan WiFi</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className={t.statValue}>99.9%</p>
                                        <p className={t.statLabel}>SLA Uptime VPS</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className={t.statValue}>Profesional</p>
                                        <p className={t.statLabel}>Layanan IT</p>
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
                <section id="fitur" className={`py-20 ${t.section}`}>
                    <div className="absolute top-[20%] left-[-10%] w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />
                    <div className="absolute bottom-[20%] right-[-10%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[100px] pointer-events-none" />

                    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
                        {/* Section Title */}
                        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
                            <h2 className={t.sectionLabel}>
                                Layanan IT Profesional
                            </h2>
                            <p className={t.headingLg}>
                                Solusi Teknologi Handal untuk Bisnis Anda
                            </p>
                            <p className={`${t.subtext} max-w-xl mx-auto`}>
                                Kami menyediakan jasa pembuatan software, setup infrastruktur jaringan WiFi, hosting server cloud, serta layanan IT support profesional lainnya.
                            </p>
                        </div>

                        {/* Features Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Feature 1 */}
                            <div className={`${t.featureCard} hover:shadow-indigo-950/10`}>
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300">
                                    <Code className="w-6 h-6" />
                                </div>
                                <h3 className={`${t.featureTitle} group-hover:text-indigo-400`}>
                                    Jasa Pembuatan Aplikasi
                                </h3>
                                <p className={t.featureBody}>
                                    Pembuatan website company profile, aplikasi web kustom, sistem e-commerce, dan aplikasi mobile dengan desain modern serta UI/UX premium.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className={`${t.featureCard} hover:shadow-sky-950/10`}>
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white transition-all duration-300">
                                    <Wifi className="w-6 h-6" />
                                </div>
                                <h3 className={`${t.featureTitle} group-hover:text-sky-400`}>
                                    Setting & Maintenance WiFi
                                </h3>
                                <p className={t.featureBody}>
                                    Instalasi MikroTik, konfigurasi jaringan hotspot voucher, optimasi bandwidth, troubleshooting, dan pemeliharaan rutin untuk kantor, cafe, atau RT/RW Net.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className={`${t.featureCard} hover:shadow-purple-950/10`}>
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                                    <Server className="w-6 h-6" />
                                </div>
                                <h3 className={`${t.featureTitle} group-hover:text-purple-400`}>
                                    Sewa VPS Premium
                                </h3>
                                <p className={t.featureBody}>
                                    Penyewaan server virtual privat dengan media penyimpanan SSD NVMe berkecepatan tinggi, backup otomatis harian, dan uptime server terjamin.
                                </p>
                            </div>

                            {/* Feature 4 */}
                            <div className={`${t.featureCard} hover:shadow-emerald-950/10`}>
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <h3 className={`${t.featureTitle} group-hover:text-emerald-400`}>
                                    Jasa IT Support Umum
                                </h3>
                                <p className={t.featureBody}>
                                    Konsultasi IT, instalasi CCTV, administrasi server Linux/Windows, setup cloud backup data, dan penanganan keamanan cyber.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PREMIUM ORDER SERVICE SECTION */}
                <section id="pesan" className={`py-20 ${t.section}`}>
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
                                <h2 className={t.headingLg}>
                                    Pesan Layanan IT & WiFi Jaringan Sekarang
                                </h2>
                                <p className={t.subtextSm}>
                                    Isi data diri Anda di formulir, pilih jenis layanan yang Anda butuhkan, dan lakukan pembayaran langsung via QRIS, Virtual Account, atau E-Wallet pilihan Anda secara otomatis.
                                </p>

                                <div className={t.orderDivider}>
                                    <div className="flex items-start gap-3">
                                        <div className={t.checkIcon}>
                                            ✓
                                        </div>
                                        <p className={t.body}>
                                            <strong>Integrasi Gateway Otomatis</strong>: Pembayaran Anda langsung diproses menggunakan merchant payment gateway resmi.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className={t.checkIcon}>
                                            ✓
                                        </div>
                                        <p className={t.body}>
                                            <strong>E-Invoice Resmi</strong>: Invoice tagihan dikirim secara otomatis ke email & WhatsApp Anda setelah pesanan dibuat.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className={t.checkIcon}>
                                            ✓
                                        </div>
                                        <p className={t.body}>
                                            <strong>Proses Cepat & Responsif</strong>: Setelah pembayaran selesai, tim technical support kami akan segera memproses detail pesanan Anda.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Form Column */}
                            <div className="lg:col-span-7">
                                <div className={t.formCard}>
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
                                                <label className={t.formLabel}>Nama Lengkap</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Nama Anda"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className={t.formInput}
                                                />
                                            </div>

                                            {/* Input Phone */}
                                            <div className="flex flex-col gap-1.5">
                                                <label className={t.formLabel}>Nomor WhatsApp</label>
                                                <input
                                                    type="tel"
                                                    required
                                                    placeholder="Contoh: 081234567890"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    className={t.formInput}
                                                />
                                            </div>
                                        </div>

                                        {/* Input Email */}
                                        <div className="flex flex-col gap-1.5">
                                            <label className={t.formLabel}>Alamat Email</label>
                                            <input
                                                type="email"
                                                required
                                                placeholder="email@anda.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className={t.formInput}
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className={t.formLabel}>Pilih Layanan</label>
                                            <select
                                                value={formData.service_type}
                                                onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                                                className={t.formInput}
                                            >
                                                {vpsPlans.map((plan) => (
                                                    <option key={plan.id} value={plan.id}>
                                                        {plan.name} — Rp {new Intl.NumberFormat('id-ID').format(plan.price)}
                                                    </option>
                                                ))}
                                            </select>
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
                <section id="kontak" className={`py-24 sm:py-28 ${t.section}`}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-600/[0.07] blur-[120px] rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-sky-500/[0.05] blur-[100px] rounded-full pointer-events-none" />
                    <div className={t.contactGridBg} />

                    <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
                        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
                            {/* Left: intro & trust */}
                            <div className="lg:col-span-5 space-y-7 text-center lg:text-left">
                                <div className={`${t.heroBadge} text-[11px] tracking-widest`}>
                                    <Headphones className="w-3 h-3" />
                                    Layanan Support & Kontak
                                </div>

                                <div className="space-y-4">
                                    <h2 className={t.headingLg}>
                                        Tim Ahli Siap{' '}
                                        <span className="bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
                                            Mendampingi Anda
                                        </span>
                                    </h2>
                                    <p className={`${t.subtext} max-w-md mx-auto lg:mx-0`}>
                                        Konsultasi pembuatan website, instalasi jaringan, layanan cloud,
                                        dan kebutuhan IT profesional — dengan respons cepat dan komunikasi yang jelas.
                                    </p>
                                </div>

                                <div className="flex flex-wrap justify-center lg:justify-start gap-2.5">
                                    {[
                                        { icon: Clock, text: 'Respon < 24 jam' },
                                        { icon: Shield, text: 'Konsultasi terarah' },
                                        { icon: MessageSquare, text: 'Multi-channel' },
                                    ].map(({ icon: Icon, text }) => (
                                        <span
                                            key={text}
                                            className={t.trustPill}
                                        >
                                            <Icon className="w-3 h-3 text-indigo-400" />
                                            {text}
                                        </span>
                                    ))}
                                </div>

                                {whatsappHref && (
                                    <a
                                        href={whatsappHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-sm font-bold shadow-lg shadow-emerald-900/25 transition-all group"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Chat via WhatsApp
                                        <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                                    </a>
                                )}
                            </div>

                            {/* Right: contact channels */}
                            <div className="lg:col-span-7">
                                {!email && !phone && !address && !website ? (
                                    <div className={t.contactEmpty}>
                                        <Headphones className={`w-8 h-8 mx-auto mb-3 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                                        <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                                            Informasi kontak belum dikonfigurasi di pengaturan admin.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {phone && (
                                            <ContactChannelCard
                                                icon={Phone}
                                                label="WhatsApp / Telepon"
                                                value={phone}
                                                href={whatsappHref || phoneHref}
                                                actionLabel="Hubungi Sekarang"
                                                accentClass="text-emerald-400"
                                                iconWrapClass="bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                                className="sm:col-span-2"
                                                theme={t}
                                            />
                                        )}
                                        {email && (
                                            <ContactChannelCard
                                                icon={Mail}
                                                label="Email Resmi"
                                                value={email}
                                                href={emailHref}
                                                actionLabel="Kirim Email"
                                                accentClass="text-indigo-400"
                                                iconWrapClass="bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                                                theme={t}
                                            />
                                        )}
                                        {website && (
                                            <ContactChannelCard
                                                icon={Globe}
                                                label="Website"
                                                value={website}
                                                href={websiteHref}
                                                actionLabel="Kunjungi Situs"
                                                accentClass="text-sky-400"
                                                iconWrapClass="bg-sky-500/10 border-sky-500/20 text-sky-400"
                                                theme={t}
                                            />
                                        )}
                                        {address && (
                                            <ContactChannelCard
                                                icon={MapPin}
                                                label="Alamat Kantor"
                                                value={address}
                                                accentClass="text-purple-400"
                                                iconWrapClass="bg-purple-500/10 border-purple-500/20 text-purple-400"
                                                className={website ? 'sm:col-span-2' : ''}
                                                theme={t}
                                            />
                                        )}
                                    </div>
                                )}

                                <p className={t.contactFootnote}>
                                    {companyName} · Dukungan teknis profesional untuk bisnis Anda
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FOOTER */}
                <PublicSiteFooter
                    branding={branding}
                    legalLinks={legalLinks}
                    isDark={isDarkMode}
                    showContactLine={false}
                    centerCopyright={true}
                />
            </PullToRefresh>
        </>
    );
}
