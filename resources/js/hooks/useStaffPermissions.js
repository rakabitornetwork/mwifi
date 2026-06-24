import { usePage } from '@inertiajs/react';

export function useStaffPermissions() {
    const { auth } = usePage().props;
    const user = auth?.user;

    return {
        canWrite: user?.can_write !== false,
        canCreateCustomers: user?.can_create_customers === true,
        isReadOnly: user?.is_read_only === true,
        roleLabel: user?.role_label || '',
        assignedRouterId: user?.assigned_router_id ?? null,
        assignedRouterName: user?.assigned_router_name || '',
        isRouterScoped: user?.is_router_scoped === true,
    };
}
