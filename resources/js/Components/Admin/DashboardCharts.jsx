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
    if (!data?.length) {
        return null;
    }

    const gridStroke = isDarkMode ? '#27272a' : '#e4e4e7';
    const axisStroke = isDarkMode ? '#a1a1aa' : '#71717a';

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
                        isAnimationActive={false}
                    />
                </BarChart>
            )}
        </ChartShell>
    );
});

export const ResourceAreaChart = memo(function ResourceAreaChart({ data, isDarkMode }) {
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
                        isAnimationActive={false}
                    />
                    <Area
                        type="monotone"
                        dataKey="ram"
                        name="RAM"
                        stroke="#6366f1"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#dashboardColorRam)"
                        isAnimationActive={false}
                    />
                </AreaChart>
            )}
        </ChartShell>
    );
});

export const TrafficAreaChart = memo(function TrafficAreaChart({ data, isDarkMode }) {
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
                        isAnimationActive={false}
                    />
                    <Area
                        type="monotone"
                        dataKey="tx_mbps"
                        name="TX"
                        stroke="#8b5cf6"
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#dashboardColorTx)"
                        isAnimationActive={false}
                    />
                </AreaChart>
            )}
        </ChartShell>
    );
});
