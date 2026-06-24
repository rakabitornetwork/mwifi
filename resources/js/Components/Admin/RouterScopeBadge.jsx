import { Router } from 'lucide-react';
import { useAdminTheme } from '../../hooks/useAdminTheme.jsx';
import { useStaffPermissions } from '../../hooks/useStaffPermissions';

export function RouterScopeBadge({ className = '' }) {
    const { isRouterScoped, assignedRouterName } = useStaffPermissions();
    const { isDarkMode } = useAdminTheme();

    if (!isRouterScoped || !assignedRouterName) {
        return null;
    }

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${isDarkMode ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-200' : 'border-indigo-200 bg-indigo-50 text-indigo-700'} ${className}`}>
            <Router className="w-3 h-3 shrink-0" />
            Area: {assignedRouterName}
        </span>
    );
}
