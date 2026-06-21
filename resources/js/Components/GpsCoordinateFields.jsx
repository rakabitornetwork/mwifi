import React, { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { readDeviceCoordinates } from '../utils/deviceGps';

export default function GpsCoordinateFields({
    latitude,
    longitude,
    onLatitudeChange,
    onLongitudeChange,
    latName = 'latitude',
    lngName = 'longitude',
    latLabel = 'Latitude',
    lngLabel = 'Longitude',
    latPlaceholder = '-6.326300',
    lngPlaceholder = '108.320100',
    themeInput = '',
    themeLabel = '',
    isDarkMode = false,
    onError,
    onSuccess,
    required = false,
    inputType = 'text',
    buttonLabel = 'Ambil dari GPS Perangkat',
}) {
    const [isCapturing, setIsCapturing] = useState(false);

    const handleCapture = async () => {
        setIsCapturing(true);
        try {
            const coords = await readDeviceCoordinates();
            onLatitudeChange(coords.latitude);
            onLongitudeChange(coords.longitude);
            onSuccess?.(coords);
        } catch (error) {
            onError?.(error.message || 'Gagal membaca GPS perangkat.');
        } finally {
            setIsCapturing(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                    <label className={`font-bold ${themeLabel}`}>{latLabel}</label>
                    <input
                        required={required}
                        name={latName}
                        type={inputType}
                        step={inputType === 'number' ? 'any' : undefined}
                        placeholder={latPlaceholder}
                        value={latitude}
                        onChange={(e) => onLatitudeChange(e.target.value)}
                        className={`p-2 border rounded-lg font-mono ${themeInput}`}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className={`font-bold ${themeLabel}`}>{lngLabel}</label>
                    <input
                        required={required}
                        name={lngName}
                        type={inputType}
                        step={inputType === 'number' ? 'any' : undefined}
                        placeholder={lngPlaceholder}
                        value={longitude}
                        onChange={(e) => onLongitudeChange(e.target.value)}
                        className={`p-2 border rounded-lg font-mono ${themeInput}`}
                    />
                </div>
            </div>
            <button
                type="button"
                onClick={handleCapture}
                disabled={isCapturing}
                className="inline-flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-lg text-xs font-bold text-white cursor-pointer transition-all duration-200 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/25 hover:shadow-emerald-500/35 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:from-emerald-500 disabled:hover:to-teal-600 disabled:shadow-none"
            >
                {isCapturing ? (
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                ) : (
                    <MapPin className="w-4 h-4 shrink-0" />
                )}
                <span>{isCapturing ? 'Membaca GPS...' : buttonLabel}</span>
            </button>
        </div>
    );
}
