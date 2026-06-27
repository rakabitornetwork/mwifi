import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, RefreshCw, RotateCcw, Save, Wifi } from 'lucide-react';

function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

export default function OntWifiPanel({
    apiBase = '/admin/gpon',
    username = null,
    customerId = null,
    canWrite = true,
    showReboot = false,
    compact = false,
    theme = {},
    onUpdated,
}) {
    const {
        isDarkMode = true,
        themeTextTitle = 'text-white',
        themeTextSub = 'text-zinc-400',
        themeTextDesc = 'text-zinc-500',
    } = theme;

    const themeInnerWidget = isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';
    const themeInput = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700'
        : 'bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300';

    const [device, setDevice] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const [ssid, setSsid] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rebootAfter, setRebootAfter] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isRebooting, setIsRebooting] = useState(false);
    const [saveMessage, setSaveMessage] = useState(null);
    const [saveError, setSaveError] = useState(null);

    const statusQuery = useCallback(() => {
        const params = new URLSearchParams();
        if (customerId) {
            params.set('customer_id', String(customerId));
        } else if (username) {
            params.set('username', username);
        }
        return params.toString();
    }, [customerId, username]);

    const loadWifiStatus = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        setSaveMessage(null);
        setSaveError(null);

        try {
            const query = statusQuery();
            const res = await fetch(`${apiBase}/wifi${query ? `?${query}` : ''}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.found) {
                throw new Error(data.message || 'ONT tidak ditemukan di GenieACS.');
            }

            setDevice(data.device);
            setSsid(data.device?.wifi_ssid || '');
            setPassword('');
        } catch (error) {
            setDevice(null);
            setLoadError(error?.message || 'Gagal memuat data WiFi ONT.');
        } finally {
            setIsLoading(false);
        }
    }, [apiBase, statusQuery]);

    useEffect(() => {
        loadWifiStatus();
    }, [loadWifiStatus]);

    const handleSave = async (event) => {
        event.preventDefault();

        if (!canWrite || isSaving) {
            return;
        }

        const nextSsid = ssid.trim();
        const nextPassword = password.trim();
        const currentSsid = (device?.wifi_ssid || '').trim();

        if (!nextPassword && nextSsid === currentSsid) {
            setSaveError('Ubah nama WiFi atau isi password baru sebelum menyimpan.');
            return;
        }

        setIsSaving(true);
        setSaveMessage(null);
        setSaveError(null);

        try {
            const payload = {
                ssid: nextSsid !== currentSsid ? nextSsid : undefined,
                password: nextPassword || undefined,
            };

            if (customerId) {
                payload.customer_id = customerId;
            } else if (username) {
                payload.username = username;
            }

            if (showReboot && rebootAfter) {
                payload.reboot_after = true;
            }

            if (device?.id) {
                payload.device_id = device.id;
            }

            const res = await fetch(`${apiBase}/wifi`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Gagal mengubah WiFi ONT.');
            }

            setSaveMessage(data.message || 'Perubahan WiFi dikirim ke ONT.');
            setPassword('');
            await loadWifiStatus();
            onUpdated?.(data);
        } catch (error) {
            setSaveError(error?.message || 'Gagal mengubah WiFi ONT.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReboot = async () => {
        if (!canWrite || !device?.id || isRebooting) {
            return;
        }

        if (!confirm('Reboot ONT pelanggan? Koneksi internet akan terputus sementara.')) {
            return;
        }

        setIsRebooting(true);
        setSaveError(null);

        try {
            const res = await fetch('/admin/gpon/reboot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ device_id: device.id }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Gagal mengirim perintah reboot.');
            }

            setSaveMessage(data.message || 'Perintah reboot ONT dikirim.');
        } catch (error) {
            setSaveError(error?.message || 'Gagal mengirim perintah reboot.');
        } finally {
            setIsRebooting(false);
        }
    };

    if (isLoading) {
        return (
            <div className={`rounded-lg border p-2 ${themeInnerWidget}`}>
                <p className={`text-[10px] ${themeTextDesc}`}>Memuat data WiFi ONT...</p>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className={`rounded-lg border p-2 space-y-2 ${themeInnerWidget}`}>
                <div className="flex items-center gap-1.5">
                    <Wifi className={`w-3.5 h-3.5 ${themeTextSub}`} />
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${themeTextSub}`}>WiFi ONT</p>
                </div>
                <p className="text-[10px] text-amber-500">{loadError}</p>
                <button
                    type="button"
                    onClick={loadWifiStatus}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-500 hover:underline cursor-pointer"
                >
                    <RefreshCw className="w-3 h-3" />
                    Coba lagi
                </button>
            </div>
        );
    }

    const ontOnline = device?.status && device.status !== 'offline';

    return (
        <div className={`rounded-lg border p-2 space-y-2 min-w-0 ${themeInnerWidget}`}>
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="flex items-center gap-1.5">
                        <Wifi className={`w-3.5 h-3.5 ${themeTextSub}`} />
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${themeTextSub}`}>WiFi ONT</p>
                    </div>
                    {!compact && (
                        <p className={`text-[10px] mt-0.5 ${themeTextDesc}`}>
                            {device?.model || device?.product_class || 'ONT'} · Redaman {device?.rx || '—'}
                        </p>
                    )}
                </div>
                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border ${
                    ontOnline
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                }`}>
                    {ontOnline ? 'ONT Online' : 'ONT Offline'}
                </span>
            </div>

            {device?.wifi_password && !compact && (
                <p className={`text-[10px] ${themeTextDesc}`}>
                    Password saat ini: <span className={`font-mono ${themeTextTitle}`}>{device.wifi_password}</span>
                </p>
            )}

            <form onSubmit={handleSave} className="space-y-2 min-w-0">
                <div className="space-y-1">
                    <label className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Nama WiFi (SSID)</label>
                    <input
                        type="text"
                        value={ssid}
                        onChange={(e) => setSsid(e.target.value)}
                        maxLength={32}
                        disabled={!canWrite || isSaving}
                        className={`w-full px-2 py-1.5 border rounded-lg text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-60 ${themeInput}`}
                        placeholder="Nama jaringan WiFi"
                    />
                </div>

                <div className="space-y-1">
                    <label className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>Password WiFi Baru</label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            minLength={8}
                            maxLength={63}
                            disabled={!canWrite || isSaving}
                            className={`w-full px-2 py-1.5 pr-8 border rounded-lg text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-60 ${themeInput}`}
                            placeholder="Kosongkan jika tidak diubah"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                    <p className={`text-[9px] ${themeTextDesc}`}>Minimal 8 karakter (WPA).</p>
                </div>

                {showReboot && canWrite && (
                    <label className={`flex items-center gap-2 text-[10px] ${themeTextSub} cursor-pointer`}>
                        <input
                            type="checkbox"
                            checked={rebootAfter}
                            onChange={(e) => setRebootAfter(e.target.checked)}
                            disabled={isSaving}
                            className="rounded border-zinc-600"
                        />
                        Reboot ONT setelah perubahan
                    </label>
                )}

                {saveMessage && (
                    <p className="text-[10px] text-emerald-500">{saveMessage}</p>
                )}
                {saveError && (
                    <p className="text-[10px] text-rose-500">{saveError}</p>
                )}

                {canWrite && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60 cursor-pointer"
                        >
                            <Save className="w-3 h-3" />
                            {isSaving ? 'Menyimpan...' : 'Simpan WiFi'}
                        </button>
                        <button
                            type="button"
                            onClick={loadWifiStatus}
                            disabled={isSaving}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer disabled:opacity-60 ${
                                isDarkMode ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-zinc-300 text-zinc-600 hover:bg-zinc-100'
                            }`}
                        >
                            <RefreshCw className="w-3 h-3" />
                            Muat ulang
                        </button>
                        {showReboot && (
                            <button
                                type="button"
                                onClick={handleReboot}
                                disabled={isRebooting || isSaving}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer disabled:opacity-60 ${
                                    isDarkMode ? 'border-amber-700/50 text-amber-400 hover:bg-amber-500/10' : 'border-amber-300 text-amber-700 hover:bg-amber-50'
                                }`}
                            >
                                <RotateCcw className="w-3 h-3" />
                                {isRebooting ? 'Reboot...' : 'Reboot ONT'}
                            </button>
                        )}
                    </div>
                )}
            </form>
        </div>
    );
}
