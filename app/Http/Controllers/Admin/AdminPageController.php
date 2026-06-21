<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BillingActivityLog;
use App\Models\BillingDeferral;
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
        $customers = Customer::query()
            ->where('service_type', 'pppoe')
            ->with([
                'odp',
                'package',
                'router',
                'user:id,email',
                'invoices' => fn ($query) => $query->orderByDesc('created_at')->limit(10),
                'billingDeferrals' => fn ($query) => $query
                    ->where('status', 'pending')
                    ->latest('id'),
            ])
            ->orderBy('name')
            ->get()
            ->map(function (Customer $customer) {
                $latestUnpaid = $customer->invoices->firstWhere('status', 'unpaid');
                $latestCanceled = $customer->invoices->firstWhere('status', 'canceled');
                $pendingDeferral = $customer->billingDeferrals->first();

                return array_merge($customer->toArray(), [
                    'portal_email' => $customer->user?->email,
                    'latest_unpaid_invoice' => $latestUnpaid ? [
                        'id' => $latestUnpaid->id,
                        'invoice_number' => $latestUnpaid->invoice_number,
                        'billing_period' => $latestUnpaid->billing_period,
                        'total_amount' => $latestUnpaid->total_amount,
                        'due_date' => $latestUnpaid->due_date?->format('Y-m-d'),
                        'status' => $latestUnpaid->status,
                    ] : null,
                    'latest_canceled_invoice' => $latestCanceled ? [
                        'invoice_number' => $latestCanceled->invoice_number,
                        'billing_period' => $latestCanceled->billing_period,
                        'total_amount' => $latestCanceled->total_amount,
                        'due_date' => $latestCanceled->due_date?->format('Y-m-d'),
                    ] : null,
                    'pending_deferral' => $pendingDeferral ? [
                        'id' => $pendingDeferral->id,
                        'periods' => $pendingDeferral->periods,
                        'combined_due_date' => $pendingDeferral->combined_due_date?->format('Y-m-d'),
                        'months_count' => $pendingDeferral->months_count,
                    ] : null,
                ]);
            })
            ->values();

        return Inertia::render('Admin/Customers/Index', [
            'customers' => $customers,
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
        BillingService::repairSplitDeferralInvoices();

        return Inertia::render('Admin/Invoices/Index', [
            'invoices' => BillingService::appendNextBillingToInvoices(
                Invoice::with(['customer.package', 'payments'])->orderByDesc('created_at')->get()
            ),
            'customers' => Customer::with(['package', 'router'])
                ->where('service_type', 'pppoe')
                ->get(),
            'billingDeferrals' => BillingService::serializeBillingDeferrals(
                BillingDeferral::with(['customer.package', 'invoice'])
                    ->whereIn('status', ['pending', 'invoiced'])
                    ->orderByDesc('created_at')
                    ->limit(50)
                    ->get()
            ),
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
