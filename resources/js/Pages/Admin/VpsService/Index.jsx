import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    ArrowUpRight,
    Copy,
    Crown,
    ExternalLink,
    Globe,
    Layers,
    Link2,
    Mail,
    Plus,
    RotateCcw,
    Save,
    Server,
    ShieldCheck,
    Sparkles,
    Trash2,
    UserCheck,
} from 'lucide-react';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import AdminPageCard, { PremiumPanel, PremiumPanelHeader } from '../../../Components/Admin/AdminPageCard';
import { useAdminFormTheme } from '../../../hooks/useAdminFormTheme';
import { formatRupiah } from '../../../utils/formatRupiah';

function emptyPlan() {
    return {
        id: '',
        name: '',
        cpu: '',
        ram: '',
        storage: '',
        bandwidth: '',
        price: '',
        description: '',
        featured: false,
    };
}

function ToggleSwitch({ checked, onChange, label, description }) {
    return (
        <label className="flex items-center justify-between gap-4 cursor-pointer group">
            <span className="min-w-0">
                <span className="block text-sm font-bold text-inherit">{label}</span>
                {description ? (
                    <span className="block text-[11px] opacity-70 mt-0.5 leading-relaxed">{description}</span>
                ) : null}
            </span>
            <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
                <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <span className="absolute inset-0 rounded-full bg-zinc-300 dark:bg-zinc-700 transition-colors peer-checked:bg-violet-500" />
                <span className="absolute left-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-transform peer-checked:translate-x-5" />
            </span>
        </label>
    );
}

function PlanPreviewCard({ plan, isDarkMode }) {
    const featured = !!plan.featured;
    const price = parseInt(plan.price, 10) || 0;

    return (
        <div
            className={`relative rounded-2xl border p-4 transition-all ${
                featured
                    ? 'border-violet-500/40 bg-gradient-to-br from-violet-500/10 via-transparent to-indigo-500/5 shadow-lg shadow-violet-500/10'
                    : isDarkMode
                        ? 'border-zinc-800 bg-zinc-950/50'
                        : 'border-zinc-200 bg-white'
            }`}
        >
            {featured && (
                <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500 text-[9px] font-bold uppercase tracking-wider text-white">
                    <Crown className="w-3 h-3" />
                    Unggulan
                </span>
            )}
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-500 mb-1">
                {plan.id || 'slug-paket'}
            </p>
            <h4 className="text-sm font-bold truncate">{plan.name || 'Nama Paket'}</h4>
            <p className="text-[10px] opacity-60 mt-1 line-clamp-2 min-h-[2rem]">
                {plan.description || 'Deskripsi singkat paket VPS.'}
            </p>
            <p className="mt-3 text-lg font-extrabold tracking-tight">
                {price > 0 ? formatRupiah(price) : 'Rp —'}
                <span className="text-[10px] font-medium opacity-50">/bln</span>
            </p>
            <ul className="mt-3 space-y-1 text-[10px] opacity-80">
                {plan.cpu && <li>• {plan.cpu}</li>}
                {plan.ram && <li>• {plan.ram}</li>}
                {plan.storage && <li>• {plan.storage}</li>}
                {plan.bandwidth && <li>• {plan.bandwidth}</li>}
            </ul>
        </div>
    );
}

