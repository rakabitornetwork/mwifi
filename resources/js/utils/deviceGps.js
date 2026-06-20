const GPS_ERROR_MESSAGES = {
    1: 'Izin lokasi ditolak. Aktifkan GPS dan izin lokasi di browser/perangkat.',
    2: 'Posisi tidak tersedia. Pastikan GPS perangkat aktif.',
    3: 'Permintaan lokasi timeout. Coba lagi di area terbuka.',
};

/**
 * Read current coordinates from the device GPS / browser geolocation API.
 *
 * @param {PositionOptions} [options]
 * @returns {Promise<{ latitude: string, longitude: string, accuracy: number }>}
 */
export function readDeviceCoordinates(options = {}) {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Browser tidak mendukung geolocation.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude.toFixed(6),
                    longitude: position.coords.longitude.toFixed(6),
                    accuracy: position.coords.accuracy,
                });
            },
            (error) => {
                reject(new Error(GPS_ERROR_MESSAGES[error.code] || error.message || 'Gagal membaca GPS perangkat.'));
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0,
                ...options,
            }
        );
    });
}
