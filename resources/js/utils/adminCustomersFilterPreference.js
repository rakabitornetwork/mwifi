const STORAGE_KEY = 'mwifi.admin.customers_pppoe.filters';

function parseExpandedCustomerId(value) {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function readAdminCustomersFilterPreference() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return { routerId: '', searchTerm: '', expandedCustomerId: null };
        }

        const parsed = JSON.parse(raw);

        return {
            routerId: typeof parsed.routerId === 'string' ? parsed.routerId : '',
            searchTerm: typeof parsed.searchTerm === 'string' ? parsed.searchTerm : '',
            expandedCustomerId: parseExpandedCustomerId(parsed.expandedCustomerId),
        };
    } catch {
        return { routerId: '', searchTerm: '', expandedCustomerId: null };
    }
}

export function writeAdminCustomersFilterPreference({
    routerId = '',
    searchTerm = '',
    expandedCustomerId = null,
}) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            routerId: String(routerId ?? ''),
            searchTerm: String(searchTerm ?? ''),
            expandedCustomerId: expandedCustomerId ?? null,
        }));
    } catch {
        // ignore quota / private mode errors
    }
}
