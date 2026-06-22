<?php

namespace App\Services;

use App\Models\BillingActivityLog;
use App\Models\BillingDeferral;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\User;
use App\Services\Router\RouterService;
use App\Services\BrandingService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class BillingService
{
    public const PRORATA_BASE_DAYS = 30;
    public const DEFAULT_GENERATE_DAYS_BEFORE_DUE = 5;

    /**
     * Resolve the date customer service begins for billing purposes.
     */
    public static function resolveServiceStartDate(Customer $customer): Carbon
    {
        if ($customer->service_start_date) {
            return Carbon::parse($customer->service_start_date)->startOfDay();
        }

        if ($customer->created_at) {
            return Carbon::parse($customer->created_at)->startOfDay();
        }

        return Carbon::today()->startOfDay();
    }

    /**
     * Whether prorata billing is enabled in system settings.
     */
    public static function isProrataEnabled(): bool
    {
        return filter_var(
            SettingService::get('system.billing_prorata_enabled', '1'),
            FILTER_VALIDATE_BOOLEAN
        );
    }

    /**
     * Days before due date when scheduled invoice generation runs.
     */
    public static function getGenerateDaysBeforeDue(): int
    {
        $days = (int) SettingService::get(
            'system.billing_generate_days_before',
            (string) self::DEFAULT_GENERATE_DAYS_BEFORE_DUE
        );

        return max(1, min(30, $days));
    }

    public static function isAdminNotifyEnabled(): bool
    {
        return filter_var(
            SettingService::get('system.billing_notify_admin', '1'),
            FILTER_VALIDATE_BOOLEAN
        );
    }

    /**
     * Phone number for admin billing notifications (falls back to company phone).
     */
    public static function getAdminNotifyPhone(): ?string
    {
        $phone = trim((string) SettingService::get('system.billing_admin_phone', ''));
        if ($phone === '') {
            $phone = trim((string) SettingService::get('system.company_phone', ''));
        }

        return $phone !== '' ? $phone : null;
    }

    /**
     * Due date for a customer in a billing period (YYYY-MM).
     */
    public static function resolveDueDateForPeriod(Customer $customer, string $period): Carbon
    {
        return Carbon::createFromFormat('Y-m', $period)
            ->setUnitNoOverflow('day', $customer->billing_date, 'month')
            ->startOfDay();
    }

    /**
     * Determine if an invoice should be generated today for a customer.
     *
     * @return array{period: string, due_date: Carbon}|null
     */
    public static function resolveInvoiceSchedule(Customer $customer, ?Carbon $today = null, ?int $daysBeforeDue = null): ?array
    {
        $today = ($today ?? Carbon::today())->copy()->startOfDay();
        $daysBeforeDue = $daysBeforeDue ?? self::getGenerateDaysBeforeDue();

        $monthCandidates = [
            $today->copy()->startOfMonth(),
            $today->copy()->addMonth()->startOfMonth(),
        ];

        foreach ($monthCandidates as $monthStart) {
            $period = $monthStart->format('Y-m');
            $dueDate = self::resolveDueDateForPeriod($customer, $period);
            $generateOn = $dueDate->copy()->subDays($daysBeforeDue);

            if ($today->gte($generateOn) && $today->lte($dueDate)) {
                return [
                    'period' => $period,
                    'due_date' => $dueDate,
                ];
            }
        }

        return null;
    }

    /**
     * Generate invoices for customers whose billing schedule falls on today's run (H-N before due date).
     */
    public static function generateScheduledInvoices(?Carbon $today = null): int
    {
        $today = ($today ?? Carbon::today())->copy()->startOfDay();
        $daysBeforeDue = self::getGenerateDaysBeforeDue();
        $count = 0;
        $createdInvoices = [];

        $customers = Customer::whereIn('status', ['active', 'isolated'])
            ->where('service_type', 'pppoe')
            ->with('package')
            ->get();

        foreach ($customers as $customer) {
            if (!$customer->package) {
                continue;
            }

            $schedule = self::resolveInvoiceSchedule($customer, $today, $daysBeforeDue);
            if ($schedule === null) {
                continue;
            }

            if (Invoice::where('customer_id', $customer->id)
                ->where('billing_period', $schedule['period'])
                ->exists()) {
                continue;
            }

            if (self::isPeriodDeferredForCustomer($customer, $schedule['period'])) {
                continue;
            }

            $created = self::createInvoiceForCustomer($customer, $schedule['period'], $schedule['due_date']);
            if ($created !== null) {
                $count++;
                $createdInvoices[] = $created;
            }
        }

        self::recordScheduledInvoiceRun($today, $daysBeforeDue, $count, $createdInvoices);

        $deferralCount = self::processScheduledDeferrals($today);
        if ($deferralCount > 0) {
            Log::info("Billing deferral run completed.", [
                'run_date' => $today->toDateString(),
                'invoice_count' => $deferralCount,
            ]);
        }

        return $count;
    }

    /**
     * Persist activity log and optionally notify admin via WhatsApp.
     *
     * @param array<int, array<string, mixed>> $createdInvoices
     */
    public static function recordScheduledInvoiceRun(Carbon $runDate, int $daysBeforeDue, int $count, array $createdInvoices): BillingActivityLog
    {
        $totalAmount = array_sum(array_column($createdInvoices, 'total_amount'));
        $brandName = BrandingService::companyName();
        $dateLabel = $runDate->format('d-m-Y');

        if ($count === 0) {
            $message = "Generate tagihan otomatis (H-{$daysBeforeDue}) pada {$dateLabel}: tidak ada invoice baru.";
        } else {
            $message = "Generate tagihan otomatis (H-{$daysBeforeDue}) pada {$dateLabel}: {$count} invoice baru, total Rp " . number_format($totalAmount, 0, ',', '.') . '.';
        }

        $adminNotified = false;
        $adminPhone = null;

        if ($count > 0 && self::isAdminNotifyEnabled()) {
            $adminPhone = self::getAdminNotifyPhone();
            if ($adminPhone) {
                $waMessage = self::buildAdminScheduledInvoiceMessage($brandName, $runDate, $daysBeforeDue, $createdInvoices, $totalAmount);
                try {
                    if (class_exists(\App\Services\WhatsAppService::class)) {
                        $adminNotified = \App\Services\WhatsAppService::sendText($adminPhone, $waMessage);
                    }
                } catch (\Exception $e) {
                    Log::error('Failed to send admin billing notification: ' . $e->getMessage());
                }
            }
        }

        Log::info('Billing scheduled invoice run completed.', [
            'run_date' => $runDate->toDateString(),
            'days_before_due' => $daysBeforeDue,
            'invoice_count' => $count,
            'total_amount' => $totalAmount,
            'admin_notified' => $adminNotified,
        ]);

        return BillingActivityLog::create([
            'event_type' => 'scheduled_invoice',
            'message' => $message,
            'meta' => [
                'days_before_due' => $daysBeforeDue,
                'invoice_count' => $count,
                'total_amount' => $totalAmount,
                'invoices' => $createdInvoices,
                'admin_notified' => $adminNotified,
                'admin_phone' => $adminPhone,
            ],
            'run_date' => $runDate->toDateString(),
        ]);
    }

    /**
     * @param array<int, array<string, mixed>> $createdInvoices
     */
    public static function buildAdminScheduledInvoiceMessage(
        string $brandName,
        Carbon $runDate,
        int $daysBeforeDue,
        array $createdInvoices,
        float $totalAmount
    ): string {
        $invoiceLines = [];

        foreach (array_slice($createdInvoices, 0, 10) as $invoice) {
            $invoiceLines[] = '- *' . $invoice['invoice_number'] . '* — ' . $invoice['customer_name']
                . ' (' . $invoice['billing_period'] . ') ' . self::formatWhatsAppMoney((float) $invoice['total_amount']);
        }

        if (count($createdInvoices) > 10) {
            $invoiceLines[] = '- ... dan ' . (count($createdInvoices) - 10) . ' invoice lainnya';
        }

        return MessageTemplateService::render('whatsapp.template.admin_scheduler', [
            'brand_name' => $brandName,
            'run_date' => $runDate->format('d-m-Y'),
            'days_before' => (string) $daysBeforeDue,
            'invoice_count' => (string) count($createdInvoices),
            'invoice_list' => implode("\n", $invoiceLines),
            'total' => self::formatWhatsAppMoney($totalAmount),
        ]);
    }

    /**
     * Create a single invoice for a customer.
     *
     * @return array{invoice_number: string, customer_name: string, total_amount: float, billing_period: string, due_date: string}|null
     */
    public static function createInvoiceForCustomer(Customer $customer, string $period, Carbon $dueDate): ?array
    {
        if (!$customer->package) {
            return null;
        }

        $billing = self::calculateInvoiceAmount($customer, $period, (float) $customer->package->price);
        if ($billing === null) {
            return null;
        }

        $result = null;

        DB::transaction(function () use ($customer, $period, $dueDate, $billing, &$result) {
            $amount = $billing['amount'];
            $taxRate = (float) SettingService::get('system.tax_rate', 0);
            $tax = round($amount * $taxRate, 2);
            $total = round($amount + $tax, 2);

            $invNumber = 'INV-' . str_replace('-', '', $period) . '-' . str_pad($customer->id, 4, '0', STR_PAD_LEFT) . '-' . strtoupper(bin2hex(random_bytes(2)));

            Invoice::create([
                'customer_id' => $customer->id,
                'invoice_number' => $invNumber,
                'billing_period' => $period,
                'amount' => $amount,
                'days_billed' => $billing['days_billed'],
                'is_prorated' => $billing['is_prorated'],
                'tax' => $tax,
                'total_amount' => $total,
                'due_date' => $dueDate,
                'status' => 'unpaid',
            ]);

            try {
                $dueDateFormatted = $dueDate->format('d-m-Y');
                $message = MessageTemplateService::renderWithPaymentInstructions('whatsapp.template.invoice_new', [
                    'customer_name' => $customer->name,
                    'brand_name' => BrandingService::companyName(),
                    'period' => $period,
                    'invoice_number' => $invNumber,
                    'service_type' => strtoupper($customer->service_type),
                    'username' => $customer->username,
                    'subtotal' => self::formatWhatsAppMoney($amount),
                    'prorata_line' => self::buildProrataLine($billing['is_prorated'], (int) $billing['days_billed']),
                    'total' => self::formatWhatsAppMoney($total),
                    'due_date' => $dueDateFormatted,
                ]);

                if (class_exists(\App\Services\WhatsAppService::class)) {
                    \App\Services\WhatsAppService::sendText($customer->phone_number, $message);
                }
            } catch (\Exception $waEx) {
                Log::error("Failed to send WhatsApp billing notification for {$customer->username}: " . $waEx->getMessage());
            }

            $result = [
                'invoice_number' => $invNumber,
                'customer_name' => $customer->name,
                'total_amount' => $total,
                'billing_period' => $period,
                'due_date' => $dueDate->toDateString(),
            ];
        });

        return $result;
    }

    /**
     * Calculate invoice subtotal for a customer and billing period.
     *
     * Prorata (bulan pertama): hari ditagih = tgl mulai layanan s/d tgl jatuh tempo (billing_date) periode tersebut.
     *
     * @return array{amount: float, days_billed: int, is_prorated: bool}|null Null when customer is not billable in period.
     */
    public static function calculateInvoiceAmount(Customer $customer, string $period, float $monthlyPrice): ?array
    {
        $periodStart = Carbon::createFromFormat('Y-m', $period)->startOfMonth()->startOfDay();
        $periodEnd = Carbon::createFromFormat('Y-m', $period)->endOfMonth()->startOfDay();
        $serviceStart = self::resolveServiceStartDate($customer);

        if ($serviceStart->gt($periodEnd)) {
            return null;
        }

        if (!self::isProrataEnabled() || $serviceStart->lte($periodStart)) {
            return [
                'amount' => round($monthlyPrice, 2),
                'days_billed' => self::PRORATA_BASE_DAYS,
                'is_prorated' => false,
            ];
        }

        $dueDate = self::resolveDueDateForPeriod($customer, $period);
        $activeStart = $serviceStart->greaterThan($periodStart) ? $serviceStart : $periodStart;
        $activeEnd = $dueDate->greaterThanOrEqualTo($activeStart) ? $dueDate : $periodEnd;

        $daysActive = $activeStart->diffInDays($activeEnd) + 1;
        $daysActive = (int) min(max($daysActive, 1), self::PRORATA_BASE_DAYS);

        $amount = round(($monthlyPrice / self::PRORATA_BASE_DAYS) * $daysActive, 2);

        return [
            'amount' => $amount,
            'days_billed' => $daysActive,
            'is_prorated' => true,
        ];
    }

    /**
     * Preview the next billing cycle after a paid invoice.
     *
     * @return array<string, mixed>|null
     */
    public static function resolveNextBillingPreview(Invoice $invoice): ?array
    {
        $customer = $invoice->customer;
        if (!$customer || !$customer->package || $invoice->status !== 'paid') {
            return null;
        }

        if (empty($invoice->billing_period)) {
            return null;
        }

        $nextPeriod = Carbon::createFromFormat('Y-m', $invoice->billing_period)
            ->addMonth()
            ->format('Y-m');

        $existingNext = Invoice::where('customer_id', $customer->id)
            ->where('billing_period', $nextPeriod)
            ->first();

        if ($existingNext) {
            return [
                'period' => $nextPeriod,
                'due_date' => $existingNext->due_date?->format('Y-m-d'),
                'amount' => (float) $existingNext->amount,
                'tax' => (float) $existingNext->tax,
                'total_amount' => (float) $existingNext->total_amount,
                'is_prorated' => (bool) $existingNext->is_prorated,
                'days_billed' => (int) $existingNext->days_billed,
                'already_generated' => true,
                'invoice_number' => $existingNext->invoice_number,
                'status' => $existingNext->status,
            ];
        }

        $billing = self::calculateInvoiceAmount($customer, $nextPeriod, (float) $customer->package->price);
        if ($billing === null) {
            return null;
        }

        $dueDate = self::resolveDueDateForPeriod($customer, $nextPeriod);
        $taxRate = (float) SettingService::get('system.tax_rate', 0);
        $tax = round($billing['amount'] * $taxRate, 2);
        $total = round($billing['amount'] + $tax, 2);

        return [
            'period' => $nextPeriod,
            'due_date' => $dueDate->format('Y-m-d'),
            'amount' => $billing['amount'],
            'tax' => $tax,
            'total_amount' => $total,
            'is_prorated' => $billing['is_prorated'],
            'days_billed' => $billing['days_billed'],
            'already_generated' => false,
            'invoice_number' => null,
            'status' => 'preview',
        ];
    }

    /**
     * @param \Illuminate\Support\Collection<int, Invoice>|\Illuminate\Database\Eloquent\Collection<int, Invoice> $invoices
     * @return array<int, array<string, mixed>>
     */
    public static function appendNextBillingToInvoices($invoices): array
    {
        $customerIds = $invoices->pluck('customer_id')->unique()->filter();
        $pendingDeferralsByCustomer = BillingDeferral::query()
            ->whereIn('customer_id', $customerIds)
            ->where('status', 'pending')
            ->get()
            ->groupBy('customer_id');

        return $invoices->map(function (Invoice $invoice) use ($pendingDeferralsByCustomer) {
            $data = $invoice->toArray();
            if ($invoice->status === 'paid') {
                $data['next_billing'] = self::resolveNextBillingPreview($invoice);
            }

            if ($invoice->status === 'canceled' && $invoice->customer_id) {
                $deferrals = $pendingDeferralsByCustomer->get($invoice->customer_id, collect());
                $pendingDeferral = $deferrals->first(
                    fn (BillingDeferral $deferral) => in_array($invoice->billing_period, $deferral->periods ?? [], true)
                );

                if ($pendingDeferral) {
                    $data['is_deferred_by_pending'] = true;
                    $data['deferred_combined_due_date'] = $pendingDeferral->combined_due_date?->format('Y-m-d');
                    $data['deferred_accumulated_generate_on'] = $pendingDeferral->combined_due_date
                        ? Carbon::parse($pendingDeferral->combined_due_date)
                            ->subDays(self::getGenerateDaysBeforeDue())
                            ->format('Y-m-d')
                        : null;
                }
            }

            return $data;
        })->all();
    }

    /**
     * Monthly revenue summary from paid invoices (paid_at).
     *
     * @return array{
     *     current_month: array{period: string, label: string, total: float, invoice_count: int},
     *     previous_month: array{period: string, label: string, total: float, invoice_count: int},
     *     change_percent: float,
     *     series: array<int, array{period: string, label: string, total: float, invoice_count: int}>
     * }
     */
    public static function summarizeMonthlyRevenue(int $months = 6, ?Carbon $today = null): array
    {
        $today = ($today ?? Carbon::today())->copy()->startOfDay()->locale('id');
        $months = max(2, min(12, $months));

        $summarizeMonth = function (Carbon $monthStart): array {
            $rangeStart = $monthStart->copy()->startOfDay();
            $rangeEnd = $monthStart->copy()->endOfMonth()->endOfDay();

            $paid = Invoice::query()
                ->where('status', 'paid')
                ->whereNotNull('paid_at')
                ->whereBetween('paid_at', [$rangeStart, $rangeEnd])
                ->get(['total_amount']);

            return [
                'period' => $monthStart->format('Y-m'),
                'label' => $monthStart->translatedFormat('M Y'),
                'total' => round((float) $paid->sum('total_amount'), 2),
                'invoice_count' => $paid->count(),
            ];
        };

        $currentMonth = $summarizeMonth($today->copy()->startOfMonth());
        $previousMonth = $summarizeMonth($today->copy()->subMonth()->startOfMonth());

        $series = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $series[] = $summarizeMonth($today->copy()->subMonths($i)->startOfMonth());
        }

        $changePercent = 0.0;
        if ($previousMonth['total'] > 0) {
            $changePercent = round(
                (($currentMonth['total'] - $previousMonth['total']) / $previousMonth['total']) * 100,
                1
            );
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

    /**
     * Today's revenue from paid invoices (paid_at).
     *
     * @return array{date: string, label: string, total: float, payment_count: int}
     */
    public static function summarizeTodayRevenue(?Carbon $today = null): array
    {
        $today = ($today ?? Carbon::today())->copy()->startOfDay()->locale('id');
        $rangeStart = $today->copy()->startOfDay();
        $rangeEnd = $today->copy()->endOfDay();

        $paid = Invoice::query()
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$rangeStart, $rangeEnd])
            ->get(['total_amount']);

        return [
            'date' => $today->toDateString(),
            'label' => $today->translatedFormat('l, d M Y'),
            'total' => round((float) $paid->sum('total_amount'), 2),
            'payment_count' => $paid->count(),
        ];
    }

    /**
     * Generate invoices for all eligible PPPoE customers in a billing period (manual / CLI).
     *
     * @param string|null $period Format YYYY-MM (e.g., "2026-06"). Defaults to current month.
     * @return int Number of generated invoices.
     */
    public static function generateInvoices(?string $period = null): int
    {
        $period = $period ?? Carbon::now()->format('Y-m');
        $count = 0;

        $customers = Customer::whereIn('status', ['active', 'isolated'])
            ->where('service_type', 'pppoe')
            ->with('package')
            ->get();

        foreach ($customers as $customer) {
            if (!$customer->package) {
                continue;
            }

            if (Invoice::where('customer_id', $customer->id)
                ->where('billing_period', $period)
                ->exists()) {
                continue;
            }

            if (self::isPeriodDeferredForCustomer($customer, $period)) {
                continue;
            }

            $dueDate = self::resolveDueDateForPeriod($customer, $period);
            if ($dueDate->isPast() || $dueDate->isToday()) {
                $dueDate = Carbon::now()->addDays(7)->startOfDay();
            }

            if (self::createInvoiceForCustomer($customer, $period, $dueDate) !== null) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * Generate a single invoice for one PPPoE customer (manual action from admin UI).
     *
     * @return array{invoice_number: string, customer_name: string, total_amount: float, billing_period: string, due_date: string}
     */
    public static function generateInvoiceForCustomer(
        Customer $customer,
        ?string $period = null,
        int $dueExtensionDays = 7
    ): array {
        $customer->loadMissing('package');

        if ($customer->service_type !== 'pppoe') {
            throw new \InvalidArgumentException('Hanya pelanggan PPPoE yang dapat digenerate tagihannya.');
        }

        if (!in_array($customer->status, ['active', 'isolated'], true)) {
            throw new \InvalidArgumentException('Status pelanggan harus aktif atau isolir.');
        }

        if (!$customer->package) {
            throw new \InvalidArgumentException('Pelanggan belum memiliki paket internet.');
        }

        if (!in_array($dueExtensionDays, [3, 5, 7], true)) {
            throw new \InvalidArgumentException('Perpanjangan jatuh tempo harus 3, 5, atau 7 hari.');
        }

        $dueDate = null;

        if ($period === null) {
            $schedule = self::resolveInvoiceSchedule($customer);
            if ($schedule !== null) {
                $period = $schedule['period'];
                $dueDate = $schedule['due_date'];
            } else {
                $period = Carbon::now()->format('Y-m');
            }
        }

        if (Invoice::where('customer_id', $customer->id)
            ->where('billing_period', $period)
            ->exists()) {
            throw new \InvalidArgumentException("Invoice periode {$period} sudah ada untuk pelanggan ini.");
        }

        if (self::isPeriodDeferredForCustomer($customer, $period)) {
            throw new \InvalidArgumentException("Periode {$period} sedang ditunda (penundaan tagihan aktif).");
        }

        if ($dueDate === null) {
            $dueDate = self::resolveDueDateForPeriod($customer, $period);
        }

        if ($dueDate->isPast() || $dueDate->isToday()) {
            $dueDate = Carbon::now()->addDays($dueExtensionDays)->startOfDay();
        }

        $created = self::createInvoiceForCustomer($customer, $period, $dueDate);
        if ($created === null) {
            throw new \RuntimeException('Gagal membuat invoice. Periksa tanggal mulai layanan dan paket pelanggan.');
        }

        return $created;
    }

    /**
     * Only customers whose package name starts with a digit are auto-isolated.
     */
    public static function isCustomerEligibleForAutoIsolation(Customer $customer): bool
    {
        $customer->loadMissing('package');

        $packageName = trim((string) ($customer->package?->name ?? ''));

        if ($packageName === '') {
            return false;
        }

        return preg_match('/^\d/u', $packageName) === 1;
    }

    /**
     * Check for past due invoices and automatically isolate unpaid customers.
     *
     * @return int Number of isolated customers.
     */
    public static function isolatePastDueCustomers(): int
    {
        $count = 0;
        $today = Carbon::today();

        $invoices = Invoice::where('status', 'unpaid')
            ->where('due_date', '<', $today)
            ->whereHas('customer', function ($query) {
                $query->where('status', 'active');
            })
            ->with(['customer', 'customer.router', 'customer.package'])
            ->get();

        foreach ($invoices as $invoice) {
            $customer = $invoice->customer;

            if (!$customer || !self::isCustomerEligibleForAutoIsolation($customer)) {
                continue;
            }

            if (self::customerHasPendingDeferral($customer)) {
                continue;
            }

            DB::beginTransaction();
            try {
                $customer->update(['status' => 'isolated']);

                $router = $customer->router;
                $isolirProfile = SettingService::get('mikrotik.isolir_profile', 'ISOLIR');

                if ($router && $router->status) {
                    $connector = RouterService::getConnector($router);

                    $success = $connector->updateSecret($customer->username, [
                        'profile' => $isolirProfile
                    ]);

                    if ($success) {
                        $connector->kickActiveConnection($customer->username);
                        Log::info("Customer {$customer->username} successfully isolated on router {$router->name}");
                    } else {
                        Log::warning("Failed to update PPPoE profile for {$customer->username} on router {$router->name}");
                    }
                }

                try {
                    $message = MessageTemplateService::renderWithPaymentInstructions('whatsapp.template.isolation', [
                        'customer_name' => $customer->name,
                        'brand_name' => BrandingService::companyName(),
                        'username' => $customer->username,
                        'invoice_number' => $invoice->invoice_number,
                        'total' => self::formatWhatsAppMoney((float) $invoice->total_amount),
                        'due_date' => $invoice->due_date->format('d-m-Y'),
                    ]);
                    if (class_exists(\App\Services\WhatsAppService::class)) {
                        \App\Services\WhatsAppService::sendText($customer->phone_number, $message);
                    }
                } catch (Exception $waEx) {
                    Log::error("Failed to send WhatsApp isolation alert to {$customer->phone_number}: " . $waEx->getMessage());
                }

                DB::commit();
                $count++;
            } catch (Exception $e) {
                DB::rollBack();
                Log::error("Failed to isolate customer {$customer->username}: " . $e->getMessage());
            }
        }

        return $count;
    }

    /**
     * Whether the customer still has unpaid invoices past due date.
     */
    public static function customerHasPastDueUnpaidInvoices(Customer $customer, ?int $excludeInvoiceId = null): bool
    {
        $query = Invoice::where('customer_id', $customer->id)
            ->where('status', 'unpaid')
            ->where('due_date', '<', Carbon::today());

        if ($excludeInvoiceId !== null) {
            $query->where('id', '!=', $excludeInvoiceId);
        }

        return $query->exists();
    }

    /**
     * Restore package profile on MikroTik and disconnect active PPP session.
     */
    public static function reactivateCustomerOnRouter(Customer $customer): bool
    {
        $customer->loadMissing(['router', 'package']);

        if (!$customer->package) {
            return false;
        }

        if (in_array($customer->status, ['isolated', 'inactive', 'suspended'], true)) {
            $customer->update(['status' => 'active']);
        }

        $router = $customer->router;
        if (!$router) {
            return false;
        }

        try {
            $connector = RouterService::getConnector($router);

            $success = $connector->updateSecret($customer->username, [
                'profile' => $customer->package->mikrotik_profile,
                'disabled' => 'no',
            ]);

            if ($success) {
                $connector->kickActiveConnection($customer->username);
                Log::info("Customer {$customer->username} successfully reactivated on router {$router->name}");
            } else {
                Log::warning("Failed to restore PPPoE profile for {$customer->username} on router {$router->name}");
            }

            return $success;
        } catch (Exception $e) {
            Log::error("Failed to reactivate customer {$customer->username} on router: " . $e->getMessage());

            return false;
        }
    }

    /**
     * Process invoice payment, mark it paid, and reactivate the customer if isolated.
     */
    public static function processPaidInvoice(Invoice $invoice, string $gateway, string $reference, float $amountPaid, float $fee = 0, ?array $payload = null): bool
    {
        if ($invoice->status === 'paid') {
            return true;
        }

        DB::beginTransaction();
        try {
            Payment::create([
                'invoice_id' => $invoice->id,
                'gateway_name' => $gateway,
                'reference_number' => $reference,
                'payment_method' => $payload['payment_method'] ?? 'unknown',
                'amount_paid' => $amountPaid,
                'fee_charged' => $fee,
                'payload_response' => $payload,
            ]);

            $invoice->update([
                'status' => 'paid',
                'paid_at' => Carbon::now(),
            ]);

            $customer = $invoice->customer;
            if ($customer && !self::customerHasPastDueUnpaidInvoices($customer, $invoice->id)) {
                self::reactivateCustomerOnRouter($customer);
            }

            try {
                $message = self::buildPaidInvoiceWhatsAppMessage($invoice, includeReactivationNote: true);
                if ($message && class_exists(\App\Services\WhatsAppService::class)) {
                    \App\Services\WhatsAppService::sendText($customer->phone_number, $message);
                }
            } catch (Exception $waEx) {
                Log::error("Failed to send WhatsApp payment receipt: " . $waEx->getMessage());
            }

            DB::commit();
            return true;
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Failed to process payment for invoice {$invoice->invoice_number}: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Reverse an admin manual payment (undo accidental Bayar Manual).
     *
     * @throws Exception When invoice is not eligible for reversal.
     */
    public static function reverseManualPayment(Invoice $invoice): bool
    {
        if ($invoice->status !== 'paid') {
            throw new Exception('Invoice belum lunas, tidak ada pembayaran yang perlu dibatalkan.');
        }

        $invoice->load(['customer.package', 'customer.router', 'payments']);

        if (!$invoice->payments()->where('gateway_name', 'manual')->exists()) {
            throw new Exception('Hanya pembayaran manual admin yang dapat dibatalkan. Pembayaran gateway harus direfund melalui provider.');
        }

        DB::beginTransaction();
        try {
            $invoice->payments()->delete();
            $invoice->update([
                'status' => 'unpaid',
                'paid_at' => null,
            ]);

            $customer = $invoice->customer;
            $dueDate = $invoice->due_date ? Carbon::parse($invoice->due_date)->startOfDay() : null;

            if (
                $customer
                && self::isCustomerEligibleForAutoIsolation($customer)
                && $dueDate
                && $dueDate->lt(Carbon::today())
                && $customer->status === 'active'
            ) {
                $customer->update(['status' => 'isolated']);

                $router = $customer->router;
                $isolirProfile = SettingService::get('mikrotik.isolir_profile', 'ISOLIR');

                if ($router && $router->status) {
                    $connector = RouterService::getConnector($router);
                    $success = $connector->updateSecret($customer->username, [
                        'profile' => $isolirProfile,
                    ]);

                    if ($success) {
                        $connector->kickActiveConnection($customer->username);
                    }
                }
            }

            DB::commit();
            Log::info("Manual payment reversed for invoice {$invoice->invoice_number}");

            return true;
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Resolve anchor billing period for a deferral (oldest unpaid, next after last paid, or current month).
     */
    public static function resolveDeferralAnchorPeriod(Customer $customer, ?Carbon $today = null): string
    {
        $today = ($today ?? Carbon::today())->copy()->startOfDay();

        $unpaidInvoices = Invoice::query()
            ->where('customer_id', $customer->id)
            ->where('status', 'unpaid')
            ->orderBy('billing_period')
            ->get();

        foreach ($unpaidInvoices as $invoice) {
            if ($invoice->is_accumulated) {
                continue;
            }

            $period = self::normalizeSingleBillingPeriod($invoice->billing_period);
            if ($period !== null) {
                return $period;
            }
        }

        $lastPaid = Invoice::query()
            ->where('customer_id', $customer->id)
            ->where('status', 'paid')
            ->orderByDesc('billing_period')
            ->first();

        if ($lastPaid) {
            $latestPeriod = self::resolveLatestMonthFromInvoice($lastPaid);
            if ($latestPeriod !== null) {
                return self::addMonthsToPeriod($latestPeriod, 1);
            }
        }

        return $today->format('Y-m');
    }

    /**
     * Resolve billing periods included in a deferral.
     *
     * 1 month: anchor period only.
     * 2 months: bulan anchor + bulan berikutnya.
     *
     * @return array<int, string>
     */
    public static function resolveDeferralPeriods(Customer $customer, int $monthsCount, ?Carbon $today = null): array
    {
        $monthsCount = max(1, min(2, $monthsCount));
        $anchor = self::resolveDeferralAnchorPeriod($customer, $today);

        if ($monthsCount === 1) {
            return [$anchor];
        }

        return [$anchor, self::addMonthsToPeriod($anchor, 1)];
    }

    private static function normalizeSingleBillingPeriod(?string $period): ?string
    {
        if (!$period || !preg_match('/^\d{4}-\d{2}$/', $period)) {
            return null;
        }

        return $period;
    }

    private static function resolveLatestMonthFromInvoice(Invoice $invoice): ?string
    {
        if (!empty($invoice->accumulated_periods) && is_array($invoice->accumulated_periods)) {
            $periods = $invoice->accumulated_periods;
            $last = end($periods);

            return self::normalizeSingleBillingPeriod(is_string($last) ? $last : null);
        }

        if ($invoice->billing_period && str_contains($invoice->billing_period, '+')) {
            $parts = explode('+', $invoice->billing_period);
            $last = trim((string) end($parts));

            return self::normalizeSingleBillingPeriod($last);
        }

        return self::normalizeSingleBillingPeriod($invoice->billing_period);
    }

    private static function addMonthsToPeriod(string $period, int $months): string
    {
        return Carbon::createFromFormat('Y-m', $period)
            ->addMonths($months)
            ->format('Y-m');
    }

    private static function parseBillingPeriodMonth(string $period): Carbon
    {
        $normalized = self::normalizeSingleBillingPeriod($period);
        if ($normalized === null) {
            throw new \InvalidArgumentException("Format periode tagihan tidak valid: {$period}");
        }

        return Carbon::createFromFormat('Y-m', $normalized)->startOfMonth();
    }

    /**
     * @return array<string, mixed>
     */
    public static function previewBillingDeferral(Customer $customer, int $monthsCount, ?Carbon $today = null): array
    {
        if (!$customer->package) {
            throw new \RuntimeException('Pelanggan belum memiliki paket internet.');
        }

        $periods = self::resolveDeferralPeriods($customer, $monthsCount, $today);
        $accumulated = self::calculateAccumulatedBilling($customer, $periods);

        if ($accumulated['lines'] === []) {
            throw new \RuntimeException('Tidak ada periode tagihan yang dapat ditunda untuk pelanggan ini.');
        }

        return [
            'anchor_period' => self::resolveDeferralAnchorPeriod($customer, $today),
            'months_count' => max(1, min(2, $monthsCount)),
            'periods' => $periods,
            'period_labels' => array_map(
                fn (string $period) => self::parseBillingPeriodMonth($period)->translatedFormat('F Y'),
                $periods
            ),
            'amount' => $accumulated['amount'],
            'tax' => $accumulated['tax'],
            'total_amount' => $accumulated['total_amount'],
            'lines' => $accumulated['lines'],
        ];
    }

    public static function createBillingDeferral(
        Customer $customer,
        int $monthsCount,
        Carbon $combinedDueDate,
        ?User $createdBy = null,
        ?string $notes = null
    ): BillingDeferral {
        if ($customer->service_type !== 'pppoe') {
            throw new \RuntimeException('Penundaan tagihan hanya untuk pelanggan PPPoE.');
        }

        if (!$customer->package) {
            throw new \RuntimeException('Pelanggan belum memiliki paket internet.');
        }

        if (self::customerHasPendingDeferral($customer)) {
            throw new \RuntimeException('Pelanggan masih memiliki penundaan tagihan aktif.');
        }

        $monthsCount = max(1, min(2, $monthsCount));
        $combinedDueDate = $combinedDueDate->copy()->startOfDay();

        if ($combinedDueDate->lte(Carbon::today())) {
            throw new \RuntimeException('Tanggal jatuh tempo gabungan harus setelah hari ini.');
        }

        $preview = self::previewBillingDeferral($customer, $monthsCount);
        $periods = $preview['periods'];

        return DB::transaction(function () use ($customer, $monthsCount, $combinedDueDate, $createdBy, $notes, $periods) {
            foreach ($periods as $period) {
                Invoice::query()
                    ->where('customer_id', $customer->id)
                    ->where('billing_period', $period)
                    ->where('status', 'unpaid')
                    ->update(['status' => 'canceled']);
            }

            $deferral = BillingDeferral::create([
                'customer_id' => $customer->id,
                'created_by' => $createdBy?->id,
                'months_count' => $monthsCount,
                'periods' => $periods,
                'combined_due_date' => $combinedDueDate,
                'status' => 'pending',
                'notes' => $notes,
            ]);

            $customer->refresh();
            self::reactivateCustomerOnRouter($customer);

            return $deferral;
        });
    }

    public static function cancelBillingDeferral(BillingDeferral $deferral): array
    {
        if ($deferral->status !== 'pending') {
            throw new \RuntimeException('Hanya penundaan berstatus pending yang dapat dibatalkan.');
        }

        $deferral->loadMissing(['customer.package']);
        $customer = $deferral->customer;

        if (!$customer || !$customer->package) {
            throw new \RuntimeException('Pelanggan atau paket tidak ditemukan untuk memulihkan tagihan.');
        }

        $restoredCount = 0;
        $createdCount = 0;

        $periods = $deferral->periods ?? [];

        DB::transaction(function () use ($deferral, $customer, $periods, &$restoredCount, &$createdCount): void {
            $result = self::restoreInvoicesForDeferralPeriods($customer, $periods);
            $restoredCount = $result['restored_count'];
            $createdCount = $result['created_count'];

            $deferral->update(['status' => 'cancelled']);
        });

        return [
            'restored_count' => $restoredCount,
            'created_count' => $createdCount,
            'accumulated_count' => 0,
        ];
    }

    /**
     * Merge split per-period invoices into one accumulated invoice (deferral repair).
     */
    public static function repairSplitDeferralInvoices(): int
    {
        $count = 0;

        $customerIds = Invoice::query()
            ->where('status', 'unpaid')
            ->where('is_accumulated', false)
            ->select('customer_id')
            ->groupBy('customer_id')
            ->havingRaw('COUNT(*) >= 2')
            ->pluck('customer_id');

        foreach ($customerIds as $customerId) {
            $customer = Customer::with('package')->find($customerId);
            if (!$customer || !$customer->package) {
                continue;
            }

            $unpaidPeriods = Invoice::query()
                ->where('customer_id', $customerId)
                ->where('status', 'unpaid')
                ->where('is_accumulated', false)
                ->pluck('billing_period')
                ->sort()
                ->values()
                ->all();

            $deferral = BillingDeferral::query()
                ->where('customer_id', $customerId)
                ->whereIn('status', ['cancelled', 'pending', 'invoiced'])
                ->orderByDesc('created_at')
                ->get()
                ->first(function (BillingDeferral $item) use ($unpaidPeriods) {
                    $periods = $item->periods ?? [];
                    if (count($periods) <= 1) {
                        return false;
                    }

                    return count(array_intersect($periods, $unpaidPeriods)) === count($unpaidPeriods);
                });

            if (!$deferral) {
                continue;
            }

            $dueDate = Carbon::parse($deferral->combined_due_date)->startOfDay();
            if ($dueDate->lte(Carbon::today())) {
                $dueDate = Carbon::now()->addDays(7)->startOfDay();
            }

            try {
                self::consolidatePeriodInvoices(
                    $customer,
                    $deferral->periods ?? $unpaidPeriods,
                    $dueDate,
                    $deferral->status === 'pending' ? $deferral : null
                );
                $count++;
            } catch (\Exception $e) {
                Log::warning("repairSplitDeferralInvoices failed for customer {$customerId}: " . $e->getMessage());
            }
        }

        return $count;
    }

    /**
     * Cancel open individual invoices and issue one accumulated invoice for the given periods.
     */
    public static function consolidatePeriodInvoices(
        Customer $customer,
        array $periods,
        Carbon $dueDate,
        ?BillingDeferral $deferral = null
    ): Invoice {
        $customer->loadMissing('package');

        if (!$customer->package) {
            throw new \RuntimeException('Pelanggan belum memiliki paket internet.');
        }

        $periods = array_values(array_unique($periods));
        sort($periods);

        if ($periods === []) {
            throw new \RuntimeException('Tidak ada periode tagihan untuk digabungkan.');
        }

        $billingPeriod = count($periods) === 1
            ? $periods[0]
            : ($periods[0] . '+' . $periods[array_key_last($periods)]);

        $existingAccumulated = Invoice::query()
            ->where('customer_id', $customer->id)
            ->where('status', 'unpaid')
            ->where('is_accumulated', true)
            ->get()
            ->first(function (Invoice $invoice) use ($periods, $billingPeriod) {
                if ($invoice->billing_period === $billingPeriod) {
                    return true;
                }

                return ($invoice->accumulated_periods ?? []) === $periods;
            });

        if ($existingAccumulated) {
            self::cancelUnpaidIndividualInvoicesForPeriods($customer, $periods);

            if ($deferral && $deferral->status === 'pending') {
                $deferral->update([
                    'status' => 'invoiced',
                    'invoice_id' => $existingAccumulated->id,
                ]);
            }

            return $existingAccumulated->fresh();
        }

        $accumulated = self::calculateAccumulatedBilling($customer, $periods);
        if ($accumulated['lines'] === []) {
            throw new \RuntimeException('Tidak ada tagihan yang dapat digabungkan.');
        }

        $invoice = null;

        DB::transaction(function () use ($customer, $periods, $accumulated, $dueDate, $billingPeriod, $deferral, &$invoice) {
            self::cancelUnpaidIndividualInvoicesForPeriods($customer, $periods);

            $invNumber = 'INV-ACC-' . str_replace('-', '', $periods[0])
                . (count($periods) > 1 ? str_replace('-', '', $periods[array_key_last($periods)]) : '')
                . '-' . str_pad((string) $customer->id, 4, '0', STR_PAD_LEFT)
                . '-' . strtoupper(bin2hex(random_bytes(2)));

            $invoice = Invoice::create([
                'customer_id' => $customer->id,
                'invoice_number' => $invNumber,
                'billing_period' => $billingPeriod,
                'amount' => $accumulated['amount'],
                'days_billed' => array_sum(array_column($accumulated['lines'], 'days_billed')),
                'is_prorated' => collect($accumulated['lines'])->contains(fn (array $line) => $line['is_prorated']),
                'is_accumulated' => true,
                'accumulated_periods' => $periods,
                'tax' => $accumulated['tax'],
                'total_amount' => $accumulated['total_amount'],
                'due_date' => $dueDate,
                'status' => 'unpaid',
            ]);

            if ($deferral && $deferral->status === 'pending') {
                $deferral->update([
                    'status' => 'invoiced',
                    'invoice_id' => $invoice->id,
                ]);
            }
        });

        return $invoice->fresh();
    }

    private static function cancelUnpaidIndividualInvoicesForPeriods(Customer $customer, array $periods): void
    {
        Invoice::query()
            ->where('customer_id', $customer->id)
            ->whereIn('billing_period', $periods)
            ->where('status', 'unpaid')
            ->where('is_accumulated', false)
            ->update(['status' => 'canceled']);
    }

    /**
     * Restore a single canceled invoice back to unpaid (enables Bayar Manual).
     */
    public static function restoreCanceledInvoice(Invoice $invoice): Invoice
    {
        if ($invoice->status !== 'canceled') {
            throw new \RuntimeException('Hanya invoice berstatus dibatalkan yang dapat dipulihkan.');
        }

        $invoice->loadMissing('customer');

        if ($invoice->customer && self::isPeriodDeferredForCustomer($invoice->customer, $invoice->billing_period)) {
            throw new \RuntimeException(
                'Invoice ini ditunda oleh penundaan tagihan aktif. Batalkan penundaan di panel atas jika ingin memulihkan tagihan periode ini.'
            );
        }

        $duplicateUnpaid = Invoice::query()
            ->where('customer_id', $invoice->customer_id)
            ->where('billing_period', $invoice->billing_period)
            ->where('status', 'unpaid')
            ->where('id', '!=', $invoice->id)
            ->exists();

        if ($duplicateUnpaid) {
            throw new \RuntimeException('Sudah ada invoice belum bayar untuk periode yang sama.');
        }

        $updates = ['status' => 'unpaid'];

        if ($invoice->due_date && Carbon::parse($invoice->due_date)->startOfDay()->lt(Carbon::today())) {
            $updates['due_date'] = Carbon::now()->addDays(7)->toDateString();
        }

        $invoice->update($updates);

        return $invoice->fresh();
    }

    /**
     * Permanently delete an invoice (unpaid/canceled/expired only).
     */
    public static function deleteInvoice(Invoice $invoice): void
    {
        if ($invoice->status === 'paid') {
            throw new \RuntimeException(
                'Invoice lunas tidak dapat dihapus. Batalkan pembayaran manual terlebih dahulu jika perlu.'
            );
        }

        DB::transaction(function () use ($invoice): void {
            $invoiceNumber = $invoice->invoice_number;
            $customerId = $invoice->customer_id;

            BillingDeferral::query()
                ->where('invoice_id', $invoice->id)
                ->update([
                    'invoice_id' => null,
                    'status' => 'cancelled',
                ]);

            if ($invoice->is_accumulated) {
                $accumulatedPeriods = $invoice->accumulated_periods ?? [];

                BillingDeferral::query()
                    ->where('customer_id', $customerId)
                    ->where('status', 'pending')
                    ->get()
                    ->each(function (BillingDeferral $deferral) use ($accumulatedPeriods): void {
                        if ($accumulatedPeriods !== [] && ($deferral->periods ?? []) === $accumulatedPeriods) {
                            $deferral->update(['status' => 'cancelled']);
                        }
                    });
            }

            $invoice->payments()->delete();
            $invoice->delete();

            Log::info("Invoice deleted by admin: {$invoiceNumber}");
        });
    }

    /**
     * @return array{restored_count: int, created_count: int}
     */
    private static function restoreInvoicesForDeferralPeriods(Customer $customer, array $periods): array
    {
        $restoredCount = 0;

        foreach ($periods as $period) {
            $canceled = Invoice::query()
                ->where('customer_id', $customer->id)
                ->where('billing_period', $period)
                ->where('status', 'canceled')
                ->first();

            if ($canceled && self::restoreCanceledInvoiceRecord($canceled)) {
                $restoredCount++;
            }
        }

        $accumulatedCanceled = Invoice::query()
            ->where('customer_id', $customer->id)
            ->where('status', 'canceled')
            ->where('is_accumulated', true)
            ->get();

        foreach ($accumulatedCanceled as $invoice) {
            $accumulatedPeriods = $invoice->accumulated_periods ?? [];
            if ($accumulatedPeriods === [] || array_intersect($periods, $accumulatedPeriods) === []) {
                continue;
            }

            if (self::restoreCanceledInvoiceRecord($invoice)) {
                $restoredCount++;
            }
        }

        return [
            'restored_count' => $restoredCount,
            'created_count' => 0,
        ];
    }

    private static function restoreCanceledInvoiceRecord(Invoice $invoice): bool
    {
        if ($invoice->status !== 'canceled') {
            return false;
        }

        $duplicateUnpaid = Invoice::query()
            ->where('customer_id', $invoice->customer_id)
            ->where('billing_period', $invoice->billing_period)
            ->where('status', 'unpaid')
            ->where('id', '!=', $invoice->id)
            ->exists();

        if ($duplicateUnpaid) {
            return false;
        }

        $updates = ['status' => 'unpaid'];

        if ($invoice->due_date && Carbon::parse($invoice->due_date)->startOfDay()->lt(Carbon::today())) {
            $updates['due_date'] = Carbon::now()->addDays(7)->toDateString();
        }

        $invoice->update($updates);

        return true;
    }

    public static function customerHasPendingDeferral(Customer $customer): bool
    {
        return BillingDeferral::query()
            ->where('customer_id', $customer->id)
            ->where('status', 'pending')
            ->exists();
    }

    public static function isPeriodDeferredForCustomer(Customer $customer, string $period): bool
    {
        return BillingDeferral::query()
            ->where('customer_id', $customer->id)
            ->where('status', 'pending')
            ->get()
            ->contains(fn (BillingDeferral $deferral) => in_array($period, $deferral->periods ?? [], true));
    }

    /**
     * Generate accumulated invoices for deferrals whose schedule has arrived.
     */
    public static function processScheduledDeferrals(?Carbon $today = null): int
    {
        $today = ($today ?? Carbon::today())->copy()->startOfDay();
        $daysBeforeDue = self::getGenerateDaysBeforeDue();
        $count = 0;

        $deferrals = BillingDeferral::query()
            ->where('status', 'pending')
            ->whereNull('invoice_id')
            ->with(['customer.package'])
            ->get();

        foreach ($deferrals as $deferral) {
            $generateOn = Carbon::parse($deferral->combined_due_date)
                ->subDays($daysBeforeDue)
                ->startOfDay();

            if ($today->lt($generateOn)) {
                continue;
            }

            if (self::createAccumulatedInvoiceFromDeferral($deferral) !== null) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * @return array{invoice_number: string, customer_name: string, total_amount: float, billing_period: string, due_date: string}|null
     */
    public static function createAccumulatedInvoiceFromDeferral(BillingDeferral $deferral): ?array
    {
        $deferral->loadMissing(['customer.package']);

        $customer = $deferral->customer;
        if (!$customer || !$customer->package || $deferral->status !== 'pending') {
            return null;
        }

        if ($deferral->invoice_id) {
            return null;
        }

        $periods = $deferral->periods ?? [];
        if ($periods === []) {
            return null;
        }

        $accumulated = self::calculateAccumulatedBilling($customer, $periods);
        if ($accumulated['lines'] === []) {
            return null;
        }

        $dueDate = Carbon::parse($deferral->combined_due_date)->startOfDay();
        $billingPeriod = count($periods) === 1
            ? $periods[0]
            : ($periods[0] . '+' . $periods[array_key_last($periods)]);

        $result = null;

        DB::transaction(function () use ($deferral, $customer, $periods, $dueDate, $billingPeriod, &$result) {
            $invoice = self::consolidatePeriodInvoices($customer, $periods, $dueDate, $deferral);
            $invNumber = $invoice->invoice_number;
            $amount = (float) $invoice->amount;
            $total = (float) $invoice->total_amount;

            try {
                $periodLabel = implode(' + ', $periods);
                $dueDateFormatted = $dueDate->format('d-m-Y');
                $message = MessageTemplateService::renderWithPaymentInstructions('whatsapp.template.invoice_accumulated_new', [
                    'customer_name' => $customer->name,
                    'brand_name' => BrandingService::companyName(),
                    'period_label' => $periodLabel,
                    'invoice_number' => $invNumber,
                    'username' => $customer->username,
                    'subtotal' => self::formatWhatsAppMoney($amount),
                    'total' => self::formatWhatsAppMoney($total),
                    'due_date' => $dueDateFormatted,
                ]);

                if (class_exists(\App\Services\WhatsAppService::class)) {
                    \App\Services\WhatsAppService::sendText($customer->phone_number, $message);
                }
            } catch (\Exception $waEx) {
                Log::error("Failed to send WhatsApp accumulated billing notification for {$customer->username}: " . $waEx->getMessage());
            }

            $result = [
                'invoice_number' => $invNumber,
                'customer_name' => $customer->name,
                'total_amount' => $total,
                'billing_period' => $billingPeriod,
                'due_date' => $dueDate->toDateString(),
            ];
        });

        return $result;
    }

    /**
     * @param array<int, string> $periods
     * @return array{amount: float, tax: float, total_amount: float, lines: array<int, array<string, mixed>>}
     */
    public static function calculateAccumulatedBilling(Customer $customer, array $periods): array
    {
        if (!$customer->package) {
            return [
                'amount' => 0,
                'tax' => 0,
                'total_amount' => 0,
                'lines' => [],
            ];
        }

        $monthlyPrice = (float) $customer->package->price;
        $lines = [];
        $amount = 0.0;

        foreach ($periods as $period) {
            $billing = self::calculateInvoiceAmount($customer, $period, $monthlyPrice);
            if ($billing === null) {
                continue;
            }

            $lines[] = [
                'period' => $period,
                'amount' => $billing['amount'],
                'days_billed' => $billing['days_billed'],
                'is_prorated' => $billing['is_prorated'],
            ];
            $amount += $billing['amount'];
        }

        $amount = round($amount, 2);
        $taxRate = (float) SettingService::get('system.tax_rate', 0);
        $tax = round($amount * $taxRate, 2);
        $total = round($amount + $tax, 2);

        return [
            'amount' => $amount,
            'tax' => $tax,
            'total_amount' => $total,
            'lines' => $lines,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function serializeBillingDeferrals($deferrals): array
    {
        return collect($deferrals)->map(function (BillingDeferral $deferral) {
            $preview = self::calculateAccumulatedBilling(
                $deferral->customer,
                $deferral->periods ?? []
            );

            $accumulatedGenerateOn = $deferral->combined_due_date
                ? Carbon::parse($deferral->combined_due_date)
                    ->subDays(self::getGenerateDaysBeforeDue())
                    ->format('Y-m-d')
                : null;

            return [
                'id' => $deferral->id,
                'customer_id' => $deferral->customer_id,
                'customer_name' => $deferral->customer?->name,
                'customer_username' => $deferral->customer?->username,
                'months_count' => $deferral->months_count,
                'periods' => $deferral->periods ?? [],
                'combined_due_date' => $deferral->combined_due_date?->format('Y-m-d'),
                'accumulated_generate_on' => $accumulatedGenerateOn,
                'status' => $deferral->status,
                'notes' => $deferral->notes,
                'invoice_id' => $deferral->invoice_id,
                'invoice_number' => $deferral->invoice?->invoice_number,
                'estimated_total_amount' => $preview['total_amount'],
                'created_at' => $deferral->created_at?->toDateTimeString(),
            ];
        })->all();
    }

    public static function buildUnpaidInvoiceWhatsAppMessage(Invoice $invoice): ?string
    {
        $invoice->loadMissing('customer');
        $customer = $invoice->customer;

        if (!$customer) {
            return null;
        }

        if ($invoice->is_accumulated) {
            $periods = $invoice->accumulated_periods;
            $periodLabel = is_array($periods) && $periods !== []
                ? implode(' + ', $periods)
                : ($invoice->billing_period ?? '-');

            return MessageTemplateService::renderWithPaymentInstructions('whatsapp.template.invoice_accumulated', [
                'customer_name' => $customer->name,
                'brand_name' => BrandingService::companyName(),
                'period_label' => $periodLabel,
                'invoice_number' => $invoice->invoice_number,
                'service_type' => strtoupper($customer->service_type),
                'username' => $customer->username,
                'subtotal' => self::formatWhatsAppMoney((float) $invoice->amount),
                'total' => self::formatWhatsAppMoney((float) $invoice->total_amount),
                'due_date' => $invoice->due_date?->format('d-m-Y') ?? '-',
            ]);
        }

        return MessageTemplateService::renderWithPaymentInstructions('whatsapp.template.invoice_unpaid', [
            'customer_name' => $customer->name,
            'brand_name' => BrandingService::companyName(),
            'period' => $invoice->billing_period ?? '-',
            'invoice_number' => $invoice->invoice_number,
            'service_type' => strtoupper($customer->service_type),
            'username' => $customer->username,
            'subtotal' => self::formatWhatsAppMoney((float) $invoice->amount),
            'prorata_line' => self::buildProrataLine((bool) $invoice->is_prorated, (int) $invoice->days_billed),
            'total' => self::formatWhatsAppMoney((float) $invoice->total_amount),
            'due_date' => $invoice->due_date?->format('d-m-Y') ?? '-',
        ]);
    }

    public static function buildPaidInvoiceWhatsAppMessage(Invoice $invoice, bool $includeReactivationNote = false): ?string
    {
        $invoice->loadMissing(['customer', 'payments']);
        $customer = $invoice->customer;

        if (!$customer) {
            return null;
        }

        $payment = $invoice->payments->sortByDesc('created_at')->first();
        $amountPaid = $payment ? (float) $payment->amount_paid : (float) $invoice->total_amount;
        $gateway = $payment?->gateway_name ?? 'manual';
        $method = $payment?->payment_method ?? ($gateway === 'manual' ? 'Cash / Tunai' : ucfirst($gateway));
        $paidAt = self::formatDisplayDateTime($invoice->paid_at ?? $payment?->created_at);
        $templateKey = $includeReactivationNote
            ? 'whatsapp.template.payment_reactivated'
            : 'whatsapp.template.payment_received';

        return MessageTemplateService::render($templateKey, [
            'brand_name' => BrandingService::companyName(),
            'invoice_number' => $invoice->invoice_number,
            'customer_name' => $customer->name,
            'username' => $customer->username,
            'period' => $invoice->billing_period ?? '-',
            'payment_method' => $method,
            'amount_paid' => self::formatWhatsAppMoney($amountPaid),
            'paid_at' => $paidAt,
            'footer_note' => $includeReactivationNote
                ? "\n\nLayanan internet Anda telah aktif kembali secara otomatis. Terima kasih atas kepercayaan dan kerja samanya."
                : "\n\nTerima kasih atas kepercayaan dan kerja samanya.",
        ]);
    }

    public static function formatWhatsAppMoney(float $amount): string
    {
        return 'Rp ' . number_format($amount, 0, ',', '.');
    }

    public static function buildProrataLine(bool $isProrated, int $daysBilled): string
    {
        if (!$isProrated) {
            return '';
        }

        return "\n• Prorata    : *{$daysBilled} hari* / " . self::PRORATA_BASE_DAYS . ' hari';
    }

    public static function formatDisplayDateTime(mixed $value = null): string
    {
        $timezone = config('app.timezone', 'Asia/Jakarta');

        if ($value === null) {
            return Carbon::now($timezone)->format('d-m-Y H:i');
        }

        return Carbon::parse($value)->timezone($timezone)->format('d-m-Y H:i');
    }

    /**
     * @return array{ok: bool, message: string}
     */
    public static function sendInvoiceWhatsAppNotification(Invoice $invoice): array
    {
        $invoice->loadMissing(['customer', 'payments']);
        $customer = $invoice->customer;

        if (!$customer) {
            return ['ok' => false, 'message' => 'Pelanggan tidak ditemukan untuk invoice ini.'];
        }

        if (empty(trim((string) $customer->phone_number))) {
            return ['ok' => false, 'message' => 'Nomor WhatsApp pelanggan belum diisi.'];
        }

        if (!in_array($invoice->status, ['unpaid', 'paid'], true)) {
            return ['ok' => false, 'message' => 'Notifikasi WhatsApp hanya tersedia untuk invoice belum bayar atau lunas.'];
        }

        $message = $invoice->status === 'paid'
            ? self::buildPaidInvoiceWhatsAppMessage($invoice)
            : self::buildUnpaidInvoiceWhatsAppMessage($invoice);

        if (!$message) {
            return ['ok' => false, 'message' => 'Gagal menyusun pesan WhatsApp.'];
        }

        if (!WhatsAppService::sendText($customer->phone_number, $message)) {
            return ['ok' => false, 'message' => 'Gagal mengirim WhatsApp. Pastikan gateway aktif dan sesi terhubung.'];
        }

        $label = $invoice->status === 'paid' ? 'konfirmasi pembayaran' : 'tagihan';

        return [
            'ok' => true,
            'message' => "Notifikasi {$label} untuk {$customer->name} berhasil dikirim via WhatsApp.",
        ];
    }
}
