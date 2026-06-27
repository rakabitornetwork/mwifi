export function rxAttenuationClass(quality) {
    switch (quality) {
        case 'good':
            return 'text-emerald-500 font-semibold';
        case 'warning':
            return 'text-amber-500 font-semibold';
        case 'critical':
            return 'text-rose-500 font-semibold';
        default:
            return 'text-zinc-500 font-medium';
    }
}

export function resolveRxQuality(device) {
    if (device?.status === 'good' || device?.status === 'warning' || device?.status === 'critical') {
        return device.status;
    }

    const rx = String(device?.rx || '');
    if (/offline/i.test(rx)) {
        return 'offline';
    }

    const match = rx.match(/(-?\d+(?:\.\d+)?)/);
    if (!match) {
        return 'offline';
    }

    const dbm = parseFloat(match[1]);
    if (dbm >= -24) {
        return 'good';
    }
    if (dbm >= -27) {
        return 'warning';
    }

    return 'critical';
}

export function isOntOnline(device) {
    if (typeof device?.online === 'boolean') {
        return device.online;
    }

    return Boolean(device?.status && device.status !== 'offline');
}

export function formatOntDeviceMeta(device) {
    if (!device) {
        return null;
    }

    const model = device.model || device.product_class || 'ONT';
    const rx = device.rx || '—';
    const quality = resolveRxQuality(device);

    return { model, rx, quality };
}
