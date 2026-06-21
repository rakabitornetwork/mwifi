<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BillingActivityLog;
use App\Models\Customer;
use App\Models\HotspotSale;
use App\Models\HotspotVoucher;
use App\Models\Invoice;
use App\Models\Odp;
use App\Models\Package;
use App\Models\Router;
use App\Models\Setting;
use App\Services\AppUpdateService;
use App\Services\BillingService;
use App\Services\DatabaseBackupService;
use Inertia\Inertia;
use Inertia\Response;

class AdminPageController extends Controller
{
    public function dashboard(): Response
    {
        return Inertia::render('Admin/Dashboard/Index', [
            'customers' => Customer::with(['package', 'router'])->get(),
            'routers' => Router::all(),
            'invoices' => BillingService::appendNextBillingToInvoices(
                Invoice::with(['customer.package', 'payments'])->orderByDesc('created_at')->get()
            ),
            'odps' => Odp::all(),
            'billingActivityLogs' => BillingActivityLog::orderByDesc('created_at')->limit(50)->get(),
        ]);
    }

    public function routers(): Response
    {
        return Inertia::render('Admin/Routers/Index', [
            'routers' => Router::all(),
        ]);
    }

    public function customers(): Response
    {
        return Inertia::render('Admin/Customers/Index', [
            'customers' => Customer::with(['odp', 'package', 'router'])->get(),
            'routers' => Router::all(),
            'packages' => Package::all(),
            'odps' => Odp::all(),
        ]);
    }

    public function networkMap(): Response
    {
        return Inertia::render('Admin/NetworkMap/Index', [
            'odps' => Odp::all(),
            'customers' => Customer::with(['odp', 'package', 'router'])->get(),
        ]);
    }

    public function packages(): Response
    {
        return Inertia::render('Admin/Packages/Index', [
            'packages' => Package::all(),
        ]);
    }

    public function invoices(): Response
    {
        return Inertia::render('Admin/Invoices/Index', [
            'invoices' => BillingService::appendNextBillingToInvoices(
                Invoice::with(['customer.package', 'payments'])->orderByDesc('created_at')->get()
            ),
            'customers' => Customer::with(['package', 'router'])->get(),
            'billingActivityLogs' => BillingActivityLog::orderByDesc('created_at')->limit(50)->get(),
        ]);
    }

    public function hotspot(): Response
    {
        return Inertia::render('Admin/Hotspot/Index', [
            'routers' => Router::all(),
            'packages' => Package::where('type', 'hotspot')->get(),
            'customers' => Customer::with(['package', 'router'])->where('service_type', 'hotspot')->get(),
            'hotspotVouchers' => HotspotVoucher::with('router')->orderByDesc('created_at')->get(),
            'hotspotSales' => HotspotSale::with('router')->orderByDesc('created_at')->get(),
        ]);
    }

    public function database(): Response
    {
        $backupService = app(DatabaseBackupService::class);

        return Inertia::render('Admin/Database/Index', [
            'databaseInfo' => $backupService->getDatabaseInfo(),
        ]);
    }

    public function update(): Response
    {
        return Inertia::render('Admin/Update/Index', [
            'appUpdateInfo' => app(AppUpdateService::class)->getCachedStatus(),
        ]);
    }

    public function settings(): Response
    {
        return Inertia::render('Admin/Settings/Index', [
            'settings' => Setting::all(),
            'routers' => Router::all(),
        ]);
    }

    public function profile(): Response
    {
        return Inertia::render('Admin/Profile/Index');
    }
}
