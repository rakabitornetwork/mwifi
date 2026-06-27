const STORAGE_KEY = 'mwifi.admin.invoices.filters';

const VALID_STATUS_FILTERS = new Set(['all', 'unpaid', 'paid', 'canceled', 'expired', 'isolated']);

export function readAdminInvoicesFilterPreference() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return { routerId: '', searchTerm: '', statusFilter: 'all' };
        }

        const parsed = JSON.parse(raw);

        return {
            routerId: typeof parsed.routerId === 'string' ? parsed.routerId : '',
            searchTerm: typeof parsed.searchTerm === 'string' ? parsed.searchTerm : '',
            statusFilter: VALID_STATUS_FILTERS.has(parsed.statusFilter) ? parsed.statusFilter : 'all',
        };
    } catch {
        return { routerId: '', searchTerm: '', statusFilter: 'all' };
    }
}

export function writeAdminInvoicesFilterPreference({
    routerId = '',
    searchTerm = '',
    statusFilter = 'all',
}) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            routerId: String(routerId ?? ''),
            searchTerm: String(searchTerm ?? ''),
            statusFilter: VALID_STATUS_FILTERS.has(statusFilter) ? statusFilter : 'all',
        }));
    } catch {
        // ignore quota / private mode errors
    }
}
