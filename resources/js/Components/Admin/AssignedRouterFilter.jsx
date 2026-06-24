import { useAssignedRouter } from '../../hooks/useAssignedRouter';
import { RouterScopeBadge } from './RouterScopeBadge';

export default function AssignedRouterFilter({
    routers = [],
    value,
    onChange,
    className = '',
    showAllOption = false,
    emptyLabel = 'Belum ada router',
    renderOption,
}) {
    const { isRouterScoped } = useAssignedRouter(routers);

    if (isRouterScoped) {
        return <RouterScopeBadge className={className} />;
    }

    return (
        <select
            value={value}
            onChange={onChange}
            className={className}
        >
            {showAllOption && <option value="">Semua Router</option>}
            {routers.length === 0 ? (
                <option value="">{emptyLabel}</option>
            ) : routers.map((routerItem) => (
                <option key={routerItem.id} value={routerItem.id}>
                    {renderOption ? renderOption(routerItem) : routerItem.name}
                </option>
            ))}
        </select>
    );
}
