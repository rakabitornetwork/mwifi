import { useEffect, useMemo, useState } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Activity, CalendarClock, CreditCard, FileText, MessageSquare, PauseCircle, Printer, RefreshCw, RotateCcw, Search, ShieldOff, Trash2, Undo2, Wallet, X, XCircle } from 'lucide-react';
import AdminLayout from '../../../Layouts/AdminLayout';
import AdminPageCard from '../../../Components/Admin/AdminPageCard';
import TransitionModal from '../../../Components/Admin/TransitionModal';
import MonthlyRevenuePanel from '../../../Components/Admin/MonthlyRevenuePanel';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';
import { useStaffPermissions } from '../../../hooks/useStaffPermissions';
import { useAssignedRouter, resolveDefaultRouterId } from '../../../hooks/useAssignedRouter';
import AssignedRouterFilter from '../../../Components/Admin/AssignedRouterFilter';
import { ReadOnlyTableActionsPlaceholder } from '../../../Components/Admin/ReadOnlyStaffBanner';
import { formatRupiah } from '../../../utils/formatRupiah';
import getVisiblePages from '../../../utils/getVisiblePages';

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

function isGatewayPaidInvoice(inv) {
    if (inv.status !== 'paid' || !Array.isArray(inv.payments)) {
        return false;
    }

    return inv.payments.some((payment) => payment.gateway_name && payment.gateway_name !== 'manual');
}

function invoiceStatusMeta(status) {
    switch (status) {
        case 'paid':
            return {
                label: 'Lunas',
                className: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
            };
        case 'unpaid':
            return {
                label: 'Belum Bayar',
                className: 'bg-rose-500/10 text-rose-500 border border-rose-500/20',
            };
        case 'canceled':
            return {
                label: 'Dibatalkan',
                className: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20',
            };
        case 'deferred':
            return {
                label: 'Ditunda',
                className: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
            };
        case 'expired':
            return {
                label: 'Kedaluwarsa',
                className: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
            };
        default:
            return {
                label: String(status || '—'),
                className: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20',
            };
    }
}

function getInvoiceRouterId(invoice) {
    return invoice?.customer?.router_id ?? invoice?.customer?.router?.id ?? null;
}

const INVOICE_STATUS_FILTERS = new Set(['all', 'unpaid', 'paid', 'canceled', 'expired', 'isolated']);

function parseInvoicesPageQuery(url = '') {
    try {
        const { searchParams } = new URL(url, window.location.origin);
        const status = searchParams.get('status');
        const routerParam = searchParams.get('router');

        return {
            status: INVOICE_STATUS_FILTERS.has(status) ? status : 'all',
            router: routerParam === 'all' ? '' : (routerParam || null),
        };
    } catch {
        return { status: 'all', router: null };
    }
}

