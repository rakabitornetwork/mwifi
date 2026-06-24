<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Admin\AdminPageController;

Route::get('/', function () {
    return Inertia::render('Welcome');
});

Route::get('favicon.ico', function () {
    $path = \App\Services\BrandingService::resolveAssetPath('favicon')
        ?: \App\Services\BrandingService::resolveAssetPath('logo');

    if (!$path) {
        abort(404);
    }

    $absolute = Storage::disk('public')->path($path);
    $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
    $mime = match ($extension) {
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg', 'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'ico' => 'image/x-icon',
        default => @mime_content_type($absolute) ?: 'application/octet-stream',
    };

    return response()->file($absolute, [
        'Content-Type' => $mime,
        'Cache-Control' => 'public, max-age=86400',
    ]);
})->name('favicon');

Route::get('branding/{type}', [\App\Http\Controllers\BrandingAssetController::class, 'show'])
    ->whereIn('type', ['logo', 'favicon'])
    ->name('branding.asset');

Route::get('admin', function () {
    return auth()->check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
})->name('admin');

Route::middleware('guest')->group(function () {
    Route::get('login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store']);
});

Route::middleware('auth')->group(function () {
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    Route::get('profile/avatar/{user}', [\App\Http\Controllers\ProfileAvatarController::class, 'show'])
        ->whereNumber('user')
        ->name('profile.avatar');

    Route::get('customer/dashboard', [\App\Http\Controllers\Customer\CustomerPortalController::class, 'index']);
    Route::get('customer/invoice/{invoice}/print', [\App\Http\Controllers\Customer\CustomerPortalController::class, 'printInvoice']);
    Route::post('customer/invoice/{invoice}/pay', [\App\Http\Controllers\Customer\CustomerPortalController::class, 'payInvoice']);
});

