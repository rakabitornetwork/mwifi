/**
 * Sapaan berdasarkan jam lokal perangkat (zona waktu Indonesia / browser).
 */
export function getTimeOfDayGreeting(date = new Date()) {
    const hour = date.getHours();

    if (hour >= 4 && hour < 11) {
        return 'Selamat Pagi';
    }

    if (hour >= 11 && hour < 15) {
        return 'Selamat Siang';
    }

    if (hour >= 15 && hour < 19) {
        return 'Selamat Sore';
    }

    return 'Selamat Malam';
}
