export function getCustomerPopupOptions() {
    const mobile = window.matchMedia('(max-width: 639px)').matches;

    return {
        maxWidth: mobile ? 292 : 400,
        minWidth: mobile ? 268 : 340,
        maxHeight: Math.min(Math.round(window.innerHeight * 0.48), 380),
        autoPanPadding: mobile ? [32, 20] : [48, 48],
        className: 'customer-detail-popup',
    };
}

export function mapPopupStatusVariant(status) {
    if (status === 'active') return { label: 'Aktif', variant: 'success' };
    if (status === 'isolated') return { label: 'Isolir', variant: 'warning' };
    if (status === 'suspended') return { label: 'Suspend', variant: 'danger' };
    return { label: 'Nonaktif', variant: 'neutral' };
}

export function mapPopupRxClass(status) {
    if (status === 'good') return 'map-popup-stat-value--good';
    if (status === 'warning') return 'map-popup-stat-value--warn';
    if (status === 'critical') return 'map-popup-stat-value--bad';
    return '';
}
