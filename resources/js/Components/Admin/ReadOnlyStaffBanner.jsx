import { Eye } from 'lucide-react';
import { useStaffPermissions } from '../../hooks/useStaffPermissions';
import { useAdminTheme } from '../../hooks/useAdminTheme.jsx';

export default function ReadOnlyStaffBanner() {
    const { isReadOnly, roleLabel } = useStaffPermissions();
    const { isDarkMode } = useAdminTheme();

    if (!isReadOnly) {
        return null;
    }

    return (
        <div className={`rounded-xl border px-3 py-2.5 flex items-start gap-2.5 ${isDarkMode ? 'border-sky-500/30 bg-sky-500/5' : 'border-sky-200 bg-sky-50/90'}`}>
            <Eye className={`w-4 h-4 shrink-0 mt-0.5 ${isDarkMode ? 'text-sky-300' : 'text-sky-600'}`} />
            <div>
                <p className={`text-xs font-bold ${isDarkMode ? 'text-sky-200' : 'text-sky-800'}`}>
                    Mode lihat saja — {roleLabel}
                </p>
                <p className={`text-[10px] mt-0.5 leading-snug ${isDarkMode ? 'text-sky-300/80' : 'text-sky-700'}`}>
                    Anda dapat melihat data termasuk tagihan/billing, tetapi tidak dapat menambah, mengubah, atau menghapus.
                </p>
            </div>
        </div>
    );
}

export function ReadOnlyTableActionsPlaceholder({ className = '' }) {
    return (
        <span className={`text-[10px] text-zinc-500 italic ${className}`}>Lihat saja</span>
    );
}