Route::middleware(['auth', 'staff', 'admin.tab', 'staff.write'])->group(function () {
    Route::get('dashboard', [AdminPageController::class, 'dashboard'])->name('dashboard');
    Route::get('routers', [AdminPageController::class, 'routers']);
    Route::get('customers', [AdminPageController::class, 'customers']);
    Route::get('packages', [AdminPageController::class, 'packages']);
    Route::get('invoices', [AdminPageController::class, 'invoices']);
    Route::get('hotspot', [AdminPageController::class, 'hotspot']);
    Route::get('settings', [AdminPageController::class, 'settings']);
    Route::get('messaging', [AdminPageController::class, 'messaging']);
    Route::get('database', [AdminPageController::class, 'database']);
    Route::get('update', [AdminPageController::class, 'update']);
    Route::get('profile', [AdminPageController::class, 'profile']);
    Route::get('network-map', [AdminPageController::class, 'networkMap']);
    Route::get('inventory', [AdminPageController::class, 'inventory']);
    Route::get('users', [AdminPageController::class, 'users']);

    // GenieACS (TR-069) Routes
    Route::get('admin/gpon/status', [\App\Http\Controllers\Admin\GenieAcsController::class, 'status']);
    Route::post('admin/gpon/reboot', [\App\Http\Controllers\Admin\GenieAcsController::class, 'reboot']);
    Route::get('admin/network-map/metrics', [\App\Http\Controllers\Admin\NetworkMapController::class, 'metrics']);

    // Admin CRUD Actions
    Route::post('admin/routers/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveRouter']);
    Route::post('admin/routers/delete', [\App\Http\Controllers\Admin\AdminActionController::class, 'deleteRouter']);
    Route::post('admin/routers/test-connection', [\App\Http\Controllers\Admin\AdminActionController::class, 'testConnection']);
    Route::post('admin/routers/sync', [\App\Http\Controllers\Admin\AdminActionController::class, 'syncRouter']);
    Route::post('admin/routers/get-profiles', [\App\Http\Controllers\Admin\AdminActionController::class, 'getRouterProfiles']);
    Route::post('admin/customers/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveCustomer']);
    Route::post('admin/customers/import-csv', [\App\Http\Controllers\Admin\AdminActionController::class, 'importCustomersCsv']);
    Route::post('admin/customers/delete', [\App\Http\Controllers\Admin\AdminActionController::class, 'deleteCustomer']);
    Route::post('admin/customers/bulk-delete', [\App\Http\Controllers\Admin\AdminActionController::class, 'bulkDeleteCustomer']);
    Route::get('admin/customers/bandwidth-quota', [\App\Http\Controllers\Admin\AdminActionController::class, 'getCustomerBandwidthQuota']);
    Route::post('admin/packages/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'savePackage']);
    Route::post('admin/packages/delete', [\App\Http\Controllers\Admin\AdminActionController::class, 'deletePackage']);
    Route::post('admin/packages/sync-from-router', [\App\Http\Controllers\Admin\AdminActionController::class, 'syncPackagesFromRouter']);

    // Admin ODP Actions
    Route::post('admin/odps/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveOdp']);
    Route::post('admin/odps/delete', [\App\Http\Controllers\Admin\AdminActionController::class, 'deleteOdp']);
    Route::post('admin/inventory/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveInventoryItem']);
    Route::post('admin/inventory/adjust', [\App\Http\Controllers\Admin\AdminActionController::class, 'adjustInventoryStock']);
    Route::post('admin/inventory/delete', [\App\Http\Controllers\Admin\AdminActionController::class, 'deleteInventoryItem']);
    Route::post('admin/users/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveStaffUser']);
    Route::post('admin/users/delete', [\App\Http\Controllers\Admin\AdminActionController::class, 'deleteStaffUser']);
    Route::post('admin/users/toggle-active', [\App\Http\Controllers\Admin\AdminActionController::class, 'toggleStaffUserActive']);

    Route::post('admin/invoices/pay-manual', [\App\Http\Controllers\Admin\AdminActionController::class, 'payInvoiceManual']);
    Route::post('admin/invoices/pay-manual-bulk', [\App\Http\Controllers\Admin\AdminActionController::class, 'payInvoicesManualBulk']);
    Route::post('admin/invoices/send-whatsapp', [\App\Http\Controllers\Admin\AdminActionController::class, 'sendInvoiceWhatsApp']);
    Route::post('admin/invoices/restore-canceled', [\App\Http\Controllers\Admin\AdminActionController::class, 'restoreCanceledInvoice']);
    Route::post('admin/invoices/delete', [\App\Http\Controllers\Admin\AdminActionController::class, 'deleteInvoice']);
    Route::post('admin/invoices/void-payment', [\App\Http\Controllers\Admin\AdminActionController::class, 'voidInvoicePayment']);
    Route::post('admin/invoices/generate', [\App\Http\Controllers\Admin\AdminActionController::class, 'generateInvoices']);
    Route::post('admin/invoices/generate-customer', [\App\Http\Controllers\Admin\AdminActionController::class, 'generateCustomerInvoice']);
    Route::post('admin/billing/defer/preview', [\App\Http\Controllers\Admin\AdminActionController::class, 'previewBillingDeferral']);
    Route::post('admin/billing/defer', [\App\Http\Controllers\Admin\AdminActionController::class, 'createBillingDeferral']);
    Route::post('admin/billing/defer/cancel', [\App\Http\Controllers\Admin\AdminActionController::class, 'cancelBillingDeferral']);
    Route::get('admin/invoices/{invoice}/print', [\App\Http\Controllers\Admin\AdminActionController::class, 'printInvoice']);
    Route::post('admin/settings/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveSettings']);
    Route::post('admin/messaging/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveMessagingSettings']);
    Route::post('admin/messaging/template-preview', [\App\Http\Controllers\Admin\AdminActionController::class, 'previewMessagingTemplate']);
    Route::post('admin/settings/whatsapp-test', [\App\Http\Controllers\Admin\AdminActionController::class, 'testWhatsAppGateway']);
    Route::get('admin/settings/whatsapp-session', [\App\Http\Controllers\Admin\AdminActionController::class, 'getWhatsAppSessionStatus']);
    Route::get('admin/settings/whatsapp-session/avatar', [\App\Http\Controllers\Admin\AdminActionController::class, 'getWhatsAppSessionAvatar']);
    Route::post('admin/settings/whatsapp-session/start', [\App\Http\Controllers\Admin\AdminActionController::class, 'startWhatsAppSession']);
    Route::post('admin/settings/whatsapp-session/refresh-profile', [\App\Http\Controllers\Admin\AdminActionController::class, 'refreshWhatsAppSessionProfile']);
    Route::post('admin/profile/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveAdminProfile']);
    Route::get('admin/server/resources', [\App\Http\Controllers\Admin\AdminActionController::class, 'getServerResources']);
    Route::get('admin/server/interface-traffic', [\App\Http\Controllers\Admin\AdminActionController::class, 'getRouterInterfaceTraffic']);
    Route::get('admin/packages/router-profiles', [\App\Http\Controllers\Admin\AdminActionController::class, 'getRouterPackageProfiles']);

    // Database backup & restore
    Route::post('admin/database/backup', [\App\Http\Controllers\Admin\DatabaseBackupController::class, 'createBackup']);
    Route::post('admin/database/restore', [\App\Http\Controllers\Admin\DatabaseBackupController::class, 'restoreBackup']);
    Route::post('admin/database/reset', [\App\Http\Controllers\Admin\DatabaseBackupController::class, 'resetApplicationData']);

    // Application update from GitHub
    Route::post('admin/update/check', [\App\Http\Controllers\Admin\AppUpdateController::class, 'checkUpdates']);
    Route::get('admin/update/status', [\App\Http\Controllers\Admin\AppUpdateController::class, 'status']);
    Route::post('admin/update/run', [\App\Http\Controllers\Admin\AppUpdateController::class, 'runUpdate']);
    Route::post('admin/update/run-stream', [\App\Http\Controllers\Admin\AppUpdateController::class, 'runUpdateStream']);

    // Admin Hotspot Actions
    Route::post('admin/hotspot/sync-profiles', [\App\Http\Controllers\Admin\AdminActionController::class, 'syncHotspotProfiles']);
    Route::post('admin/hotspot/generate-vouchers', [\App\Http\Controllers\Admin\AdminActionController::class, 'generateHotspotVouchers']);
    Route::post('admin/hotspot/sell-voucher', [\App\Http\Controllers\Admin\AdminActionController::class, 'sellHotspotVoucher']);
    Route::post('admin/hotspot/delete-voucher', [\App\Http\Controllers\Admin\AdminActionController::class, 'deleteHotspotVoucher']);
    Route::post('admin/hotspot/bulk-delete-vouchers', [\App\Http\Controllers\Admin\AdminActionController::class, 'bulkDeleteVouchersByComment']);
    Route::get('admin/hotspot/get-servers', [\App\Http\Controllers\Admin\AdminActionController::class, 'getRouterHotspotServers']);
    Route::get('admin/hotspot/voucher-mac-addresses', [\App\Http\Controllers\Admin\AdminActionController::class, 'syncHotspotMacAddresses']);
    Route::get('admin/hotspot/print-vouchers', [\App\Http\Controllers\Admin\AdminActionController::class, 'printVouchers']);
});

// Webhook Callback Payment Gateway
Route::post('api/payment/callback', [\App\Http\Controllers\Api\PaymentWebhookController::class, 'handle']);


