<?php

use App\Services\BrandingService;

$branding = BrandingService::get();
?>
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ $branding['seo']['title'] ?? $branding['app_name'] ?? config('app.name', 'mWiFi') }}</title>
        @if (!empty($branding['seo']['description']))
            <meta name="description" content="{{ $branding['seo']['description'] }}">
        @endif
        @if (!empty($branding['seo']['keywords']))
            <meta name="keywords" content="{{ $branding['seo']['keywords'] }}">
        @endif
        <meta name="robots" content="{{ $branding['seo']['robots'] ?? 'index,follow' }}">
        @if (!empty($branding['seo']['description']))
            <meta property="og:description" content="{{ $branding['seo']['description'] }}">
        @endif
        @if (!empty($branding['logo_url']))
            <meta property="og:image" content="{{ $branding['logo_url'] }}">
        @endif
        @if (!empty($branding['favicon_url']) || !empty($branding['logo_url']))
            <link rel="icon" href="{{ route('favicon') }}?v={{ $branding['version'] ?? '1' }}">
        @endif
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <!-- Scripts & Styles -->
        @viteReactRefresh
        @vite(['resources/js/app.jsx', 'resources/css/app.css'])
        <script>
            (function () {
                try {
                    var hour = new Date().getHours();
                    var preference = localStorage.getItem('mwifi.admin.theme');
                    var isDark = preference === 'dark'
                        || (preference !== 'light' && (hour >= 18 || hour < 6));
                    if (isDark) {
                        document.documentElement.style.backgroundColor = '#09090b';
                        document.body.style.backgroundColor = '#09090b';
                        document.body.style.color = '#f4f4f5';
                    }
                } catch (e) {}
            })();
        </script>
        @inertiaHead
    </head>
    <body class="font-sans antialiased bg-gray-50 text-gray-900">
        @inertia
    </body>
</html>
