<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Services\GenieAcsService;
use App\Services\StaffRouterScope;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

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
     * Get WiFi credentials for an ONT matched by customer username.
     */
    public function wifiStatus(Request $request)
    {
        $username = $this->resolveCustomerUsername($request);

        try {
            $probe = $request->boolean('probe', true);
            $device = GenieAcsService::findDeviceByUsernameForWifi($username, $probe);

            if ($device === null && $probe) {
                $device = GenieAcsService::findDeviceByUsernameForWifi($username, false);
            }

            if ($device === null) {
                return response()->json([
                    'success' => false,
                    'found' => false,
                    'message' => 'ONT tidak terdaftar di GenieACS untuk username "' . $username . '". Username PPPoE di mWiFi harus sama dengan di ONT.',
                ], 404);
            }

            unset($device['_raw']);

            return response()->json([
                'success' => true,
                'found' => true,
                'device' => $device,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'found' => false,
                'message' => 'GenieACS tidak dapat dihubungi: ' . $e->getMessage(),
            ], 503);
        }
    }

    /**
     * Update WiFi SSID and/or password on a customer's ONT.
     */
    public function updateWifi(Request $request)
    {
        $validated = $request->validate([
            'username' => 'nullable|string|max:255',
            'customer_id' => 'nullable|integer|exists:customers,id',
            'device_id' => 'nullable|string|max:255',
            'ssid' => 'nullable|string|max:32',
            'password' => 'nullable|string|min:8|max:63',
        ]);

        if (empty(trim((string) ($validated['ssid'] ?? ''))) && empty(trim((string) ($validated['password'] ?? '')))) {
            throw ValidationException::withMessages([
                'ssid' => 'Isi SSID baru atau password WiFi baru.',
            ]);
        }

        $username = $this->resolveCustomerUsername($request);
        $ssid = isset($validated['ssid']) ? trim($validated['ssid']) : null;
        $password = isset($validated['password']) ? trim($validated['password']) : null;

        if ($ssid === '') {
            $ssid = null;
        }
        if ($password === '') {
            $password = null;
        }

        try {
            $device = null;

            if (!empty($validated['device_id'])) {
                $device = GenieAcsService::findDeviceByUsername($username);
                if ($device === null || ($device['id'] ?? null) !== $validated['device_id']) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Perangkat ONT tidak cocok dengan pelanggan ini.',
                    ], 403);
                }
            } else {
                $device = GenieAcsService::findDeviceByUsername($username);
            }

            if ($device === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'ONT tidak terdaftar di GenieACS untuk username "' . $username . '".',
                ], 404);
            }

            $rawDevice = $device['_raw'] ?? null;
            $result = GenieAcsService::updateWifiCredentials(
                $device['id'],
                $ssid,
                $password,
                is_array($rawDevice) ? $rawDevice : null
            );

            if (!($result['success'] ?? false)) {
                return response()->json($result, (int) ($result['http_status'] ?? 502));
            }

            return response()->json($result);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'GenieACS tidak dapat dihubungi: ' . $e->getMessage(),
            ], 503);
        }
    }

    /**
     * Ask GenieACS to connection-request the ONT so it checks in (wake from offline).
     */
    public function wake(Request $request)
    {
        $request->validate([
            'device_id' => 'required|string',
        ]);

        $deviceId = $request->input('device_id');
        $result = GenieAcsService::requestDeviceConnection($deviceId);

        return response()->json($result, ($result['success'] ?? false) ? 200 : 502);
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
                'message' => "Perintah reboot berhasil dikirim ke antrian GenieACS. ONT akan reboot saat terhubung ke ACS.",
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => "Gagal mengirim perintah reboot. Pastikan GenieACS berjalan dan device_id valid.",
        ], 502);
    }

    /**
     * Disconnect a WiFi client from a customer's ONT.
     */
    public function kickDevice(Request $request)
    {
        $validated = $request->validate([
            'username' => 'nullable|string|max:255',
            'customer_id' => 'nullable|integer|exists:customers,id',
            'device_id' => 'required|string|max:255',
            'mac' => 'required|string|max:32',
            'association_path' => 'nullable|string|max:512',
        ]);

        $username = $this->resolveCustomerUsername($request);

        try {
            $device = GenieAcsService::findDeviceByUsername($username);

            if ($device === null || ($device['id'] ?? null) !== $validated['device_id']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Perangkat ONT tidak cocok dengan pelanggan ini.',
                ], 403);
            }

            $rawDevice = $device['_raw'] ?? null;
            $result = GenieAcsService::kickConnectedDevice(
                $device['id'],
                $validated['mac'],
                is_array($rawDevice) ? $rawDevice : null,
                $validated['association_path'] ?? null
            );

            return response()->json($result, ($result['success'] ?? false) ? 200 : (int) ($result['http_status'] ?? 502));
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'GenieACS tidak dapat dihubungi: ' . $e->getMessage(),
            ], 503);
        }
    }

    private function resolveCustomerUsername(Request $request): string
    {
        if ($request->filled('customer_id')) {
            $customer = Customer::query()->findOrFail((int) $request->input('customer_id'));
            StaffRouterScope::for($request->user())->ensureCanAccessRouter($customer->router_id);

            return $customer->username;
        }

        $username = trim((string) $request->input('username', ''));
        if ($username === '') {
            throw ValidationException::withMessages([
                'username' => 'Username atau customer_id wajib diisi.',
            ]);
        }

        $customer = Customer::query()->where('username', $username)->first();
        if ($customer !== null) {
            StaffRouterScope::for($request->user())->ensureCanAccessRouter($customer->router_id);
        }

        return $username;
    }
}
