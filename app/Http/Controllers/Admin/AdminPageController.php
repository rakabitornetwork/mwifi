<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BillingActivityLog;
use App\Models\BillingDeferral;
use App\Models\Customer;
use App\Models\FinancialExpense;
use App\Models\HotspotSale;
use App\Models\HotspotVoucher;
use App\Models\InventoryItem;
use App\Models\Invoice;
use App\Models\Odp;
use App\Models\Package;
use App\Models\Router;
use App\Models\Setting;
use App\Models\User;
use App\Services\AppUpdateService;
use App\Services\BillingService;
use App\Services\DatabaseBackupService;
use App\Services\FinancialReportService;
use App\Services\InventoryService;
use App\Services\MessageTemplateService;
use App\Services\SettingService;
use App\Services\StaffRouterScope;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminPageController extends Controller
{
    private function routerScope(): StaffRouterScope
    {
        return StaffRouterScope::for(auth()->user());
    }

    public function dashboard(): Response
    {
        $scope = $this->routerScope();
        $customerBase = Customer::query();
        $scope->scopeCustomers($customerBase);

        $billingLogs = $scope->filterBillingActivityLogs(
            BillingActivityLog::query()
                ->where('event_type', 'scheduled_invoice')
                ->orderByDesc('created_at')
                ->limit(8)
                ->get()
        );

        $invoiceBase = Invoice::query();
        $scope->scopeInvoices($invoiceBase);

        $deferralBase = BillingDeferral::query()->where('status', 'pending');
        $scope->scopeBillingDeferrals($deferralBase);

        $isolatedCustomerQuery = Customer::query()
            ->where('service_type', 'pppoe')
            ->where('status', 'isolated');
        $scope->scopeCustomers($isolatedCustomerQuery);

        $isolatedCustomers = $isolatedCustomerQuery
            ->with([
                'router:id,name',
                'package:id,name',
                'invoices' => fn ($query) => $query
                    ->where('status', 'unpaid')
                    ->orderBy('due_date')
                    ->limit(1),
            ])
            ->orderBy('name')
            ->limit(8)
            ->get()
            ->map(function (Customer $customer) {
                $unpaid = $customer->invoices->first();

                return [
                    'id' => $customer->id,
                    'name' => $customer->name,
                    'username' => $customer->username,
                    'router_name' => $customer->router?->name,
                    'package_name' => $customer->package?->name,
                    'unpaid_invoice' => $unpaid ? [
                        'invoice_number' => $unpaid->invoice_number,
                        'total_amount' => (float) $unpaid->total_amount,
                        'due_date' => $unpaid->due_date?->format('Y-m-d'),
                        'is_overdue' => $unpaid->due_date?->isPast() ?? false,
                    ] : null,
                ];
            })
            ->values();

        return Inertia::render('Admin/Dashboard/Index', [
            'routers' => $scope->routersQuery()->get(),
            'customerStats' => [
                'ppp_active' => (clone $customerBase)
                    ->where('service_type', 'pppoe')
                    ->where('status', 'active')
                    ->count(),
                'hotspot_active' => $scope->isScoped()
                    ? 0
                    : Customer::query()
                        ->where('service_type', 'hotspot')
                        ->where('status', 'active')
                        ->count(),
                'isolated' => (clone $customerBase)
                    ->where('status', 'isolated')
                    ->count(),
            ],
            'odpSummary' => $scope->odpSummary(),
            'billingActivityLogs' => $billingLogs,
            'isolatedCustomers' => $isolatedCustomers,
            'todayRevenue' => FinancialReportService::applyNetIncomeToTodayRevenue(
                $this->summarizeTodayRevenue($scope),
                $scope,
            ),
            'dailyRevenue' => FinancialReportService::applyNetIncomeToDailyRevenue(
                $this->summarizeDailyRevenue($scope),
                $scope,
            ),
            'dailyExpenses' => FinancialReportService::summarizeDailyExpenses($scope),
            'inventorySummary' => InventoryItem::watchCategorySummaries(),
            'recentInventoryMovements' => InventoryService::recentMovements(5),
            'billingSummary' => [
                'unpaid_count' => (clone $invoiceBase)->where('status', 'unpaid')->count(),
                'unpaid_total' => (float) (clone $invoiceBase)->where('status', 'unpaid')->sum('total_amount'),
                'overdue_count' => (clone $invoiceBase)
                    ->where('status', 'unpaid')
                    ->whereDate('due_date', '<', now()->toDateString())
                    ->count(),
                'pending_deferrals' => (clone $deferralBase)->count(),
            ],
            'routerSummary' => [
                'total' => $scope->routersQuery()->count(),
                'active' => $scope->routersQuery()->where('status', true)->count(),
            ],
        ]);
    }

    public function routers(): Response
    {
        $scope = $this->routerScope();

        return Inertia::render('Admin/Routers/Index', [
            'routers' => $scope->routersQuery()
                ->withCount(['customers', 'packages', 'hotspotVouchers'])
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function customers(): Response
    {
        $scope = $this->routerScope();

        $customers = Customer::query()
            ->where('service_type', 'pppoe');
        $scope->scopeCustomers($customers);

        $customers = $customers
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
                    'portal_email' => $customer->displayPortalEmail(),
                    'service_start_date' => $customer->service_start_date?->format('Y-m-d'),
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

        $packageQuery = Package::query();
        $scope->scopePackages($packageQuery);

        $odpQuery = Odp::withCount('customers');
        if ($scope->isScoped()) {
            $odpQuery->whereHas(
                'customers',
                fn ($query) => $query->where('router_id', $scope->routerId())
            );
        }

        return Inertia::render('Admin/Customers/Index', [
            'customers' => $customers,
            'routers' => $scope->routersQuery()->orderBy('name')->get(),
            'packages' => $packageQuery->orderBy('name')->get(),
            'odps' => $odpQuery->get(),
        ]);
    }

    public function networkMap(): Response
    {
        $scope = $this->routerScope();

        $customerQuery = Customer::with(['odp', 'package', 'router']);
        $scope->scopeCustomers($customerQuery);

        return Inertia::render('Admin/NetworkMap/Index', [
            'odps' => $scope->odpsForNetworkMap(),
            'customers' => $customerQuery->get(),
        ]);
    }

    public function inventory(): Response
    {
        $scope = $this->routerScope();

        $customerQuery = Customer::query()->orderBy('name');
        $scope->scopeCustomers($customerQuery);

        return Inertia::render('Admin/Inventory/Index', [
            'items' => InventoryItem::query()->orderBy('name')->get(),
            'categories' => InventoryItem::CATEGORIES,
            'conditions' => InventoryItem::CONDITIONS,
            'units' => InventoryItem::UNITS,
            'watchCategories' => InventoryItem::watchCategorySummaries(),
            'recentMovements' => InventoryService::recentMovements(),
            'customers' => $customerQuery->get(['id', 'name', 'username']),
        ]);
    }

    public function users(): Response
    {
        $actor = auth()->user();
        abort_unless($actor?->canManageUsers(), 403);

        return Inertia::render('Admin/Users/Index', [
            'staffUsers' => User::query()
                ->whereNotNull('role')
                ->whereDoesntHave('customer')
                ->with('assignedRouter:id,name')
                ->orderBy('name')
                ->get()
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'role_label' => $user->roleLabel(),
                    'role_description' => $user->roleDescription(),
                    'profile_title' => $user->profile_title,
                    'is_active' => (bool) $user->is_active,
                    'assigned_router_id' => $user->assigned_router_id,
                    'assigned_router_name' => $user->assignedRouter?->name,
                    'initials' => $user->initials(),
                    'avatar_url' => $user->avatarUrl(),
                    'created_at' => $user->created_at?->format('d/m/Y H:i'),
                    'updated_at' => $user->updated_at?->format('d/m/Y H:i'),
                ]),
            'roles' => User::roleCatalog(),
            'assignableRoles' => collect(User::assignableRoles($actor))
                ->map(fn (array $meta, string $key) => ['value' => $key, 'label' => $meta['label'], 'description' => $meta['description']])
                ->values()
                ->all(),
            'routers' => Router::orderBy('name')->get(['id', 'name', 'status']),
            'currentUserId' => $actor->id,
        ]);
    }

    public function packages(): Response
    {
        $scope = $this->routerScope();

        $packageQuery = Package::query();
        $scope->scopePackages($packageQuery);

        return Inertia::render('Admin/Packages/Index', [
            'packages' => $packageQuery->orderBy('name')->get(),
            'routers' => $scope->routersQuery()->orderBy('name')->get(['id', 'name', 'host', 'status']),
        ]);
    }

    public function invoices(): Response
    {
        BillingService::repairSplitDeferralInvoices();

        $scope = $this->routerScope();

        $invoiceQuery = Invoice::with(['customer.package', 'customer.router', 'payments'])->orderByDesc('created_at');
        $scope->scopeInvoices($invoiceQuery);

        $deferralQuery = BillingDeferral::with(['customer.package', 'customer.router', 'invoice'])
            ->whereIn('status', ['pending', 'invoiced'])
            ->orderByDesc('created_at')
            ->limit(50);
        $scope->scopeBillingDeferrals($deferralQuery);

        $customerQuery = Customer::with(['package', 'router'])
            ->where('service_type', 'pppoe');
        $scope->scopeCustomers($customerQuery);

        $billingLogs = $scope->filterBillingActivityLogs(
            BillingActivityLog::query()
                ->where('event_type', 'scheduled_invoice')
                ->orderByDesc('created_at')
                ->limit(50)
                ->get()
        );

        $isolationLogs = $scope->filterBillingActivityLogs(
            BillingActivityLog::query()
                ->where('event_type', 'auto_isolation')
                ->orderByDesc('created_at')
                ->limit(50)
                ->get()
        );

        return Inertia::render('Admin/Invoices/Index', [
            'invoices' => BillingService::appendNextBillingToInvoices($invoiceQuery->get()),
            'routers' => $scope->routersQuery()->orderBy('name')->get(['id', 'name', 'status']),
            'customers' => $customerQuery->get(),
            'billingDeferrals' => BillingService::serializeBillingDeferrals($deferralQuery->get()),
            'billingActivityLogs' => $billingLogs,
            'isolationActivityLogs' => $isolationLogs,
            'monthlyRevenue' => $this->summarizeMonthlyRevenue($scope),
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

    public function messaging(): Response
    {
        return Inertia::render('Admin/Messaging/Index', [
            'settings' => Setting::where('group', 'whatsapp')->get(),
            'billingAdminPhone' => SettingService::get('system.billing_admin_phone', ''),
            'templateDefinitions' => MessageTemplateService::definitions(),
            'templateDefaults' => MessageTemplateService::defaults(),
        ]);
    }

    public function profile(): Response
    {
        return Inertia::render('Admin/Profile/Index');
    }

    /**
     * @return array{date: string, label: string, total: float, payment_count: int}
     */
    private function summarizeTodayRevenue(StaffRouterScope $scope): array
    {
        $summary = BillingService::summarizeTodayRevenue();

        if (!$scope->isScoped()) {
            return $summary;
        }

        $paid = Invoice::query()
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereDate('paid_at', now()->toDateString());
        $scope->scopeInvoices($paid);

        return [
            ...$summary,
            'total' => round((float) $paid->sum('total_amount'), 2),
            'payment_count' => $paid->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function summarizeDailyRevenue(StaffRouterScope $scope): array
    {
        $routerId = $scope->routerId();

        return BillingService::summarizeDailyRevenue(
            14,
            null,
            $scope->isScoped()
                ? fn ($query) => $scope->scopeInvoices($query)
                : null,
            $scope->isScoped()
                ? fn ($query) => $query->where('router_id', $routerId)
                : null,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function summarizeMonthlyRevenue(StaffRouterScope $scope): array
    {
        $summary = BillingService::summarizeMonthlyRevenue();

        if (!$scope->isScoped()) {
            return $summary;
        }

        $routerId = $scope->routerId();
        $scopeInvoices = fn ($query) => $query->whereHas(
            'customer',
            fn ($customerQuery) => $customerQuery->where('router_id', $routerId)
        );

        $resummarize = function (string $periodStart) use ($scopeInvoices): array {
            $monthStart = \Carbon\Carbon::createFromFormat('Y-m', $periodStart)->startOfMonth();
            $rangeStart = $monthStart->copy()->startOfDay();
            $rangeEnd = $monthStart->copy()->endOfMonth()->endOfDay();

            $paid = Invoice::query()
                ->where('status', 'paid')
                ->whereNotNull('paid_at')
                ->whereBetween('paid_at', [$rangeStart, $rangeEnd]);
            $scopeInvoices($paid);

            return [
                'period' => $monthStart->format('Y-m'),
                'label' => $monthStart->locale('id')->translatedFormat('M Y'),
                'total' => round((float) $paid->sum('total_amount'), 2),
                'invoice_count' => $paid->count(),
            ];
        };

        $currentMonth = $resummarize($summary['current_month']['period']);
        $previousMonth = $resummarize($summary['previous_month']['period']);
        $series = array_map(
            fn (array $item) => $resummarize($item['period']),
            $summary['series']
        );

        $changePercent = 0.0;
        if ($previousMonth['total'] > 0) {
            $changePercent = round((($currentMonth['total'] - $previousMonth['total']) / $previousMonth['total']) * 100, 1);
        } elseif ($currentMonth['total'] > 0) {
            $changePercent = 100.0;
        }

        return [
            'current_month' => $currentMonth,
            'previous_month' => $previousMonth,
            'change_percent' => $changePercent,
            'series' => $series,
        ];
    }

    public function financeIncome(Request $request): Response
    {
        $scope = $this->routerScope();
        [$from, $to, $routerFilter] = $this->resolveFinanceFilters($request, $scope);

        return Inertia::render('Admin/Finance/Income/Index', [
            'routers' => $scope->routersQuery()->orderBy('name')->get(['id', 'name']),
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'router' => $routerFilter ? (string) $routerFilter : 'all',
            ],
            'report' => FinancialReportService::incomeReport($from, $to, $scope, $routerFilter),
        ]);
    }

    public function financeExpenses(Request $request): Response
    {
        $scope = $this->routerScope();
        [$from, $to, $routerFilter] = $this->resolveFinanceFilters($request, $scope);
        $categoryFilter = $request->query('category', 'all');

        return Inertia::render('Admin/Finance/Expenses/Index', [
            'routers' => $scope->routersQuery()->orderBy('name')->get(['id', 'name']),
            'categories' => FinancialExpense::CATEGORIES,
            'filters' => [
                'from' => $from->toDateString(),
                'to' => $to->toDateString(),
                'router' => $routerFilter ? (string) $routerFilter : 'all',
                'category' => $categoryFilter,
            ],
            'report' => FinancialReportService::expenseReport($from, $to, $scope, $routerFilter, $categoryFilter),
        ]);
    }

    /**
     * @return array{0: \Carbon\Carbon, 1: \Carbon\Carbon, 2: ?int}
     */
    private function resolveFinanceFilters(Request $request, StaffRouterScope $scope): array
    {
        $from = $request->query('from')
            ? \Carbon\Carbon::parse($request->query('from'))->startOfDay()
            : now()->startOfMonth();
        $to = $request->query('to')
            ? \Carbon\Carbon::parse($request->query('to'))->endOfDay()
            : now()->endOfDay();

        $routerFilter = $request->query('router');
        $routerId = ($routerFilter && $routerFilter !== 'all') ? (int) $routerFilter : null;

        if ($scope->isScoped()) {
            $routerId = $scope->routerId();
        } elseif ($routerId) {
            $scope->ensureCanAccessRouter($routerId);
        }

        return [$from, $to, $routerId];
    }
}