function InvoicesPageContent({
    invoices = [],
    routers = [],
    customers = [],
    billingActivityLogs = [],
    isolationActivityLogs = [],
    billingDeferrals = [],
    monthlyRevenue = {},
}) {
    const theme = useAdminTheme();
    const { canWrite, canPayManual } = useStaffPermissions();
    const { isRouterScoped, lockedRouterId } = useAssignedRouter(routers);
    const pageUrl = usePage().url;
    const initialQuery = useMemo(() => parseInvoicesPageQuery(pageUrl), [pageUrl]);

    const [searchTerm, setSearchTerm] = useState('');
    const [routerFilter, setRouterFilter] = useState(() => {
        if (lockedRouterId) {
            return lockedRouterId;
        }

        if (initialQuery.router !== null) {
            return initialQuery.router;
        }

        return resolveDefaultRouterId(routers);
    });
    const [statusFilter, setStatusFilter] = useState(initialQuery.status);
    const [invoicePage, setInvoicePage] = useState(1);
    const invoicePageSize = 10;
    const [showDeferModal, setShowDeferModal] = useState(false);
    const [deferCustomerId, setDeferCustomerId] = useState('');
    const [deferCustomerLabel, setDeferCustomerLabel] = useState('');
    const [deferMonthsCount, setDeferMonthsCount] = useState('2');
    const [deferDueDate, setDeferDueDate] = useState('');
    const [deferNotes, setDeferNotes] = useState('');
    const [deferPreview, setDeferPreview] = useState(null);
    const [deferPreviewLoading, setDeferPreviewLoading] = useState(false);
    const [deferPreviewError, setDeferPreviewError] = useState('');
    const [isSubmittingDefer, setIsSubmittingDefer] = useState(false);
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
    const [isSubmittingBulkPay, setIsSubmittingBulkPay] = useState(false);
    const [sendingWaInvoiceId, setSendingWaInvoiceId] = useState(null);

    const themeInnerWidget = theme.isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';
    const themeInput = theme.isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700'
        : 'bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300';
    const themeLabel = theme.isDarkMode ? 'text-zinc-400' : 'text-zinc-650';

    const pendingDeferrals = billingDeferrals.filter((item) => item.status === 'pending');

    const selectedRouter = routers.find((item) => String(item.id) === String(routerFilter));

    const routerInvoiceCounts = useMemo(() => (
        invoices.reduce((counts, inv) => {
            const routerId = getInvoiceRouterId(inv) ?? 'none';
            counts[routerId] = (counts[routerId] || 0) + 1;
            return counts;
        }, {})
    ), [invoices]);

    const matchesRouterFilter = (routerId) => (
        !routerFilter || String(routerId ?? '') === String(routerFilter)
    );

    const visiblePendingDeferrals = pendingDeferrals.filter((deferral) => (
        matchesRouterFilter(deferral.customer_router_id)
    ));

    const customerHasPendingDeferral = (customerId) => pendingDeferrals.some(
        (deferral) => String(deferral.customer_id) === String(customerId)
    );

    const canDeferInvoice = (inv) => (
        inv.status === 'unpaid'
        && inv.customer?.id
        && inv.customer?.service_type === 'pppoe'
        && !customerHasPendingDeferral(inv.customer.id)
    );

    useEffect(() => {
        if (lockedRouterId) {
            setRouterFilter(lockedRouterId);
            return;
        }

        const query = parseInvoicesPageQuery(pageUrl);
        if (query.router !== null) {
            setRouterFilter(query.router);
        }
        if (query.status !== 'all') {
            setStatusFilter(query.status);
        }
    }, [pageUrl, lockedRouterId]);

    useEffect(() => {
        setInvoicePage(1);
        setSelectedInvoiceIds([]);
    }, [searchTerm, statusFilter, routerFilter]);

    useEffect(() => {
        if (!showDeferModal || !deferCustomerId) {
            setDeferPreview(null);
            setDeferPreviewError('');
            return;
        }

        const controller = new AbortController();
        setDeferPreviewLoading(true);
        setDeferPreviewError('');

        fetch('/admin/billing/defer/preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
            body: JSON.stringify({
                customer_id: Number(deferCustomerId),
                months_count: Number(deferMonthsCount),
            }),
            signal: controller.signal,
        })
            .then(async (response) => {
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.message || 'Gagal memuat preview penundaan.');
                }
                setDeferPreview(data);
            })
            .catch((error) => {
                if (error.name === 'AbortError') return;
                setDeferPreview(null);
                setDeferPreviewError(error.message || 'Gagal memuat preview penundaan.');
            })
            .finally(() => setDeferPreviewLoading(false));

        return () => controller.abort();
    }, [showDeferModal, deferCustomerId, deferMonthsCount]);

    const resetDeferModal = () => {
        setShowDeferModal(false);
        setDeferCustomerId('');
        setDeferCustomerLabel('');
        setDeferMonthsCount('2');
        setDeferDueDate('');
        setDeferNotes('');
        setDeferPreview(null);
        setDeferPreviewError('');
    };

    const openDeferModalForInvoice = (inv) => {
        const customer = inv.customer;
        if (!customer?.id) {
            return;
        }

        setDeferCustomerId(String(customer.id));
        setDeferCustomerLabel(
            `${customer.name} (${customer.username}) · Tgl ${customer.billing_date ?? '-'}`
        );
        setDeferMonthsCount('2');
        setDeferDueDate('');
        setDeferNotes('');
        setDeferPreview(null);
        setDeferPreviewError('');
        setShowDeferModal(true);
    };

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

    const handleVoidPayment = (invoiceId, invoiceNumber, isGatewaySandbox = false) => {
        const gatewayNote = isGatewaySandbox
            ? '\n\nIni pembayaran gateway mode sandbox. Status di aplikasi saja yang dibatalkan — tidak memanggil refund ke provider.'
            : '';

        if (!confirm(`Batalkan pembayaran untuk invoice ${invoiceNumber}?${gatewayNote}\n\nStatus akan kembali "Belum Bayar". Jika sudah lewat jatuh tempo pada pelanggan PPPoE biasa, pelanggan dapat di-isolir kembali.`)) return;

        router.post('/admin/invoices/void-payment', { invoice_id: invoiceId }, {
            preserveScroll: true,
        });
    };

    const handleRestoreCanceled = (invoiceId, invoiceNumber) => {
        if (!confirm(`Pulihkan invoice ${invoiceNumber}?\n\nStatus akan kembali "Belum Bayar" dan tombol Bayar Manual akan tersedia.`)) return;

        router.post('/admin/invoices/restore-canceled', { invoice_id: invoiceId }, {
            preserveScroll: true,
        });
    };

    const handleDeleteInvoice = (invoiceId, invoiceNumber, status, isPaidCleanup = false) => {
        const paidCleanupNote = isPaidCleanup
            ? '\n\nPembayaran pada invoice ini akan dibatalkan otomatis sebelum dihapus (hanya untuk manual atau gateway sandbox).'
            : '';

        if (!confirm(
            `Hapus invoice ${invoiceNumber}?${paidCleanupNote}\n\n` +
            `Status: ${status}\n` +
            'Tindakan ini permanen dan tidak dapat dibatalkan.'
        )) return;

        router.post('/admin/invoices/delete', { invoice_id: invoiceId }, {
            preserveScroll: true,
        });
    };

    const canDeleteInvoice = (inv) => inv.can_delete_invoice === true;

    const canSendInvoiceWhatsApp = (inv) => inv.status === 'unpaid' || inv.status === 'paid';

    const canPrintInvoice = (inv) => inv.status === 'unpaid' || inv.status === 'paid';

    const handlePrintInvoice = (invoiceId, format) => {
        window.open(`/admin/invoices/${invoiceId}/print?format=${format}`, '_blank', 'noopener,noreferrer');
    };

    const handleSendInvoiceWhatsApp = (inv) => {
        const label = inv.status === 'paid' ? 'konfirmasi pembayaran' : 'tagihan';
        const customerName = inv.customer?.name || 'pelanggan';

        if (!confirm(`Kirim notifikasi ${label} ${inv.invoice_number} ke ${customerName} via WhatsApp?`)) {
            return;
        }

        setSendingWaInvoiceId(inv.id);
        router.post('/admin/invoices/send-whatsapp', { invoice_id: inv.id }, {
            preserveScroll: true,
            onFinish: () => setSendingWaInvoiceId(null),
        });
    };

    const handleGenerateInvoices = () => {
        if (!confirm('Generate tagihan bulanan otomatis untuk periode bulan ini sekarang?')) return;

        router.post('/admin/invoices/generate');
    };

    const handleCancelDeferral = (deferral) => {
        if (!confirm(
            `Batalkan penundaan tagihan untuk ${deferral.customer_name}?\n\n` +
            `Periode: ${(deferral.periods || []).join(' + ')}\n\n` +
            'Penundaan akan dihentikan tanpa membuat invoice baru.'
        )) return;

        router.post('/admin/billing/defer/cancel', { deferral_id: deferral.id }, {
            preserveScroll: true,
        });
    };

    const handleSubmitDeferral = (e) => {
        e.preventDefault();

        if (!deferCustomerId || !deferDueDate) {
            return;
        }

        if (!confirm(
            'Aktifkan penundaan tagihan?\n\n' +
            'Tagihan periode terpilih akan digabung menjadi satu invoice pada tanggal jatuh tempo yang Anda tentukan.\n' +
            'Pelanggan tidak di-isolir selama penundaan aktif.'
        )) {
            return;
        }

        setIsSubmittingDefer(true);
        router.post('/admin/billing/defer', {
            customer_id: deferCustomerId,
            months_count: deferMonthsCount,
            combined_due_date: deferDueDate,
            notes: deferNotes,
        }, {
            preserveScroll: true,
            onFinish: () => setIsSubmittingDefer(false),
            onSuccess: () => resetDeferModal(),
        });
    };

    const isolatedCustomers = useMemo(() => {
        const today = new Date().toISOString().slice(0, 10);

        return customers
            .filter((customer) => customer.status === 'isolated' && matchesRouterFilter(customer.router_id))
            .map((customer) => {
                const customerInvoices = invoices.filter(
                    (inv) => String(inv.customer_id ?? inv.customer?.id) === String(customer.id)
                );
                const unpaidInvoices = customerInvoices
                    .filter((inv) => inv.status === 'unpaid')
                    .sort((a, b) => String(a.due_date || '').localeCompare(String(b.due_date || '')));
                const overdueInvoice = unpaidInvoices.find(
                    (inv) => inv.due_date && inv.due_date.substring(0, 10) < today
                );

                return {
                    ...customer,
                    unpaidInvoice: overdueInvoice || unpaidInvoices[0] || null,
                    invoiceCount: customerInvoices.length,
                };
            })
            .sort((a, b) => {
                if (a.unpaidInvoice && !b.unpaidInvoice) return -1;
                if (!a.unpaidInvoice && b.unpaidInvoice) return 1;

                return (a.name || '').localeCompare(b.name || '');
            });
    }, [customers, invoices, routerFilter]);

    const filteredInvoices = invoices.filter((inv) => {
        if (!matchesRouterFilter(getInvoiceRouterId(inv))) {
            return false;
        }

        if (statusFilter === 'isolated') {
            if (inv.customer?.status !== 'isolated') {
                return false;
            }
        } else if (statusFilter !== 'all' && inv.status !== statusFilter) {
            return false;
        }

        const term = searchTerm.trim().toLowerCase();
        if (!term) {
            return true;
        }

        const customerName = inv.customer?.name?.toLowerCase() || '';
        const customerUsername = inv.customer?.username?.toLowerCase() || '';
        const statusLabel = {
            paid: 'lunas paid',
            unpaid: 'belum bayar unpaid',
            canceled: 'dibatalkan canceled',
            expired: 'kedaluwarsa expired',
        }[inv.status] || inv.status || '';
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

    const displayInvoices = useMemo(() => {
        if (statusFilter !== 'isolated') {
            return filteredInvoices;
        }

        const statusRank = (inv) => {
            if (inv.status === 'unpaid') return 0;
            if (inv.status === 'paid') return 1;

            return 2;
        };

        return [...filteredInvoices].sort((a, b) => {
            const rankDiff = statusRank(a) - statusRank(b);
            if (rankDiff !== 0) return rankDiff;

            return String(b.created_at || '').localeCompare(String(a.created_at || ''));
        });
    }, [filteredInvoices, statusFilter]);

    const unpaidInvoicesCount = useMemo(
        () => invoices.filter(
            (inv) => inv.status === 'unpaid' && matchesRouterFilter(getInvoiceRouterId(inv))
        ).length,
        [invoices, routerFilter]
    );

    const isolatedInvoicesCount = useMemo(
        () => isolatedCustomers.length,
        [isolatedCustomers]
    );

    const unpaidSummary = useMemo(() => {
        const unpaid = invoices.filter((inv) => inv.status === 'unpaid');

        return {
            count: unpaid.length,
            total: unpaid.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
        };
    }, [invoices]);

    const totalInvoicePages = Math.ceil(displayInvoices.length / invoicePageSize) || 1;
    const visibleInvoicePages = getVisiblePages(invoicePage, totalInvoicePages);
    const paginatedInvoices = displayInvoices.slice(
        (invoicePage - 1) * invoicePageSize,
        invoicePage * invoicePageSize
    );

    const unpaidOnPage = paginatedInvoices.filter((inv) => inv.status === 'unpaid');
    const selectedUnpaidInvoices = invoices.filter(
        (inv) => selectedInvoiceIds.includes(inv.id) && inv.status === 'unpaid'
    );
    const selectedUnpaidCount = selectedUnpaidInvoices.length;
    const bulkPayTotalAmount = selectedUnpaidInvoices.reduce(
        (sum, inv) => sum + Number(inv.total_amount || 0),
        0
    );

    const toggleSelectInvoice = (invoiceId) => {
        setSelectedInvoiceIds((prev) => (
            prev.includes(invoiceId)
                ? prev.filter((id) => id !== invoiceId)
                : [...prev, invoiceId]
        ));
    };

    const toggleSelectAllUnpaidOnPage = () => {
        const pageIds = unpaidOnPage.map((inv) => inv.id);
        const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedInvoiceIds.includes(id));

        if (allSelected) {
            setSelectedInvoiceIds((prev) => prev.filter((id) => !pageIds.includes(id)));
            return;
        }

        setSelectedInvoiceIds((prev) => [...new Set([...prev, ...pageIds])]);
    };

    const handleBulkPayManual = () => {
        if (selectedUnpaidCount === 0) {
            return;
        }

        const idsToPay = selectedUnpaidInvoices.map((inv) => inv.id);

        if (!confirm(
            `Konfirmasi pembayaran manual massal untuk ${selectedUnpaidCount} invoice?\n\n` +
            `Total: ${formatRupiah(bulkPayTotalAmount)}\n\n` +
            'Invoice tidak akan dicetak otomatis. Gunakan tombol Bayar Manual per baris jika perlu cetak.'
        )) {
            return;
        }

        setIsSubmittingBulkPay(true);
        router.post('/admin/invoices/pay-manual-bulk', { invoice_ids: idsToPay }, {
            preserveScroll: true,
            onSuccess: () => setSelectedInvoiceIds([]),
            onFinish: () => setIsSubmittingBulkPay(false),
        });
    };

    return (
        <>
            <div className="space-y-4">
                <MonthlyRevenuePanel
                    monthlyRevenue={monthlyRevenue}
                    unpaidTotal={unpaidSummary.total}
                    unpaidCount={unpaidSummary.count}
                    isDarkMode={theme.isDarkMode}
                    themeCard={theme.themeCard}
                    themeTextTitle={theme.themeTextTitle}
                    themeTextSub={theme.themeTextSub}
                    themeTextDesc={theme.themeTextDesc}
                />

            <AdminPageCard
                icon={CreditCard}
                accent="amber"
                title="Log Tagihan / Invoice"
                description={selectedRouter ? `Router: ${selectedRouter.name} · ${routerInvoiceCounts[selectedRouter.id] || 0} invoice` : undefined}
                themeCard={theme.themeCard}
                isDarkMode={theme.isDarkMode}
                themeTextTitle={theme.themeTextTitle}
                themeTextDesc={theme.themeTextDesc}
                actions={(canPayManual || canWrite) ? (
                    <>
                        {canPayManual && (
                        <button
                            type="button"
                            onClick={handleBulkPayManual}
                            disabled={selectedUnpaidCount === 0 || isSubmittingBulkPay}
                            title={
                                isSubmittingBulkPay
                                    ? 'Memproses pembayaran...'
                                    : selectedUnpaidCount > 0
                                    ? `Bayar Manual Massal (${selectedUnpaidCount})`
                                    : 'Bayar Manual Massal'
                            }
                            className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed text-white rounded-xl cursor-pointer inline-flex items-center justify-center"
                        >
                            <Wallet className={`w-4 h-4 ${isSubmittingBulkPay ? 'animate-pulse' : ''}`} />
                        </button>
                        )}
                        {canWrite && (
                        <button
                            type="button"
                            onClick={handleGenerateInvoices}
                            title="Generate Tagihan Bulan Ini"
                            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        )}
                    </>
                ) : null}
            >
                <div className="flex flex-col lg:flex-row gap-2">
                    <AssignedRouterFilter
                        routers={routers}
                        value={routerFilter}
                        onChange={(e) => setRouterFilter(e.target.value)}
                        className={`lg:w-56 shrink-0 px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                        showAllOption={!isRouterScoped}
                        renderOption={(routerItem) => `${routerItem.name} (${routerInvoiceCounts[routerItem.id] || 0})`}
                    />
                    <div className="relative flex-1">
                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${theme.themeTextDesc}`} />
                        <input
                            type="text"
                            placeholder="Cari invoice / pelanggan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-9 pr-3 py-2 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={`sm:w-48 shrink-0 px-3 py-2 border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${themeInput}`}
                    >
                        <option value="all">Semua status</option>
                        <option value="unpaid">Belum Bayar ({unpaidInvoicesCount})</option>
                        <option value="isolated">Isolir ({isolatedInvoicesCount})</option>
                        <option value="paid">Lunas</option>
                        <option value="canceled">Dibatalkan</option>
                        <option value="expired">Kedaluwarsa</option>
                    </select>
                </div>
                {statusFilter === 'unpaid' && (
                    <p className={`text-[10px] ${theme.themeTextSub}`}>
                        Menampilkan <span className="font-bold text-rose-500">{displayInvoices.length}</span> invoice belum bayar
                        {selectedRouter ? ` di ${selectedRouter.name}` : ''}
                        {searchTerm.trim() ? ' yang cocok dengan pencarian' : ''}.
                    </p>
                )}
                {statusFilter === 'isolated' && (
                    <p className={`text-[10px] ${theme.themeTextSub}`}>
                        Menampilkan <span className="font-bold text-amber-500">{displayInvoices.length}</span> invoice dari{' '}
                        <span className="font-bold text-amber-500">{isolatedCustomers.length}</span> pelanggan terisolir
                        {routerFilter ? (selectedRouter ? ` di ${selectedRouter.name}` : '') : ' di semua router'}
                        {searchTerm.trim() ? ' yang cocok dengan pencarian' : ''}.
                    </p>
                )}

                {statusFilter === 'isolated' && isolatedCustomers.length > 0 && (
                    <div className={`border rounded-xl p-4 space-y-3 ${theme.isDarkMode ? 'border-amber-500/25 bg-amber-950/20' : 'border-amber-200 bg-amber-50/70'}`}>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                                <ShieldOff className="w-4 h-4 text-amber-500" />
                                <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.themeTextTitle}`}>Pelanggan Terisolir</h3>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.isDarkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-100 text-amber-800'}`}>
                                {isolatedCustomers.length} pelanggan
                            </span>
                        </div>
                        <div className="space-y-2">
                            {isolatedCustomers.map((customer) => (
                                <div key={customer.id} className={`p-3 border rounded-xl text-xs ${themeInnerWidget}`}>
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                        <div className="space-y-1 min-w-0">
                                            <p className={`font-bold ${theme.themeTextTitle}`}>
                                                {customer.name}{' '}
                                                <span className="font-mono text-[10px] opacity-70">({customer.username})</span>
                                            </p>
                                            <p className={theme.themeTextSub}>
                                                {customer.router?.name || '—'}
                                                {customer.package?.name ? ` · ${customer.package.name}` : ''}
                                            </p>
                                            {customer.unpaidInvoice ? (
                                                <p className={theme.themeTextDesc}>
                                                    Tagihan tertunggak:{' '}
                                                    <span className="font-mono font-bold">{customer.unpaidInvoice.invoice_number}</span>
                                                    {' · '}{formatRupiah(customer.unpaidInvoice.total_amount || 0)}
                                                    {' · '}jatuh tempo {customer.unpaidInvoice.due_date?.substring?.(0, 10) || '—'}
                                                </p>
                                            ) : (
                                                <p className="text-[10px] text-amber-500 font-bold">
                                                    {customer.invoiceCount > 0
                                                        ? 'Tidak ada tagihan belum bayar — periksa riwayat invoice lunas di bawah.'
                                                        : 'Belum ada invoice — generate tagihan dari menu Pelanggan.'}
                                                </p>
                                            )}
                                        </div>
                                        <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                            Isolir
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {statusFilter === 'isolated' && isolatedCustomers.length === 0 && (
                    <div className={`rounded-xl border px-3 py-2.5 text-[10px] ${theme.isDarkMode ? 'border-amber-500/25 bg-amber-500/5 text-amber-200' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                        Tidak ada pelanggan terisolir{routerFilter && selectedRouter ? ` di ${selectedRouter.name}` : ''}.
                        {routerFilter && !isRouterScoped && ' Coba pilih "Semua Router" pada filter.'}
                    </div>
                )}

                {visiblePendingDeferrals.length > 0 && (
                    <div className={`border rounded-xl p-4 space-y-3 ${theme.isDarkMode ? 'border-indigo-500/20 bg-indigo-950/20' : 'border-indigo-200 bg-indigo-50/70'}`}>
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                                <CalendarClock className="w-4 h-4 text-indigo-500" />
                                <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.themeTextTitle}`}>Penundaan Tagihan Aktif</h3>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${theme.isDarkMode ? 'bg-indigo-500/15 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>
                                {visiblePendingDeferrals.length} pelanggan
                            </span>
                        </div>
                        <div className="space-y-2">
                            {visiblePendingDeferrals.map((deferral) => (
                                <div key={deferral.id} className={`p-3 border rounded-xl text-xs ${themeInnerWidget}`}>
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <p className={`font-bold ${theme.themeTextTitle}`}>
                                                {deferral.customer_name} <span className="font-mono text-[10px] opacity-70">({deferral.customer_username})</span>
                                            </p>
                                            <p className={theme.themeTextSub}>
                                                Akumulasi {(deferral.periods || []).join(' + ')} · {deferral.months_count} bulan
                                            </p>
                                            <p className={theme.themeTextDesc}>
                                                Jatuh tempo gabungan: <span className="font-mono font-bold">{deferral.combined_due_date}</span>
                                                {' · '}Estimasi {formatRupiah(deferral.estimated_total_amount || 0)}
                                            </p>
                                            {deferral.status === 'pending' && deferral.accumulated_generate_on && (
                                                <p className={`text-[10px] ${theme.themeTextDesc}`}>
                                                    Invoice akumulasi terbit otomatis pada{' '}
                                                    <span className="font-mono font-bold">{deferral.accumulated_generate_on}</span>.
                                                </p>
                                            )}
                                            {deferral.notes && (
                                                <p className={`text-[10px] ${theme.themeTextDesc}`}>Catatan: {deferral.notes}</p>
                                            )}
                                        </div>
                                        {canWrite && (
                                        <button
                                            type="button"
                                            onClick={() => handleCancelDeferral(deferral)}
                                            title="Batalkan Penundaan"
                                            className="shrink-0 inline-block p-1 text-rose-500 hover:text-rose-400 cursor-pointer transition-colors"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="admin-table-scroll">
                    <table>
                        <thead>
                            <tr className={`border-b border-zinc-800/30 text-[10px] uppercase font-bold tracking-wider ${theme.themeTextSub}`}>
                                {canPayManual && (
                                <th className="py-3 px-2 w-8">
                                    <input
                                        type="checkbox"
                                        checked={unpaidOnPage.length > 0 && unpaidOnPage.every((inv) => selectedInvoiceIds.includes(inv.id))}
                                        disabled={unpaidOnPage.length === 0}
                                        onChange={toggleSelectAllUnpaidOnPage}
                                        className={`rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer disabled:opacity-40 ${theme.isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                                        title="Pilih semua belum bayar di halaman ini"
                                    />
                                </th>
                                )}
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
                                    <td colSpan={canPayManual ? 10 : 9} className={`py-8 text-center text-xs ${theme.themeTextDesc}`}>
                                        {!routerFilter
                                            ? 'Pilih router Mikrotik terlebih dahulu.'
                                            : searchTerm.trim()
                                                ? `Tidak ada invoice di ${selectedRouter?.name || 'router ini'} yang cocok dengan pencarian.`
                                                : `Belum ada data tagihan di ${selectedRouter?.name || 'router ini'}.`}
                                    </td>
                                </tr>
                            ) : paginatedInvoices.map((inv) => (
                                <tr key={inv.id} className={`${theme.themeTextSub} hover:bg-zinc-900/10 ${selectedInvoiceIds.includes(inv.id) ? 'bg-emerald-500/5' : ''}`}>
                                    {canPayManual && (
                                    <td className="py-3 px-2 w-8">
                                        {inv.status === 'unpaid' ? (
                                            <input
                                                type="checkbox"
                                                checked={selectedInvoiceIds.includes(inv.id)}
                                                onChange={() => toggleSelectInvoice(inv.id)}
                                                className={`rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer ${theme.isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                                            />
                                        ) : null}
                                    </td>
                                    )}
                                    <td className={`py-3 px-2 font-mono font-bold ${theme.themeTextTitle}`}>{inv.invoice_number}</td>
                                    <td className="py-3 px-2">{inv.customer ? inv.customer.name : 'Unknown'}</td>
                                    <td className="py-3 px-2 font-mono">
                                        <div className="flex flex-col gap-0.5">
                                            <span>{inv.billing_period}</span>
                                            {inv.is_accumulated && (
                                                <span className="text-[10px] font-bold text-indigo-500">Akumulasi</span>
                                            )}
                                        </div>
                                    </td>
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
                                        {(() => {
                                            const isDeferredPending = inv.status === 'canceled' && inv.is_deferred_by_pending;
                                            const status = invoiceStatusMeta(isDeferredPending ? 'deferred' : inv.status);
                                            return (
                                                <div className="flex flex-col gap-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit ${status.className}`}>
                                                        {status.label}
                                                    </span>
                                                    {inv.customer?.status === 'isolated' && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold w-fit bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                            Isolir
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        {inv.status === 'canceled' && inv.is_deferred_by_pending && (
                                            <p className={`text-[10px] mt-1 max-w-[160px] ${theme.themeTextDesc}`}>
                                                Termasuk penundaan aktif. Invoice akumulasi terbit otomatis
                                                {inv.deferred_accumulated_generate_on
                                                    ? ` pada ${inv.deferred_accumulated_generate_on}`
                                                    : ''}
                                                , jatuh tempo {inv.deferred_combined_due_date || '-'}.
                                            </p>
                                        )}
                                        {inv.status === 'canceled' && !inv.is_deferred_by_pending && (
                                            <p className={`text-[10px] mt-1 max-w-[140px] ${theme.themeTextDesc}`}>
                                                Dibatalkan saat penundaan. Klik Pulihkan di kolom Aksi.
                                            </p>
                                        )}
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
                                        <div className="admin-table-actions">
                                            {canPrintInvoice(inv) && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePrintInvoice(inv.id, 'thermal')}
                                                        title="Cetak thermal 58mm"
                                                        className="inline-block p-1 text-violet-500 hover:text-violet-400 cursor-pointer transition-colors"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePrintInvoice(inv.id, 'a4')}
                                                        title="Cetak A4"
                                                        className="inline-block p-1 text-zinc-500 hover:text-zinc-400 cursor-pointer transition-colors"
                                                    >
                                                        <FileText className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                            {canWrite && (
                                            <>
                                            {canSendInvoiceWhatsApp(inv) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSendInvoiceWhatsApp(inv)}
                                                    disabled={sendingWaInvoiceId === inv.id}
                                                    title={inv.status === 'paid' ? 'Kirim konfirmasi WA' : 'Kirim tagihan WA'}
                                                    className="inline-block p-1 text-sky-500 hover:text-sky-400 disabled:opacity-40 cursor-pointer transition-colors"
                                                >
                                                    <MessageSquare className={`w-4 h-4 ${sendingWaInvoiceId === inv.id ? 'animate-pulse' : ''}`} />
                                                </button>
                                            )}
                                            {inv.status === 'unpaid' ? (
                                                <>
                                                    {canDeferInvoice(inv) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openDeferModalForInvoice(inv)}
                                                            title="Tunda Tagihan"
                                                            className="inline-block p-1 text-indigo-500 hover:text-indigo-400 cursor-pointer transition-colors"
                                                        >
                                                            <PauseCircle className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>
                                            ) : inv.status === 'canceled' && inv.is_deferred_by_pending ? (
                                                <span className={`text-[10px] ${theme.themeTextDesc}`}>Menunggu akumulasi</span>
                                            ) : inv.status === 'canceled' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRestoreCanceled(inv.id, inv.invoice_number)}
                                                    title="Pulihkan"
                                                    className="inline-block p-1 text-indigo-500 hover:text-indigo-400 cursor-pointer transition-colors"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            ) : inv.can_void_payment ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleVoidPayment(
                                                        inv.id,
                                                        inv.invoice_number,
                                                        isGatewayPaidInvoice(inv) && !isManualPaidInvoice(inv),
                                                    )}
                                                    title={isGatewayPaidInvoice(inv) && !isManualPaidInvoice(inv)
                                                        ? 'Batalkan Pembayaran Gateway Sandbox'
                                                        : 'Batalkan Pembayaran'}
                                                    className="inline-block p-1 text-rose-500 hover:text-rose-400 cursor-pointer transition-colors"
                                                >
                                                    <Undo2 className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <span className={`text-[10px] ${theme.themeTextDesc}`}>—</span>
                                            )}
                                            {canDeleteInvoice(inv) && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteInvoice(
                                                        inv.id,
                                                        inv.invoice_number,
                                                        inv.status === 'canceled' && inv.is_deferred_by_pending
                                                            ? 'Ditunda'
                                                            : invoiceStatusMeta(inv.status).label,
                                                        inv.status === 'paid',
                                                    )}
                                                    title={inv.status === 'paid' ? 'Batalkan & Hapus Invoice' : 'Hapus'}
                                                    className="inline-block p-1 text-rose-500 hover:text-rose-400 cursor-pointer transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            </>
                                            )}
                                            {canPayManual && inv.status === 'unpaid' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handlePayManual(inv.id)}
                                                    title="Bayar Manual"
                                                    className="inline-block p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors"
                                                >
                                                    <Wallet className="w-4 h-4" />
                                                </button>
                                            )}
                                            {!canWrite && !canPayManual && !canPrintInvoice(inv) && (
                                                <ReadOnlyTableActionsPlaceholder />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredInvoices.length > invoicePageSize && (
                    <div className={`flex flex-col gap-3 pt-4 border-t ${theme.isDarkMode ? 'border-zinc-800/60' : 'border-zinc-200'} text-xs`}>
                        <span className={`text-center sm:text-left ${theme.themeTextSub}`}>
                            Menampilkan <span className={`font-bold ${theme.themeTextTitle}`}>{Math.min((invoicePage - 1) * invoicePageSize + 1, filteredInvoices.length)}</span>–<span className={`font-bold ${theme.themeTextTitle}`}>{Math.min(invoicePage * invoicePageSize, filteredInvoices.length)}</span> dari <span className={`font-bold ${theme.themeTextTitle}`}>{filteredInvoices.length}</span> tagihan
                        </span>
                        <nav aria-label="Navigasi halaman tagihan" className="flex flex-wrap items-center justify-center sm:justify-end gap-1">
                            <button
                                type="button"
                                disabled={invoicePage === 1}
                                onClick={() => setInvoicePage((p) => Math.max(p - 1, 1))}
                                title="Halaman sebelumnya"
                                className={`inline-flex items-center justify-center min-w-8 h-8 px-2 border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${theme.isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
                            >
                                ‹
                            </button>
                            {visibleInvoicePages.map((page, index) => (
                                page === 'ellipsis' ? (
                                    <span key={`ellipsis-${index}`} className={`inline-flex items-center justify-center w-8 h-8 text-[11px] select-none ${theme.themeTextDesc}`} aria-hidden="true">…</span>
                                ) : (
                                    <button
                                        key={page}
                                        type="button"
                                        onClick={() => setInvoicePage(page)}
                                        aria-current={page === invoicePage ? 'page' : undefined}
                                        className={`inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg border text-[11px] font-bold tabular-nums transition-all duration-150 cursor-pointer ${page === invoicePage
                                            ? 'bg-emerald-500 border-emerald-500 text-white'
                                            : (theme.isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-950')
                                        }`}
                                    >
                                        {page}
                                    </button>
                                )
                            ))}
                            <button
                                type="button"
                                disabled={invoicePage === totalInvoicePages}
                                onClick={() => setInvoicePage((p) => Math.min(p + 1, totalInvoicePages))}
                                title="Halaman berikutnya"
                                className={`inline-flex items-center justify-center min-w-8 h-8 px-2 border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${theme.isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`}
                            >
                                ›
                            </button>
                        </nav>
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className={`border rounded-xl p-4 space-y-3 ${theme.isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <Activity className="w-4 h-4 text-amber-500 shrink-0" />
                            <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.themeTextTitle}`}>Log Generate Tagihan Otomatis</h3>
                        </div>
                        <span className={`text-[10px] ${theme.themeTextDesc} shrink-0`}>Scheduler harian H-N jatuh tempo</span>
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {billingActivityLogs.length === 0 ? (
                            <p className={`text-xs text-center py-6 ${theme.themeTextDesc}`}>Belum ada riwayat generate otomatis.</p>
                        ) : billingActivityLogs.map((log) => (
                            <div key={log.id} className={`p-3 border rounded-xl text-xs ${themeInnerWidget}`}>
                                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1 min-w-0 flex-1">
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

                <div className={`border rounded-xl p-4 space-y-3 ${theme.isDarkMode ? 'border-amber-500/20 bg-amber-950/10' : 'border-amber-200 bg-amber-50/60'}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <ShieldOff className="w-4 h-4 text-amber-500 shrink-0" />
                            <h3 className={`text-xs font-bold uppercase tracking-wider ${theme.themeTextTitle}`}>Log Isolir Otomatis</h3>
                        </div>
                        <span className={`text-[10px] ${theme.themeTextDesc} shrink-0`}>Scheduler pengecekan jatuh tempo</span>
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {isolationActivityLogs.length === 0 ? (
                            <p className={`text-xs text-center py-6 ${theme.themeTextDesc}`}>Belum ada riwayat isolir otomatis.</p>
                        ) : isolationActivityLogs.map((log) => (
                            <div key={log.id} className={`p-3 border rounded-xl text-xs ${themeInnerWidget}`}>
                                <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1 min-w-0 flex-1">
                                        <p className={`font-bold ${theme.themeTextTitle}`}>{log.message}</p>
                                        <p className={`text-[10px] ${theme.themeTextDesc}`}>
                                            {log.run_date?.substring?.(0, 10) || '-'}
                                            {log.meta?.isolation_count > 0 ? ` · ${log.meta.isolation_count} pelanggan` : ''}
                                        </p>
                                        {Array.isArray(log.meta?.customers) && log.meta.customers.length > 0 && (
                                            <ul className={`text-[10px] ${theme.themeTextSub} space-y-0.5 pt-1`}>
                                                {log.meta.customers.slice(0, 5).map((item, idx) => (
                                                    <li key={idx}>
                                                        {item.invoice_number} — {item.customer_name}
                                                        <span className="font-mono opacity-70"> ({item.customer_username})</span>
                                                        {' · '}{formatRupiah(item.total_amount || 0)}
                                                        {item.wa_notified ? ' · WA terkirim' : ''}
                                                    </li>
                                                ))}
                                                {log.meta.customers.length > 5 && (
                                                    <li className={theme.themeTextDesc}>+ {log.meta.customers.length - 5} pelanggan lainnya</li>
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
                </div>
            </AdminPageCard>
            </div>

            <TransitionModal show={showDeferModal} onClose={resetDeferModal} themeCard={theme.themeCard} maxWidth="lg" className="overflow-y-auto max-h-[90vh]">
                <div className={`flex items-start justify-between gap-3 pb-2 border-b ${theme.isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <div>
                        <h3 className={`text-sm font-bold ${theme.themeTextTitle}`}>Tunda Tagihan Pelanggan</h3>
                        <p className={`text-[10px] mt-0.5 ${theme.themeTextDesc}`}>
                            Gabungkan tagihan 1–2 bulan menjadi satu invoice pada tanggal yang Anda tentukan.
                        </p>
                    </div>
                    <button type="button" onClick={resetDeferModal} className="text-zinc-500 hover:text-white cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmitDeferral} className="space-y-3 text-xs mt-3">
                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Pelanggan PPPoE</label>
                        <p className={`p-2 border rounded-lg ${themeInput}`}>{deferCustomerLabel}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Durasi Penundaan</label>
                            <select
                                value={deferMonthsCount}
                                onChange={(e) => setDeferMonthsCount(e.target.value)}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            >
                                <option value="1">1 bulan</option>
                                <option value="2">2 bulan (bulan ini + bulan berikutnya)</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Jatuh Tempo Gabungan</label>
                            <input
                                required
                                type="date"
                                value={deferDueDate}
                                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                                onChange={(e) => setDeferDueDate(e.target.value)}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Catatan (opsional)</label>
                        <input
                            type="text"
                            value={deferNotes}
                            onChange={(e) => setDeferNotes(e.target.value)}
                            placeholder="Alasan penundaan..."
                            className={`p-2 border rounded-lg ${themeInput}`}
                        />
                    </div>

                    <div className={`rounded-xl border p-3 space-y-2 ${themeInnerWidget}`}>
                        <p className={`font-bold ${theme.themeTextTitle}`}>Preview Akumulasi</p>
                        {deferPreviewLoading && (
                            <p className={theme.themeTextDesc}>Menghitung preview...</p>
                        )}
                        {!deferPreviewLoading && deferPreviewError && (
                            <p className="text-rose-500 font-semibold">{deferPreviewError}</p>
                        )}
                        {!deferPreviewLoading && deferPreview && (
                            <>
                                <p className={theme.themeTextSub}>
                                    Periode: <span className="font-mono font-bold">{(deferPreview.periods || []).join(' + ')}</span>
                                </p>
                                <ul className={`space-y-1 ${theme.themeTextDesc}`}>
                                    {(deferPreview.lines || []).map((line) => (
                                        <li key={line.period}>
                                            {line.period} · {formatRupiah(line.amount)}
                                            {line.is_prorated ? ` (prorata ${line.days_billed}/30)` : ''}
                                        </li>
                                    ))}
                                </ul>
                                <p className={`font-bold text-emerald-500`}>
                                    Total estimasi: {formatRupiah(deferPreview.total_amount || 0)}
                                </p>
                                <p className={`text-[10px] ${theme.themeTextDesc}`}>
                                    Invoice gabungan akan otomatis terbit H-N sebelum tanggal jatuh tempo yang Anda pilih.
                                    Selama penundaan aktif, pelanggan tidak di-isolir otomatis.
                                </p>
                            </>
                        )}
                        {!deferPreviewLoading && !deferPreview && !deferPreviewError && (
                            <p className={theme.themeTextDesc}>Menghitung preview akumulasi tagihan...</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={resetDeferModal}
                            title="Batal"
                            className={`p-2 rounded-lg border cursor-pointer inline-flex items-center justify-center ${theme.isDarkMode ? 'border-zinc-700 text-zinc-300' : 'border-zinc-200 text-zinc-600'}`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmittingDefer || !deferCustomerId || !deferDueDate || !deferPreview || !!deferPreviewError}
                            title={isSubmittingDefer ? 'Menyimpan...' : 'Aktifkan Penundaan'}
                            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white cursor-pointer inline-flex items-center justify-center"
                        >
                            <PauseCircle className={`w-4 h-4 ${isSubmittingDefer ? 'animate-pulse' : ''}`} />
                        </button>
                    </div>
                </form>
            </TransitionModal>
        </>
    );
}

export default function InvoicesIndex({
    invoices,
    routers,
    customers,
    billingActivityLogs,
    isolationActivityLogs,
    billingDeferrals,
    monthlyRevenue,
}) {
    return (
        <AdminLayout title="Tagihan / Billing">
            <InvoicesPageContent
                invoices={invoices}
                routers={routers}
                customers={customers}
                billingActivityLogs={billingActivityLogs}
                isolationActivityLogs={isolationActivityLogs}
                billingDeferrals={billingDeferrals}
                monthlyRevenue={monthlyRevenue}
            />
        </AdminLayout>
    );
}
