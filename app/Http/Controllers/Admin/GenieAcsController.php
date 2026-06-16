<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\GenieAcsService;
use Illuminate\Http\Request;

class GenieAcsController extends Controller
{
    /**
     * Get list of all ONT status from GenieACS.
     */
    public function status()
    {
        $devices = GenieAcsService::getOntDevices();
        return response()->json($devices);
    }

    /**
     * Trigger ONT Reboot task.
     */
    public function reboot(Request $request)
    {
        $request->validate([
            'device_id' => 'required|string'
        ]);

        $deviceId = $request->input('device_id');
        $success = GenieAcsService::rebootDevice($deviceId);

        if ($success) {
            return response()->json([
                'success' => true,
                'message' => "Perintah reboot berhasil dikirim ke perangkat ONT."
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => "Gagal mengirimkan perintah reboot ke perangkat ONT."
        ], 500);
    }
}
