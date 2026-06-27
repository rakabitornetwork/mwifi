import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Activity,
    ArrowDown,
    ArrowUp,
    Edit,
    ExternalLink,
    FileText,
    History,
    MapPin,
    Receipt,
    RefreshCw,
    User,
    Wifi,
} from 'lucide-react';
import { formatRupiah } from '../../utils/formatRupiah';
import { formatBytes, quotaUsagePercent } from '../../utils/formatBytes';
import { formatDisplayDate, resolveCustomerDueDate } from '../../utils/formatDateInputValue';
import { readAdminWhatsAppPreference, writeAdminWhatsAppPreference } from '../../utils/adminWhatsAppPreference';
import WhatsAppNotifyCheckbox from './WhatsAppNotifyCheckbox';
import OntWifiPanel from '../OntWifiPanel';
import { formatBandwidthLimitLabel } from '../../utils/customerMetrics';

function formatDate(value) {
    return formatDisplayDate(value);
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

function panelDivider(isDarkMode) {
    return isDarkMode ? 'border-zinc-800/50' : 'border-zinc-200/70';
}

function SectionBlock({ icon: Icon, title, meta, trailing, children, themeTextSub, themeTextDesc }) {
    return (
        <section className="space-y-3 min-w-0 h-full">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                    <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500/70`} />
                    <div className="min-w-0">
                        <h4 className={`text-[10px] font-bold uppercase tracking-[0.14em] ${themeTextSub}`}>{title}</h4>
                        {meta ? (
                            <p className={`text-[10px] mt-0.5 leading-snug ${themeTextDesc}`}>{meta}</p>
                        ) : null}
                    </div>
                </div>
                {trailing ? <div className="shrink-0">{trailing}</div> : null}
            </div>
            {children}
        </section>
    );
}

function InfoGrid({ children }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
            {children}
        </div>
    );
}

function InfoCell({ label, value, mono = false, className = '', themeTextTitle, themeTextSub, span = false, row = false, isDarkMode, isLast = false }) {
    if (row) {
        const divider = isDarkMode ? 'border-zinc-800/50' : 'border-zinc-100';

        return (
            <div className={`flex items-baseline justify-between gap-4 min-w-0 py-2 ${!isLast ? `border-b ${divider}` : ''} ${className}`}>
                <p className={`text-[10px] font-medium shrink-0 ${themeTextSub}`}>{label}</p>
                <p className={`text-[11px] font-semibold text-right break-words [overflow-wrap:anywhere] leading-snug ${mono ? 'font-mono text-[10px]' : ''} ${themeTextTitle}`}>
                    {value || '—'}
                </p>
            </div>
        );
    }

    return (
        <div className={`min-w-0 ${span ? 'sm:col-span-2' : ''} ${className}`}>
            <p className={`text-[9px] font-semibold uppercase tracking-wide leading-tight ${themeTextSub}`}>{label}</p>
            <p className={`text-[11px] mt-1 font-medium break-words [overflow-wrap:anywhere] leading-snug ${mono ? 'font-mono text-[10px]' : ''} ${themeTextTitle}`}>
                {value || '—'}
            </p>
        </div>
    );
}

function NoticeBox({ tone = 'rose', title, children, isDarkMode }) {
    const styles = {
        rose: isDarkMode ? 'border-rose-500/20 bg-rose-500/5' : 'border-rose-200/80 bg-rose-50/50',
        zinc: isDarkMode ? 'border-zinc-600/30 bg-zinc-800/30' : 'border-zinc-200 bg-zinc-50',
        indigo: isDarkMode ? 'border-indigo-500/20 bg-indigo-500/5' : 'border-indigo-200/80 bg-indigo-50/50',
    };
    const titles = { rose: 'text-rose-500', zinc: 'text-zinc-500', indigo: 'text-indigo-500' };

    return (
        <div className={`rounded-lg border px-3 py-2.5 space-y-0.5 ${styles[tone] || styles.rose}`}>
            <p className={`text-[9px] font-bold uppercase tracking-wide ${titles[tone] || titles.rose}`}>{title}</p>
            {children}
        </div>
    );
}

const QUOTA_CARD_THEMES = {
    indigo: {
        cardDark: 'border-indigo-500/25 bg-indigo-500/8',
        cardLight: 'border-indigo-200/80 bg-indigo-50/70',
        iconWrapDark: 'bg-indigo-500/15 border-indigo-500/25',
        iconWrapLight: 'bg-indigo-100/80 border-indigo-200',
        icon: 'text-indigo-500',
        value: 'text-indigo-500',
        bar: 'bg-indigo-500',
        trackDark: 'bg-indigo-950/40',
        trackLight: 'bg-indigo-100',
    },
    sky: {
        cardDark: 'border-sky-500/25 bg-sky-500/8',
        cardLight: 'border-sky-200/80 bg-sky-50/70',
        iconWrapDark: 'bg-sky-500/15 border-sky-500/25',
        iconWrapLight: 'bg-sky-100/80 border-sky-200',
        icon: 'text-sky-500',
        value: 'text-sky-500',
        bar: 'bg-sky-500',
        trackDark: 'bg-sky-950/40',
        trackLight: 'bg-sky-100',
    },
    violet: {
        cardDark: 'border-violet-500/25 bg-violet-500/8',
        cardLight: 'border-violet-200/80 bg-violet-50/70',
        iconWrapDark: 'bg-violet-500/15 border-violet-500/25',
        iconWrapLight: 'bg-violet-100/80 border-violet-200',
        icon: 'text-violet-500',
        value: 'text-violet-500',
        bar: 'bg-violet-500',
        trackDark: 'bg-violet-950/40',
        trackLight: 'bg-violet-100',
    },
};

function QuotaStat({ icon: Icon, tone = 'indigo', label, usedBytes, limitBytes, isDarkMode, themeTextSub, themeTextDesc }) {
    const pct = quotaUsagePercent(usedBytes, limitBytes);
    const barWidth = pct !== null ? Math.min(pct, 100) : 0;
    const styles = QUOTA_CARD_THEMES[tone] || QUOTA_CARD_THEMES.indigo;

    return (
        <div className={`rounded-xl border p-3 min-w-0 ${isDarkMode ? styles.cardDark : styles.cardLight}`}>
            <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg border shrink-0 ${isDarkMode ? styles.iconWrapDark : styles.iconWrapLight}`}>
                    <Icon className={`w-3.5 h-3.5 ${styles.icon}`} />
                </div>
                <p className={`text-[9px] font-bold uppercase tracking-wide ${themeTextSub}`}>{label}</p>
            </div>
            <p className={`text-sm font-bold font-mono break-all ${styles.value}`}>
                {formatBytes(usedBytes)}
            </p>
            {limitBytes && pct !== null ? (
                <div className="mt-2.5 space-y-1.5">
                    <div className={`h-1 rounded-full overflow-hidden ${isDarkMode ? styles.trackDark : styles.trackLight}`}>
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
                            style={{ width: `${barWidth}%` }}
                        />
                    </div>
                    <p className={`text-[9px] leading-snug ${themeTextDesc}`}>
                        {pct.toFixed(1)}% dari {formatBytes(limitBytes)}
                    </p>
                </div>
            ) : (
                <p className={`text-[9px] mt-1.5 leading-snug ${themeTextDesc}`}>
                    {limitBytes ? `Kuota ${formatBytes(limitBytes)}` : 'Tanpa batas kuota RouterOS'}
                </p>
            )}
        </div>
    );
}

