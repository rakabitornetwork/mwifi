import { Eye, UserPlus } from 'lucide-react';
import { useStaffPermissions } from '../../hooks/useStaffPermissions';
import { useAdminTheme } from '../../hooks/useAdminTheme.jsx';

export default function ReadOnlyStaffBanner() {
    const { isReadOnly, canWrite, canCreateCustomers, roleLabel, isRouterScoped, assignedRouterName } = useStaffPermissions();
    const { isDarkMode } = useAdminTheme();

    if (canWrite) {
        return null;
    }

    const isLimitedWrite = canCreateCustomers && !isReadOnly;

    if (!isReadOnly && !isLimitedWrite) {
        return null;
    }

    const routerNote = isRouterScoped && assignedRouterName
        ? <> Hanya data router <span className="font-bold">{assignedRouterName}</span>.</>
        : null;

    return (
        <div className={`rounded-xl border px-3 py-2.5 flex items-start gap-2.5 ${isDarkMode ? 'border-sky-500/30 bg-sky-500/5' : 'border-sky-200 bg-sky-50/90'}`}>
            {isLimitedWrite ? (
                <UserPlus className={`w-4 h-4 shrink-0 mt-0.5 ${isDarkMode ? 'text-sky-300' : 'text-sky-600'}`} />
            ) : (
                <Eye className={`w-4 h-4 shrink-0 mt-0.5 ${isDarkMode ? 'text-sky-300' : 'text-sky-600'}`} />
            )}
            <div>
                <p className={`text-xs font-bold ${isDarkMode ? 'text-sky-200' : 'text-sky-800'}`}>
                    {isLimitedWrite ? `Akses terbatas — ${roleLabel}` : `Mode lihat saja — ${roleLabel}`}
                </p>
                <p className={`text-[10px] mt-0.5 leading-snug ${isDarkMode ? 'text-sky-300/80' : 'text-sky-700'}`}>
                    {isLimitedWrite ? (
                        <>
                            Anda dapat melihat data dan menambah pelanggan PPPoE baru. Tidak dapat mengubah atau menghapus data.
                            {routerNote}
                        </>
                    ) : (
                        <>
                            Anda dapat melihat data termasuk tagihan/billing, tetapi tidak dapat menambah, mengubah, atau menghapus.
                            {routerNote}
                        </>
                    )}
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
