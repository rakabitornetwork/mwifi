import { useCallback, useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import {
    formatOntDeviceMeta,
    isOntOnline,
    rxAttenuationClass,
} from '../utils/ontDisplay';

export default function CustomerOntStatusLabel({
    apiBase = '/customer',
    enabled = true,
    accentIconClass = 'text-emerald-500',
    themeTextDesc = 'text-zinc-500',
}) {
    const [device, setDevice] = useState(null);
    const [isLoading, setIsLoading] = useState(enabled);
    const [loadError, setLoadError] = useState(false);

    const loadStatus = useCallback(async () => {
        if (!enabled) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setLoadError(false);

        try {
            const res = await fetch(`${apiBase}/wifi`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok || !data.found) {
                throw new Error('ONT tidak ditemukan');
            }

            setDevice(data.device);
        } catch {
            setDevice(null);
            setLoadError(true);
        } finally {
            setIsLoading(false);
        }
    }, [apiBase, enabled]);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    if (!enabled) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="flex items-center space-x-2">
                <Activity className={`w-4 h-4 animate-pulse ${accentIconClass}`} />
                <span className={`text-xs font-bold ${accentIconClass}`}>Memeriksa ONT...</span>
            </div>
        );
    }

    if (loadError || !device) {
        return (
            <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-zinc-500" />
                <span className="text-xs font-bold text-zinc-500">ONT Tidak Terdeteksi</span>
            </div>
        );
    }

    const online = isOntOnline(device);
    const meta = formatOntDeviceMeta(device);
    const connectedCount = device.connected_devices
        ?? (Array.isArray(device.connected_device_list) ? device.connected_device_list.length : null);

    return (
        <div className="flex flex-col items-end sm:items-end gap-1.5 text-right min-w-0">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                online
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
            }`}>
                {online ? 'ONT Online' : 'ONT Offline'}
            </span>
            {meta ? (
                <p className={`text-[10px] leading-snug max-w-full ${themeTextDesc}`}>
                    <span>{meta.model}</span>
                    <span> · Redaman </span>
                    <span className={rxAttenuationClass(meta.quality)}>{meta.rx}</span>
                    {connectedCount !== null ? (
                        <span> · {connectedCount} perangkat</span>
                    ) : null}
                </p>
            ) : null}
        </div>
    );
}
