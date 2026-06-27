export function formatBandwidthLimitLabel(limit) {
    if (limit == null || limit === '') {
        return null;
    }

    const text = String(limit).trim();
    if (!text || /bps/i.test(text)) {
        return text;
    }

    return text.replace(/M/g, 'Mbps');
}

export function parseBandwidthLimit(limit) {
    if (!limit) return { down: 0, up: 0 };
    const parts = String(limit).split('/');
    const parsePart = (part) => {
        const normalized = String(part || '').trim().toUpperCase();
        const num = parseFloat(normalized);
        if (Number.isNaN(num)) return 0;
        if (normalized.includes('G')) return num * 1000;
        if (normalized.includes('K')) return num / 1000;
        return num;
    };
    return {
        down: parsePart(parts[0]),
        up: parsePart(parts[1] ?? parts[0]),
    };
}

export function resolveOntMetrics(metrics, username) {
    if (!username) return {};

    const ontMap = metrics?.ont || {};
    const directKeys = [
        username,
        String(username).split('@')[0],
        String(username).toLowerCase(),
        String(username).split('@')[0].toLowerCase(),
    ];

    for (const key of directKeys) {
        if (key && ontMap[key]) {
            return ontMap[key];
        }
    }

    const lower = String(username).toLowerCase();
    const base = lower.split('@')[0];

    for (const [key, device] of Object.entries(ontMap)) {
        const keyLower = String(key).toLowerCase();
        const keyBase = keyLower.split('@')[0];

        if (keyLower === lower || keyBase === base) {
            return device;
        }
    }

    const devices = metrics?.ont_devices || [];
    return devices.find((device) => {
        const ontUser = String(device.username || '').toLowerCase();
        if (!ontUser || ontUser === 'unknown_ont') return false;
        return ontUser === lower || ontUser.split('@')[0] === base;
    }) || {};
}

export function resolveTrafficMetrics(metrics, customer) {
    const username = customer?.username;
    if (!username) return {};

    const routerMap = metrics?.traffic_by_router?.[String(customer.router_id)]
        || metrics?.traffic_by_router?.[customer.router_id];
    const trafficMap = routerMap || metrics?.traffic || {};

    const directKeys = [
        username,
        String(username).split('@')[0],
        String(username).toLowerCase(),
        String(username).split('@')[0].toLowerCase(),
    ];

    for (const key of directKeys) {
        if (key && trafficMap[key]) {
            return trafficMap[key];
        }
    }

    const lower = String(username).toLowerCase();
    const base = lower.split('@')[0];

    for (const [key, entry] of Object.entries(trafficMap)) {
        const keyLower = String(key).toLowerCase();
        const keyBase = keyLower.split('@')[0];
        if (keyLower === lower || keyBase === base) {
            return entry;
        }
    }

    return {};
}
