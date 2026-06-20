/**
 * Format number as Indonesian Rupiah: Rp 24.000
 */
export function formatRupiah(value) {
    const num = Number(value);

    if (!Number.isFinite(num)) {
        return 'Rp 0';
    }

    const formatted = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);

    return `Rp ${formatted}`;
}
