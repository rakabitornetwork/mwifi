/**
 * Apakah paket layanan termasuk router MikroTik yang dipilih.
 * Paket tanpa router_id dianggap global (legacy).
 */
export function packageBelongsToRouter(pkg, routerId) {
    if (!routerId) {
        return true;
    }

    if (pkg?.router_id == null) {
        return true;
    }

    return String(pkg.router_id) === String(routerId);
}

/**
 * Filter paket PPPoE untuk dropdown pelanggan berdasarkan router + profil RouterOS.
 */
export function filterPppoePackagesForRouter(
    packages,
    routerId,
    { allowedProfiles, isLoadingProfiles = false } = {},
) {
    const pppoePackages = (packages || []).filter((pkg) => pkg.type === 'pppoe');

    if (!routerId) {
        return [];
    }

    const routerScoped = pppoePackages.filter((pkg) => packageBelongsToRouter(pkg, routerId));

    if (allowedProfiles === undefined) {
        return isLoadingProfiles ? [] : routerScoped;
    }

    if (!Array.isArray(allowedProfiles) || allowedProfiles.length === 0) {
        return routerScoped;
    }

    const profileSet = new Set(allowedProfiles.map((name) => String(name).toLowerCase()));

    return routerScoped.filter((pkg) => {
        const profile = String(pkg.mikrotik_profile || '').toLowerCase();
        return profile !== '' && profileSet.has(profile);
    });
}
