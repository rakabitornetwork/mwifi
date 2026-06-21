export function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value >= 1024 ** 3) return `${(value / (1024 ** 3)).toFixed(2)} GB`;
    if (value >= 1024 ** 2) return `${(value / (1024 ** 2)).toFixed(2)} MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(2)} KB`;
    return `${Math.round(value)} B`;
}

export function quotaUsagePercent(usedBytes, limitBytes) {
    const used = Number(usedBytes) || 0;
    const limit = Number(limitBytes) || 0;
    if (limit <= 0) return null;
    return Math.min(100, (used / limit) * 100);
}
