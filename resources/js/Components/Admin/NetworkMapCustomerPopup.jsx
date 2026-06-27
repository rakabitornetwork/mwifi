import { useId } from 'react';
import OntWifiPanel from '../OntWifiPanel';
import CustomerTrafficSpeedometer from '../CustomerTrafficSpeedometer';
import { formatRupiah } from '../../utils/formatRupiah';
import { parseBandwidthLimit, resolveOntMetrics, resolveTrafficMetrics } from '../../utils/customerMetrics';
import { mapPopupStatusVariant, mapPopupRxClass } from '../../utils/networkMapPopup';

function MapPopupSection({ title, iconSvg, children }) {
    return (
        <section className="map-popup-card">
            <div className="map-popup-card-head">
                <span className="map-popup-card-icon" dangerouslySetInnerHTML={{ __html: iconSvg }} />
                <span className="map-popup-card-title">{title}</span>
            </div>
            {children}
        </section>
    );
}

function MapPopupStat({ label, value, valueClass = '' }) {
    return (
        <div className="map-popup-stat">
            <span className="map-popup-stat-label">{label}</span>
            <span className={`map-popup-stat-value ${valueClass}`}>{value}</span>
        </div>
    );
}

function MapConnectedDevicesSection({ ont }) {
    const list = Array.isArray(ont?.connected_device_list) ? ont.connected_device_list : [];
    const count = ont?.connected_devices ?? (list.length > 0 ? list.length : null);

    if (count === null && list.length === 0) {
        return null;
    }

    return (
        <MapPopupSection
            title={`Perangkat Terhubung (${count ?? list.length})`}
            iconSvg='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>'
        >
            {list.length > 0 ? (
                <ul className="map-popup-device-list">
                    {list.map((item, index) => (
                        <li key={`${item.mac || item.name || 'device'}-${index}`} className="map-popup-device-item">
                            <div className="map-popup-device-main">
                                <p className="map-popup-device-name">{item.name || 'Perangkat'}</p>
                                <p className="map-popup-device-meta">
                                    {[item.ip, item.mac].filter(Boolean).join(' · ') || '—'}
                                </p>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="map-popup-device-empty">
                    {count} perangkat terdeteksi. Detail nama belum dilaporkan oleh ONT.
                </p>
            )}
        </MapPopupSection>
    );
}

const ICON_PACKAGE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7.6 12 12.8l8.7-5.2"/><path d="M12 22.8V12.7"/></svg>';
const ICON_NETWORK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>';
const ICON_WIFI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.5a14 14 0 0 1 14 0"/><path d="M8.5 15.5a9 9 0 0 1 7 0"/><path d="M12 19h.01"/><path d="M2 8.5a20 20 0 0 1 20 0"/></svg>';
const ICON_TRAFFIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/></svg>';

export default function NetworkMapCustomerPopup({
    customer,
    metrics = {},
    canWrite = false,
    onWifiUpdated,
}) {
    const gaugeScope = useId().replace(/:/g, '');
    const ont = resolveOntMetrics(metrics, customer?.username);
    const traffic = resolveTrafficMetrics(metrics, customer);
    const metricsLoaded = metrics && (Object.keys(metrics.ont || {}).length > 0 || (metrics.ont_devices || []).length > 0);
    const pkg = customer?.package || {};
    const bandwidth = parseBandwidthLimit(pkg.bandwidth_limit);
    const isOnline = !!traffic.online;
    const statusMeta = mapPopupStatusVariant(customer?.status);
    const odpName = customer?.odp?.name || '-';
    const rxText = ont.rx || (metricsLoaded ? 'Tidak tersedia' : 'Memuat...');
    const rxStatus = ont.status || 'offline';
    const displayOrDash = (val) => (val === null || val === undefined || val === '' ? '—' : val);
    const initial = String(customer?.name || '?').charAt(0).toUpperCase();

    const mapPopupTheme = {
        isDarkMode: false,
        themeTextTitle: 'text-zinc-900',
        themeTextSub: 'text-zinc-600',
        themeTextDesc: 'text-zinc-500',
    };

    return (
        <>
            <header className="map-popup-header">
                <div className="map-popup-header-inner">
                    <div className="map-popup-header-leading">
                        <span className="map-popup-header-monogram" aria-hidden="true">{initial}</span>
                        <div className="map-popup-header-copy">
                            <h3 className="map-popup-header-title">{customer?.name}</h3>
                            <p className="map-popup-header-subtitle">{customer?.username}</p>
                        </div>
                    </div>
                    <div className="map-popup-header-trailing">
                        <span className={`map-popup-badge map-popup-badge--${statusMeta.variant}`}>{statusMeta.label}</span>
                        <span className={`map-popup-badge map-popup-badge--${isOnline ? 'online' : 'offline'}`}>
                            <span className="map-popup-badge-dot" aria-hidden="true" />
                            {isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>
            </header>

            <div className="map-popup-body">
                <MapPopupSection title="Paket & Tagihan" iconSvg={ICON_PACKAGE}>
                    <div className="map-popup-stats-grid">
                        <MapPopupStat label="Paket" value={displayOrDash(pkg.name)} />
                        <MapPopupStat
                            label="Harga / bulan"
                            value={pkg.price ? formatRupiah(pkg.price) : '—'}
                            valueClass="map-popup-stat-value--accent"
                        />
                        <MapPopupStat label="Bandwidth" value={displayOrDash(pkg.bandwidth_limit)} />
                        <MapPopupStat label="Titik ODP" value={odpName} />
                    </div>
                </MapPopupSection>

                <MapPopupSection title="ONT & Jaringan" iconSvg={ICON_NETWORK}>
                    <div className="map-popup-stats-grid">
                        <MapPopupStat label="Redaman" value={rxText} valueClass={mapPopupRxClass(rxStatus)} />
                        <MapPopupStat label="Suhu ONT" value={displayOrDash(ont.temperature)} />
                        <MapPopupStat label="Product Class" value={displayOrDash(ont.product_class || ont.model)} />
                    </div>
                </MapPopupSection>

                <MapConnectedDevicesSection ont={ont} />

                <MapPopupSection title="Traffic Langsung" iconSvg={ICON_TRAFFIC}>
                    <div className="map-speedometer-grid map-speedometer-grid--animated">
                        <CustomerTrafficSpeedometer
                            label="Download"
                            bps={traffic.download_bps || 0}
                            maxMbps={bandwidth.down}
                            type="down"
                            isDarkMode={false}
                            gaugeId={`${gaugeScope}-down`}
                        />
                        <CustomerTrafficSpeedometer
                            label="Upload"
                            bps={traffic.upload_bps || 0}
                            maxMbps={bandwidth.up}
                            type="up"
                            isDarkMode={false}
                            gaugeId={`${gaugeScope}-up`}
                        />
                    </div>
                </MapPopupSection>

                <MapPopupSection title="WiFi ONT" iconSvg={ICON_WIFI}>
                    <div className="map-popup-wifi-panel">
                        <OntWifiPanel
                            apiBase="/admin/gpon"
                            customerId={customer?.id}
                            username={customer?.username}
                            canWrite={canWrite}
                            showReboot
                            compact
                            bare
                            theme={mapPopupTheme}
                            onUpdated={onWifiUpdated}
                        />
                    </div>
                </MapPopupSection>

                <footer className="map-popup-footer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
                        <circle cx="12" cy="10" r="2.5" />
                    </svg>
                    <span>{customer?.address || '—'}</span>
                </footer>
            </div>
        </>
    );
}
