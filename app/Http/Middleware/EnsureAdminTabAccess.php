<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminTabAccess
{
    /** @var array<int, string> */
    private const BYPASS_PREFIXES = [
        'admin/',
        'profile/avatar',
        'logout',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $path = trim($request->path(), '/');

        if ($path === '' || $path === 'profile') {
            return $next($request);
        }

        foreach (self::BYPASS_PREFIXES as $prefix) {
            if ($path === rtrim($prefix, '/') || str_starts_with($path, $prefix)) {
                return $next($request);
            }
        }

        if ($user && !$user->canAccessTab($path)) {
            abort(403, 'Anda tidak memiliki akses ke halaman ini.');
        }

        return $next($request);
    }
}
