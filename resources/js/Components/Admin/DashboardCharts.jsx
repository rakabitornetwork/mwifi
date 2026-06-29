import { memo, useEffect, useRef, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { formatRupiah } from '../../utils/formatRupiah';

const CHART_ANIMATION = {
    duration: 380,
    easing: 'ease-out',
    begin: 60,
};

const LIVE_CHART_ANIMATION = {
    initialDuration: 420,
    updateDuration: 680,
    easing: 'ease-in-out',
    initialBegin: 40,
};

/** Mount animation for static charts (e.g. revenue bars). */
function useMountAnimation(enabled = true) {
    const [isAnimationActive, setIsAnimationActive] = useState(enabled);

    useEffect(() => {
        if (!enabled || !isAnimationActive) {
            return undefined;
        }

        const timer = window.setTimeout(
            () => setIsAnimationActive(false),
            CHART_ANIMATION.duration + CHART_ANIMATION.begin + 40,
        );

        return () => window.clearTimeout(timer);
    }, [enabled, isAnimationActive]);

    return isAnimationActive;
}

const animatedSeriesProps = (isAnimationActive) => ({
    isAnimationActive,
    animationDuration: CHART_ANIMATION.duration,
    animationEasing: CHART_ANIMATION.easing,
    animationBegin: CHART_ANIMATION.begin,
});

/** Smooth transition on each polling update for real-time area charts. */
function useLiveChartAnimation(dataLength) {
    const hasUpdatesRef = useRef(false);

    useEffect(() => {
        if (dataLength > 1) {
            hasUpdatesRef.current = true;
        }
    }, [dataLength]);

    const isUpdate = hasUpdatesRef.current || dataLength > 1;

    return {
        isAnimationActive: true,
        animationDuration: isUpdate ? LIVE_CHART_ANIMATION.updateDuration : LIVE_CHART_ANIMATION.initialDuration,
        animationEasing: LIVE_CHART_ANIMATION.easing,
        animationBegin: isUpdate ? 0 : LIVE_CHART_ANIMATION.initialBegin,
    };
}

function useChartDimensions() {
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState(null);

    useEffect(() => {
        const node = containerRef.current;
        if (!node) {
            return undefined;
        }

        const update = () => {
            const { width, height } = node.getBoundingClientRect();
            const nextWidth = Math.floor(width);
            const nextHeight = Math.floor(height);

            if (nextWidth <= 0 || nextHeight <= 0) {
                return;
            }

            setDimensions((current) => {
                if (current?.width === nextWidth && current?.height === nextHeight) {
                    return current;
                }

                return { width: nextWidth, height: nextHeight };
            });
        };

        update();

        const observer = new ResizeObserver(update);
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    return { containerRef, dimensions };
}

function ChartShell({ className = '', children }) {
    const { containerRef, dimensions } = useChartDimensions();

    return (
        <div ref={containerRef} className={className}>
            {dimensions ? children(dimensions) : null}
        </div>
    );
}

const tooltipStyle = (isDarkMode) => ({
    backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
    borderColor: isDarkMode ? '#27272a' : '#e4e4e7',
    borderRadius: '8px',
    fontSize: '10px',
});

export const RevenueBarChart = memo(function RevenueBarChart({ data, isDarkMode }) {
    const isAnimationActive = useMountAnimation(Boolean(data?.length));

    if (!data?.length) {
        return null;
    }

    const gridStroke = isDarkMode ? '#27272a' : '#e4e4e7';
    const axisStroke = isDarkMode ? '#a1a1aa' : '#71717a';
    const animation = animatedSeriesProps(isAnimationActive);

    return (
        <ChartShell className="h-48 w-full">
            {(dimensions) => (
                <BarChart
                    width={dimensions.width}
                    height={dimensions.height}
                    data={data}
                    margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="label" stroke={axisStroke} fontSize={9} tickLine={false} />
                    <YAxis
                        stroke={axisStroke}
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                    />
                    <Tooltip
                        formatter={(value) => [formatRupiah(value), 'Pendapatan']}
                        labelFormatter={(label) => `Periode ${label}`}
                        contentStyle={tooltipStyle(isDarkMode)}
                    />
                    <Bar
                        dataKey="total"
                        name="Pendapatan"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                        {...animation}
                    />
                </BarChart>
            )}
        </ChartShell>
    );
});

export const DailyRevenueAreaChart = memo(function DailyRevenueAreaChart({ data, isDarkMode }) {
    const isAnimationActive = useMountAnimation(Boolean(data?.length));

    if (!data?.length) {
        return null;
    }

    const gridStroke = isDarkMode ? '#27272a' : '#e4e4e7';
    const axisStroke = isDarkMode ? '#a1a1aa' : '#71717a';
    const animation = animatedSeriesProps(isAnimationActive);

    const tooltipFormatter = (value, name) => [formatRupiah(value), name];

    const tooltipLabelFormatter = (label, payload) => {
        const row = payload?.[0]?.payload;
        if (!row) {
            return label;
        }

        const invoiceTotal = Number(row.invoice_total ?? 0);
        const voucherTotal = Number(row.voucher_total ?? 0);
        const displayTotal = Number(row.gross_total ?? row.total ?? invoiceTotal + voucherTotal);
        const invoiceCount = Number(row.payment_count ?? 0) || (invoiceTotal > 0 ? 1 : 0);
        const voucherCount = Number(row.voucher_sale_count ?? 0) || (voucherTotal > 0 ? 1 : 0);

        return `${label} · Total ${formatRupiah(displayTotal)} (${invoiceCount} tagihan, ${voucherCount} voucher)`;
    };

    return (
        <ChartShell className="h-52 w-full">
            {(dimensions) => (
                <AreaChart
                    width={dimensions.width}
                    height={dimensions.height}
                    data={data}
                    margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="dashboardDailyInvoiceRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="dashboardDailyVoucherRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis
                        dataKey="label"
                        stroke={axisStroke}
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        stroke={axisStroke}
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        width={42}
                        tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                    />
                    <Tooltip
                        formatter={tooltipFormatter}
                        labelFormatter={tooltipLabelFormatter}
                        contentStyle={tooltipStyle(isDarkMode)}
                    />
                    <Area
                        type="monotone"
                        dataKey="invoice_total"
                        name="Tagihan PPPoE"
                        stackId="dailyRevenue"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#dashboardDailyInvoiceRevenue)"
                        {...animation}
                    />
                    <Area
                        type="monotone"
                        dataKey="voucher_total"
                        name="Voucher Hotspot"
                        stackId="dailyRevenue"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#dashboardDailyVoucherRevenue)"
                        {...animation}
                    />
                </AreaChart>
            )}
        </ChartShell>
    );
});

export const ExpenseAreaChart = memo(function ExpenseAreaChart({ data, isDarkMode }) {
    const isAnimationActive = useMountAnimation(Boolean(data?.length));

    if (!data?.length) {
        return null;
    }

    const gridStroke = isDarkMode ? '#27272a' : '#e4e4e7';
    const axisStroke = isDarkMode ? '#a1a1aa' : '#71717a';
    const animation = animatedSeriesProps(isAnimationActive);

    return (
        <ChartShell className="h-52 w-full">
            {(dimensions) => (
                <AreaChart
                    width={dimensions.width}
                    height={dimensions.height}
                    data={data}
                    margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="dashboardDailyExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="label" stroke={axisStroke} fontSize={9} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis stroke={axisStroke} fontSize={9} tickLine={false} axisLine={false} width={42} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                    <Tooltip
                        formatter={(value) => [formatRupiah(value), 'Pengeluaran']}
                        labelFormatter={(label) => label}
                        contentStyle={tooltipStyle(isDarkMode)}
                    />
                    <Area
                        type="monotone"
                        dataKey="total"
                        name="Pengeluaran"
                        stroke="#f43f5e"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#dashboardDailyExpense)"
                        dot={{ r: 2.5, strokeWidth: 0, fill: '#f43f5e' }}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        {...animation}
                    />
                </AreaChart>
            )}
        </ChartShell>
    );
});

const GAUGE_ANIMATION_MS = 750;

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

function polar(cx, cy, radius, angleDeg) {
    const rad = (angleDeg * Math.PI) / 180;
    return {
        x: cx + radius * Math.cos(rad),
        y: cy - radius * Math.sin(rad),
    };
}

function ResourceSpeedometerGauge({ label, value, isDarkMode, type, gaugeId }) {
    const animatedVal = useAnimatedPercent(value);
    const isCpu = type === 'cpu';
    
    const gradientStops = isCpu 
        ? ['#10b981', '#059669', '#34d399'] 
        : ['#6366f1', '#4f46e5', '#818cf8']; 
    const glow = isCpu ? 'rgba(16, 185, 129, 0.22)' : 'rgba(99, 102, 241, 0.22)';
    const textClass = isCpu ? 'text-emerald-500 dark:text-emerald-400' : 'text-indigo-500 dark:text-indigo-400';
    const hubStroke = isCpu ? '#10b981' : '#6366f1';
    const badgeBg = isCpu 
        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25' 
        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25';

    const cx = 60;
    const cy = 56;
    const radius = 44;
    const arcLength = Math.PI * radius;
    const dash = (animatedVal / 100) * arcLength;
    const needleAngle = 180 - (animatedVal / 100) * 180;
    const needleLen = radius - 12;
    const needleTip = polar(cx, cy, needleLen, needleAngle);

    const trackColor = isDarkMode ? '#27272a' : '#e4e4e7';
    const tickColor = isDarkMode ? '#3f3f46' : '#cbd5e1';
    const labelColor = isDarkMode ? '#71717a' : '#94a3b8';
    
    const ticks = [0, 25, 50, 75, 100];

    return (
        <div className="flex-1 flex flex-col items-center max-w-[155px] p-2 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30 shadow-xs relative">
            <div
                className="pointer-events-none absolute inset-x-0 top-0 h-12 opacity-60"
                style={{
                    background: `radial-gradient(ellipse at 50% 0%, ${glow}, transparent 70%)`,
                }}
            />

            <div className={`relative z-10 px-2 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-wider ${badgeBg}`}>
                {label}
            </div>

            <div className="w-full mt-1">
                <svg viewBox="0 0 120 72" className="w-full h-auto block" aria-hidden="true">
                    <defs>
                        <linearGradient id={`${gaugeId}-arc`} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={gradientStops[0]} />
                            <stop offset="50%" stopColor={gradientStops[1]} />
                            <stop offset="100%" stopColor={gradientStops[2]} />
                        </linearGradient>
                        <filter id={`${gaugeId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="1.5" result="blur" />
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
                                opacity={tick % 50 === 0 ? 0.9 : 0.6}
                            />
                        );
                    })}

                    <path
                        d="M 16 56 A 44 44 0 0 1 104 56"
                        fill="none"
                        stroke={trackColor}
                        strokeWidth="6"
                        strokeLinecap="round"
                    />

                    <path
                        d="M 16 56 A 44 44 0 0 1 104 56"
                        fill="none"
                        stroke={`url(#${gaugeId}-arc)`}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${dash.toFixed(2)} ${arcLength.toFixed(2)}`}
                        filter={`url(#${gaugeId}-glow)`}
                    />

                    <line
                        x1={cx}
                        y1={cy}
                        x2={needleTip.x.toFixed(2)}
                        y2={needleTip.y.toFixed(2)}
                        stroke={gradientStops[0]}
                        strokeWidth="2.2"
                        strokeLinecap="round"
                    />
                    <circle
                        cx={cx}
                        cy={cy}
                        r="4"
                        fill={isDarkMode ? '#18181b' : '#ffffff'}
                        stroke={hubStroke}
                        strokeWidth="2"
                    />

                    <text x="10" y="68" fontSize="6.5" fill={labelColor} fontWeight="600">0%</text>
                    <text x="54" y="14" fontSize="6.5" fill={labelColor} fontWeight="600" textAnchor="middle">50%</text>
                    <text x="106" y="68" fontSize="6.5" fill={labelColor} fontWeight="600" textAnchor="end">100%</text>
                </svg>
            </div>

            <div className="relative z-10 text-center -mt-0.5">
                <p className={`text-xs font-bold font-mono tracking-tight ${textClass}`}>
                    {Math.round(animatedVal)}%
                </p>
            </div>
        </div>
    );
}

export const ResourceAreaChart = memo(function ResourceAreaChart({ data, isDarkMode }) {
    if (!data?.length) {
        return null;
    }

    const latest = data[data.length - 1];
    const cpuVal = Math.round(Number(latest?.cpu) || 0);
    const ramVal = Math.round(Number(latest?.ram) || 0);

    return (
        <div className="flex flex-row gap-8 items-center justify-center w-full h-full py-1">
            <ResourceSpeedometerGauge
                label="CPU Load"
                value={cpuVal}
                isDarkMode={isDarkMode}
                type="cpu"
                gaugeId="cpu-gauge"
            />
            <ResourceSpeedometerGauge
                label="RAM Usage"
                value={ramVal}
                isDarkMode={isDarkMode}
                type="ram"
                gaugeId="ram-gauge"
            />
        </div>
    );
});

export const TrafficAreaChart = memo(function TrafficAreaChart({ data, isDarkMode }) {
    const animation = useLiveChartAnimation(data?.length ?? 0);

    if (!data?.length) {
        return null;
    }

    const gridStroke = isDarkMode ? '#27272a' : '#e4e4e7';
    const axisStroke = isDarkMode ? '#a1a1aa' : '#71717a';

    return (
        <ChartShell className="h-28 w-full">
            {(dimensions) => (
                <AreaChart
                    width={dimensions.width}
                    height={dimensions.height}
                    data={data}
                    margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="dashboardColorRx" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="dashboardColorTx" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="time" stroke={axisStroke} fontSize={8} tickLine={false} />
                    <YAxis stroke={axisStroke} fontSize={8} tickLine={false} axisLine={false} />
                    <Tooltip
                        formatter={(value, name) => [`${value} Mbps`, name]}
                        contentStyle={tooltipStyle(isDarkMode)}
                    />
                    <Area
                        type="monotone"
                        dataKey="rx_mbps"
                        name="RX"
                        stroke="#0ea5e9"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#dashboardColorRx)"
                        dot={false}
                        activeDot={{ r: 3 }}
                        {...animation}
                    />
                    <Area
                        type="monotone"
                        dataKey="tx_mbps"
                        name="TX"
                        stroke="#8b5cf6"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#dashboardColorTx)"
                        dot={false}
                        activeDot={{ r: 3 }}
                        {...animation}
                    />
                </AreaChart>
            )}
        </ChartShell>
    );
});
