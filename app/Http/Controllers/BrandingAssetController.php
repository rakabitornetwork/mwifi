<?php

namespace App\Http\Controllers;

use App\Services\BrandingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class BrandingAssetController extends Controller
{
    public function show(Request $request, string $type): Response
    {
        if (!in_array($type, ['logo', 'favicon', 'logo-wide'], true)) {
            abort(404);
        }

        $path = BrandingService::resolveAssetPath($type);

        if (!$path) {
            abort(404);
        }

        $absolute = Storage::disk('public')->path($path);
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        $mime = match ($extension) {
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            'ico' => 'image/x-icon',
            default => @mime_content_type($absolute) ?: 'application/octet-stream',
        };

        return response()->file($absolute, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}
