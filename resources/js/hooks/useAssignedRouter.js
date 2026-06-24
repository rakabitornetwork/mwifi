import { useMemo } from 'react';
import { useStaffPermissions } from './useStaffPermissions';

export function resolveDefaultRouterId(routers = []) {
    const activeRouter = routers.find((router) => router.status);

    if (activeRouter) {
        return String(activeRouter.id);
    }

    return routers[0] ? String(routers[0].id) : '';
}

export function useAssignedRouter(routers = []) {
    const { isRouterScoped, assignedRouterId, assignedRouterName } = useStaffPermissions();

    const lockedRouterId = useMemo(() => {
        if (isRouterScoped && assignedRouterId) {
            return String(assignedRouterId);
        }

        return null;
    }, [isRouterScoped, assignedRouterId]);

    const initialRouterId = lockedRouterId ?? resolveDefaultRouterId(routers);

    return {
        isRouterScoped,
        assignedRouterName,
        lockedRouterId,
        initialRouterId,
    };
}
