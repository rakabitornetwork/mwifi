import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Activity, CreditCard, RefreshCw, Search } from 'lucide-react';
import AdminLayout from '../../../Layouts/AdminLayout';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';
import { formatRupiah } from '../../../utils/formatRupiah';

function formatTimeAgo(isoString) {
    if (!isoString) return '-';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'baru saja';
    if (mins < 60) return `${mins}m lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    return `${days}h lalu`;
}

function isManualPaidInvoice(inv) {
    if (inv.status !== 'paid' || !Array.isArray(inv.payments)) {
        return false;
    }

    return inv.payments.some((payment) => payment.gateway_name === 'manual');
}

function InvoicesPageContent({ invoices = [], billingActivityLogs = [] }) {
    const theme = useAdminTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [invoicePage, setInvoicePage] = useState(1);
    const invoicePageSize = 10;

    const themeInnerWidget = theme.isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';
    const themeInput = theme.isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700'
        : 'bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300';

    useEffect(() => {
        setInvoicePage(1);
    }, [searchTerm]);

    const handlePayManual = (invoiceId) => {
        if (!confirm("Konfirmasi terima pembayaran tunai secara manual?\n\nPratinjau cetak akan dibuka di tab baru.\nJika salah klik, gunakan tombol \"Batalkan\" pada invoice lunas (khusus bayar manual).")) return;

        const printUrl = `/admin/invoices/${invoiceId}/print?position=top`;
        const printWindow = window.open('about:blank', '_blank');

        router.post('/admin/invoices/pay-manual', { invoice_id: invoiceId }, {
            preserveScroll: true,
            onSuccess: () => {
                if (printWindow && !printWindow.closed) {
                    printWindow.location.href = printUrl;
                    printWindow.focus();
                } else {
                    window.open(printUrl, '_blank', 'noopener,noreferrer');
                }
            },
            onError: () => {
                printWindow?.close();
            },
        });
    };

    const handleVoidPayment = (invoiceId, invoiceNumber) => {
        if (!confirm(`Batalkan pembayaran manual untuk invoice ${invoiceNumber}?\n\nStatus akan kembali \"Belum Bayar\". Jika sudah lewat jatuh tempo, pelanggan dapat di-isolir kembali.`)) return;

        router.post('/admin/invoices/void-payment', { invoice_id: invoiceId }, {
            preserveScroll: true,
        });
    };

    const handleGenerateInvoices = () => {
        if (!confirm("Generate tagihan bulanan otomatis untuk periode bulan ini sekarang?")) return;

        router.post('/admin/invoices/generate');
    };

    const filteredInvoices = invoices.filter((inv) => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) {
            return true;
        }

        const customerName = inv.customer?.name?.toLowerCase() || '';
        const customerUsername = inv.customer?.username?.toLowerCase() || '';
        const statusLabel = inv.status === 'paid' ? 'lunas paid' : 'belum bayar unpaid';
        const amountText = String(inv.total_amount ?? inv.amount ?? '');

        return (
            inv.invoice_number?.toLowerCase().includes(term) ||
            customerName.includes(term) ||
            customerUsername.includes(term) ||
            inv.billing_period?.toLowerCase().includes(term) ||
            inv.due_date?.substring(0, 10).includes(term) ||
            statusLabel.includes(term) ||
            amountText.includes(term)
        );
    });

    const totalInvoicePages = Math.ceil(filteredInvoices.length / invoicePageSize) || 1;
    const paginatedInvoices = filteredInvoices.slice(
        (invoicePage - 1) * invoicePageSize,
        invoicePage * invoicePageSize
    );

    return (
        <div className={`${theme.themeCard} border rounded-2xl p-5 space-y-4`}>
            <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b ${theme.isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3 gap-3`}>
                <div className="flex items-center space-x-2">
                    <CreditCard className="w-5 h-5 text-emerald-500" />
                    <h2 className={`text-sm font-bold ${theme.themeTextTitle}`}>Log Tagihan / Invoice</h2>
                </div>
                <button
                    onClick={handleGenerateInvoices}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Generate Tagihan Bulan Ini</span>
                </button>
            </div>

            <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${theme.themeTextDesc}`} />
                <input
                    type="text"
                    placeholder="Cari invoice / pelanggan..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                />
            </div>

            <div className={`border rounded-xl p-4 space-y-3 ${theme.isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-amber-500" />
                        <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.themeTextTitle}`}>Log Generate Tagihan Otomatis</h3>
                    </div>
                    <span className={`text-[10px] ${theme.themeTextDesc}`}>Scheduler harian H-N jatuh tempo</span>
                </div>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {billingActivityLogs.length === 0 ? (
                        <p className={`text-xs text-center py-6 ${theme.themeTextDesc}`}>Belum ada riwayat generate otomatis.</p>
                    ) : billingActivityLogs.map((log) => (
                        <div key={log.id} className={`p-3 border rounded-xl text-xs ${themeInnerWidget}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <p className={`font-bold ${theme.themeTextTitle}`}>{log.message}</p>
                                    <p className={`text-[10px] ${theme.themeTextDesc}`}>
                                        {log.run_date?.substring?.(0, 10) || '-'}
                                        {log.meta?.invoice_count > 0 ? ` · ${log.meta.invoice_count} invoice` : ''}
                                        {log.meta?.admin_notified ? ' · WA admin terkirim' : (log.meta?.invoice_count > 0 ? ' · WA admin belum terkirim' : '')}
                                    </p>
                                    {Array.isArray(log.meta?.invoices) && log.meta.invoices.length > 0 && (
                                        <ul className={`text-[10px] ${theme.themeTextSub} space-y-0.5 pt-1`}>
                                            {log.meta.invoices.slice(0, 5).map((item, idx) => (
                                                <li key={idx}>
                                                    {item.invoice_number} — {item.customer_name} · {formatRupiah(item.total_amount || 0)}
                                                </li>
                                            ))}
                                            {log.meta.invoices.length > 5 && (
                                                <li className={theme.themeTextDesc}>+ {log.meta.invoices.length - 5} invoice lainnya</li>
                                            )}
                                        </ul>
                                    )}
                                </div>
                                <span className={`text-[10px] ${theme.themeTextSub} font-mono whitespace-nowrap`}>{formatTimeAgo(log.created_at)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${theme.themeTextSub}`}>
                            <th className="py-3 px-2">No. Invoice</th>
                            <th className="py-3 px-2">Pelanggan</th>
                            <th className="py-3 px-2">Periode</th>
                            <th className="py-3 px-2">Nominal</th>
                            <th className="py-3 px-2">Total Amount</th>
                            <th className="py-3 px-2">Jatuh Tempo</th>
                            <th className="py-3 px-2">Status</th>
                            <th className="py-3 px-2">Tagihan Selanjutnya</th>
                            <th className="py-3 px-2 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/20 text-xs">
                        {paginatedInvoices.length === 0 ? (
                            <tr>
                                <td colSpan={9} className={`py-8 text-center text-xs ${theme.themeTextDesc}`}>
                                    {searchTerm.trim()
                                        ? 'Tidak ada invoice yang cocok dengan pencarian.'
                                        : 'Belum ada data tagihan.'}
                                </td>
                            </tr>
                        ) : paginatedInvoices.map((inv) => (
                            <tr key={inv.id} className={`${theme.themeTextSub} hover:bg-zinc-900/10`}>
                                <td className={`py-3 px-2 font-mono font-bold ${theme.themeTextTitle}`}>{inv.invoice_number}</td>
                                <td className="py-3 px-2">{inv.customer ? inv.customer.name : 'Unknown'}</td>
                                <td className="py-3 px-2 font-mono">{inv.billing_period}</td>
                                <td className="py-3 px-2">
                                    <div className="flex flex-col gap-0.5">
                                        <span className={`font-bold ${theme.themeTextTitle}`}>{formatRupiah(inv.amount)}</span>
                                        {inv.is_prorated ? (
                                            <span className="text-[10px] text-amber-500 font-bold">Prorata {inv.days_billed}/30 hari</span>
                                        ) : (
                                            <span className={`text-[10px] ${theme.themeTextDesc}`}>Penuh 30 hari</span>
                                        )}
                                    </div>
                                </td>
                                <td className="py-3 px-2 font-bold text-emerald-500">{formatRupiah(inv.total_amount)}</td>
                                <td className="py-3 px-2 font-mono">{inv.due_date ? inv.due_date.substring(0, 10) : '-'}</td>
                                <td className="py-3 px-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                        {inv.status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                                    </span>
                                </td>
                                <td className="py-3 px-2">
                                    {inv.status === 'paid' && inv.next_billing ? (
                                        <div className="flex flex-col gap-0.5 max-w-[150px]">
                                            <span className={`font-mono font-bold ${theme.themeTextTitle}`}>{inv.next_billing.period}</span>
                                            <span className="font-bold text-cyan-500">{formatRupiah(inv.next_billing.total_amount)}</span>
                                            <span className={`text-[10px] ${theme.themeTextDesc}`}>
                                                Jatuh tempo {inv.next_billing.due_date?.substring?.(0, 10) || '-'}
                                            </span>
                                            {inv.next_billing.is_prorated && (
                                                <span className="text-[10px] text-amber-500 font-bold">Prorata {inv.next_billing.days_billed}/30</span>
                                            )}
                                            {inv.next_billing.already_generated ? (
                                                <span className="text-[10px] text-emerald-500 font-bold">Sudah: {inv.next_billing.invoice_number}</span>
                                            ) : (
                                                <span className={`text-[10px] ${theme.themeTextDesc}`}>Estimasi (belum terbit)</span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className={theme.themeTextDesc}>-</span>
                                    )}
                                </td>
                                <td className="py-3 px-2 text-right">
                                    {inv.status === 'unpaid' ? (
                                        <button
                                            onClick={() => handlePayManual(inv.id)}
                                            className="px-2 py-0.5 border border-emerald-500/30 text-[10px] text-emerald-500 hover:bg-emerald-500/10 rounded cursor-pointer font-bold"
                                        >
                                            Bayar Manual
                                        </button>
                                    ) : isManualPaidInvoice(inv) ? (
                                        <button
                                            onClick={() => handleVoidPayment(inv.id, inv.invoice_number)}
                                            className="px-2 py-0.5 border border-rose-500/30 text-[10px] text-rose-500 hover:bg-rose-500/10 rounded cursor-pointer font-bold"
                                        >
                                            Batalkan
                                        </button>
                                    ) : (
                                        <span className={`text-[10px] ${theme.themeTextDesc}`}>—</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredInvoices.length > invoicePageSize && (
                <div className={`flex flex-col sm:flex-row items-center justify-between pt-4 border-t ${theme.isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200'} gap-3 text-xs`}>
                    <span className={theme.themeTextSub}>
                        Menampilkan <span className={`font-bold ${theme.themeTextTitle}`}>{Math.min((invoicePage - 1) * invoicePageSize + 1, filteredInvoices.length)}</span> hingga <span className={`font-bold ${theme.themeTextTitle}`}>{Math.min(invoicePage * invoicePageSize, filteredInvoices.length)}</span> dari <span className={`font-bold ${theme.themeTextTitle}`}>{filteredInvoices.length}</span> tagihan
                    </span>
                    <div className="flex items-center space-x-1">
                        <button
                            disabled={invoicePage === 1}
                            onClick={() => setInvoicePage((p) => Math.max(p - 1, 1))}
                            className={`px-3 py-1.5 border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${theme.isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
                        >
                            Sebelumnya
                        </button>
                        {Array.from({ length: totalInvoicePages }, (_, idx) => idx + 1).map((page) => {
                            const isCurrent = page === invoicePage;
                            return (
                                <button
                                    key={page}
                                    onClick={() => setInvoicePage(page)}
                                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all duration-150 cursor-pointer ${isCurrent
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : (theme.isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-950')
                                    }`}
                                >
                                    {page}
                                </button>
                            );
                        })}
                        <button
                            disabled={invoicePage === totalInvoicePages}
                            onClick={() => setInvoicePage((p) => Math.min(p + 1, totalInvoicePages))}
                            className={`px-3 py-1.5 border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${theme.isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
                        >
                            Berikutnya
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function InvoicesIndex({ invoices, billingActivityLogs }) {
    return (
        <AdminLayout title="Tagihan / Billing">
            <InvoicesPageContent invoices={invoices} billingActivityLogs={billingActivityLogs} />
        </AdminLayout>
    );
}
