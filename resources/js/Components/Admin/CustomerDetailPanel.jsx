import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import { Database, Edit, FileText, RefreshCw } from 'lucide-react';
import { formatRupiah } from '../../utils/formatRupiah';
import { formatBytes, quotaUsagePercent } from '../../utils/formatBytes';

function formatDate(value) {
    if (!value) return '—';
    return String(value).substring(0, 10);
}

function statusMeta(status) {
    switch (status) {
        case 'active':
            return { label: 'Active', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };
        case 'isolated':
            return { label: 'Isolated (Isolir)', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
        case 'inactive':
            return { label: 'Inactive', className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' };
        case 'suspended':
            return { label: 'Suspended', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
        default:
            return { label: String(status || '—'), className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20' };
    }
}

function DetailItem({ label, value, mono = false, themeTextTitle, themeTextSub, className = '' }) {
    return (
        <div className={className}>
            <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>{label}</p>
            <p className={`text-xs mt-0.5 break-words ${mono ? 'font-mono' : ''} ${themeTextTitle}`}>
                {value || '—'}
            </p>
        </div>
    );
}

function QuotaCard({ label, usedBytes, limitBytes, gradient }) {
    const pct = quotaUsagePercent(usedBytes, limitBytes);

    return (
        <div className={`rounded-lg border p-2.5 text-white shadow-md ${gradient}`}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/80">{label}</p>
            <p className="text-sm font-black font-mono mt-1 text-white">{formatBytes(usedBytes)}</p>
            <p className="text-[10px] mt-0.5 text-white/70">
                {limitBytes
                    ? (pct !== null ? `${pct.toFixed(1)}% dari kuota ${formatBytes(limitBytes)}` : `Kuota ${formatBytes(limitBytes)}`)
                    : 'Tidak ada batas kuota di RouterOS'}
            </p>
        </div>
    );
}

const QUOTA_POLL_MS = 30000;

export default function CustomerDetailPanel({ customer, theme, onEdit }) {
    const {
        isDarkMode,
        themeTextTitle,
        themeTextSub,
        themeTextDesc,
    } = theme;

    const [quota, setQuota] = useState(null);
    const [isLoadingQuota, setIsLoadingQuota] = useState(true);
    const [quotaError, setQuotaError] = useState(null);
    const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);

    const canGenerateManualInvoice = !!customer.package
        && ['active', 'isolated'].includes(customer.status)
        && !customer.pending_deferral;

    const generateInvoiceDisabledReason = !customer.package
        ? 'Pelanggan belum memiliki paket internet.'
        : !['active', 'isolated'].includes(customer.status)
            ? 'Status pelanggan harus aktif atau isolir.'
            : customer.pending_deferral
                ? 'Penundaan tagihan aktif — batalkan penundaan terlebih dahulu.'
                : null;

    const handleGenerateInvoice = () => {
        if (!canGenerateManualInvoice || isGeneratingInvoice) {
            return;
        }

        if (!confirm(
            `Generate tagihan manual untuk ${customer.name}?\n\n` +
            'Invoice baru akan dibuat untuk periode tagihan sesuai jadwal pelanggan (atau bulan berjalan jika di luar jadwal otomatis).'
        )) {
            return;
        }

        setIsGeneratingInvoice(true);
        router.post('/admin/invoices/generate-customer', { customer_id: customer.id }, {
            preserveScroll: true,
            onFinish: () => setIsGeneratingInvoice(false),
        });
    };

    const themeInnerWidget = isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';
    const status = statusMeta(customer.status);
    const hasGps = customer.latitude != null && customer.longitude != null && customer.latitude !== '' && customer.longitude !== '';
    const mapsUrl = hasGps
        ? `https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`
        : null;

    useEffect(() => {
        let cancelled = false;

        const loadQuota = async () => {
            try {
                const res = await fetch(`/admin/customers/bandwidth-quota?customer_id=${customer.id}`, {
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Gagal memuat quota bandwidth.');
                }

                if (!cancelled) {
                    setQuota(data);
                    setQuotaError(null);
                }
            } catch (error) {
                if (!cancelled) {
                    setQuotaError(error?.message || 'Gagal memuat quota bandwidth.');
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingQuota(false);
                }
            }
        };

        setIsLoadingQuota(true);
        loadQuota();
        const intervalId = setInterval(loadQuota, QUOTA_POLL_MS);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [customer.id]);

    const downloadBytes = quota?.download_bytes ?? 0;
    const uploadBytes = quota?.upload_bytes ?? 0;
    const totalBytes = quota?.total_bytes ?? (downloadBytes + uploadBytes);
    const isOnline = !!quota?.online;

    return (
        <div className={`border-t ${isDarkMode ? 'border-zinc-800/60 bg-zinc-950/20' : 'border-zinc-200 bg-zinc-50/50'} px-3 py-4 sm:px-4`}>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div>
                    <p className={`text-xs font-bold ${themeTextTitle}`}>Detail Lengkap Pelanggan</p>
                    <p className={`text-[10px] mt-0.5 ${themeTextDesc}`}>
                        Informasi sama seperti form popup Manajemen PPPoE.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onEdit?.(customer)}
                    title="Edit Pelanggan"
                    className="self-start inline-block p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors"
                >
                    <Edit className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <div className={`rounded-xl border p-3 space-y-3 ${themeInnerWidget}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${themeTextSub}`}>Identitas & Kontak</p>
                    <DetailItem label="Nama Lengkap" value={customer.name} themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                    <DetailItem label="Username Layanan" value={customer.username} mono themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                    <DetailItem label="Password Portal" value={customer.password} mono themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                    <DetailItem label="Nomor Telepon (WA)" value={customer.phone_number} mono themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                    <DetailItem label="Email Portal" value={customer.portal_email} mono themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                    <DetailItem label="Alamat Lengkap" value={customer.address} themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                </div>

                <div className={`rounded-xl border p-3 space-y-3 ${themeInnerWidget}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${themeTextSub}`}>Lokasi & Jaringan</p>
                    <DetailItem label="Lintang GPS (Latitude)" value={hasGps ? String(customer.latitude) : null} mono themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                    <DetailItem label="Bujur GPS (Longitude)" value={hasGps ? String(customer.longitude) : null} mono themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                    {mapsUrl && (
                        <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex text-[10px] font-bold text-sky-500 hover:underline"
                        >
                            Buka di Google Maps
                        </a>
                    )}
                    <DetailItem label="Router" value={customer.router?.name} themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                    <DetailItem
                        label="Paket Internet"
                        value={customer.package ? `${customer.package.name} · ${formatRupiah(customer.package.price)}` : null}
                        themeTextTitle={themeTextTitle}
                        themeTextSub={themeTextSub}
                    />
                    <DetailItem label="Batas Kecepatan Paket" value={customer.package?.bandwidth_limit} mono themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                    <DetailItem label="Titik ODP" value={customer.odp?.name} themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                </div>

                <div className={`rounded-xl border p-3 space-y-3 ${themeInnerWidget}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${themeTextSub}`}>Status & Billing</p>
                    <div>
                        <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Status Akun</p>
                        <span className={`inline-flex mt-1 px-2 py-0.5 rounded text-[10px] font-bold border ${status.className}`}>
                            {status.label}
                        </span>
                    </div>
                    <DetailItem label="Tgl Jatuh Tempo" value={customer.billing_date ? `Tgl ${customer.billing_date}` : null} themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                    <DetailItem label="Tgl Mulai Layanan" value={formatDate(customer.service_start_date)} themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />

                    {customer.latest_unpaid_invoice ? (
                        <div className={`rounded-lg border p-2.5 ${isDarkMode ? 'border-rose-500/20 bg-rose-500/5' : 'border-rose-200 bg-rose-50/80'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-rose-500">Tagihan Belum Lunas</p>
                            <p className={`text-xs font-mono font-bold mt-1 ${themeTextTitle}`}>{customer.latest_unpaid_invoice.invoice_number}</p>
                            <p className={`text-[10px] mt-0.5 ${themeTextSub}`}>
                                Periode {customer.latest_unpaid_invoice.billing_period} · {formatRupiah(customer.latest_unpaid_invoice.total_amount)}
                            </p>
                            <p className={`text-[10px] ${themeTextDesc}`}>
                                Jatuh tempo {formatDate(customer.latest_unpaid_invoice.due_date)}
                            </p>
                        </div>
                    ) : customer.latest_canceled_invoice ? (
                        <div className={`rounded-lg border p-2.5 ${isDarkMode ? 'border-zinc-500/20 bg-zinc-500/5' : 'border-zinc-300 bg-zinc-100/80'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                                {customer.pending_deferral ? 'Tagihan Periode Ditunda' : 'Invoice Dibatalkan'}
                            </p>
                            <p className={`text-xs font-mono font-bold mt-1 ${themeTextTitle}`}>{customer.latest_canceled_invoice.invoice_number}</p>
                            <p className={`text-[10px] mt-0.5 ${themeTextSub}`}>
                                Periode {customer.latest_canceled_invoice.billing_period} · {formatRupiah(customer.latest_canceled_invoice.total_amount)}
                            </p>
                            <p className={`text-[10px] ${themeTextDesc}`}>
                                {customer.pending_deferral
                                    ? `Penundaan aktif — invoice akumulasi terbit otomatis, jatuh tempo gabungan ${formatDate(customer.pending_deferral.combined_due_date)}.`
                                    : 'Buka menu Tagihan dan klik Pulihkan pada baris invoice untuk Bayar Manual.'}
                            </p>
                        </div>
                    ) : (
                        <p className={`text-[10px] ${themeTextDesc}`}>Tidak ada tagihan belum lunas.</p>
                    )}

                    {customer.pending_deferral ? (
                        <div className={`rounded-lg border p-2.5 ${isDarkMode ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50/80'}`}>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">Penundaan Tagihan Aktif</p>
                            <p className={`text-[10px] mt-1 ${themeTextSub}`}>
                                Periode {(customer.pending_deferral.periods || []).join(' + ')}
                            </p>
                            <p className={`text-[10px] ${themeTextDesc}`}>
                                Jatuh tempo gabungan {formatDate(customer.pending_deferral.combined_due_date)}
                            </p>
                        </div>
                    ) : null}

                    <div className="pt-1">
                        <button
                            type="button"
                            onClick={handleGenerateInvoice}
                            disabled={!canGenerateManualInvoice || isGeneratingInvoice}
                            title={
                                generateInvoiceDisabledReason
                                    ? generateInvoiceDisabledReason
                                    : isGeneratingInvoice
                                        ? 'Membuat invoice...'
                                        : 'Generate tagihan manual untuk pelanggan ini'
                            }
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                                canGenerateManualInvoice && !isGeneratingInvoice
                                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 cursor-pointer'
                                    : isDarkMode
                                        ? 'border-zinc-800 text-zinc-500 bg-zinc-900/40 cursor-not-allowed opacity-60'
                                        : 'border-zinc-200 text-zinc-400 bg-zinc-100 cursor-not-allowed opacity-70'
                            }`}
                        >
                            {isGeneratingInvoice ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <FileText className="w-3.5 h-3.5" />
                            )}
                            Generate Tagihan Manual
                        </button>
                        {generateInvoiceDisabledReason && (
                            <p className={`text-[10px] mt-1.5 ${themeTextDesc}`}>{generateInvoiceDisabledReason}</p>
                        )}
                    </div>
                </div>
            </div>

            <div className={`mt-4 rounded-xl border p-3 space-y-3 ${themeInnerWidget}`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex flex-col gap-1 min-w-0 sm:flex-row sm:items-center sm:gap-2">
                        <div className="flex items-center gap-2">
                            <Database className="w-4 h-4 text-indigo-500 shrink-0" />
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${themeTextSub}`}>Quota Bandwidth (Total Pemakaian)</p>
                        </div>
                        {quota?.period && (
                            <span className={`text-[10px] ${themeTextDesc}`}>
                                Periode {quota.period} · reset otomatis tiap tanggal 1
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {isLoadingQuota && (
                            <span className={`text-[10px] inline-flex items-center gap-1 ${themeTextSub}`}>
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                Memuat...
                            </span>
                        )}
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isOnline
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                        }`}>
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>

                {quotaError && (
                    <p className="text-[10px] text-amber-500">{quotaError}</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                    <QuotaCard
                        label="Total Quota Terpakai"
                        usedBytes={totalBytes}
                        limitBytes={null}
                        gradient="bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-400/20 shadow-indigo-500/10"
                    />
                    <QuotaCard
                        label="Download Terpakai"
                        usedBytes={downloadBytes}
                        limitBytes={quota?.download_limit_bytes}
                        gradient="bg-gradient-to-br from-sky-500 to-blue-600 border-sky-400/20 shadow-sky-500/10"
                    />
                    <QuotaCard
                        label="Upload Terpakai"
                        usedBytes={uploadBytes}
                        limitBytes={quota?.upload_limit_bytes}
                        gradient="bg-gradient-to-br from-violet-500 to-fuchsia-600 border-violet-400/20 shadow-violet-500/10"
                    />
                </div>
            </div>
        </div>
    );
}
