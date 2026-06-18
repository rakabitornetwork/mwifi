<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Auth\AuthenticatedSessionController;

Route::get('/', function () {
    return Inertia::render('Welcome');
});

Route::middleware('guest')->group(function () {
    Route::get('login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store']);
});

Route::middleware('auth')->group(function () {
    $renderDashboard = function ($tab) {
        return Inertia::render('Dashboard', [
            'activeTabProp' => $tab,
            'odps' => \App\Models\Odp::all(),
            'customers' => \App\Models\Customer::with(['odp', 'package', 'router'])->get(),
            'routers' => \App\Models\Router::all(),
            'packages' => \App\Models\Package::all(),
            'invoices' => \App\Models\Invoice::with('customer')->orderBy('created_at', 'desc')->get(),
            'settings' => \App\Models\Setting::all(),
            'hotspotVouchers' => \App\Models\HotspotVoucher::with('router')->orderBy('created_at', 'desc')->get(),
            'hotspotSales' => \App\Models\HotspotSale::with('router')->orderBy('created_at', 'desc')->get(),
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

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');

    // GenieACS (TR-069) Routes
    Route::get('admin/gpon/status', [\App\Http\Controllers\Admin\GenieAcsController::class, 'status']);
    Route::post('admin/gpon/reboot', [\App\Http\Controllers\Admin\GenieAcsController::class, 'reboot']);

    // Admin CRUD Actions
    Route::post('admin/routers/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveRouter']);
    Route::post('admin/routers/test-connection', [\App\Http\Controllers\Admin\AdminActionController::class, 'testConnection']);
    Route::post('admin/routers/sync', [\App\Http\Controllers\Admin\AdminActionController::class, 'syncRouter']);
    Route::post('admin/customers/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveCustomer']);
    Route::post('admin/customers/delete', [\App\Http\Controllers\Admin\AdminActionController::class, 'deleteCustomer']);
    Route::post('admin/customers/bulk-delete', [\App\Http\Controllers\Admin\AdminActionController::class, 'bulkDeleteCustomer']);
    Route::post('admin/packages/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'savePackage']);
    Route::post('admin/packages/delete', [\App\Http\Controllers\Admin\AdminActionController::class, 'deletePackage']);
    Route::post('admin/invoices/pay-manual', [\App\Http\Controllers\Admin\AdminActionController::class, 'payInvoiceManual']);
    Route::post('admin/invoices/generate', [\App\Http\Controllers\Admin\AdminActionController::class, 'generateInvoices']);
    Route::post('admin/settings/save', [\App\Http\Controllers\Admin\AdminActionController::class, 'saveSettings']);
    Route::get('admin/server/resources', [\App\Http\Controllers\Admin\AdminActionController::class, 'getServerResources']);

    // Admin Hotspot Actions
    Route::post('admin/hotspot/sync-profiles', [\App\Http\Controllers\Admin\AdminActionController::class, 'syncHotspotProfiles']);
    Route::post('admin/hotspot/generate-vouchers', [\App\Http\Controllers\Admin\AdminActionController::class, 'generateHotspotVouchers']);
    Route::post('admin/hotspot/sell-voucher', [\App\Http\Controllers\Admin\AdminActionController::class, 'sellHotspotVoucher']);
    Route::post('admin/hotspot/delete-voucher', [\App\Http\Controllers\Admin\AdminActionController::class, 'deleteHotspotVoucher']);

    // Customer Portal Routes
    Route::get('customer/dashboard', [\App\Http\Controllers\Customer\CustomerPortalController::class, 'index']);
    Route::post('customer/invoice/{invoice}/pay', [\App\Http\Controllers\Customer\CustomerPortalController::class, 'payInvoice']);
});

// Webhook Callback Payment Gateway
Route::post('api/payment/callback', [\App\Http\Controllers\Api\PaymentWebhookController::class, 'handle']);


