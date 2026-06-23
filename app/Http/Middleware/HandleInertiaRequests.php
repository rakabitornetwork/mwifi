<?php

namespace App\Http\Middleware;

use App\Services\BrandingService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return \App\Services\SettingService::get('system.branding_version', parent::version($request));
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $customer = $user ? $user->customer : null;

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'profile_title' => $user->profile_title ?: ($customer ? 'Pelanggan' : $user->roleLabel()),
                    'avatar_url' => $user->avatarUrl(),
                    'initials' => $user->initials(),
                    'role' => $user->role,
                    'role_label' => $user->role ? $user->roleLabel() : null,
                    'allowed_tabs' => $customer ? [] : $user->allowedTabs(),
                    'can_manage_users' => $user->canManageUsers(),
                    'updated_at' => $user->updated_at?->timestamp,
                    'customer' => $customer ? [
                        'id' => $customer->id,
                        'username' => $customer->username,
                        'status' => $customer->status,
                    ] : null,
                ] : null,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'info' => $request->session()->get('info'),
                'print_invoice_id' => $request->session()->get('print_invoice_id'),
            ],
            'branding' => BrandingService::get(),
        ];
    }
}
