<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Router;
use App\Models\Customer;
use App\Models\Package;
use App\Models\Invoice;
use App\Models\User;
use App\Services\BillingService;
use App\Services\SettingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;
use App\Models\HotspotVoucher;
use App\Models\HotspotSale;

class AdminActionController extends Controller
{
    /**
     * Create or update a Mikrotik Router.
     */
    public function saveRouter(Request $request)
    {
        $data = $request->validate([
            'id' => 'nullable|integer',
            'name' => 'required|string|max:100',
            'host' => 'required|string',
            'port' => 'required|integer',
            'username' => 'required|string',
            'password' => 'nullable|string',
            'protocol_type' => 'required|in:legacy_socket,rest_api',
            'status' => 'required|boolean',
        ]);

        $id = $data['id'] ?? null;
        unset($data['id']);

        if (empty($data['password']) && $id) {
            // Keep old password
            unset($data['password']);
        }

        Router::updateOrCreate(['id' => $id], $data);

        return redirect()->back()->with('success', 'Router berhasil disimpan.');
    }

    /**
     * Create or update a Customer profile, linking their User account.
     */
    public function saveCustomer(Request $request)
    {
        $data = $request->validate([
            'id' => 'nullable|integer',
            'router_id' => 'required|exists:routers,id',
            'package_id' => 'nullable|exists:packages,id',
            'odp_id' => 'nullable|exists:odps,id',
            'service_type' => 'required|in:pppoe,hotspot',
            'username' => 'required|string|max:100',
            'password' => 'required|string|max:100',
            'name' => 'required|string|max:150',
            'phone_number' => 'required|string|max:20',
            'address' => 'required|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'status' => 'required|in:active,isolated,inactive,suspended',
            'billing_date' => 'required|integer|min:1|max:31',
        ]);

        $id = $data['id'] ?? null;
        unset($data['id']);

        // Create or update linked user first
        $email = $data['username'] . '@mwifi.test';
        
        $customer = null;
        $userId = null;

        if ($id) {
            $customer = Customer::findOrFail($id);
            $userId = $customer->user_id;
        }

        $user = User::updateOrCreate(
            ['id' => $userId],
            [
                'name' => $data['name'],
                'email' => $email,
                'password' => Hash::make($data['password']),
            ]
        );

        $data['user_id'] = $user->id;

        Customer::updateOrCreate(['id' => $id], $data);

        return redirect()->back()->with('success', 'Data pelanggan berhasil disimpan.');
    }