const QUOTA_POLL_MS = 30000;

export default function CustomerDetailPanel({ customer, theme, onEdit, canWrite = true }) {
    const {
        isDarkMode,
        themeCard,
        themeTextTitle,
        themeTextSub,
        themeTextDesc,
    } = theme;

    const [quota, setQuota] = useState(null);
    const [isLoadingQuota, setIsLoadingQuota] = useState(true);
    const [quotaError, setQuotaError] = useState(null);
    const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
    const [isBackfilling, setIsBackfilling] = useState(false);
    const [sendWhatsApp, setSendWhatsApp] = useState(() => readAdminWhatsAppPreference());
    const [dueExtensionDays, setDueExtensionDays] = useState('0');

    const handleWhatsAppPreferenceChange = (checked) => {
        setSendWhatsApp(checked);
        writeAdminWhatsAppPreference(checked);
    };

    const themeInput = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700'
        : 'bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300';

    const canGenerateManualInvoice = !!customer.package
        && ['active', 'isolated'].includes(customer.status)
        && !customer.pending_deferral;

    const generateInvoiceDisabledReason = !customer.package
        ? 'Pelanggan belum memiliki paket internet.'
        : !['active', 'isolated'].includes(customer.status)
            ? 'Status pelanggan harus aktif atau isolir.'
            : customer.pending_deferral
                ? 'Tunda bayar aktif — batalkan tunda bayar terlebih dahulu.'
                : null;

    const handleGenerateInvoice = () => {
        if (!canGenerateManualInvoice || isBillingActionBusy) {
            return;
        }

        const extensionNote = Number(dueExtensionDays) > 0
            ? `Jika tanggal jatuh tempo periode sudah lewat, batas bayar diperpanjang ${dueExtensionDays} hari ke depan.`
            : 'Jatuh tempo mengikuti tanggal tagihan pelanggan (tanpa perpanjangan).';

        const waNote = sendWhatsApp
            ? '\n\nNotifikasi WhatsApp akan dikirim ke pelanggan.'
            : '\n\nNotifikasi WhatsApp tidak akan dikirim.';

        if (!confirm(
            `Generate tagihan manual untuk ${customer.name}?\n\n` +
            `Invoice baru akan dibuat untuk periode tagihan sesuai jadwal pelanggan (atau bulan berjalan jika di luar jadwal otomatis).\n` +
            extensionNote +
            waNote
        )) {
            return;
        }

        setIsGeneratingInvoice(true);
        router.post('/admin/invoices/generate-customer', {
            customer_id: customer.id,
            due_extension_days: Number(dueExtensionDays),
            send_whatsapp: sendWhatsApp,
        }, {
            preserveScroll: true,
            onFinish: () => setIsGeneratingInvoice(false),
        });
    };

    const handleBackfillInvoices = async () => {
        if (!canGenerateManualInvoice || isGeneratingInvoice || isBackfilling) {
            return;
        }

        setIsBackfilling(true);

        try {
            const response = await fetch('/admin/invoices/backfill-preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({
                    customer_id: customer.id,
                    due_extension_days: Number(dueExtensionDays),
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || 'Gagal memuat preview tagihan terlewat.');
            }

            if (!data.count) {
                alert('Tidak ada periode tagihan terlewat yang perlu digenerate untuk pelanggan ini.');
                setIsBackfilling(false);
                return;
            }

            const periodLines = (data.lines || [])
                .map((line) => `• ${line.period_label}: ${formatRupiah(line.total_amount)} (jatuh tempo ${line.due_date_label})`)
                .join('\n');
            const waNote = sendWhatsApp
                ? `\n\nNotifikasi WhatsApp akan dikirim untuk ${data.count} invoice (mengikuti pengaturan jeda bulk).`
                : '\n\nNotifikasi WhatsApp tidak akan dikirim.';

            if (!confirm(
                `Generate ${data.count} tagihan terlewat untuk ${customer.name}?\n\n` +
                `${periodLines}\n\n` +
                `Total: ${formatRupiah(data.total_amount)}${waNote}`
            )) {
                setIsBackfilling(false);
                return;
            }

            router.post('/admin/invoices/backfill-customer', {
                customer_id: customer.id,
                due_extension_days: Number(dueExtensionDays),
                send_whatsapp: sendWhatsApp,
            }, {
                preserveScroll: true,
                onFinish: () => setIsBackfilling(false),
            });
        } catch (error) {
            alert(error?.message || 'Gagal memuat preview tagihan terlewat.');
            setIsBackfilling(false);
        }
    };

    const isBillingActionBusy = isGeneratingInvoice || isBackfilling;
    const status = statusMeta(customer.status);
    const hasGps = customer.latitude != null && customer.longitude != null && customer.latitude !== '' && customer.longitude !== '';
    const mapsUrl = hasGps
        ? `https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`
        : null;
    const isHotspot = customer.service_type === 'hotspot';
    const divider = panelDivider(isDarkMode);

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

    const onlineBadge = (
        <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold border ${
            isOnline
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
        }`}>
            {isOnline ? 'Online' : 'Offline'}
        </span>
    );

    return (
        <div className={`customer-detail-panel border-t ${isDarkMode ? 'border-zinc-800/60 bg-zinc-950/20' : 'border-zinc-200 bg-zinc-50/50'} px-3 py-4 sm:px-4 min-w-0 max-w-full overflow-hidden`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="min-w-0">
                    <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${themeTextSub}`}>Detail Lengkap Pelanggan</p>
                    <p className={`text-sm font-bold mt-1 truncate ${themeTextTitle}`}>{customer.name}</p>
                    <p className={`text-[11px] font-mono mt-0.5 ${themeTextDesc}`}>{customer.username}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold border ${status.className}`}>
                        {status.label}
                    </span>
                    {canWrite && (
                        <button
                            type="button"
                            onClick={() => onEdit?.(customer)}
                            title="Edit Pelanggan"
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                isDarkMode
                                    ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                                    : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                            }`}
                        >
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                        </button>
                    )}
                </div>
            </div>

            <div className={`${themeCard} rounded-2xl border overflow-hidden`}>
                <div className={`grid grid-cols-1 lg:grid-cols-2 border-b ${divider}`}>
                    <div className={`p-4 sm:p-5 lg:border-r ${divider}`}>
                        <SectionBlock icon={User} title="Identitas & Kontak" themeTextSub={themeTextSub}>
                            <InfoGrid>
                                <InfoCell label="Nama Lengkap" value={customer.name} themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                                <InfoCell label="Username" value={customer.username} mono themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                                <InfoCell label="Password Portal" value={customer.password} mono themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                                <InfoCell label="Telepon (WA)" value={customer.phone_number} mono themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                                <InfoCell
                                    label="Email Portal"
                                    value={customer.portal_email || customer.user?.email}
                                    mono
                                    themeTextTitle={themeTextTitle}
                                    themeTextSub={themeTextSub}
                                    span
                                />
                                <InfoCell label="Alamat" value={customer.address} themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} span />
                            </InfoGrid>
                        </SectionBlock>
                    </div>

                    <div className="p-4 sm:p-5">
                        <SectionBlock icon={MapPin} title="Lokasi & Jaringan" themeTextSub={themeTextSub}>
                            <InfoGrid>
                                <InfoCell label="Latitude" value={hasGps ? String(customer.latitude) : null} mono themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                                <InfoCell label="Longitude" value={hasGps ? String(customer.longitude) : null} mono themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                                <InfoCell label="Router" value={customer.router?.name} themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                                <InfoCell
                                    label="Paket"
                                    value={customer.package ? `${customer.package.name} · ${formatRupiah(customer.package.price)}` : null}
                                    themeTextTitle={themeTextTitle}
                                    themeTextSub={themeTextSub}
                                />
                                <InfoCell label="Kecepatan" value={formatBandwidthLimitLabel(customer.package?.bandwidth_limit)} mono themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                                <InfoCell label="ODP" value={customer.odp?.name} themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} />
                            </InfoGrid>
                            {mapsUrl && (
                                <a
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-1.5 mt-1 text-[10px] font-semibold transition-colors ${
                                        isDarkMode ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700'
                                    }`}
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    Google Maps
                                </a>
                            )}
                        </SectionBlock>
                    </div>
                </div>

                <div className={`grid grid-cols-1 ${!isHotspot ? 'lg:grid-cols-2' : ''} border-b ${divider}`}>
                    {!isHotspot && (
                        <div className={`p-4 sm:p-5 lg:border-r ${divider}`}>
                            <SectionBlock icon={Wifi} title="WiFi ONT" themeTextSub={themeTextSub}>
                                <OntWifiPanel
                                    apiBase="/admin/gpon"
                                    customerId={customer.id}
                                    username={customer.username}
                                    canWrite={canWrite}
                                    showReboot
                                    bare
                                    theme={theme}
                                />
                            </SectionBlock>
                        </div>
                    )}

                    <div className={`p-4 sm:p-5 ${isHotspot ? '' : ''}`}>
                        <SectionBlock icon={Receipt} title="Status & Billing" themeTextSub={themeTextSub}>
                            <div className="min-w-0">
                                <InfoCell row label="Status Akun" value={status.label} themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} isDarkMode={isDarkMode} />
                                <InfoCell row label="Mulai Layanan" value={formatDate(customer.service_start_date)} themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} isDarkMode={isDarkMode} />
                                <InfoCell row label="Jatuh Tempo" value={resolveCustomerDueDate(customer) ? formatDisplayDate(resolveCustomerDueDate(customer)) : null} themeTextTitle={themeTextTitle} themeTextSub={themeTextSub} isDarkMode={isDarkMode} isLast />
                            </div>

                            <div className="space-y-2 pt-1">
                                {customer.latest_unpaid_invoice ? (
                                    <NoticeBox tone="rose" isDarkMode={isDarkMode} title="Tagihan Belum Lunas">
                                        <p className={`text-[11px] font-mono font-semibold break-all ${themeTextTitle}`}>{customer.latest_unpaid_invoice.invoice_number}</p>
                                        <p className={`text-[10px] mt-0.5 ${themeTextSub}`}>
                                            {customer.latest_unpaid_invoice.billing_period} · {formatRupiah(customer.latest_unpaid_invoice.total_amount)}
                                        </p>
                                        <p className={`text-[10px] ${themeTextDesc}`}>Jatuh tempo {formatDate(customer.latest_unpaid_invoice.due_date)}</p>
                                    </NoticeBox>
                                ) : customer.latest_canceled_invoice ? (
                                    <NoticeBox tone="zinc" isDarkMode={isDarkMode} title={customer.pending_deferral ? 'Tagihan Ditunda' : 'Invoice Dibatalkan'}>
                                        <p className={`text-[11px] font-mono font-semibold break-all ${themeTextTitle}`}>{customer.latest_canceled_invoice.invoice_number}</p>
                                        <p className={`text-[10px] mt-0.5 ${themeTextSub}`}>
                                            {customer.latest_canceled_invoice.billing_period} · {formatRupiah(customer.latest_canceled_invoice.total_amount)}
                                        </p>
                                        <p className={`text-[10px] ${themeTextDesc} leading-relaxed`}>
                                            {customer.pending_deferral
                                                ? `Tunda bayar aktif — jatuh tempo gabungan ${formatDate(customer.pending_deferral.combined_due_date)}.`
                                                : 'Pulihkan invoice di menu Tagihan untuk bayar manual.'}
                                        </p>
                                    </NoticeBox>
                                ) : (
                                    <p className={`text-[10px] ${themeTextDesc}`}>Tidak ada tagihan belum lunas.</p>
                                )}

                                {customer.pending_deferral ? (
                                    <NoticeBox tone="indigo" isDarkMode={isDarkMode} title="Tunda Bayar">
                                        <p className={`text-[10px] ${themeTextSub}`}>
                                            Periode {(customer.pending_deferral.periods || []).join(' + ')}
                                        </p>
                                        <p className={`text-[10px] ${themeTextDesc}`}>
                                            Jatuh tempo {formatDate(customer.pending_deferral.combined_due_date)}
                                        </p>
                                    </NoticeBox>
                                ) : null}
                            </div>

                            {canWrite ? (
                                <div className={`mt-4 pt-4 space-y-2.5 border-t ${divider}`}>
                                    <p className={`text-[9px] font-bold uppercase tracking-[0.12em] ${themeTextSub}`}>Aksi Tagihan</p>
                                    <div className="space-y-2">
                                        <select
                                            id={`due-extension-${customer.id}`}
                                            value={dueExtensionDays}
                                            onChange={(e) => setDueExtensionDays(e.target.value)}
                                            disabled={!canGenerateManualInvoice || isBillingActionBusy}
                                            className={`w-full px-2.5 py-2 border rounded-lg text-[10px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-60 ${themeInput}`}
                                        >
                                            <option value="0">Jatuh tempo normal</option>
                                            <option value="3">Perpanjang 3 hari</option>
                                            <option value="5">Perpanjang 5 hari</option>
                                            <option value="7">Perpanjang 7 hari</option>
                                        </select>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={handleGenerateInvoice}
                                                disabled={!canGenerateManualInvoice || isBillingActionBusy}
                                                title={generateInvoiceDisabledReason || 'Generate tagihan manual'}
                                                className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-bold transition-colors ${
                                                    canGenerateManualInvoice && !isBillingActionBusy
                                                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer'
                                                        : isDarkMode
                                                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                                                            : 'bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-70'
                                                }`}
                                            >
                                                {isGeneratingInvoice ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                                Generate Manual
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleBackfillInvoices}
                                                disabled={!canGenerateManualInvoice || isBillingActionBusy}
                                                title={generateInvoiceDisabledReason || 'Generate tagihan terlewat'}
                                                className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-[10px] font-bold transition-colors ${
                                                    canGenerateManualInvoice && !isBillingActionBusy
                                                        ? 'bg-indigo-500 hover:bg-indigo-600 text-white cursor-pointer'
                                                        : isDarkMode
                                                            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60'
                                                            : 'bg-zinc-100 text-zinc-400 cursor-not-allowed opacity-70'
                                                }`}
                                            >
                                                {isBackfilling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
                                                Generate Terlewat
                                            </button>
                                        </div>
                                        <WhatsAppNotifyCheckbox
                                            checked={sendWhatsApp}
                                            onChange={handleWhatsAppPreferenceChange}
                                            disabled={!canGenerateManualInvoice || isBillingActionBusy}
                                            themeTextDesc={themeTextDesc}
                                        />
                                    </div>
                                    {generateInvoiceDisabledReason && (
                                        <p className={`text-[10px] leading-relaxed ${themeTextDesc}`}>{generateInvoiceDisabledReason}</p>
                                    )}
                                </div>
                            ) : null}
                        </SectionBlock>
                    </div>
                </div>

                <div className="p-4 sm:p-5">
                    <SectionBlock
                        icon={Activity}
                        title="Quota Bandwidth"
                        meta={quota?.period ? `Periode ${quota.period} · reset tiap tanggal 1` : undefined}
                        trailing={(
                            <div className="flex items-center gap-2">
                                {isLoadingQuota && (
                                    <RefreshCw className={`w-3 h-3 animate-spin ${themeTextSub}`} />
                                )}
                                {onlineBadge}
                            </div>
                        )}
                        themeTextSub={themeTextSub}
                        themeTextDesc={themeTextDesc}
                    >
                        {quotaError && (
                            <p className="text-[10px] text-amber-500 mb-2">{quotaError}</p>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <QuotaStat
                                icon={Activity}
                                tone="indigo"
                                label="Total"
                                usedBytes={totalBytes}
                                limitBytes={null}
                                isDarkMode={isDarkMode}
                                themeTextSub={themeTextSub}
                                themeTextDesc={themeTextDesc}
                            />
                            <QuotaStat
                                icon={ArrowDown}
                                tone="sky"
                                label="Download"
                                usedBytes={downloadBytes}
                                limitBytes={quota?.download_limit_bytes}
                                isDarkMode={isDarkMode}
                                themeTextSub={themeTextSub}
                                themeTextDesc={themeTextDesc}
                            />
                            <QuotaStat
                                icon={ArrowUp}
                                tone="violet"
                                label="Upload"
                                usedBytes={uploadBytes}
                                limitBytes={quota?.upload_limit_bytes}
                                isDarkMode={isDarkMode}
                                themeTextSub={themeTextSub}
                                themeTextDesc={themeTextDesc}
                            />
                        </div>
                    </SectionBlock>
                </div>
            </div>
        </div>
    );
}
