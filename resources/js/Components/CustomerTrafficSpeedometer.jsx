import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { formatSpeedBps } from '../utils/formatSpeedBps';

const GAUGE_ANIMATION_MS = 750;

const THEMES = {
    down: {
        Icon: ArrowDown,
        gradientStops: ['#059669', '#10b981', '#34d399'],
        glow: 'rgba(16, 185, 129, 0.45)',
        valueClass: 'text-emerald-400',
        badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
        hubStroke: '#10b981',
    },
    up: {
        Icon: ArrowUp,
        gradientStops: ['#0284c7', '#0ea5e9', '#38bdf8'],
        glow: 'rgba(14, 165, 233, 0.45)',
        valueClass: 'text-sky-400',
        badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
        hubStroke: '#0ea5e9',
    },
};

function polar(cx, cy, radius, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
        x: cx + radius * Math.cos(rad),
        y: cy - radius * Math.sin(rad),
    };
}

function easeOutCubic(t) {
    return 1 - (1 - t) ** 3;
}

function useAnimatedPercent(target) {
    const [animated, setAnimated] = useState(target);
    const animatedRef = useRef(target);
    const frameRef = useRef(null);

    useEffect(() => {
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
        }

        const from = animatedRef.current;
        const to = target;

        if (Math.abs(from - to) < 0.05) {
            animatedRef.current = to;
            setAnimated(to);
            return undefined;
        }

        const startTime = performance.now();

        const tick = (now) => {
            const progress = Math.min(1, (now - startTime) / GAUGE_ANIMATION_MS);
            const next = from + (to - from) * easeOutCubic(progress);
            animatedRef.current = next;
            setAnimated(next);

            if (progress < 1) {
                frameRef.current = requestAnimationFrame(tick);
                return;
            }

            animatedRef.current = to;
            setAnimated(to);
            frameRef.current = null;
        };

        frameRef.current = requestAnimationFrame(tick);

        return () => {
            if (frameRef.current !== null) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = null;
            }
        };
    }, [target]);

    return animated;
}

