const STORAGE_KEY = 'mwifi.admin.send_whatsapp';

export function readAdminWhatsAppPreference() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === null) {
            return false;
        }

        return stored === '1' || stored === 'true';
    } catch {
        return false;
    }
}

export function writeAdminWhatsAppPreference(value) {
    try {
        localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
        // ignore quota / private mode errors
    }
}
