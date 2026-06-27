import { useEffect, useState } from 'react';
import { useScheduledTheme } from '../../hooks/useScheduledTheme';
import { Link, router, usePage } from '@inertiajs/react';
import PullToRefresh from '../../Components/PullToRefresh';
import OntWifiPanel from '../../Components/OntWifiPanel';
import CustomerLiveTrafficPanel from '../../Components/CustomerLiveTrafficPanel';
import SeoHead from '../../Components/SeoHead';
import AppFooter from '../../Components/AppFooter';
import BrandingTagline, { BrandingCompanyName } from '../../Components/BrandingTagline';
import { formatRupiah } from '../../utils/formatRupiah';
import { formatDisplayDate, resolveCustomerDueDate } from '../../utils/formatDateInputValue';
import { formatBandwidthLimitLabel } from '../../utils/customerMetrics';
import { getTimeOfDayGreeting } from '../../utils/timeOfDayGreeting';
import {
    LogOut,
    Sun,
    Moon,
    User,
    Wifi,
    Server,
    Cpu,
    HardDrive,
    Globe,
    CreditCard,
    CheckCircle2,
    Clock,
    ArrowRight,
    Activity,
    FileText,
    Phone,
    MapPin,
    Mail,
    Terminal,
    Printer,
} from 'lucide-react';