function VpsServicePageContent({ config = {}, landingOrderUrl = '', defaultPlans = [], showcaseCustomers = [] }) {
    const { showToast } = useAdminToast();
    const {
        isDarkMode,
        themeCard,
        themeTextTitle,
        themeTextSub,
        themeTextDesc,
        themeInput,
        themeLabel,
        themeInnerWidget,
    } = useAdminFormTheme();

    const [enabled, setEnabled] = useState(config.enabled ?? false);
    const [pageTitle, setPageTitle] = useState(config.page_title || 'Sewa VPS Cloud Indonesia');
    const [pageDescription, setPageDescription] = useState(config.page_description || '');
    const [whitelistUsernames, setWhitelistUsernames] = useState(config.whitelist_usernames || '');
    const [whitelistPhones, setWhitelistPhones] = useState(config.whitelist_phones || '');
    const [demoLinkDays, setDemoLinkDays] = useState(String(config.demo_link_days ?? 30));
    const [plans, setPlans] = useState(
        (config.plans?.length ? config.plans : defaultPlans).map((plan) => ({
            ...plan,
            price: String(plan.price ?? ''),
        }))
    );
    const [isSaving, setIsSaving] = useState(false);
    const [activeSection, setActiveSection] = useState('general');
    const [generatingLinkFor, setGeneratingLinkFor] = useState(null);

    const whitelistUsernameCount = useMemo(
        () => whitelistUsernames.split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean).length,
        [whitelistUsernames]
    );
    const whitelistPhoneCount = useMemo(
        () => whitelistPhones.split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean).length,
        [whitelistPhones]
    );

    const updatePlan = (index, field, value) => {
        setPlans((current) => current.map((plan, i) => (
            i === index ? { ...plan, [field]: value } : plan
        )));
    };

    const addPlan = () => setPlans((current) => [...current, emptyPlan()]);
    const removePlan = (index) => setPlans((current) => current.filter((_, i) => i !== index));
    const resetDefaultPlans = () => {
        setPlans(defaultPlans.map((plan) => ({ ...plan, price: String(plan.price ?? '') })));
    };

    const copyLandingOrderUrl = async () => {
        try {
            await navigator.clipboard.writeText(landingOrderUrl);
            showToast('URL formulir pesanan disalin ke clipboard.', 'success');
        } catch {
            showToast('Gagal menyalin URL.', 'error');
        }
    };

    const copyText = async (text, successMessage) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast(successMessage, 'success');
        } catch {
            showToast('Gagal menyalin teks.', 'error');
        }
    };

    const generateDemoLink = async (customerId) => {
        setGeneratingLinkFor(customerId);
        try {
            const response = await fetch('/admin/vps/demo-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ customer_id: customerId }),
            });
            const data = await response.json();
            if (!response.ok || !data.ok) {
                showToast(data.message || 'Gagal membuat link demo.', 'error');
                return;
            }
            await copyText(
                data.url,
                `Link demo ${data.customer_name} disalin (berlaku ${data.expires_in_days} hari).`
            );
        } catch {
            showToast('Gagal membuat link demo.', 'error');
        } finally {
            setGeneratingLinkFor(null);
        }
    };

    const demoEmailTemplate = useMemo(() => {
        const orderUrl = landingOrderUrl || `${window.location.origin}/#pesan`;
        return [
            'Halo Tim Reviewer,',
            '',
            'Berikut akses demo untuk verifikasi transaksi layanan VPS kami:',
            '',
            `Formulir pesanan di beranda: ${orderUrl}`,
            '',
            'Buka link di atas, isi data, pilih paket layanan, lalu lanjut ke halaman pembayaran gateway.',
            '',
            'Opsional — link akses portal demo (jika ingin melihat dashboard pelanggan): [SALIN DARI ADMIN — tombol "Salin Link Demo"]',
            '',
            `Terima kasih.`,
        ].join('\n');
    }, [landingOrderUrl]);

    const handleSave = (e) => {
        e.preventDefault();
        setIsSaving(true);

        router.post('/admin/vps/save', {
            vps: {
                enabled: enabled ? '1' : '0',
                page_title: pageTitle,
                page_description: pageDescription,
                whitelist_usernames: whitelistUsernames,
                whitelist_phones: whitelistPhones,
                demo_link_days: parseInt(demoLinkDays, 10) || 30,
                plans: plans.map((plan) => ({
                    ...plan,
                    price: parseInt(plan.price, 10) || 0,
                    featured: !!plan.featured,
                })),
            },
        }, {
            preserveScroll: true,
            onSuccess: () => showToast('Pengaturan layanan VPS berhasil disimpan.', 'success'),
            onError: (errors) => {
                const messages = Object.values(errors).flat().filter(Boolean);
                showToast(messages[0] || 'Gagal menyimpan pengaturan VPS.', 'error');
            },
            onFinish: () => setIsSaving(false),
        });
    };

    const sections = [
        { id: 'general', label: 'Katalog & Status', icon: Globe },
        { id: 'access', label: 'Whitelist Akses', icon: ShieldCheck },
        { id: 'plans', label: 'Paket VPS', icon: Layers },
    ];

    return (
        <form onSubmit={handleSave} className="space-y-6">
            {/* Premium hero strip */}
            <div className={`relative overflow-hidden rounded-2xl border ${themeCard}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/15 via-indigo-500/5 to-transparent pointer-events-none" />
                <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

                <div className="relative p-5 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        <div className="flex items-start gap-4 min-w-0">
                            <div className="p-3 rounded-2xl bg-violet-500/15 border border-violet-500/25 text-violet-500 shrink-0">
                                <Server className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <h1 className={`text-lg sm:text-xl font-extrabold tracking-tight ${themeTextTitle}`}>
                                        Katalog VPS (produk mWiFi)
                                    </h1>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                                        enabled
                                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/25'
                                            : 'bg-zinc-500/15 text-zinc-500 border border-zinc-500/25'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-emerald-400' : 'bg-zinc-400'}`} />
                                        {enabled ? 'Publik Aktif' : 'Nonaktif'}
                                    </span>
                                </div>
                                <p className={`text-xs sm:text-sm leading-relaxed max-w-2xl ${themeTextDesc}`}>
                                    Katalog produk SaaS mWiFi (bukan operasional ISP harian). Showcase layanan cloud untuk
                                    verifikasi Midtrans; checkout dibatasi ke pelanggan terpilih.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={copyLandingOrderUrl}
                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border ${themeInnerWidget} ${themeTextSub} hover:opacity-90 transition-opacity`}
                            >
                                <Copy className="w-3.5 h-3.5" />
                                Salin URL
                            </button>
                            <a
                                href={landingOrderUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 transition-colors"
                            >
                                Lihat Formulir
                                <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                        {[
                            { label: 'Status', value: enabled ? 'Online' : 'Offline', accent: enabled ? 'text-emerald-500' : themeTextSub },
                            { label: 'Paket Aktif', value: String(plans.length), accent: 'text-violet-500' },
                            { label: 'Whitelist User', value: String(whitelistUsernameCount), accent: 'text-sky-500' },
                            { label: 'Whitelist WA', value: String(whitelistPhoneCount), accent: 'text-indigo-500' },
                        ].map((stat) => (
                            <div key={stat.label} className={`rounded-xl border px-3 py-2.5 ${themeInnerWidget}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${themeTextDesc}`}>{stat.label}</p>
                                <p className={`text-lg font-extrabold mt-0.5 ${stat.accent}`}>{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Section nav */}
            <div className={`flex flex-wrap gap-2 p-1.5 rounded-2xl border ${themeCard}`}>
                {sections.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setActiveSection(id)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeSection === id
                                ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                                : `${themeTextSub} hover:bg-zinc-500/10`
                        }`}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            <div className="grid xl:grid-cols-[1fr_320px] gap-6 items-start">
                <div className="space-y-6 min-w-0">
                    {activeSection === 'general' && (
                        <AdminPageCard
                            icon={Globe}
                            title="Pengaturan Verifikasi VPS"
                            description="Paket layanan, whitelist pelanggan demo, dan status fitur verifikasi gateway."
                            accent="violet"
                            themeCard={themeCard}
                            isDarkMode={isDarkMode}
                            themeTextTitle={themeTextTitle}
                            themeTextDesc={themeTextDesc}
                        >
                            <div className={`rounded-xl border p-4 ${themeInnerWidget}`}>
                                <ToggleSwitch
                                    checked={enabled}
                                    onChange={setEnabled}
                                    label="Aktifkan fitur verifikasi VPS"
                                    description="Jika nonaktif, checkout VPS dari portal demo dan formulir beranda tidak tersedia."
                                />
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-xs font-bold mb-1.5 ${themeLabel}`}>Judul Halaman</label>
                                    <input
                                        type="text"
                                        value={pageTitle}
                                        onChange={(e) => setPageTitle(e.target.value)}
                                        className={`w-full rounded-xl px-3 py-2.5 text-sm border ${themeInput}`}
                                        placeholder="Sewa VPS Cloud Indonesia"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-xs font-bold mb-1.5 ${themeLabel}`}>URL Formulir Pesanan</label>
                                    <div className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-mono ${themeInnerWidget} ${themeTextSub}`}>
                                        <span className="truncate flex-1">{landingOrderUrl}</span>
                                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0 opacity-50" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className={`block text-xs font-bold mb-1.5 ${themeLabel}`}>Deskripsi Hero</label>
                                <textarea
                                    rows={3}
                                    value={pageDescription}
                                    onChange={(e) => setPageDescription(e.target.value)}
                                    className={`w-full rounded-xl px-3 py-2.5 text-sm border resize-y ${themeInput}`}
                                    placeholder="Deskripsi singkat layanan VPS untuk bagian atas halaman publik."
                                />
                            </div>
                        </AdminPageCard>
                    )}

                    {activeSection === 'access' && (
                        <AdminPageCard
                            icon={ShieldCheck}
                            title="Whitelist Pelanggan"
                            description="Hanya identitas berikut yang dapat melakukan checkout dari halaman VPS."
                            accent="indigo"
                            themeCard={themeCard}
                            isDarkMode={isDarkMode}
                            themeTextTitle={themeTextTitle}
                            themeTextDesc={themeTextDesc}
                        >
                            <div className={`flex items-start gap-3 rounded-xl border p-4 text-xs leading-relaxed ${themeInnerWidget} ${themeTextSub}`}>
                                <UserCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className={`font-bold ${themeTextTitle}`}>Aturan pencocokan</p>
                                    <p className="mt-1 opacity-80">
                                        Pelanggan dapat mengakses portal VPS dan checkout katalog jika <strong>username</strong>{' '}
                                        <strong>atau</strong> nomor <strong>WhatsApp</strong> cocok dengan whitelist.
                                    </p>
                                    <p className="mt-2 opacity-80 text-amber-600 dark:text-amber-400 font-semibold">
                                        Penting: whitelist VPS tidak membuat akun otomatis. Pelanggan harus sudah terdaftar
                                        di Pelanggan PPPoE. Untuk username seperti <code className="font-mono">midtrans@demo</code>,
                                        cukup isi whitelist dengan <code className="font-mono">midtrans</code> atau nama lengkap.
                                    </p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-xs font-bold mb-1.5 ${themeLabel}`}>
                                        Username Layanan
                                        <span className={`ml-1 font-normal ${themeTextDesc}`}>(satu per baris)</span>
                                    </label>
                                    <textarea
                                        rows={7}
                                        value={whitelistUsernames}
                                        onChange={(e) => setWhitelistUsernames(e.target.value)}
                                        placeholder={'demo-vps\ntestuser01'}
                                        className={`w-full rounded-xl px-3 py-2.5 text-sm font-mono border ${themeInput}`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-xs font-bold mb-1.5 ${themeLabel}`}>
                                        Nomor WhatsApp
                                        <span className={`ml-1 font-normal ${themeTextDesc}`}>(satu per baris)</span>
                                    </label>
                                    <textarea
                                        rows={7}
                                        value={whitelistPhones}
                                        onChange={(e) => setWhitelistPhones(e.target.value)}
                                        placeholder={'6281234567890\n081234567890'}
                                        className={`w-full rounded-xl px-3 py-2.5 text-sm font-mono border ${themeInput}`}
                                    />
                                </div>
                            </div>

                            <div className={`rounded-xl border p-4 space-y-4 ${themeInnerWidget}`}>
                                <div className="flex items-start gap-3">
                                    <Link2 className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className={`font-bold text-sm ${themeTextTitle}`}>Link Akses Opsional (Tim Reviewer)</p>
                                        <p className={`mt-1 text-xs leading-relaxed ${themeTextSub}`}>
                                            Verifikasi pembayaran dapat dilakukan lewat formulir pesanan di beranda atau portal
                                            pelanggan demo. Link bertanda tangan di bawah opsional — berguna jika reviewer ingin
                                            melihat dashboard pelanggan demo tanpa OTP.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-[160px_1fr] gap-4 items-end">
                                    <div>
                                        <label className={`block text-xs font-bold mb-1.5 ${themeLabel}`}>
                                            Masa berlaku link
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min={1}
                                                max={90}
                                                value={demoLinkDays}
                                                onChange={(e) => setDemoLinkDays(e.target.value)}
                                                className={`w-full rounded-xl px-3 py-2.5 text-sm border ${themeInput}`}
                                            />
                                            <span className={`text-xs font-bold shrink-0 ${themeTextSub}`}>hari</span>
                                        </div>
                                    </div>
                                    <p className={`text-[11px] leading-relaxed ${themeTextDesc}`}>
                                        Default 30 hari (cukup untuk balasan email 1–2 minggu). Simpan pengaturan setelah mengubah nilai ini.
                                    </p>
                                </div>

                                {showcaseCustomers.length === 0 ? (
                                    <p className={`text-xs ${themeTextDesc}`}>
                                        Belum ada pelanggan yang cocok dengan whitelist. Pastikan akun sudah ada di Pelanggan PPPoE,
                                        lalu simpan whitelist di atas.
                                    </p>
                                ) : (
                                    <div className="space-y-2">
                                        {showcaseCustomers.map((customer) => (
                                            <div
                                                key={customer.id}
                                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border px-3 py-3 ${themeCard}`}
                                            >
                                                <div className="min-w-0">
                                                    <p className={`text-sm font-bold truncate ${themeTextTitle}`}>{customer.name}</p>
                                                    <p className={`text-[11px] font-mono mt-0.5 ${themeTextDesc}`}>
                                                        {customer.username}
                                                        {customer.phone_masked ? ` · ${customer.phone_masked}` : ''}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => generateDemoLink(customer.id)}
                                                    disabled={generatingLinkFor === customer.id}
                                                    className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white shrink-0"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                    {generatingLinkFor === customer.id ? 'Membuat...' : 'Salin Link Demo'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="pt-1 border-t border-dashed border-zinc-500/20">
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                        <p className={`text-xs font-bold ${themeTextTitle}`}>Template email ke Midtrans</p>
                                        <button
                                            type="button"
                                            onClick={() => copyText(demoEmailTemplate, 'Template email disalin. Tempel link demo di baris yang ditandai.')}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border ${themeInnerWidget} ${themeTextSub}`}
                                        >
                                            <Mail className="w-3.5 h-3.5" />
                                            Salin template
                                        </button>
                                    </div>
                                    <pre className={`text-[10px] leading-relaxed whitespace-pre-wrap font-sans rounded-xl border p-3 max-h-40 overflow-y-auto ${themeInnerWidget} ${themeTextSub}`}>
                                        {demoEmailTemplate}
                                    </pre>
                                </div>
                            </div>
                        </AdminPageCard>
                    )}

                    {activeSection === 'plans' && (
                        <AdminPageCard
                            icon={Layers}
                            title="Paket VPS"
                            description="Spesifikasi dan harga yang dikirim ke payment gateway sebagai item transaksi (Midtrans/Duitku)."
                            accent="violet"
                            themeCard={themeCard}
                            isDarkMode={isDarkMode}
                            themeTextTitle={themeTextTitle}
                            themeTextDesc={themeTextDesc}
                            actions={(
                                <>
                                    <button
                                        type="button"
                                        onClick={resetDefaultPlans}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${themeInnerWidget} ${themeTextSub}`}
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={addPlan}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Tambah
                                    </button>
                                </>
                            )}
                        >
                            <div className="space-y-4">
                                {plans.map((plan, index) => (
                                    <PremiumPanel
                                        key={`plan-${index}`}
                                        accent={plan.featured ? 'violet' : 'indigo'}
                                        themeCard={themeCard}
                                        isDarkMode={isDarkMode}
                                        bodyClassName="p-4 space-y-4"
                                    >
                                        <PremiumPanelHeader
                                            icon={plan.featured ? Crown : Server}
                                            accent={plan.featured ? 'violet' : 'indigo'}
                                            isDarkMode={isDarkMode}
                                            themeTextTitle={themeTextTitle}
                                            themeTextDesc={themeTextDesc}
                                            title={plan.name || `Paket #${index + 1}`}
                                            subtitle={plan.id ? `ID: ${plan.id}` : 'Slug akan dibuat otomatis dari nama'}
                                            trailing={(
                                                <button
                                                    type="button"
                                                    onClick={() => removePlan(index)}
                                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                                                    title="Hapus paket"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        />

                                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {[
                                                ['name', 'Nama Paket', 'text', 'VPS Business'],
                                                ['id', 'Slug ID', 'text', 'business'],
                                                ['price', 'Harga / bulan (Rp)', 'number', '199000'],
                                                ['cpu', 'CPU', 'text', '2 vCPU'],
                                                ['ram', 'RAM', 'text', '4 GB RAM'],
                                                ['storage', 'Storage', 'text', '80 GB SSD NVMe'],
                                                ['bandwidth', 'Bandwidth', 'text', '2 TB / bulan'],
                                            ].map(([field, label, type, placeholder]) => (
                                                <div key={field} className={field === 'bandwidth' ? 'sm:col-span-2 lg:col-span-1' : ''}>
                                                    <label className={`block text-[10px] font-bold mb-1 ${themeLabel}`}>{label}</label>
                                                    <input
                                                        type={type}
                                                        min={type === 'number' ? '1000' : undefined}
                                                        value={plan[field]}
                                                        onChange={(e) => updatePlan(index, field, e.target.value)}
                                                        placeholder={placeholder}
                                                        className={`w-full rounded-lg px-2.5 py-2 text-sm border ${field === 'id' ? 'font-mono' : ''} ${themeInput}`}
                                                    />
                                                </div>
                                            ))}
                                            <div className="sm:col-span-2 lg:col-span-3">
                                                <label className={`block text-[10px] font-bold mb-1 ${themeLabel}`}>Deskripsi</label>
                                                <input
                                                    type="text"
                                                    value={plan.description}
                                                    onChange={(e) => updatePlan(index, 'description', e.target.value)}
                                                    className={`w-full rounded-lg px-2.5 py-2 text-sm border ${themeInput}`}
                                                />
                                            </div>
                                            <label className={`flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 ${themeInnerWidget}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!plan.featured}
                                                    onChange={(e) => updatePlan(index, 'featured', e.target.checked)}
                                                    className="rounded border-zinc-500 text-violet-600 focus:ring-violet-500"
                                                />
                                                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                                                <span className={`text-xs font-semibold ${themeTextSub}`}>Tandai sebagai paket unggulan</span>
                                            </label>
                                        </div>
                                    </PremiumPanel>
                                ))}
                            </div>
                        </AdminPageCard>
                    )}
                </div>

                {/* Live preview sidebar */}
                <aside className="xl:sticky xl:top-4 space-y-4">
                    <PremiumPanel accent="violet" themeCard={themeCard} isDarkMode={isDarkMode} bodyClassName="p-4 space-y-4">
                        <PremiumPanelHeader
                            icon={Sparkles}
                            accent="violet"
                            isDarkMode={isDarkMode}
                            themeTextTitle={themeTextTitle}
                            themeTextDesc={themeTextDesc}
                            title="Pratinjau Katalog"
                            subtitle="Perubahan tampil setelah disimpan & halaman di-refresh"
                        />

                        <div className={`rounded-xl border p-3 space-y-2 ${themeInnerWidget}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-widest text-violet-500`}>Hero</p>
                            <p className={`text-sm font-bold leading-snug ${themeTextTitle}`}>{pageTitle || 'Judul halaman'}</p>
                            <p className={`text-[11px] leading-relaxed line-clamp-3 ${themeTextDesc}`}>
                                {pageDescription || 'Deskripsi halaman akan tampil di sini.'}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${themeTextDesc}`}>
                                Kartu Paket ({plans.length})
                            </p>
                            {plans.slice(0, 3).map((plan, index) => (
                                <PlanPreviewCard key={`preview-${index}`} plan={plan} isDarkMode={isDarkMode} />
                            ))}
                            {plans.length > 3 && (
                                <p className={`text-[10px] text-center ${themeTextDesc}`}>+{plans.length - 3} paket lainnya</p>
                            )}
                        </div>
                    </PremiumPanel>
                </aside>
            </div>

            {/* Save bar — sticky dalam panel konten, tidak menutupi sidebar */}
            <div className={`-mx-4 sm:-mx-6 sticky bottom-0 z-20 border-t backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between gap-4 ${
                isDarkMode ? 'bg-zinc-950/90 border-zinc-800' : 'bg-white/95 border-zinc-200'
            }`}>
                <p className={`text-xs hidden sm:block ${themeTextDesc}`}>
                    Perubahan disimpan ke database dan langsung memengaruhi halaman publik.
                </p>
                <button
                    type="submit"
                    disabled={isSaving}
                    className="ml-auto inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white font-bold text-sm shadow-lg shadow-violet-500/25 transition-all"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
            </div>
        </form>
    );
}

export default function VpsServiceIndex(props) {
    return (
        <AdminLayout title="Katalog VPS">
            <VpsServicePageContent {...props} />
        </AdminLayout>
    );
}
