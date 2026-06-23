import { useEffect, useRef, useState, useId } from 'react';
import { router } from '@inertiajs/react';
import { Edit, Map, Plus, Search, Trash2, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import ModalFormActions from '../../../Components/Admin/ModalFormActions';
import TransitionModal from '../../../Components/Admin/TransitionModal';
import GpsCoordinateFields from '../../../Components/GpsCoordinateFields';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';
import { readDeviceCoordinates } from '../../../utils/deviceGps';
import { buildCustomerMapPopup, getCustomerPopupOptions } from '../../../utils/networkMapPopup';

const isPppoeCustomer = (cust) => cust?.service_type !== 'hotspot';

const isMobileViewport = () => window.matchMedia('(max-width: 639px)').matches;

const LONG_PRESS_MS = 600;

function buildMiniOdpFormHtml(lat, lng) {
    return `
        <form id="mini-odp-form" class="p-2 space-y-3 w-56 font-sans text-zinc-800 leading-normal">
            <div class="flex items-center gap-1.5 border-b border-zinc-100 pb-2">
                <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span class="font-extrabold text-[11px] text-zinc-900 tracking-wider uppercase">Tambah ODP Baru</span>
            </div>
            
            <div class="space-y-2">
                <div class="flex flex-col gap-1">
                    <label class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Nama ODP</label>
                    <input required id="mini-odp-name" type="text" placeholder="Contoh: ODP-IND-01" class="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-[10px] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs" style="color:#27272a !important; background-color:#ffffff !important;" />
                </div>
                
                <div class="grid grid-cols-2 gap-2">
                    <div class="flex flex-col gap-1">
                        <label class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Latitude</label>
                        <input readonly id="mini-odp-lat" type="text" value="${lat.toFixed(6)}" class="w-full px-2 py-1.5 border border-zinc-100 rounded-lg text-[9px] font-mono bg-zinc-50 text-zinc-450 focus:outline-none" style="color:#71717a !important; background-color:#f4f4f5 !important;" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Longitude</label>
                        <input readonly id="mini-odp-lng" type="text" value="${lng.toFixed(6)}" class="w-full px-2 py-1.5 border border-zinc-100 rounded-lg text-[9px] font-mono bg-zinc-50 text-zinc-450 focus:outline-none" style="color:#71717a !important; background-color:#f4f4f5 !important;" />
                    </div>
                </div>
                
                <div class="flex flex-col gap-1">
                    <label class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Jumlah Port</label>
                    <input required id="mini-odp-ports" type="number" min="1" value="8" class="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-[10px] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs" style="color:#27272a !important; background-color:#ffffff !important;" />
                </div>
                
                <div class="flex flex-col gap-1">
                    <label class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Deskripsi Lokasi</label>
                    <textarea id="mini-odp-desc" placeholder="Contoh: Depan warung..." class="w-full px-2.5 py-1.5 border border-zinc-200 rounded-lg text-[10px] h-12 resize-none transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs" style="color:#27272a !important; background-color:#ffffff !important;"></textarea>
                </div>
            </div>

            <button type="button" id="mini-odp-gps-btn" class="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-bold text-[10px] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
                Ambil GPS Perangkat
            </button>
            
            <button type="submit" class="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg font-bold text-[10px] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-1">
                Simpan ODP
            </button>
        </form>
    `;
}

function NetworkMapPageContent({ odps = [], customers = [] }) {
    const theme = useAdminTheme();
    const { showToast } = useAdminToast();
    const { isDarkMode, themeCard, themeTextTitle, themeTextSub } = theme;

    const themeInnerWidget = isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';
    const themeInput = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700'
        : 'bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300';
    const themeLabel = isDarkMode ? 'text-zinc-400' : 'text-zinc-650';

    const odpFormId = useId();

    const [showOdpModal, setShowOdpModal] = useState(false);
    const [editingOdp, setEditingOdp] = useState(null);
    const [odpSearchTerm, setOdpSearchTerm] = useState('');
    const [odpLat, setOdpLat] = useState('');
    const [odpLng, setOdpLng] = useState('');
    const [networkMapMetrics, setNetworkMapMetrics] = useState({ ont: {}, traffic: {} });

    const mapRef = useRef(null);
    const customerMarkersRef = useRef({});
    const openCustomerPopupIdRef = useRef(null);
    const networkMapMetricsRef = useRef(networkMapMetrics);
    networkMapMetricsRef.current = networkMapMetrics;

    useEffect(() => {
        if (showOdpModal) {
            setOdpLat(editingOdp ? String(editingOdp.latitude) : '');
            setOdpLng(editingOdp ? String(editingOdp.longitude) : '');
        }
    }, [showOdpModal, editingOdp]);

    const fetchNetworkMapMetrics = async () => {
        try {
            const res = await fetch('/admin/network-map/metrics');
            const data = await res.json();
            setNetworkMapMetrics(data);
        } catch (err) {
            console.error('Failed to load network map metrics', err);
        }
    };

    useEffect(() => {
        fetchNetworkMapMetrics();
        const interval = setInterval(fetchNetworkMapMetrics, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const custId = openCustomerPopupIdRef.current;
        if (!custId) return;

        const marker = customerMarkersRef.current[custId];
        const cust = customers.find((c) => c.id === custId);
        if (marker && cust && marker.isPopupOpen()) {
            marker.setPopupContent(buildCustomerMapPopup(cust, networkMapMetrics));
        }
    }, [networkMapMetrics, customers]);

    const handleOdpRowClick = (odp) => {
        if (mapRef.current && odp.latitude && odp.longitude) {
            mapRef.current.flyTo([parseFloat(odp.latitude), parseFloat(odp.longitude)], 17, {
                animate: true,
                duration: 1.2,
            });
        }
    };

    const handleSaveOdpSubmit = (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        const payload = Object.fromEntries(data.entries());

        router.post('/admin/odps/save', payload, {
            onSuccess: () => {
                setShowOdpModal(false);
                setEditingOdp(null);
            },
        });
    };

    const handleDeleteOdp = (odp) => {
        if (!confirm(`Apakah Anda yakin ingin menghapus ODP "${odp.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
        router.post('/admin/odps/delete', { id: odp.id });
    };

    const filteredOdps = odps.filter((o) =>
        o.name.toLowerCase().includes(odpSearchTerm.toLowerCase())
        || (o.description && o.description.toLowerCase().includes(odpSearchTerm.toLowerCase()))
    );

    useEffect(() => {
        const mapContainer = document.getElementById('map-container');
        if (!mapContainer) return;

        const defaultCenter = [-6.3263, 108.3201];
        const center = odps.length > 0
            ? [parseFloat(odps[0].latitude), parseFloat(odps[0].longitude)]
            : defaultCenter;

        const map = L.map('map-container', {
            center,
            zoom: 15,
            zoomControl: false,
            layers: [],
        });

        mapRef.current = map;

        L.control.zoom({ position: 'topright' }).addTo(map);

        const openMiniOdpPopup = (latlng) => {
            const { lat, lng } = latlng;
            setOdpLat(lat.toFixed(6));
            setOdpLng(lng.toFixed(6));
            setEditingOdp(null);

            L.popup()
                .setLatLng(latlng)
                .setContent(buildMiniOdpFormHtml(lat, lng))
                .openOn(map);
        };

        map.on('contextmenu', (e) => {
            L.DomEvent.preventDefault(e.originalEvent);
            if (!isMobileViewport()) {
                openMiniOdpPopup(e.latlng);
            }
        });

        let longPressTimer = null;

        const clearLongPress = () => {
            if (longPressTimer !== null) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        };

        const onTouchStart = (evt) => {
            if (!isMobileViewport() || evt.touches.length !== 1) {
                return;
            }

            const touch = evt.touches[0];
            clearLongPress();

            longPressTimer = setTimeout(() => {
                longPressTimer = null;
                const containerPoint = map.mouseEventToContainerPoint({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                });
                const latlng = map.containerPointToLatLng(containerPoint);
                navigator.vibrate?.(40);
                openMiniOdpPopup(latlng);
            }, LONG_PRESS_MS);
        };

        const onTouchMove = () => clearLongPress();
        const onTouchEnd = () => clearLongPress();
        const onTouchCancel = () => clearLongPress();

        const mapEl = map.getContainer();
        mapEl.addEventListener('touchstart', onTouchStart, { passive: true });
        mapEl.addEventListener('touchmove', onTouchMove, { passive: true });
        mapEl.addEventListener('touchend', onTouchEnd, { passive: true });
        mapEl.addEventListener('touchcancel', onTouchCancel, { passive: true });

        map.on('popupopen', (e) => {
            const popupNode = e.popup.getElement();
            if (!popupNode) return;
            const form = popupNode.querySelector('#mini-odp-form');
            if (form) {
                setTimeout(() => {
                    const nameInput = form.querySelector('#mini-odp-name');
                    if (nameInput) nameInput.focus();
                }, 100);

                form.addEventListener('submit', (evt) => {
                    evt.preventDefault();
                    const name = form.querySelector('#mini-odp-name').value;
                    const total_ports = form.querySelector('#mini-odp-ports').value;
                    const description = form.querySelector('#mini-odp-desc').value;
                    const latitude = form.querySelector('#mini-odp-lat').value;
                    const longitude = form.querySelector('#mini-odp-lng').value;

                    router.post('/admin/odps/save', {
                        name,
                        latitude,
                        longitude,
                        total_ports,
                        description,
                    }, {
                        onSuccess: () => {
                            map.closePopup();
                        },
                    });
                });

                const gpsBtn = form.querySelector('#mini-odp-gps-btn');
                if (gpsBtn) {
                    gpsBtn.addEventListener('click', async () => {
                        const defaultLabel = 'Ambil GPS Perangkat';
                        gpsBtn.disabled = true;
                        gpsBtn.textContent = 'Membaca GPS...';
                        try {
                            const coords = await readDeviceCoordinates();
                            const latInput = form.querySelector('#mini-odp-lat');
                            const lngInput = form.querySelector('#mini-odp-lng');
                            if (latInput) latInput.value = coords.latitude;
                            if (lngInput) lngInput.value = coords.longitude;
                            setOdpLat(coords.latitude);
                            setOdpLng(coords.longitude);
                            map.flyTo([parseFloat(coords.latitude), parseFloat(coords.longitude)], 17, { duration: 0.8 });
                            showToast('Koordinat GPS berhasil diambil.', 'success');
                        } catch (error) {
                            showToast(error.message || 'Gagal membaca GPS perangkat.', 'error');
                        } finally {
                            gpsBtn.disabled = false;
                            gpsBtn.textContent = defaultLabel;
                        }
                    });
                }
            }
        });

        const darkTiles = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        const lightTiles = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        const tilesUrl = isDarkMode ? darkTiles : lightTiles;

        L.tileLayer(tilesUrl, {
            attribution: '© OpenStreetMap',
        }).addTo(map);

        const odpIcon = L.divIcon({
            className: 'custom-odp-marker',
            html: '<div class="w-6 h-6 rounded-full bg-blue-500 border-2 border-white dark:border-zinc-950 flex items-center justify-center text-[8px] font-black text-white shadow-lg ring-2 ring-blue-500/25">ODP</div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        });

        const customerIcon = (status) => L.divIcon({
            className: 'custom-customer-marker',
            html: `<div class="w-3.5 h-3.5 rounded-full ${status === 'active' ? 'bg-emerald-500 ring-emerald-500/35' : 'bg-rose-500 ring-rose-500/35'} border border-white dark:border-zinc-950 shadow-md ring-2"></div>`,
            iconSize: [14, 14],
            iconAnchor: [7, 7],
        });

        const odpCoordsMap = {};

        odps.forEach((odp) => {
            const lat = parseFloat(odp.latitude);
            const lng = parseFloat(odp.longitude);
            odpCoordsMap[odp.id] = [lat, lng];

            L.marker([lat, lng], { icon: odpIcon })
                .addTo(map)
                .bindPopup(`
                    <div class="text-[11px] font-sans text-zinc-900 leading-normal p-0.5">
                        <p class="font-extrabold text-blue-600 uppercase tracking-wider">${odp.name}</p>
                        <p class="text-zinc-500 font-semibold mt-0.5">${odp.description || 'No description'}</p>
                        <div class="flex items-center gap-1.5 mt-1 pt-1 border-t border-zinc-100 font-bold text-[10px]">
                            <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            <span>Port: ${odp.customers_count ?? odp.used_ports ?? 0} / ${odp.total_ports} Terpakai</span>
                        </div>
                    </div>
                `);
        });

        customerMarkersRef.current = {};

        customers.forEach((cust) => {
            if (!isPppoeCustomer(cust)) return;
            if (!cust.latitude || !cust.longitude) return;

            const lat = parseFloat(cust.latitude);
            const lng = parseFloat(cust.longitude);

            const marker = L.marker([lat, lng], { icon: customerIcon(cust.status) })
                .addTo(map)
                .bindPopup(() => buildCustomerMapPopup(cust, networkMapMetricsRef.current), getCustomerPopupOptions());

            marker.on('popupopen', () => {
                openCustomerPopupIdRef.current = cust.id;
                marker.setPopupContent(buildCustomerMapPopup(cust, networkMapMetricsRef.current));
            });

            marker.on('popupclose', () => {
                if (openCustomerPopupIdRef.current === cust.id) {
                    openCustomerPopupIdRef.current = null;
                }
            });

            customerMarkersRef.current[cust.id] = marker;

            if (cust.odp_id && odpCoordsMap[cust.odp_id]) {
                const odpCoords = odpCoordsMap[cust.odp_id];
                const customerCoords = [lat, lng];
                const cableColor = cust.status === 'active' ? '#10b981' : '#f59e0b';

                L.polyline([odpCoords, customerCoords], {
                    color: cableColor,
                    weight: 2,
                    opacity: 0.75,
                    className: 'optical-cable-flow',
                    smoothFactor: 0,
                }).addTo(map);
            }
        });

        const cableDashPeriod = 20;
        const cableFlowDurationMs = 2400;
        const cableFlowStart = performance.now();
        let cableFlowFrameId = null;

        const animateCableFlow = (now) => {
            const elapsed = now - cableFlowStart;
            const offset = -((elapsed % cableFlowDurationMs) / cableFlowDurationMs) * cableDashPeriod;

            map.getPane('overlayPane')?.querySelectorAll('path.optical-cable-flow').forEach((path) => {
                path.style.strokeDashoffset = `${offset}`;
            });

            cableFlowFrameId = requestAnimationFrame(animateCableFlow);
        };

        cableFlowFrameId = requestAnimationFrame(animateCableFlow);

        return () => {
            if (cableFlowFrameId !== null) {
                cancelAnimationFrame(cableFlowFrameId);
            }
            clearLongPress();
            mapEl.removeEventListener('touchstart', onTouchStart);
            mapEl.removeEventListener('touchmove', onTouchMove);
            mapEl.removeEventListener('touchend', onTouchEnd);
            mapEl.removeEventListener('touchcancel', onTouchCancel);
            mapRef.current = null;
            map.remove();
        };
    }, [odps, customers, isDarkMode, showToast]);

    const closeOdpModal = () => {
        setShowOdpModal(false);
        setEditingOdp(null);
    };

    return (
        <>
            <div className={`${themeCard} border rounded-2xl p-5 space-y-4`}>
                <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'} pb-3 gap-3`}>
                    <div className="flex items-center space-x-2">
                        <Map className="w-5 h-5 text-emerald-500" />
                        <h2 className={`text-sm font-bold ${themeTextTitle}`}>Peta Jaringan Pelanggan & ODP</h2>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-bold">Teknologi Optical Distribution Point (ODP)</span>
                </div>

                <div className="flex flex-col lg:flex-row gap-5">
                    <div className="w-full lg:w-80 xl:w-96 flex flex-col space-y-3 flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <h3 className={`text-xs font-bold ${themeTextTitle}`}>Daftar ODP ({filteredOdps.length})</h3>
                            <button
                                type="button"
                                onClick={() => { setEditingOdp(null); setShowOdpModal(true); }}
                                title="Tambah ODP"
                                className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari ODP..."
                                value={odpSearchTerm}
                                onChange={(e) => setOdpSearchTerm(e.target.value)}
                                className={`w-full p-2 pl-8 border rounded-lg text-xs ${themeInput}`}
                            />
                            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-3" />
                        </div>

                        <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
                            {filteredOdps.length === 0 ? (
                                <div className={`text-center py-8 text-xs ${themeTextSub} ${themeInnerWidget} rounded-xl border border-dashed`}>
                                    Tidak ada ODP ditemukan
                                </div>
                            ) : (
                                filteredOdps.map((odp) => {
                                    const connectedCount = odp.customers_count ?? customers.filter((c) => c.odp_id === odp.id).length;
                                    const isFull = connectedCount >= odp.total_ports;
                                    return (
                                        <div
                                            key={odp.id}
                                            onClick={() => handleOdpRowClick(odp)}
                                            className={`p-3 rounded-xl border transition-all duration-150 cursor-pointer flex justify-between items-start gap-2 ${
                                                isDarkMode
                                                    ? 'bg-zinc-950/40 border-zinc-900 hover:bg-zinc-900/60 hover:border-zinc-800'
                                                    : 'bg-zinc-50/50 border-zinc-150 hover:bg-zinc-100/60 hover:border-zinc-200'
                                            }`}
                                        >
                                            <div className="space-y-1 min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${isFull ? 'bg-rose-500' : 'bg-blue-500'}`} />
                                                    <span className={`text-xs font-bold truncate ${themeTextTitle}`}>{odp.name}</span>
                                                </div>
                                                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold truncate">
                                                    {odp.description || 'Tidak ada deskripsi lokasi'}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10px] font-medium text-zinc-500 dark:text-zinc-450 mt-1">
                                                    <span className={`px-1.5 py-0.5 rounded-md ${
                                                        isFull
                                                            ? 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
                                                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                    }`}
                                                    >
                                                        Port: {connectedCount} / {odp.total_ports}
                                                    </span>
                                                    <span className="font-mono text-[9px]">{parseFloat(odp.latitude).toFixed(5)}, {parseFloat(odp.longitude).toFixed(5)}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={() => { setEditingOdp(odp); setShowOdpModal(true); }}
                                                    className="inline-block p-1 text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors"
                                                    title="Edit ODP"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteOdp(odp)}
                                                    className="inline-block p-1 text-rose-500 hover:text-rose-400 cursor-pointer transition-colors"
                                                    title="Hapus ODP"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col space-y-2">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Peta di bawah menggambarkan jalur kabel fiber optik dari masing-masing kotak ODP (biru) ke titik rumah pelanggan (hijau: aktif, merah: nonaktif).</p>
                        <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 sm:hidden">Tahan posisi di peta untuk tambah ODP</p>
                        <div className={`border rounded-2xl overflow-hidden shadow-xs relative ${isDarkMode ? 'border-zinc-800/80' : 'border-zinc-200'}`}>
                            <div id="map-container" className="h-[550px] w-full z-0" />
                            <div className="absolute bottom-2.5 right-2.5 z-[400] bg-zinc-950/85 border border-zinc-800/60 backdrop-blur-xs px-2.5 py-1.5 rounded-lg flex gap-3 text-[9px] font-bold text-zinc-400 shadow-md">
                                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> ODP</div>
                                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Aktif</div>
                                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Nonaktif</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <TransitionModal show={showOdpModal} onClose={closeOdpModal} themeCard={themeCard} maxWidth="md">
                <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                        {editingOdp ? 'Edit Kotak ODP' : 'Tambah Kotak ODP'}
                    </h3>
                    <button type="button" onClick={closeOdpModal} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form id={odpFormId} onSubmit={handleSaveOdpSubmit} className="space-y-3 text-xs">
                    <input type="hidden" name="id" value={editingOdp ? editingOdp.id : ''} />

                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Nama ODP</label>
                        <input required name="name" type="text" placeholder="Contoh: ODP-JBG-01" defaultValue={editingOdp ? editingOdp.name : ''} className={`p-2 border rounded-lg ${themeInput}`} />
                    </div>

                    <GpsCoordinateFields
                        latitude={odpLat}
                        longitude={odpLng}
                        onLatitudeChange={setOdpLat}
                        onLongitudeChange={setOdpLng}
                        themeInput={themeInput}
                        themeLabel={themeLabel}
                        isDarkMode={isDarkMode}
                        required
                        inputType="number"
                        onError={(message) => showToast(message, 'error')}
                        onSuccess={() => showToast('Koordinat GPS berhasil diambil.', 'success')}
                    />

                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Jumlah Port Total</label>
                        <input required name="total_ports" type="number" min="1" placeholder="8" defaultValue={editingOdp ? editingOdp.total_ports : 8} className={`p-2 border rounded-lg ${themeInput}`} />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className={`font-bold ${themeLabel}`}>Deskripsi Lokasi / Keterangan</label>
                        <textarea name="description" placeholder="Dekat tiang listrik depan toko A..." defaultValue={editingOdp ? editingOdp.description : ''} className={`p-2 border rounded-lg h-20 resize-none ${themeInput}`} />
                    </div>

                    <div className={`p-2.5 ${themeInnerWidget} rounded-xl text-[10px] ${themeTextSub} leading-normal`}>
                        💡 <strong className={themeTextTitle}>Tips:</strong> Klik kanan peta (desktop) atau tahan posisi di peta (HP), gunakan tombol GPS perangkat, atau isi koordinat manual.
                    </div>

                    <ModalFormActions
                        formId={odpFormId}
                        isDarkMode={isDarkMode}
                        onCancel={closeOdpModal}
                    />
                </form>
            </TransitionModal>
        </>
    );
}

export default function NetworkMapIndex({ odps, customers }) {
    return (
        <AdminLayout title="Peta Jaringan">
            <NetworkMapPageContent odps={odps} customers={customers} />
        </AdminLayout>
    );
}
