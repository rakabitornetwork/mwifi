<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminTabAccess
{
    /** @var array<int, string> */
    private const BYPASS_EXACT = [
        'logout',
    ];

    /** @var array<int, string> */
    private const BYPASS_PREFIXES = [
        'profile/avatar',
    ];

    /**
     * Map admin API path prefixes to required tab key(s).
     * More specific prefixes must appear before broader ones.
     *
     * @var array<string, list<string>>
     */
    private const ADMIN_API_TAB_MAP = [
        'admin/settings/whatsapp' => ['messaging', 'settings'],
        'admin/messaging' => ['messaging'],
        'admin/settings' => ['settings'],
        'admin/routers' => ['routers'],
        'admin/customers' => ['customers'],
        'admin/packages' => ['packages'],
        'admin/pppoe' => ['customers'],
        'admin/gpon' => ['customers'],
        'admin/odps' => ['network-map'],
        'admin/network-map' => ['network-map'],
        'admin/inventory' => ['inventory'],
        'admin/finance' => ['finance'],
        'admin/hutang-piutang' => ['hutang-piutang'],
        'admin/users' => ['users'],
        'admin/invoices' => ['invoices'],
        'admin/billing' => ['invoices'],
        'admin/vps' => ['layanan-vps'],
        'admin/profile' => ['profile'],
        'admin/server' => ['dashboard'],
        'admin/database' => ['database'],
        'admin/update' => ['update'],
        'admin/hotspot' => ['hotspot'],
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $path = trim($request->path(), '/');

        if ($path === '' || $path === 'profile') {
            return $next($request);
        }

        foreach (self::BYPASS_EXACT as $exact) {
            if ($path === $exact) {
                return $next($request);
            }
        }

        foreach (self::BYPASS_PREFIXES as $prefix) {
            if ($path === rtrim($prefix, '/') || str_starts_with($path, $prefix)) {
                return $next($request);
            }
        }

        if (str_starts_with($path, 'admin/')) {
            $requiredTabs = $this->requiredTabsForAdminApi($path);

            if ($requiredTabs === null) {
                abort(403, 'Anda tidak memiliki akses ke endpoint ini.');
            }

            if ($user && !$this->userCanAccessAnyTab($user, $requiredTabs)) {
                abort(403, 'Anda tidak memiliki akses ke endpoint ini.');
            }

            return $next($request);
        }

        if ($user && !$user->canAccessTab($path)) {
            abort(403, 'Anda tidak memiliki akses ke halaman ini.');
        }

        return $next($request);
    }

    /**
     * @return list<string>|null
     */
    private function requiredTabsForAdminApi(string $path): ?array
    {
        foreach (self::ADMIN_API_TAB_MAP as $prefix => $tabs) {
            if ($path === $prefix || str_starts_with($path, $prefix.'/')) {
                return $tabs;
            }
        }

        return null;
    }

    /**
     * @param  list<string>  $tabs
     */
    private function userCanAccessAnyTab(\App\Models\User $user, array $tabs): bool
    {
        foreach ($tabs as $tab) {
            if ($user->canAccessTab($tab)) {
                return true;
            }
        }

        return false;
    }
}
