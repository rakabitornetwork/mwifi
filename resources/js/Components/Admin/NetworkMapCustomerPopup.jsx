import { useId } from 'react';
import OntWifiPanel from '../OntWifiPanel';
import CustomerTrafficSpeedometer from '../CustomerTrafficSpeedometer';
import { formatRupiah } from '../../utils/formatRupiah';
import { parseBandwidthLimit, resolveOntMetrics, resolveTrafficMetrics } from '../../utils/customerMetrics';
import { mapPopupStatusVariant, mapPopupRxClass } from '../../utils/networkMapPopup';

function MapPopupSection({ title, iconSvg, accent, children }) {
    return (
        <section className="map-popup-card">
            <div className={`map-popup-card-head map-popup-card-head--${accent}`}>
                <span className="map-popup-card-icon" dangerouslySetInnerHTML={{ __html: iconSvg }} />
                <span className="map-popup-card-title">{title}</span>
            </div>
            <div className="map-popup-card-inner">
                {children}
            </div>
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
            accent="devices"
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

function formatWaNumber(phone) {
    if (!phone) return '';
    let clean = phone.replace(/\D/g, ''); // keep digits only
    if (clean.startsWith('0')) {
        clean = '62' + clean.slice(1);
    }
    return clean;
}

function calculateHaversineDistance(coords1, coords2) {
    if (!coords1 || !coords2) return 0;
    const [lat1, lon1] = coords1;
    const [lat2, lon2] = coords2;
    
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
}

function calculatePathLength(odpCoords, customerCoords, cablePath = []) {
    if (!odpCoords || !customerCoords) return 0;
    const points = [odpCoords, ...cablePath, customerCoords];
    let totalDistance = 0;
    for (let i = 0; i < points.length - 1; i++) {
        totalDistance += calculateHaversineDistance(points[i], points[i+1]);
    }
    return totalDistance;
}

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

    const odp = customer?.odp;
    const odpCoords = odp?.latitude && odp?.longitude 
        ? [parseFloat(odp.latitude), parseFloat(odp.longitude)] 
        : null;
    const customerCoords = customer?.latitude && customer?.longitude 
        ? [parseFloat(customer.latitude), parseFloat(customer.longitude)] 
        : null;

    const hasCustomPath = Array.isArray(customer?.cable_path) && customer.cable_path.length > 0;
    const straightDistance = odpCoords && customerCoords 
        ? calculateHaversineDistance(odpCoords, customerCoords) 
        : 0;
    const cableDistance = odpCoords && customerCoords 
        ? calculatePathLength(odpCoords, customerCoords, customer.cable_path) 
        : 0;

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
                
                {/* Quick Action Buttons */}
                <div className="flex gap-2 mt-3 px-3 pb-2 border-b border-zinc-150/60 dark:border-zinc-800/60">
                    {customer?.phone_number && (
                        <a
                            href={`https://wa.me/${formatWaNumber(customer.phone_number)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 !text-white rounded-lg font-bold text-[9px] text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                        >
                            <svg className="w-3.5 h-3.5 fill-current !text-white" viewBox="0 0 24 24">
                                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.45 5.489 0 9.954-4.41 9.957-9.829.002-2.624-1.013-5.093-2.86-6.945-1.848-1.853-4.299-2.875-6.93-2.877-5.484 0-9.95 4.407-9.952 9.826-.001 1.748.497 3.4 1.44 4.9l-.994 3.63 3.714-.955zm11.367-7.854c-.29-.145-1.71-.844-1.97-.938-.26-.095-.45-.145-.64.145-.19.29-.73.938-.9 1.129-.17.19-.34.217-.63.072-.29-.145-1.223-.45-2.33-1.439-.86-.767-1.44-1.716-1.61-2.006-.17-.29-.018-.448.127-.592.13-.13.29-.34.435-.51.145-.17.193-.29.29-.48.096-.19.048-.36-.024-.51-.072-.145-.64-1.54-.877-2.11-.23-.56-.465-.482-.64-.492-.166-.01-.355-.01-.545-.01-.19 0-.5.07-.76.357-.26.29-1 .978-1 2.387 0 1.41 1.02 2.769 1.16 2.96.14.19 2.01 3.067 4.87 4.3 1.833.79 2.625.86 3.56.72.935-.14 1.71-.69 1.95-1.34.24-.65.24-1.2.17-1.34-.07-.14-.26-.22-.55-.365z"/>
                            </svg>
                            <span className="!text-white">WhatsApp</span>
                        </a>
                    )}
                    {customer?.latitude && customer?.longitude && (
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${customer.latitude},${customer.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 !text-white rounded-lg font-bold text-[9px] text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                        >
                            <svg className="w-3.5 h-3.5 fill-current !text-white" viewBox="0 0 24 24">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            <span className="!text-white">Rute Map</span>
                        </a>
                    )}
                </div>
            </header>

            <div className="map-popup-body">
                <MapPopupSection title="Paket & Tagihan" accent="package" iconSvg={ICON_PACKAGE}>
                    <div className="map-popup-stats-grid">
                        <MapPopupStat label="Paket" value={displayOrDash(pkg.name)} />
                        <MapPopupStat
                            label="Harga / bulan"
                            value={pkg.price ? formatRupiah(pkg.price) : '—'}
                            valueClass="map-popup-stat-value--accent"
                        />
                        <MapPopupStat label="Bandwidth" value={displayOrDash(pkg.bandwidth_limit)} />
                        <MapPopupStat label="Titik ODP" value={odpName} />
                        {odpCoords && customerCoords && (
                            <>
                                <MapPopupStat 
                                    label="Jarak Kabel" 
                                    value={`${cableDistance.toFixed(1)} m`} 
                                    valueClass="map-popup-stat-value--accent font-bold" 
                                />
                                {hasCustomPath && (
                                    <MapPopupStat 
                                        label="Jarak Udara" 
                                        value={`${straightDistance.toFixed(1)} m`} 
                                    />
                                )}
                            </>
                        )}
                    </div>
                </MapPopupSection>

                <MapPopupSection title="ONT & Jaringan" accent="network" iconSvg={ICON_NETWORK}>
                    <div className="map-popup-stats-grid">
                        <MapPopupStat label="Redaman" value={rxText} valueClass={mapPopupRxClass(rxStatus)} />
                        <MapPopupStat label="Suhu ONT" value={displayOrDash(ont.temperature)} />
                        <MapPopupStat label="Product Class" value={displayOrDash(ont.product_class || ont.model)} />
                    </div>
                </MapPopupSection>

                <MapConnectedDevicesSection ont={ont} />

                <MapPopupSection title="Traffic Langsung" accent="traffic" iconSvg={ICON_TRAFFIC}>
                    <div className="map-speedometer-grid map-speedometer-grid--animated">
                        <CustomerTrafficSpeedometer
                            label="Download"
                            bps={traffic.download_bps || 0}
                            maxMbps={bandwidth.down}
                            type="down"
                            isDarkMode={false}
                            compact
                            gaugeId={`${gaugeScope}-down`}
                        />
                        <CustomerTrafficSpeedometer
                            label="Upload"
                            bps={traffic.upload_bps || 0}
                            maxMbps={bandwidth.up}
                            type="up"
                            isDarkMode={false}
                            compact
                            gaugeId={`${gaugeScope}-up`}
                        />
                    </div>
                </MapPopupSection>

                <MapPopupSection title="WiFi ONT" accent="wifi" iconSvg={ICON_WIFI}>
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
