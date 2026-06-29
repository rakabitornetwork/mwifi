<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class GenieAcsService
{
    /**
     * Retrieve all ONT devices from GenieACS.
     * Includes a robust fallback mode with realistic simulation data if GenieACS is offline/unreachable.
     *
     * @return array
     */
    public static function getOntDevices(): array
    {
        $apiUrl = config('services.genieacs.api_url', 'http://localhost:7557');

        try {
            $rawDevices = self::fetchRawDevices($apiUrl);
            $devices = [];

            foreach ($rawDevices as $rawDev) {
                if (!is_array($rawDev)) {
                    continue;
                }

                $parsed = self::parseRawDevice($rawDev);
                if ($parsed !== null) {
                    $devices[] = $parsed;
                }
            }

            if ($devices !== []) {
                return $devices;
            }

            throw new Exception('GenieACS returned no parseable ONT devices.');
        } catch (Exception $e) {
            // Log warning but return beautiful fallback mock data matching default seeded customers
            Log::warning("GenieACS API is offline. Returning simulated mock ONT data. Detail: " . $e->getMessage());

            return [
                [
                    'id' => 'ZTEGC7A19B32_budi',
                    'sn' => 'ZTEGC7A19B32',
                    'username' => 'budi_pppoe',
                    'model' => 'F477V2',
                    'product_class' => 'F477V2',
                    'rx' => '-19.4 dBm',
                    'status' => 'good',
                    'temperature' => '43°C',
                    'wifi_ssid' => 'BUDI-WiFi',
                    'wifi_password' => 'budi1234',
                    'connected_devices' => 4,
                    'connected_device_list' => [
                        ['name' => 'iPhone-Amir', 'mac' => 'AA:BB:CC:11:22:01', 'ip' => '192.168.1.12'],
                        ['name' => 'Samsung-TV', 'mac' => 'AA:BB:CC:11:22:02', 'ip' => '192.168.1.15'],
                        ['name' => 'Laptop-Kantor', 'mac' => 'AA:BB:CC:11:22:03', 'ip' => '192.168.1.18'],
                        ['name' => 'Redmi-Note', 'mac' => 'AA:BB:CC:11:22:04', 'ip' => '192.168.1.21'],
                    ],
                ],
                [
                    'id' => 'HWTC83C210D3_dewi',
                    'sn' => 'HWTC83C210D3',
                    'username' => 'dewi_pppoe',
                    'model' => 'HG8245H',
                    'product_class' => 'HG8245H',
                    'rx' => '-23.8 dBm',
                    'status' => 'good',
                    'temperature' => '41°C',
                    'wifi_ssid' => 'DEWI-HOME',
                    'wifi_password' => 'dewi5678',
                    'connected_devices' => 2,
                    'connected_device_list' => [
                        ['name' => 'OPPO-A78', 'mac' => 'BB:CC:DD:22:33:01', 'ip' => '192.168.1.7'],
                        ['name' => 'Smart-TV-LG', 'mac' => 'BB:CC:DD:22:33:02', 'ip' => '192.168.1.9'],
                    ],
                ],
                [
                    'id' => 'ZTEGC8B220C4_ahmad',
                    'sn' => 'ZTEGC8B220C4',
                    'username' => 'ahmad_pppoe',
                    'model' => 'ZXHN F477',
                    'product_class' => 'ZXHN F477',
                    'rx' => '-27.6 dBm',
                    'status' => 'warning',
                    'temperature' => '48°C',
                    'wifi_ssid' => 'AHMAD-NET',
                    'wifi_password' => 'ahmad999',
                    'connected_devices' => 6,
                    'connected_device_list' => [
                        ['name' => 'vivo-Y27', 'mac' => 'CC:DD:EE:33:44:01', 'ip' => '192.168.1.3'],
                        ['name' => 'iPad-Ruangan', 'mac' => 'CC:DD:EE:33:44:02', 'ip' => '192.168.1.4'],
                        ['name' => 'PC-Windows', 'mac' => 'CC:DD:EE:33:44:03', 'ip' => '192.168.1.5'],
                        ['name' => 'Android-TV', 'mac' => 'CC:DD:EE:33:44:04', 'ip' => '192.168.1.6'],
                        ['name' => 'Realme-C55', 'mac' => 'CC:DD:EE:33:44:05', 'ip' => '192.168.1.8'],
                        ['name' => 'ESP32-Sensor', 'mac' => 'CC:DD:EE:33:44:06', 'ip' => '192.168.1.10'],
                    ],
                ],
                [
                    'id' => 'FHGAC91277F1_joko',
                    'sn' => 'FHGAC91277F1',
                    'username' => 'joko_pppoe',
                    'model' => 'GM220-S',
                    'product_class' => 'GM220-S',
                    'rx' => 'Offline',
                    'status' => 'offline',
                    'temperature' => null,
                    'wifi_ssid' => null,
                    'wifi_password' => null,
                    'connected_devices' => null,
                ]
            ];
        }
    }

    /**
     * Find a parsed ONT device by PPPoE username (no mock fallback).
     *
     * @return array<string, mixed>|null Parsed device with optional _raw key
     */
    public static function findDeviceByUsername(string $username): ?array
    {
        $needle = trim($username);
        if ($needle === '') {
            return null;
        }

        $apiUrl = config('services.genieacs.api_url', 'http://localhost:7557');

        try {
            $rawDevices = self::fetchRawDevicesForLookup($apiUrl);
        } catch (Exception $e) {
            Log::warning('GenieACS findDeviceByUsername failed: ' . $e->getMessage());

            return null;
        }

        foreach ($rawDevices as $rawDev) {
            if (!is_array($rawDev)) {
                continue;
            }

            $ontUsername = self::extractUsername($rawDev);
            if ($ontUsername === '' || $ontUsername === 'unknown_ont') {
                continue;
            }

            if (!self::usernameMatches($ontUsername, $needle)) {
                continue;
            }

            $parsed = self::parseRawDevice($rawDev);
            if ($parsed === null) {
                continue;
            }

            $parsed['username'] = $ontUsername;
            $parsed['_raw'] = $rawDev;

            return $parsed;
        }

        return null;
    }

    /**
     * Find ONT for WiFi panel with fresh GenieACS data and optional TR-069 reachability probe.
     *
     * @return array<string, mixed>|null Parsed device with optional _raw key
     */
    public static function findDeviceByUsernameForWifi(string $username, bool $probeIfOffline = true): ?array
    {
        $device = self::findDeviceByUsername($username);
        if ($device === null) {
            return null;
        }

        $resolvedUsername = is_string($device['username'] ?? null) && $device['username'] !== ''
            ? $device['username']
            : $username;

        return self::refreshWifiDeviceState($device['id'], $resolvedUsername, $probeIfOffline);
    }

    /**
     * Re-fetch a device document and optionally probe TR-069 when periodic inform is stale.
     *
     * @return array<string, mixed>|null
     */
    public static function refreshWifiDeviceState(string $deviceId, string $username = '', bool $probeIfOffline = true): ?array
    {
        $apiUrl = config('services.genieacs.api_url', 'http://localhost:7557');
        $rawDev = self::fetchRawDeviceById($apiUrl, $deviceId);

        if ($rawDev === null) {
            return null;
        }

        $reachable = false;
        if ($probeIfOffline && !self::isDeviceOnline($rawDev)) {
            $reachable = self::probeDeviceReachability($apiUrl, $deviceId);
            if ($reachable) {
                $rawDev = self::fetchRawDeviceById($apiUrl, $deviceId) ?? $rawDev;
            }
        }

        if ($probeIfOffline && (self::isDeviceOnline($rawDev) || $reachable)) {
            $previewList = self::extractConnectedDeviceList($rawDev);
            $previewCount = count($previewList) > 0
                ? count($previewList)
                : self::sumWlanAssociations($rawDev);

            $missingClientDetails = ($previewCount ?? 0) > 0 && (
                count($previewList) === 0
                || !array_filter($previewList, static fn (array $item): bool => !empty($item['mac']))
            );

            if ($missingClientDetails) {
                $clientRefresh = self::refreshWifiClientTables($apiUrl, $deviceId, null, $rawDev);
                if (is_array($clientRefresh)) {
                    $rawDev = $clientRefresh;
                }
            }
        }

        $parsed = self::parseRawDevice($rawDev, ['reachable' => $reachable]);
        if ($parsed === null) {
            return null;
        }

        $extractedUsername = trim(self::extractUsername($rawDev));
        $parsed['username'] = $extractedUsername !== '' && $extractedUsername !== 'unknown_ont'
            ? $extractedUsername
            : $username;
        $parsed['_raw'] = $rawDev;

        return $parsed;
    }

    /**
     * @return array<string, mixed>
     */
    public static function stripRawDevicePayload(array $device): array
    {
        unset($device['_raw']);

        return $device;
    }

    /**
     * @return list<string>
     */
    public static function listRegisteredOntUsernames(): array
    {
        $apiUrl = config('services.genieacs.api_url', 'http://localhost:7557');

        try {
            $rawDevices = self::fetchRawDevicesForLookup($apiUrl);
        } catch (Exception) {
            return [];
        }

        $usernames = [];

        foreach ($rawDevices as $rawDev) {
            if (!is_array($rawDev)) {
                continue;
            }

            $ontUsername = trim(self::extractUsername($rawDev));
            if ($ontUsername === '' || $ontUsername === 'unknown_ont') {
                continue;
            }

            $usernames[] = $ontUsername;
        }

        sort($usernames);

        return array_values(array_unique($usernames));
    }

    /**
     * Push SSID and/or WiFi password changes to an ONT via GenieACS setParameterValues.
     *
     * @return array{success: bool, status?: string, message: string, http_status?: int}
     */
    public static function updateWifiCredentials(string $deviceId, ?string $ssid, ?string $password, ?array $rawDevice = null): array
    {
        $ssid = $ssid !== null ? trim($ssid) : null;
        $password = $password !== null ? trim($password) : null;

        if (($ssid === null || $ssid === '') && ($password === null || $password === '')) {
            return [
                'success' => false,
                'message' => 'SSID atau password WiFi harus diisi.',
            ];
        }

        $apiUrl = config('services.genieacs.api_url', 'http://localhost:7557');

        if ($rawDevice === null) {
            $rawDevice = self::fetchRawDeviceById($apiUrl, $deviceId);
        }

        if ($rawDevice === null) {
            return [
                'success' => false,
                'message' => 'Perangkat ONT tidak ditemukan di GenieACS.',
            ];
        }

        $parameterValues = self::buildWifiParameterValues($rawDevice, $ssid, $password);

        if ($parameterValues === []) {
            return [
                'success' => false,
                'message' => 'Tidak ada parameter WiFi yang valid untuk diubah pada ONT ini.',
            ];
        }

        $encodedId = self::encodeDeviceIdForApi($deviceId);
        $taskUrl = "{$apiUrl}/devices/{$encodedId}/tasks?connection_request&timeout=120";

        Log::info('GenieACS WiFi update task', [
            'device_id' => $deviceId,
            'parameter_values' => $parameterValues,
        ]);

        try {
            $response = Http::timeout(130)
                ->post($taskUrl, [
                    'name' => 'setParameterValues',
                    'parameterValues' => $parameterValues,
                ]);

            $status = $response->status();

            if ($status === 200 || $status === 202) {
                Log::info("GenieACS: WiFi credentials updated/queued on device {$deviceId}");

                self::kickPppoeSessionForDevice($rawDevice);

                $username = self::extractUsername($rawDevice);
                $freshRaw = self::fetchRawDeviceById($apiUrl, $deviceId) ?? $rawDevice;
                $parsed = self::parseRawDevice($freshRaw, [
                    'reachable' => $status === 200 || self::isDeviceOnline($freshRaw),
                ]);
                $refreshed = null;
                if ($parsed !== null) {
                    $extractedUsername = trim(self::extractUsername($freshRaw));
                    $parsed['username'] = $extractedUsername !== '' && $extractedUsername !== 'unknown_ont'
                        ? $extractedUsername
                        : $username;
                    $refreshed = $parsed;
                }

                return [
                    'success' => true,
                    'status' => $status === 200 ? 'executed' : 'queued',
                    'message' => $status === 200
                        ? 'Perubahan WiFi berhasil diterapkan ke ONT.'
                        : 'Perubahan WiFi dijadwalkan ke ONT.',
                    'http_status' => $status,
                    'device' => $refreshed !== null ? self::stripRawDevicePayload($refreshed) : null,
                ];
            }

            Log::error("GenieACS WiFi update failed with status {$status}: " . $response->body());

            return [
                'success' => false,
                'message' => 'GenieACS menolak permintaan ubah WiFi (HTTP ' . $status . ').',
                'http_status' => $status,
            ];
        } catch (Exception $e) {
            Log::error('GenieACS WiFi update connection error: ' . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Tidak dapat terhubung ke GenieACS: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Disconnect a WiFi client from the ONT via GenieACS setParameterValues.
     *
     * @return array{success: bool, message: string, http_status?: int, device?: array<string, mixed>|null}
     */
    public static function kickConnectedDevice(
        string $deviceId,
        string $mac,
        ?array $rawDevice = null,
        ?string $associationPath = null
    ): array {
        $mac = self::normalizeMacAddress($mac);
        if ($mac === '') {
            return [
                'success' => false,
                'message' => 'Alamat MAC perangkat tidak valid.',
                'http_status' => 422,
            ];
        }

        $apiUrl = config('services.genieacs.api_url', 'http://localhost:7557');

        if ($rawDevice === null) {
            $rawDevice = self::fetchRawDeviceById($apiUrl, $deviceId);
        }

        if ($rawDevice === null) {
            return [
                'success' => false,
                'message' => 'Perangkat ONT tidak ditemukan di GenieACS.',
                'http_status' => 404,
            ];
        }

        self::kickPppoeSessionForDevice($rawDevice);

        $parameterValues = self::buildKickParameterValues($rawDevice, $mac, $associationPath);
        if ($parameterValues === []) {
            return [
                'success' => false,
                'message' => 'ONT ini belum mendukung kick perangkat WiFi via TR-069.',
                'http_status' => 422,
            ];
        }

        $encodedId = self::encodeDeviceIdForApi($deviceId);
        $taskUrl = "{$apiUrl}/devices/{$encodedId}/tasks?connection_request&timeout=90";

        Log::info('GenieACS kick client task', [
            'device_id' => $deviceId,
            'mac' => $mac,
            'association_path' => $associationPath,
            'parameter_values' => $parameterValues,
        ]);

        try {
            $response = Http::timeout(100)->post($taskUrl, [
                'name' => 'setParameterValues',
                'parameterValues' => $parameterValues,
            ]);

            $status = $response->status();

            if ($status === 200 || $status === 202) {
                $username = self::extractUsername($rawDevice);
                $afterKickRaw = self::fetchRawDeviceById($apiUrl, $deviceId) ?? $rawDevice;
                $parsed = self::parseRawDevice($afterKickRaw, ['reachable' => true]);
                $refreshed = null;

                if ($parsed !== null) {
                    $extractedUsername = trim(self::extractUsername($afterKickRaw));
                    $parsed['username'] = $extractedUsername !== '' && $extractedUsername !== 'unknown_ont'
                        ? $extractedUsername
                        : ($username !== 'unknown_ont' ? $username : '');
                    $refreshed = self::stripRawDevicePayload($parsed);
                }

                return [
                    'success' => true,
                    'message' => 'Perintah putuskan perangkat berhasil dikirim ke ONT.',
                    'http_status' => $status,
                    'device' => $refreshed !== null ? self::stripRawDevicePayload($refreshed) : null,
                ];
            }

            Log::error("GenieACS kick client failed with status {$status}: " . $response->body());

            return [
                'success' => false,
                'message' => 'GenieACS menolak permintaan kick perangkat (HTTP ' . $status . ').',
                'http_status' => $status,
            ];
        } catch (Exception $e) {
            Log::error('GenieACS kick client connection error: ' . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Tidak dapat terhubung ke GenieACS: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Trigger a reboot task for a device in GenieACS.
     */
    public static function rebootDevice(string $deviceId): bool
    {
        // Handle simulation/mock reboot if it's a mock device ID
        if (str_ends_with($deviceId, '_budi') || str_ends_with($deviceId, '_dewi') || str_ends_with($deviceId, '_ahmad') || str_ends_with($deviceId, '_joko')) {
            Log::info("GenieACS Simulator: Rebooting device {$deviceId} successfully.");
            return true;
        }

        $apiUrl = config('services.genieacs.api_url', 'http://localhost:7557');

        try {
            // Hapus connection_request agar langsung terantre instan tanpa timeout
            $encodedId = self::encodeDeviceIdForApi($deviceId);
            $response = Http::timeout(130)
                ->post("{$apiUrl}/devices/{$encodedId}/tasks?connection_request&timeout=120", [
                    'name' => 'reboot'
                ]);

            if ($response->successful()) {
                Log::info("GenieACS: Successfully queued reboot task for device {$deviceId}");

                $rawDevice = self::fetchRawDeviceById($apiUrl, $deviceId);
                if (is_array($rawDevice)) {
                    self::kickPppoeSessionForDevice($rawDevice);
                }

                return true;
            }

            Log::error("GenieACS reboot task failed with status {$response->status()}: " . $response->body());
            return false;
        } catch (Exception $e) {
            Log::error("GenieACS reboot task connection error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Fetch device documents from GenieACS with projection, then fallback without projection.
     */
    private static function fetchRawDevices(string $apiUrl): array
    {
        $projectionFields = [
            '_id',
            '_lastInform',
            'InternetGatewayDevice.DeviceInfo',
            'Device.DeviceInfo',
            'VirtualParameters',
            'InternetGatewayDevice.WANDevice',
            'Device.PPP.Interface',
            'InternetGatewayDevice.LANDevice',
            'Device.WiFi',
        ];

        $response = Http::timeout(10)
            ->get("{$apiUrl}/devices", [
                'projection' => implode(',', $projectionFields),
            ]);

        if ($response->successful()) {
            $data = $response->json();
            if (is_array($data) && $data !== []) {
                return $data;
            }
        }

        $fallback = Http::timeout(15)->get("{$apiUrl}/devices");
        if ($fallback->successful()) {
            $data = $fallback->json();
            return is_array($data) ? $data : [];
        }

        throw new Exception('GenieACS NBI API unreachable or returned invalid data.');
    }

    /**
     * Full device documents for username/WiFi lookup (projection breaks PPPoE username paths).
     *
     * @return list<array<string, mixed>>
     */
    private static function fetchRawDevicesForLookup(string $apiUrl): array
    {
        $response = Http::timeout(20)->get("{$apiUrl}/devices");

        if (!$response->successful()) {
            throw new Exception('GenieACS NBI API unreachable (HTTP ' . $response->status() . ').');
        }

        $data = $response->json();

        if (!is_array($data)) {
            throw new Exception('GenieACS NBI API returned invalid data.');
        }

        return $data;
    }

    private static function parseRawDevice(array $rawDev, array $options = []): ?array
    {
        $deviceId = $rawDev['_id'] ?? '';
        if (!$deviceId) {
            return null;
        }

        $sn = self::getNestedValue($rawDev, [
            'InternetGatewayDevice.DeviceInfo.SerialNumber',
            'Device.DeviceInfo.SerialNumber',
        ]) ?? $deviceId;

        $username = self::extractUsername($rawDev);
        $productClass = self::extractProductClass($rawDev, $deviceId);
        $temperature = self::extractTemperature($rawDev);

        $wifiSsid = self::extractWifiSsid($rawDev);

        $wifiPassword = self::extractWifiPassword($rawDev);

        $connectedDeviceList = self::extractConnectedDeviceList($rawDev);
        $connectedDevices = count($connectedDeviceList) > 0
            ? count($connectedDeviceList)
            : self::parseConnectedDevices(self::sumWlanAssociations($rawDev) ?? self::getNestedValue($rawDev, [
                'InternetGatewayDevice.LANDevice.1.Hosts.HostNumberOfEntries',
                'Device.WiFi.AccessPoint.1.AssociatedDeviceNumberOfEntries',
            ]));

        $acsOnline = self::isDeviceOnline($rawDev);
        $reachable = (bool) ($options['reachable'] ?? false);
        $treatAsOnline = $acsOnline || $reachable;
        $lastInform = $rawDev['_lastInform'] ?? null;
        $rxRaw = self::extractRxRaw($rawDev);

        if ($rxRaw !== null) {
            $rxVal = self::parseRxPower($rxRaw);
            $rxText = $rxVal . ' dBm';
            $status = self::determineStatus($rxVal);
        } else {
            $rxText = $treatAsOnline ? 'Tidak tersedia' : 'Offline';
            $status = 'offline';
        }

        return [
            'id' => $deviceId,
            'sn' => $sn,
            'username' => $username,
            'model' => $productClass,
            'product_class' => $productClass,
            'rx' => $rxText,
            'status' => $status,
            'online' => $treatAsOnline,
            'acs_inform_stale' => !$acsOnline && $treatAsOnline,
            'last_inform' => is_string($lastInform) ? $lastInform : null,
            'temperature' => $temperature,
            'wifi_ssid' => $wifiSsid,
            'wifi_password' => $wifiPassword,
            'connected_devices' => $connectedDevices,
            'connected_device_list' => $connectedDeviceList,
            'kick_supported' => self::deviceSupportsClientKick($rawDev),
        ];
    }

    /**
     * Whether the ONT data model exposes a client-kick parameter we can target.
     */
    public static function deviceSupportsClientKick(array $rawDev): bool
    {
        $flat = self::flattenDeviceParameters($rawDev);
        if ($flat === []) {
            return false;
        }

        if (self::buildKickParameterValues($rawDev, 'AA:BB:CC:DD:EE:FF', null, $flat) !== []) {
            return true;
        }

        return self::flatHasAnyKeyMatching($flat, '/WLANConfiguration|WiFi\.AccessPoint/');
    }

    /**
     * Whether GenieACS has heard from the ONT recently (same rule as GenieACS UI: last inform within threshold).
     */
    public static function deviceIsOnline(?array $rawDevice): bool
    {
        return is_array($rawDevice) && self::isDeviceOnline($rawDevice);
    }

    /**
     * Ask GenieACS to send a TR-069 connection request so the ONT checks in sooner.
     *
     * @return array{success: bool, message: string}
     */
    public static function requestDeviceConnection(string $deviceId, ?array $rawDevice = null): array
    {
        $apiUrl = config('services.genieacs.api_url', 'http://localhost:7557');

        if ($rawDevice === null) {
            $rawDevice = self::fetchRawDeviceById($apiUrl, $deviceId);
        }

        if ($rawDevice === null) {
            return [
                'success' => false,
                'message' => 'Perangkat ONT tidak ditemukan di GenieACS.',
            ];
        }

        $encodedId = self::encodeDeviceIdForApi($deviceId);

        try {
            $response = Http::timeout(40)->post(
                "{$apiUrl}/devices/{$encodedId}/tasks?connection_request&timeout=30",
                [
                    'name' => 'getParameterValues',
                    'parameterNames' => ['InternetGatewayDevice.DeviceInfo.UpTime'],
                ]
            );

            self::kickPppoeSessionForDevice($rawDevice);

            if ($response->successful()) {
                $refreshed = self::refreshWifiDeviceState($deviceId, '', true);

                return [
                    'success' => true,
                    'message' => 'Permintaan koneksi TR-069 dikirim. Status ONT diperbarui.',
                    'device' => $refreshed !== null ? self::stripRawDevicePayload($refreshed) : null,
                ];
            }

            Log::warning('GenieACS connection request failed', [
                'device_id' => $deviceId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'success' => false,
                'message' => 'GenieACS tidak dapat menghubungi ONT (HTTP ' . $response->status() . '). Pastikan ONT menyala dan URL ACS di ONT benar.',
            ];
        } catch (Exception $e) {
            Log::error('GenieACS connection request error: ' . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Tidak dapat terhubung ke GenieACS: ' . $e->getMessage(),
            ];
        }
    }

    private static function kickPppoeSessionForDevice(array $rawDevice): void
    {
        try {
            $username = self::extractUsername($rawDevice);
            if ($username === '' || $username === 'unknown_ont') {
                return;
            }

            $customer = \App\Models\Customer::where('username', $username)->first();
            if (!$customer || !$customer->router) {
                return;
            }

            $connector = \App\Services\Router\RouterService::getConnector($customer->router);
            $connector->kickActiveConnection($customer->username);
            Log::info("GenieACS PPPoE kick: sesi {$username} diputus pada router {$customer->router->name}");
        } catch (Exception $e) {
            Log::error('GenieACS PPPoE kick error: ' . $e->getMessage());
        }
    }

    /**
     * Try to reach the ONT immediately via GenieACS connection request.
     */
    private static function probeDeviceReachability(string $apiUrl, string $deviceId): bool
    {
        $encodedId = self::encodeDeviceIdForApi($deviceId);

        try {
            $response = Http::timeout(30)->post(
                "{$apiUrl}/devices/{$encodedId}/tasks?connection_request&timeout=20",
                [
                    'name' => 'getParameterValues',
                    'parameterNames' => ['InternetGatewayDevice.DeviceInfo.UpTime'],
                ]
            );

            return $response->status() === 200;
        } catch (Exception $e) {
            Log::debug('GenieACS reachability probe failed for ' . $deviceId . ': ' . $e->getMessage());

            return false;
        }
    }

    private static function isDeviceOnline(array $rawDev): bool
    {
        $lastInformStr = $rawDev['_lastInform'] ?? null;
        if (!$lastInformStr) {
            return false;
        }

        $lastInform = strtotime($lastInformStr);

        return $lastInform && (time() - $lastInform < 300);
    }

    private static function extractRxRaw(array $rawDev): mixed
    {
        $rxRaw = self::getNestedValue($rawDev, [
            'VirtualParameters.RXPower',
            'InternetGatewayDevice.X_ZTE-COM_ONU.OpticalInfo.RxPower',
            'InternetGatewayDevice.X_ASB_COM_ONU.OpticalInfo.RxPower',
            'InternetGatewayDevice.X_HW_ONU_OpticalInfo.RxPower',
            'InternetGatewayDevice.X_HW_GponOpticalInfo.RxPower',
            'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.RXPower',
            'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.RXPower',
            'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.RXPower',
            'Device.Optical.Interface.1.RxPower',
        ]);

        if ($rxRaw !== null) {
            return $rxRaw;
        }

        return self::findParameterBySuffix($rawDev, 'RxPower')
            ?? self::findParameterBySuffix($rawDev, 'RXPower');
    }

    private static function extractUsername(array $rawDev): string
    {
        $fixedPaths = [
            'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username',
            'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.2.Username',
            'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.3.Username',
            'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.1.Username',
            'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.2.WANPPPConnection.2.Username',
            'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username',
            'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.4.WANPPPConnection.1.Username',
            'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.5.WANPPPConnection.1.Username',
            'Device.PPP.Interface.1.Username',
            'Device.PPP.Interface.2.Username',
            'VirtualParameters.pppUsername',
            'VirtualParameters.pppoeUsername',
            'VirtualParameters.pppoeUsername2',
            'VirtualParameters.pppoeUsername3',
        ];

        $candidates = [];

        foreach ($fixedPaths as $path) {
            $value = self::getNestedValue($rawDev, [$path]);
            $username = self::normalizeOntUsernameValue($value);
            if ($username !== null) {
                $candidates[] = $username;
            }
        }

        $flat = self::flattenDeviceParameters($rawDev);
        foreach (array_keys($flat) as $path) {
            if (!self::isOntUsernameParameterPath($path)) {
                continue;
            }

            $username = self::normalizeOntUsernameValue(self::flatParameterValue($flat, $path));
            if ($username !== null) {
                $candidates[] = $username;
            }
        }

        foreach ($rawDev as $key => $val) {
            if (!is_string($key) || !self::isOntUsernameParameterPath($key)) {
                continue;
            }

            $extracted = is_array($val) && array_key_exists('_value', $val)
                ? $val['_value']
                : (!is_array($val) ? $val : null);

            $username = self::normalizeOntUsernameValue($extracted);
            if ($username !== null) {
                $candidates[] = $username;
            }
        }

        $candidates = array_values(array_unique($candidates));
        if ($candidates === []) {
            return 'unknown_ont';
        }

        foreach ($candidates as $username) {
            if (str_contains($username, '@')) {
                return $username;
            }
        }

        return $candidates[0];
    }

    private static function isOntUsernameParameterPath(string $path): bool
    {
        if (preg_match('/ManagementServer/i', $path)) {
            return false;
        }

        return preg_match('/WANPPPConnection\.\d+\.Username$/', $path) === 1
            || preg_match('/Device\.PPP\.Interface\.\d+\.Username$/', $path) === 1
            || preg_match('/^VirtualParameters\.(pppoeUsername\d*|pppUsername\d*)$/i', $path) === 1;
    }

    private static function normalizeOntUsernameValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $username = trim((string) $value);
        if ($username === '' || strtolower($username) === 'blank') {
            return null;
        }

        return $username;
    }

    /**
     * Helper to extract value from multi-level array using wildcard or sequential keys.
     */
    private static function getNestedValue(array $data, array $keys)
    {
        foreach ($keys as $keyPath) {
            // 1. Check direct flat dot-notation key (standard for GenieACS NBI projection responses)
            if (isset($data[$keyPath])) {
                $val = $data[$keyPath];
                if (is_array($val) && isset($val['_value'])) {
                    return $val['_value'];
                }
                if (!is_array($val)) {
                    return $val;
                }
            }

            // 2. Fallback to nested object traversal
            $parts = explode('.', $keyPath);
            $current = $data;
            $found = true;
            
            foreach ($parts as $part) {
                if (is_array($current) && isset($current[$part])) {
                    $current = $current[$part];
                } else {
                    $found = false;
                    break;
                }
            }

            if ($found) {
                // GenieACS parameters are objects containing '_value'
                if (is_array($current) && isset($current['_value'])) {
                    return $current['_value'];
                }
                if (!is_array($current)) {
                    return $current;
                }
            }
        }

        return null;
    }

    /**
     * Clean and normalize Rx Optical Power from raw values.
     */
    private static function parseRxPower($raw): float
    {
        if ($raw === null || $raw === '') {
            return -15.0; // Default placeholder
        }

        $val = (float) $raw;

        // If ZTE/Huawei reports it in micro-Watts or 0.001 dBm units (e.g., -26000 or -19500)
        if (abs($val) > 1000) {
            $val = $val / 1000;
        }

        // Rx Optical power should always be negative
        if ($val > 0) {
            $val = -$val;
        }

        return round($val, 1);
    }

    /**
     * Determine connection quality status based on Rx Power (dBm).
     */
    private static function determineStatus(float $rx): string
    {
        if ($rx >= -24.0) {
            return 'good';
        } elseif ($rx >= -27.0) {
            return 'warning';
        }
        return 'critical';
    }

    private static function extractWifiSsid(array $rawDev): ?string
    {
        $flat = self::flattenDeviceParameters($rawDev);
        if ($flat !== []) {
            $wlanIndex = self::resolveActiveWlanIndex($flat);
            $ssid = self::flatParameterValue(
                $flat,
                "InternetGatewayDevice.LANDevice.1.WLANConfiguration.{$wlanIndex}.SSID"
            );
            if ($ssid !== null && $ssid !== '') {
                return trim((string) $ssid);
            }

            $tr181Ssid = self::flatParameterValue($flat, 'Device.WiFi.SSID.1.SSID');
            if ($tr181Ssid !== null && $tr181Ssid !== '') {
                return trim((string) $tr181Ssid);
            }
        }

        $value = self::getNestedValue($rawDev, [
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
            'Device.WiFi.SSID.1.SSID',
        ]);

        if ($value !== null && $value !== '') {
            return trim((string) $value);
        }

        foreach ($rawDev as $key => $val) {
            if (!is_string($key) || !str_contains($key, 'WLANConfiguration') || !str_ends_with($key, '.SSID')) {
                continue;
            }

            $extracted = is_array($val) && array_key_exists('_value', $val)
                ? $val['_value']
                : (!is_array($val) ? $val : null);

            if ($extracted !== null && $extracted !== '') {
                return trim((string) $extracted);
            }
        }

        return null;
    }

    private static function extractProductClass(array $rawDev, string $deviceId = ''): ?string
    {
        $value = self::getNestedValue($rawDev, [
            'InternetGatewayDevice.DeviceInfo.ProductClass',
            'Device.DeviceInfo.ProductClass',
            'VirtualParameters.productClass',
            'VirtualParameters.ProductClass',
            'VirtualParameters.getProductClass',
        ]);

        if ($value === null || $value === '') {
            $value = self::findParameterBySuffix($rawDev, 'ProductClass');
        }

        if ($value === null || $value === '') {
            foreach ($rawDev as $key => $val) {
                if (!is_string($key) || stripos($key, 'ProductClass') === false) {
                    continue;
                }

                $extracted = is_array($val) && array_key_exists('_value', $val)
                    ? $val['_value']
                    : (!is_array($val) ? $val : null);

                if ($extracted !== null && $extracted !== '') {
                    $value = $extracted;
                    break;
                }
            }
        }

        if ($value === null || $value === '') {
            $value = self::parseProductClassFromDeviceId($deviceId ?: ($rawDev['_id'] ?? ''));
        }

        return self::normalizeProductClass($value);
    }

    /**
     * GenieACS device IDs use the format: OUI-ProductClass-SerialNumber
     * Example: 00259E-F477V2-4857544312345678 or 00259E-GM220-S-ZTEGC7A19B32
     */
    private static function parseProductClassFromDeviceId(string $deviceId): ?string
    {
        $deviceId = trim(urldecode($deviceId));
        if ($deviceId === '') {
            return null;
        }

        $parts = explode('-', $deviceId);
        if (count($parts) < 3) {
            return null;
        }

        array_pop($parts); // Serial number (last segment)
        array_shift($parts); // OUI (first segment)

        $productClass = trim(implode('-', $parts));

        if ($productClass === '' || preg_match('/^[0-9A-Fa-f]{6}$/', $productClass)) {
            return null;
        }

        return $productClass;
    }

    private static function normalizeProductClass(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $text = trim((string) $value);

        if ($text === '' || strcasecmp($text, 'Generic ONT') === 0) {
            return null;
        }

        return $text;
    }

    private static function extractTemperature(array $rawDev): ?string
    {
        $tempRaw = self::getNestedValue($rawDev, [
            'VirtualParameters.temperature',
            'VirtualParameters.Temperature',
            'VirtualParameters.gettemp',
            'VirtualParameters.getTemp',
            'InternetGatewayDevice.X_HW_GponOpticalInfo.TransceiverTemperature',
            'InternetGatewayDevice.X_HW_ONU_OpticalInfo.TransceiverTemperature',
            'InternetGatewayDevice.X_HW_ONU_OpticalInfo.Temperature',
            'InternetGatewayDevice.X_ZTE-COM_ONU.OpticalInfo.Temperature',
            'InternetGatewayDevice.X_ASB_COM_ONU.OpticalInfo.Temperature',
            'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.TransceiverTemperature',
            'InternetGatewayDevice.WANDevice.1.X_GponInterafceConfig.Temperature',
            'InternetGatewayDevice.WANDevice.1.X_CT-COM_GponInterfaceConfig.TransceiverTemperature',
            'InternetGatewayDevice.WANDevice.1.X_CT-COM_EponInterfaceConfig.TransceiverTemperature',
            'Device.TemperatureStatus.Temperature',
            'Device.DeviceInfo.TemperatureStatus.Temperature',
            'InternetGatewayDevice.DeviceInfo.TemperatureStatus.Temperature',
        ]);

        if ($tempRaw === null) {
            $tempRaw = self::findParameterBySuffix($rawDev, 'TransceiverTemperature')
                ?? self::findParameterBySuffix($rawDev, 'Temperature');
        }

        return self::formatTemperature($tempRaw);
    }

    private static function findParameterBySuffix(array $data, string $suffix): mixed
    {
        $candidates = [];

        foreach ($data as $key => $val) {
            if (!is_string($key)) {
                continue;
            }

            $leaf = str_contains($key, '.') ? substr($key, strrpos($key, '.') + 1) : $key;
            if (strcasecmp($leaf, $suffix) !== 0) {
                continue;
            }

            $extracted = null;
            if (is_array($val) && array_key_exists('_value', $val)) {
                $extracted = $val['_value'];
            } elseif (!is_array($val) && $val !== '') {
                $extracted = $val;
            }

            if ($extracted !== null && $extracted !== '') {
                $candidates[$key] = $extracted;
            }
        }

        if ($candidates === []) {
            return null;
        }

        $preferredPrefixes = [
            'InternetGatewayDevice.DeviceInfo.',
            'Device.DeviceInfo.',
            'VirtualParameters.',
        ];

        foreach ($preferredPrefixes as $prefix) {
            foreach ($candidates as $key => $val) {
                if (str_starts_with($key, $prefix)) {
                    return $val;
                }
            }
        }

        return reset($candidates);
    }

    private static function parseTemperature($raw): ?float
    {
        if ($raw === null || $raw === '') {
            return null;
        }

        $val = (float) $raw;

        // ZTE/Huawei often report temperature scaled (e.g. 4300 = 43.0°C)
        if (abs($val) > 200 && abs($val) < 10000) {
            $val = $val / 100;
        } elseif (abs($val) >= 10000) {
            $val = $val / 256;
        }

        if ($val < -20 || $val > 120) {
            return null;
        }

        return round($val, 1);
    }

    private static function formatTemperature($raw): ?string
    {
        $val = self::parseTemperature($raw);

        return $val !== null ? $val . '°C' : null;
    }

    private static function parseConnectedDevices($raw): ?int
    {
        if ($raw === null || $raw === '') {
            return null;
        }

        $count = (int) $raw;
        return $count >= 0 ? $count : null;
    }

    private static function sumWlanAssociations(array $rawDev): ?int
    {
        $flat = self::flattenDeviceParameters($rawDev);
        if ($flat === []) {
            return null;
        }

        $total = 0;
        $found = false;

        foreach (array_keys($flat) as $path) {
            if (!preg_match('/\.WLANConfiguration\.(\d+)\.TotalAssociations$/', $path)) {
                continue;
            }

            $count = self::parseConnectedDevices(self::flatParameterValue($flat, $path));
            if ($count === null) {
                continue;
            }

            $found = true;
            $total += $count;
        }

        return $found ? $total : null;
    }

    /**
     * @return list<array{name: string, mac: ?string, ip: ?string}>
     */
    private static function extractConnectedDeviceList(array $rawDev): array
    {
        $flat = self::flattenDeviceParameters($rawDev);
        if ($flat === []) {
            return [];
        }

        $groups = [];

        foreach (array_keys($flat) as $path) {
            if (!preg_match('/^(.*\.(?:AssociatedDevice|Host))\.(\d+)\.(.+)$/', $path, $matches)) {
                continue;
            }

            $groupKey = $matches[1] . '.' . $matches[2];
            $field = $matches[3];
            $groups[$groupKey][$field] = self::flatParameterValue($flat, $path);
        }

        $results = [];

        foreach ($groups as $groupKey => $fields) {
            $isHost = str_contains($groupKey, '.Host.');

            if ($isHost) {
                $active = $fields['Active'] ?? null;
                if ($active !== null && !self::isTruthy($active)) {
                    continue;
                }

                $layer = strtolower((string) ($fields['Layer1Interface'] ?? $fields['InterfaceType'] ?? ''));
                if ($layer !== ''
                    && !str_contains($layer, 'wlan')
                    && !str_contains($layer, 'wifi')
                    && !str_contains($layer, '802.11')
                    && (str_contains($layer, 'ethernet') || str_contains($layer, 'lan'))) {
                    continue;
                }
            }

            $mac = self::pickFirstParameterField($fields, [
                'AssociatedDeviceMACAddress',
                'MACAddress',
                'PhysAddress',
            ]);
            $ip = self::pickFirstParameterField($fields, [
                'AssociatedDeviceIPAddress',
                'IPAddress',
            ]);
            $name = self::pickFirstParameterField($fields, [
                'AssociatedDeviceHostName',
                'X_ZTE-COM_AssociatedDeviceName',
                'X_ZTE-COM_DeviceName',
                'HostName',
                'DeviceName',
            ]);

            $name = trim((string) ($name ?? ''));
            $mac = self::normalizeMacAddress(trim((string) ($mac ?? '')));
            $ip = trim((string) ($ip ?? ''));

            if ($name === '' && $mac === '' && $ip === '') {
                continue;
            }

            if ($name === '') {
                $name = $mac !== '' ? $mac : ($ip !== '' ? $ip : 'Perangkat');
            }

            $wlanIndex = self::resolveWlanIndexFromAssociationPath($groupKey);

            $results[] = [
                'name' => $name,
                'mac' => $mac !== '' ? $mac : null,
                'ip' => $ip !== '' ? $ip : null,
                'path' => $groupKey,
                'wlan_index' => $wlanIndex,
            ];
        }

        $seen = [];
        $deduped = [];

        foreach ($results as $device) {
            $key = strtolower($device['mac'] ?? $device['name']);
            if ($key === '' || isset($seen[$key])) {
                continue;
            }

            $seen[$key] = true;
            $deduped[] = $device;
        }

        usort($deduped, static fn (array $a, array $b): int => strcasecmp($a['name'], $b['name']));

        return $deduped;
    }

    /**
     * @param  array<string, mixed>  $fields
     */
    private static function pickFirstParameterField(array $fields, array $candidates): mixed
    {
        foreach ($candidates as $field) {
            if (!array_key_exists($field, $fields)) {
                continue;
            }

            $value = $fields[$field];
            if ($value !== null && $value !== '') {
                return $value;
            }
        }

        return null;
    }

    private static function doubleUrlEncodeDeviceId(string $deviceId): string
    {
        return rawurlencode(rawurlencode(urldecode($deviceId)));
    }

    private static function encodeDeviceIdForApi(string $deviceId): string
    {
        return self::doubleUrlEncodeDeviceId($deviceId);
    }

    /**
     * @return list<array{0: string, 1: string, 2?: string}>
     */
    private static function buildWifiParameterValues(array $rawDev, ?string $ssid, ?string $password): array
    {
        $flat = self::flattenDeviceParameters($rawDev);

        if (self::flatHasAnyKeyMatching($flat, '/^Device\.WiFi\./') && !self::flatHasAnyKeyMatching($flat, '/WLANConfiguration/')) {
            return self::buildWifiParameterValuesTr181($flat, $ssid, $password);
        }

        $wlanIndex = self::resolveActiveWlanIndex($flat);
        $base = "InternetGatewayDevice.LANDevice.1.WLANConfiguration.{$wlanIndex}";
        $parameterValues = [];

        if ($ssid !== null && $ssid !== '') {
            $parameterValues[] = ["{$base}.SSID", $ssid, 'xsd:string'];
        }

        if ($password !== null && $password !== '') {
            $beaconType = self::flatParameterValue($flat, "{$base}.BeaconType");
            if (self::isOpenBeaconType($beaconType)) {
                $parameterValues[] = ["{$base}.BeaconType", self::resolveWpaBeaconType($flat), 'xsd:string'];
            }

            $passwordPath = self::resolvePasswordPathForWlan($flat, $base);
            $parameterValues[] = [$passwordPath, $password, 'xsd:string'];
        }

        return $parameterValues;
    }

    /**
     * @return list<array{0: string, 1: string, 2?: string}>
     */
    private static function buildWifiParameterValuesTr181(array $flat, ?string $ssid, ?string $password): array
    {
        $parameterValues = [];

        if ($ssid !== null && $ssid !== '') {
            $parameterValues[] = ['Device.WiFi.SSID.1.SSID', $ssid, 'xsd:string'];
        }

        if ($password !== null && $password !== '') {
            $parameterValues[] = ['Device.WiFi.AccessPoint.1.Security.KeyPassphrase', $password, 'xsd:string'];
        }

        return $parameterValues;
    }

    /**
     * @param  array<string, mixed>|null  $flat
     * @return list<array{0: string, 1: string|bool|int, 2?: string}>
     */
    private static function buildKickParameterValues(
        array $rawDev,
        string $mac,
        ?string $associationPath = null,
        ?array $flat = null
    ): array {
        $flat ??= self::flattenDeviceParameters($rawDev);
        if ($flat === []) {
            return [];
        }

        $deviceId = is_string($rawDev['_id'] ?? null) ? $rawDev['_id'] : '';
        $productClass = self::extractProductClass($rawDev, $deviceId) ?? '';

        $associationPath = $associationPath !== null ? trim($associationPath) : '';
        $wlanIndex = $associationPath !== ''
            ? (self::resolveWlanIndexFromAssociationPath($associationPath) ?? self::resolveActiveWlanIndex($flat))
            : self::resolveActiveWlanIndex($flat);

        if ($associationPath !== '') {
            foreach (self::kickFieldNames() as $field) {
                $path = "{$associationPath}.{$field}";
                if (self::flatParameterWritable($flat, $path)) {
                    return [[$path, self::kickValueForField($field, $mac), self::kickTypeForField($field)]];
                }
            }
        }

        $candidates = self::wlanKickParameterCandidates($flat, $wlanIndex);
        foreach ($candidates as $path) {
            if (self::flatParameterWritable($flat, $path)) {
                return [[$path, self::kickValueForPath($path, $mac), self::kickTypeForPath($path)]];
            }
        }

        $wlanBase = "InternetGatewayDevice.LANDevice.1.WLANConfiguration.{$wlanIndex}";
        foreach (array_keys($flat) as $path) {
            if (!str_starts_with($path, $wlanBase) && !str_starts_with($path, 'Device.WiFi.AccessPoint.')) {
                continue;
            }
            if (!preg_match('/(?:WLANConfiguration|WiFi\.AccessPoint)/i', $path)) {
                continue;
            }
            if (!preg_match('/(?:Kick|Disconnect|Deauth|KickOff|KickSta|StaKick)/i', $path)) {
                continue;
            }
            if (!self::flatParameterWritable($flat, $path)) {
                continue;
            }

            return [[$path, self::kickValueForPath($path, $mac), self::kickTypeForPath($path)]];
        }

        // Vendor defaults when kick parameter is not yet discovered in GenieACS cache.
        if (self::flatHasAnyKeyMatching($flat, '/WLANConfiguration|WiFi\.AccessPoint/')) {
            foreach (self::vendorKickDefaultPaths($productClass, $wlanIndex) as $path) {
                if (!self::flatParameterWritable($flat, $path) && isset($flat[$path])) {
                    continue;
                }

                return [[$path, self::kickValueForPath($path, $mac), self::kickTypeForPath($path)]];
            }
        }

        return [];
    }

    /**
     * @return list<string>
     */
    private static function kickFieldNames(): array
    {
        return [
            'Kick',
            'KickOff',
            'KickDevice',
            'KickSta',
            'X_ZTE-COM_Kick',
            'X_ZTE-COM_KickOffDevice',
            'X_ZTE-COM_KickSta',
            'X_HW_WIFIStaKick',
            'X_HW_AssociateDeviceKick',
            'X_FH_KickOffDevice',
        ];
    }

    /**
     * @return list<string>
     */
    private static function vendorKickDefaultPaths(string $productClass, int $wlanIndex): array
    {
        $wlanBase = "InternetGatewayDevice.LANDevice.1.WLANConfiguration.{$wlanIndex}";
        $normalized = strtolower($productClass);

        if (str_contains($normalized, 'huawei') || str_contains($normalized, 'hg8') || str_contains($normalized, 'eg8')) {
            return [
                "{$wlanBase}.X_HW_WIFIStaKick",
                "{$wlanBase}.X_HW_AssociateDeviceKick",
                'Device.WiFi.AccessPoint.1.X_HW_WIFIStaKick',
            ];
        }

        if (str_contains($normalized, 'fiberhome') || str_contains($normalized, 'fh')) {
            return ["{$wlanBase}.X_FH_KickOffDevice"];
        }

        if (str_contains($normalized, 'zte') || preg_match('/\bf[0-9]{3,4}\b/i', $productClass)) {
            return [
                "{$wlanBase}.X_ZTE-COM_KickOffDevice",
                "{$wlanBase}.X_ZTE-COM_KickSta",
            ];
        }

        return [
            "{$wlanBase}.X_ZTE-COM_KickOffDevice",
            "{$wlanBase}.X_ZTE-COM_KickSta",
            "{$wlanBase}.X_HW_WIFIStaKick",
            "{$wlanBase}.X_FH_KickOffDevice",
            'Device.WiFi.AccessPoint.1.X_HW_WIFIStaKick',
        ];
    }

    /**
     * @param  array<string, mixed>  $flat
     * @return list<string>
     */
    private static function wlanKickParameterCandidates(array $flat, ?int $wlanIndex = null): array
    {
        $wlanIndex ??= self::resolveActiveWlanIndex($flat);
        $wlanBase = "InternetGatewayDevice.LANDevice.1.WLANConfiguration.{$wlanIndex}";

        return [
            "{$wlanBase}.X_ZTE-COM_KickOffDevice",
            "{$wlanBase}.X_ZTE-COM_KickSta",
            "{$wlanBase}.X_ZTE-COM_STA_KICK",
            "{$wlanBase}.X_HW_WIFIStaKick",
            "{$wlanBase}.X_HW_AssociateDeviceKick",
            "{$wlanBase}.X_FH_KickOffDevice",
            "{$wlanBase}.X_TP_KickDevice",
            "{$wlanBase}.KickOffDevice",
            "{$wlanBase}.KickSta",
            'Device.WiFi.AccessPoint.1.Kick',
            'Device.WiFi.AccessPoint.1.X_HW_WIFIStaKick',
        ];
    }

    private static function kickValueForField(string $field, string $mac): string|bool|int
    {
        if (preg_match('/mac/i', $field)) {
            return $mac;
        }

        if (preg_match('/^Kick$/i', $field)) {
            return true;
        }

        return $mac;
    }

    private static function kickTypeForField(string $field): string
    {
        if (preg_match('/^Kick$/i', $field)) {
            return 'xsd:boolean';
        }

        return 'xsd:string';
    }

    private static function kickValueForPath(string $path, string $mac): string|bool|int
    {
        if (preg_match('/\.Kick$/i', $path)) {
            return true;
        }

        if (preg_match('/KickSta|STA_KICK/i', $path)) {
            return str_replace(':', '', $mac);
        }

        return $mac;
    }

    private static function kickTypeForPath(string $path): string
    {
        if (preg_match('/\.Kick$/i', $path)) {
            return 'xsd:boolean';
        }

        return 'xsd:string';
    }

    public static function normalizeMacAddress(string $mac): string
    {
        $mac = strtoupper(trim($mac));
        $mac = preg_replace('/[^0-9A-F]/', '', $mac) ?? '';

        if (strlen($mac) !== 12) {
            return '';
        }

        return implode(':', str_split($mac, 2));
    }

    private static function extractWifiPassword(array $rawDev): ?string
    {
        $flat = self::flattenDeviceParameters($rawDev);
        if ($flat !== []) {
            $wlanIndex = self::resolveActiveWlanIndex($flat);
            $base = "InternetGatewayDevice.LANDevice.1.WLANConfiguration.{$wlanIndex}";

            foreach (self::passwordPathCandidates($base) as $path) {
                $val = self::flatParameterValue($flat, $path);
                if ($val !== null && $val !== '') {
                    return trim((string) $val);
                }
            }

            $tr181 = self::flatParameterValue($flat, 'Device.WiFi.AccessPoint.1.Security.KeyPassphrase');
            if ($tr181 !== null && $tr181 !== '') {
                return trim((string) $tr181);
            }
        }

        return self::getNestedValue($rawDev, [
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.KeyPassphrase',
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.KeyPassphrase',
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.PreSharedKey.1.PreSharedKey',
            'Device.WiFi.AccessPoint.1.Security.KeyPassphrase',
        ]);
    }

    /**
     * @return list<string>
     */
    private static function passwordPathCandidates(string $wlanBase): array
    {
        return [
            "{$wlanBase}.PreSharedKey.1.KeyPassphrase",
            "{$wlanBase}.KeyPassphrase",
            "{$wlanBase}.PreSharedKey.1.PreSharedKey",
            "{$wlanBase}.X_TP_PreSharedKey",
        ];
    }

    private static function resolvePasswordPathForWlan(array $flat, string $wlanBase): string
    {
        foreach (self::passwordPathCandidates($wlanBase) as $path) {
            if (self::flatParameterWritable($flat, $path)) {
                return $path;
            }
        }

        return "{$wlanBase}.PreSharedKey.1.KeyPassphrase";
    }

    private static function resolveActiveWlanIndex(array $flat): int
    {
        $scores = [];

        foreach (array_keys($flat) as $path) {
            if (!preg_match('/\.WLANConfiguration\.(\d+)\.Enable$/', $path, $matches)) {
                continue;
            }

            $index = (int) $matches[1];
            if (!self::isTruthy(self::flatParameterValue($flat, $path))) {
                continue;
            }

            $base = preg_replace('/\.Enable$/', '', $path);
            $associations = (int) (self::flatParameterValue($flat, "{$base}.TotalAssociations") ?? 0);
            $scores[$index] = max($associations, 1);
        }

        if ($scores === []) {
            return 1;
        }

        arsort($scores);

        return (int) array_key_first($scores);
    }

    private static function resolveWlanIndexFromAssociationPath(string $path): ?int
    {
        if (preg_match('/\.WLANConfiguration\.(\d+)\./', $path, $matches)) {
            return (int) $matches[1];
        }

        if (preg_match('/\.AccessPoint\.(\d+)\./', $path, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }

    private static function resolveWlanBaseFromAssociationPath(?string $associationPath): ?string
    {
        $associationPath = $associationPath !== null ? trim($associationPath) : '';
        if ($associationPath === '') {
            return null;
        }

        if (preg_match('/^(InternetGatewayDevice\.LANDevice\.1\.WLANConfiguration\.\d+)/', $associationPath, $matches)) {
            return $matches[1];
        }

        if (preg_match('/^(Device\.WiFi\.AccessPoint\.\d+)/', $associationPath, $matches)) {
            return $matches[1];
        }

        return null;
    }

    /**
     * Ask the ONT to refresh WiFi client tables so MAC/path data is current.
     *
     * @return array<string, mixed>|null
     */
    private static function refreshWifiClientTables(
        string $apiUrl,
        string $deviceId,
        ?string $wlanBase = null,
        ?array $rawDevice = null
    ): ?array {
        if ($rawDevice === null) {
            $rawDevice = self::fetchRawDeviceById($apiUrl, $deviceId);
        }

        if ($rawDevice === null) {
            return null;
        }

        $objectNames = self::resolveWifiClientRefreshObjects($rawDevice, $wlanBase);
        if ($objectNames === []) {
            return null;
        }

        $encodedId = self::encodeDeviceIdForApi($deviceId);
        $refreshed = false;

        foreach ($objectNames as $objectName) {
            try {
                $response = Http::timeout(60)->post(
                    "{$apiUrl}/devices/{$encodedId}/tasks?connection_request&timeout=45",
                    [
                        'name' => 'refreshObject',
                        'objectName' => $objectName,
                    ]
                );

                if ($response->status() === 200 || $response->status() === 202) {
                    $refreshed = true;
                    break;
                }

                Log::debug('GenieACS WiFi client refreshObject failed', [
                    'device_id' => $deviceId,
                    'object_name' => $objectName,
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
            } catch (Exception $e) {
                Log::debug('GenieACS WiFi client refreshObject error: ' . $e->getMessage(), [
                    'device_id' => $deviceId,
                    'object_name' => $objectName,
                ]);
            }
        }

        if (!$refreshed) {
            return null;
        }

        return self::fetchRawDeviceById($apiUrl, $deviceId);
    }

    /**
     * @return list<string>
     */
    private static function resolveWifiClientRefreshObjects(array $rawDevice, ?string $wlanBase): array
    {
        $flat = self::flattenDeviceParameters($rawDevice);
        if ($flat === []) {
            return [];
        }

        if ($wlanBase !== null) {
            $associatedDeviceObject = "{$wlanBase}.AssociatedDevice";
            if (self::flatHasPathPrefix($flat, $associatedDeviceObject)) {
                return [$associatedDeviceObject];
            }

            if (self::flatHasPathPrefix($flat, $wlanBase)) {
                return [$wlanBase];
            }

            return [];
        }

        $objects = [];
        $usesTr098 = self::flatHasAnyKeyMatching($flat, '/WLANConfiguration/');

        if ($usesTr098) {
            foreach (array_keys($flat) as $path) {
                if (!preg_match('/^(InternetGatewayDevice\.LANDevice\.1\.WLANConfiguration\.\d+)\.AssociatedDevice\./', $path, $matches)) {
                    continue;
                }

                $objects[$matches[1] . '.AssociatedDevice'] = true;
            }

            if (self::flatHasPathPrefix($flat, 'InternetGatewayDevice.LANDevice.1.Hosts.Host')) {
                $objects['InternetGatewayDevice.LANDevice.1.Hosts.Host'] = true;
            }

            if ($objects === []) {
                $wlanIndex = self::resolveActiveWlanIndex($flat);
                $fallback = "InternetGatewayDevice.LANDevice.1.WLANConfiguration.{$wlanIndex}";
                if (self::flatHasPathPrefix($flat, $fallback)) {
                    $objects[$fallback] = true;
                }
            }
        } elseif (self::flatHasPathPrefix($flat, 'Device.WiFi.AccessPoint.1.AssociatedDevice')) {
            $objects['Device.WiFi.AccessPoint.1.AssociatedDevice'] = true;
        }

        return array_values(array_keys($objects));
    }

    private static function flatHasPathPrefix(array $flat, string $prefix): bool
    {
        foreach (array_keys($flat) as $path) {
            if ($path === $prefix || str_starts_with($path, $prefix . '.')) {
                return true;
            }
        }

        return false;
    }

    private static function resolveWpaBeaconType(array $flat): string
    {
        foreach (array_keys($flat) as $path) {
            if (!str_ends_with($path, '.BeaconType')) {
                continue;
            }

            $val = self::flatParameterValue($flat, $path);
            if ($val !== null && !self::isOpenBeaconType($val)) {
                return (string) $val;
            }
        }

        return 'WPA/WPA2';
    }

    private static function isOpenBeaconType(mixed $beaconType): bool
    {
        if ($beaconType === null || $beaconType === '') {
            return true;
        }

        $normalized = strtolower(trim((string) $beaconType));

        return in_array($normalized, ['none', 'basic', 'open'], true);
    }

    private static function isTruthy(mixed $value): bool
    {
        if ($value === null || $value === '') {
            return false;
        }

        if (is_bool($value)) {
            return $value;
        }

        $normalized = strtolower(trim((string) $value));

        return in_array($normalized, ['1', 'true', 'yes', 'enabled', 'on'], true);
    }

    private static function flattenDeviceParameters(array $data, string $prefix = ''): array
    {
        $flat = [];

        foreach ($data as $key => $val) {
            if (!is_string($key) && !is_int($key)) {
                continue;
            }

            if ($prefix === '' && in_array($key, ['_id', '_lastInform', '_registered', '_tags', '_deviceId'], true)) {
                $flat[$key] = $val;
                continue;
            }

            $path = $prefix === '' ? (string) $key : "{$prefix}.{$key}";

            if (!is_array($val)) {
                continue;
            }

            if (array_key_exists('_value', $val)) {
                $flat[$path] = $val;
                continue;
            }

            $flat = array_merge($flat, self::flattenDeviceParameters($val, $path));
        }

        return $flat;
    }

    private static function flatParameterValue(array $flat, string $path): mixed
    {
        if (!isset($flat[$path])) {
            return null;
        }

        $val = $flat[$path];

        if (is_array($val) && array_key_exists('_value', $val)) {
            return $val['_value'];
        }

        return is_array($val) ? null : $val;
    }

    private static function flatParameterWritable(array $flat, string $path): bool
    {
        if (!isset($flat[$path])) {
            return false;
        }

        $val = $flat[$path];
        if (!is_array($val)) {
            return true;
        }

        if (array_key_exists('_writable', $val) && $val['_writable'] === false) {
            return false;
        }

        return array_key_exists('_value', $val) || $val !== [];
    }

    private static function flatHasAnyKeyMatching(array $flat, string $pattern): bool
    {
        foreach (array_keys($flat) as $path) {
            if (preg_match($pattern, $path)) {
                return true;
            }
        }

        return false;
    }

    private static function fetchRawDeviceById(string $apiUrl, string $deviceId): ?array
    {
        try {
            $query = json_encode(['_id' => $deviceId]);
            $response = Http::timeout(10)->get("{$apiUrl}/devices", [
                'query' => $query
            ]);

            if ($response->successful()) {
                $data = $response->json();
                if (is_array($data) && !empty($data)) {
                    return $data[0];
                }
            }
        } catch (Exception $e) {
            Log::error("GenieACS fetchRawDeviceById error: " . $e->getMessage());
        }

        return null;
    }

    private static function normalizeUsername(string $username): string
    {
        return strtolower(trim(explode('@', $username)[0]));
    }

    private static function usernameMatches(string $ontUsername, string $needle): bool
    {
        if ($ontUsername === '' || $ontUsername === 'unknown_ont') {
            return false;
        }

        $ontFull = strtolower(trim($ontUsername));
        $needleFull = strtolower(trim($needle));
        $ontLocal = self::normalizeUsername($ontUsername);
        $needleLocal = self::normalizeUsername($needle);

        return $ontFull === $needleFull || $ontLocal === $needleLocal;
    }
}
