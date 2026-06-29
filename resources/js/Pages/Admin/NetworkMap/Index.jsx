import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Edit, Map, Plus, Save, Search, Trash2, X } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AdminLayout, { useAdminToast } from '../../../Layouts/AdminLayout';
import AdminPageCard from '../../../Components/Admin/AdminPageCard';
import TransitionModal from '../../../Components/Admin/TransitionModal';
import GpsCoordinateFields from '../../../Components/GpsCoordinateFields';
import { useAdminTheme } from '../../../hooks/useAdminTheme.jsx';
import { useStaffPermissions } from '../../../hooks/useStaffPermissions';
import { ReadOnlyTableActionsPlaceholder } from '../../../Components/Admin/ReadOnlyStaffBanner';
import { readDeviceCoordinates } from '../../../utils/deviceGps';
import { getCustomerPopupOptions } from '../../../utils/networkMapPopup';
import {
    buildMapPopupShellHtml,
    renderNetworkMapCustomerPopup,
    unmountNetworkMapCustomerPopup,
} from '../../../utils/networkMapPopupMount.jsx';

const METRICS_POLL_MS = 15000;
const LIVE_TRAFFIC_POLL_MS = 3000;

const isPppoeCustomer = (cust) => cust?.service_type !== 'hotspot';

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

function getIntervalPoints(points, interval = 100) {
    if (points.length < 2) return [];
    
    const result = [];
    let accumDistance = 0;
    let nextMark = interval;
    
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i+1];
        const segDist = calculateHaversineDistance(p1, p2);
        
        while (accumDistance + segDist >= nextMark) {
            const needed = nextMark - accumDistance;
            const fraction = needed / segDist;
            
            const lat = p1[0] + (p2[0] - p1[0]) * fraction;
            const lng = p1[1] + (p2[1] - p1[1]) * fraction;
            
            result.push({
                coords: [lat, lng],
                distance: nextMark
            });
            
            nextMark += interval;
        }
        accumDistance += segDist;
    }
    
    return result;
}

