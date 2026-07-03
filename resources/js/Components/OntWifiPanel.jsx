import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, MonitorSmartphone, RefreshCw, RotateCcw, Save, Unplug, Wifi } from 'lucide-react';
import ToastStack from './Admin/ToastStack';
import { PremiumPanel, PremiumPanelHeader } from './Admin/AdminPageCard';
import { useOptionalAdminToast } from '../hooks/useAdminToast';
import {
    formatOntDeviceMeta,
    isOntOnline,
    rxAttenuationClass,
} from '../utils/ontDisplay';

function csrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
}

/**
 * Wrapper around fetch() that aborts if the request takes longer than `ms` milliseconds.
 * Throws a user-friendly error on timeout instead of letting the browser wait indefinitely
 * until Nginx returns a 502 Bad Gateway.
 */
function fetchWithTimeout(url, options = {}, ms = 30000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);

    return fetch(url, { ...options, signal: controller.signal })
        .catch((err) => {
            if (err.name === 'AbortError') {
                throw new Error('Permintaan ke server terlalu lama (timeout). Coba lagi nanti.');
            }
            throw err;
        })
        .finally(() => clearTimeout(timer));
}

function DeviceMetaLine({ device, compact, themeTextDesc, className = '' }) {
    if (compact || !device) {
        return null;
    }

    const meta = formatOntDeviceMeta(device);
    if (!meta) {
        return null;
    }

    const { model, rx, quality } = meta;

    return (
        <p className={`text-[10px] min-w-0 leading-snug ${className} ${themeTextDesc}`}>
            <span>{model}</span>
            <span> · Redaman </span>
            <span className={rxAttenuationClass(quality)}>{rx}</span>
        </p>
    );
}

