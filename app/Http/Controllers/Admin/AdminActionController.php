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
            'description' => 'nullable|string',
        ]);

        $id = $data['id'] ?? null;
        unset($data['id']);

        Package::updateOrCreate(['id' => $id], $data);

        return redirect()->back()->with('success', 'Paket internet berhasil disimpan.');
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

                    $package = Package::create([
                        'name' => $profileName,
                        'price' => $price,
                        'bandwidth_limit' => $bandwidth,
                        'mikrotik_profile' => $profileName,
                        'description' => "Paket otomatis diimport dari profil Mikrotik: {$profileName}",
                    ]);
                    $importedPackagesCount++;
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
}
