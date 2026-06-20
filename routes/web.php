<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Services\SettingService;
use App\Services\BillingService;
use App\Services\DatabaseBackupService;
use App\Services\AppUpdateService;

Route::get('/', function () {
    return Inertia::render('Welcome');
});

Route::get('favicon.ico', function () {
    $path = SettingService::get('system.favicon') ?: SettingService::get('system.logo');

    if (!$path || !Storage::disk('public')->exists($path)) {
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
    $renderDashboard = function ($tab) {
        $backupService = app(DatabaseBackupService::class);
        $updateService = app(AppUpdateService::class);

        return Inertia::render('Dashboard', [
            'activeTabProp' => $tab,
            'odps' => \App\Models\Odp::all(),
            'customers' => \App\Models\Customer::with(['odp', 'package', 'router'])->get(),
            'routers' => \App\Models\Router::all(),
            'packages' => \App\Models\Package::all(),
            'invoices' => BillingService::appendNextBillingToInvoices(
                \App\Models\Invoice::with(['customer.package', 'payments'])->orderBy('created_at', 'desc')->get()
            ),
            'billingActivityLogs' => \App\Models\BillingActivityLog::orderBy('created_at', 'desc')->limit(50)->get(),
            'settings' => \App\Models\Setting::all(),
            'hotspotVouchers' => \App\Models\HotspotVoucher::with('router')->orderBy('created_at', 'desc')->get(),
            'hotspotSales' => \App\Models\HotspotSale::with('router')->orderBy('created_at', 'desc')->get(),
            'databaseInfo' => $backupService->getDatabaseInfo(),
            'databaseBackups' => $backupService->listBackups(),
            'appUpdateInfo' => $updateService->getStatus(),
        ]);
    };

    Route::get('dashboard', function () use ($renderDashboard) {
        return $renderDashboard('dashboard');
    })->name('dashboard');

    Route::get('routers', function () use ($renderDashboard) {
        return $renderDashboard('routers');
    });

    Route::get('customers', function () use ($renderDashboard) {
        return $renderDashboard('customers');
    });

    Route::get('packages', function () use ($renderDashboard) {
        return $renderDashboard('packages');
    });

    Route::get('invoices', function () use ($renderDashboard) {
        return $renderDashboard('invoices');
    });

    Route::get('hotspot', function () use ($renderDashboard) {
        return $renderDashboard('hotspot');
    });

    Route::get('settings', function () use ($renderDashboard) {
        return $renderDashboard('settings');
    });

    Route::get('database', function () use ($renderDashboard) {
        return $renderDashboard('database');
    });

    Route::get('update', function () use ($renderDashboard) {
        return $renderDashboard('update');
    });

    Route::get('profile', function () use ($renderDashboard) {
        return $renderDashboard('profile');
    });

    Route::get('network-map', function () use ($renderDashboard) {
        return $renderDashboard('network-map');
    });

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    // GenieACS (TR-069) Routes
    Route::get('admin/gpon/status', [\App\Http\Controllers\Admin\GenieAcsController::class, 'status']);
    Route::post('admin/gpon/reboot', [\App\Http\Controllers\Admin\GenieAcsController::class, 'reboot']);
    Route::get('admin/network-map/metrics', [\App\Http\Controllers\Admin\NetworkMapController::class, 'metrics']);

    // Admin CRUD Actions
    Route::post('admin/routers/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveRouter']);
    Route::post('admin/routers/test-connection', [\App\Http\Controllers\Admin\AdminActionController::class, 'testConnection']);
    Route::post('admin/routers/sync', [\App\Http\Controllers\Admin\AdminActionController::class, 'syncRouter']);
    Route::post('admin/routers/get-profiles', [\App\Http\Controllers\Admin\AdminActionController::class, 'getRouterProfiles']);
    Route::post('admin/customers/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveCustomer']);
    Route::post('admin/customers/delete', [\App\Http\Controllers\Admin\AdminActionController::class, 'deleteCustomer']);
    Route::post('admin/customers/bulk-delete', [\App\Http\Controllers\Admin\AdminActionController::class, 'bulkDeleteCustomer']);
    Route::post('admin/packages/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'savePackage']);
    Route::post('admin/packages/delete', [\App\Http\Controllers\Admin\AdminActionController::class, 'deletePackage']);

    // Admin ODP Actions
    Route::post('admin/odps/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveOdp']);
    Route::post('admin/odps/delete', [\App\Http\Controllers\Admin\AdminActionController::class, 'deleteOdp']);

    Route::post('admin/invoices/pay-manual', [\App\Http\Controllers\Admin\AdminActionController::class, 'payInvoiceManual']);
    Route::post('admin/invoices/void-payment', [\App\Http\Controllers\Admin\AdminActionController::class, 'voidInvoicePayment']);
    Route::post('admin/invoices/generate', [\App\Http\Controllers\Admin\AdminActionController::class, 'generateInvoices']);
    Route::get('admin/invoices/{invoice}/print', [\App\Http\Controllers\Admin\AdminActionController::class, 'printInvoice']);
    Route::post('admin/settings/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveSettings']);
    Route::post('admin/profile/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveAdminProfile']);
    Route::get('admin/server/resources', [\App\Http\Controllers\Admin\AdminActionController::class, 'getServerResources']);

    // Database backup & restore
    Route::post('admin/database/backup', [\App\Http\Controllers\Admin\DatabaseBackupController::class, 'createBackup']);
    Route::get('admin/database/backups/{filename}/download', [\App\Http\Controllers\Admin\DatabaseBackupController::class, 'downloadBackup']);
    Route::post('admin/database/backups/delete', [\App\Http\Controllers\Admin\DatabaseBackupController::class, 'deleteBackup']);
    Route::post('admin/database/restore', [\App\Http\Controllers\Admin\DatabaseBackupController::class, 'restoreBackup']);
    Route::post('admin/database/reset', [\App\Http\Controllers\Admin\DatabaseBackupController::class, 'resetApplicationData']);

    // Application update from GitHub
    Route::post('admin/update/check', [\App\Http\Controllers\Admin\AppUpdateController::class, 'checkUpdates']);
    Route::post('admin/update/run', [\App\Http\Controllers\Admin\AppUpdateController::class, 'runUpdate']);

    // Admin Hotspot Actions
    Route::post('admin/hotspot/sync-profiles', [\App\Http\Controllers\Admin\AdminActionController::class, 'syncHotspotProfiles']);
    Route::post('admin/hotspot/generate-vouchers', [\App\Http\Controllers\Admin\AdminActionController::class, 'generateHotspotVouchers']);
    Route::post('admin/hotspot/sell-voucher', [\App\Http\Controllers\Admin\AdminActionController::class, 'sellHotspotVoucher']);
    Route::post('admin/hotspot/delete-voucher', [\App\Http\Controllers\Admin\AdminActionController::class, 'deleteHotspotVoucher']);
    Route::post('admin/hotspot/bulk-delete-vouchers', [\App\Http\Controllers\Admin\AdminActionController::class, 'bulkDeleteVouchersByComment']);
    Route::get('admin/hotspot/get-servers', [\App\Http\Controllers\Admin\AdminActionController::class, 'getRouterHotspotServers']);
    Route::get('admin/hotspot/voucher-mac-addresses', [\App\Http\Controllers\Admin\AdminActionController::class, 'syncHotspotMacAddresses']);
    Route::get('admin/hotspot/print-vouchers', [\App\Http\Controllers\Admin\AdminActionController::class, 'printVouchers']);

    // Customer Portal Routes
    Route::get('customer/dashboard', [\App\Http\Controllers\Customer\CustomerPortalController::class, 'index']);
    Route::get('customer/invoice/{invoice}/print', [\App\Http\Controllers\Customer\CustomerPortalController::class, 'printInvoice']);
    Route::post('customer/invoice/{invoice}/pay', [\App\Http\Controllers\Customer\CustomerPortalController::class, 'payInvoice']);
});

// Webhook Callback Payment Gateway
Route::post('api/payment/callback', [\App\Http\Controllers\Api\PaymentWebhookController::class, 'handle']);


