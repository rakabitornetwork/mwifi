@php
$brandName = $branding['company_name'] ?? $branding['app_name'] ?? 'Hotspot';
$loginDisplay = preg_replace('#^https?://#', '', rtrim($loginUrl, '/'));

function formatValidityIndonesian($validity) {
    if (!$validity || strtolower($validity) === 'unlimited') {
        return 'Unlimited';
    }

    $units = [
        'w' => ' Minggu',
        'd' => ' Hari',
        'h' => ' Jam',
        'm' => ' Menit',
        's' => ' Detik'
    ];

    $formatted = preg_replace_callback('/(\d+)([wdhms])/i', function ($matches) use ($units) {
        $value = $matches[1];
        $unit = strtolower($matches[2]);
        return $value . ($units[$unit] ?? $matches[2]) . ' ';
    }, $validity);

    return preg_replace('/\s+/', ' ', trim($formatted));
}

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
            padding: 5.5mm 1.2mm;
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            grid-template-rows: repeat(8, 1fr);
            column-gap: 0.25mm;
            row-gap: 0.45mm;
            margin-bottom: 18px;
            box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12);
            border: 1px solid #e2e8f0;
            page-break-after: always;
            page-break-inside: avoid;
        }

        .voucher-card {
            display: flex;
            align-items: stretch;
            justify-content: stretch;
            overflow: hidden;
            padding: 0;
            min-width: 0;
            min-height: 0;
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
                    <br>Grid 7×8 · gap minimal · QR besar · masa aktif menonjol
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
                    $validityDisplay = formatValidityIndonesian($validityLabel);
                    $loginHost = \Illuminate\Support\Str::limit($loginDisplay, 14, '…');
                @endphp
                <div class="voucher-card">
                    <svg class="voucher-svg" data-qr-value="{{ $qrVal }}" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <filter id="shadow-{{ $v->id }}" x="-10%" y="-10%" width="120%" height="120%">
                                <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#0f172a" flood-opacity="0.07"/>
                            </filter>
                            <linearGradient id="bg-{{ $v->id }}" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="{{ $theme['bg_start'] }}"/>
                                <stop offset="100%" stop-color="{{ $theme['bg_end'] }}"/>
                            </linearGradient>
                            <linearGradient id="hdr-{{ $v->id }}" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="{{ $theme['header_start'] }}"/>
                                <stop offset="100%" stop-color="{{ $theme['header_end'] }}"/>
                            </linearGradient>
                            <clipPath id="clip-{{ $v->id }}">
                                <rect x="0.5" y="0.5" width="199" height="259" rx="7"/>
                            </clipPath>
                        </defs>

                        <rect x="0.5" y="0.5" width="199" height="259" rx="7" fill="url(#bg-{{ $v->id }})" stroke="{{ $theme['primary'] }}" stroke-width="0.9"/>

                        <g clip-path="url(#clip-{{ $v->id }})">
                            <!-- Header — judul & harga sejajar satu baris -->
                            <rect x="0.5" y="0.5" width="199" height="40" fill="url(#hdr-{{ $v->id }})"/>
                            <text x="8" y="14" font-family="'Plus Jakarta Sans', sans-serif" font-size="6.2" font-weight="700" fill="#ffffff" opacity="0.9" letter-spacing="1">VOUCHER</text>
                            <text x="8" y="33" font-family="'Plus Jakarta Sans', sans-serif" font-size="11.5" font-weight="800" fill="#ffffff" letter-spacing="0.15">{{ strtoupper($wifiShort) }}</text>
                            <text x="192" y="33" text-anchor="end" font-family="'Plus Jakarta Sans', sans-serif" font-size="11.5" font-weight="800" fill="#ffffff">Rp {{ number_format($v->price, 0, ',', '.') }}</text>

                            <!-- QR -->
                            <rect x="50" y="44" width="100" height="100" rx="6" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.7" filter="url(#shadow-{{ $v->id }})"/>
                            <image class="qr-image" x="53" y="47" width="94" height="94"/>

                            <!-- Kode voucher tanpa label -->
                            <rect x="6" y="147" width="188" height="{{ $isDualCredential ? '36' : '28' }}" rx="5" fill="#ffffff" stroke="#e2e8f0" stroke-width="0.7"/>

                            @if ($isDualCredential)
                                <text x="100" y="161" text-anchor="middle" font-family="'IBM Plex Mono', monospace" font-size="12.5" font-weight="700" fill="{{ $theme['ink'] }}">{{ $v->username }}</text>
                                <line x1="12" y1="166" x2="188" y2="166" stroke="#f1f5f9" stroke-width="0.7"/>
                                <text x="100" y="178" text-anchor="middle" font-family="'IBM Plex Mono', monospace" font-size="12.5" font-weight="700" fill="{{ $theme['ink'] }}">{{ $v->password }}</text>
                            @else
                                <text x="100" y="166" text-anchor="middle" font-family="'IBM Plex Mono', monospace" font-size="16" font-weight="700" fill="{{ $theme['ink'] }}" letter-spacing="0.6">{{ $v->username }}</text>
                            @endif

                            <!-- Masa aktif — satu baris sejajar -->
                            <rect x="6" y="{{ $isDualCredential ? '185' : '178' }}" width="188" height="22" rx="6" fill="{{ $theme['header_end'] }}"/>
                            <text x="100" y="{{ $isDualCredential ? '197' : '190' }}" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="9.5" font-weight="700" fill="#ffffff" letter-spacing="0.4" dominant-baseline="middle">
                                MASA AKTIF · <tspan font-size="11" font-weight="800" letter-spacing="0.2">{{ $validityDisplay }}</tspan>
                            </text>

                            <!-- Petunjuk singkat — extra besar -->
                            <text x="100" y="{{ $isDualCredential ? '218' : '210' }}" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="10.5" font-weight="800" fill="{{ $theme['dark'] }}">Scan QR · {{ $loginHost }}</text>
                            <text x="100" y="{{ $isDualCredential ? '230' : '222' }}" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="10" font-weight="800" fill="{{ $theme['muted'] }}">WiFi {{ strtoupper($wifiShort) }}</text>

                            <!-- Footer — nomor kontak extra besar -->
                            <rect x="0.5" y="236" width="199" height="23" fill="{{ $theme['dark'] }}" opacity="0.92"/>
                            @if (!empty($branding['company_phone']))
                                <text x="100" y="251" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="11" font-weight="800" fill="#ffffff" letter-spacing="0.4">{{ $branding['company_phone'] }}</text>
                            @else
                                <text x="100" y="251" text-anchor="middle" font-family="'Plus Jakarta Sans', sans-serif" font-size="9.5" font-weight="700" fill="#ffffff">{{ $brandName }}</text>
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
                size: 280,
                level: 'M'
            });

            const dataUrl = tempCanvas.toDataURL();
            qrImage.setAttribute('href', dataUrl);
            qrImage.setAttribute('xlink:href', dataUrl);
        });
    </script>
</body>
</html>
