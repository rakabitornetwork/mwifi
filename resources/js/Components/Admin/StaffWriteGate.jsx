import { useStaffPermissions } from '../../hooks/useStaffPermissions';

export default function StaffWriteGate({ children, fallback = null }) {
    const { canWrite } = useStaffPermissions();

    if (!canWrite) {
        return fallback;
    }

    return children;
}
