export function buildHotspotDailyRevenueChartData(sales, days = 10) {
    const groups = new Map();

    sales.forEach((sale) => {
        if (!sale.created_at) {
            return;
        }

        const date = new Date(sale.created_at);
        const sortKey = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0'),
        ].join('-');
        const label = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const revenue = parseFloat(sale.price || 0);
        const existing = groups.get(sortKey);

        if (existing) {
            existing.revenue += revenue;
        } else {
            groups.set(sortKey, { date: label, revenue });
        }
    });

    const sorted = [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => value);

    if (sorted.length === 0) {
        return [{ date: 'Tidak ada data', revenue: 0 }];
    }

    return sorted.slice(-days);
}

export function displayRouterOsDuration(value) {
    const text = String(value ?? '').trim();
    return text !== '' ? text : '-';
}
