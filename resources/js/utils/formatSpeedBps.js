export function formatSpeedBps(bps) {
    const value = Number(bps) || 0;
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} Gbps`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} Mbps`;
    if (value >= 1_000) return `${Math.round(value / 1_000)} Kbps`;
    return `${Math.round(value)} bps`;
}

export function bpsToMbps(bps) {
    return Number(((Number(bps) || 0) / 1_000_000).toFixed(2));
}
