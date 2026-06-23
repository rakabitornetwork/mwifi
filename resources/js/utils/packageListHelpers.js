export function packageHasNumericPrefix(pkg) {
    const name = String(pkg?.name ?? '').trim();

    return /^\d/.test(name);
}

export function dedupePackagesByMikrotikProfile(items = []) {
    const byProfile = new Map();

    for (const pkg of items) {
        const profileKey = String(pkg.mikrotik_profile || pkg.name || '').trim().toLowerCase();
        const key = `${pkg.router_id ?? 'global'}:${profileKey}`;
        if (profileKey === '') {
            continue;
        }

        const existing = byProfile.get(key);
        if (!existing || Number(pkg.id) > Number(existing.id)) {
            byProfile.set(key, pkg);
        }
    }

    return Array.from(byProfile.values()).sort((a, b) => String(a.name).localeCompare(String(b.name), 'id'));
}

export function listDuplicatePackages(items = []) {
    const kept = dedupePackagesByMikrotikProfile(items);
    const keptIds = new Set(kept.map((pkg) => pkg.id));

    return items
        .filter((pkg) => !keptIds.has(pkg.id))
        .sort((a, b) => Number(a.id) - Number(b.id));
}
