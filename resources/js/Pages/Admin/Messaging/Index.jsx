import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { MessageSquare, Save } from 'lucide-react';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import SettingsSectionCard from '../../../Components/Admin/SettingsSectionCard';
import { useAdminFormTheme } from '../../../hooks/useAdminFormTheme';
import WhatsAppBrandIcon from '../../../Components/Icons/WhatsAppBrandIcon';
import TelegramBrandIcon from '../../../Components/Icons/TelegramBrandIcon';
import WhatsAppGatewayPanel from '../../../Components/Admin/Messaging/WhatsAppGatewayPanel';
import WhatsAppTemplatesPanel from '../../../Components/Admin/Messaging/WhatsAppTemplatesPanel';

function MessagingPageContent({
    settings = [],
    billingAdminPhone = '',
    templateDefinitions = {},
    templateDefaults = {},
}) {
    const { branding = {} } = usePage().props;
    const { showToast } = useAdminToast();
    const {
        isDarkMode,
        themeCard,
        themeTextTitle,
        themeTextSub,
        themeTextDesc,
        themeInput,
        themeLabel,
    } = useAdminFormTheme();

    const [messagingSubTab, setMessagingSubTab] = useState('gateway');

    const settingsMap = {};
    settings.forEach((s) => {
        settingsMap[s.key] = s.value;
    });

    const companyName = branding.company_name || branding.display_name || branding.app_name || 'mWiFi';

    const handleSaveMessaging = (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const whatsappEnabledCheckbox = form.querySelector('input[name="whatsapp_enabled_ui"]');
        formData.set('whatsapp[enabled]', whatsappEnabledCheckbox?.checked ? '1' : '0');

        const whatsappBulkDelayCheckbox = form.querySelector('input[name="whatsapp_bulk_delay_enabled_ui"]');
        formData.set('whatsapp[bulk_delay_enabled]', whatsappBulkDelayCheckbox?.checked ? '1' : '0');

        const bulkBatchSizeInput = form.querySelector('input[name="whatsapp_bulk_batch_size_ui"]');
        const bulkWindowMinutesInput = form.querySelector('input[name="whatsapp_bulk_window_minutes_ui"]');
        const minutesToStoredSeconds = (minutes, { minSeconds = 6, maxSeconds = 7200 } = {}) => {
            const parsed = parseFloat(minutes);
            const seconds = Math.round((Number.isFinite(parsed) ? parsed : 0) * 60);

            return String(Math.min(maxSeconds, Math.max(minSeconds, seconds)));
        };

        formData.set(
            'whatsapp[bulk_batch_size]',
            String(Math.min(100, Math.max(1, parseInt(bulkBatchSizeInput?.value, 10) || 5)))
        );
        formData.set('whatsapp[bulk_window_seconds]', minutesToStoredSeconds(bulkWindowMinutesInput?.value, { minSeconds: 6 }));

        router.post('/admin/messaging/save', formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => router.reload(),
            onError: (errors) => {
                const messages = Object.values(errors).flat().filter(Boolean);
                showToast(messages[0] || 'Gagal menyimpan pengaturan pesan.', 'error');
            },
        });
    };

    const subTabClass = (tab) => {
        const active = messagingSubTab === tab;
        if (active) {
            return isDarkMode
                ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-violet-500/20 text-violet-200 border border-violet-500/30 cursor-pointer'
                : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-violet-100 text-violet-800 border border-violet-200 cursor-pointer';
        }

        return isDarkMode
            ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer'
            : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 cursor-pointer';
    };

    return (
        <form onSubmit={handleSaveMessaging} className="max-w-3xl mx-auto space-y-4 pb-2">
            <SettingsSectionCard
                icon={MessageSquare}
                accent="violet"
                title="WhatsApp & Telegram"
                description="Atur gateway WhatsApp terlebih dahulu, lalu sesuaikan template pesan. Tab Telegram menyusul."
                themeCard={themeCard}
                isDarkMode={isDarkMode}
                themeTextTitle={themeTextTitle}
                themeTextSub={themeTextSub}
            >
                <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setMessagingSubTab('gateway')} className={subTabClass('gateway')}>
                        <WhatsAppBrandIcon className="w-3.5 h-3.5 shrink-0 text-[#25D366]" />
                        Gateway WhatsApp
                    </button>
                    <button type="button" onClick={() => setMessagingSubTab('templates')} className={subTabClass('templates')}>
                        <WhatsAppBrandIcon className="w-3.5 h-3.5 shrink-0 text-[#25D366]" />
                        Template WhatsApp
                    </button>
                    <button type="button" disabled className={`${subTabClass('telegram')} opacity-50 cursor-not-allowed`} title="Segera hadir">
                        <TelegramBrandIcon className="w-3.5 h-3.5 shrink-0 text-[#229ED9]" />
                        Telegram
                    </button>
                </div>
            </SettingsSectionCard>

            {messagingSubTab === 'gateway' && (
                <WhatsAppGatewayPanel
                    settingsMap={settingsMap}
                    companyName={companyName}
                    billingAdminPhone={billingAdminPhone}
                    themeCard={themeCard}
                    themeInput={themeInput}
                    themeLabel={themeLabel}
                    themeTextTitle={themeTextTitle}
                    themeTextSub={themeTextSub}
                    themeTextDesc={themeTextDesc}
                    isDarkMode={isDarkMode}
                    showToast={showToast}
                />
            )}

            {messagingSubTab === 'templates' && (
                <WhatsAppTemplatesPanel
                    templateDefinitions={templateDefinitions}
                    templateDefaults={templateDefaults}
                    settingsMap={settingsMap}
                    themeInput={themeInput}
                    themeLabel={themeLabel}
                    themeTextTitle={themeTextTitle}
                    themeTextSub={themeTextSub}
                    themeTextDesc={themeTextDesc}
                    themeCard={themeCard}
                    isDarkMode={isDarkMode}
                    showToast={showToast}
                />
            )}

            {messagingSubTab === 'telegram' && (
                <SettingsSectionCard
                    icon={TelegramBrandIcon}
                    accent="sky"
                    title="Telegram — Segera hadir"
                    description="Pengaturan bot Telegram akan ditambahkan di halaman ini."
                    themeCard={themeCard}
                    isDarkMode={isDarkMode}
                    themeTextTitle={themeTextTitle}
                    themeTextSub={themeTextSub}
                />
            )}

            {(messagingSubTab === 'templates' || messagingSubTab === 'gateway') && (
                <div className="flex justify-end">
                    <button
                        type="submit"
                        title="Simpan pengaturan pesan"
                        className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center shadow-md"
                    >
                        <Save className="w-4 h-4" />
                    </button>
                </div>
            )}
        </form>
    );
}

export default function MessagingIndex(props) {
    return (
        <AdminLayout title="WhatsApp & Telegram">
            <MessagingPageContent {...props} />
        </AdminLayout>
    );
}
