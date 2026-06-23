const memoryCache = new Map();
const inflightRequests = new Map();

function cacheKey(routerId, scope) {
    return `${routerId}:${scope}`;
}

export function peekRouterPackageProfiles(routerId, scope = 'list') {
    return memoryCache.get(cacheKey(routerId, scope)) ?? null;
}

export function clearRouterPackageProfilesCache(routerId) {
    for (const scope of ['list', 'form']) {
        memoryCache.delete(cacheKey(routerId, scope));
        inflightRequests.delete(cacheKey(routerId, scope));
    }
}

export async function fetchRouterPackageProfiles(routerId, { force = false, scope = 'list', signal } = {}) {
    if (!routerId) {
        return null;
    }

    const key = cacheKey(routerId, scope);

    if (!force) {
        const cached = memoryCache.get(key);
        if (cached) {
            if (scope === 'list' && cached.all_profiles) {
                return cached;
            }
            if (scope === 'form' && cached.form_options) {
                return cached;
            }
        }

        const pending = inflightRequests.get(key);
        if (pending) {
            return pending;
        }
    }

    const request = (async () => {
        const response = await fetch(
            `/admin/packages/router-profiles?router_id=${encodeURIComponent(routerId)}&scope=${encodeURIComponent(scope)}`,
            {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                signal,
            },
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Gagal memuat data RouterOS.');
        }

        const previous = memoryCache.get(cacheKey(routerId, 'list')) || memoryCache.get(cacheKey(routerId, 'form')) || {};
        const merged = {
            ...previous,
            ...data,
            all_profiles: data.all_profiles ?? previous.all_profiles ?? [],
            form_options: scope === 'form'
                ? (data.form_options ?? previous.form_options ?? null)
                : (previous.form_options ?? null),
        };

        memoryCache.set(key, merged);
        if (scope === 'form') {
            memoryCache.set(cacheKey(routerId, 'list'), merged);
        }

        return merged;
    })();

    inflightRequests.set(key, request);

    try {
        return await request;
    } finally {
        if (inflightRequests.get(key) === request) {
            inflightRequests.delete(key);
        }
    }
}