function ConnectedDevicesSection({
    device,
    isDarkMode,
    themeTextTitle,
    themeTextSub,
    themeTextDesc,
    canWrite,
    kickingKey,
    onKick,
}) {
    const list = Array.isArray(device?.connected_device_list) ? device.connected_device_list : [];
    const count = device?.connected_devices ?? (list.length > 0 ? list.length : null);
    const kickEnabled = canWrite && (device?.kick_supported !== false);

    if (count === null && list.length === 0) {
        return null;
    }

    const shell = isDarkMode
        ? 'border-zinc-800/80 bg-zinc-900/30'
        : 'border-zinc-200/80 bg-zinc-50/80';

    const deviceKey = (item) => String(item.mac || item.path || item.name || '').toLowerCase();

    return (
        <div className={`rounded-lg border px-2.5 py-2 space-y-1.5 min-w-0 ${shell}`}>
            <div className="flex items-center gap-1.5">
                <MonitorSmartphone className={`w-3.5 h-3.5 shrink-0 ${themeTextSub}`} />
                <p className={`text-[10px] font-bold uppercase tracking-wide ${themeTextSub}`}>
                    Perangkat Terhubung ({count ?? list.length})
                </p>
            </div>
            {list.length > 0 ? (
                <ul className="space-y-1 min-w-0">
                    {list.map((item, index) => {
                        const key = deviceKey(item) || `device-${index}`;
                        const isKicking = kickingKey === key;
                        const canKickItem = kickEnabled && !!item.mac;

                        return (
                            <li
                                key={`${item.mac || item.name}-${index}`}
                                className={`flex items-center justify-between gap-2 text-[10px] py-1 border-b last:border-0 ${isDarkMode ? 'border-zinc-800/50' : 'border-zinc-200/70'}`}
                            >
                                <div className="min-w-0 flex-1">
                                    <p className={`font-medium break-words [overflow-wrap:anywhere] leading-snug ${themeTextTitle}`}>
                                        {item.name || 'Perangkat'}
                                    </p>
                                    <p className={`font-mono text-[9px] leading-snug ${themeTextDesc}`}>
                                        {item.ip || item.mac || '—'}
                                    </p>
                                </div>
                                {canKickItem ? (
                                    <button
                                        type="button"
                                        onClick={() => onKick?.(item)}
                                        disabled={!!kickingKey}
                                        title="Putuskan perangkat dari WiFi ONT"
                                        className={`inline-flex items-center justify-center w-7 h-7 rounded-md border shrink-0 transition-colors cursor-pointer disabled:opacity-50 ${
                                            isDarkMode
                                                ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                                                : 'border-rose-300 text-rose-600 hover:bg-rose-50'
                                        }`}
                                    >
                                        <Unplug className={`w-3.5 h-3.5 ${isKicking ? 'animate-pulse' : ''}`} />
                                    </button>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className={`text-[10px] leading-relaxed ${themeTextDesc}`}>
                    {count} perangkat terdeteksi. Detail perangkat belum dilaporkan ONT — coba muat ulang panel WiFi.
                </p>
            )}
        </div>
    );
}

export default function OntWifiPanel({
    apiBase = '/admin/gpon',
    username = null,
    customerId = null,
    canWrite = true,
    showReboot = false,
    compact = false,
    premiumEmbed = false,
    premiumAccent = 'violet',
    bare = false,
    theme = {},
    onUpdated,
}) {
    const {
        isDarkMode = true,
        themeCard = '',
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
    const [isSaving, setIsSaving] = useState(false);
    const [isRebooting, setIsRebooting] = useState(false);
    const [isWaking, setIsWaking] = useState(false);
    const [kickingKey, setKickingKey] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const [localToasts, setLocalToasts] = useState([]);
    const { showToast: showAdminToast, hasProvider: hasAdminToast } = useOptionalAdminToast();

    const showSuccessToast = useCallback((message) => {
        const text = message || 'Perubahan WiFi ONT berhasil.';
        if (hasAdminToast) {
            showAdminToast(text, 'success');
            return;
        }

        const id = Date.now() + Math.random().toString(36).slice(2, 9);
        setLocalToasts((prev) => {
            if (prev.some((toast) => toast.message === text && toast.type === 'success')) {
                return prev;
            }
            return [...prev, { id, message: text, type: 'success' }];
        });
        setTimeout(() => {
            setLocalToasts((current) => current.filter((toast) => toast.id !== id));
        }, 5000);
    }, [hasAdminToast, showAdminToast]);

    const loadWifiStatus = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        setSaveError(null);

        const fetchStatus = async (probe) => {
            const params = new URLSearchParams();
            if (probe) {
                params.set('probe', '1');
            }
            if (customerId) {
                params.set('customer_id', String(customerId));
            } else if (username) {
                params.set('username', username);
            }

            const query = params.toString();
            return fetchWithTimeout(`${apiBase}/wifi${query ? `?${query}` : ''}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            }, 20000);
        };

        try {
            let res = await fetchStatus(true);
            let data = await res.json().catch(() => ({}));

            if ((res.status === 503 || res.status === 502) && res.ok === false) {
                res = await fetchStatus(false);
                data = await res.json().catch(() => ({}));
            }

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
    }, [apiBase, customerId, username]);

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

            if (device?.id) {
                payload.device_id = device.id;
            }

            const res = await fetchWithTimeout(`${apiBase}/wifi`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(payload),
            }, 30000);

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Gagal mengubah WiFi ONT.');
            }

            setPassword('');
            if (data.device) {
                setDevice(data.device);
                setSsid(data.device?.wifi_ssid || nextSsid);
            }
            showSuccessToast(data.message || 'Perubahan WiFi ONT berhasil.');
            if (!data.device) {
                await loadWifiStatus();
            }
            onUpdated?.(data);
        } catch (error) {
            setSaveError(error?.message || 'Gagal mengubah WiFi ONT.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleKickDevice = async (item) => {
        if (!canWrite || !device?.id || kickingKey || !item?.mac) {
            return;
        }

        const label = item.name || item.mac;
        if (!confirm(`Putuskan "${label}" dari WiFi ONT pelanggan?`)) {
            return;
        }

        const itemKey = String(item.mac || item.path || item.name || '').toLowerCase();
        setKickingKey(itemKey);
        setSaveError(null);

        const kickUrl = apiBase === '/customer' ? '/customer/wifi/kick' : `${apiBase}/kick-device`;

        try {
            const res = await fetchWithTimeout(kickUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    device_id: device.id,
                    mac: item.mac,
                    association_path: item.path || undefined,
                    ...(customerId ? { customer_id: customerId } : {}),
                    ...(username ? { username } : {}),
                }),
            }, 30000);

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Gagal memutuskan perangkat.');
            }

            if (data.device) {
                setDevice(data.device);
            } else {
                await loadWifiStatus();
            }

            showSuccessToast(data.message || 'Perintah putuskan perangkat berhasil dikirim.');
        } catch (error) {
            setSaveError(error?.message || 'Gagal memutuskan perangkat dari WiFi ONT.');
        } finally {
            setKickingKey(null);
        }
    };

    const handleWake = async () => {
        if (!canWrite || !device?.id || isWaking) {
            return;
        }

        setIsWaking(true);
        setSaveError(null);

        const wakeUrl = apiBase === '/customer' ? '/customer/wifi/wake' : `${apiBase}/wake`;

        try {
            const res = await fetchWithTimeout(wakeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ device_id: device.id }),
            }, 30000);

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Gagal menghubungi ONT.');
            }

            showSuccessToast(data.message || 'Permintaan koneksi TR-069 dikirim.');
            if (data.device) {
                setDevice(data.device);
                setSsid(data.device?.wifi_ssid || '');
            } else {
                await loadWifiStatus();
            }
        } catch (error) {
            setSaveError(error?.message || 'Gagal menghubungi ONT.');
        } finally {
            setIsWaking(false);
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
            const res = await fetchWithTimeout(`${apiBase}/reboot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ device_id: device.id }),
            }, 30000);

            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Gagal mengirim perintah reboot.');
            }

            showSuccessToast(data.message || 'Perintah reboot ONT berhasil dikirim.');
        } catch (error) {
            setSaveError(error?.message || 'Gagal mengirim perintah reboot.');
        } finally {
            setIsRebooting(false);
        }
    };

    const ontOnlineBadge = (online) => (
        <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-bold border ${
            online
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
        }`}>
            {online ? 'ONT Online' : 'ONT Offline'}
        </span>
    );

    const wrapPremium = (content, { subtitle = null, trailing = null } = {}) => {
        if (!premiumEmbed) {
            return content;
        }

        return (
            <PremiumPanel
                accent={premiumAccent}
                themeCard={themeCard}
                isDarkMode={isDarkMode}
                className="h-full"
                bodyClassName="p-3 space-y-3"
            >
                <PremiumPanelHeader
                    icon={Wifi}
                    accent={premiumAccent}
                    isDarkMode={isDarkMode}
                    themeTextTitle={themeTextTitle}
                    themeTextDesc={themeTextDesc}
                    title="WiFi ONT"
                    subtitle={subtitle}
                    trailing={trailing}
                />
                {content}
            </PremiumPanel>
        );
    };

    if (isLoading) {
        const content = <p className={`text-[10px] ${themeTextDesc}`}>Memuat data WiFi ONT...</p>;

        if (premiumEmbed) {
            return wrapPremium(content);
        }

        if (bare) {
            return content;
        }

        return (
            <div className={`rounded-lg border p-2 ${themeInnerWidget}`}>
                {content}
            </div>
        );
    }

    if (loadError) {
        const content = (
            <>
                {!premiumEmbed && !bare && (
                    <div className="flex items-center gap-1.5">
                        <Wifi className={`w-3.5 h-3.5 ${themeTextSub}`} />
                        <p className={`text-[9px] font-bold uppercase tracking-wider ${themeTextSub}`}>WiFi ONT</p>
                    </div>
                )}
                <p className="text-[10px] text-amber-500">{loadError}</p>
                <button
                    type="button"
                    onClick={loadWifiStatus}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-500 hover:underline cursor-pointer"
                >
                    <RefreshCw className="w-3 h-3" />
                    Coba lagi
                </button>
            </>
        );

        if (premiumEmbed) {
            return wrapPremium(content);
        }

        if (bare) {
            return <div className="space-y-2">{content}</div>;
        }

        return (
            <div className={`rounded-lg border p-2 space-y-2 ${themeInnerWidget}`}>
                {content}
            </div>
        );
    }

    const ontOnline = isOntOnline(device);
    const wifiFormDisabled = !canWrite || isSaving;
    const lastInformLabel = device?.last_inform
        ? new Date(device.last_inform).toLocaleString('id-ID')
        : null;
    const deviceMeta = !compact && device ? (
        <DeviceMetaLine device={device} themeTextDesc={themeTextDesc} />
    ) : null;

    const formContent = (
        <>
            {!premiumEmbed && !bare && (
                <div className="flex items-start justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-1.5">
                            <Wifi className={`w-3.5 h-3.5 ${themeTextSub}`} />
                            <p className={`text-[9px] font-bold uppercase tracking-wider ${themeTextSub}`}>WiFi ONT</p>
                        </div>
                        {deviceMeta ? (
                            <div className="mt-0.5">{deviceMeta}</div>
                        ) : null}
                    </div>
                    {ontOnlineBadge(ontOnline)}
                </div>
            )}

            {bare && (
                <div className="flex items-center justify-between gap-2">
                    {deviceMeta ? (
                        <div className="min-w-0 flex-1 truncate">{deviceMeta}</div>
                    ) : <span />}
                    {ontOnlineBadge(ontOnline)}
                </div>
            )}

            {device?.wifi_password && !compact && (
                <p className={`text-[10px] ${themeTextDesc}`}>
                    Password saat ini: <span className={`font-mono ${themeTextTitle}`}>{device.wifi_password}</span>
                </p>
            )}

            {!compact && (
                <ConnectedDevicesSection
                    device={device}
                    isDarkMode={isDarkMode}
                    themeTextTitle={themeTextTitle}
                    themeTextSub={themeTextSub}
                    themeTextDesc={themeTextDesc}
                    canWrite={canWrite}
                    kickingKey={kickingKey}
                    onKick={handleKickDevice}
                />
            )}

            {!ontOnline && (
                <div className={`rounded-lg border px-2.5 py-2 space-y-1.5 ${isDarkMode ? 'border-zinc-700/60 bg-zinc-900/30' : 'border-zinc-200 bg-zinc-50'}`}>
                    <p className={`text-[10px] leading-relaxed ${themeTextDesc}`}>
                        Status ACS belum terbarui, tetapi perubahan WiFi tetap dapat diterapkan lewat koneksi TR-069 langsung.
                    </p>
                    {lastInformLabel ? (
                        <p className={`text-[9px] ${themeTextDesc}`}>
                            Terakhir inform periodik: {lastInformLabel}
                        </p>
                    ) : null}
                </div>
            )}

            {device?.acs_inform_stale && ontOnline && (
                <p className={`text-[9px] ${themeTextDesc}`}>
                    ONT merespons TR-069; inform periodik ACS belum diperbarui.
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
                        disabled={wifiFormDisabled}
                        className={`w-full px-2.5 py-2 border rounded-lg text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-60 ${themeInput}`}
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
                            disabled={wifiFormDisabled}
                            className={`w-full px-2.5 py-2 pr-8 border rounded-lg text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-60 ${themeInput}`}
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

                {saveError && (
                    <p className="text-[10px] text-rose-500">{saveError}</p>
                )}

                {canWrite && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        <button
                            type="submit"
                            disabled={wifiFormDisabled}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-60 cursor-pointer"
                        >
                            <Save className="w-3 h-3" />
                            {isSaving ? 'Menyimpan...' : 'Simpan WiFi'}
                        </button>
                        {!ontOnline && (
                            <button
                                type="button"
                                onClick={handleWake}
                                disabled={isWaking || isSaving}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer disabled:opacity-60 ${
                                    isDarkMode ? 'border-sky-700/50 text-sky-400 hover:bg-sky-500/10' : 'border-sky-300 text-sky-700 hover:bg-sky-50'
                                }`}
                            >
                                <RefreshCw className={`w-3 h-3 ${isWaking ? 'animate-spin' : ''}`} />
                                {isWaking ? 'Memeriksa...' : 'Perbarui Status'}
                            </button>
                        )}
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
        </>
    );

    return (
        <>
        {!hasAdminToast && (
            <ToastStack toasts={localToasts} setToasts={setLocalToasts} isDarkMode={isDarkMode} />
        )}
        {premiumEmbed ? (
            wrapPremium(formContent, {
                subtitle: deviceMeta,
                trailing: ontOnlineBadge(ontOnline),
            })
        ) : bare ? (
            <div className="space-y-2 min-w-0">{formContent}</div>
        ) : (
        <div className={`rounded-lg border p-2 space-y-2 min-w-0 ${themeInnerWidget}`}>
            {formContent}
        </div>
        )}
        </>
    );
}
