import { useState } from 'react';
import { useScheduledTheme } from '../../hooks/useScheduledTheme';
import { router, usePage } from '@inertiajs/react';
import PullToRefresh from '../../Components/PullToRefresh';
import AppFooter from '../../Components/AppFooter';
import BrandingTagline, { BrandingCompanyName } from '../../Components/BrandingTagline';
import { formatRupiah } from '../../utils/formatRupiah';
import { 
    LogOut, 
    Sun, 
    Moon, 
    User, 
    Wifi, 
    CreditCard, 
    AlertCircle, 
    CheckCircle2, 
    Clock, 
    ArrowRight, 
    Activity, 
    FileText, 
    Phone, 
    MapPin,
    Mail,
    ShieldAlert
} from 'lucide-react';

export default function CustomerDashboard({ auth, customer, invoices = [], activeGateway }) {
    const { branding = {} } = usePage().props;
    const { isDarkMode, isAutoTheme, toggleTheme } = useScheduledTheme('mwifi.customer.theme');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('qris');
    const [isPaying, setIsPaying] = useState(null); // stores invoice ID currently processing

    const handleLogout = () => {
        router.post('/logout');
    };

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
                body: JSON.stringify({ payment_method: selectedPaymentMethod })
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

    // Style Tokens
    const themeBg = isDarkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-800';
    const themeCard = isDarkMode ? 'bg-zinc-900/50 border-zinc-800/80 backdrop-blur-md' : 'bg-white border-zinc-200 shadow-sm';
    const themeTextTitle = isDarkMode ? 'text-white' : 'text-zinc-900';
    const themeTextSub = isDarkMode ? 'text-zinc-400' : 'text-zinc-500';
    const themeTextDesc = isDarkMode ? 'text-zinc-500' : 'text-zinc-400';
    const themeInnerWidget = isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';
    const themeNav = isDarkMode ? 'bg-zinc-900/80 border-zinc-800/60' : 'bg-white/80 border-zinc-200 shadow-xs';

    // Status Styling
    const statusConfig = {
        active: { label: 'AKTIF / TERHUBUNG', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
        isolated: { label: 'ISOLIR / TERTUNGGAK', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
        inactive: { label: 'NON-AKTIF', color: 'text-rose-500 bg-rose-500/10 border-rose-500/20' },
        suspended: { label: 'SUSPEN / DITANGGUHKAN', color: 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20' }
    };
    const activeStatus = statusConfig[customer.status] || statusConfig.active;

    // Payment Methods options based on gateway
    const paymentMethods = activeGateway === 'tripay' ? [
        { id: 'qris', label: 'QRIS (Gopay, OVO, Dana, LinkAja)' },
        { id: 'bcamaca', label: 'Virtual Account BCA' },
        { id: 'mandiriva', label: 'Virtual Account Mandiri' },
        { id: 'briva', label: 'Virtual Account BRI' },
        { id: 'alfamart', label: 'Alfamart' }
    ] : [
        { id: 'all', label: 'Semua Metode (Midtrans Snap)' }
    ];

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <>
            <SeoHead title={`Portal Pelanggan${branding.company_name ? ` — ${branding.company_name}` : ''}`} branding={branding} />
            <PullToRefresh useWindowScroll isDarkMode={isDarkMode} className={`min-h-screen font-sans antialiased transition-colors duration-250 ${themeBg}`}>
                
                {/* Navbar */}
                <nav className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-250 ${themeNav}`}>
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center h-14">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                                {branding.logo_url ? (
                                    <img src={branding.logo_url} alt={branding.company_name} className="w-8 h-8 object-contain shrink-0" />
                                ) : (
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                                        <Wifi className="w-4 h-4 text-white" />
                                    </div>
                                )}
                                <div className="min-w-0 overflow-hidden">
                                    <BrandingCompanyName className={`text-sm font-bold tracking-wide ${themeTextTitle}`}>
                                        {branding.company_name || 'Portal Pelanggan'}
                                    </BrandingCompanyName>
                                    <BrandingTagline lines={2} className={`text-[9px] ${themeTextSub} mt-0.5`}>
                                        {branding.company_tagline}
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
                    <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className={`text-lg sm:text-xl font-bold ${themeTextTitle}`}>Selamat Datang, {customer.name}!</h1>
                            <p className={`text-xs ${themeTextSub}`}>Kelola layanan internet Anda secara mandiri di satu dasbor terpadu.</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-emerald-500">Koneksi ONT Aktif</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Profile & Package Info Card */}
                        <div className="lg:col-span-1 space-y-6">
                            
                            {/* Profile Details */}
                            <div className={`border rounded-2xl p-5 space-y-4 ${themeCard}`}>
                                <div className="flex items-center space-x-2 pb-2 border-b border-zinc-800/40">
                                    <User className="w-4 h-4 text-emerald-500" />
                                    <h2 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Detail Pelanggan</h2>
                                </div>
                                <div className="space-y-3 text-xs">
                                    <div>
                                        <p className={themeTextDesc}>Username Layanan</p>
                                        <p className={`font-mono font-bold ${themeTextTitle}`}>@{customer.username}</p>
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
                                        <p className={themeTextDesc}>Tanggal Cetak Tagihan</p>
                                        <p className={`font-semibold ${themeTextTitle}`}>Setiap Tanggal {customer.billing_date} Bulannya</p>
                                    </div>
                                </div>
                            </div>

                            {/* Package details */}
                            <div className={`border rounded-2xl p-5 space-y-4 ${themeCard}`}>
                                <div className="flex items-center space-x-2 pb-2 border-b border-zinc-800/40">
                                    <Wifi className="w-4 h-4 text-emerald-500" />
                                    <h2 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Paket Layanan</h2>
                                </div>
                                {customer.package ? (
                                    <div className="space-y-3 text-xs">
                                        <div className={`p-3 rounded-xl border ${themeInnerWidget} space-y-1`}>
                                            <p className={`font-bold text-sm ${themeTextTitle}`}>{customer.package.name}</p>
                                            <p className={`text-[10px] font-bold text-emerald-500 uppercase tracking-widest`}>Batas Bandwidth: {customer.package.bandwidth_limit}</p>
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

                        </div>

                        {/* Invoices and checkout section */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* Unpaid Invoices */}
                            <div className={`border rounded-2xl p-5 space-y-4 ${themeCard}`}>
                                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/40">
                                    <div className="flex items-center space-x-2">
                                        <CreditCard className="w-4 h-4 text-amber-500" />
                                        <h2 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Tagihan Berjalan (Belum Lunas)</h2>
                                    </div>
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full">
                                        {unpaidInvoices.length} Tagihan
                                    </span>
                                </div>

                                {unpaidInvoices.length === 0 ? (
                                    <div className="py-8 text-center space-y-2">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                                        <p className={`text-xs font-bold ${themeTextTitle}`}>Tagihan Anda Lunas!</p>
                                        <p className={`text-[10px] ${themeTextDesc}`}>Terima kasih telah membayar tagihan internet tepat waktu.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {unpaidInvoices.map((inv) => (
                                            <div key={inv.id} className={`p-4 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 ${themeInnerWidget}`}>
                                                <div className="space-y-1">
                                                    <div className="flex items-center space-x-2">
                                                        <span className={`font-mono text-xs font-black ${themeTextTitle}`}>{inv.invoice_number}</span>
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">Belum Bayar</span>
                                                    </div>
                                                    <p className={`text-[10px] ${themeTextSub}`}>Periode Billing: {inv.billing_period}</p>
                                                    {inv.is_prorated ? (
                                                        <p className="text-[10px] text-amber-500 font-bold">Prorata {inv.days_billed}/30 hari · Subtotal {formatRupiah(inv.amount)}</p>
                                                    ) : null}
                                                    <div className="flex items-center space-x-2 text-[10px] text-zinc-500 mt-1">
                                                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                                                        <span>Jatuh Tempo: <b className="text-rose-500">{formatDate(inv.due_date)}</b></span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:self-center">
                                                    
                                                    {/* Payment Method Selector */}
                                                    <div className="flex flex-col gap-1">
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

                                                    {/* Total and Checkout */}
                                                    <div className="flex flex-col text-right justify-center pr-2">
                                                        <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold leading-none">Total Tagihan</span>
                                                        <span className={`text-sm font-extrabold ${themeTextTitle}`}>{formatRupiah(inv.total_amount)}</span>
                                                    </div>

                                                    <button
                                                        onClick={() => handlePay(inv.id)}
                                                        disabled={isPaying !== null}
                                                        className={`px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-bold shadow-lg hover:shadow-emerald-500/10 cursor-pointer flex items-center justify-center space-x-1.5 transition-all duration-150 ${isPaying ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.01]'}`}
                                                    >
                                                        <span>{isPaying === inv.id ? 'Memproses...' : 'Bayar'}</span>
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </button>
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
                                    <h2 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Riwayat Pembayaran (Lunas)</h2>
                                </div>

                                {paidInvoices.length === 0 ? (
                                    <p className={`text-xs text-center py-4 ${themeTextDesc}`}>Belum ada invoice lunas yang tercatat.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className={`border-b border-zinc-800/30 text-[9px] uppercase tracking-wider ${themeTextDesc}`}>
                                                    <th className="py-2.5 font-bold">No. Invoice</th>
                                                    <th className="py-2.5 font-bold">Periode</th>
                                                    <th className="py-2.5 font-bold">Jumlah</th>
                                                    <th className="py-2.5 font-bold">Tgl Lunas</th>
                                                    <th className="py-2.5 font-bold">Tagihan Selanjutnya</th>
                                                    <th className="py-2.5 font-bold text-right">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/20 text-xs">
                                                {paidInvoices.map((inv) => (
                                                    <tr key={inv.id} className={`${themeTextSub}`}>
                                                        <td className="py-2.5 font-mono font-bold">{inv.invoice_number}</td>
                                                        <td className="py-2.5 font-medium">{inv.billing_period}</td>
                                                        <td className="py-2.5 font-extrabold text-emerald-500">{formatRupiah(inv.total_amount)}</td>
                                                        <td className="py-2.5 font-medium">{formatDate(inv.paid_at)}</td>
                                                        <td className="py-2.5">
                                                            {inv.next_billing ? (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="font-mono font-bold">{inv.next_billing.period}</span>
                                                                    <span className="font-bold text-cyan-500">{formatRupiah(inv.next_billing.total_amount)}</span>
                                                                    <span className={`text-[10px] ${themeTextDesc}`}>
                                                                        Jatuh tempo {inv.next_billing.due_date?.substring?.(0, 10) || '-'}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className={themeTextDesc}>-</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2.5 text-right">
                                                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Lunas</span>
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
                    <footer className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-4 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
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
                    </footer>
                )}
            </PullToRefresh>
        </>
    );
}