    /**
     * Delete a customer with dual mode (local database only, or database + router secret).
     */
    public function deleteCustomer(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|exists:customers,id',
            'mode' => 'required|in:local_only,total'
        ]);

        $customer = Customer::findOrFail($data['id']);
        $mode = $data['mode'];

        try {
            if ($mode === 'total' && $customer->router) {
                try {
                    // Connect to Mikrotik
                    $connector = \App\Services\Router\RouterService::getConnector($customer->router);
                    
                    // Delete PPP Secret
                    $connector->deleteSecret($customer->username);
                    
                    // Also kick active connection if connected
                    $connector->kickActiveConnection($customer->username);
                } catch (\Exception $me) {
                    // Log Mikrotik connection/deletion failure so local delete can proceed
                    \Illuminate\Support\Facades\Log::warning("Gagal menghapus secret di Mikrotik saat menghapus customer: " . $me->getMessage());
                }
            }

            // Delete linked User account
            if ($customer->user) {
                $customer->user->delete();
            }

            // Delete Customer
            $customer->delete();

            return redirect()->back()->with('success', 'Pelanggan berhasil dihapus.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal menghapus pelanggan: ' . $e->getMessage());
        }
    }

    /**
     * Bulk delete customers with dual mode (local database only, or database + router secret).
     */
    public function bulkDeleteCustomer(Request $request)
    {
        $data = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:customers,id',
            'mode' => 'required|in:local_only,total'
        ]);

        $ids = $data['ids'];
        $mode = $data['mode'];

        $deletedCount = 0;
        $failedCount = 0;

        foreach ($ids as $id) {
            $customer = Customer::find($id);
            if (!$customer) {
                continue;
            }

            try {
                if ($mode === 'total' && $customer->router) {
                    try {
                        // Connect to Mikrotik
                        $connector = \App\Services\Router\RouterService::getConnector($customer->router);
                        
                        // Delete PPP Secret
                        $connector->deleteSecret($customer->username);
                        
                        // Also kick active connection if connected
                        $connector->kickActiveConnection($customer->username);
                    } catch (\Exception $me) {
                        \Illuminate\Support\Facades\Log::warning("Gagal menghapus secret di Mikrotik saat bulk delete customer ID {$id}: " . $me->getMessage());
                    }
                }

                // Delete linked User account
                if ($customer->user) {
                    $customer->user->delete();
                }

                // Delete Customer
                $customer->delete();
                $deletedCount++;
            } catch (\Exception $e) {
                $failedCount++;
                \Illuminate\Support\Facades\Log::error("Gagal menghapus customer ID {$id} saat bulk delete: " . $e->getMessage());
            }
        }

        if ($failedCount > 0) {
            return redirect()->back()->with('success', "Berhasil menghapus {$deletedCount} pelanggan. Gagal menghapus {$failedCount} pelanggan.");
        }

        return redirect()->back()->with('success', "Berhasil menghapus secara masal {$deletedCount} pelanggan.");
    }

    /**
     * Create or update an Internet Package.
     */
    public function savePackage(Request $request)
    {
        $data = $request->validate([
            'id' => 'nullable|integer',
            'name' => 'required|string|max:100',
            'price' => 'required|numeric|min:0',
            'bandwidth_limit' => 'required|string',
            'mikrotik_profile' => 'required|string',
            'type' => 'nullable|in:pppoe,hotspot',
            'validity' => 'nullable|string|max:50',
            'local_address' => 'nullable|string|max:50',
            'remote_address' => 'nullable|string|max:50',
            'dns_server' => 'nullable|string|max:100',
            'parent_queue' => 'nullable|string|max:100',
            'queue_type_rx' => 'nullable|string|max:100',
            'queue_type_tx' => 'nullable|string|max:100',
            'description' => 'nullable|string',
        ]);

        $id = $data['id'] ?? null;
        unset($data['id']);

        Package::updateOrCreate(['id' => $id], $data);

        return redirect()->back()->with('success', 'Paket internet berhasil disimpan.');
    }

    /**
     * Delete an Internet Package.
     */
    public function deletePackage(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:packages,id'
        ]);

        $package = Package::findOrFail($request->input('id'));
        
        if ($package->customers()->exists()) {
            return redirect()->back()->with('error', 'Gagal menghapus paket karena masih digunakan oleh pelanggan.');
        }

        $package->delete();

        return redirect()->back()->with('success', 'Paket internet berhasil dihapus.');
    }

    /**
     * Accept manual cash payment for an invoice.
     */
    public function payInvoiceManual(Request $request)
    {
        $request->validate([
            'invoice_id' => 'required|exists:invoices,id'
        ]);

        $invoice = Invoice::findOrFail($request->input('invoice_id'));

        $success = BillingService::processPaidInvoice(
            $invoice,
            'manual',
            'ADMIN-CASH-' . time(),
            $invoice->total_amount,
            0,
            ['payment_method' => 'Cash / Tunai']
        );

        if ($success) {
            return redirect()->back()->with('success', 'Tagihan berhasil dibayar secara manual.');
        }

        return redirect()->back()->with('error', 'Gagal memproses pembayaran manual.');
    }

    /**
     * Manually trigger monthly invoice generation.
     */
    public function generateInvoices(Request $request)
    {
        try {
            $count = BillingService::generateInvoices();
            return redirect()->back()->with('success', "Sukses menghasilkan {$count} invoice tagihan baru.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', "Gagal menghasilkan tagihan: " . $e->getMessage());
        }
    }

    /**
     * Test connection to a router.
     */
    public function testConnection(Request $request)
    {
        $request->validate([
            'router_id' => 'required|exists:routers,id'
        ]);

        try {
            $router = Router::findOrFail($request->input('router_id'));
            
            // This instantiates, decrypts password, and attempts to connect
            \App\Services\Router\RouterService::getConnector($router);

            return response()->json([
                'success' => true,
                'message' => "Koneksi sukses! Berhasil terhubung ke router: {$router->name} ({$router->host})"
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => "Koneksi gagal: " . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Sync router clients (PPP Secrets) to local database.
     */
    public function syncRouter(Request $request)
    {
        $request->validate([
            'router_id' => 'required|exists:routers,id'
        ]);

        try {
            $router = Router::findOrFail($request->input('router_id'));
            
            // Connect to router
            $connector = \App\Services\Router\RouterService::getConnector($router);
            
            // Fetch all secrets
            $secrets = $connector->getSecrets();

            // Fetch all profiles from Mikrotik to import profile details
            $profiles = [];
            try {
                $profiles = $connector->getProfiles();
            } catch (\Exception $e) {}

            $profileMap = [];
            foreach ($profiles as $prof) {
                $name = $prof['name'] ?? null;
                if ($name) {
                    $profileMap[$name] = [
                        'local_address' => $prof['local-address'] ?? $prof['local_address'] ?? null,
                        'remote_address' => $prof['remote-address'] ?? $prof['remote_address'] ?? null,
                        'dns_server' => $prof['dns-server'] ?? $prof['dns_server'] ?? $prof['dns-servers'] ?? $prof['dns_servers'] ?? null,
                        'parent_queue' => $prof['parent-queue'] ?? $prof['parent_queue'] ?? null,
                        'queue_type_rx' => $prof['rx-queue-type'] ?? $prof['rx_queue_type'] ?? $prof['queue-type'] ?? $prof['queue_type'] ?? null,
                        'queue_type_tx' => $prof['tx-queue-type'] ?? $prof['tx_queue_type'] ?? $prof['queue-type'] ?? $prof['queue_type'] ?? null,
                    ];
                }
            }
            
            $importedCustomersCount = 0;
            $updatedCustomersCount = 0;
            $importedPackagesCount = 0;

            foreach ($secrets as $secret) {
                // Ensure name/username exists
                $username = $secret['name'] ?? null;
                if (!$username) {
                    continue;
                }

                // Check profile / package mapping
                $profileName = $secret['profile'] ?? 'default';
                
                // Find package or create it dynamically
                $package = Package::where('mikrotik_profile', $profileName)->first();
                $profData = $profileMap[$profileName] ?? [];
                
                if (!$package && $profileName !== 'default') {
                    // Try to guess price from profile name (e.g. "25 Mbps - 150K" -> 150000, "100k" -> 100000)
                    $price = 150000; // default
                    if (preg_match('/(\d+)\s*[kK]/', $profileName, $matches)) {
                        $price = intval($matches[1]) * 1000;
                    } elseif (preg_match('/(\d+)\.(\d+)\s*[kK]/', $profileName, $matches)) {
                        $price = floatval($matches[1] . '.' . $matches[2]) * 1000;
                    }

                    // Try to guess bandwidth limit (e.g. "25 Mbps" -> "25M", "5M" -> "5M")
                    $bandwidth = '10M'; // default
                    if (preg_match('/(\d+)\s*(Mbps|M|mbps|m)/i', $profileName, $matches)) {
                        $bandwidth = $matches[1] . 'M';
                    }

                    $package = Package::create(array_merge([
                        'name' => $profileName,
                        'price' => $price,
                        'bandwidth_limit' => $bandwidth,
                        'mikrotik_profile' => $profileName,
                        'description' => "Paket otomatis diimport dari profil Mikrotik: {$profileName}",
                    ], $profData));
                    $importedPackagesCount++;
                } elseif ($package) {
                    // Sync latest profile settings from Mikrotik to local package
                    $package->update($profData);
                }

                $packageId = $package ? $package->id : null;
                $password = $secret['password'] ?? 'gantengmax';
                $serviceType = (isset($secret['service']) && $secret['service'] === 'hotspot') ? 'hotspot' : 'pppoe';
                $disabled = isset($secret['disabled']) && ($secret['disabled'] === 'true' || $secret['disabled'] === true);
                $status = $disabled ? 'isolated' : 'active';

                // Look for existing customer
                $customer = Customer::where('username', $username)->first();

                if ($customer) {
                    // Update existing
                    $customer->update([
                        'router_id' => $router->id,
                        'package_id' => $packageId ?: $customer->package_id,
                        'service_type' => $serviceType,
                        'password' => $password,
                        'status' => $status,
                    ]);

                    // Also update linked user password/name if exists
                    if ($customer->user) {
                        $customer->user->update([
                            'password' => Hash::make($password),
                        ]);
                    }
                    $updatedCustomersCount++;
                } else {
                    // Create linked user first
                    $email = $username . '@mwifi.test';
                    
                    // Check if User already exists with this email
                    $user = User::where('email', $email)->first();
                    if (!$user) {
                        $user = User::create([
                            'name' => $username,
                            'email' => $email,
                            'password' => Hash::make($password),
                        ]);
                    }

                    // Create new customer
                    Customer::create([
                        'user_id' => $user->id,
                        'router_id' => $router->id,
                        'package_id' => $packageId,
                        'service_type' => $serviceType,
                        'username' => $username,
                        'password' => $password,
                        'name' => $username,
                        'phone_number' => '081234567890', // Default placeholder
                        'address' => 'Imported from Mikrotik', // Default placeholder
                        'status' => $status,
                        'billing_date' => 20, // default billing date
                    ]);
                    $importedCustomersCount++;
                }
            }

            return response()->json([
                'success' => true,
                'message' => "Sinkronisasi selesai! Berhasil menambahkan {$importedCustomersCount} pelanggan baru, memperbarui {$updatedCustomersCount} pelanggan, dan mengimpor {$importedPackagesCount} paket baru."
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => "Sinkronisasi gagal: " . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Save dynamic settings (System, Payment gateway keys, WhatsApp Gateway, GenieACS).
     */
    public function saveSettings(Request $request)
    {
        $settings = $request->all();

        // List of keys to encrypt
        $encryptedKeys = [
            'payment.tripay.api_key',
            'payment.tripay.private_key',
            'payment.midtrans.server_key',
            'whatsapp.api_key'
        ];

        foreach ($settings as $key => $value) {
            if ($value === null) continue;

            $isEncrypted = in_array($key, $encryptedKeys);
            SettingService::set($key, $value, null, $isEncrypted);
        }

        return redirect()->back()->with('success', 'Pengaturan berhasil diperbarui.');
    }

    /**
     * Get real-time system resource metrics of the server (VPS).
     */
    public function getServerResources()
    {
        // 1. Disk Space
        $diskTotal = disk_total_space('/') ?: 1;
        $diskFree = disk_free_space('/') ?: 0;
        $diskUsed = $diskTotal - $diskFree;
        $diskUsage = round(($diskUsed / $diskTotal) * 100);

        // 2. CPU Usage
        $cpuUsage = 15; // default fallback
        if (stristr(PHP_OS, 'win')) {
            try {
                $output = @shell_exec('wmic cpu get LoadPercentage /Value 2>nul');
                if ($output && preg_match("/LoadPercentage=(\d+)/i", $output, $matches)) {
                    $cpuUsage = (int)$matches[1];
                } else {
                    $psOutput = @shell_exec('powershell -NoProfile -Command "Get-CimInstance Win32_Processor | Select-Object -ExpandProperty LoadPercentage" 2>nul');
                    if ($psOutput && preg_match("/(\d+)/", $psOutput, $matches)) {
                        $cpuUsage = (int)$matches[1];
                    }
                }
            } catch (\Exception $e) {}
        } else {
            try {
                if (function_exists('sys_getloadavg')) {
                    $loads = sys_getloadavg();
                    $coreCount = 1;
                    if (is_file('/proc/cpuinfo')) {
                        $cpuinfo = file_get_contents('/proc/cpuinfo');
                        preg_match_all('/^processor/m', $cpuinfo, $matches);
                        $coreCount = count($matches[0]) ?: 1;
                    }
                    $cpuUsage = round(($loads[0] / $coreCount) * 100);
                    if ($cpuUsage > 100) $cpuUsage = 100;
                }
            } catch (\Exception $e) {}
        }

        // 3. RAM Usage
        $ramUsage = 35; // default fallback
        if (stristr(PHP_OS, 'win')) {
            try {
                $output = @shell_exec('wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /Value 2>nul');
                if ($output && preg_match("/FreePhysicalMemory=(\d+)/i", $output, $freeMatches) && 
                    preg_match("/TotalVisibleMemorySize=(\d+)/i", $output, $totalMatches)) {
                    $freeMem = (int)$freeMatches[1];
                    $totalMem = (int)$totalMatches[1];
                    if ($totalMem > 0) {
                        $ramUsage = round((($totalMem - $freeMem) / $totalMem) * 100);
                    }
                } else {
                    $psOutput = @shell_exec('powershell -NoProfile -Command "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory; (Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize" 2>nul');
                    if ($psOutput) {
                        $lines = array_filter(array_map('trim', explode("\n", trim($psOutput))));
                        if (count($lines) >= 2) {
                            $freeMem = (int)$lines[0];
                            $totalMem = (int)$lines[1];
                            if ($totalMem > 0) {
                                $ramUsage = round((($totalMem - $freeMem) / $totalMem) * 100);
                            }
                        }
                    }
                }
            } catch (\Exception $e) {}
        } else {
            try {
                $free = shell_exec('free');
                $free = trim($free);
                $free_arr = explode("\n", $free);
                if (isset($free_arr[1])) {
                    $mem = preg_split("/\s+/", $free_arr[1]);
                    $totalMem = $mem[1] ?? 1;
                    $usedMem = $mem[2] ?? 0;
                    $ramUsage = round(($usedMem / $totalMem) * 100);
                }
            } catch (\Exception $e) {}
        }

        $osName = PHP_OS_FAMILY;
        if (PHP_OS_FAMILY === 'Linux') {
            try {
                if (is_file('/etc/os-release')) {
                    $release = file_get_contents('/etc/os-release');
                    if (preg_match('/PRETTY_NAME="([^"]+)"/', $release, $matches)) {
                        $osName = $matches[1];
                    }
                }
            } catch (\Exception $e) {}
        }

        return response()->json([
            'cpu' => $cpuUsage,
            'ram' => $ramUsage,
            'disk' => $diskUsage,
            'os' => $osName,
            'hostname' => gethostname() ?: 'vps-server'
        ]);
    }

    /**
     * Synchronize Hotspot Profiles from MikroTik.
     */
    public function syncHotspotProfiles(Request $request)
    {
        $request->validate([
            'router_id' => 'required|exists:routers,id',
        ]);

        $router = Router::findOrFail($request->input('router_id'));

        try {
            $connector = \App\Services\Router\RouterService::getConnector($router);
            $profiles = $connector->getHotspotProfiles();

            $importedCount = 0;
            foreach ($profiles as $prof) {
                $profileName = $prof['name'] ?? null;
                if (!$profileName || $profileName === 'default') {
                    continue;
                }

                // Guess price from profile name
                $price = 5000; // default hotspot price
                if (preg_match('/(\d+)\s*[kK]/', $profileName, $matches)) {
                    $price = intval($matches[1]) * 1000;
                }

                // Guess speed limit
                $bandwidth = $prof['rate-limit'] ?? $prof['rate_limit'] ?? '5M/5M';

                Package::updateOrCreate(
                    [
                        'mikrotik_profile' => $profileName,
                        'type' => 'hotspot'
                    ],
                    [
                        'name' => "Hotspot - " . $profileName,
                        'price' => $price,
                        'bandwidth_limit' => $bandwidth,
                        'validity' => '1d', // default validity 1 day
                        'description' => "Profil hotspot diimpor otomatis dari Mikrotik: {$profileName}",
                    ]
                );
                $importedCount++;
            }

            return redirect()->back()->with('success', "Berhasil mensinkronisasi {$importedCount} profil hotspot dari Mikrotik.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', "Gagal singkronisasi hotspot: " . $e->getMessage());
        }
    }

    /**
     * Generate Hotspot Vouchers in bulk.
     */
    public function generateHotspotVouchers(Request $request)
    {
        $data = $request->validate([
            'router_id' => 'required|exists:routers,id',
            'package_id' => 'required|exists:packages,id',
            'qty' => 'required|integer|min:1|max:500',
            'code_length' => 'required|integer|min:4|max:12',
            'prefix' => 'nullable|string|max:10',
        ]);

        $router = Router::findOrFail($data['router_id']);
        $package = Package::findOrFail($data['package_id']);

        try {
            $connector = \App\Services\Router\RouterService::getConnector($router);

            $successCount = 0;
            for ($i = 0; $i < $data['qty']; $i++) {
                // Generate a random legibe code
                $chars = 'abcdefghkmnpqrstuvwxyz23456789';
                $code = $data['prefix'] ?? '';
                for ($j = 0; $j < $data['code_length']; $j++) {
                    $code .= $chars[rand(0, strlen($chars) - 1)];
                }

                // Add to MikroTik
                $mkData = [
                    'name' => $code,
                    'password' => $code,
                    'profile' => $package->mikrotik_profile,
                    'comment' => 'mWiFi Generated',
                ];

                if (!empty($package->validity)) {
                    $mkData['limit-uptime'] = $package->validity;
                }

                $added = $connector->addHotspotUser($mkData);

                if ($added) {
                    HotspotVoucher::create([
                        'router_id' => $router->id,
                        'username' => $code,
                        'password' => $code,
                        'mikrotik_profile' => $package->mikrotik_profile,
                        'price' => $package->price,
                        'validity' => $package->validity,
                        'status' => 'unused',
                    ]);
                    $successCount++;
                }
            }

            return redirect()->back()->with('success', "Berhasil men-generate {$successCount} voucher hotspot baru.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', "Gagal men-generate voucher: " . $e->getMessage());
        }
    }

    /**
     * Sell a Hotspot Voucher.
     */
    public function sellHotspotVoucher(Request $request)
    {
        $data = $request->validate([
            'voucher_id' => 'required|exists:hotspot_vouchers,id',
            'payment_method' => 'required|string|max:50',
        ]);

        $voucher = HotspotVoucher::findOrFail($data['voucher_id']);
        if ($voucher->status !== 'unused') {
            return redirect()->back()->with('error', "Voucher ini sudah terjual atau kedaluwarsa.");
        }

        // Update voucher
        $voucher->update([
            'status' => 'sold',
            'sold_at' => Carbon::now(),
        ]);

        // Log sale
        HotspotSale::create([
            'router_id' => $voucher->router_id,
            'username' => $voucher->username,
            'package_name' => "Hotspot Profile: " . $voucher->mikrotik_profile,
            'price' => $voucher->price,
            'payment_method' => $data['payment_method'],
        ]);

        return redirect()->back()->with('success', "Voucher {$voucher->username} berhasil dicatat sebagai TERJUAL.");
    }

    /**
     * Delete a Hotspot Voucher.
     */
    public function deleteHotspotVoucher(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:hotspot_vouchers,id',
        ]);

        $voucher = HotspotVoucher::findOrFail($request->input('id'));

        try {
            if ($voucher->router) {
                try {
                    $connector = \App\Services\Router\RouterService::getConnector($voucher->router);
                    $connector->deleteHotspotUser($voucher->username);
                    $connector->kickHotspotActive($voucher->username);
                } catch (\Exception $me) {
                    \Illuminate\Support\Facades\Log::warning("Gagal menghapus user hotspot di Mikrotik: " . $me->getMessage());
                }
            }

            $voucher->delete();

            return redirect()->back()->with('success', "Voucher hotspot berhasil dihapus.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', "Gagal menghapus voucher: " . $e->getMessage());
        }
    }
}
