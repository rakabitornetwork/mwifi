import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { formatRupiah } from '../../../utils/formatRupiah';
import { buildHotspotDailyRevenueChartData } from './hotspotUtils';

export default function HotspotDailyRevenueChart({
    sales = [],
    isDarkMode = true,
    themeInnerWidget = '',
    themeTextTitle = '',
}) {
    const chartData = buildHotspotDailyRevenueChartData(sales);

    if (!chartData.length) {
        return null;
    }

    return (
        <div className={`border rounded-2xl p-5 ${themeInnerWidget} space-y-3`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${themeTextTitle}`}>Grafik Tren Pendapatan Harian</h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#27272a' : '#e4e4e7'} />
                        <XAxis dataKey="date" stroke={isDarkMode ? '#a1a1aa' : '#71717a'} fontSize={10} tickLine={false} />
                        <YAxis stroke={isDarkMode ? '#a1a1aa' : '#71717a'} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => formatRupiah(v)} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: isDarkMode ? '#18181b' : '#fff',
                                border: isDarkMode ? '1px solid #27272a' : '1px solid #e4e4e7',
                                borderRadius: '12px',
                                fontSize: '11px',
                            }}
                            formatter={(value) => [formatRupiah(value), 'Pendapatan']}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
