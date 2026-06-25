<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Router;
use App\Models\Customer;
use App\Models\Package;
use App\Models\Invoice;
use App\Models\User;
use App\Services\BillingService;
use App\Services\BrandingService;
use App\Services\CustomerNotificationService;
use App\Services\Customer\LegacyCsvImportService;
use App\Services\HotspotVoucherService;
use App\Services\StaffRouterScope;
use App\Services\InventoryService;
use App\Services\MessageTemplateService;
use App\Services\SettingService;
use App\Services\StaffAdvanceNotificationService;
use App\Services\VpsCatalogService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Carbon\Carbon;
use App\Models\FinancialExpense;
use App\Models\StaffAdvanceLedger;
use App\Models\HotspotVoucher;
use App\Models\HotspotSale;
use App\Models\InventoryItem;

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

    public function deleteRouter(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:routers,id',
        ]);

        $router = Router::findOrFail($request->input('id'));
        $customerCount = Customer::where('router_id', $router->id)->count();

        if ($customerCount > 0) {
            return redirect()->back()->with(
                'error',
                "Gagal menghapus router \"{$router->name}\". Masih ada {$customerCount} pelanggan terdaftar di router ini. Pindahkan atau hapus pelanggan terlebih dahulu."
            );
        }

        $name = $router->name;
        $router->delete();

        return redirect()->back()->with('success', "Router \"{$name}\" berhasil dihapus.");
    }

    public function saveInventoryItem(Request $request)
    {
        $id = $request->input('id');

        $data = $request->validate([
            'id' => 'nullable|exists:inventory_items,id',
            'name' => 'required|string|max:150',
            'sku' => 'nullable|string|max:100',
            'category' => 'required|in:' . implode(',', array_keys(InventoryItem::CATEGORIES)),
            'quantity' => 'required|integer|min:0',
            'unit' => 'required|in:' . implode(',', array_keys(InventoryItem::UNITS)),
            'min_stock' => 'required|integer|min:0',
            'location' => 'nullable|string|max:150',
            'condition' => 'required|in:' . implode(',', array_keys(InventoryItem::CONDITIONS)),
            'notes' => 'nullable|string|max:2000',
        ]);

        unset($data['id']);

        if ($id) {
            $item = InventoryItem::findOrFail($id);
            $previousQuantity = (int) $item->quantity;
            $item->update($data);
            InventoryService::recordEditAdjustment($item, $previousQuantity, (int) $item->quantity);
            InventoryService::notifyLowStockIfNeeded($item->fresh(), $previousQuantity);
            $message = 'Item inventaris berhasil diperbarui.';
        } else {
            $item = InventoryItem::create($data);
            InventoryService::notifyLowStockIfNeeded($item, 0);
            $message = 'Item inventaris berhasil ditambahkan.';
        }

        return redirect()->back()->with('success', $message);
    }

    public function deleteInventoryItem(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:inventory_items,id',
        ]);

        $item = InventoryItem::findOrFail($request->input('id'));
        $name = $item->name;
        $item->delete();

        return redirect()->back()->with('success', "Item inventaris \"{$name}\" berhasil dihapus.");
    }

    public function adjustInventoryStock(Request $request)
    {
        $data = $request->validate([
            'inventory_item_id' => 'required|exists:inventory_items,id',
            'type' => 'required|in:in,out',
            'quantity' => 'required|integer|min:1',
            'customer_id' => 'nullable|exists:customers,id',
            'notes' => 'nullable|string|max:2000',
        ]);

        $item = InventoryItem::findOrFail($data['inventory_item_id']);

        try {
            InventoryService::adjustStock(
                $item,
                $data['type'],
                (int) $data['quantity'],
                $data['notes'] ?? null,
                filled($data['customer_id'] ?? null) ? (int) $data['customer_id'] : null,
            );
        } catch (\RuntimeException $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }

        $actionLabel = $data['type'] === 'in' ? 'masuk' : 'keluar';

        return redirect()->back()->with('success', "Stok {$actionLabel} untuk \"{$item->name}\" berhasil dicatat.");
    }

    public function saveStaffUser(Request $request)
    {
        $actor = $request->user();
        abort_unless($actor?->canManageUsers(), 403);

        $id = $request->input('id');
        $assignableRoleKeys = array_keys(User::assignableRoles($actor));

        $rules = [
            'id' => 'nullable|exists:users,id',
            'name' => 'required|string|max:150',
            'email' => 'required|email|max:150|unique:users,email' . ($id ? ",{$id}" : ''),
            'phone_number' => 'nullable|string|max:20',
            'role' => 'required|in:' . implode(',', $assignableRoleKeys),
            'profile_title' => 'nullable|string|max:100',
            'is_active' => 'nullable|boolean',
            'assigned_router_id' => [
                Rule::requiredIf(fn () => $request->input('role') === User::ROLE_TECHNICIAN),
                'nullable',
                'integer',
                'exists:routers,id',
            ],
            'can_manual_payment' => 'nullable|boolean',
        ];

        if ($id) {
            $rules['password'] = 'nullable|string|min:6|max:100';
        } else {
            $rules['password'] = 'required|string|min:6|max:100';
        }

        $data = $request->validate($rules);
        unset($data['id']);

        $payload = [
            'name' => $data['name'],
            'email' => $data['email'],
            'phone_number' => $data['role'] === User::ROLE_TECHNICIAN
                ? ($data['phone_number'] ?? null)
                : null,
            'role' => $data['role'],
            'profile_title' => $data['profile_title'] ?? null,
            'is_active' => $request->boolean('is_active', true),
            'assigned_router_id' => $data['role'] === User::ROLE_TECHNICIAN
                ? ($data['assigned_router_id'] ?? null)
                : null,
            'can_manual_payment' => $data['role'] === User::ROLE_TECHNICIAN
                ? $request->boolean('can_manual_payment')
                : false,
        ];

        if (!empty($data['password'])) {
            $payload['password'] = $data['password'];
        }

        if ($id) {
            $user = User::query()
                ->whereNotNull('role')
                ->whereDoesntHave('customer')
                ->findOrFail($id);

            if ($user->id === $actor->id && !$payload['is_active']) {
                return redirect()->back()->with('error', 'Anda tidak dapat menonaktifkan akun sendiri.');
            }

            if ($user->isSuperAdmin() && $payload['role'] !== User::ROLE_SUPER_ADMIN) {
                $otherSuperAdmins = User::query()
                    ->where('role', User::ROLE_SUPER_ADMIN)
                    ->where('id', '!=', $user->id)
                    ->where('is_active', true)
                    ->count();

                if ($otherSuperAdmins === 0) {
                    return redirect()->back()->with('error', 'Harus ada minimal satu Super Admin aktif.');
                }
            }

            $user->update($payload);
            $message = 'User staff berhasil diperbarui.';
        } else {
            User::create($payload);
            $message = 'User staff berhasil ditambahkan.';
        }

        return redirect()->back()->with('success', $message);
    }

    public function deleteStaffUser(Request $request)
    {
        $actor = $request->user();
        abort_unless($actor?->canManageUsers(), 403);

        $request->validate([
            'id' => 'required|exists:users,id',
        ]);

        $user = User::query()
            ->whereNotNull('role')
            ->whereDoesntHave('customer')
            ->findOrFail($request->input('id'));

        if ($user->id === $actor->id) {
            return redirect()->back()->with('error', 'Anda tidak dapat menghapus akun sendiri.');
        }

        if ($user->isSuperAdmin()) {
            $activeSuperAdmins = User::query()
                ->where('role', User::ROLE_SUPER_ADMIN)
                ->where('is_active', true)
                ->count();

            if ($activeSuperAdmins <= 1) {
                return redirect()->back()->with('error', 'Tidak dapat menghapus Super Admin terakhir yang aktif.');
            }
        }

        $name = $user->name;
        $user->delete();

        return redirect()->back()->with('success', "User \"{$name}\" berhasil dihapus.");
    }

    public function toggleStaffUserActive(Request $request)
    {
        $actor = $request->user();
        abort_unless($actor?->canManageUsers(), 403);

        $request->validate([
            'id' => 'required|exists:users,id',
        ]);

        $user = User::query()
            ->whereNotNull('role')
            ->whereDoesntHave('customer')
            ->findOrFail($request->input('id'));

        if ($user->id === $actor->id) {
            return redirect()->back()->with('error', 'Anda tidak dapat menonaktifkan akun sendiri.');
        }

        if ($user->is_active && $user->isSuperAdmin()) {
            $activeSuperAdmins = User::query()
                ->where('role', User::ROLE_SUPER_ADMIN)
                ->where('is_active', true)
                ->count();

            if ($activeSuperAdmins <= 1) {
                return redirect()->back()->with('error', 'Tidak dapat menonaktifkan Super Admin terakhir yang aktif.');
            }
        }

        $user->update(['is_active' => !$user->is_active]);
        $statusLabel = $user->is_active ? 'diaktifkan' : 'dinonaktifkan';

        return redirect()->back()->with('success', "User \"{$user->name}\" berhasil {$statusLabel}.");
    }

    /**
     * Create or update a Customer profile, linking their User account.
     */
    public function saveCustomer(Request $request)
    {
        $existingCustomer = $request->input('id')
            ? Customer::find($request->input('id'))
            : null;
        $existingUserId = $existingCustomer?->user_id;

        $data = $request->validate([
            'id' => 'nullable|integer',
            'router_id' => 'required|exists:routers,id',
            'package_id' => 'nullable|exists:packages,id',
            'odp_id' => 'nullable|exists:odps,id',
            'service_type' => 'required|in:pppoe,hotspot',
            'username' => 'required|string|max:100',
            'password' => 'required|string|max:100',
            'name' => 'required|string|max:150',
            'email' => ['nullable', 'email', 'max:150', Rule::unique('users', 'email')->ignore($existingUserId)],
            'phone_number' => 'required|string|max:20',
            'address' => 'required|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'status' => 'required|in:active,isolated,inactive,suspended',
            'billing_date' => 'required|integer|min:1|max:31',
            'service_start_date' => 'nullable|date',
        ]);

        $id = $data['id'] ?? null;
        $requestedEmail = $data['email'] ?? null;
        unset($data['id'], $data['email']);
        $isNewCustomer = $id === null;

        $actor = $request->user();
        if (!$actor->canWriteData()) {
            if (!$actor->canCreateCustomers() || !$isNewCustomer) {
                abort(403, 'Anda tidak memiliki izin untuk mengubah data pelanggan.');
            }
        }

        StaffRouterScope::for($actor)->ensureCanAccessRouter((int) $data['router_id']);

        $customer = $existingCustomer;
        $userId = $customer?->user_id;
        $oldUsername = $customer?->username;
        $oldServiceType = $customer?->service_type;
        $oldRouterId = $customer?->router_id;

        if ($id && ! $customer) {
            $customer = Customer::findOrFail($id);
            $userId = $customer->user_id;
            $oldUsername = $customer->username;
            $oldServiceType = $customer->service_type;
            $oldRouterId = $customer->router_id;
        }

        $email = $customer
            ? $customer->resolveUserEmail($data['username'], $requestedEmail)
            : (is_string($requestedEmail) && filter_var(trim($requestedEmail), FILTER_VALIDATE_EMAIL)
                ? strtolower(trim($requestedEmail))
                : strtolower($data['username']) . '@mwifi.test');

        $user = User::updateOrCreate(
            ['id' => $userId],
            [
                'name' => $data['name'],
                'email' => $email,
                'password' => Hash::make($data['password']),
            ]
        );

        $data['user_id'] = $user->id;

        if (! empty($data['phone_number'])) {
            $data['phone_number'] = \App\Support\PhoneNumber::normalize((string) $data['phone_number']);
        }

        if (!$id && empty($data['service_start_date'])) {
            $data['service_start_date'] = now()->toDateString();
        } elseif (!empty($data['service_start_date'])) {
            $data['service_start_date'] = Carbon::parse($data['service_start_date'], config('app.timezone'))->toDateString();
        }

        $oldOdpId = $customer?->odp_id;

        $savedCustomer = Customer::updateOrCreate(['id' => $id], $data);

        $newOdpId = $data['odp_id'] ?? null;
        if ($oldOdpId != $newOdpId) {
            \App\Models\Odp::syncUsedPortsForIds([$oldOdpId, $newOdpId]);
        }

        $mikrotikSyncWarning = null;
        $whatsAppWarning = null;

        // Sync to Mikrotik for PPPoE secrets (after local save so data is not lost on timeout)
        if ($data['service_type'] === 'pppoe') {
            $router = Router::findOrFail($data['router_id']);
            $package = Package::findOrFail($data['package_id']);

            if ($data['status'] === 'isolated') {
                $profile = SettingService::get('mikrotik.isolir_profile', 'ISOLIR');
                $disabled = 'no';
            } else {
                $profile = $package->mikrotik_profile;
                $disabled = ($data['status'] === 'active') ? 'no' : 'yes';
            }

            $mkData = [
                'name' => $data['username'],
                'password' => $data['password'],
                'profile' => $profile,
                'service' => 'pppoe',
                'comment' => $data['name'],
                'disabled' => $disabled,
            ];

            try {
                $connector = \App\Services\Router\RouterService::getConnector($router);

                // If router changed, delete from old router first
                if ($oldRouterId && $oldRouterId != $data['router_id']) {
                    try {
                        $oldRouter = Router::find($oldRouterId);
                        if ($oldRouter) {
                            $oldConnector = \App\Services\Router\RouterService::getConnector($oldRouter);
                            $oldConnector->deleteSecret($oldUsername ?: $data['username']);
                        }
                    } catch (\Exception $e) {
                        // ignore and log
                    }
                }

                // If username changed, delete old secret
                if ($oldUsername && $oldUsername !== $data['username']) {
                    try {
                        $connector->deleteSecret($oldUsername);
                    } catch (\Exception $e) {
                        // ignore
                    }
                }

                // Try to update secret, if not found then add
                $updated = $connector->updateSecret($data['username'], $mkData);
                if (!$updated) {
                    $added = $connector->addSecret($mkData);
                    if (!$added) {
                        throw new \Exception("Gagal menambahkan secret PPP baru di Mikrotik.");
                    }
                }

                if ($data['status'] === 'isolated') {
                    $connector->kickActiveConnection($data['username']);
                }
            } catch (\Exception $e) {
                $mikrotikSyncWarning = $e->getMessage();
                \Illuminate\Support\Facades\Log::warning('MikroTik PPP sync failed after customer save', [
                    'customer_username' => $data['username'],
                    'router_id' => $data['router_id'],
                    'error' => $mikrotikSyncWarning,
                ]);
            }
        } else {
            // If service type changed from pppoe to hotspot, remove old pppoe secret
            if ($oldServiceType === 'pppoe') {
                try {
                    $router = Router::find($oldRouterId ?: $data['router_id']);
                    if ($router) {
                        $connector = \App\Services\Router\RouterService::getConnector($router);
                        $connector->deleteSecret($oldUsername ?: $data['username']);
                    }
                } catch (\Exception $e) {
                    // ignore
                }
            }
        }

        if ($isNewCustomer) {
            try {
                $package = !empty($data['package_id']) ? Package::find($data['package_id']) : null;
                $sent = CustomerNotificationService::sendRegistrationWhatsApp($savedCustomer, $package);
                if (!$sent) {
                    $whatsAppWarning = 'Notifikasi WhatsApp pendaftaran tidak terkirim. Pastikan gateway WA aktif, sesi terhubung, dan nomor telepon pelanggan benar.';
                }
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::warning('Registration WhatsApp failed after customer save', [
                    'customer_id' => $savedCustomer->id,
                    'username' => $savedCustomer->username,
                    'error' => $e->getMessage(),
                ]);
                $whatsAppWarning = 'Notifikasi WhatsApp pendaftaran gagal: ' . $e->getMessage();
            }
        }

        $warnings = array_values(array_filter([$mikrotikSyncWarning, $whatsAppWarning]));

        if ($warnings !== []) {
            return redirect()->back()
                ->with('success', 'Data pelanggan berhasil disimpan.')
                ->with('warning', implode(' ', $warnings));
        }

        return redirect()->back()->with('success', 'Data pelanggan berhasil disimpan.');
    }

    /**
     * Import customers from legacy billing CSV export.
     */
    public function importCustomersCsv(Request $request, LegacyCsvImportService $importService)
    {
        set_time_limit(300);

        $data = $request->validate([
            'csv_file' => 'required|file|max:10240',
            'router_id' => 'required|exists:routers,id',
        ]);

        /** @var UploadedFile $uploadedFile */
        $uploadedFile = $data['csv_file'];
        $extension = strtolower($uploadedFile->getClientOriginalExtension());
        if (!in_array($extension, ['csv', 'txt'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'File harus berformat .csv',
            ], 422);
        }

        $path = $uploadedFile->getRealPath();
        if ($path === false) {
            return response()->json([
                'success' => false,
                'message' => 'File CSV tidak dapat dibaca.',
            ], 422);
        }

        $dryRun = $request->boolean('dry_run');
        $skipExisting = $request->boolean('skip_existing');
        $emailOnly = $request->boolean('email_only');

        try {
            $result = $importService->import(
                $path,
                (int) $data['router_id'],
                $dryRun,
                $skipExisting,
                $emailOnly,
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Impor gagal: ' . $e->getMessage(),
            ], 500);
        }

        $prefix = $dryRun ? 'Simulasi impor' : 'Impor selesai';
        $message = $emailOnly
            ? sprintf(
                '%s (email saja): %d baris, %d email diperbarui, %d dilewati.',
                $prefix,
                $result['total'],
                $result['updated'],
                $result['skipped'],
            )
            : sprintf(
                '%s: %d baris, %d baru, %d diperbarui, %d dilewati, %d paket baru.',
                $prefix,
                $result['total'],
                $result['created'],
                $result['updated'],
                $result['skipped'],
                $result['packages_created'],
            );

        if ($result['errors'] !== []) {
            return response()->json([
                'success' => false,
                'message' => $message . ' Beberapa baris gagal.',
                'result' => $result,
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'result' => $result,
            'dry_run' => $dryRun,
        ]);
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
        $odpId = $customer->odp_id;

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

            \App\Models\Odp::syncUsedPortsForIds([$odpId]);

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
        $affectedOdpIds = [];

        foreach ($ids as $id) {
            $customer = Customer::find($id);
            if (!$customer) {
                continue;
            }

            if ($customer->odp_id) {
                $affectedOdpIds[] = $customer->odp_id;
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

        \App\Models\Odp::syncUsedPortsForIds($affectedOdpIds);

        if ($failedCount > 0) {
            return redirect()->back()->with('success', "Berhasil menghapus {$deletedCount} pelanggan. Gagal menghapus {$failedCount} pelanggan.");
        }

        return redirect()->back()->with('success', "Berhasil menghapus secara masal {$deletedCount} pelanggan.");
    }

    /**
     * Monthly accumulated upload/download quota (bytes) for one customer.
     */
    public function getCustomerBandwidthQuota(Request $request)
    {
        $data = $request->validate([
            'customer_id' => 'required|exists:customers,id',
        ]);

        $customer = Customer::with('router')->findOrFail($data['customer_id']);

        if (!$customer->router) {
            return response()->json(['error' => 'Pelanggan belum memiliki router.'], 422);
        }

        try {
            $payload = \App\Services\Router\CustomerBandwidthUsageService::getMonthlyUsage($customer, true);

            return response()->json($payload);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Gagal membaca quota bandwidth: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create or update an Internet Package.
     */
    public function savePackage(Request $request)
    {
        $request->merge([
            'mikrotik_profile' => $request->input('name')
        ]);

        $data = $request->validate([
            'id' => 'nullable|integer',
            'router_id' => 'required|exists:routers,id',
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
            'only_one' => 'nullable|boolean',
            'description' => 'nullable|string',
            'use_validation_script' => 'nullable|boolean',
            'lock_mac' => 'nullable|boolean',
        ]);

        $data['use_validation_script'] = isset($data['use_validation_script']) ? (bool)$data['use_validation_script'] : false;
        $data['lock_mac'] = isset($data['lock_mac']) ? (bool)$data['lock_mac'] : false;
        $data['only_one'] = array_key_exists('only_one', $data) ? (bool) $data['only_one'] : true;

        $id = $data['id'] ?? null;
        $routerId = (int) $data['router_id'];
        unset($data['id'], $data['router_id']);

        $duplicateProfile = Package::query()
            ->where('router_id', $routerId)
            ->whereRaw('LOWER(mikrotik_profile) = ?', [strtolower((string) $data['mikrotik_profile'])])
            ->when($id, fn ($query) => $query->where('id', '!=', $id))
            ->exists();

        if ($duplicateProfile) {
            $existing = Package::query()
                ->where('router_id', $routerId)
                ->whereRaw('LOWER(mikrotik_profile) = ?', [strtolower((string) $data['mikrotik_profile'])])
                ->when($id, fn ($query) => $query->where('id', '!=', $id))
                ->first();

            $hint = $existing
                ? ' Paket lama: "' . $existing->name . '" (ID #' . $existing->id . '). Buka halaman Paket Internet — panel biru/amber di atas tabel — lalu hapus entri tersebut.'
                : '';

            return redirect()->back()
                ->withErrors(['name' => 'Paket dengan profil MikroTik "' . $data['mikrotik_profile'] . '" sudah terdaftar di database.' . $hint])
                ->withInput();
        }

        $oldPackage = null;
        if ($id) {
            $oldPackage = Package::find($id);
        }

        $router = Router::findOrFail($routerId);
        $errors = [];

        try {
            $connector = \App\Services\Router\RouterService::getConnector($router);

            if (($data['type'] ?? 'pppoe') === 'hotspot') {
                $mkData = [
                    'name' => $data['mikrotik_profile'],
                    'rate-limit' => $data['bandwidth_limit'] ?? null,
                    'parent-queue' => $data['parent_queue'] ?? null,
                    'queue-type' => \App\Services\Router\MikrotikPackageFormOptionsService::buildRouterOsQueueType(
                        $data['queue_type_rx'] ?? null,
                        $data['queue_type_tx'] ?? null
                    ),
                    'address-pool' => $data['remote_address'] ?? null,
                ];

                if ($data['use_validation_script']) {
                    $price = isset($data['price']) ? intval($data['price']) : 0;
                    $validity = $data['validity'] ?? '1d';
                    $profileName = $data['mikrotik_profile'];
                    $lockMac = $data['lock_mac'];

                    $lockMacCode = $lockMac
                        ? '[:local mac $"mac-address"; /ip hotspot user set mac-address=$mac [find where name=$user]]'
                        : '';

                    $lockMacStatus = $lockMac ? 'Enable' : 'Disable';

                    $script = ':put (",remc,' . $price . ',' . $validity . ',' . $price . ',,' . $lockMacStatus . ',"); {:local date [ /system clock get date ];:local year [ :pick $date 0 4 ];:local month [ :pick $date 5 7 ]; :local comment [ /ip hotspot user get [/ip hotspot user find where name="$user"] comment]; :local ucode [:pic $comment 0 2]; :if ($ucode = "vc" or $ucode = "up" or $comment = "") do={ /sys sch add name="$user" disable=no start-date=$date interval="' . $validity . '"; :delay 2s; :local exp [ /sys sch get [ /sys sch find where name="$user" ] next-run]; :local getxp [len $exp]; :if ($getxp = 15) do={ :local d [:pic $exp 0 6]; :local t [:pic $exp 7 16]; :local s ("/"); :local exp ("$d$s$year $t"); /ip hotspot user set comment=$exp [find where name="$user"];}; :if ($getxp = 8) do={ /ip hotspot user set comment="$date $exp" [find where name="$user"];}; :if ($getxp > 15) do={ /ip hotspot user set comment=$exp [find where name="$user"];}; /sys sch set [find where name="$user"] interval=0s on-event="/ip hotspot user remove [find where name=\\\"$user\\\"]; /system scheduler remove [find where name=\\\"$user\\\"]"; :local mac $"mac-address"; :local time [/system clock get time ]; /system script add name="$date-|-$time-|-$user-|-' . $price . '-|-$address-|-$mac-|-' . $validity . '-|-' . $profileName . '-|-$comment" owner="$month$year" source=$date comment=mikhmon; ' . $lockMacCode . '}}';

                    $mkData['on-login'] = $script;
                } else {
                    $mkData['on-login'] = '';
                }

                // Filter out null and empty string values to prevent RouterOS REST API 400 Bad Request
                // Keep empty string '' for on-login to allow clearing it on the router.
                $mkData = array_filter($mkData, function ($val, $key) {
                    if ($key === 'on-login') {
                        return $val !== null;
                    }
                    return $val !== null && $val !== '';
                }, ARRAY_FILTER_USE_BOTH);

                $oldProfileName = $oldPackage ? $oldPackage->mikrotik_profile : $data['mikrotik_profile'];
                $updated = $connector->updateHotspotProfile($oldProfileName, $mkData);
                if (!$updated) {
                    $updatedNew = $connector->updateHotspotProfile($data['mikrotik_profile'], $mkData);
                    if (!$updatedNew) {
                        $added = $connector->addHotspotProfile($mkData);
                        if (!$added) {
                            throw new \Exception("Gagal menambahkan profil hotspot di Mikrotik.");
                        }
                    }
                }
            } else {
                $mkData = [
                    'name' => $data['mikrotik_profile'],
                    'rate-limit' => $data['bandwidth_limit'] ?? null,
                    'local-address' => $data['local_address'] ?? null,
                    'remote-address' => $data['remote_address'] ?? null,
                    'dns-server' => $data['dns_server'] ?? null,
                    'parent-queue' => $data['parent_queue'] ?? null,
                    'queue-type' => \App\Services\Router\MikrotikPackageFormOptionsService::buildRouterOsQueueType(
                        $data['queue_type_rx'] ?? null,
                        $data['queue_type_tx'] ?? null
                    ),
                    'only-one' => $data['only_one'] ? 'yes' : 'no',
                ];

                // Filter out null and empty string values to prevent RouterOS REST API 400 Bad Request
                $mkData = array_filter($mkData, function ($val) {
                    return $val !== null && $val !== '';
                });

                $oldProfileName = $oldPackage ? $oldPackage->mikrotik_profile : $data['mikrotik_profile'];
                $updated = $connector->updatePppProfile($oldProfileName, $mkData);
                if (!$updated) {
                    $updatedNew = $connector->updatePppProfile($data['mikrotik_profile'], $mkData);
                    if (!$updatedNew) {
                        $added = $connector->addPppProfile($mkData);
                        if (!$added) {
                            throw new \Exception("Gagal menambahkan profil PPP di Mikrotik.");
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            $errors[] = "{$router->name} (" . $e->getMessage() . ")";
        }

        if (empty($data['queue_type_tx']) && !empty($data['queue_type_rx'])) {
            $data['queue_type_tx'] = $data['queue_type_rx'];
        }

        $data['router_id'] = $routerId;

        Package::updateOrCreate(['id' => $id], $data);

        \App\Services\Router\MikrotikPackageProfilesCache::forget($routerId);

        if (!empty($errors)) {
            return redirect()->back()->with('warning', 'Paket disimpan secara lokal, namun gagal sinkronisasi profil ke router: ' . implode(', ', $errors));
        }

        return redirect()->back()->with('success', "Paket internet berhasil disimpan dan disinkronkan ke router {$router->name}.");
    }

    /**
     * Delete an Internet Package.
     */
    public function deletePackage(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|exists:packages,id',
            'router_id' => 'required|exists:routers,id',
            'db_only' => 'nullable|boolean',
        ]);

        $package = Package::findOrFail($data['id']);
        $dbOnly = $request->boolean('db_only');

        if ($package->customers()->exists()) {
            return redirect()->back()->with('error', 'Gagal menghapus paket karena masih digunakan oleh pelanggan.');
        }

        $router = Router::findOrFail($data['router_id']);
        $profileName = $package->mikrotik_profile ?: $package->name;
        $routerError = null;
        $packageRouterId = $package->router_id ?? $router->id;
        $otherPackageUsesProfile = Package::query()
            ->where('id', '!=', $package->id)
            ->where('router_id', $packageRouterId)
            ->whereRaw('LOWER(mikrotik_profile) = ?', [strtolower((string) $profileName)])
            ->exists();

        if (!$dbOnly && !$otherPackageUsesProfile && strtolower($profileName) !== 'default') {
            try {
                $connector = \App\Services\Router\RouterService::getConnector($router);

                if (($package->type ?? 'pppoe') === 'hotspot') {
                    $deleted = $connector->deleteHotspotProfile($profileName);
                    if (!$deleted) {
                        throw new \Exception('Gagal menghapus profil hotspot di Mikrotik.');
                    }
                } else {
                    $deleted = $connector->deletePppProfile($profileName);
                    if (!$deleted) {
                        throw new \Exception('Gagal menghapus profil PPP di Mikrotik.');
                    }
                }
            } catch (\Exception $e) {
                $routerError = "{$router->name} ({$e->getMessage()})";
            }
        }

        $package->delete();

        \App\Services\Router\MikrotikPackageProfilesCache::forget((int) $router->id);

        if ($routerError) {
            return redirect()->back()->with(
                'warning',
                'Paket dihapus dari aplikasi, namun gagal menghapus profil di router: ' . $routerError
            );
        }

        return redirect()->back()->with(
            'success',
            "Paket internet berhasil dihapus dari aplikasi dan router {$router->name}."
        );
    }

    /**
     * Sinkronkan paket dari profil RouterOS (PPPoE + Hotspot) dan bersihkan database.
     */
    public function syncPackagesFromRouter(Request $request)
    {
        $data = $request->validate([
            'router_id' => 'required|exists:routers,id',
        ]);

        $router = Router::findOrFail($data['router_id']);

        try {
            $result = \App\Services\Router\PackageRouterSyncService::sync($router);

            $parts = [
                sprintf(
                    '%d profil RouterOS diproses (%d baru, %d diperbarui)',
                    $result['profile_count'],
                    $result['imported'],
                    $result['updated']
                ),
            ];

            if ($result['removed'] > 0) {
                $parts[] = sprintf('%d paket dihapus dari database untuk router ini (tidak ada di RouterOS)', $result['removed']);
            }

            if ($result['duplicates_removed'] > 0) {
                $parts[] = sprintf('%d entri duplikat dibersihkan', $result['duplicates_removed']);
            }

            if ($result['skipped_in_use'] > 0) {
                $parts[] = sprintf('%d paket tidak dihapus karena masih dipakai pelanggan', $result['skipped_in_use']);
            }

            return redirect()->back()->with('success', 'Sinkron paket dari ' . $router->name . ': ' . implode('. ', $parts) . '.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal sinkron paket dari router: ' . $e->getMessage());
        }
    }

    /**
     * Accept manual cash payment for an invoice.
     */
    public function payInvoiceManual(Request $request)
    {
        $request->validate([
            'invoice_id' => 'required|exists:invoices,id'
        ]);

        $invoice = Invoice::with(['customer.package', 'customer.router'])->findOrFail($request->input('invoice_id'));
        $this->authorizeManualPayment($request, $invoice);

        $success = BillingService::processPaidInvoice(
            $invoice,
            'manual',
            'ADMIN-CASH-' . time(),
            $invoice->total_amount,
            0,
            ['payment_method' => 'Cash / Tunai']
        );

        if ($success) {
            return redirect()->back()->with([
                'success' => 'Tagihan berhasil dibayar secara manual.',
                'print_invoice_id' => $invoice->id,
            ]);
        }

        return redirect()->back()->with('error', 'Gagal memproses pembayaran manual.');
    }

    /**
     * Kirim notifikasi invoice ke pelanggan via WhatsApp (belum bayar / lunas).
     */
    public function sendInvoiceWhatsApp(Request $request)
    {
        $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
        ]);

        $invoice = Invoice::with(['customer', 'payments'])->findOrFail($request->input('invoice_id'));
        $result = BillingService::sendInvoiceWhatsAppNotification($invoice);

        if ($result['ok']) {
            return redirect()->back()->with('success', $result['message']);
        }

        return redirect()->back()->with('error', $result['message']);
    }

    /**
     * Accept manual cash payment for multiple unpaid invoices (no auto-print).
     */
    public function payInvoicesManualBulk(Request $request)
    {
        abort_unless($request->user()?->canPayManual(), 403);

        $data = $request->validate([
            'invoice_ids' => 'required|array|min:1',
            'invoice_ids.*' => 'integer|exists:invoices,id',
        ]);

        $invoices = Invoice::with(['customer.package', 'customer.router'])
            ->whereIn('id', $data['invoice_ids'])
            ->get();

        $paidCount = 0;
        $skippedCount = 0;
        $failedCount = 0;
        $deniedCount = 0;
        $batchRef = 'ADMIN-CASH-BULK-' . time();

        foreach ($invoices as $invoice) {
            if ($invoice->status !== 'unpaid') {
                $skippedCount++;
                continue;
            }

            if (!$this->canPerformManualPayment($request->user(), $invoice)) {
                $deniedCount++;
                continue;
            }

            $success = BillingService::processPaidInvoice(
                $invoice,
                'manual',
                $batchRef . '-' . $invoice->id,
                (float) $invoice->total_amount,
                0,
                ['payment_method' => 'Cash / Tunai (Massal)']
            );

            if ($success) {
                $paidCount++;
            } else {
                $failedCount++;
            }
        }

        if ($paidCount === 0 && $failedCount === 0 && $deniedCount === 0) {
            return redirect()->back()->with('warning', 'Tidak ada invoice belum bayar yang diproses.');
        }

        $message = "{$paidCount} tagihan berhasil dibayar secara manual.";
        if ($skippedCount > 0) {
            $message .= " {$skippedCount} invoice dilewati (bukan status belum bayar).";
        }
        if ($deniedCount > 0) {
            $message .= " {$deniedCount} invoice di luar area kerja Anda.";
        }
        if ($failedCount > 0) {
            $message .= " {$failedCount} invoice gagal diproses.";
        }

        $flashType = $failedCount > 0 && $paidCount === 0 ? 'error' : ($failedCount > 0 ? 'warning' : 'success');

        return redirect()->back()->with($flashType, $message);
    }

    /**
     * Cancel / reverse an accidental manual cash payment.
     */
    public function voidInvoicePayment(Request $request)
    {
        $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
        ]);

        $invoice = Invoice::with(['payments', 'customer'])->findOrFail($request->input('invoice_id'));

        try {
            BillingService::reversePaidInvoice($invoice);

            return redirect()->back()->with('success', "Pembayaran invoice {$invoice->invoice_number} berhasil dibatalkan. Status kembali menjadi belum bayar.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
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
     * Manually generate an invoice for a single customer.
     */
    public function generateCustomerInvoice(Request $request)
    {
        $data = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'due_extension_days' => 'nullable|integer|in:0,3,5,7',
        ]);

        $customer = Customer::with('package')->findOrFail($data['customer_id']);

        try {
            $created = VpsCatalogService::isShowcaseCustomer($customer)
                ? VpsCatalogService::generateManualInvoiceForCustomer(
                    $customer,
                    (int) ($data['due_extension_days'] ?? 0)
                )
                : BillingService::generateInvoiceForCustomer(
                    $customer,
                    null,
                    (int) ($data['due_extension_days'] ?? 0)
                );
            $amount = number_format($created['total_amount'], 0, ',', '.');
            $dueDateLabel = Carbon::parse($created['due_date'])->format('d-m-Y');
            $invoiceKind = VpsCatalogService::isShowcaseCustomer($customer) ? 'VPS' : 'internet';

            return redirect()->back()->with(
                'success',
                "Invoice {$invoiceKind} {$created['invoice_number']} periode {$created['billing_period']} berhasil dibuat (Rp {$amount}, jatuh tempo {$dueDateLabel})." .
                (! VpsCatalogService::isShowcaseCustomer($customer) && ! BillingService::customerHasPastDueUnpaidInvoices($customer->fresh())
                    ? ' Layanan pelanggan dipulihkan ke status aktif.'
                    : '')
            );
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Preview accumulated billing deferral for a customer.
     */
    public function previewBillingDeferral(Request $request)
    {
        $data = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'months_count' => 'required|integer|in:1,2',
        ]);

        $customer = Customer::with('package')->findOrFail($data['customer_id']);

        try {
            return response()->json(
                BillingService::previewBillingDeferral($customer, (int) $data['months_count'])
            );
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Create billing deferral (postpone 1–2 months with accumulated invoice).
     */
    public function createBillingDeferral(Request $request)
    {
        $data = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'months_count' => 'required|integer|in:1,2',
            'combined_due_date' => 'required|date|after:today',
            'notes' => 'nullable|string|max:500',
        ]);

        $customer = Customer::with('package')->findOrFail($data['customer_id']);

        try {
            $deferral = BillingService::createBillingDeferral(
                $customer,
                (int) $data['months_count'],
                Carbon::parse($data['combined_due_date']),
                $request->user(),
                $data['notes'] ?? null
            );

            $periodLabel = implode(' + ', $deferral->periods ?? []);

            return redirect()->back()->with(
                'success',
                "Penundaan tagihan berhasil. Periode {$periodLabel} akan digabung menjadi satu invoice jatuh tempo {$deferral->combined_due_date->format('d-m-Y')}. Layanan pelanggan dipulihkan ke profil paket normal."
            );
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Cancel a pending billing deferral.
     */
    public function cancelBillingDeferral(Request $request)
    {
        $data = $request->validate([
            'deferral_id' => 'required|exists:billing_deferrals,id',
        ]);

        $deferral = \App\Models\BillingDeferral::with('customer')->findOrFail($data['deferral_id']);

        try {
            $result = BillingService::cancelBillingDeferral($deferral);

            $message = 'Penundaan tagihan untuk ' . ($deferral->customer?->name ?? 'pelanggan') . ' berhasil dibatalkan.';
            $parts = [];
            if ($result['restored_count'] > 0) {
                $parts[] = "{$result['restored_count']} invoice dipulihkan";
            }
            if ($result['created_count'] > 0) {
                $parts[] = "{$result['created_count']} invoice baru dibuat";
            }
            if ($parts !== []) {
                $message .= ' (' . implode(', ', $parts) . ').';
            } else {
                $message .= ' Tidak ada invoice baru yang dibuat.';
            }

            return redirect()->back()->with('success', $message);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Restore a canceled invoice so Bayar Manual becomes available again.
     */
    public function restoreCanceledInvoice(Request $request)
    {
        $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
        ]);

        $invoice = Invoice::with('customer')->findOrFail($request->input('invoice_id'));

        try {
            $restored = BillingService::restoreCanceledInvoice($invoice);

            return redirect()->back()->with(
                'success',
                "Invoice {$restored->invoice_number} berhasil dipulihkan. Tombol Bayar Manual sudah tersedia."
            );
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Permanently delete an unpaid/canceled invoice.
     */
    public function deleteInvoice(Request $request)
    {
        $request->validate([
            'invoice_id' => 'required|exists:invoices,id',
        ]);

        $invoice = Invoice::findOrFail($request->input('invoice_id'));
        $invoiceNumber = $invoice->invoice_number;

        try {
            BillingService::deleteInvoice($invoice);

            return redirect()->back()->with(
                'success',
                "Invoice {$invoiceNumber} berhasil dihapus."
            );
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
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
                        'billing_date' => 20,
                        'service_start_date' => now()->toDateString(),
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
        $request->validate([
            'system.app_name' => 'nullable|string|max:100',
            'system.company_name' => 'nullable|string|max:150',
            'system.company_tagline' => 'nullable|string|max:150',
            'system.company_email' => 'nullable|email|max:150',
            'system.company_phone' => 'nullable|string|max:30',
            'system.company_address' => 'nullable|string|max:500',
            'system.company_website' => 'nullable|string|max:200',
            'system.footer_copyright' => 'nullable|string|max:500',
            'system.seo_title' => 'nullable|string|max:150',
            'system.seo_description' => 'nullable|string|max:320',
            'system.seo_keywords' => 'nullable|string|max:500',
            'system.seo_robots' => 'nullable|string|max:50',
            'system.tax_enabled' => 'nullable|in:0,1',
            'system.tax_rate_percent' => 'nullable|numeric|min:0|max:100',
            'system.billing_prorata_enabled' => 'nullable|in:0,1',
            'system.billing_generate_days_before' => 'nullable|integer|min:1|max:30',
            'system.billing_notify_admin' => 'nullable|in:0,1',
            'system.billing_admin_phone' => 'nullable|string|max:30',
            'payment.bank_name' => 'nullable|string|max:100',
            'payment.bank_account_number' => 'nullable|string|max:50',
            'payment.bank_account_holder' => 'nullable|string|max:150',
            'payment.dana_number' => 'nullable|string|max:30',
            'payment.dana_account_holder' => 'nullable|string|max:150',
            'payment.manual_confirm_phone' => 'nullable|string|max:30',
            'payment.active_gateway' => 'nullable|in:tripay,midtrans,duitku',
            'payment.tripay.mode' => 'nullable|in:sandbox,production',
            'payment.midtrans.mode' => 'nullable|in:sandbox,production',
            'payment.duitku.mode' => 'nullable|in:sandbox,production',
            'whatsapp.bulk_batch_size' => 'nullable|integer|min:1|max:100',
            'whatsapp.bulk_window_seconds' => 'nullable|integer|min:6|max:7200',
            'mikrotik.isolir_profile' => 'nullable|string|max:64',
            'mikrotik.isolir_source_router_id' => 'nullable|exists:routers,id',
            'system.logo' => ['nullable', 'file', 'max:2048', $this->brandingImageRule('Logo', ['jpg', 'jpeg', 'png', 'webp', 'svg'])],
            'system.favicon' => ['nullable', 'file', 'max:512', $this->brandingImageRule('Favicon', ['jpg', 'jpeg', 'png', 'webp', 'ico'])],
        ]);

        $logoUploaded = $this->storeBrandingUpload($request, 'system.logo');
        $faviconUploaded = $this->storeBrandingUpload($request, 'system.favicon');

        $taxEnabled = in_array($request->input('system.tax_enabled'), ['1', 1, true], true);
        $taxPercent = max(0, min(100, (float) $request->input('system.tax_rate_percent', 0)));
        SettingService::set('system.tax_rate_percent', (string) $taxPercent, 'system', false);
        SettingService::set(
            'system.tax_rate',
            ($taxEnabled && $taxPercent > 0) ? (string) ($taxPercent / 100) : '0',
            'system',
            false
        );

        $encryptedKeys = [
            'payment.tripay.api_key',
            'payment.tripay.private_key',
            'payment.midtrans.server_key',
            'payment.duitku.api_key',
            'whatsapp.api_key',
        ];

        $flatSettings = Arr::dot($request->except(['_token']));
        $skipKeys = ['system.logo', 'system.favicon', 'system.tax_enabled', 'system.tax_rate_percent'];

        foreach ($flatSettings as $key => $value) {
            if (in_array($key, $skipKeys, true)) {
                continue;
            }

            if ($value instanceof UploadedFile) {
                continue;
            }

            if ($value === null) {
                continue;
            }

            if ($value === '' && in_array($key, $encryptedKeys, true)) {
                continue;
            }

            if (SettingService::isBrokenUploadPath($value)) {
                continue;
            }

            $isEncrypted = in_array($key, $encryptedKeys, true);
            SettingService::set($key, $value, null, $isEncrypted);
        }

        SettingService::cleanupLegacyDuplicateKeys();
        BrandingService::bumpVersion();

        $message = 'Pengaturan berhasil diperbarui.';
        if ($logoUploaded) {
            $message .= ' Logo berhasil diunggah.';
        }
        if ($faviconUploaded) {
            $message .= ' Favicon berhasil diunggah.';
        }

        return redirect()->back()->with('success', $message);
    }

    /**
     * Save VPS showcase / Midtrans demo service settings.
     */
    public function saveVpsSettings(Request $request)
    {
        $request->validate([
            'vps.enabled' => 'nullable|in:0,1',
            'vps.page_title' => 'nullable|string|max:150',
            'vps.page_description' => 'nullable|string|max:1000',
            'vps.whitelist_usernames' => 'nullable|string|max:2000',
            'vps.whitelist_phones' => 'nullable|string|max:2000',
            'vps.demo_link_days' => 'nullable|integer|min:1|max:90',
            'vps.plans' => 'nullable|array|max:12',
            'vps.plans.*.id' => 'nullable|string|max:64',
            'vps.plans.*.name' => 'required_with:vps.plans|string|max:100',
            'vps.plans.*.cpu' => 'nullable|string|max:50',
            'vps.plans.*.ram' => 'nullable|string|max:50',
            'vps.plans.*.storage' => 'nullable|string|max:80',
            'vps.plans.*.bandwidth' => 'nullable|string|max:80',
            'vps.plans.*.price' => 'required_with:vps.plans|integer|min:1000|max:100000000',
            'vps.plans.*.description' => 'nullable|string|max:500',
            'vps.plans.*.featured' => 'nullable|boolean',
        ]);

        $enabled = in_array($request->input('vps.enabled'), ['1', 1, true], true);
        SettingService::set('vps.enabled', $enabled ? '1' : '0', 'vps', false);
        SettingService::set('vps.page_title', (string) $request->input('vps.page_title', ''), 'vps', false);
        SettingService::set('vps.page_description', (string) $request->input('vps.page_description', ''), 'vps', false);
        SettingService::set('vps.whitelist_usernames', (string) $request->input('vps.whitelist_usernames', ''), 'vps', false);
        SettingService::set('vps.whitelist_phones', (string) $request->input('vps.whitelist_phones', ''), 'vps', false);
        SettingService::set(
            'vps.demo_link_days',
            (string) max(1, min(90, (int) $request->input('vps.demo_link_days', 30))),
            'vps',
            false
        );

        $plans = collect($request->input('vps.plans', []))
            ->map(function (array $plan) {
                $name = trim((string) ($plan['name'] ?? ''));
                $id = trim((string) ($plan['id'] ?? ''));
                if ($id === '' && $name !== '') {
                    $id = strtolower(preg_replace('/[^a-z0-9]+/i', '-', $name) ?? 'plan');
                    $id = trim($id, '-');
                }

                return [
                    'id' => $id,
                    'name' => $name,
                    'cpu' => trim((string) ($plan['cpu'] ?? '')),
                    'ram' => trim((string) ($plan['ram'] ?? '')),
                    'storage' => trim((string) ($plan['storage'] ?? '')),
                    'bandwidth' => trim((string) ($plan['bandwidth'] ?? '')),
                    'price' => (int) ($plan['price'] ?? 0),
                    'description' => trim((string) ($plan['description'] ?? '')),
                    'featured' => (bool) ($plan['featured'] ?? false),
                ];
            })
            ->filter(fn (array $plan) => $plan['id'] !== '' && $plan['name'] !== '' && $plan['price'] > 0)
            ->values()
            ->all();

        SettingService::set(
            'vps.plans',
            json_encode($plans !== [] ? $plans : VpsCatalogService::defaultPlans(), JSON_UNESCAPED_UNICODE),
            'vps',
            false
        );

        return redirect()->back()->with('success', 'Pengaturan layanan VPS berhasil disimpan.');
    }

    /**
     * Generate signed demo login URL for Midtrans reviewers (valid for multiple days).
     */
    public function generateVpsDemoLink(Request $request)
    {
        $request->validate([
            'customer_id' => ['required', 'integer', 'exists:customers,id'],
        ]);

        if (! VpsCatalogService::isEnabled()) {
            return response()->json([
                'ok' => false,
                'message' => 'Layanan VPS belum diaktifkan.',
            ], 422);
        }

        $customer = Customer::query()->with('user')->findOrFail($request->integer('customer_id'));
        $url = VpsCatalogService::generateDemoLoginUrl($customer);

        if ($url === null) {
            return response()->json([
                'ok' => false,
                'message' => 'Pelanggan tidak cocok dengan whitelist VPS. Simpan whitelist lalu coba lagi.',
            ], 422);
        }

        return response()->json([
            'ok' => true,
            'url' => $url,
            'expires_in_days' => VpsCatalogService::demoLinkExpiryDays(),
            'customer_name' => $customer->name,
        ]);
    }

    /**
     * Save WhatsApp gateway & message template settings.
     */
    public function saveMessagingSettings(Request $request)
    {
        $templateKeys = array_keys(MessageTemplateService::definitions());
        $templateRules = [];
        foreach ($templateKeys as $key) {
            $shortKey = str_replace('whatsapp.', '', $key);
            $templateRules['whatsapp.' . $shortKey] = 'nullable|string|max:8000';
        }

        $request->validate(array_merge([
            'whatsapp.bulk_batch_size' => 'nullable|integer|min:1|max:100',
            'whatsapp.bulk_window_seconds' => 'nullable|integer|min:6|max:7200',
        ], $templateRules));

        $encryptedKeys = ['whatsapp.api_key'];
        $flatSettings = Arr::dot($request->except(['_token']));

        foreach ($flatSettings as $key => $value) {
            if ($value === null) {
                continue;
            }

            if ($value === '' && in_array($key, $encryptedKeys, true)) {
                continue;
            }

            if (SettingService::isBrokenUploadPath($value)) {
                continue;
            }

            $isEncrypted = in_array($key, $encryptedKeys, true);
            SettingService::set($key, $value, null, $isEncrypted);
        }

        SettingService::cleanupLegacyDuplicateKeys();

        return redirect()->back()->with('success', 'Pengaturan pesan berhasil diperbarui.');
    }

    public function previewMessagingTemplate(Request $request)
    {
        $definitions = MessageTemplateService::definitions();

        $request->validate([
            'key' => 'required|string|in:' . implode(',', array_keys($definitions)),
            'template' => 'nullable|string|max:8000',
        ]);

        $key = $request->input('key');
        $template = $request->input('template');
        $content = is_string($template) && trim($template) !== ''
            ? $template
            : MessageTemplateService::get($key);

        return response()->json([
            'ok' => true,
            'preview' => MessageTemplateService::renderContent($content, MessageTemplateService::sampleVariables($key)),
        ]);
    }

    public function testWhatsAppGateway(Request $request)
    {
        $request->validate([
            'phone' => 'required|string|max:30',
            'message' => 'nullable|string|max:500',
        ]);

        $config = \App\Services\WhatsAppService::configuration();

        if (!$config['enabled']) {
            return redirect()->back()->with('error', 'Integrasi WhatsApp dinonaktifkan. Aktifkan di menu WhatsApp & Telegram lalu simpan.');
        }

        $health = \App\Services\WhatsAppService::checkGatewayHealth();
        if (!$health['ok']) {
            return redirect()->back()->with('error', $health['message']);
        }

        $message = $request->input('message') ?: \App\Services\WhatsAppService::defaultTestMessage();
        $sent = \App\Services\WhatsAppService::sendText($request->input('phone'), $message, skipBulkDelay: true);

        if (!$sent) {
            return redirect()->back()->with('error', 'Gagal mengirim pesan uji. Pastikan sesi WhatsApp gateway sudah terhubung (scan QR) dan cek log aplikasi.');
        }

        return redirect()->back()->with('success', 'Pesan uji WhatsApp berhasil dikirim.');
    }

    public function getWhatsAppSessionStatus(Request $request)
    {
        if ($request->user()?->customer) {
            abort(403, 'Hanya administrator yang dapat mengelola sesi WhatsApp.');
        }

        if (!$request->boolean('refresh')) {
            $health = \App\Services\WhatsAppService::checkGatewayHealth();
            if (!$health['ok']) {
                return response()->json($health, 503);
            }
        }

        $status = \App\Services\WhatsAppService::getSessionStatus(
            $request->boolean('refresh'),
            $request->boolean('profile')
        );

        return response()->json($status, $status['ok'] ? 200 : 503);
    }

    public function refreshWhatsAppSessionProfile(Request $request)
    {
        if ($request->user()?->customer) {
            abort(403, 'Hanya administrator yang dapat mengelola sesi WhatsApp.');
        }

        $result = \App\Services\WhatsAppService::refreshSessionProfile();

        return response()->json($result, $result['ok'] ? 200 : 503);
    }

    public function getWhatsAppSessionAvatar(Request $request)
    {
        if ($request->user()?->customer) {
            abort(403, 'Hanya administrator yang dapat mengelola sesi WhatsApp.');
        }

        $config = \App\Services\WhatsAppService::configuration();

        if (empty($config['api_url'])) {
            abort(404);
        }

        try {
            $response = \App\Services\WhatsAppService::fetchSessionAvatarResponse();

            if (!$response->successful()) {
                abort(404);
            }

            return response($response->body(), 200, [
                'Content-Type' => $response->header('Content-Type') ?: 'image/jpeg',
                'Cache-Control' => 'private, max-age=300',
            ]);
        } catch (\Throwable) {
            abort(404);
        }
    }

    public function startWhatsAppSession(Request $request)
    {
        if ($request->user()?->customer) {
            abort(403, 'Hanya administrator yang dapat mengelola sesi WhatsApp.');
        }

        $health = \App\Services\WhatsAppService::checkGatewayHealth();
        if (!$health['ok']) {
            return response()->json($health, 503);
        }

        $result = \App\Services\WhatsAppService::startSession();

        if (!$result['ok']) {
            return response()->json($result, 503);
        }

        $status = \App\Services\WhatsAppService::getSessionStatus(true);

        return response()->json(array_merge($result, [
            'has_qr' => $status['has_qr'] ?? false,
            'qr_data_url' => $status['qr_data_url'] ?? null,
            'last_error' => $status['last_error'] ?? null,
            'profile' => $status['profile'] ?? null,
        ]));
    }

    public function saveAdminProfile(Request $request)
    {
        $user = $request->user();

        if ($user->customer) {
            abort(403, 'Hanya administrator yang dapat mengubah profil ini.');
        }

        $request->validate([
            'name' => 'required|string|max:150',
            'email' => ['required', 'email', 'max:150', Rule::unique('users')->ignore($user->id)],
            'profile_title' => 'nullable|string|max:100',
            'password' => 'nullable|string|min:8|confirmed',
            'avatar' => ['nullable', 'file', 'max:2048', $this->brandingImageRule('Avatar', ['jpg', 'jpeg', 'png', 'webp'])],
        ]);

        $user->name = $request->input('name');
        $user->email = $request->input('email');
        $user->profile_title = $request->input('profile_title') ?: null;

        if ($request->filled('password')) {
            $user->password = Hash::make($request->input('password'));
        }

        $avatarUploaded = $this->storeAvatarUpload($request, $user);
        $user->save();

        $message = 'Profil administrator berhasil diperbarui.';
        if ($avatarUploaded) {
            $message .= ' Avatar berhasil diunggah.';
        }

        return redirect()->back()->with('success', $message);
    }

    private function storeAvatarUpload(Request $request, User $user): bool
    {
        $file = $this->resolveUploadedFile($request, 'avatar');

        if (!$file instanceof UploadedFile || !$file->isValid()) {
            return false;
        }

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $user->avatar = $file->store('avatars', 'public');

        return true;
    }

    private function brandingImageRule(string $label, array $extensions): \Closure
    {
        return function (string $attribute, mixed $value, \Closure $fail) use ($label, $extensions) {
            if (!$value instanceof UploadedFile) {
                return;
            }

            if (!$value->isValid()) {
                $fail("{$label} gagal diunggah. Coba pilih file lain atau periksa ukuran file.");
                return;
            }

            $extension = strtolower($value->getClientOriginalExtension());
            if (!in_array($extension, $extensions, true)) {
                $fail("{$label} harus berformat: " . strtoupper(implode(', ', $extensions)) . '.');
            }
        };
    }

    private function storeBrandingUpload(Request $request, string $settingKey): bool
    {
        $file = $this->resolveUploadedFile($request, $settingKey);

        if (!$file instanceof UploadedFile || !$file->isValid()) {
            return false;
        }

        $oldPath = SettingService::get($settingKey);
        if ($oldPath && !SettingService::isBrokenUploadPath($oldPath)) {
            Storage::disk('public')->delete($oldPath);
        }

        $path = $file->store('branding', 'public');
        SettingService::set($settingKey, $path);

        return true;
    }

    private function resolveUploadedFile(Request $request, string $dotKey): ?UploadedFile
    {
        if ($request->hasFile($dotKey)) {
            $file = $request->file($dotKey);
            if ($file instanceof UploadedFile) {
                return $file;
            }
        }

        $underscoreKey = str_replace('.', '_', $dotKey);
        if ($underscoreKey !== $dotKey && $request->hasFile($underscoreKey)) {
            $file = $request->file($underscoreKey);
            if ($file instanceof UploadedFile) {
                return $file;
            }
        }

        $nested = data_get($request->allFiles(), $dotKey);

        return $nested instanceof UploadedFile ? $nested : null;
    }

    /**
     * Get real-time CPU/RAM/disk metrics from a Mikrotik RouterOS device.
     */
    public function getServerResources(\Illuminate\Http\Request $request)
    {
        $validated = $request->validate([
            'router_id' => 'required|exists:routers,id',
        ]);

        $router = Router::findOrFail($validated['router_id']);

        try {
            $connector = \App\Services\Router\RouterService::getConnector($router);
            $resources = $connector->getSystemResources();

            return response()->json(array_merge($resources, [
                'router_id' => $router->id,
                'router_name' => $router->name,
                'router_host' => $router->host,
                'source' => 'routeros',
            ]));
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'router_id' => $router->id,
                'router_name' => $router->name,
                'router_host' => $router->host,
                'source' => 'routeros',
            ], 502);
        }
    }

    /**
     * Profile names available on a Mikrotik router (PPPoE + Hotspot).
     */
    public function getRouterPackageProfiles(\Illuminate\Http\Request $request)
    {
        $validated = $request->validate([
            'router_id' => 'required|exists:routers,id',
            'scope' => 'nullable|in:list,form',
        ]);

        $router = Router::findOrFail($validated['router_id']);
        $scope = $validated['scope'] ?? \App\Services\Router\MikrotikPackageProfilesCache::SCOPE_LIST;

        try {
            $payload = \App\Services\Router\MikrotikPackageProfilesCache::remember(
                $router->id,
                $scope,
                function () use ($router, $scope) {
                    $connector = \App\Services\Router\RouterService::getConnector($router);
                    $options = \App\Services\Router\MikrotikPackageFormOptionsService::build($connector, $scope);

                    $payload = [
                        'router_id' => $router->id,
                        'router_name' => $router->name,
                        'scope' => $scope,
                        'ppp_profiles' => $options['ppp_profile_names'],
                        'hotspot_profiles' => $options['hotspot_profile_names'],
                        'all_profiles' => $options['all_profiles'],
                    ];

                    if ($scope === \App\Services\Router\MikrotikPackageProfilesCache::SCOPE_FORM) {
                        $payload['form_options'] = $options;
                    }

                    return $payload;
                }
            );

            return response()->json($payload);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'router_id' => $router->id,
                'router_name' => $router->name,
            ], 502);
        }
    }

    /**
     * List Mikrotik interfaces or read live rx/tx for a selected interface.
     */
    public function getRouterInterfaceTraffic(\Illuminate\Http\Request $request)
    {
        $validated = $request->validate([
            'router_id' => 'required|exists:routers,id',
            'interface' => 'nullable|string|max:100',
        ]);

        $router = Router::findOrFail($validated['router_id']);

        try {
            $connector = \App\Services\Router\RouterService::getConnector($router);
            $interfaces = $connector->getInterfaces();
            $dashboardInterfaces = \App\Services\Router\MikrotikInterfaceService::filterForDashboard($interfaces);

            if (empty($validated['interface'])) {
                return response()->json([
                    'router_id' => $router->id,
                    'router_name' => $router->name,
                    'default_interface' => \App\Services\Router\MikrotikInterfaceService::pickDefaultInterfaceName($interfaces),
                    'interfaces' => array_map(static fn (array $iface) => [
                        'name' => $iface['name'],
                        'type' => $iface['type'],
                        'running' => $iface['running'],
                        'disabled' => $iface['disabled'],
                    ], $dashboardInterfaces),
                ]);
            }

            $selectedName = (string) $validated['interface'];
            $selected = collect($interfaces)->firstWhere('name', $selectedName);

            if ($selected === null) {
                return response()->json([
                    'error' => "Interface \"{$selectedName}\" tidak ditemukan di router ini.",
                    'router_id' => $router->id,
                    'router_name' => $router->name,
                ], 404);
            }

            $live = $connector->getInterfaceLiveTraffic($selectedName);

            return response()->json([
                'router_id' => $router->id,
                'router_name' => $router->name,
                'interface' => $live['name'] ?? $selected['name'],
                'type' => $selected['type'],
                'running' => $selected['running'],
                'disabled' => $selected['disabled'],
                'rx_bps' => (int) $live['rx_bps'],
                'tx_bps' => (int) $live['tx_bps'],
                'sampled_at' => now()->toIso8601String(),
                'source' => 'routeros-monitor-traffic',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'router_id' => $router->id,
                'router_name' => $router->name,
            ], 502);
        }
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
            
            // 1. Sync User Profiles
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

            // 2. Sync Hotspot Users (Vouchers)
            $users = $connector->getHotspotUsers();
            
            // Voucher terjual yang sudah tidak ada di MikroTik — hapus dari DB (laporan tetap aman).
            $activeUsernames = collect($users)->pluck('name')->filter()->toArray();
            $orphanedVouchers = HotspotVoucher::where('router_id', $router->id)
                ->whereNotIn('username', $activeUsernames)
                ->get();

            $removedCount = 0;
            foreach ($orphanedVouchers as $orphanedVoucher) {
                if (in_array($orphanedVoucher->status, ['sold', 'expired'], true)) {
                    HotspotVoucherService::ensureSaleRecorded($orphanedVoucher);
                }

                $orphanedVoucher->delete();
                $removedCount++;
            }

            HotspotVoucherService::purgeExpiredSoldVouchers($router, $connector);

            $importedVouchersCount = 0;
            foreach ($users as $user) {
                $username = $user['name'] ?? null;
                if (!$username || $username === 'default-trial') {
                    continue;
                }

                // Skip if already in DB
                $exists = HotspotVoucher::where('router_id', $router->id)
                    ->where('username', $username)
                    ->exists();
                if ($exists) {
                    continue;
                }

                $profile = $user['profile'] ?? 'default';

                // Find matching local package to get price and validity
                $package = Package::where('type', 'hotspot')
                    ->where('mikrotik_profile', $profile)
                    ->first();

                $price = $package ? $package->price : 5000;
                $validity = $package ? $package->validity : ($user['limit-uptime'] ?? $user['limit_uptime'] ?? '1d');

                $uptime = $user['uptime'] ?? $user['uptime-limit'] ?? '';
                $macAddress = $this->extractMacAddress($user);
                $isUsed = false;
                if (!empty($uptime) && $uptime !== '0s' && $uptime !== '00:00:00') {
                    $isUsed = true;
                }
                if ($macAddress) {
                    $isUsed = true;
                }

                $voucher = HotspotVoucher::create([
                    'router_id' => $router->id,
                    'username' => $username,
                    'password' => $user['password'] ?? $username,
                    'mikrotik_profile' => $profile,
                    'price' => $price,
                    'validity' => $validity,
                    'status' => $isUsed ? 'sold' : 'unused',
                    'sold_at' => $isUsed ? \Carbon\Carbon::now() : null,
                    'mac_address' => $macAddress,
                ]);

                if ($macAddress && $isUsed) {
                    $this->recordAutoMacHotspotSale($voucher);
                }

                $importedVouchersCount++;
            }

            $this->syncHotspotMacAddressesForRouter($router);

            return redirect()->back()->with('success', "Berhasil mensinkronisasi {$importedCount} profil hotspot dan {$importedVouchersCount} voucher dari Mikrotik. Dihapus dari DB: {$removedCount}.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', "Gagal singkronisasi hotspot: " . $e->getMessage());
        }
    }

    /**
     * Sync MAC addresses for hotspot vouchers from MikroTik user/active sessions.
     */
    public function syncHotspotMacAddresses()
    {
        $updated = 0;
        $soldCount = 0;
        $purgedCount = 0;

        foreach (Router::all() as $router) {
            try {
                $result = $this->syncHotspotMacAddressesForRouter($router);
                $updated += $result['updated'];
                $soldCount += $result['sold'];
                $purgedCount += $result['purged'];
            } catch (\Exception $e) {
                continue;
            }
        }

        $macAddresses = HotspotVoucher::pluck('mac_address', 'id')
            ->map(fn ($mac) => $mac ?: null)
            ->toArray();

        return response()->json([
            'success' => true,
            'updated' => $updated,
            'sold_count' => $soldCount,
            'purged_count' => $purgedCount,
            'mac_addresses' => $macAddresses,
        ]);
    }

    private function syncHotspotMacAddressesForRouter(Router $router): array
    {
        $connector = \App\Services\Router\RouterService::getConnector($router);
        $updated = 0;
        $sold = 0;

        $process = function (?string $username, ?string $mac) use ($router, &$updated, &$sold) {
            if (!$username || !$mac) {
                return;
            }

            $voucher = HotspotVoucher::where('router_id', $router->id)
                ->where('username', $username)
                ->first();

            if (!$voucher) {
                return;
            }

            $result = $this->applyMacDetectionToVoucher($voucher, $mac);
            if ($result['updated']) {
                $updated++;
            }
            if ($result['sold']) {
                $sold++;
            }
        };

        foreach ($connector->getHotspotUsers() as $user) {
            $process($user['name'] ?? null, $this->extractMacAddress($user));
        }

        foreach ($connector->getHotspotActive() as $active) {
            $process($active['user'] ?? null, $this->extractMacAddress($active));
        }

        $purged = HotspotVoucherService::purgeExpiredSoldVouchers($router, $connector);

        return ['updated' => $updated, 'sold' => $sold, 'purged' => $purged];
    }

    private function applyMacDetectionToVoucher(HotspotVoucher $voucher, string $mac): array
    {
        $updates = [];
        $wasUnused = $voucher->status === 'unused';

        if ($voucher->mac_address !== $mac) {
            $updates['mac_address'] = $mac;
        }

        if ($wasUnused) {
            $updates['status'] = 'sold';
            $updates['sold_at'] = Carbon::now();
        }

        if (empty($updates)) {
            return ['updated' => false, 'sold' => false];
        }

        $voucher->update($updates);

        if ($wasUnused) {
            $this->recordAutoMacHotspotSale($voucher);
        }

        return ['updated' => true, 'sold' => $wasUnused];
    }

    private function recordAutoMacHotspotSale(HotspotVoucher $voucher): void
    {
        HotspotVoucherService::ensureSaleRecorded($voucher, 'Otomatis (MAC Terdeteksi)');
    }

    private function ensureHotspotSaleRecorded(HotspotVoucher $voucher, ?string $paymentMethod = null): void
    {
        HotspotVoucherService::ensureSaleRecorded($voucher, $paymentMethod);
    }

    private function extractMacAddress(array $record): ?string
    {
        $mac = $record['mac-address'] ?? $record['mac_address'] ?? null;
        if (!is_string($mac)) {
            return null;
        }

        $mac = strtoupper(trim($mac));
        return $mac !== '' ? $mac : null;
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
            'comment' => 'nullable|string|max:100',
            'code_format' => 'required|in:12345,ABCDE,abcde,123ABC,123abc,1A2B3C,1a2b3c',
            'server' => 'required|string|max:50',
            'login_type' => 'required|in:same,different',
            'wifi_name' => 'nullable|string|max:50',
        ]);

        $router = Router::findOrFail($data['router_id']);
        $package = Package::findOrFail($data['package_id']);

        try {
            $connector = \App\Services\Router\RouterService::getConnector($router);

            $numChars = '23456789';
            $upperChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
            $lowerChars = 'abcdefghijkmnopqrstuvwxyz';

            $generateCode = function($format, $length, $prefix) use ($numChars, $upperChars, $lowerChars) {
                $code = $prefix;
                for ($j = 0; $j < $length; $j++) {
                    if ($format === '12345') {
                        $code .= $numChars[rand(0, strlen($numChars) - 1)];
                    } elseif ($format === 'ABCDE') {
                        $code .= $upperChars[rand(0, strlen($upperChars) - 1)];
                    } elseif ($format === 'abcde') {
                        $code .= $lowerChars[rand(0, strlen($lowerChars) - 1)];
                    } elseif ($format === '123ABC') {
                        $pool = $numChars . $upperChars;
                        $code .= $pool[rand(0, strlen($pool) - 1)];
                    } elseif ($format === '123abc') {
                        $pool = $numChars . $lowerChars;
                        $code .= $pool[rand(0, strlen($pool) - 1)];
                    } elseif ($format === '1A2B3C') {
                        if ($j % 2 === 0) {
                            $code .= $numChars[rand(0, strlen($numChars) - 1)];
                        } else {
                            $code .= $upperChars[rand(0, strlen($upperChars) - 1)];
                        }
                    } elseif ($format === '1a2b3c') {
                        if ($j % 2 === 0) {
                            $code .= $numChars[rand(0, strlen($numChars) - 1)];
                        } else {
                            $code .= $lowerChars[rand(0, strlen($lowerChars) - 1)];
                        }
                    }
                }
                return $code;
            };

            $successCount = 0;
            for ($i = 0; $i < $data['qty']; $i++) {
                $username = $generateCode($data['code_format'], $data['code_length'], $data['prefix'] ?? '');
                
                if ($data['login_type'] === 'different') {
                    $password = $generateCode($data['code_format'], $data['code_length'], '');
                } else {
                    $password = $username;
                }

                // Add to MikroTik
                $mkData = [
                    'name' => $username,
                    'password' => $password,
                    'profile' => $package->mikrotik_profile,
                    'server' => $data['server'],
                    'comment' => $data['comment'] ?? (BrandingService::appName() . ' Generated'),
                ];

                if (!empty($package->validity)) {
                    $mkData['limit-uptime'] = $package->validity;
                }

                $added = $connector->addHotspotUser($mkData);

                if ($added) {
                    HotspotVoucher::create([
                        'router_id' => $router->id,
                        'username' => $username,
                        'password' => $password,
                        'mikrotik_profile' => $package->mikrotik_profile,
                        'server' => $data['server'],
                        'wifi_name' => $data['wifi_name'] ?? null,
                        'price' => $package->price,
                        'validity' => $package->validity,
                        'status' => 'unused',
                        'comment' => $data['comment'] ?? null,
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

            $this->ensureHotspotSaleRecorded($voucher);

            $voucher->delete();

            return redirect()->back()->with('success', "Voucher hotspot berhasil dihapus.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', "Gagal menghapus voucher: " . $e->getMessage());
        }
    }

    /**
     * Delete Hotspot Vouchers in bulk by comment.
     */
    public function bulkDeleteVouchersByComment(Request $request)
    {
        $request->validate([
            'comment' => 'required|string',
            'router_id' => 'required|exists:routers,id',
        ]);

        $comment = $request->input('comment');
        $routerId = $request->input('router_id');

        $vouchers = HotspotVoucher::where('comment', $comment)
            ->where('router_id', $routerId)
            ->get();

        if ($vouchers->isEmpty()) {
            return redirect()->back()->with('error', "Tidak ada voucher dengan informasi tambahan '{$comment}' pada router yang dipilih.");
        }

        $router = Router::find($routerId);
        $deletedCount = 0;

        try {
            $connector = null;
            if ($router) {
                try {
                    $connector = \App\Services\Router\RouterService::getConnector($router);
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning("Gagal koneksi ke Mikrotik untuk hapus massal: " . $e->getMessage());
                }
            }

            foreach ($vouchers as $voucher) {
                if ($connector) {
                    try {
                        $connector->deleteHotspotUser($voucher->username);
                        $connector->kickHotspotActive($voucher->username);
                    } catch (\Exception $me) {
                        \Illuminate\Support\Facades\Log::warning("Gagal menghapus user hotspot {$voucher->username} di Mikrotik: " . $me->getMessage());
                    }
                }

                $this->ensureHotspotSaleRecorded($voucher);

                $voucher->delete();
                $deletedCount++;
            }

            return redirect()->back()->with('success', "Berhasil menghapus {$deletedCount} voucher dengan informasi tambahan '{$comment}' secara massal.");
        } catch (\Exception $e) {
            return redirect()->back()->with('error', "Gagal melakukan hapus massal: " . $e->getMessage());
        }
    }

    /**
     * Fetch all profiles (PPPoE or Hotspot) from MikroTik for dropdown selection.
     */
    public function getRouterProfiles(Request $request)
    {
        $request->validate([
            'router_id' => 'required|exists:routers,id',
            'type' => 'required|in:pppoe,hotspot',
        ]);

        $router = Router::findOrFail($request->input('router_id'));

        try {
            $connector = \App\Services\Router\RouterService::getConnector($router);
            
            if ($request->input('type') === 'hotspot') {
                $rawProfiles = $connector->getHotspotProfiles();
            } else {
                $rawProfiles = $connector->getProfiles();
            }

            $profiles = [];
            foreach ($rawProfiles as $p) {
                if (isset($p['name'])) {
                    $profiles[] = $p['name'];
                }
            }

            $rawPools = $connector->getIpPools();
            $pools = [];
            foreach ($rawPools as $pl) {
                if (isset($pl['name'])) {
                    $pools[] = $pl['name'];
                }
            }

            $rawQueues = $connector->getSimpleQueues();
            $parentQueues = [];
            foreach ($rawQueues as $q) {
                if (isset($q['name'])) {
                    $parentQueues[] = $q['name'];
                }
            }

            $rawQTypes = $connector->getQueueTypes();
            $queueTypes = [];
            foreach ($rawQTypes as $qt) {
                if (isset($qt['name'])) {
                    $queueTypes[] = $qt['name'];
                }
            }

            return response()->json([
                'success' => true,
                'profiles' => $profiles,
                'pools' => $pools,
                'parentQueues' => $parentQueues,
                'queueTypes' => $queueTypes,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Fetch all Hotspot servers from MikroTik for dropdown selection.
     */
    public function getRouterHotspotServers(Request $request)
    {
        $request->validate([
            'router_id' => 'required|exists:routers,id',
        ]);

        $router = Router::findOrFail($request->input('router_id'));

        try {
            $connector = \App\Services\Router\RouterService::getConnector($router);
            $rawServers = $connector->getHotspotServers();
            
            $rawProfiles = [];
            try {
                $rawProfiles = $connector->getHotspotServerProfiles();
            } catch (\Exception $pe) {
                \Illuminate\Support\Facades\Log::warning("Gagal mengambil server profile hotspot: " . $pe->getMessage());
            }

            $profilesMap = [];
            foreach ($rawProfiles as $p) {
                if (isset($p['name'])) {
                    $profilesMap[$p['name']] = $p;
                }
            }

            $servers = [];
            foreach ($rawServers as $s) {
                if (isset($s['name'])) {
                    $profileName = $s['profile'] ?? '';
                    $dnsName = '';
                    if ($profileName && isset($profilesMap[$profileName])) {
                        $dnsName = $profilesMap[$profileName]['dns-name'] ?? '';
                    }

                    $servers[] = [
                        'name' => $s['name'],
                        'profile' => $profileName,
                        'dns_name' => $dnsName,
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'servers' => $servers,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Print vouchers in bulk using A4 paper layout (7x8 grid).
     */
    public function printVouchers(Request $request)
    {
        $request->validate([
            'router_id' => 'required|exists:routers,id',
            'comment' => 'required|string',
            'login_url' => 'nullable|string',
            'color_palette' => 'nullable|string',
        ]);

        $router = Router::findOrFail($request->input('router_id'));
        $comment = $request->input('comment');
        $loginUrl = $request->input('login_url', 'http://10.0.0.1');
        $colorPalette = $request->input('color_palette', 'price_based');

        $vouchers = \App\Models\HotspotVoucher::where('router_id', $router->id)
            ->where('comment', $comment)
            ->get();

        if ($vouchers->isEmpty()) {
            abort(404, "Voucher tidak ditemukan untuk Informasi Tambahan: {$comment}");
        }

        return view('admin.hotspot.print', [
            'router' => $router,
            'comment' => $comment,
            'loginUrl' => $loginUrl,
            'vouchers' => $vouchers,
            'colorPalette' => $colorPalette,
            'branding' => BrandingService::get(),
        ]);
    }

    /**
     * Cetak invoice: half A4 (default), full A4, atau thermal 58mm.
     */
    public function printInvoice(Request $request, Invoice $invoice)
    {
        $request->validate([
            'position' => 'nullable|in:top,bottom',
            'format' => 'nullable|in:half,a4,thermal',
        ]);

        $data = $this->invoicePrintViewData($invoice, $request);
        $format = $request->query('format', 'half');

        return match ($format) {
            'a4' => view('admin.invoices.print-a4', $data),
            'thermal' => view('admin.invoices.print-thermal', $data),
            default => view('admin.invoices.print', $data),
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function canPerformManualPayment(?User $actor, Invoice $invoice): bool
    {
        if (!$actor?->canPayManual()) {
            return false;
        }

        return $actor->canAccessRouter($invoice->customer?->router_id);
    }

    private function authorizeManualPayment(Request $request, Invoice $invoice): void
    {
        abort_unless(
            $this->canPerformManualPayment($request->user(), $invoice),
            403,
            $request->user()?->canPayManual()
                ? 'Invoice ini berada di luar router area kerja Anda.'
                : 'Anda tidak memiliki izin bayar manual.'
        );
    }

    private function invoicePrintViewData(Invoice $invoice, Request $request): array
    {
        $invoice->load(['customer.package', 'payments']);
        $position = $request->query('position', 'top');

        return [
            'invoice' => $invoice,
            'customer' => $invoice->customer,
            'package' => $invoice->customer?->package,
            'nextBilling' => $invoice->status === 'paid'
                ? BillingService::resolveNextBillingPreview($invoice)
                : null,
            'latestPayment' => $invoice->payments->sortByDesc('created_at')->first(),
            'position' => $position,
            'branding' => BrandingService::get(),
        ];
    }

    /**
     * Save or update ODP information.
     */
    public function saveOdp(Request $request)
    {
        $id = $request->input('id');

        $request->validate([
            'id' => 'nullable|exists:odps,id',
            'name' => 'required|string|max:100|unique:odps,name,' . $id,
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'total_ports' => 'required|integer|min:1',
            'description' => 'nullable|string',
        ]);

        $data = $request->only(['name', 'latitude', 'longitude', 'total_ports', 'description']);

        if ($id) {
            $odp = \App\Models\Odp::findOrFail($id);
            $odp->update($data);
            $message = 'Informasi ODP berhasil diperbarui.';
        } else {
            \App\Models\Odp::create($data);
            $message = 'ODP baru berhasil ditambahkan.';
        }

        return redirect()->back()->with('success', $message);
    }

    /**
     * Delete ODP if no customers are connected.
     */
    public function deleteOdp(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:odps,id',
        ]);

        $id = $request->input('id');
        
        // Check if there are any connected customers
        $connectedCustomers = Customer::where('odp_id', $id)->get();
        if ($connectedCustomers->count() > 0) {
            $names = $connectedCustomers->pluck('name')->join(', ');
            return redirect()->back()->with('error', "Gagal menghapus ODP. Masih ada {$connectedCustomers->count()} pelanggan yang terhubung ke ODP ini: {$names}. Hubungkan mereka ke ODP lain atau kosongkan ODP mereka terlebih dahulu!");
        }

        $odp = \App\Models\Odp::findOrFail($id);
        $odp->delete();

        return redirect()->back()->with('success', 'ODP berhasil dihapus dari sistem.');
    }

    public function saveFinancialExpense(Request $request)
    {
        $data = $request->validate([
            'id' => 'nullable|integer|exists:financial_expenses,id',
            'router_id' => 'nullable|exists:routers,id',
            'category' => 'required|in:' . implode(',', array_keys(FinancialExpense::CATEGORIES)),
            'title' => 'required|string|max:150',
            'amount' => 'required|numeric|min:0',
            'expense_date' => 'required|date',
            'payment_method' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:1000',
        ]);

        $scope = StaffRouterScope::for($request->user());
        $routerId = $data['router_id'] ?? null;

        if ($scope->isScoped()) {
            $routerId = $scope->routerId();
        } elseif ($routerId) {
            $scope->ensureCanAccessRouter((int) $routerId);
        }

        $payload = [
            'router_id' => $routerId,
            'category' => $data['category'],
            'title' => $data['title'],
            'amount' => $data['amount'],
            'expense_date' => $data['expense_date'],
            'payment_method' => $data['payment_method'] ?? null,
            'notes' => $data['notes'] ?? null,
            'recorded_by' => $request->user()?->id,
        ];

        if (!empty($data['id'])) {
            $expense = FinancialExpense::findOrFail($data['id']);

            if ($scope->isScoped() && (int) $expense->router_id !== (int) $scope->routerId()) {
                abort(403, 'Anda tidak memiliki akses ke pengeluaran ini.');
            }

            $expense->update($payload);

            return redirect()->back()->with('success', 'Pengeluaran berhasil diperbarui.');
        }

        FinancialExpense::create($payload);

        return redirect()->back()->with('success', 'Pengeluaran berhasil dicatat.');
    }

    public function deleteFinancialExpense(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|integer|exists:financial_expenses,id',
        ]);

        $scope = StaffRouterScope::for($request->user());
        $expense = FinancialExpense::findOrFail($data['id']);

        if ($scope->isScoped() && (int) $expense->router_id !== (int) $scope->routerId()) {
            abort(403, 'Anda tidak memiliki akses ke pengeluaran ini.');
        }

        $expense->delete();

        return redirect()->back()->with('success', 'Pengeluaran berhasil dihapus.');
    }

    public function saveStaffAdvanceLedger(Request $request)
    {
        $data = $request->validate([
            'id' => 'nullable|integer|exists:staff_advance_ledgers,id',
            'type' => 'required|in:' . implode(',', array_keys(StaffAdvanceLedger::TYPES)),
            'staff_user_id' => 'nullable|integer|exists:users,id',
            'counterparty' => 'nullable|string|max:150',
            'title' => 'required|string|max:150',
            'amount' => 'required|numeric|min:0.01',
            'transaction_date' => 'required|date',
            'payment_method' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:1000',
        ]);

        if (in_array($data['type'], StaffAdvanceLedger::PIUTANG_TYPES, true)) {
            if (empty($data['staff_user_id'])) {
                return redirect()->back()->with('error', 'Pilih teknisi untuk kasbon atau pelunasan.');
            }

            $technician = User::query()
                ->where('id', $data['staff_user_id'])
                ->where('role', User::ROLE_TECHNICIAN)
                ->first();

            if (!$technician) {
                return redirect()->back()->with('error', 'Teknisi tidak valid.');
            }
        }

        $payload = [
            'type' => $data['type'],
            'staff_user_id' => in_array($data['type'], StaffAdvanceLedger::PIUTANG_TYPES, true)
                ? $data['staff_user_id']
                : null,
            'counterparty' => in_array($data['type'], StaffAdvanceLedger::HUTANG_TYPES, true)
                ? ($data['counterparty'] ?? null)
                : null,
            'title' => $data['title'],
            'amount' => $data['amount'],
            'transaction_date' => $data['transaction_date'],
            'payment_method' => $data['payment_method'] ?? null,
            'notes' => $data['notes'] ?? null,
            'recorded_by' => $request->user()?->id,
        ];

        if (!empty($data['id'])) {
            $entry = StaffAdvanceLedger::findOrFail($data['id']);
            $entry->update($payload);
            $entry->refresh();

            $whatsAppWarning = $this->notifyStaffAdvanceLedger($entry, StaffAdvanceNotificationService::ACTION_UPDATED, $request->user());

            return $this->staffAdvanceRedirect('Transaksi hutang/piutang berhasil diperbarui.', $whatsAppWarning);
        }

        $entry = StaffAdvanceLedger::create($payload);

        $whatsAppWarning = $this->notifyStaffAdvanceLedger($entry, StaffAdvanceNotificationService::ACTION_CREATED, $request->user());

        return $this->staffAdvanceRedirect('Transaksi hutang/piutang berhasil dicatat.', $whatsAppWarning);
    }

    public function deleteStaffAdvanceLedger(Request $request)
    {
        $data = $request->validate([
            'id' => 'required|integer|exists:staff_advance_ledgers,id',
        ]);

        $entry = StaffAdvanceLedger::findOrFail($data['id']);
        $whatsAppWarning = $this->notifyStaffAdvanceLedger($entry, StaffAdvanceNotificationService::ACTION_DELETED, $request->user());
        $entry->delete();

        return $this->staffAdvanceRedirect('Transaksi hutang/piutang berhasil dihapus.', $whatsAppWarning);
    }

    private function notifyStaffAdvanceLedger(StaffAdvanceLedger $entry, string $action, ?User $recorder): ?string
    {
        try {
            return StaffAdvanceNotificationService::notify($entry, $action, $recorder);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Staff advance WhatsApp failed', [
                'ledger_id' => $entry->id,
                'action' => $action,
                'error' => $e->getMessage(),
            ]);

            return 'Notifikasi WhatsApp gagal: ' . $e->getMessage();
        }
    }

    /**
     * @return \Illuminate\Http\RedirectResponse
     */
    private function staffAdvanceRedirect(string $successMessage, ?string $whatsAppWarning)
    {
        $redirect = redirect()->back()->with('success', $successMessage);

        if ($whatsAppWarning) {
            return $redirect->with('warning', $whatsAppWarning);
        }

        return $redirect;
    }
}
