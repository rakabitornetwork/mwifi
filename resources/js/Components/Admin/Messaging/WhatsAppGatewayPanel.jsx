import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { MessageSquare, QrCode, RefreshCw } from 'lucide-react';

export default function WhatsAppGatewayPanel({
    settingsMap = {},
    companyName = 'mWiFi',
    billingAdminPhone = '',
    themeCard,
    themeInput,
    themeLabel,
    themeTextTitle,
    themeTextSub,
    themeTextDesc,
    isDarkMode,
    showToast,
}) {
    const whatsappEnabledDefault = settingsMap['whatsapp.enabled'] !== '0';
    const whatsappBulkDelayEnabledDefault = settingsMap['whatsapp.bulk_delay_enabled'] !== '0';
    const storedSecondsToMinutes = (value, fallbackSeconds) => {
        const seconds = parseInt(value ?? String(fallbackSeconds), 10);
        const safeSeconds = Number.isFinite(seconds) ? seconds : fallbackSeconds;

        return Math.round((safeSeconds / 60) * 100) / 100;
    };
    const whatsappBulkBatchSizeDefault = Math.min(100, Math.max(1, parseInt(settingsMap['whatsapp.bulk_batch_size'] || '5', 10) || 5));
    const whatsappBulkWindowMinutesDefault = storedSecondsToMinutes(
        settingsMap['whatsapp.bulk_window_seconds'] ?? settingsMap['whatsapp.bulk_delay_seconds'],
        300
    );

    const [waTestPhone, setWaTestPhone] = useState(billingAdminPhone);
    const [isTestingWa, setIsTestingWa] = useState(false);
    const [waSession, setWaSession] = useState({
        status: 'unknown',
        has_qr: false,
        qr_data_url: null,
        last_error: null,
        session: settingsMap['whatsapp.session_id'] || 'mwifi_session',
        profile: null,
    });
    const [waAvatarBroken, setWaAvatarBroken] = useState(false);
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

    const fetchWaSessionStatus = useCallback(async (forceRefresh = false) => {
        try {
            const query = forceRefresh ? '?refresh=1' : '';
            const response = await fetch(`/admin/settings/whatsapp-session${query}`, {
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

            setWaSession({
                status: data.status || 'unknown',
                has_qr: Boolean(data.has_qr),
                qr_data_url: data.qr_data_url || null,
                last_error: data.last_error || null,
                session: data.session || settingsMap['whatsapp.session_id'] || 'mwifi_session',
                profile: data.profile || null,
            });
            setWaAvatarBroken(false);

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
    }, [settingsMap]);

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
            const connected = await fetchWaSessionStatus(false);
            if (connected) {
                stopWaSessionPolling();
                await fetchWaSessionStatus(false);
                showToast('WhatsApp berhasil terhubung.', 'success');
            }
        };

        poll();
        waSessionPollRef.current = setInterval(poll, 2500);
    }, [fetchWaSessionStatus, showToast, stopWaSessionPolling]);

    useEffect(() => () => stopWaSessionPolling(), [stopWaSessionPolling]);

    useEffect(() => {
        fetchWaSessionStatus();
    }, [fetchWaSessionStatus]);

    const handleRefreshWaSession = async () => {
        setIsLoadingWaSession(true);

        try {
            await fetchWaSessionStatus(true);
            showToast('Status WhatsApp diperbarui.', 'success');
        } finally {
            setIsLoadingWaSession(false);
        }
    };

    const linkedWaDisplayName = waSession.profile?.name
        || (waSession.profile?.id ? `+${waSession.profile.id}` : 'Perangkat tertaut');

    const waProfileImageSrc = (() => {
        const profile = waSession.profile;
        if (!profile) {
            return null;
        }

        if (profile.avatar_url) {
            const cacheKey = profile.picture_updated_at || waSession.session || '1';

            return `${profile.avatar_url}?t=${cacheKey}`;
        }

        return profile.picture_data_url || null;
    })();

    const showWaProfileImage = Boolean(waProfileImageSrc) && !waAvatarBroken;

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
                profile: data.profile || null,
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

    const handleTestWhatsApp = () => {
        if (!waTestPhone.trim()) {
            showToast('Isi nomor tujuan uji coba terlebih dahulu.', 'warning');
            return;
        }

        setIsTestingWa(true);
        router.post('/admin/settings/whatsapp-test', {
            phone: waTestPhone,
            message: `Tes notifikasi WhatsApp dari ${companyName}.`,
        }, {
            preserveScroll: true,
            onFinish: () => setIsTestingWa(false),
        });
    };

    return (
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
                <div className={`rounded-xl border p-3 space-y-3 ${isDarkMode ? 'border-zinc-800 bg-zinc-950/30' : 'border-zinc-200 bg-zinc-50/80'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${themeTextSub}`}>Jeda pengiriman massal</p>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            name="whatsapp_bulk_delay_enabled_ui"
                            defaultChecked={whatsappBulkDelayEnabledDefault}
                            className={`rounded text-emerald-500 focus:ring-emerald-500 ${isDarkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'}`}
                        />
                        <span className={`font-bold ${themeTextTitle}`}>Aktifkan pembatasan pengiriman massal</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Jumlah pesan</label>
                            <input
                                name="whatsapp_bulk_batch_size_ui"
                                type="number"
                                min={1}
                                max={100}
                                step={1}
                                defaultValue={whatsappBulkBatchSizeDefault}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className={`font-bold ${themeLabel}`}>Periode waktu (menit)</label>
                            <input
                                name="whatsapp_bulk_window_minutes_ui"
                                type="number"
                                min={0.1}
                                max={120}
                                step={0.1}
                                defaultValue={whatsappBulkWindowMinutesDefault}
                                className={`p-2 border rounded-lg ${themeInput}`}
                            />
                        </div>
                    </div>
                    <p className={`text-[10px] leading-relaxed ${themeTextDesc}`}>
                        Dipakai saat generate tagihan massal, isolir otomatis, dan notifikasi beruntun.
                    </p>
                </div>
                <p className={`text-[10px] leading-relaxed ${themeTextDesc}`}>
                    Gateway Baileys disarankan di <span className="font-mono">http://127.0.0.1:3003</span>.
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
                        Simpan pengaturan gateway terlebih dahulu, lalu mulai sesi dan scan QR dari sini.
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
                            title="Cek status WhatsApp"
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
                        <div className="space-y-2">
                            <div className={`flex items-center gap-3 rounded-xl border p-3 ${isDarkMode ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/80'}`}>
                                {showWaProfileImage ? (
                                    <img
                                        src={waProfileImageSrc}
                                        alt="Foto profil WhatsApp"
                                        onError={() => setWaAvatarBroken(true)}
                                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm shrink-0"
                                    />
                                ) : (
                                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-zinc-800 text-zinc-300' : 'bg-white text-zinc-500 border border-zinc-200'}`}>
                                        <MessageSquare className="w-6 h-6" />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-emerald-100' : 'text-emerald-950'}`}>
                                        {linkedWaDisplayName}
                                    </p>
                                    {waSession.profile?.name && waSession.profile?.id && (
                                        <p className={`text-[10px] font-mono truncate ${isDarkMode ? 'text-emerald-300/80' : 'text-emerald-800/70'}`}>
                                            +{waSession.profile.id}
                                        </p>
                                    )}
                                    <p className={`text-[10px] mt-0.5 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                        Sesi <span className="font-mono">{waSession.session}</span> aktif
                                    </p>
                                </div>
                            </div>
                        </div>
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
                            title="Kirim pesan uji"
                            className="shrink-0 p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg inline-flex items-center justify-center cursor-pointer"
                        >
                            <MessageSquare className={`w-4 h-4 ${isTestingWa ? 'animate-pulse' : ''}`} />
                        </button>
                    </div>
                    <p className={`text-[10px] ${themeTextDesc}`}>Simpan pengaturan terlebih dahulu sebelum uji coba.</p>
                </div>
            </div>
        </div>
    );
}
