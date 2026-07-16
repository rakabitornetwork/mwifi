import { useMemo, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    ChevronRight,
    Server,
    UserCircle,
    Wifi,
    MessageSquare,
    Shield,
    Mail,
    Phone,
    MapPin,
    Globe,
    Menu,
    X,
    ArrowRight,
    Code,
    Headphones,
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

function formatWhatsappHref(phone) {
    if (!phone) {
        return null;
    }

    const digits = phone.replace(/\D/g, '');
    const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;

    return normalized ? `https://wa.me/${normalized}` : null;
}

const LANDING_HEADER_OFFSET = 64;

const SERVICES = [
    {
        icon: Code,
        title: 'Jasa Pembuatan Aplikasi',
        body: 'Website company profile, aplikasi web kustom, e-commerce, dan mobile app dengan UI/UX yang rapi serta performa yang andal.',
    },
    {
        icon: Wifi,
        title: 'Setting & Maintenance WiFi',
        body: 'Instalasi MikroTik, hotspot voucher, optimasi bandwidth, troubleshooting, dan pemeliharaan untuk kantor, kafe, atau RT/RW Net.',
    },
    {
        icon: Server,
        title: 'Sewa VPS Premium',
        body: 'Server virtual privat dengan SSD NVMe, backup harian, dan uptime yang dijaga — siap untuk produksi bisnis Anda.',
    },
    {
        icon: Shield,
        title: 'Jasa IT Support',
        body: 'Konsultasi IT, instalasi CCTV, administrasi server, cloud backup, dan penguatan keamanan sistem.',
    },
];

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
            <div className="relative space-y-4">
        <div className={`inline-flex items-center justify-center w-11 h-11 rounded-full border ${iconWrapClass}`}>
                    <Icon className={`w-4 h-4 ${accentClass}`} strokeWidth={1.5} />
                </div>
                <div>
                    <p className={theme.contactLabel}>{label}</p>
                    <p className={theme.contactValue}>{value}</p>
                </div>
            </div>
            {actionLabel && href && (
                <div className={theme.contactDivider}>
                    <span className={`text-xs font-semibold ${accentClass}`}>{actionLabel}</span>
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

function HeroLuxuryVisual({ isDark }) {
    const gold = isDark ? 'rgba(201, 184, 150, 0.45)' : 'rgba(138, 115, 85, 0.45)';
    const soft = isDark ? 'rgba(201, 184, 150, 0.12)' : 'rgba(138, 115, 85, 0.14)';
    const node = isDark ? '#c9b896' : '#8a7355';

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
            <div className="absolute inset-0 landing-grid-fade opacity-40 sm:opacity-50" />

            {/* Orbit duduk di kolom kanan hero, sejajar area konten */}
            <div className="absolute inset-0 max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-center lg:justify-end">
                <svg
                    className="w-[min(88vw,520px)] sm:w-[min(70vw,560px)] lg:w-[min(48vw,540px)] h-auto opacity-[0.28] sm:opacity-55 lg:opacity-90 landing-reveal landing-reveal-delay-2 lg:translate-x-[6%] lg:-translate-y-[4%]"
                    viewBox="0 0 520 520"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <g className="landing-orbit">
                        <circle cx="260" cy="260" r="168" stroke={soft} strokeWidth="1" />
                        <circle cx="260" cy="260" r="118" stroke={soft} strokeWidth="1" strokeDasharray="2 10" />
                        <circle cx="428" cy="260" r="3.5" fill={node} opacity="0.7" />
                        <circle cx="92" cy="260" r="2.5" fill={node} opacity="0.5" />
                    </g>

                    <circle cx="260" cy="260" r="78" stroke={gold} strokeWidth="1" className="landing-pulse-ring" />
                    <circle cx="260" cy="260" r="48" stroke={soft} strokeWidth="1" />

                    <path d="M260 182 L260 260" stroke={gold} strokeWidth="1" className="landing-flow-line" />
                    <path d="M192 220 L260 260" stroke={gold} strokeWidth="1" className="landing-flow-line" style={{ animationDelay: '0.8s' }} />
                    <path d="M328 220 L260 260" stroke={gold} strokeWidth="1" className="landing-flow-line" style={{ animationDelay: '1.6s' }} />
                    <path d="M192 300 L260 260" stroke={gold} strokeWidth="1" className="landing-flow-line" style={{ animationDelay: '2.4s' }} />
                    <path d="M328 300 L260 260" stroke={gold} strokeWidth="1" className="landing-flow-line" style={{ animationDelay: '3.2s' }} />

                    <circle cx="260" cy="260" r="8" fill={node} />
                    <circle cx="260" cy="260" r="3" fill={isDark ? '#0a0908' : '#ebeae7'} />

                    <circle cx="260" cy="182" r="4" fill={node} opacity="0.85" />
                    <circle cx="192" cy="220" r="3" fill={node} opacity="0.7" />
                    <circle cx="328" cy="220" r="3" fill={node} opacity="0.7" />
                    <circle cx="192" cy="300" r="3" fill={node} opacity="0.7" />
                    <circle cx="328" cy="300" r="3" fill={node} opacity="0.7" />
                </svg>
            </div>
        </div>
    );
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
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({ ...formData, payment_method: 'all' }),
            });

            const result = await response.json();
            if (result.success && result.payment_url) {
                setSuccess('Pesanan berhasil dibuat. Mengalihkan ke halaman pembayaran...');
                window.location.href = result.payment_url;
            } else if (result.errors) {
                const errorMsg = Object.values(result.errors).flat().join(' | ');
                setError(errorMsg || result.message || 'Gagal membuat pesanan.');
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
                                <span className={t.brand}>{companyName}</span>
                            )}
                        </Link>

                        <nav className="hidden md:flex items-center gap-8">
                            <a href="/" onClick={handleBerandaNav} className={t.navLink}>
                                Beranda
                            </a>
                            <a href="#fitur" onClick={(e) => handleSectionNav(e, 'fitur')} className={t.navLink}>
                                Layanan
                            </a>
                            <a href="#pesan" onClick={(e) => handleSectionNav(e, 'pesan')} className={t.navLink}>
                                Pesan
                            </a>
                            <a href="#kontak" onClick={(e) => handleSectionNav(e, 'kontak')} className={t.navLink}>
                                Kontak
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
                                    <UserCircle className={`w-3.5 h-3.5 ${t.accentIcon}`} />
                                    Portal
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
                            <a href="/" onClick={handleBerandaNav} className={t.mobileNavLink}>
                                Beranda
                            </a>
                            <a href="#fitur" onClick={(e) => handleSectionNav(e, 'fitur')} className={t.mobileNavLink}>
                                Layanan
                            </a>
                            <a href="#pesan" onClick={(e) => handleSectionNav(e, 'pesan')} className={t.mobileNavLink}>
                                Pesan
                            </a>
                            <a href="#kontak" onClick={(e) => handleSectionNav(e, 'kontak')} className={t.mobileNavLink}>
                                Kontak
                            </a>
                            <Link
                                href="/portal"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`${t.ctaPrimary} mt-1`}
                            >
                                <UserCircle className="w-4 h-4" />
                                Portal Pelanggan
                            </Link>
                        </nav>
                    </div>
                </header>

                {/* Hero — one composition: brand, headline, support, CTA, full-bleed visual */}
                <section className="relative min-h-[calc(100svh-4rem)] flex items-center overflow-hidden">
                    <div className={`landing-hero-photo ${isDarkMode ? 'landing-hero-photo-dark' : 'landing-hero-photo-light'}`} aria-hidden>
                        <picture>
                            <source
                                type="image/webp"
                                srcSet="/images/landing-hero-bg-2k.webp 2560w, /images/landing-hero-bg.webp 3840w"
                                sizes="100vw"
                            />
                            <img
                                src="/images/landing-hero-bg.png"
                                alt=""
                                width={3840}
                                height={2160}
                                decoding="async"
                                fetchPriority="high"
                            />
                        </picture>
                    </div>
                    <div className={`absolute inset-0 pointer-events-none ${isDarkMode ? 'landing-hero-scrim-dark' : 'landing-hero-scrim-light'}`} />
                    <div className={`absolute inset-0 ${isDarkMode ? 'landing-hero-mesh' : 'landing-hero-mesh-light'}`} />
                    <HeroLuxuryVisual isDark={isDarkMode} />
                    <div className={`absolute inset-0 pointer-events-none ${isDarkMode ? 'landing-vignette' : 'landing-vignette-light'}`} />
                    <div
                        className={`absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t pointer-events-none ${
                            isDarkMode ? 'from-[#0a0908] to-transparent' : 'from-[#ebeae7] to-transparent'
                        }`}
                    />

                    <div className="relative z-10 w-full max-w-6xl mx-auto px-5 sm:px-6 py-14 sm:py-28">
                        <div className="max-w-2xl mx-auto sm:mx-0 space-y-4 sm:space-y-7 text-center sm:text-left">
                            <div className="landing-reveal">
                                <div className="landing-rule mb-4 sm:mb-6 mx-auto sm:mx-0" />
                                <p className={t.brandHero}>
                                    {companyName}
                                </p>
                            </div>
                            <h1 className={`font-display text-[1.25rem] sm:text-3xl lg:text-[2.15rem] font-normal italic tracking-tight leading-snug px-1 sm:px-0 landing-reveal landing-reveal-delay-1 ${
                                isDarkMode ? 'text-[#c9b896]' : 'text-[#8a7355]'
                            }`}>
                                Infrastruktur digital yang tenang, presisi, dan berkelas.
                            </h1>
                            <BrandingTagline
                                lines={3}
                                as="p"
                                className={`${t.heroTagline} landing-reveal landing-reveal-delay-2`}
                            >
                                {tagline}
                            </BrandingTagline>
                            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 pt-2 sm:pt-3 w-full max-w-[260px] sm:max-w-none mx-auto sm:mx-0 landing-reveal landing-reveal-delay-3">
                                <a
                                    href="#pesan"
                                    onClick={(e) => handleSectionNav(e, 'pesan')}
                                    className={t.ctaPrimary}
                                >
                                    Pesan Layanan
                                    <ChevronRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                                </a>
                                <a
                                    href="#kontak"
                                    onClick={(e) => handleSectionNav(e, 'kontak')}
                                    className={t.ctaSecondary}
                                >
                                    Konsultasi
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Layanan */}
                <section id="fitur" className={`py-24 sm:py-28 ${t.sectionAlt}`}>
                    <div className="max-w-6xl mx-auto px-4 sm:px-6">
                        <div className="max-w-xl mb-14 sm:mb-16 space-y-4">
                            <p className={t.sectionLabel}>Layanan</p>
                            <h2 className={t.headingLg}>
                                Empat pilar untuk operasional yang tenang
                            </h2>
                            <p className={t.subtext}>
                                Dari produk digital hingga infrastruktur jaringan — dikerjakan dengan ketelitian dan standar yang konsisten.
                            </p>
                        </div>

                        <div className="max-w-3xl">
                            {SERVICES.map(({ icon: Icon, title, body }) => (
                                <div key={title} className={t.featureRow}>
                                    <div className={t.featureIcon}>
                                        <Icon className="w-4 h-4" strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <h3 className={t.featureTitle}>{title}</h3>
                                        <p className={t.featureBody}>{body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pesan */}
                <section id="pesan" className={`py-24 sm:py-28 ${t.section}`}>
                    <div className="max-w-6xl mx-auto px-4 sm:px-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
                            <div className="lg:col-span-5 space-y-5">
                                <p className={t.sectionLabel}>Pesan Layanan</p>
                                <h2 className={t.headingLg}>
                                    Proses singkat. Pembayaran yang mulus.
                                </h2>
                                <p className={t.subtextSm}>
                                    Lengkapi data, pilih layanan, lalu bayar via QRIS, Virtual Account, atau e-wallet — tanpa prosedur yang bertele-tele.
                                </p>

                                <div className={t.orderDivider}>
                                    <div className="flex items-start gap-3">
                                        <div className={t.checkIcon}>✓</div>
                                        <p className={t.body}>
                                            <strong className={isDarkMode ? 'text-[#f0ebe3]' : 'text-[#1a1814]'}>Gateway otomatis</strong>
                                            {' '}— pembayaran diproses lewat merchant resmi.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className={t.checkIcon}>✓</div>
                                        <p className={t.body}>
                                            <strong className={isDarkMode ? 'text-[#f0ebe3]' : 'text-[#1a1814]'}>E-invoice</strong>
                                            {' '}— dikirim ke email & WhatsApp setelah pesanan dibuat.
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className={t.checkIcon}>✓</div>
                                        <p className={t.body}>
                                            <strong className={isDarkMode ? 'text-[#f0ebe3]' : 'text-[#1a1814]'}>Respons cepat</strong>
                                            {' '}— tim teknis memproses setelah pembayaran selesai.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-7">
                                <div className={t.formCard}>
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {error && (
                                            <div className="p-3.5 rounded-lg border border-rose-500/25 bg-rose-500/5 text-rose-400 text-xs sm:text-sm font-medium">
                                                {error}
                                            </div>
                                        )}
                                        {success && (
                                            <div className={`p-3.5 rounded-lg border text-xs sm:text-sm font-medium ${
                                                isDarkMode
                                                    ? 'border-[#c9b896]/25 bg-[#c9b896]/08 text-[#c9b896]'
                                                    : 'border-[#8a7355]/25 bg-[#c9b896]/15 text-[#8a7355]'
                                            }`}>
                                                {success}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className={`${t.ctaPrimary} w-full mt-2 disabled:opacity-50`}
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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

                {/* Kontak */}
                <section id="kontak" className={`py-24 sm:py-28 ${t.sectionAlt}`}>
                    <div className="max-w-6xl mx-auto px-4 sm:px-6">
                        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start">
                            <div className="lg:col-span-5 space-y-5">
                                <p className={t.sectionLabel}>Kontak</p>
                                <h2 className={t.headingLg}>
                                    Mari diskusikan kebutuhan Anda
                                </h2>
                                <p className={`${t.subtext} max-w-md`}>
                                    Konsultasi website, instalasi jaringan, cloud, dan support operasional — dengan komunikasi yang jelas dan respons yang terukur.
                                </p>

                                {whatsappHref && (
                                    <a
                                        href={whatsappHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`${t.ctaPrimary} w-full sm:w-auto`}
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Chat via WhatsApp
                                        <ArrowRight className="w-4 h-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                                    </a>
                                )}
                            </div>

                            <div className="lg:col-span-7">
                                {!email && !phone && !address && !website ? (
                                    <div className={t.contactEmpty}>
                                        <Headphones className={`w-8 h-8 mx-auto mb-3 ${isDarkMode ? 'text-[#5c5850]' : 'text-[#9a958c]'}`} />
                                        <p className={`text-sm ${isDarkMode ? 'text-[#6e6a62]' : 'text-[#6e6a62]'}`}>
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
                                                accentClass={t.accent}
                                                iconWrapClass={isDarkMode
                                                    ? 'bg-[#c9b896]/08 border-[#c9b896]/25 text-[#c9b896]'
                                                    : 'bg-[#c9b896]/15 border-[#c9b896]/40 text-[#8a7355]'}
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
                                                accentClass={t.accent}
                                                iconWrapClass={isDarkMode
                                                    ? 'bg-[#c9b896]/08 border-[#c9b896]/25 text-[#c9b896]'
                                                    : 'bg-[#c9b896]/15 border-[#c9b896]/40 text-[#8a7355]'}
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
                                                accentClass={t.accent}
                                                iconWrapClass={isDarkMode
                                                    ? 'bg-[#c9b896]/08 border-[#c9b896]/25 text-[#c9b896]'
                                                    : 'bg-[#c9b896]/15 border-[#c9b896]/40 text-[#8a7355]'}
                                                theme={t}
                                            />
                                        )}
                                        {address && (
                                            <ContactChannelCard
                                                icon={MapPin}
                                                label="Alamat Kantor"
                                                value={address}
                                                accentClass={isDarkMode ? 'text-[#9a958c]' : 'text-[#6e6a62]'}
                                                iconWrapClass={isDarkMode
                                                    ? 'bg-white/[0.03] border-[#c9b896]/15 text-[#9a958c]'
                                                    : 'bg-white/60 border-[#2a2824]/1 text-[#6e6a62]'}
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