export default function CustomerTrafficSpeedometer({
    label,
    bps = 0,
    maxMbps = 0,
    type = 'down',
    isDarkMode = true,
    gaugeId = 'gauge',
    compact = false,
}) {
    const theme = THEMES[type] || THEMES.down;
    const { Icon } = theme;
    const maxBps = maxMbps > 0 ? maxMbps * 1_000_000 : 0;
    const pct = maxBps > 0 ? Math.min(100, ((Number(bps) || 0) / maxBps) * 100) : 0;
    const animatedPct = useAnimatedPercent(pct);

    const cx = 60;
    const cy = 56;
    const radius = 44;
    const arcLength = Math.PI * radius;
    const dash = (animatedPct / 100) * arcLength;
    const needleAngle = 180 - (animatedPct / 100) * 180;
    const needleLen = radius - 12;
    const needleTip = polar(cx, cy, needleLen, needleAngle);
    const maxLabel = maxMbps > 0 ? `${maxMbps}M` : '—';

    const trackColor = isDarkMode ? '#27272a' : '#e4e4e7';
    const tickColor = isDarkMode ? '#52525b' : '#cbd5e1';
    const labelColor = isDarkMode ? '#71717a' : '#94a3b8';
    const cardBg = isDarkMode
        ? 'linear-gradient(165deg, rgba(24,24,27,0.95) 0%, rgba(9,9,11,0.98) 100%)'
        : 'linear-gradient(165deg, #ffffff 0%, #f8fafc 100%)';
    const cardBorder = isDarkMode ? 'rgba(63,63,70,0.8)' : 'rgba(226,232,240,0.95)';

    const ticks = [0, 25, 50, 75, 100];

    return (
        <div
            className={`customer-traffic-gauge group relative flex flex-col items-center w-full min-w-0 rounded-2xl border overflow-hidden ${
                compact ? 'p-1.5 pt-2 map-popup-traffic-gauge' : 'p-2.5 pt-3'
            }`}
            style={{
                background: cardBg,
                borderColor: cardBorder,
                boxShadow: isDarkMode
                    ? 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.28)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 20px rgba(15,23,42,0.06)',
            }}
        >
            {!compact && (
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-70"
                style={{
                    background: `radial-gradient(ellipse at 50% 0%, ${theme.glow}, transparent 70%)`,
                }}
            />
            )}

            <div className={`relative z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-[0.14em] ${theme.badgeClass}`}>
                <Icon className="w-3 h-3" strokeWidth={2.5} />
                <span>{label}</span>
            </div>

            <div className={`relative z-10 w-full px-0.5 ${compact ? 'mt-0.5' : 'mt-1'}`}>
                <svg viewBox="0 0 120 72" className={`w-full block ${compact ? 'h-[58px]' : 'h-auto'}`} aria-hidden="true">
                    <defs>
                        <linearGradient id={`${gaugeId}-arc-${type}`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={theme.gradientStops[0]} />
                            <stop offset="55%" stopColor={theme.gradientStops[1]} />
                            <stop offset="100%" stopColor={theme.gradientStops[2]} />
                        </linearGradient>
                        <filter id={`${gaugeId}-glow-${type}`} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="1.6" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {ticks.map((tick) => {
                        const angle = 180 - (tick / 100) * 180;
                        const inner = polar(cx, cy, radius - 5, angle);
                        const outer = polar(cx, cy, radius + (tick % 50 === 0 ? 3 : 1), angle);

                        return (
                            <line
                                key={tick}
                                x1={inner.x.toFixed(2)}
                                y1={inner.y.toFixed(2)}
                                x2={outer.x.toFixed(2)}
                                y2={outer.y.toFixed(2)}
                                stroke={tickColor}
                                strokeWidth={tick % 50 === 0 ? 1.2 : 0.8}
                                strokeLinecap="round"
                                opacity={tick % 50 === 0 ? 0.9 : 0.55}
                            />
                        );
                    })}

                    <path
                        d="M 16 56 A 44 44 0 0 1 104 56"
                        fill="none"
                        stroke={trackColor}
                        strokeWidth="7"
                        strokeLinecap="round"
                        opacity={isDarkMode ? 0.85 : 1}
                    />

                    <path
                        d="M 16 56 A 44 44 0 0 1 104 56"
                        fill="none"
                        stroke={`url(#${gaugeId}-arc-${type})`}
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={`${dash.toFixed(2)} ${arcLength.toFixed(2)}`}
                        filter={`url(#${gaugeId}-glow-${type})`}
                    />

                    <line
                        x1={cx}
                        y1={cy}
                        x2={needleTip.x.toFixed(2)}
                        y2={needleTip.y.toFixed(2)}
                        stroke={theme.gradientStops[1]}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                    />
                    <circle
                        cx={cx}
                        cy={cy}
                        r="4.5"
                        fill={isDarkMode ? '#18181b' : '#ffffff'}
                        stroke={theme.hubStroke}
                        strokeWidth="2"
                    />
                    <circle cx={cx} cy={cy} r="1.5" fill={theme.gradientStops[1]} opacity="0.9" />

                    <text x="10" y="68" fontSize="6.5" fill={labelColor} fontWeight="600">0</text>
                    <text x="54" y="14" fontSize="6.5" fill={labelColor} fontWeight="600" textAnchor="middle">
                        {maxMbps > 0 ? `${Math.round(maxMbps / 2)}M` : ''}
                    </text>
                    <text x="104" y="68" fontSize="6.5" fill={labelColor} fontWeight="600" textAnchor="end">
                        {maxLabel}
                    </text>
                </svg>
            </div>

            <div className={`relative z-10 w-full text-center min-w-0 px-1 ${compact ? 'mt-0' : '-mt-1'}`}>
                <p className={`${compact ? 'text-[11px]' : 'text-sm sm:text-base'} font-bold font-mono tracking-tight truncate ${theme.valueClass}`}>
                    {formatSpeedBps(bps)}
                </p>
                <p className={`text-[9px] mt-0.5 font-medium ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {maxMbps > 0 ? `Maks ${maxMbps} Mbps` : 'Kecepatan live'}
                </p>
            </div>
        </div>
    );
}
