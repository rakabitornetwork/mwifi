import { useState } from 'react';
import { Eye, RotateCcw } from 'lucide-react';

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
            <div className={`${themeCard} border rounded-2xl p-4 sm:p-5`}>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Template Pesan WhatsApp</h3>
                <p className={`text-[11px] mt-1 leading-relaxed ${themeTextDesc}`}>
                    Sesuaikan format notifikasi tagihan dan pembayaran. Gunakan placeholder dalam kurung kurawal, misalnya{' '}
                    <span className="font-mono">{'{customer_name}'}</span>. Format tebal WhatsApp: <span className="font-mono">*teks*</span>.
                </p>
            </div>

            {Object.entries(templateDefinitions).map(([key, meta]) => {
                const fieldName = templateFieldName(key);
                const placeholders = meta.placeholders || [];

                return (
                    <div key={key} className={`${themeCard} border rounded-2xl p-4 sm:p-5 space-y-3`}>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div>
                                <h4 className={`text-sm font-bold ${themeTextTitle}`}>{meta.label}</h4>
                                <p className={`text-[10px] mt-0.5 ${themeTextDesc}`}>{meta.description}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
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
                        </div>

                        <textarea
                            name={`whatsapp[template][${fieldName}]`}
                            value={templateValues[key] ?? ''}
                            onChange={(e) => setTemplateValues((prev) => ({ ...prev, [key]: e.target.value }))}
                            rows={10}
                            className={`w-full p-3 border rounded-xl font-mono text-[11px] leading-relaxed resize-y min-h-[180px] ${themeInput}`}
                        />

                        <p className={`text-[10px] ${themeTextSub}`}>
                            Placeholder:{' '}
                            {placeholders.map((item) => (
                                <span key={item} className="inline-block font-mono mr-2 mb-1">
                                    {'{'}{item}{'}'}
                                </span>
                            ))}
                        </p>

                        {previews[key] && (
                            <div className={`rounded-xl border p-3 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/50' : 'border-zinc-200 bg-zinc-50'}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${themeTextSub}`}>Pratinjau</p>
                                <pre className={`text-[11px] whitespace-pre-wrap font-mono ${themeTextTitle}`}>{previews[key]}</pre>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
