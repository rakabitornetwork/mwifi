import { useState } from 'react';
import { Eye, FileText, RotateCcw, UserPlus, Receipt, Bell, Layers, ShieldOff, BadgeCheck, UserCog, HandCoins } from 'lucide-react';
import SettingsSectionCard from '../SettingsSectionCard';

const TEMPLATE_ACCENT = {
    'whatsapp.template.customer_registered': { icon: UserPlus, accent: 'emerald' },
    'whatsapp.template.invoice_new': { icon: Receipt, accent: 'indigo' },
    'whatsapp.template.invoice_unpaid': { icon: Bell, accent: 'amber' },
    'whatsapp.template.invoice_accumulated_new': { icon: Layers, accent: 'violet' },
    'whatsapp.template.invoice_accumulated': { icon: Layers, accent: 'indigo' },
    'whatsapp.template.isolation': { icon: ShieldOff, accent: 'amber' },
    'whatsapp.template.payment_reactivated': { icon: BadgeCheck, accent: 'emerald' },
    'whatsapp.template.payment_received': { icon: BadgeCheck, accent: 'sky' },
    'whatsapp.template.admin_scheduler': { icon: UserCog, accent: 'sky' },
    'whatsapp.template.staff_advance_admin': { icon: HandCoins, accent: 'amber' },
    'whatsapp.template.staff_advance_technician': { icon: HandCoins, accent: 'violet' },
};

function templateFieldName(key) {
    return key.replace('whatsapp.template.', '');
}

export default function WhatsAppTemplatesPanel({
    templateDefinitions = {},
    templateDefaults = {},
    settingsMap = {},
    themeInput,
    themeLabel,
    themeTextTitle,
    themeTextSub,
    themeTextDesc,
    themeCard,
    isDarkMode,
    showToast,
}) {
    const [previews, setPreviews] = useState({});
    const [loadingPreview, setLoadingPreview] = useState(null);
    const [templateValues, setTemplateValues] = useState(() => {
        const initial = {};
        Object.keys(templateDefinitions).forEach((key) => {
            initial[key] = settingsMap[key] ?? templateDefaults[key] ?? '';
        });
        return initial;
    });

    const handleReset = (key) => {
        setTemplateValues((prev) => ({
            ...prev,
            [key]: templateDefaults[key] ?? '',
        }));
        setPreviews((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const handlePreview = async (key) => {
        setLoadingPreview(key);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const response = await fetch('/admin/messaging/template-preview', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    key,
                    template: templateValues[key] ?? '',
                }),
            });

            const data = await response.json();
            if (!response.ok || !data.ok) {
                throw new Error(data.message || 'Gagal membuat pratinjau.');
            }

            setPreviews((prev) => ({ ...prev, [key]: data.preview }));
        } catch (error) {
            showToast(error?.message || 'Gagal membuat pratinjau template.', 'error');
        } finally {
            setLoadingPreview(null);
        }
    };

    return (
        <div className="space-y-4">
            <SettingsSectionCard
                icon={FileText}
                accent="violet"
                title="Template Pesan WhatsApp"
                description="Diurutkan mengikuti alur pelanggan: pendaftaran → tagihan → isolir → pembayaran → notifikasi admin."
                themeCard={themeCard}
                isDarkMode={isDarkMode}
                themeTextTitle={themeTextTitle}
                themeTextSub={themeTextSub}
            />

            {Object.entries(templateDefinitions).map(([key, meta], index) => {
                const fieldName = templateFieldName(key);
                const placeholders = meta.placeholders || [];
                const style = TEMPLATE_ACCENT[key] || { icon: FileText, accent: 'indigo' };
                const TemplateIcon = style.icon;

                return (
                    <SettingsSectionCard
                        key={key}
                        icon={TemplateIcon}
                        accent={style.accent}
                        title={`${index + 1}. ${meta.label}`}
                        description={meta.description}
                        themeCard={themeCard}
                        isDarkMode={isDarkMode}
                        themeTextTitle={themeTextTitle}
                        themeTextSub={themeTextSub}
                    >
                        <div className="flex justify-end gap-2 shrink-0 -mt-1">
                                <button
                                    type="button"
                                    onClick={() => handlePreview(key)}
                                    disabled={loadingPreview === key}
                                    title="Pratinjau dengan data contoh"
                                    className="p-2 rounded-lg border border-violet-300/60 text-violet-700 hover:bg-violet-50 dark:border-violet-500/30 dark:text-violet-200 dark:hover:bg-violet-500/10 cursor-pointer disabled:opacity-50"
                                >
                                    <Eye className={`w-4 h-4 ${loadingPreview === key ? 'animate-pulse' : ''}`} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleReset(key)}
                                    title="Kembalikan ke default"
                                    className="p-2 rounded-lg border border-zinc-300/60 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                        </div>

                        <textarea
                            name={`whatsapp[template][${fieldName}]`}
                            value={templateValues[key] ?? ''}
                            onChange={(e) => setTemplateValues((prev) => ({ ...prev, [key]: e.target.value }))}
                            rows={10}
                            className={`w-full p-3 border rounded-xl font-mono text-[11px] leading-relaxed resize-y min-h-[180px] ${themeInput}`}
                        />

                        <div className="space-y-2">
                            {meta.placeholder_groups ? (
                                Object.entries(meta.placeholder_groups).map(([groupLabel, groupPlaceholders]) => (
                                    <div key={groupLabel}>
                                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${themeTextSub}`}>
                                            {groupLabel}
                                        </p>
                                        <p className={`text-[10px] ${themeTextSub}`}>
                                            {groupPlaceholders.map((item) => (
                                                <span key={item} className="inline-block font-mono mr-2 mb-1">
                                                    {'{'}{item}{'}'}
                                                </span>
                                            ))}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <p className={`text-[10px] ${themeTextSub}`}>
                                    Placeholder:{' '}
                                    {placeholders.map((item) => (
                                        <span key={item} className="inline-block font-mono mr-2 mb-1">
                                            {'{'}{item}{'}'}
                                        </span>
                                    ))}
                                </p>
                            )}
                        </div>

                        {previews[key] && (
                            <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-200 bg-zinc-50'}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${themeTextSub}`}>Pratinjau</p>
                                <pre className={`text-[11px] whitespace-pre-wrap font-mono ${themeTextTitle}`}>{previews[key]}</pre>
                            </div>
                        )}
                    </SettingsSectionCard>
                );
            })}
        </div>
    );
}
