import { useCallback, useEffect, useId, useState } from 'react';
import { Activity, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import CustomerTrafficSpeedometer from './CustomerTrafficSpeedometer';
import { formatBytes } from '../utils/formatBytes';
import { parseBandwidthLimit } from '../utils/customerMetrics';

const LIVE_POLL_MS = 3000;
const QUOTA_SAMPLE_EVERY = 10;

function QuotaMiniStat({ icon: Icon, label, usedBytes, toneClass, themeTextSub, themeTextDesc }) {
    return (
        <div className="rounded-xl border border-zinc-800/30 bg-zinc-950/10 p-3 min-w-0 text-center">
            <div className="flex items-center justify-center gap-2 mb-1.5">
                <Icon className={`w-3.5 h-3.5 ${toneClass}`} />
                <p className={`text-[9px] font-bold uppercase tracking-wide ${themeTextSub}`}>{label}</p>
            </div>
            <p className={`text-sm font-bold font-mono ${toneClass}`}>{formatBytes(usedBytes)}</p>
            <p className={`text-[9px] mt-1 ${themeTextDesc}`}>Akumulasi bulan ini</p>
        </div>
    );
}

export default function CustomerLiveTrafficPanel({
    bandwidthLimit = '',
    accentIconClass = 'text-emerald-500',
    themeCard = '',
    themeTextTitle = '',
    themeTextSub = '',
    themeTextDesc = '',
    isDarkMode = true,
}) {
    const gaugeId = useId().replace(/:/g, '');
    const bandwidth = parseBandwidthLimit(bandwidthLimit);
    const [payload, setPayload] = useState(null);
    const [loadError, setLoadError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pollTick, setPollTick] = useState(0);

    const loadTraffic = useCallback(async (sampleQuota = false) => {
        try {
            const params = sampleQuota ? '?sample_quota=1' : '';
            const res = await fetch(`/customer/traffic${params}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.message || data.error || 'Gagal memuat trafik live.');
            }

            setPayload(data);
            setLoadError(data.error || null);
        } catch (error) {
            setLoadError(error?.message || 'Gagal memuat trafik live.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        let tick = 0;

        const poll = async () => {
            tick += 1;
            if (!cancelled) {
                setPollTick(tick);
            }
            await loadTraffic(tick === 1 || tick % QUOTA_SAMPLE_EVERY === 0);
        };

        setIsLoading(true);
        poll();
        const intervalId = setInterval(poll, LIVE_POLL_MS);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [loadTraffic]);

    const online = !!payload?.online;
    const downloadBps = payload?.download_bps ?? 0;
    const uploadBps = payload?.upload_bps ?? 0;
    const quota = payload?.quota || {};
    const downloadBytes = quota.download_bytes ?? 0;
    const uploadBytes = quota.upload_bytes ?? 0;
    const totalBytes = quota.total_bytes ?? (downloadBytes + uploadBytes);

    return (
        <div className={`border rounded-2xl p-5 space-y-4 ${themeCard}`}>
            <div className="flex items-center justify-between gap-3 pb-2 border-b border-zinc-800/40">
                <div className="flex items-center space-x-2 min-w-0">
                    <Activity className={`w-4 h-4 shrink-0 ${accentIconClass}`} />
                    <div className="min-w-0">
                        <h2 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>
                            Trafik Live
                        </h2>
                        {quota.period ? (
                            <p className={`text-[10px] mt-0.5 ${themeTextDesc}`}>
                                Kuota {quota.period} · refresh {Math.round(LIVE_POLL_MS / 1000)} dtk
                            </p>
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {(isLoading || pollTick > 0) && (
                        <RefreshCw className={`w-3 h-3 animate-spin ${themeTextSub}`} />
                    )}
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        online
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                    }`}>
                        {online ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>

            {loadError ? (
                <p className="text-[10px] text-amber-500">{loadError}</p>
            ) : null}

            <div className="grid grid-cols-2 gap-2.5">
                <CustomerTrafficSpeedometer
                    label="Download"
                    bps={downloadBps}
                    maxMbps={bandwidth.down}
                    type="down"
                    isDarkMode={isDarkMode}
                    gaugeId={`${gaugeId}-down`}
                />
                <CustomerTrafficSpeedometer
                    label="Upload"
                    bps={uploadBps}
                    maxMbps={bandwidth.up}
                    type="up"
                    isDarkMode={isDarkMode}
                    gaugeId={`${gaugeId}-up`}
                />
            </div>

            <div className="pt-1 border-t border-zinc-800/30">
                <p className={`text-[10px] font-bold uppercase tracking-wide mb-3 ${themeTextSub}`}>
                    Pemakaian Bulan Ini
                </p>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <QuotaMiniStat
                            icon={ArrowDown}
                            label="Download"
                            usedBytes={downloadBytes}
                            toneClass="text-emerald-500"
                            themeTextSub={themeTextSub}
                            themeTextDesc={themeTextDesc}
                        />
                        <QuotaMiniStat
                            icon={ArrowUp}
                            label="Upload"
                            usedBytes={uploadBytes}
                            toneClass="text-violet-400"
                            themeTextSub={themeTextSub}
                            themeTextDesc={themeTextDesc}
                        />
                    </div>
                    <QuotaMiniStat
                        icon={Activity}
                        label="Total"
                        usedBytes={totalBytes}
                        toneClass="text-indigo-400"
                        themeTextSub={themeTextSub}
                        themeTextDesc={themeTextDesc}
                    />
                </div>
            </div>
        </div>
    );
}
