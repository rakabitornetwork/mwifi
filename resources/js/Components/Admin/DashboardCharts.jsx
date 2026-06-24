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
                        <linearGradient id="dashboardDailyRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                        formatter={(value, name, item) => {
                            const count = item?.payload?.payment_count ?? 0;
                            const countLabel = count === 1 ? '1 pembayaran' : `${count} pembayaran`;

                            return [formatRupiah(value), `Pemasukan · ${countLabel}`];
                        }}
                        labelFormatter={(label) => label}
                        contentStyle={tooltipStyle(isDarkMode)}
                    />
                    <Area
                        type="monotone"
                        dataKey="total"
                        name="Pemasukan"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#dashboardDailyRevenue)"
                        dot={{ r: 2.5, strokeWidth: 0, fill: '#f59e0b' }}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                        {...animation}
                    />
                </AreaChart>
            )}
        </ChartShell>
    );
});

export const ResourceAreaChart = memo(function ResourceAreaChart({ data, isDarkMode }) {
    const animation = useLiveChartAnimation(data?.length ?? 0);

    if (!data?.length) {
        return null;
    }

    const gridStroke = isDarkMode ? '#27272a' : '#e4e4e7';
    const axisStroke = isDarkMode ? '#a1a1aa' : '#71717a';

    return (
        <ChartShell className="h-44 w-full">
            {(dimensions) => (
                <AreaChart
                    width={dimensions.width}
                    height={dimensions.height}
                    data={data}
                    margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="dashboardColorCpu" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="dashboardColorRam" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="time" stroke={axisStroke} fontSize={8} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke={axisStroke} fontSize={8} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle(isDarkMode)} />
                    <Area
                        type="monotone"
                        dataKey="cpu"
                        name="CPU"
                        stroke="#10b981"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#dashboardColorCpu)"
                        dot={false}
                        activeDot={{ r: 3 }}
                        {...animation}
                    />
                    <Area
                        type="monotone"
                        dataKey="ram"
                        name="RAM"
                        stroke="#6366f1"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#dashboardColorRam)"
                        dot={false}
                        activeDot={{ r: 3 }}
                        {...animation}
                    />
                </AreaChart>
            )}
        </ChartShell>
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
