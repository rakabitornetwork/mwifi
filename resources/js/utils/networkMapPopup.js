import { formatRupiah } from './formatRupiah';

export function escapeMapHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function parseBandwidthLimit(limit) {
    if (!limit) return { down: 0, up: 0 };
    const parts = String(limit).split('/');
    const parsePart = (part) => {
        const normalized = String(part || '').trim().toUpperCase();
        const num = parseFloat(normalized);
        if (Number.isNaN(num)) return 0;
        if (normalized.includes('G')) return num * 1000;
        if (normalized.includes('K')) return num / 1000;
        return num;
    };
    return {
        down: parsePart(parts[0]),
        up: parsePart(parts[1] ?? parts[0]),
    };
}

function formatSpeedBps(bps) {
    const value = Number(bps) || 0;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} Mbps`;
    if (value >= 1_000) return `${Math.round(value / 1_000)} Kbps`;
    return `${Math.round(value)} bps`;
}

function resolveOntMetrics(metrics, username) {
    if (!username) return {};

    const ontMap = metrics?.ont || {};
    const directKeys = [
        username,
        String(username).split('@')[0],
        String(username).toLowerCase(),
        String(username).split('@')[0].toLowerCase(),
    ];

    for (const key of directKeys) {
        if (key && ontMap[key]) {
            return ontMap[key];
        }
    }

    const lower = String(username).toLowerCase();
    const base = lower.split('@')[0];

    for (const [key, device] of Object.entries(ontMap)) {
        const keyLower = String(key).toLowerCase();
        const keyBase = keyLower.split('@')[0];

        if (keyLower === lower || keyBase === base) {
            return device;
        }
    }

    const devices = metrics?.ont_devices || [];
    return devices.find((device) => {
        const ontUser = String(device.username || '').toLowerCase();
        if (!ontUser || ontUser === 'unknown_ont') return false;
        return ontUser === lower || ontUser.split('@')[0] === base;
    }) || {};
}

function mapPopupBadge(text, variant = 'neutral') {
    return `<span class="map-popup-badge map-popup-badge--${variant}">${escapeMapHtml(text)}</span>`;
}

function mapPopupStat(label, value, valueClass = '') {
    return `
        <div class="map-popup-stat">
            <span class="map-popup-stat-label">${escapeMapHtml(label)}</span>
            <span class="map-popup-stat-value ${valueClass}">${value}</span>
        </div>
    `;
}

function mapPopupSection(title, iconSvg, bodyHtml) {
    return `
        <section class="map-popup-card">
            <div class="map-popup-card-head">
                <span class="map-popup-card-icon">${iconSvg}</span>
                <span class="map-popup-card-title">${escapeMapHtml(title)}</span>
            </div>
            ${bodyHtml}
        </section>
    `;
}

function mapPopupStatusVariant(status) {
    if (status === 'active') return { label: 'Aktif', variant: 'success' };
    if (status === 'isolated') return { label: 'Isolir', variant: 'warning' };
    if (status === 'suspended') return { label: 'Suspend', variant: 'danger' };
    return { label: 'Nonaktif', variant: 'neutral' };
}

function mapPopupRxClass(status) {
    if (status === 'good') return 'map-popup-stat-value--good';
    if (status === 'warning') return 'map-popup-stat-value--warn';
    if (status === 'critical') return 'map-popup-stat-value--bad';
    return '';
}

function buildSpeedometerGauge(label, bps, maxMbps, type) {
    const maxBps = maxMbps > 0 ? maxMbps * 1_000_000 : 0;
    const pct = maxBps > 0 ? Math.min(100, ((Number(bps) || 0) / maxBps) * 100) : 0;
    const cx = 50;
    const cy = 48;
    const radius = 36;
    const arcLength = Math.PI * radius;
    const dash = (pct / 100) * arcLength;
    const needleAngle = 180 - (pct / 100) * 180;
    const needleRad = (needleAngle * Math.PI) / 180;
    const needleLen = radius - 10;
    const needleX = cx + needleLen * Math.cos(needleRad);
    const needleY = cy - needleLen * Math.sin(needleRad);
    const stroke = type === 'down' ? '#059669' : '#2563eb';
    const strokeSoft = type === 'down' ? '#34d399' : '#60a5fa';
    const maxLabel = maxMbps > 0 ? `${maxMbps}M` : 'N/A';
    const midLabel = maxMbps > 0 ? `${Math.round(maxMbps / 2)}M` : '';

    return `
        <div class="map-speedometer map-speedometer--${type}">
            <div class="map-speedometer-shell">
                <svg viewBox="0 0 100 62" class="map-speedometer-svg" aria-hidden="true">
                    <defs>
                        <linearGradient id="gauge-grad-${type}" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stop-color="${stroke}" />
                            <stop offset="100%" stop-color="${strokeSoft}" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M 14 48 A 36 36 0 0 1 86 48"
                        fill="none"
                        stroke="#e4e4e7"
                        stroke-width="6"
                        stroke-linecap="round"
                        opacity="0.9"
                    />
                    <path
                        d="M 14 48 A 36 36 0 0 1 86 48"
                        fill="none"
                        stroke="url(#gauge-grad-${type})"
                        stroke-width="6"
                        stroke-linecap="round"
                        stroke-dasharray="${dash.toFixed(2)} ${arcLength.toFixed(2)}"
                        class="map-speedometer-arc"
                    />
                    <line x1="${cx}" y1="${cy}" x2="${needleX.toFixed(2)}" y2="${needleY.toFixed(2)}" stroke="${stroke}" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
                    <circle cx="${cx}" cy="${cy}" r="3" fill="#fff" stroke="${stroke}" stroke-width="1.5"/>
                    <text x="8" y="58" font-size="5.5" fill="#94a3b8" font-weight="600">0</text>
                    <text x="46" y="11" font-size="5.5" fill="#94a3b8" font-weight="600">${midLabel}</text>
                    <text x="82" y="58" font-size="5.5" fill="#94a3b8" font-weight="600">${maxLabel}</text>
                </svg>
            </div>
            <p class="map-speedometer-label">${label}</p>
            <p class="map-speedometer-value">${formatSpeedBps(bps)}</p>
        </div>
    `;
}

function resolveTrafficMetrics(metrics, cust) {
    const username = cust?.username;
    if (!username) return {};

    const routerMap = metrics?.traffic_by_router?.[String(cust.router_id)]
        || metrics?.traffic_by_router?.[cust.router_id];
    const trafficMap = routerMap || metrics?.traffic || {};

    const directKeys = [
        username,
        String(username).split('@')[0],
        String(username).toLowerCase(),
        String(username).split('@')[0].toLowerCase(),
    ];

    for (const key of directKeys) {
        if (key && trafficMap[key]) {
            return trafficMap[key];
        }
    }

    const lower = String(username).toLowerCase();
    const base = lower.split('@')[0];

    for (const [key, entry] of Object.entries(trafficMap)) {
        const keyLower = String(key).toLowerCase();
        const keyBase = keyLower.split('@')[0];
        if (keyLower === lower || keyBase === base) {
            return entry;
        }
    }

    return {};
}

export function getCustomerPopupOptions() {
    const mobile = window.matchMedia('(max-width: 639px)').matches;

    return {
        maxWidth: mobile ? 292 : 400,
        minWidth: mobile ? 268 : 340,
        maxHeight: Math.min(Math.round(window.innerHeight * 0.48), 380),
        autoPanPadding: mobile ? [32, 20] : [48, 48],
        className: 'customer-detail-popup',
    };
}

export function buildCustomerMapPopup(cust, metrics = {}) {
    const ont = resolveOntMetrics(metrics, cust.username);
    const traffic = resolveTrafficMetrics(metrics, cust);
    const metricsLoaded = metrics && (Object.keys(metrics.ont || {}).length > 0 || (metrics.ont_devices || []).length > 0);
    const pkg = cust.package || {};
    const bandwidth = parseBandwidthLimit(pkg.bandwidth_limit);
    const isOnline = !!traffic.online;
    const statusMeta = mapPopupStatusVariant(cust.status);
    const odpName = cust.odp?.name || '-';
    const rxText = ont.rx || (metricsLoaded ? 'Tidak tersedia' : 'Memuat...');
    const rxStatus = ont.status || 'offline';
    const displayOrDash = (val) => (val === null || val === undefined || val === '') ? '—' : escapeMapHtml(val);
    const initial = escapeMapHtml(String(cust.name || '?').charAt(0).toUpperCase());
    const serviceLabel = escapeMapHtml(String(cust.service_type || 'pppoe').toUpperCase());

    const iconPackage = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7.6 12 12.8l8.7-5.2"/><path d="M12 22.8V12.7"/></svg>';
    const iconNetwork = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>';
    const iconWifi = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.5a14 14 0 0 1 14 0"/><path d="M8.5 15.5a9 9 0 0 1 7 0"/><path d="M12 19h.01"/><path d="M2 8.5a20 20 0 0 1 20 0"/></svg>';
    const iconTraffic = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/></svg>';

    return `
        <div class="map-popup-customer" data-customer-id="${cust.id}">
            <header class="map-popup-hero">
                <div class="map-popup-hero-glow"></div>
                <div class="map-popup-hero-row">
                    <div class="map-popup-avatar">${initial}</div>
                    <div class="map-popup-hero-text">
                        <h3 class="map-popup-name">${escapeMapHtml(cust.name)}</h3>
                        <p class="map-popup-sub">${escapeMapHtml(cust.username)} · ${serviceLabel}</p>
                    </div>
                </div>
                <div class="map-popup-badges">
                    ${mapPopupBadge(statusMeta.label, statusMeta.variant)}
                    ${mapPopupBadge(isOnline ? 'Online' : 'Offline', isOnline ? 'online' : 'offline')}
                </div>
            </header>

            <div class="map-popup-body">
                ${mapPopupSection('Paket & Tagihan', iconPackage, `
                    <div class="map-popup-stats-grid">
                        ${mapPopupStat('Paket', displayOrDash(pkg.name))}
                        ${mapPopupStat('Harga / bulan', pkg.price ? formatRupiah(pkg.price) : '—', 'map-popup-stat-value--accent')}
                        ${mapPopupStat('Bandwidth', displayOrDash(pkg.bandwidth_limit))}
                        ${mapPopupStat('Titik ODP', escapeMapHtml(odpName))}
                    </div>
                `)}

                ${mapPopupSection('ONT & Jaringan', iconNetwork, `
                    <div class="map-popup-stats-grid">
                        ${mapPopupStat('Redaman', escapeMapHtml(rxText), mapPopupRxClass(rxStatus))}
                        ${mapPopupStat('Suhu ONT', displayOrDash(ont.temperature))}
                        ${mapPopupStat('Perangkat WiFi', ont.connected_devices !== null && ont.connected_devices !== undefined ? `${ont.connected_devices} unit` : '—')}
                        ${mapPopupStat('Product Class', displayOrDash(ont.product_class || ont.model))}
                    </div>
                `)}

                ${mapPopupSection('WiFi Pelanggan', iconWifi, `
                    <div class="map-popup-credential-grid">
                        <div class="map-popup-credential">
                            <span class="map-popup-stat-label">Nama WiFi</span>
                            <span class="map-popup-credential-value">${displayOrDash(ont.wifi_ssid)}</span>
                        </div>
                        <div class="map-popup-credential">
                            <span class="map-popup-stat-label">Sandi WiFi</span>
                            <span class="map-popup-credential-value">${displayOrDash(ont.wifi_password)}</span>
                        </div>
                    </div>
                `)}

                ${mapPopupSection('Traffic Langsung', iconTraffic, `
                    <div class="map-speedometer-grid">
                        ${buildSpeedometerGauge('Download', traffic.download_bps || 0, bandwidth.down, 'down')}
                        ${buildSpeedometerGauge('Upload', traffic.upload_bps || 0, bandwidth.up, 'up')}
                    </div>
                `)}

                <footer class="map-popup-footer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
                    <span>${escapeMapHtml(cust.address)}</span>
                </footer>
            </div>
        </div>
    `;
}