export default function CustomerDashboard({
    auth,
    customer,
    invoices = [],
    activeGateway,
    portalView = 'default',
    vpsPlan = null,
}) {
    const isVpsPortal = portalView === 'vps';
    const isMidtransGateway = activeGateway === 'midtrans';
    const { branding = {} } = usePage().props;
    const { isDarkMode, isAutoTheme, toggleTheme } = useScheduledTheme('mwifi.customer.theme');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
        activeGateway === 'midtrans' || activeGateway === 'duitku' ? 'all' : 'qris'
    );
    const [isPaying, setIsPaying] = useState(null); // stores invoice ID currently processing
    const [timeGreeting, setTimeGreeting] = useState(() => getTimeOfDayGreeting());

    useEffect(() => {
        const syncGreeting = () => setTimeGreeting(getTimeOfDayGreeting());
        syncGreeting();

        const intervalId = setInterval(syncGreeting, 60_000);

        return () => clearInterval(intervalId);
    }, []);

    const handleLogout = () => {
        router.post('/logout');
    };

    // Calculate dates/amounts
    // Calculate dates/amounts
    const unpaidInvoices = invoices.filter(inv => inv.status === 'unpaid');
    const paidInvoices = invoices.filter(inv => inv.status === 'paid');

    const handlePay = async (invoiceId) => {
        setIsPaying(invoiceId);
        try {
            const response = await fetch(`/customer/invoice/${invoiceId}/pay`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
                },
                body: JSON.stringify({
                    payment_method: activeGateway === 'midtrans' || activeGateway === 'duitku' ? 'all' : selectedPaymentMethod,
                })
            });

            const result = await response.json();

            if (result.success && result.payment_url) {
                // Redirect customer to the payment gateway checkout page
                window.location.href = result.payment_url;
            } else {
                alert(result.message || 'Gagal memproses pembayaran. Hubungi Admin.');
            }
        } catch (err) {
            console.error(err);
            alert('Terjadi kesalahan koneksi sistem pembayaran.');
        } finally {
            setIsPaying(null);
        }
    };

    const handlePrintReceipt = (invoiceId, format = 'half') => {
        window.open(
            `/customer/invoice/${invoiceId}/print?format=${format}`,
            '_blank',
            'noopener,noreferrer'
        );
    };

    // Style Tokens
    const themeBg = isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-800';
    const themeCard = isDarkMode ? 'bg-zinc-900/50 border-zinc-800/80 backdrop-blur-md' : 'bg-white border-zinc-200 shadow-sm';
    const themeTextTitle = isDarkMode ? 'text-white' : 'text-zinc-900';
    const themeTextSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
    const themeTextDesc = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';
    const themeInnerWidget = isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';
    const themeNav = isDarkMode ? 'bg-zinc-900/80 border-zinc-800/60' : 'bg-white/80 border-zinc-200 shadow-xs';

    // Status Styling
    const ispStatusConfig = {
        active: { label: 'AKTIF / TERHUBUNG', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
        isolated: { label: 'ISOLIR / TERTUNGGAK', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
        inactive: { label: 'NON-AKTIF', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
        suspended: { label: 'SUSPEN / DITANGGUHKAN', color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' },
    };
    const vpsStatusConfig = {
        running: { label: 'SERVER AKTIF', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
        suspended: { label: 'SERVER SUSPEND', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
        stopped: { label: 'SERVER NONAKTIF', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
    };
    const activeStatus = isVpsPortal
        ? (vpsStatusConfig[customer.status] || vpsStatusConfig.running)
        : (ispStatusConfig[customer.status] || ispStatusConfig.active);

    const accentIconClass = isVpsPortal ? 'text-violet-500' : 'text-emerald-500';
    const accentGradient = isVpsPortal
        ? 'from-violet-500/10 to-indigo-500/10 border-violet-500/15'
        : 'from-emerald-500/10 to-teal-500/10 border-emerald-500/15';
    const payButtonClass = isVpsPortal
        ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:shadow-violet-500/10'
        : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-emerald-500/10';

    const gatewayCheckoutHint = {
        midtrans: 'Klik Bayar untuk membuka halaman Midtrans (GoPay, QRIS, VA, Alfamart, dll.)',
        duitku: 'Klik Bayar untuk membuka halaman Duitku (GoPay, QRIS, VA, Alfamart, dll.)',
    };

    // Payment Methods options based on gateway
    const paymentMethods = activeGateway === 'tripay' ? [
        { id: 'qris', label: 'QRIS (Gopay, OVO, Dana, LinkAja)' },
        { id: 'bcamaca', label: 'Virtual Account BCA' },
        { id: 'mandiriva', label: 'Virtual Account Mandiri' },
        { id: 'briva', label: 'Virtual Account BRI' },
        { id: 'alfamart', label: 'Alfamart' }
    ] : [];

    const formatDate = (dateStr) => formatDisplayDate(dateStr);

    return (
        <>
            <SeoHead
                title={isVpsPortal ? `Portal VPS Cloud${branding.company_name ? ` — ${branding.company_name}` : ''}` : `Portal Pelanggan${branding.company_name ? ` — ${branding.company_name}` : ''}`}
                branding={branding}
            />
            <PullToRefresh useWindowScroll isDarkMode={isDarkMode} className={`min-h-screen font-sans antialiased transition-colors duration-250 ${themeBg}`}>
                
                {/* Navbar */}
                <nav className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-250 ${themeNav}`}>
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-14">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                                {branding.logo_url ? (
                                    <img src={branding.logo_url} alt={branding.company_name} className="w-8 h-8 object-contain shrink-0" />
                                ) : (
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-lg shrink-0 ${isVpsPortal ? 'bg-violet-600 shadow-violet-500/20' : 'bg-emerald-500 shadow-emerald-500/20'}`}>
                                        {isVpsPortal ? <Server className="w-4 h-4 text-white" /> : <Wifi className="w-4 h-4 text-white" />}
                                    </div>
                                )}
                                <div className="min-w-0 overflow-hidden">
                                    <BrandingCompanyName className={`text-sm font-bold tracking-wide ${themeTextTitle}`}>
                                        {isVpsPortal ? (branding.company_name || 'Cloud VPS') : (branding.company_name || 'Portal Pelanggan')}
                                    </BrandingCompanyName>
                                    <BrandingTagline lines={2} className={`text-[9px] ${themeTextSub} mt-0.5`}>
                                        {isVpsPortal ? 'Layanan Sewa Virtual Private Server' : branding.company_tagline}
                                    </BrandingTagline>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                {/* Theme Toggle */}
                                <button 
                                    onClick={toggleTheme}
                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white' : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900'}`}
                                    aria-label={isAutoTheme ? 'Tema otomatis mengikuti waktu. Klik untuk ganti.' : 'Ganti tema'}
                                    title={isAutoTheme ? 'Otomatis (06:00–18:00 terang)' : undefined}
                                >
                                    {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                                </button>
                                
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${activeStatus.color}`}>
                                    {activeStatus.label}
                                </span>

                                <button 
                                    onClick={handleLogout}
                                    className={`p-1.5 rounded-lg border flex items-center space-x-1.5 text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    
                    {/* Welcome Banner */}
                    <div className={`mb-6 p-5 rounded-2xl bg-gradient-to-r border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${accentGradient}`}>
                        <div className="space-y-1">
                            <h1 className={`text-lg sm:text-xl font-bold ${themeTextTitle}`}>{timeGreeting}, {customer.name}!</h1>
                            <p className={`text-xs ${themeTextSub}`}>
                                {isVpsPortal
                                    ? 'Kelola instance VPS cloud Anda dan tagihan sewa server di satu dasbor.'
                                    : 'Kelola layanan internet Anda secara mandiri di satu dasbor terpadu.'}
                            </p>
                        </div>
                        {isVpsPortal ? (
                            <div className="flex items-center space-x-2">
                                <Activity className={`w-4 h-4 animate-pulse ${accentIconClass}`} />
                                <span className={`text-xs font-bold ${accentIconClass}`}>
                                    Instance Running
                                </span>
                            </div>
                        ) : null}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Profile & Package Info Card */}
                        <div className="lg:col-span-1 space-y-6">
                            
                            {/* Profile Details */}
                            <div className={`border rounded-2xl p-5 space-y-4 ${themeCard}`}>
                                <div className="flex items-center space-x-2 pb-2 border-b border-zinc-800/40">
                                    <User className={`w-4 h-4 ${accentIconClass}`} />
                                    <h2 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>
                                        {isVpsPortal ? 'Profil Akun Cloud' : 'Detail Pelanggan'}
                                    </h2>
                                </div>
                                {isVpsPortal ? (
                                    <div className="space-y-3 text-xs">
                                        <div>
                                            <p className={themeTextDesc}>Server ID</p>
                                            <p className={`font-mono font-bold ${themeTextTitle}`}>{customer.server_id}</p>
                                        </div>
                                        <div>
                                            <p className={themeTextDesc}>Region / DC</p>
                                            <div className="flex items-center space-x-1.5 mt-0.5">
                                                <Globe className="w-3 h-3 text-zinc-500" />
                                                <p className={`font-semibold ${themeTextTitle}`}>{customer.region}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className={themeTextDesc}>Kontak WhatsApp</p>
                                            <div className="flex items-center space-x-1.5 mt-0.5">
                                                <Phone className="w-3 h-3 text-zinc-500" />
                                                <p className={`font-semibold ${themeTextTitle}`}>{customer.phone_number}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className={themeTextDesc}>Siklus Penagihan</p>
                                            <p className={`font-semibold ${themeTextTitle}`}>{customer.billing_cycle}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3 text-xs">
                                        <div>
                                            <p className={themeTextDesc}>Username Layanan</p>
                                            <p className={`font-mono font-bold ${themeTextTitle}`}>{customer.username}</p>
                                        </div>
                                        <div>
                                            <p className={themeTextDesc}>Nomor Telepon</p>
                                            <div className="flex items-center space-x-1.5 mt-0.5">
                                                <Phone className="w-3 h-3 text-zinc-500" />
                                                <p className={`font-semibold ${themeTextTitle}`}>{customer.phone_number}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className={themeTextDesc}>Alamat Pemasangan</p>
                                            <div className="flex items-start space-x-1.5 mt-0.5">
                                                <MapPin className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                                                <p className={`font-medium ${themeTextTitle}`}>{customer.address}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className={themeTextDesc}>Tgl Jatuh Tempo</p>
                                            <p className={`font-semibold ${themeTextTitle}`}>{formatDisplayDate(resolveCustomerDueDate(customer))}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={`border rounded-2xl p-5 space-y-4 ${themeCard}`}>
                                <div className="flex items-center space-x-2 pb-2 border-b border-zinc-800/40">
                                    {isVpsPortal ? (
                                        <Server className={`w-4 h-4 ${accentIconClass}`} />
                                    ) : (
                                        <Wifi className={`w-4 h-4 ${accentIconClass}`} />
                                    )}
                                    <h2 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>
                                        {isVpsPortal ? 'Paket VPS Aktif' : 'Paket Layanan'}
                                    </h2>
                                </div>
                                {isVpsPortal ? (
                                    vpsPlan ? (
                                        <div className="space-y-3 text-xs">
                                            <div className={`p-3 rounded-xl border ${themeInnerWidget} space-y-1`}>
                                                <p className={`font-bold text-sm ${themeTextTitle}`}>{vpsPlan.name}</p>
                                                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Cloud Compute Instance</p>
                                            </div>
                                            <ul className="space-y-2">
                                                <li className="flex items-center gap-2"><Cpu className={`w-3.5 h-3.5 ${accentIconClass}`} />{vpsPlan.cpu}</li>
                                                <li className="flex items-center gap-2"><Server className={`w-3.5 h-3.5 ${accentIconClass}`} />{vpsPlan.ram}</li>
                                                <li className="flex items-center gap-2"><HardDrive className={`w-3.5 h-3.5 ${accentIconClass}`} />{vpsPlan.storage}</li>
                                                <li className="flex items-center gap-2"><Globe className={`w-3.5 h-3.5 ${accentIconClass}`} />{vpsPlan.bandwidth}</li>
                                            </ul>
                                            <div>
                                                <p className={themeTextDesc}>Deskripsi Paket</p>
                                                <p className={`font-medium mt-0.5 ${themeTextSub}`}>{vpsPlan.description}</p>
                                            </div>
                                            <div>
                                                <p className={themeTextDesc}>Biaya Sewa Bulanan</p>
                                                <p className="font-extrabold text-base text-violet-400 mt-0.5">
                                                    {formatRupiah(vpsPlan.price)} <span className="text-[10px] font-medium text-zinc-500">/ bulan</span>
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className={`text-xs ${themeTextSub}`}>Belum ada paket VPS terpasang.</p>
                                    )
                                ) : customer.package ? (
                                    <div className="space-y-3 text-xs">
                                        <div className={`p-3 rounded-xl border ${themeInnerWidget} space-y-1`}>
                                            <p className={`font-bold text-sm ${themeTextTitle}`}>{customer.package.name}</p>
                                            <p className={`text-[10px] font-bold text-emerald-500 uppercase tracking-widest`}>
                                                Batas Bandwidth: {formatBandwidthLimitLabel(customer.package.bandwidth_limit) || '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className={themeTextDesc}>Deskripsi Layanan</p>
                                            <p className={`font-medium mt-0.5 ${themeTextSub}`}>{customer.package.description}</p>
                                        </div>
                                        <div>
                                            <p className={themeTextDesc}>Biaya Bulanan</p>
                                            <p className="font-extrabold text-base text-emerald-500 mt-0.5">
                                                {formatRupiah(customer.package.price)} <span className="text-[10px] font-medium text-zinc-500">/ Bulan (excl. pajak)</span>
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-rose-500">Belum ada paket internet terpasang pada akun Anda.</p>
                                )}
                            </div>

                            {!isVpsPortal && (
                                <CustomerLiveTrafficPanel
                                    bandwidthLimit={customer.package?.bandwidth_limit || ''}
                                    accentIconClass={accentIconClass}
                                    themeCard={themeCard}
                                    themeTextTitle={themeTextTitle}
                                    themeTextSub={themeTextSub}
                                    themeTextDesc={themeTextDesc}
                                    isDarkMode={isDarkMode}
                                />
                            )}

                            {!isVpsPortal && customer.service_type !== 'hotspot' && (
                                <div className={`border rounded-2xl p-5 space-y-3 ${themeCard}`}>
                                    <div className="flex items-center space-x-2 pb-2 border-b border-zinc-800/40">
                                        <Wifi className={`w-4 h-4 ${accentIconClass}`} />
                                        <h2 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>
                                            Pengaturan WiFi Rumah
                                        </h2>
                                    </div>
                                    <p className={`text-[10px] leading-relaxed ${themeTextDesc}`}>
                                        Ubah nama jaringan WiFi dan password router ONT Anda. Perubahan diterapkan langsung ke perangkat via sistem monitoring.
                                    </p>
                                    <OntWifiPanel
                                        apiBase="/customer"
                                        username={customer.username}
                                        canWrite
                                        bare
                                        theme={{
                                            isDarkMode,
                                            themeTextTitle,
                                            themeTextSub,
                                            themeTextDesc,
                                        }}
                                    />
                                </div>
                            )}

                        </div>

                        {/* Invoices and checkout section */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* Unpaid Invoices */}
                            <div className={`border rounded-2xl p-5 space-y-4 ${themeCard}`}>
                                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/40">
                                    <div className="flex items-center space-x-2">
                                        <CreditCard className="w-4 h-4 text-amber-500" />
                                        <h2 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>
                                            {isVpsPortal ? 'Tagihan Sewa VPS (Belum Lunas)' : 'Tagihan Berjalan (Belum Lunas)'}
                                        </h2>
                                    </div>
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full">
                                        {unpaidInvoices.length} Tagihan
                                    </span>
                                </div>

                                {unpaidInvoices.length === 0 ? (
                                    <div className="py-8 text-center space-y-3">
                                        <CheckCircle2 className={`w-8 h-8 mx-auto ${isVpsPortal ? 'text-violet-400' : 'text-emerald-500'}`} />
                                        <p className={`text-xs font-bold ${themeTextTitle}`}>
                                            {isVpsPortal ? 'Tidak Ada Tagihan VPS Aktif' : 'Tagihan Anda Lunas!'}
                                        </p>
                                        <p className={`text-[10px] max-w-sm mx-auto ${themeTextDesc}`}>
                                            {isVpsPortal
                                                ? 'Tidak ada tagihan VPS yang perlu dibayar saat ini.'
                                                : 'Terima kasih telah membayar tagihan internet tepat waktu.'}
                                        </p>
                                        {isVpsPortal && (
                                            <div className="space-y-2 pt-1">
                                                <button
                                                    type="button"
                                                    disabled
                                                    aria-disabled="true"
                                                    title="Hanya tersedia untuk pelanggan VPS aktif"
                                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold cursor-not-allowed opacity-60 ${
                                                        isDarkMode
                                                            ? 'bg-zinc-900/60 border-zinc-700/80 text-zinc-500'
                                                            : 'bg-zinc-100 border-zinc-200 text-zinc-400'
                                                    }`}
                                                >
                                                    <Terminal className="w-3.5 h-3.5" />
                                                    Terminal Console
                                                </button>
                                                <p className={`text-[10px] max-w-xs mx-auto leading-relaxed ${isDarkMode ? 'text-violet-400/80' : 'text-violet-600/80'}`}>
                                                    Terminal Console hanya aktif untuk pelanggan VPS nyata dengan layanan berjalan.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {unpaidInvoices.map((inv) => (
                                            <div key={inv.id} className={`p-4 border rounded-2xl flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-5 ${themeInnerWidget}`}>
                                                <div className="space-y-1 min-w-0 flex-1">
                                                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                                                        <span className={`font-mono text-xs font-black min-w-0 break-all ${themeTextTitle}`}>{inv.invoice_number}</span>
                                                        <span className="shrink-0 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">Belum Bayar</span>
                                                    </div>
                                                    <p className={`text-[10px] ${themeTextSub}`}>
                                                        {isVpsPortal
                                                            ? (inv.service_label || inv.billing_period)
                                                            : `Periode Billing: ${inv.billing_period}`}
                                                    </p>
                                                    {!isVpsPortal && inv.is_prorated ? (
                                                        <p className="text-[10px] text-amber-500 font-bold">Prorata {inv.days_billed}/30 hari · Subtotal {formatRupiah(inv.amount)}</p>
                                                    ) : null}
                                                    <div className="flex items-center space-x-2 text-[10px] text-zinc-500 mt-1">
                                                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                                                        <span>Jatuh Tempo: <b className="text-rose-500">{formatDate(inv.due_date)}</b></span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 lg:gap-4 lg:shrink-0">
                                                    {activeGateway === 'tripay' ? (
                                                        <div className="flex flex-col gap-1 sm:w-44 lg:w-48">
                                                            <label className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Metode Bayar</label>
                                                            <select
                                                                value={selectedPaymentMethod}
                                                                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                                                className={`text-xs p-1.5 rounded-lg border font-semibold ${isDarkMode ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-white border-zinc-200 text-zinc-700 shadow-2xs'}`}
                                                            >
                                                                {paymentMethods.map((pm) => (
                                                                    <option key={pm.id} value={pm.id}>{pm.label}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <div className={`flex flex-col gap-1 rounded-xl border px-3 py-2.5 sm:w-52 lg:w-56 ${isDarkMode ? 'border-zinc-800/80 bg-zinc-950/30' : 'border-zinc-200/80 bg-white/70'}`}>
                                                            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">Pembayaran Online</span>
                                                            <span className={`text-[10px] leading-relaxed ${themeTextSub}`}>
                                                                {isVpsPortal && isMidtransGateway
                                                                    ? 'Klik Bayar untuk membuka halaman Midtrans Snap (QRIS, GoPay, VA, dll.).'
                                                                    : (gatewayCheckoutHint[activeGateway] || gatewayCheckoutHint.midtrans)}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 lg:min-w-[11rem]">
                                                        <div className="flex flex-col text-left sm:text-right">
                                                            <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold leading-none">Total Tagihan</span>
                                                            <span className={`text-sm font-extrabold ${themeTextTitle}`}>{formatRupiah(inv.total_amount)}</span>
                                                        </div>

                                                        <button
                                                            onClick={() => handlePay(inv.id)}
                                                            disabled={isPaying !== null}
                                                            className={`shrink-0 px-4 py-2 text-white rounded-xl text-xs font-bold shadow-lg cursor-pointer flex items-center justify-center space-x-1.5 transition-all duration-150 ${payButtonClass} ${isPaying ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
                                                        >
                                                            <span>{isPaying === inv.id ? 'Memproses...' : 'Bayar'}</span>
                                                            <ArrowRight className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Paid Invoices History */}
                            <div className={`border rounded-2xl p-5 space-y-4 ${themeCard}`}>
                                <div className="flex items-center space-x-2 pb-2 border-b border-zinc-800/40">
                                    <FileText className="w-4 h-4 text-emerald-500" />
                                    <h2 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>
                                        {isVpsPortal ? 'Riwayat Pembayaran VPS' : 'Riwayat Pembayaran (Lunas)'}
                                    </h2>
                                </div>

                                {paidInvoices.length === 0 ? (
                                    <p className={`text-xs text-center py-4 ${themeTextDesc}`}>Belum ada invoice lunas yang tercatat.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className={`border-b border-zinc-800/30 text-[9px] uppercase tracking-wider ${themeTextDesc}`}>
                                                    <th className="py-2.5 font-bold">No. Invoice</th>
                                                    <th className="py-2.5 font-bold">{isVpsPortal ? 'Layanan' : 'Periode'}</th>
                                                    <th className="py-2.5 font-bold">Jumlah</th>
                                                    <th className="py-2.5 font-bold">Tgl Lunas</th>
                                                    {!isVpsPortal && (
                                                        <th className="py-2.5 font-bold">Tagihan Selanjutnya</th>
                                                    )}
                                                    <th className="py-2.5 font-bold text-right">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/20 text-xs">
                                                {paidInvoices.map((inv) => (
                                                    <tr key={inv.id} className={`${themeTextSub}`}>
                                                        <td className="py-2.5 font-mono font-bold">{inv.invoice_number}</td>
                                                        <td className="py-2.5 font-medium">
                                                            {isVpsPortal ? (inv.service_label || inv.billing_period) : inv.billing_period}
                                                        </td>
                                                        <td className={`py-2.5 font-extrabold ${isVpsPortal ? 'text-violet-400' : 'text-emerald-500'}`}>{formatRupiah(inv.total_amount)}</td>
                                                        <td className="py-2.5 font-medium">{formatDate(inv.paid_at)}</td>
                                                        {!isVpsPortal && (
                                                            <td className="py-2.5">
                                                                {inv.next_billing ? (
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="font-mono font-bold">{inv.next_billing.period}</span>
                                                                        <span className="font-bold text-cyan-500">{formatRupiah(inv.next_billing.total_amount)}</span>
                                                                        <span className={`text-[10px] ${themeTextDesc}`}>
                                                                            Jatuh tempo {formatDisplayDate(inv.next_billing.due_date)}
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span className={themeTextDesc}>-</span>
                                                                )}
                                                            </td>
                                                        )}
                                                        <td className="py-2.5 text-right">
                                                            <div className="flex flex-col items-end gap-1.5">
                                                                <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Lunas</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handlePrintReceipt(inv.id)}
                                                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${isDarkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100'}`}
                                                                    title="Cetak bukti pembayaran"
                                                                >
                                                                    <Printer className="w-3 h-3" />
                                                                    Cetak
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                        </div>

                    </div>

                </main>

                {(branding.company_name || branding.company_phone || branding.company_email || branding.company_address) && (
                    <footer className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                        <div className={`border-t pt-4 ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 text-xs">
                                <div className="min-w-0 flex-1">
                                    <BrandingCompanyName as="p" className={`font-bold ${themeTextTitle}`}>
                                        {branding.company_name || branding.app_name}
                                    </BrandingCompanyName>
                                    <BrandingTagline as="p" lines={3} className={`${themeTextSub} mt-0.5`}>
                                        {branding.company_tagline}
                                    </BrandingTagline>
                                </div>
                                <div className={`space-y-1.5 ${themeTextSub}`}>
                                    {branding.company_phone && (
                                        <p className="flex items-center gap-1.5">
                                            <Phone className="w-3 h-3 shrink-0" />
                                            {branding.company_phone}
                                        </p>
                                    )}
                                    {branding.company_email && (
                                        <p className="flex items-center gap-1.5">
                                            <Mail className="w-3 h-3 shrink-0" />
                                            {branding.company_email}
                                        </p>
                                    )}
                                    {branding.company_address && (
                                        <p className="flex items-start gap-1.5">
                                            <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                                            {branding.company_address}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <AppFooter
                                branding={branding}
                                className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'} text-center`}
                                textClassName={`text-xs sm:text-sm leading-relaxed ${themeTextDesc}`}
                            />
                        </div>
                    </footer>
                )}
            </PullToRefresh>
        </>
    );
}
