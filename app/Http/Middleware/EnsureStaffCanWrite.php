<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStaffCanWrite
{
    /** @var list<string> */
    private const ALLOWED_PATHS = [
        'admin/profile/save',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (!in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return $next($request);
        }

        $user = $request->user();

        if ($user && !$user->canWriteData()) {
            $path = trim($request->path(), '/');

            if (in_array($path, self::ALLOWED_PATHS, true)) {
                return $next($request);
            }

            if (
                $path === 'admin/customers/save'
                && $user->canCreateCustomers()
                && !$request->filled('id')
            ) {
                return $next($request);
            }

            if (
                in_array($path, ['admin/invoices/pay-manual', 'admin/invoices/pay-manual-bulk'], true)
                && $user->canPayManual()
            ) {
                return $next($request);
            }

            $message = match (true) {
                $user->canCreateCustomers() && $user->canPayManual() =>
                    'Role Teknisi: hanya menambah pelanggan baru dan bayar manual tagihan. Tidak dapat mengubah atau menghapus data lain.',
                $user->canPayManual() =>
                    'Role Teknisi: hanya dapat bayar manual tagihan. Tidak dapat mengubah atau menghapus data lain.',
                $user->canCreateCustomers() =>
                    'Role Teknisi hanya dapat menambah pelanggan baru. Tidak dapat mengubah atau menghapus data lain.',
                default =>
                    'Anda hanya dapat melihat data. Tidak dapat menambah, mengubah, atau menghapus.',
            };

            if ($request->expectsJson()) {
                return response()->json(['message' => $message, 'success' => false], 403);
            }

            return redirect()->back()->with('error', $message);
        }

        return $next($request);
    }
}
