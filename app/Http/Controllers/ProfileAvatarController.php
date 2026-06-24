<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\SettingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class ProfileAvatarController extends Controller
{
    public function show(Request $request, User $user): Response
    {
        $viewer = $request->user();

        if (!$viewer) {
            abort(401);
        }

        if ($viewer->id !== $user->id && !$viewer->canManageUsers()) {
            abort(403);
        }

        $path = $user->avatar;

        if (!$path || SettingService::isBrokenUploadPath($path) || !Storage::disk('public')->exists($path)) {
            abort(404);
        }

        $absolute = Storage::disk('public')->path($path);
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        $mime = match ($extension) {
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            default => @mime_content_type($absolute) ?: 'application/octet-stream',
        };

        return response()->file($absolute, [
            'Content-Type' => $mime,
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }
}
