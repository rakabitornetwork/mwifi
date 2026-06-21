import { useCallback, useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import {
    Building2,
    Copyright,
    FileText,
    Globe,
    Image as ImageIcon,
    Mail,
    MapPin,
    Phone,
    MessageSquare,
    QrCode,
    Receipt,
    RefreshCw,
    Save,
    ShieldOff,
} from 'lucide-react';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import BrandingFileUpload from '../../../Components/Admin/BrandingFileUpload';
import { useAdminFormTheme } from '../../../hooks/useAdminFormTheme';

function SettingsPageContent({ settings = [], routers = [] }) {
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

    const [isolirRouterId, setIsolirRouterId] = useState('');
    const [isolirPppProfiles, setIsolirPppProfiles] = useState([]);
    const [isLoadingIsolirProfiles, setIsLoadingIsolirProfiles] = useState(false);
    const [selectedIsolirProfile, setSelectedIsolirProfile] = useState('');

    const settingsMap = {};
    settings.forEach((s) => {
        settingsMap[s.key] = s.value;
    });

    const storedTaxRate = parseFloat(settingsMap['system.tax_rate'] || '0') || 0;
    const taxEnabledDefault = storedTaxRate > 0;
    const storedTaxPercent = parseFloat(settingsMap['system.tax_rate_percent'] || '');
    const taxRatePercentDefault = Number.isFinite(storedTaxPercent) && storedTaxPercent > 0
        ? storedTaxPercent
        : (taxEnabledDefault ? Math.round(storedTaxRate * 10000) / 100 : 11);

    const prorataEnabledDefault = settingsMap['system.billing_prorata_enabled'] !== '0';
    const billingGenerateDaysBeforeDefault = Math.min(30, Math.max(1, parseInt(settingsMap['system.billing_generate_days_before'] || '5', 10) || 5));
    const billingNotifyAdminDefault = settingsMap['system.billing_notify_admin'] !== '0';
    const billingAdminPhoneDefault = settingsMap['system.billing_admin_phone'] || '';
    const whatsappEnabledDefault = settingsMap['whatsapp.enabled'] !== '0';
    const appName = branding.app_name || settingsMap['system.app_name'] || 'mWiFi';

    const [waTestPhone, setWaTestPhone] = useState(billingAdminPhoneDefault);
    const [isTestingWa, setIsTestingWa] = useState(false);
    const [waSession, setWaSession] = useState({
        status: 'unknown',
        has_qr: false,
        qr_data_url: null,
        last_error: null,
        session: settingsMap['whatsapp.session_id'] || 'mwifi_session',
    });
    const [isLoadingWaSession, setIsLoadingWaSession] = useState(false);
    const [isPollingWaSession, setIsPollingWaSession] = useState(false);
    const waSessionPollRef = useRef(null);

    const waStatusLabel = {
        open: 'Terhubung',
        qr: 'Scan QR',
        connecting: 'Menghubungkan...',
        idle: 'Siap',
        closed: 'Terputus',
        logged_out: 'Logout — scan ulang',
        error: 'Error',
        unknown: 'Belum dicek',
    };

    const fetchWaSessionStatus = useCallback(async () => {
        try {
            const response = await fetch('/admin/settings/whatsapp-session', {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                setWaSession((prev) => ({
                    ...prev,
                    status: 'error',
                    last_error: data.message || 'Gagal memuat status sesi.',
                    has_qr: false,
                    qr_data_url: null,
                }));

                return false;
            }

            setWaSession((prev) => ({
                status: data.status || 'unknown',
                has_qr: Boolean(data.has_qr),
                qr_data_url: data.qr_data_url || null,
                last_error: data.last_error || null,
                session: data.session || prev.session,
            }));

            return data.status === 'open';
        } catch (error) {
            setWaSession((prev) => ({
                ...prev,
                status: 'error',
                last_error: error?.message || 'Gagal memuat status sesi.',
                has_qr: false,
                qr_data_url: null,
            }));

            return false;
        }
    }, []);

    const stopWaSessionPolling = useCallback(() => {
        if (waSessionPollRef.current) {
            clearInterval(waSessionPollRef.current);
            waSessionPollRef.current = null;
        }
        setIsPollingWaSession(false);
    }, []);

    const startWaSessionPolling = useCallback(() => {
        stopWaSessionPolling();
        setIsPollingWaSession(true);

        const poll = async () => {
            const connected = await fetchWaSessionStatus();
            if (connected) {
                stopWaSessionPolling();
                showToast('WhatsApp berhasil terhubung.', 'success');
            }
        };

        poll();
        waSessionPollRef.current = setInterval(poll, 2500);
    }, [fetchWaSessionStatus, showToast, stopWaSessionPolling]);

    useEffect(() => () => stopWaSessionPolling(), [stopWaSessionPolling]);

    const handleRefreshWaSession = async () => {
        setIsLoadingWaSession(true);
        await fetchWaSessionStatus();
        setIsLoadingWaSession(false);
    };

    const handleStartWaSession = async () => {
        setIsLoadingWaSession(true);

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

        try {
            const response = await fetch('/admin/settings/whatsapp-session/start', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                showToast(data.message || 'Gagal memulai sesi WhatsApp.', 'error');
                return;
            }

            setWaSession({
                status: data.status || 'connecting',
                has_qr: Boolean(data.has_qr),
                qr_data_url: data.qr_data_url || null,
                last_error: data.last_error || null,
                session: data.session || waSession.session,
            });

            if (data.status === 'open') {
                showToast('WhatsApp sudah terhubung.', 'success');
            } else {
                showToast('Sesi dimulai. Scan QR di bawah dengan aplikasi WhatsApp.', 'info');
                startWaSessionPolling();
            }
        } catch (error) {
            showToast(error?.message || 'Gagal memulai sesi WhatsApp.', 'error');
        } finally {
            setIsLoadingWaSession(false);
        }
    };

    const savedIsolirProfile = settingsMap['mikrotik.isolir_profile'] || 'ISOLIR';
    const isolirProfileOptions = [...new Set([
        selectedIsolirProfile || savedIsolirProfile,
        savedIsolirProfile,
        ...isolirPppProfiles,
    ])].filter(Boolean);

    const handleSaveSettings = (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        const logoInput = form.querySelector('input[name="system[logo]"]');
        const faviconInput = form.querySelector('input[name="system[favicon]"]');
        if (logoInput?.files?.[0]) {
            formData.set('system[logo]', logoInput.files[0]);
        }
        if (faviconInput?.files?.[0]) {
            formData.set('system[favicon]', faviconInput.files[0]);
        }

        const taxCheckbox = form.querySelector('input[name="system_tax_enabled_ui"]');
        formData.set('system[tax_enabled]', taxCheckbox?.checked ? '1' : '0');

        const prorataCheckbox = form.querySelector('input[name="system_billing_prorata_ui"]');
        formData.set('system[billing_prorata_enabled]', prorataCheckbox?.checked ? '1' : '0');

        const billingNotifyCheckbox = form.querySelector('input[name="system_billing_notify_admin_ui"]');
        formData.set('system[billing_notify_admin]', billingNotifyCheckbox?.checked ? '1' : '0');

        const whatsappEnabledCheckbox = form.querySelector('input[name="whatsapp_enabled_ui"]');
        formData.set('whatsapp[enabled]', whatsappEnabledCheckbox?.checked ? '1' : '0');

        router.post('/admin/settings/save', formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => router.reload(),
            onError: (errors) => {
                const messages = Object.values(errors).flat().filter(Boolean);
                showToast(messages[0] || 'Gagal menyimpan pengaturan. Periksa kembali form Anda.', 'error');
            },
        });
    };

    const handleTestWhatsApp = () => {
        if (!waTestPhone.trim()) {
            showToast('Isi nomor tujuan uji coba terlebih dahulu.', 'warning');
            return;
        }

        setIsTestingWa(true);
        router.post('/admin/settings/whatsapp-test', {
            phone: waTestPhone,
            message: `Tes notifikasi WhatsApp dari panel Pengaturan ${appName}.`,
        }, {
            preserveScroll: true,
            onFinish: () => setIsTestingWa(false),
        });
    };

    const fetchIsolirPppProfiles = async (routerId) => {
        if (!routerId) {
            setIsolirPppProfiles([]);
            return;
        }
        setIsLoadingIsolirProfiles(true);
        try {
            const response = await fetch('/admin/routers/get-profiles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ router_id: routerId, type: 'pppoe' }),
            });
            const result = await response.json();
            if (result.success) {
                setIsolirPppProfiles(result.profiles || []);
            } else {
                showToast(result.message || 'Gagal mengambil profile PPP dari RouterOS.', 'error');
                setIsolirPppProfiles([]);
            }
        } catch {
            showToast('Terjadi kesalahan saat menghubungi router.', 'error');
            setIsolirPppProfiles([]);
        } finally {
            setIsLoadingIsolirProfiles(false);
        }
    };

    useEffect(() => {
        const map = {};
        settings.forEach((s) => { map[s.key] = s.value; });

        const savedProfile = map['mikrotik.isolir_profile'] || 'ISOLIR';
        setSelectedIsolirProfile(savedProfile);

        const savedRouterId = map['mikrotik.isolir_source_router_id'];
        const defaultRouterId = savedRouterId && routers.some((r) => String(r.id) === String(savedRouterId))
            ? String(savedRouterId)
            : String(routers.find((r) => r.status)?.id || routers[0]?.id || '');

        if (defaultRouterId) {
            setIsolirRouterId(defaultRouterId);
            fetchIsolirPppProfiles(defaultRouterId);
        } else {
            setIsolirRouterId('');
            setIsolirPppProfiles([]);
        }
    }, [settings, routers]);

    return (
        <form key={`settings-${branding.version}`} onSubmit={handleSaveSettings} encType="multipart/form-data" className="space-y-6">
            <div className={`${themeCard} border rounded-2xl p-5 space-y-5`}>
                <div className={`flex items-center gap-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3`}>
                    <Building2 className="w-5 h-5 text-emerald-500" />
                    <div>
                        <h3 className={`text-sm font-bold ${themeTextTitle}`}>Identitas & Branding Aplikasi</h3>
                        <p className={`text-[10px] ${themeTextSub} mt-0.5`}>Nama aplikasi, logo perusahaan, favicon browser, dan informasi kontak resmi.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-3 text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className={`font-bold ${themeLabel}`}>Nama Aplikasi</label>
                                <input name="system[app_name]" type="text" defaultValue={branding.app_name || settingsMap['system.app_name'] || ''} placeholder="Nama aplikasi" className={`p-2 border rounded-lg ${themeInput}`} />
                                <span className={`text-[10px] ${themeTextDesc}`}>Dipakai di tab browser & judul halaman.</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className={`font-bold ${themeLabel}`}>Nama Perusahaan / ISP</label>
                                <input name="system[company_name]" type="text" defaultValue={branding.company_name || settingsMap['system.company_name'] || ''} placeholder="RT RW NET Anda" className={`p-2 border rounded-lg ${themeInput}`} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Tagline / Subjudul</label>
                            <input name="system[company_tagline]" type="text" defaultValue={branding.company_tagline || settingsMap['system.company_tagline'] || ''} placeholder="Network Operations Console" className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className={`font-bold ${themeLabel}`}>Email Resmi</label>
                                <div className="relative">
                                    <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                                    <input name="system[company_email]" type="email" defaultValue={branding.company_email || settingsMap['system.company_email'] || ''} className={`pl-8 p-2 border rounded-lg w-full ${themeInput}`} />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className={`font-bold ${themeLabel}`}>Telepon / WhatsApp</label>
                                <div className="relative">
                                    <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                                    <input name="system[company_phone]" type="text" defaultValue={branding.company_phone || settingsMap['system.company_phone'] || ''} placeholder="62812..." className={`pl-8 p-2 border rounded-lg w-full ${themeInput}`} />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Alamat Kantor</label>
                            <div className="relative">
                                <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                                <textarea name="system[company_address]" rows={2} defaultValue={branding.company_address || settingsMap['system.company_address'] || ''} className={`pl-8 p-2 border rounded-lg w-full ${themeInput}`} />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Website</label>
                            <div className="relative">
                                <Globe className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
                                <input name="system[company_website]" type="url" defaultValue={branding.company_website || settingsMap['system.company_website'] || ''} placeholder="https://..." className={`pl-8 p-2 border rounded-lg w-full ${themeInput}`} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 text-xs">
                        <div className={`border rounded-xl p-4 space-y-3 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                            <div className="flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-emerald-500" />
                                <span className={`font-bold ${themeTextTitle}`}>Logo Perusahaan</span>
                            </div>
                            <div className={`h-24 rounded-lg flex items-center justify-center overflow-hidden ${isDarkMode ? 'bg-zinc-900/40' : 'bg-zinc-50/80'}`}>
                                {branding.logo_url ? (
                                    <img src={branding.logo_url} alt="Logo" className="max-h-20 max-w-full object-contain p-2" />
                                ) : (
                                    <span className={`text-[10px] ${themeTextDesc}`}>Belum ada logo</span>
                                )}
                            </div>
                            <BrandingFileUpload
                                key={`logo-upload-${branding.version}`}
                                name="system[logo]"
                                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                buttonLabel="Pilih & Upload Logo"
                                hint="Format: PNG, JPG, WEBP, SVG · Maks. 2MB · Tampil di sidebar admin & portal pelanggan."
                                isDarkMode={isDarkMode}
                            />
                        </div>

                        <div className={`border rounded-xl p-4 space-y-3 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-indigo-500" />
                                <span className={`font-bold ${themeTextTitle}`}>Favicon Browser</span>
                            </div>
                            <div className={`h-16 rounded-lg border flex items-center justify-center gap-3 ${isDarkMode ? 'border-zinc-800 bg-zinc-900' : 'border-zinc-200 bg-white'}`}>
                                {branding.favicon_url ? (
                                    <img src={branding.favicon_url} alt="Favicon" className="w-8 h-8 object-contain" />
                                ) : (
                                    <span className={`text-[10px] ${themeTextDesc}`}>Belum ada favicon</span>
                                )}
                            </div>
                            <BrandingFileUpload
                                key={`favicon-upload-${branding.version}`}
                                name="system[favicon]"
                                accept="image/png,image/jpeg,image/webp,image/x-icon,.ico"
                                buttonLabel="Pilih & Upload Favicon"
                                hint="Format: ICO, PNG, WEBP · Maks. 512KB · Ikon kecil di tab browser."
                                isDarkMode={isDarkMode}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className={`${themeCard} border rounded-2xl p-5 space-y-5`}>
                <div className={`flex items-center gap-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3`}>
                    <Copyright className="w-5 h-5 text-indigo-500" />
                    <div>
                        <h3 className={`text-sm font-bold ${themeTextTitle}`}>Footer Copyright & Meta SEO</h3>
                        <p className={`text-[10px] ${themeTextSub} mt-0.5`}>Teks copyright di footer halaman dan meta tag untuk mesin pencari / media sosial.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                    <div className="space-y-3">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Teks Copyright Footer</label>
                            <textarea
                                name="system[footer_copyright]"
                                rows={3}
                                defaultValue={settingsMap['system.footer_copyright'] || '© {year} {company}. All rights reserved.'}
                                placeholder="© {year} {company}. All rights reserved."
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                            <span className={`text-[10px] ${themeTextDesc}`}>
                                Placeholder: <code className="opacity-80">{'{year}'}</code>, <code className="opacity-80">{'{company}'}</code>, <code className="opacity-80">{'{app}'}</code>
                            </span>
                        </div>
                        {branding.footer_copyright && (
                            <div className={`rounded-lg border px-3 py-2 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-zinc-50'}`}>
                                <p className={`text-[10px] font-bold ${themeTextSub} mb-1`}>Pratinjau footer:</p>
                                <p className={`text-[11px] ${themeTextTitle}`}>{branding.footer_copyright}</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-emerald-500" />
                            <span className={`font-bold ${themeTextTitle}`}>Meta SEO</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Judul Situs (Meta Title)</label>
                            <input
                                name="system[seo_title]"
                                type="text"
                                defaultValue={settingsMap['system.seo_title'] || ''}
                                placeholder={branding.app_name || 'Nama aplikasi'}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                            <span className={`text-[10px] ${themeTextDesc}`}>Kosongkan untuk memakai Nama Aplikasi. Dipakai di tab browser & Open Graph.</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Meta Description</label>
                            <textarea
                                name="system[seo_description]"
                                rows={2}
                                maxLength={320}
                                defaultValue={settingsMap['system.seo_description'] || ''}
                                placeholder="Deskripsi singkat layanan ISP Anda untuk Google..."
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Meta Keywords</label>
                            <input
                                name="system[seo_keywords]"
                                type="text"
                                defaultValue={settingsMap['system.seo_keywords'] || ''}
                                placeholder="wifi, hotspot, billing, isp, rt rw net"
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                            <span className={`text-[10px] ${themeTextDesc}`}>Pisahkan dengan koma.</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Robots Meta</label>
                            <select
                                name="system[seo_robots]"
                                defaultValue={settingsMap['system.seo_robots'] || 'index,follow'}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            >
                                <option value="index,follow">index, follow (tampil di Google)</option>
                                <option value="noindex,nofollow">noindex, nofollow (sembunyikan)</option>
                                <option value="index,nofollow">index, nofollow</option>
                                <option value="noindex,follow">noindex, follow</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`${themeCard} border rounded-2xl p-5 space-y-5`}>
                <div className={`flex items-center gap-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3`}>
                    <Receipt className="w-5 h-5 text-amber-500" />
                    <div>
                        <h3 className={`text-sm font-bold ${themeTextTitle}`}>Tagihan & Isolir Otomatis</h3>
                        <p className={`text-[10px] ${themeTextSub} mt-0.5`}>PPN pada invoice baru, prorata 30 hari, generate tagihan H-N sebelum jatuh tempo, profile PPP isolir saat jatuh tempo, dan pemulihan otomatis setelah pelanggan bayar.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                    <div className={`border rounded-xl p-4 space-y-4 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                        <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-amber-500" />
                            <span className={`font-bold ${themeTextTitle}`}>PPN (Pajak)</span>
                        </div>
                        <label className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-white'}`}>
                            <div>
                                <span className={`font-bold block ${themeTextTitle}`}>Aktifkan PPN pada tagihan</span>
                                <span className={`text-[10px] ${themeTextDesc}`}>Berlaku untuk invoice yang digenerate setelah disimpan.</span>
                            </div>
                            <input
                                type="checkbox"
                                name="system_tax_enabled_ui"
                                defaultChecked={taxEnabledDefault}
                                className={`rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer shrink-0 ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                            />
                        </label>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Tarif PPN (%)</label>
                            <input
                                name="system[tax_rate_percent]"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                defaultValue={taxRatePercentDefault}
                                placeholder="11"
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                            <span className={`text-[10px] ${themeTextDesc}`}>Contoh: 11 untuk PPN 11%. Nonaktifkan toggle di atas jika tagihan tanpa PPN.</span>
                        </div>
                        <label className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-white'}`}>
                            <div>
                                <span className={`font-bold block ${themeTextTitle}`}>Aktifkan tagihan prorata 30 hari</span>
                                <span className={`text-[10px] ${themeTextDesc}`}>Pelanggan baru di tengah bulan ditagih proporsional: (harga paket ÷ 30) × hari aktif s/d tgl jatuh tempo.</span>
                            </div>
                            <input
                                type="checkbox"
                                name="system_billing_prorata_ui"
                                defaultChecked={prorataEnabledDefault}
                                className={`rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer shrink-0 ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                            />
                        </label>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Generate tagihan (hari sebelum jatuh tempo)</label>
                            <input
                                name="system[billing_generate_days_before]"
                                type="number"
                                min="1"
                                max="30"
                                step="1"
                                defaultValue={billingGenerateDaysBeforeDefault}
                                placeholder="5"
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                            <span className={`text-[10px] ${themeTextDesc}`}>Scheduler harian membuat invoice per pelanggan saat H-N (default 5 = lima hari sebelum tanggal jatuh tempo di profil pelanggan).</span>
                        </div>
                        <label className={`flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer ${isDarkMode ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-200 bg-white'}`}>
                            <div>
                                <span className={`font-bold block ${themeTextTitle}`}>Notifikasi WhatsApp ke admin</span>
                                <span className={`text-[10px] ${themeTextDesc}`}>Kirim ringkasan invoice otomatis ke nomor admin setelah scheduler selesai.</span>
                            </div>
                            <input
                                type="checkbox"
                                name="system_billing_notify_admin_ui"
                                defaultChecked={billingNotifyAdminDefault}
                                className={`rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer shrink-0 ${isDarkMode ? 'focus:ring-offset-zinc-950 bg-zinc-900 border-zinc-800' : 'focus:ring-offset-white bg-white border-zinc-300'}`}
                            />
                        </label>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Nomor WhatsApp Admin (opsional)</label>
                            <input
                                name="system[billing_admin_phone]"
                                type="text"
                                defaultValue={billingAdminPhoneDefault}
                                placeholder={settingsMap['system.company_phone'] || '62812...'}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                            <span className={`text-[10px] ${themeTextDesc}`}>Kosongkan untuk memakai telepon perusahaan dari tab Branding.</span>
                        </div>
                    </div>

                    <div className={`border rounded-xl p-4 space-y-4 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                        <div className="flex items-center gap-2">
                            <ShieldOff className="w-4 h-4 text-rose-500" />
                            <span className={`font-bold ${themeTextTitle}`}>Profile PPP Isolir</span>
                        </div>
                        <input type="hidden" name="mikrotik[isolir_source_router_id]" value={isolirRouterId} />
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Router MikroTik</label>
                            <div className="flex gap-2">
                                <select
                                    value={isolirRouterId}
                                    onChange={(e) => {
                                        const routerId = e.target.value;
                                        setIsolirRouterId(routerId);
                                        fetchIsolirPppProfiles(routerId);
                                    }}
                                    className={`flex-1 p-2 border rounded-lg ${themeInput}`}
                                    disabled={routers.length === 0}
                                >
                                    <option value="" disabled>
                                        {routers.length === 0 ? 'Belum ada router terdaftar' : 'Pilih router'}
                                    </option>
                                    {routers.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}{r.status ? '' : ' (offline)'}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => fetchIsolirPppProfiles(isolirRouterId)}
                                    disabled={!isolirRouterId || isLoadingIsolirProfiles}
                                    title="Muat ulang profile dari RouterOS"
                                    className={`px-3 py-2 border rounded-lg shrink-0 transition-colors disabled:opacity-50 ${isDarkMode ? 'border-zinc-700 hover:bg-zinc-800 text-zinc-300' : 'border-zinc-200 hover:bg-zinc-100 text-zinc-600'}`}
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoadingIsolirProfiles ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            <span className={`text-[10px] ${themeTextDesc}`}>Profile diambil langsung dari `/ppp/profile` RouterOS router yang dipilih.</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Profile PPP Isolir</label>
                            <select
                                name="mikrotik[isolir_profile]"
                                value={selectedIsolirProfile || savedIsolirProfile}
                                onChange={(e) => setSelectedIsolirProfile(e.target.value)}
                                className={`p-2 border rounded-lg font-mono ${themeInput}`}
                                disabled={!isolirRouterId || isLoadingIsolirProfiles}
                                required
                            >
                                <option value="" disabled>
                                    {!isolirRouterId
                                        ? 'Pilih router terlebih dahulu'
                                        : (isLoadingIsolirProfiles ? 'Mengambil profile...' : (isolirProfileOptions.length === 0 ? 'Profile tidak ditemukan' : 'Pilih profile isolir'))}
                                </option>
                                {isolirProfileOptions.map((profileName) => (
                                    <option key={profileName} value={profileName}>{profileName}</option>
                                ))}
                            </select>
                            <span className={`text-[10px] ${themeTextDesc}`}>Profile ini dipasang otomatis ke secret PPP pelanggan yang melewati jatuh tempo (cek isolir setiap jam).</span>
                        </div>
                        <div className={`rounded-lg border px-3 py-2 space-y-1 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/40' : 'border-zinc-200 bg-white'}`}>
                            <p className={`text-[10px] font-bold ${themeTextSub}`}>Alur otomatis:</p>
                            <ul className={`text-[10px] ${themeTextDesc} space-y-1 list-disc list-inside`}>
                                <li>Tagihan unpaid + lewat jatuh tempo → status isolir + profile PPP di atas</li>
                                <li>Pelanggan bayar (manual / Tripay / Midtrans) → profile kembali ke paket asli</li>
                                <li>Hanya pelanggan PPPoE; router harus online agar sync ke MikroTik jalan</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Konfigurasi WhatsApp Gateway</h3>
                    <div className="space-y-3 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="whatsapp_enabled_ui"
                                defaultChecked={whatsappEnabledDefault}
                                className={`rounded text-emerald-500 focus:ring-emerald-500 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'}`}
                            />
                            <span className={`font-bold ${themeTextTitle}`}>Aktifkan notifikasi WhatsApp</span>
                        </label>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Gateway URL</label>
                            <input name="whatsapp[api_url]" type="text" placeholder="http://127.0.0.1:3003" defaultValue={settingsMap['whatsapp.api_url'] || 'http://127.0.0.1:3003'} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Session ID</label>
                            <input name="whatsapp[session_id]" type="text" placeholder="mwifi_session" defaultValue={settingsMap['whatsapp.session_id'] || 'mwifi_session'} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>API Key / Token (Opsional)</label>
                            <input name="whatsapp[api_key]" type="password" placeholder="Tetap kosong jika tidak diubah" className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <p className={`text-[10px] leading-relaxed ${themeTextDesc}`}>
                            Semua pengaturan WhatsApp disimpan di database aplikasi (menu ini). Gateway Baileys disarankan di <span className="font-mono">http://127.0.0.1:3003</span>.
                        </p>
                        <div className={`rounded-xl border p-3 space-y-3 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                            <div className="flex items-center justify-between gap-2">
                                <p className={`text-[10px] font-bold uppercase tracking-wider ${themeTextSub}`}>Hubungkan WhatsApp</p>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    waSession.status === 'open'
                                        ? (isDarkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700')
                                        : waSession.status === 'qr'
                                        ? (isDarkMode ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700')
                                        : (isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600')
                                }`}>
                                    {waStatusLabel[waSession.status] || waSession.status}
                                </span>
                            </div>
                            <p className={`text-[10px] ${themeTextDesc}`}>
                                Simpan pengaturan gateway terlebih dahulu, lalu mulai sesi dan scan QR dari sini — tidak perlu terminal VPS.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleStartWaSession}
                                    disabled={isLoadingWaSession || isPollingWaSession}
                                    title="Mulai sesi & tampilkan QR"
                                    className="p-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg inline-flex items-center justify-center cursor-pointer"
                                >
                                    <QrCode className={`w-4 h-4 ${isLoadingWaSession ? 'animate-pulse' : ''}`} />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRefreshWaSession}
                                    disabled={isLoadingWaSession}
                                    title="Cek status sesi"
                                    className={`p-2 border rounded-lg inline-flex items-center justify-center cursor-pointer disabled:opacity-50 ${isDarkMode ? 'border-zinc-700 text-zinc-200 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-700 hover:bg-white'}`}
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoadingWaSession ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            {isPollingWaSession && waSession.status !== 'open' && (
                                <p className={`text-[10px] ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>
                                    Menunggu scan QR... halaman akan otomatis mendeteksi saat terhubung.
                                </p>
                            )}
                            {waSession.has_qr && waSession.qr_data_url && (
                                <div className="flex flex-col items-center gap-2 pt-1">
                                    <img
                                        src={waSession.qr_data_url}
                                        alt="QR WhatsApp"
                                        className="w-56 h-56 rounded-lg border border-zinc-200 bg-white p-2"
                                    />
                                    <p className={`text-[10px] text-center ${themeTextDesc}`}>
                                        WhatsApp → Perangkat Tertaut → Tautkan perangkat → Scan kode ini.
                                    </p>
                                </div>
                            )}
                            {waSession.status === 'open' && (
                                <p className={`text-[10px] ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                    Sesi <span className="font-mono">{waSession.session}</span> aktif. Notifikasi siap dikirim.
                                </p>
                            )}
                            {waSession.last_error && waSession.status !== 'open' && (
                                <p className={`text-[10px] ${isDarkMode ? 'text-rose-300' : 'text-rose-700'}`}>
                                    {waSession.last_error}
                                </p>
                            )}
                        </div>
                        <div className={`rounded-xl border p-3 space-y-2 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${themeTextSub}`}>Uji kirim pesan</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    value={waTestPhone}
                                    onChange={(e) => setWaTestPhone(e.target.value)}
                                    placeholder="08xxxxxxxxxx"
                                    className={`flex-1 p-2 border rounded-lg ${themeInput}`}
                                />
                                <button
                                    type="button"
                                    onClick={handleTestWhatsApp}
                                    disabled={isTestingWa}
                                    title="Kirim pesan uji (gunakan pengaturan yang sudah disimpan)"
                                    className="shrink-0 p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg inline-flex items-center justify-center cursor-pointer"
                                >
                                    <MessageSquare className={`w-4 h-4 ${isTestingWa ? 'animate-pulse' : ''}`} />
                                </button>
                            </div>
                            <p className={`text-[10px] ${themeTextDesc}`}>Simpan pengaturan terlebih dahulu sebelum uji coba.</p>
                        </div>
                    </div>
                </div>

                <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Konfigurasi TR-069 GenieACS</h3>
                    <div className="space-y-3 text-xs">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>NBI API URL</label>
                            <input name="genieacs[api_url]" type="text" defaultValue={settingsMap['genieacs.api_url'] || ''} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Tripay Gateway</h3>
                    <div className="space-y-3 text-xs">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>API Key</label>
                            <input name="payment[tripay][api_key]" type="password" placeholder="Tetap kosong jika tidak diubah" className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Merchant Code</label>
                            <input name="payment[tripay][merchant_code]" type="text" defaultValue={settingsMap['payment.tripay.merchant_code'] || ''} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Private Key</label>
                            <input name="payment[tripay][private_key]" type="password" placeholder="Tetap kosong jika tidak diubah" className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                    </div>
                </div>

                <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Midtrans Gateway</h3>
                    <div className="space-y-3 text-xs">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Server Key</label>
                            <input name="payment[midtrans][server_key]" type="password" placeholder="Tetap kosong jika tidak diubah" className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Client Key</label>
                            <input name="payment[midtrans][client_key]" type="text" defaultValue={settingsMap['payment.midtrans.client_key'] || ''} className={`p-2 border rounded-lg ${themeInput}`} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button type="submit" title="Simpan Seluruh Pengaturan" className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl cursor-pointer inline-flex items-center justify-center shadow-md">
                    <Save className="w-4 h-4" />
                </button>
            </div>
        </form>
    );
}

export default function SettingsIndex({ settings, routers }) {
    return (
        <AdminLayout title="Pengaturan">
            <SettingsPageContent settings={settings} routers={routers} />
        </AdminLayout>
    );
}
