@php
$brandName = $branding['company_name'] ?? $branding['app_name'] ?? 'Hotspot';
$loginDisplay = preg_replace('#^https?://#', '', rtrim($loginUrl, '/'));

function getVoucherTheme($price, $colorPalette) {
    $palettes = [
        'amber' => [
            'primary' => '#d97706',
            'dark' => '#92400e',
            'bg_start' => '#fffbeb',
            'bg_end' => '#ffffff',
            'header_start' => '#f59e0b',
            'header_end' => '#b45309',
            'badge_start' => '#fbbf24',
            'badge_end' => '#d97706',
            'accent' => '#fcd34d',
            'ink' => '#78350f',
            'muted' => '#a16207',
        ],
        'teal' => [
            'primary' => '#0d9488',
            'dark' => '#115e59',
            'bg_start' => '#f0fdfa',
            'bg_end' => '#ffffff',
            'header_start' => '#14b8a6',
            'header_end' => '#0f766e',
            'badge_start' => '#2dd4bf',
            'badge_end' => '#0d9488',
            'accent' => '#5eead4',
            'ink' => '#134e4a',
            'muted' => '#0f766e',
        ],
        'emerald' => [
            'primary' => '#059669',
            'dark' => '#065f46',
            'bg_start' => '#ecfdf5',
            'bg_end' => '#ffffff',
            'header_start' => '#10b981',
            'header_end' => '#047857',
            'badge_start' => '#34d399',
            'badge_end' => '#059669',
            'accent' => '#6ee7b7',
            'ink' => '#064e3b',
            'muted' => '#047857',
        ],
        'blue' => [
            'primary' => '#2563eb',
            'dark' => '#1e3a8a',
            'bg_start' => '#eff6ff',
            'bg_end' => '#ffffff',
            'header_start' => '#3b82f6',
            'header_end' => '#1d4ed8',
            'badge_start' => '#60a5fa',
            'badge_end' => '#2563eb',
            'accent' => '#93c5fd',
            'ink' => '#1e3a8a',
            'muted' => '#1d4ed8',
        ],
        'violet' => [
            'primary' => '#7c3aed',
            'dark' => '#5b21b6',
            'bg_start' => '#f5f3ff',
            'bg_end' => '#ffffff',
            'header_start' => '#8b5cf6',
            'header_end' => '#6d28d9',
            'badge_start' => '#a78bfa',
            'badge_end' => '#7c3aed',
            'accent' => '#c4b5fd',
            'ink' => '#4c1d95',
            'muted' => '#6d28d9',
        ],
        'rose' => [
            'primary' => '#db2777',
            'dark' => '#9d174d',
            'bg_start' => '#fdf2f8',
            'bg_end' => '#ffffff',
            'header_start' => '#ec4899',
            'header_end' => '#be185d',
            'badge_start' => '#f472b6',
            'badge_end' => '#db2777',
            'accent' => '#fbcfe8',
            'ink' => '#831843',
            'muted' => '#be185d',
        ],
        'gold' => [
            'primary' => '#b45309',
            'dark' => '#78350f',
            'bg_start' => '#fffbeb',
            'bg_end' => '#ffffff',
            'header_start' => '#d97706',
            'header_end' => '#92400e',
            'badge_start' => '#fbbf24',
            'badge_end' => '#b45309',
            'accent' => '#fde68a',
            'ink' => '#78350f',
            'muted' => '#92400e',
        ],
        'slate' => [
            'primary' => '#475569',
            'dark' => '#1e293b',
            'bg_start' => '#f8fafc',
            'bg_end' => '#ffffff',
            'header_start' => '#64748b',
            'header_end' => '#334155',
            'badge_start' => '#94a3b8',
            'badge_end' => '#475569',
            'accent' => '#cbd5e1',
            'ink' => '#0f172a',
            'muted' => '#475569',
        ],
    ];

    $selected = 'slate';
    if ($colorPalette && isset($palettes[$colorPalette])) {
        $selected = $colorPalette;
    } elseif ($colorPalette === 'price_based' || !$colorPalette) {
        if ($price <= 2000) {
            $selected = 'amber';
        } elseif ($price <= 3000) {
            $selected = 'teal';
        } elseif ($price <= 5000) {
            $selected = 'emerald';
        } elseif ($price <= 10000) {
            $selected = 'blue';
        } elseif ($price <= 20000) {
            $selected = 'violet';
        } elseif ($price <= 50000) {
            $selected = 'rose';
        } else {
            $selected = 'gold';
        }
    }

    return $palettes[$selected];
}
@endphp
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cetak Voucher Hotspot — {{ $brandName }}</title>
    @if (!empty($branding['favicon_url']))
        <link rel="icon" href="{{ $branding['favicon_url'] }}">
    @endif
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
    <script src="{{ asset('js/qrious.min.js') }}"></script>
    <style>
        * { box-sizing: border-box; }

        body {
            background: #e2e8f0;
            margin: 0;
            padding: 20px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .no-print-header {
            background: #fff;
            padding: 14px 22px;
            border-radius: 14px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
            margin-bottom: 18px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 210mm;
            border: 1px solid #e2e8f0;
            gap: 16px;
        }

        .header-brand {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
        }

        .header-brand img {
            height: 34px;
            width: auto;
            max-width: 76px;
            object-fit: contain;
        }

        .header-title h1 {
            margin: 0;
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
        }

        .header-title p {
            margin: 3px 0 0;
            font-size: 10px;
            color: #64748b;
            line-height: 1.45;
        }

        .btn-print {
            background: linear-gradient(135deg, #4f46e5, #6366f1);
            color: #fff;
            border: none;
            padding: 9px 16px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 11px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
        }

        .page {
            background: #fff;
            width: 210mm;
            height: 297mm;
            padding: 7mm 5.5mm;
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            grid-template-rows: repeat(8, 1fr);
            gap: 1.4mm;
            margin-bottom: 18px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
            border: 1px solid #e2e8f0;
            page-break-after: always;
            page-break-inside: avoid;
        }

        .voucher-card {
            display: flex;
            align-items: stretch;
            justify-content: center;
            overflow: hidden;
        }

        .voucher-svg {
            width: 100%;
            height: 100%;
            display: block;
        }

        @page {
            size: A4;
            margin: 0;
        }

        @media print {
            body {
                background: none;
                padding: 0;
                margin: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .no-print-header { display: none !important; }

            .page {
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                width: 210mm !important;
                height: 297mm !important;
            }

            .page:last-of-type {
                page-break-after: avoid !important;
            }
        }
    </style>
</head>
<body>

    <div class="no-print-header">
        <div class="header-brand">
            @if (!empty($branding['logo_url']))
                <img src="{{ $branding['logo_url'] }}" alt="{{ $brandName }}">
            @endif
            <div class="header-title">
                <h1>Cetak Voucher Premium — {{ $brandName }}</h1>
                <p>
                    Router: <strong>{{ $router->name }}</strong> · Batch: <strong>{{ $comment }}</strong> · Total: <strong>{{ $vouchers->count() }}</strong> voucher
                    <br>Layout vertikal high-density · 56 voucher / halaman A4
                </p>
            </div>
        </div>
        <button class="btn-print" type="button" onclick="window.print()">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/><path d="M6 9V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"/></svg>
            Cetak Halaman
        </button>
    </div>

    @foreach ($vouchers->chunk(56) as $chunk)
        <div class="page">
            @foreach ($chunk as $v)
                @php
                    $theme = getVoucherTheme($v->price, $colorPalette);
                    $wifiName = $v->wifi_name ?: ($branding['company_name'] ?? $router->name);
                    $wifiShort = \Illuminate\Support\Str::limit($wifiName, 16, '…');
                    $isDualCredential = $v->password && $v->password !== $v->username;
                    $qrVal = $loginUrl . '?username=' . urlencode($v->username) . '&password=' . urlencode($v->password ?: $v->username);
                    $validityLabel = $v->validity ?: 'Unlimited';
                    $loginHost = \Illuminate\Support\Str::limit($loginDisplay, 18, '…');
                @endphp
                <div class="voucher-card">
                    <svg class="voucher-svg" data-qr-value="{{ $qrVal }}" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <filter id="shadow-{{ $v->id }}" x="-10%" y="-10%" width="120%" height="120%">
                                <feDropShadow dx="0" dy="1" stdDeviation="1.2" flood-color="#0f172a" flood-opacity="0.08"/>
                            </filter>
                            <linearGradient id="bg-{{ $v->id }}" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="{{ $theme['bg_start'] }}"/>
                                <stop offset="100%" stop-color="{{ $theme['bg_end'] }}"/>
                            </linearGradient>
                            <linearGradient id="hdr-{{ $v->id }}" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="{{ $theme['header_start'] }}"/>
                                <stop offset="100%" stop-color="{{ $theme['header_end'] }}"/>
                            </linearGradient>
                            <linearGradient id="badge-{{ $v->id }}" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="{{ $theme['badge_start'] }}"/>
                                <stop offset="100%" stop-color="{{ $theme['badge_end'] }}"/>
                            </linearGradient>
                            <pattern id="ocean-swell-{{ $v->id }}" width="48" height="24" patternUnits="userSpaceOnUse">
                                <path d="M-6 16 C4 10 12 10 20 16 S36 22 54 16" fill="{{ $theme['accent'] }}" opacity="0.1"/>
                                <path d="M-6 12 C6 6 14 6 22 12 S38 18 54 12" fill="none" stroke="{{ $theme['primary'] }}" stroke-width="0.75" opacity="0.13"/>
                                <path d="M-6 20 C8 14 16 14 24 20 S40 26 54 20" fill="none" stroke="{{ $theme['primary'] }}" stroke-width="0.55" opacity="0.09"/>
                            </pattern>
                            <pattern id="ocean-ripple-{{ $v->id }}" width="32" height="16" patternUnits="userSpaceOnUse">
                                <path d="M0 10 Q8 4 16 10 T32 10" fill="none" stroke="{{ $theme['primary'] }}" stroke-width="0.65" opacity="0.11"/>
                                <path d="M0 13 Q8 7 16 13 T32 13" fill="none" stroke="{{ $theme['accent'] }}" stroke-width="0.5" opacity="0.09"/>
                                <path d="M0 7 Q8 2 16 7 T32 7" fill="none" stroke="{{ $theme['primary'] }}" stroke-width="0.4" opacity="0.07"/>
                            </pattern>
                            <pattern id="ocean-foam-{{ $v->id }}" width="14" height="14" patternUnits="userSpaceOnUse">
                                <circle cx="3.5" cy="4" r="0.9" fill="#ffffff" opacity="0.22"/>
                                <circle cx="10" cy="7" r="0.6" fill="{{ $theme['accent'] }}" opacity="0.16"/>
                                <circle cx="6" cy="11" r="0.5" fill="{{ $theme['primary'] }}" opacity="0.12"/>
                                <circle cx="12" cy="12" r="0.35" fill="#ffffff" opacity="0.15"/>
                            </pattern>
                            <pattern id="ocean-current-{{ $v->id }}" width="60" height="30" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)">
                                <path d="M0 22 C15 14 25 14 30 22 S45 30 60 22" fill="none" stroke="{{ $theme['primary'] }}" stroke-width="1" opacity="0.08"/>
                                <path d="M0 26 C18 18 28 18 30 26 S42 34 60 26" fill="{{ $theme['accent'] }}" opacity="0.05"/>
                            </pattern>
                            <radialGradient id="ocean-surface-{{ $v->id }}" cx="50%" cy="0%" r="80%">
                                <stop offset="0%" stop-color="{{ $theme['accent'] }}" stop-opacity="0.3"/>
                                <stop offset="100%" stop-color="{{ $theme['accent'] }}" stop-opacity="0"/>
                            </radialGradient>
                            <radialGradient id="ocean-depth-{{ $v->id }}" cx="50%" cy="100%" r="85%">
                                <stop offset="0%" stop-color="{{ $theme['primary'] }}" stop-opacity="0.22"/>
                                <stop offset="100%" stop-color="{{ $theme['primary'] }}" stop-opacity="0"/>
                            </radialGradient>
                            <linearGradient id="ocean-tide-{{ $v->id }}" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="{{ $theme['accent'] }}" stop-opacity="0.06"/>
                                <stop offset="45%" stop-color="{{ $theme['primary'] }}" stop-opacity="0.04"/>
                                <stop offset="100%" stop-color="{{ $theme['dark'] }}" stop-opacity="0.1"/>
                            </linearGradient>
                            <clipPath id="clip-{{ $v->id }}">
                                <rect x="1" y="1" width="198" height="258" rx="9"/>
                            </clipPath>
                        </defs>

                        <!-- Ticket body -->
                        <rect x="1" y="1" width="198" height="258" rx="9" fill="url(#bg-{{ $v->id }})" stroke="{{ $theme['primary'] }}" stroke-width="1.2"/>
                        <rect x="4" y="4" width="192" height="252" rx="7" fill="none" stroke="{{ $theme['accent'] }}" stroke-width="0.6" opacity="0.55"/>

                        <g clip-path="url(#clip-{{ $v->id }})">
                            <!-- Ocean wave background — full card -->
                            <rect x="1" y="1" width="198" height="258" fill="url(#ocean-tide-{{ $v->id }})"/>
                            <rect x="1" y="1" width="198" height="258" fill="url(#ocean-current-{{ $v->id }})"/>
                            <rect x="1" y="1" width="198" height="258" fill="url(#ocean-swell-{{ $v->id }})"/>
                            <rect x="1" y="1" width="198" height="258" fill="url(#ocean-ripple-{{ $v->id }})"/>
                            <rect x="1" y="1" width="198" height="258" fill="url(#ocean-foam-{{ $v->id }})"/>
                            <rect x="1" y="1" width="198" height="258" fill="url(#ocean-surface-{{ $v->id }})"/>
                            <rect x="1" y="1" width="198" height="258" fill="url(#ocean-depth-{{ $v->id }})"/>

                            <!-- Large ocean wave silhouettes -->
                            <g fill="none" stroke="{{ $theme['primary'] }}" opacity="0.1">
                                <path d="M-5 55 C30 40 60 40 90 55 S150 70 205 55" stroke-width="1.4"/>
                                <path d="M-5 63 C35 48 65 48 95 63 S155 78 205 63" stroke-width="1.1"/>
                                <path d="M-5 71 C40 56 70 56 100 71 S160 86 205 71" stroke-width="0.9"/>
                                <path d="M-5 195 C25 180 55 180 85 195 S145 210 205 195" stroke-width="1.3"/>
                                <path d="M-5 203 C30 188 60 188 90 203 S150 218 205 203" stroke-width="1"/>
                                <path d="M-5 211 C35 196 65 196 95 211 S155 226 205 211" stroke-width="0.8"/>
                            </g>

                            <!-- Foam bubbles accent -->
                            <g fill="#ffffff" opacity="0.14">
                                <circle cx="18" cy="42" r="1.2"/>
                                <circle cx="175" cy="88" r="0.9"/>
                                <circle cx="32" cy="155" r="1"/>
                                <circle cx="168" cy="175" r="1.1"/>
                                <circle cx="95" cy="230" r="0.8"/>
                                <circle cx="145" cy="48" r="0.7"/>
                                <circle cx="55" cy="210" r="0.9"/>
                            </g>

                            <!-- Header band -->
                            <rect x="1" y="1" width="198" height="36" fill="url(#hdr-{{ $v->id }})" opacity="0.94"/>
                            <text x="12" y="14" font-family="'Plus Jakarta Sans', sans-serif" font-size="5.5" font-weight="700" fill="#ffffff" opacity="0.85" letter-spacing="1.2">VOUCHER WIFI</text>
                            <text x="12" y="27" font-family="'Plus Jakarta Sans', sans-serif" font-size="9.5" font-weight="800" fill="#ffffff" letter-spacing="0.3">{{ strtoupper($wifiShort) }}</text>

                            <!-- Price pill -->
                            <rect x="126" y="10" width="66" height="18" rx="9" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.35)" stroke-width="0.6"/>
                            <text x="159" y="22" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="8" font-weight="800" fill="#ffffff">Rp {{ number_format($v->price, 0, ',', '.') }}</text>

                            <!-- QR block -->
                            <rect x="66" y="44" width="68" height="68" rx="7" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.8" filter="url(#shadow-{{ $v->id }})"/>
                            <image class="qr-image" x="69" y="47" width="62" height="62"/>

                            <text x="100" y="121" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="5.5" font-weight="700" fill="{{ $theme['muted'] }}" letter-spacing="1">SCAN UNTUK LOGIN OTOMATIS</text>

                            <!-- Credential panel -->
                            <rect x="10" y="126" width="180" height="{{ $isDualCredential ? 40 : 34 }}" rx="6" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.8" filter="url(#shadow-{{ $v->id }})"/>

                            @if ($isDualCredential)
                                <text x="16" y="138" font-family="'Plus Jakarta Sans', sans-serif" font-size="5.5" font-weight="700" fill="#94a3b8" letter-spacing="0.8">USER</text>
                                <text x="42" y="139" font-family="'IBM Plex Mono', monospace" font-size="10" font-weight="700" fill="{{ $theme['ink'] }}">{{ $v->username }}</text>
                                <line x1="14" y1="144" x2="186" y2="144" stroke="#f1f5f9" stroke-width="0.8"/>
                                <text x="16" y="156" font-family="'Plus Jakarta Sans', sans-serif" font-size="5.5" font-weight="700" fill="#94a3b8" letter-spacing="0.8">PASS</text>
                                <text x="42" y="157" font-family="'IBM Plex Mono', monospace" font-size="10" font-weight="700" fill="{{ $theme['ink'] }}">{{ $v->password }}</text>
                            @else
                                <text x="100" y="138" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="5.5" font-weight="800" fill="#94a3b8" letter-spacing="1.1">KODE VOUCHER</text>
                                <text x="100" y="154" text-anchor="middle" font-family="'IBM Plex Mono', monospace" font-size="13" font-weight="700" fill="{{ $theme['ink'] }}" letter-spacing="0.6">{{ $v->username }}</text>
                            @endif

                            <!-- Validity chip -->
                            <rect x="10" y="{{ $isDualCredential ? 170 : 164 }}" width="180" height="14" rx="7" fill="{{ $theme['accent'] }}" opacity="0.42"/>
                            <text x="100" y="{{ $isDualCredential ? 180 : 174 }}" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="6.5" font-weight="700" fill="{{ $theme['dark'] }}">Masa aktif: {{ $validityLabel }}</text>

                            <!-- Tear line -->
                            <line x1="10" y1="{{ $isDualCredential ? 190 : 184 }}" x2="190" y2="{{ $isDualCredential ? 190 : 184 }}" stroke="{{ $theme['primary'] }}" stroke-width="0.8" stroke-dasharray="2.5,2.5" opacity="0.45"/>

                            <!-- Login guide -->
                            <rect x="10" y="{{ $isDualCredential ? 194 : 188 }}" width="180" height="52" rx="6" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.7"/>
                            <text x="16" y="{{ $isDualCredential ? 204 : 198 }}" font-family="'Plus Jakarta Sans', sans-serif" font-size="6.5" font-weight="800" fill="{{ $theme['dark'] }}" letter-spacing="0.6">CARA LOGIN</text>

                            <text x="16" y="{{ $isDualCredential ? 214 : 208 }}" font-family="'Plus Jakarta Sans', sans-serif" font-size="5.8" font-weight="600" fill="{{ $theme['ink'] }}">1. Hubungkan WiFi <tspan font-weight="800">{{ $wifiShort }}</tspan></text>
                            <text x="16" y="{{ $isDualCredential ? 223 : 217 }}" font-family="'Plus Jakarta Sans', sans-serif" font-size="5.8" font-weight="600" fill="{{ $theme['ink'] }}">2. Buka browser, ketik <tspan font-family="'IBM Plex Mono', monospace" font-weight="700">{{ $loginHost }}</tspan></text>
                            @if ($isDualCredential)
                                <text x="16" y="232" font-family="'Plus Jakarta Sans', sans-serif" font-size="5.8" font-weight="600" fill="{{ $theme['ink'] }}">3. Isi Username &amp; Password seperti di atas</text>
                                <text x="16" y="241" font-family="'Plus Jakarta Sans', sans-serif" font-size="5.8" font-weight="600" fill="{{ $theme['ink'] }}">4. Klik <tspan font-weight="800">Login</tspan> / <tspan font-weight="800">Masuk</tspan> untuk internet</text>
                            @else
                                <text x="16" y="{{ $isDualCredential ? 232 : 226 }}" font-family="'Plus Jakarta Sans', sans-serif" font-size="5.8" font-weight="600" fill="{{ $theme['ink'] }}">3. Isi <tspan font-weight="800">Username</tspan> &amp; <tspan font-weight="800">Password</tspan> dengan kode di atas</text>
                                <text x="16" y="{{ $isDualCredential ? 241 : 235 }}" font-family="'Plus Jakarta Sans', sans-serif" font-size="5.8" font-weight="600" fill="{{ $theme['ink'] }}">4. Klik <tspan font-weight="800">Login</tspan> / <tspan font-weight="800">Masuk</tspan> untuk internet</text>
                            @endif

                            <!-- Footer -->
                            <rect x="1" y="246" width="198" height="13" fill="{{ $theme['dark'] }}" opacity="0.88"/>
                            @if (!empty($branding['company_phone']))
                                <text x="100" y="255" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="5.5" font-weight="700" fill="#ffffff">Bantuan: {{ $branding['company_phone'] }}</text>
                            @else
                                <text x="100" y="255" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="5.5" font-weight="700" fill="#ffffff">Masa aktif {{ $validityLabel }}</text>
                            @endif
                        </g>
                    </svg>
                </div>
            @endforeach
        </div>
    @endforeach

    <script>
        document.querySelectorAll('.voucher-svg').forEach(svg => {
            const qrValue = svg.getAttribute('data-qr-value');
            const qrImage = svg.querySelector('.qr-image');
            const tempCanvas = document.createElement('canvas');

            new QRious({
                element: tempCanvas,
                value: qrValue,
                size: 180,
                level: 'M'
            });

            const dataUrl = tempCanvas.toDataURL();
            qrImage.setAttribute('href', dataUrl);
            qrImage.setAttribute('xlink:href', dataUrl);
        });
    </script>
</body>
</html>
