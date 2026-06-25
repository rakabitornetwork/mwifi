import { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    ExternalLink,
    Plus,
    Save,
    Server,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import AdminPageCard from '../../../Components/Admin/AdminPageCard';
import { useAdminFormTheme } from '../../../hooks/useAdminFormTheme';

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

function VpsServicePageContent({ config = {}, catalogUrl = '', defaultPlans = [] }) {
    const { showToast } = useAdminToast();
    const {
        themeCard,
        themeTextTitle,
        themeTextSub,
        themeTextDesc,
        themeInput,
        themeLabel,
    } = useAdminFormTheme();

    const [enabled, setEnabled] = useState(config.enabled ?? false);
    const [pageTitle, setPageTitle] = useState(config.page_title || 'Sewa VPS Cloud Indonesia');
    const [pageDescription, setPageDescription] = useState(config.page_description || '');
    const [whitelistUsernames, setWhitelistUsernames] = useState(config.whitelist_usernames || '');
    const [whitelistPhones, setWhitelistPhones] = useState(config.whitelist_phones || '');
    const [plans, setPlans] = useState(
        (config.plans?.length ? config.plans : defaultPlans).map((plan) => ({
            ...plan,
            price: String(plan.price ?? ''),
        }))
    );
    const [isSaving, setIsSaving] = useState(false);

    const updatePlan = (index, field, value) => {
        setPlans((current) => current.map((plan, i) => (
            i === index ? { ...plan, [field]: value } : plan
        )));
    };

    const addPlan = () => {
        setPlans((current) => [...current, emptyPlan()]);
    };

    const removePlan = (index) => {
        setPlans((current) => current.filter((_, i) => i !== index));
    };

    const resetDefaultPlans = () => {
        setPlans(defaultPlans.map((plan) => ({ ...plan, price: String(plan.price ?? '') })));
    };

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

    return (
        <form onSubmit={handleSave} className="space-y-6">
            <AdminPageCard
                title="Layanan Sewa VPS (Showcase)"
                subtitle="Halaman katalog publik untuk verifikasi Midtrans. Hanya pelanggan pada whitelist yang dapat checkout."
                icon={Server}
            >
                <div className="space-y-5">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                            className="mt-1 rounded border-zinc-600 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>
                            <span className={`block font-bold text-sm ${themeTextTitle}`}>Aktifkan halaman katalog VPS</span>
                            <span className={`block text-xs mt-0.5 ${themeTextDesc}`}>
                                URL publik:{' '}
                                <a href={catalogUrl} target="_blank" rel="noreferrer" className="text-emerald-500 hover:underline inline-flex items-center gap-1">
                                    {catalogUrl}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </span>
                        </span>
                    </label>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className={`block text-xs font-bold mb-1.5 ${themeLabel}`}>Judul Halaman</label>
                            <input
                                type="text"
                                value={pageTitle}
                                onChange={(e) => setPageTitle(e.target.value)}
                                className={`w-full rounded-xl px-3 py-2 text-sm ${themeInput}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-bold mb-1.5 ${themeLabel}`}>Deskripsi Singkat</label>
                            <input
                                type="text"
                                value={pageDescription}
                                onChange={(e) => setPageDescription(e.target.value)}
                                className={`w-full rounded-xl px-3 py-2 text-sm ${themeInput}`}
                            />
                        </div>
                    </div>
                </div>
            </AdminPageCard>

            <AdminPageCard
                title="Whitelist Pelanggan"
                subtitle="Hanya username dan nomor WhatsApp ini yang dapat memesan dari halaman VPS."
                icon={ShieldCheck}
            >
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className={`block text-xs font-bold mb-1.5 ${themeLabel}`}>Username Layanan (satu per baris)</label>
                        <textarea
                            rows={5}
                            value={whitelistUsernames}
                            onChange={(e) => setWhitelistUsernames(e.target.value)}
                            placeholder={'contoh:\ndemo-vps\ntestuser01'}
                            className={`w-full rounded-xl px-3 py-2 text-sm font-mono ${themeInput}`}
                        />
                        <p className={`text-[10px] mt-1 ${themeTextDesc}`}>Kosongkan jika hanya ingin filter berdasarkan nomor WhatsApp.</p>
                    </div>
                    <div>
                        <label className={`block text-xs font-bold mb-1.5 ${themeLabel}`}>Nomor WhatsApp (satu per baris)</label>
                        <textarea
                            rows={5}
                            value={whitelistPhones}
                            onChange={(e) => setWhitelistPhones(e.target.value)}
                            placeholder={'contoh:\n6281234567890\n081234567890'}
                            className={`w-full rounded-xl px-3 py-2 text-sm font-mono ${themeInput}`}
                        />
                        <p className={`text-[10px] mt-1 ${themeTextDesc}`}>
                            Jika username dan nomor keduanya diisi, pelanggan harus cocok keduanya.
                        </p>
                    </div>
                </div>
            </AdminPageCard>

            <AdminPageCard
                title="Paket VPS"
                subtitle="Daftar paket fiktif yang ditampilkan di halaman publik dan dikirim ke Midtrans sebagai item_details."
                icon={Server}
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={addPlan}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Tambah Paket
                        </button>
                        <button
                            type="button"
                            onClick={resetDefaultPlans}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${themeCard}`}
                        >
                            Reset Default
                        </button>
                    </div>

                    {plans.map((plan, index) => (
                        <div key={`plan-${index}`} className={`rounded-xl border p-4 space-y-3 ${themeCard}`}>
                            <div className="flex items-center justify-between gap-2">
                                <h3 className={`text-sm font-bold ${themeTextTitle}`}>Paket #{index + 1}</h3>
                                <button
                                    type="button"
                                    onClick={() => removePlan(index)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"
                                    title="Hapus paket"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                <div>
                                    <label className={`block text-[10px] font-bold mb-1 ${themeLabel}`}>Nama Paket</label>
                                    <input type="text" value={plan.name} onChange={(e) => updatePlan(index, 'name', e.target.value)} className={`w-full rounded-lg px-2.5 py-1.5 text-sm ${themeInput}`} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-bold mb-1 ${themeLabel}`}>Slug ID</label>
                                    <input type="text" value={plan.id} onChange={(e) => updatePlan(index, 'id', e.target.value)} placeholder="auto dari nama" className={`w-full rounded-lg px-2.5 py-1.5 text-sm font-mono ${themeInput}`} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-bold mb-1 ${themeLabel}`}>Harga / bulan (Rp)</label>
                                    <input type="number" min="1000" value={plan.price} onChange={(e) => updatePlan(index, 'price', e.target.value)} className={`w-full rounded-lg px-2.5 py-1.5 text-sm ${themeInput}`} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-bold mb-1 ${themeLabel}`}>CPU</label>
                                    <input type="text" value={plan.cpu} onChange={(e) => updatePlan(index, 'cpu', e.target.value)} className={`w-full rounded-lg px-2.5 py-1.5 text-sm ${themeInput}`} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-bold mb-1 ${themeLabel}`}>RAM</label>
                                    <input type="text" value={plan.ram} onChange={(e) => updatePlan(index, 'ram', e.target.value)} className={`w-full rounded-lg px-2.5 py-1.5 text-sm ${themeInput}`} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-bold mb-1 ${themeLabel}`}>Storage</label>
                                    <input type="text" value={plan.storage} onChange={(e) => updatePlan(index, 'storage', e.target.value)} className={`w-full rounded-lg px-2.5 py-1.5 text-sm ${themeInput}`} />
                                </div>
                                <div>
                                    <label className={`block text-[10px] font-bold mb-1 ${themeLabel}`}>Bandwidth</label>
                                    <input type="text" value={plan.bandwidth} onChange={(e) => updatePlan(index, 'bandwidth', e.target.value)} className={`w-full rounded-lg px-2.5 py-1.5 text-sm ${themeInput}`} />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={`block text-[10px] font-bold mb-1 ${themeLabel}`}>Deskripsi</label>
                                    <input type="text" value={plan.description} onChange={(e) => updatePlan(index, 'description', e.target.value)} className={`w-full rounded-lg px-2.5 py-1.5 text-sm ${themeInput}`} />
                                </div>
                                <label className="flex items-center gap-2 self-end pb-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={!!plan.featured}
                                        onChange={(e) => updatePlan(index, 'featured', e.target.checked)}
                                        className="rounded border-zinc-600 text-emerald-600"
                                    />
                                    <span className={`text-xs font-medium ${themeTextSub}`}>Paket unggulan</span>
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            </AdminPageCard>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold text-sm shadow-sm"
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
        <AdminLayout title="Layanan VPS">
            <VpsServicePageContent {...props} />
        </AdminLayout>
    );
}