function NetworkMapPageContent({ odps = [], customers = [] }) {
    const theme = useAdminTheme();
    const { showToast } = useAdminToast();
    const { canWrite } = useStaffPermissions();
    const { isDarkMode, themeCard, themeTextTitle, themeTextSub, themeTextDesc } = theme;

    const themeInnerWidget = isDarkMode ? 'bg-zinc-950/40 border-zinc-900' : 'bg-zinc-50 border-zinc-200/60';
    const themeInput = isDarkMode
        ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-700'
        : 'bg-white border-zinc-200 text-zinc-800 focus:border-zinc-300';
    const themeLabel = isDarkMode ? 'text-zinc-400' : 'text-zinc-650';

    const [showOdpModal, setShowOdpModal] = useState(false);
    const [editingOdp, setEditingOdp] = useState(null);
    const [odpSearchTerm, setOdpSearchTerm] = useState('');
    const [odpLat, setOdpLat] = useState('');
    const [odpLng, setOdpLng] = useState('');
    const [networkMapMetrics, setNetworkMapMetrics] = useState({ ont: {}, traffic: {} });
    const [openCustomerPopupId, setOpenCustomerPopupId] = useState(null);

    const [isEditingCables, setIsEditingCables] = useState(false);
    const [editingCustomerId, setEditingCustomerId] = useState(null);
    const [editingCablePath, setEditingCablePath] = useState([]);

    const editorGroupRef = useRef(null);
    const mapViewRef = useRef({ center: null, zoom: null });

    const editingOdpRef = useRef(editingOdp);
    editingOdpRef.current = editingOdp;
    const showOdpModalRef = useRef(showOdpModal);
    showOdpModalRef.current = showOdpModal;

    const handleResetCablePath = () => {
        if (!confirm('Apakah Anda yakin ingin me-reset jalur kabel pelanggan ini menjadi garis lurus default?')) return;
        setEditingCablePath([]);
    };

    const handleSaveCablePath = () => {
        if (!editingCustomerId) return;
        router.post('/admin/network-map/save-cable-path', {
            customer_id: editingCustomerId,
            cable_path: editingCablePath,
        }, {
            onSuccess: () => {
                showToast('Jalur kabel jaringan berhasil disimpan.', 'success');
                setEditingCustomerId(null);
                setEditingCablePath([]);
            },
            onError: (err) => {
                showToast(Object.values(err)[0] || 'Gagal menyimpan jalur kabel.', 'error');
            }
        });
    };

    const mapRef = useRef(null);
    const customerMarkersRef = useRef({});
    const openCustomerPopupIdRef = useRef(null);
    const popupReactRootRef = useRef(null);
    const customersRef = useRef(customers);
    customersRef.current = customers;
    const networkMapMetricsRef = useRef(networkMapMetrics);
    networkMapMetricsRef.current = networkMapMetrics;
    const canWriteRef = useRef(canWrite);
    canWriteRef.current = canWrite;
    const fetchNetworkMapMetricsRef = useRef(async () => {});

    const fetchNetworkMapMetrics = async () => {
        try {
            const res = await fetch('/admin/network-map/metrics');
            const data = await res.json();
            setNetworkMapMetrics(data);
        } catch (err) {
            console.error('Failed to load network map metrics', err);
        }
    };

    fetchNetworkMapMetricsRef.current = fetchNetworkMapMetrics;

    const renderOpenCustomerPopupRef = useRef(() => {});

    const renderOpenCustomerPopup = (customerId, metrics = networkMapMetricsRef.current) => {
        const cust = customersRef.current.find((c) => c.id === customerId);
        const rootEl = popupReactRootRef.current;
        if (!cust || !rootEl) {
            return;
        }

        renderNetworkMapCustomerPopup(rootEl, {
            customer: cust,
            metrics,
            canWrite: canWriteRef.current,
            onWifiUpdated: () => {
                fetchNetworkMapMetricsRef.current();
            },
        });
    };

    renderOpenCustomerPopupRef.current = renderOpenCustomerPopup;

    useEffect(() => {
        fetchNetworkMapMetrics();
        const intervalMs = openCustomerPopupId ? LIVE_TRAFFIC_POLL_MS : METRICS_POLL_MS;
        const interval = setInterval(fetchNetworkMapMetrics, intervalMs);
        return () => clearInterval(interval);
    }, [openCustomerPopupId]);

    useEffect(() => {
        if (!openCustomerPopupId) {
            return;
        }

        const marker = customerMarkersRef.current[openCustomerPopupId];
        if (!marker?.isPopupOpen()) {
            return;
        }

        renderOpenCustomerPopup(openCustomerPopupId, networkMapMetrics);
    }, [networkMapMetrics, openCustomerPopupId, canWrite, customers]);

    useEffect(() => {
        if (showOdpModal) {
            setOdpLat(editingOdp ? String(editingOdp.latitude) : '');
            setOdpLng(editingOdp ? String(editingOdp.longitude) : '');
        }
    }, [showOdpModal, editingOdp]);

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
        const center = mapViewRef.current.center || (odps.length > 0
            ? [parseFloat(odps[0].latitude), parseFloat(odps[0].longitude)]
            : defaultCenter);
        const zoom = mapViewRef.current.zoom || 15;

        const map = L.map('map-container', {
            center,
            zoom,
            maxZoom: 22,
            zoomControl: false,
            layers: [],
        });

        mapRef.current = map;

        const editorGroup = L.layerGroup().addTo(map);
        editorGroupRef.current = editorGroup;

        L.control.zoom({ position: 'topright' }).addTo(map);

        const buildMiniOdpPopupContent = (lat, lng) => `
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

        const openMiniOdpPopup = (latlng) => {
            if (!canWriteRef.current || isEditingCables) return;

            const { lat, lng } = latlng;
            setOdpLat(lat.toFixed(6));
            setOdpLng(lng.toFixed(6));
            setEditingOdp(null);

            L.popup()
                .setLatLng(latlng)
                .setContent(buildMiniOdpPopupContent(lat, lng))
                .openOn(map);
        };

        map.on('contextmenu', (e) => {
            L.DomEvent.preventDefault(e.originalEvent);
            openMiniOdpPopup(e.latlng);
        });

        const mapContainerEl = map.getContainer();
        const longPressMs = 600;
        const moveTolerancePx = 12;
        let longPressTimer = null;
        let longPressTouch = null;

        const cancelLongPress = () => {
            if (longPressTimer !== null) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
            longPressTouch = null;
        };

        const onMapTouchStart = (event) => {
            if (event.touches.length !== 1) {
                cancelLongPress();
                return;
            }

            const touch = event.touches[0];
            longPressTouch = { x: touch.clientX, y: touch.clientY, touch };
            longPressTimer = window.setTimeout(() => {
                longPressTimer = null;
                if (!longPressTouch) return;

                const { touch: activeTouch } = longPressTouch;
                const latlng = map.containerPointToLatLng(
                    map.mouseEventToContainerPoint({
                        clientX: activeTouch.clientX,
                        clientY: activeTouch.clientY,
                    }),
                );

                openMiniOdpPopup(latlng);
                navigator.vibrate?.(40);
                longPressTouch = null;
            }, longPressMs);
        };

        const onMapTouchMove = (event) => {
            if (!longPressTouch || longPressTimer === null) return;

            const touch = event.touches[0];
            const dx = touch.clientX - longPressTouch.x;
            const dy = touch.clientY - longPressTouch.y;

            if (Math.hypot(dx, dy) > moveTolerancePx) {
                cancelLongPress();
            }
        };

        const onMapTouchEnd = () => {
            cancelLongPress();
        };

        mapContainerEl.addEventListener('touchstart', onMapTouchStart, { passive: true });
        mapContainerEl.addEventListener('touchmove', onMapTouchMove, { passive: true });
        mapContainerEl.addEventListener('touchend', onMapTouchEnd);
        mapContainerEl.addEventListener('touchcancel', onMapTouchEnd);

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
                    if (!canWriteRef.current) return;

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

        const vectorTiles = L.tileLayer(tilesUrl, {
            attribution: '© OpenStreetMap',
            maxZoom: 22,
            maxNativeZoom: 20,
        });

        const satelliteTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, and the GIS User Community',
            maxZoom: 22,
            maxNativeZoom: 19,
        });

        // Add the default vector tiles initially
        vectorTiles.addTo(map);

        // Add Layer Control (expanded for high visibility)
        const baseMaps = {
            "Peta Vektor": vectorTiles,
            "Satelit": satelliteTiles,
        };
        
        L.control.layers(baseMaps, null, {
            position: 'topleft',
            collapsed: false,
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

            const marker = L.marker([lat, lng], {
                icon: odpIcon,
                draggable: canWrite && !isEditingCables
            }).addTo(map)
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

            marker.on('dragend', (e) => {
                const newLatLng = e.target.getLatLng();
                const originalLatLng = L.latLng(lat, lng);

                if (showOdpModalRef.current && editingOdpRef.current?.id === odp.id) {
                    setOdpLat(newLatLng.lat.toFixed(6));
                    setOdpLng(newLatLng.lng.toFixed(6));
                    showToast(`Koordinat ODP "${odp.name}" disesuaikan di form modal.`, 'info');
                } else {
                    if (confirm(`Apakah Anda yakin ingin memindahkan ODP "${odp.name}" ke lokasi baru?\nLatitude: ${newLatLng.lat.toFixed(6)}\nLongitude: ${newLatLng.lng.toFixed(6)}`)) {
                        router.post('/admin/odps/save', {
                            id: odp.id,
                            name: odp.name,
                            total_ports: odp.total_ports,
                            description: odp.description,
                            latitude: newLatLng.lat.toFixed(6),
                            longitude: newLatLng.lng.toFixed(6)
                        }, {
                            onError: () => {
                                marker.setLatLng(originalLatLng);
                            }
                        });
                    } else {
                        marker.setLatLng(originalLatLng);
                    }
                }
            });
        });

        customerMarkersRef.current = {};

        customers.forEach((cust) => {
            if (!isPppoeCustomer(cust)) return;
            if (!cust.latitude || !cust.longitude) return;

            const lat = parseFloat(cust.latitude);
            const lng = parseFloat(cust.longitude);

            const marker = L.marker([lat, lng], { icon: customerIcon(cust.status) })
                .addTo(map);

            if (isEditingCables) {
                marker.on('click', (e) => {
                    L.DomEvent.stopPropagation(e);
                    setEditingCustomerId(cust.id);
                    setEditingCablePath(cust.cable_path || []);
                });
            } else {
                marker.bindPopup(() => buildMapPopupShellHtml(cust.id), getCustomerPopupOptions());

                marker.on('popupopen', () => {
                    openCustomerPopupIdRef.current = cust.id;
                    setOpenCustomerPopupId(cust.id);
                    marker.setPopupContent(buildMapPopupShellHtml(cust.id));

                    const popupEl = marker.getPopup()?.getElement();
                    popupReactRootRef.current = popupEl?.querySelector('.map-popup-react-root') ?? null;
                    renderOpenCustomerPopupRef.current(cust.id, networkMapMetricsRef.current);
                    fetchNetworkMapMetricsRef.current();
                });

                marker.on('popupclose', () => {
                    if (popupReactRootRef.current) {
                        unmountNetworkMapCustomerPopup(popupReactRootRef.current);
                        popupReactRootRef.current = null;
                    }
                    if (openCustomerPopupIdRef.current === cust.id) {
                        openCustomerPopupIdRef.current = null;
                        setOpenCustomerPopupId(null);
                    }
                });
            }

            customerMarkersRef.current[cust.id] = marker;

            if (cust.odp_id && odpCoordsMap[cust.odp_id]) {
                const odpCoords = odpCoordsMap[cust.odp_id];
                const customerCoords = [lat, lng];
                const cablePath = cust.cable_path || [];
                const points = [odpCoords, ...cablePath, customerCoords];
                const cableColor = cust.status === 'active' ? '#10b981' : '#f59e0b';

                L.polyline(points, {
                    color: cableColor,
                    weight: 2,
                    opacity: 0.75,
                    className: 'optical-cable-flow',
                    smoothFactor: 0,
                }).addTo(map);

                // Only draw distance labels if this customer is selected/open OR being edited!
                const isSelected = openCustomerPopupId === cust.id || editingCustomerId === cust.id;

                if (isSelected) {
                    // Draw 100m markers along the path (always dark style for high contrast)
                    const intervalPoints = getIntervalPoints(points, 100);
                    intervalPoints.forEach((ip) => {
                        const badgeIcon = L.divIcon({
                            className: 'custom-distance-badge',
                            html: `<div class="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-700/80 text-[8px] font-mono text-zinc-100 font-extrabold shadow-md select-none pointer-events-none">${ip.distance}m</div>`,
                            iconSize: [30, 14],
                            iconAnchor: [15, 7],
                        });
                        L.marker(ip.coords, { icon: badgeIcon, interactive: false }).addTo(map);
                    });

                    // Draw total distance badge offset below customer marker
                    const totalDist = calculatePathLength(odpCoords, customerCoords, cablePath);
                    const totalBadgeIcon = L.divIcon({
                        className: 'custom-total-distance-badge',
                        html: `<div class="px-1.5 py-0.5 rounded bg-emerald-600/95 dark:bg-emerald-500/95 border border-white dark:border-zinc-950 text-[8px] font-mono text-white font-extrabold shadow-md whitespace-nowrap select-none pointer-events-none">${totalDist.toFixed(0)}m</div>`,
                        iconSize: [36, 14],
                        iconAnchor: [18, -8], // Offset below the customer marker
                    });
                    L.marker(customerCoords, { icon: totalBadgeIcon, interactive: false }).addTo(map);
                }
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
            if (mapRef.current) {
                mapViewRef.current = {
                    center: mapRef.current.getCenter(),
                    zoom: mapRef.current.getZoom(),
                };
            }
            cancelLongPress();
            mapContainerEl.removeEventListener('touchstart', onMapTouchStart);
            mapContainerEl.removeEventListener('touchmove', onMapTouchMove);
            mapContainerEl.removeEventListener('touchend', onMapTouchEnd);
            mapContainerEl.removeEventListener('touchcancel', onMapTouchEnd);
            editorGroupRef.current = null;
            mapRef.current = null;
            map.remove();
        };
    }, [odps, customers, isDarkMode, showToast, isEditingCables, openCustomerPopupId, editingCustomerId]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !editorGroupRef.current) return;

        editorGroupRef.current.clearLayers();

        if (!isEditingCables || !editingCustomerId) {
            return;
        }

        const cust = customers.find((c) => c.id === editingCustomerId);
        if (!cust) return;

        const odp = odps.find((o) => o.id === cust.odp_id);
        if (!odp) return;

        const odpCoords = [parseFloat(odp.latitude), parseFloat(odp.longitude)];
        const customerCoords = [parseFloat(cust.latitude), parseFloat(cust.longitude)];
        const points = [odpCoords, ...editingCablePath, customerCoords];

        // Draw dashed edit line
        const editPolyline = L.polyline(points, {
            color: '#f59e0b',
            weight: 3,
            dashArray: '6, 6',
            opacity: 0.95,
        }).addTo(editorGroupRef.current);

        // Draw handles for editingCablePath
        editingCablePath.forEach((coord, idx) => {
            const handleIcon = L.divIcon({
                className: 'cable-handle-icon',
                html: `<div class="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-950 shadow-md cursor-move flex items-center justify-center text-[9px] font-bold text-white select-none">${idx + 1}</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
            });

            const marker = L.marker(coord, {
                icon: handleIcon,
                draggable: true,
            }).addTo(editorGroupRef.current);

            marker.on('drag', (e) => {
                const newLatLng = e.target.getLatLng();
                const updatedPoints = [...points];
                updatedPoints[idx + 1] = [newLatLng.lat, newLatLng.lng];
                editPolyline.setLatLngs(updatedPoints);
            });

            marker.on('dragend', (e) => {
                const newLatLng = e.target.getLatLng();
                const newPath = [...editingCablePath];
                newPath[idx] = [newLatLng.lat, newLatLng.lng];
                setEditingCablePath(newPath);
            });

            marker.on('dblclick', (e) => {
                L.DomEvent.stopPropagation(e);
                L.DomEvent.preventDefault(e);
                const newPath = editingCablePath.filter((_, i) => i !== idx);
                setEditingCablePath(newPath);
            });
        });

        // Draw midpoints
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i+1];
            const midLatLng = [
                (p1[0] + p2[0]) / 2,
                (p1[1] + p2[1]) / 2
            ];

            const midIcon = L.divIcon({
                className: 'cable-mid-icon',
                html: '<div class="w-4 h-4 rounded-full bg-emerald-500/50 hover:bg-emerald-500 border border-white dark:border-zinc-950 shadow-xs cursor-pointer scale-90 hover:scale-110 transition-all flex items-center justify-center text-[10px] text-white font-black">+</div>',
                iconSize: [16, 16],
                iconAnchor: [8, 8],
            });

            const midMarker = L.marker(midLatLng, {
                icon: midIcon,
                draggable: true,
            }).addTo(editorGroupRef.current);

            midMarker.on('dragstart', (e) => {
                const startLatLng = e.target.getLatLng();
                const newPath = [...editingCablePath];
                newPath.splice(i, 0, [startLatLng.lat, startLatLng.lng]);
                setEditingCablePath(newPath);
            });
        }

    }, [isEditingCables, editingCustomerId, editingCablePath, customers, odps]);

    const closeOdpModal = () => {
        setShowOdpModal(false);
        setEditingOdp(null);
    };

    return (
        <>
            <AdminPageCard
                icon={Map}
                accent="sky"
                title="Peta Jaringan Pelanggan & ODP"
                description="Teknologi Optical Distribution Point (ODP)"
                themeCard={themeCard}
                isDarkMode={isDarkMode}
                themeTextTitle={themeTextTitle}
                themeTextDesc={themeTextDesc}
            >
                <div className="flex flex-col lg:flex-row gap-5">
                    <div className="w-full lg:w-80 xl:w-96 flex flex-col space-y-3 flex-shrink-0">
                        <div className="flex justify-between items-center">
                            <h3 className={`text-xs font-bold ${themeTextTitle}`}>Daftar ODP ({filteredOdps.length})</h3>
                            {canWrite && (
                            <button
                                type="button"
                                onClick={() => { setEditingOdp(null); setShowOdpModal(true); }}
                                title="Tambah ODP"
                                className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                            )}
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
                                                {canWrite ? (
                                                <>
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
                                                </>
                                                ) : (
                                                    <ReadOnlyTableActionsPlaceholder />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 flex-1 leading-relaxed">
                                Peta di bawah menggambarkan jalur kabel fiber optik dari masing-masing kotak ODP (biru) ke titik rumah pelanggan (hijau: aktif, merah: nonaktif).
                                {canWrite && (
                                    <> <span className="hidden sm:inline">Klik kanan</span><span className="sm:hidden">Tahan</span> pada peta untuk menambah ODP baru.</>
                                )}
                            </p>
                            {canWrite && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isEditingCables) {
                                            setIsEditingCables(false);
                                            setEditingCustomerId(null);
                                            setEditingCablePath([]);
                                        } else {
                                            setIsEditingCables(true);
                                        }
                                    }}
                                    className={`px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs text-xs shrink-0 select-none ${
                                        isEditingCables
                                            ? 'bg-rose-500 hover:bg-rose-600 text-white'
                                            : 'bg-amber-500 hover:bg-amber-600 text-white hover:shadow-md'
                                    }`}
                                >
                                    <Edit className="w-3.5 h-3.5" />
                                    <span>{isEditingCables ? 'Selesai Edit Kabel' : 'Edit Kabel Jaringan'}</span>
                                </button>
                            )}
                        </div>

                        {isEditingCables && (
                            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 text-xs animate-in fade-in duration-200 ${
                                isDarkMode ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50/60 border-amber-200/60'
                            }`}>
                                <div className="space-y-1">
                                    <p className={`font-bold text-xs ${isDarkMode ? 'text-amber-400' : 'text-amber-800'}`}>
                                        {!editingCustomerId
                                            ? 'Mode Edit Kabel Jaringan Aktif'
                                            : `Mengedit kabel untuk: ${customers.find(c => c.id === editingCustomerId)?.name || 'Pelanggan'}`}
                                    </p>
                                    <p className="text-[10px] text-zinc-550 dark:text-zinc-400 font-medium">
                                        {!editingCustomerId
                                            ? 'Silakan klik pada marker/ikon pelanggan di peta untuk mulai mengedit jalur kabelnya.'
                                            : 'Seret titik nomor untuk menggeser jalur, seret titik "+" di tengah garis untuk membuat lekukan baru, klik 2x titik nomor untuk menghapusnya.'}
                                    </p>
                                </div>
                                {editingCustomerId && (
                                    <div className="flex flex-wrap gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={handleResetCablePath}
                                            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-colors select-none ${
                                                isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'
                                            }`}
                                        >
                                            Reset Jalur
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingCustomerId(null);
                                                setEditingCablePath([]);
                                            }}
                                            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer transition-colors select-none ${
                                                isDarkMode ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-white' : 'border-zinc-200 text-zinc-655 hover:bg-zinc-100 hover:text-zinc-900'
                                            }`}
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveCablePath}
                                            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[11px] font-bold cursor-pointer flex items-center gap-1 shadow-sm hover:shadow-md transition-all select-none"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            <span>Simpan Jalur</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

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
            </AdminPageCard>

            <TransitionModal show={showOdpModal} onClose={closeOdpModal} themeCard={themeCard} maxWidth="md">
                <div className={`flex justify-between items-center pb-2 border-b ${isDarkMode ? 'border-zinc-800/40' : 'border-zinc-200/80'}`}>
                    <h3 className={`text-sm font-bold ${themeTextTitle}`}>
                        {editingOdp ? 'Edit Kotak ODP' : 'Tambah Kotak ODP'}
                    </h3>
                    <button type="button" onClick={closeOdpModal} className="text-zinc-500 hover:text-white transition-colors cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <form onSubmit={handleSaveOdpSubmit} className="space-y-3 text-xs">
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
                        💡 <strong className={themeTextTitle}>Tips:</strong> Klik kanan peta (desktop) atau tahan peta (HP) untuk tambah ODP, gunakan tombol GPS perangkat, atau isi koordinat manual.
                    </div>

                    <div className="flex justify-end pt-3 gap-2">
                        <button
                            type="button"
                            onClick={closeOdpModal}
                            title="Batal"
                            className={`p-2 border rounded-lg cursor-pointer inline-flex items-center justify-center transition-colors ${isDarkMode ? 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900' : 'border-zinc-200 text-zinc-650 hover:bg-zinc-100 hover:text-zinc-900'}`}
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <button type="submit" title="Simpan" className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg inline-flex items-center justify-center">
                            <Save className="w-4 h-4" />
                        </button>
                    </div>
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
