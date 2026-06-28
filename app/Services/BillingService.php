<?php

namespace App\Services;

use App\Models\BillingActivityLog;
use App\Models\BillingDeferral;
use App\Models\Customer;
use App\Models\HotspotSale;
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
            $dateString = $customer->service_start_date instanceof Carbon
                ? $customer->service_start_date->format('Y-m-d')
                : substr((string) $customer->service_start_date, 0, 10);

            return Carbon::createFromFormat('Y-m-d', $dateString, config('app.timezone'))->startOfDay();
        }

        if ($customer->created_at) {
            return Carbon::parse($customer->created_at)->startOfDay();
        }

        return Carbon::today()->startOfDay();
    }

    /**
     * Tanggal layanan diaktifkan kembali setelah pause (inactive/suspended).
     */
    public static function resolveBillingResumeDate(Customer $customer): ?Carbon
    {
        if (!$customer->billing_resume_date) {
            return null;
        }

        $dateString = $customer->billing_resume_date instanceof Carbon
            ? $customer->billing_resume_date->format('Y-m-d')
            : substr((string) $customer->billing_resume_date, 0, 10);

        return Carbon::createFromFormat('Y-m-d', $dateString, config('app.timezone'))->startOfDay();
    }

    /**
     * Catat tanggal aktivasi ulang untuk prorata tagihan pertama setelah pause.
     */
    public static function recordBillingResume(Customer $customer, ?Carbon $resumeDate = null): void
    {
        $resumeDate = ($resumeDate ?? Carbon::today())->copy()->startOfDay();

        if ($customer->billing_resume_date) {
            $existing = self::resolveBillingResumeDate($customer);
            if ($existing && $existing->equalTo($resumeDate)) {
                return;
            }
        }

        $customer->update(['billing_resume_date' => $resumeDate->toDateString()]);
    }

    public static function clearBillingResume(Customer $customer): void
    {
        if ($customer->billing_resume_date === null) {
            return;
        }

        $customer->update(['billing_resume_date' => null]);
    }

    /**
     * Sinkronkan billing_resume_date saat status pelanggan berubah.
     */
    public static function syncCustomerStatusBillingTransition(
        Customer $customer,
        ?string $previousStatus,
        string $newStatus,
        ?Carbon $resumeDate = null
    ): void {
        if (in_array($previousStatus, ['inactive', 'suspended'], true) && $newStatus === 'active') {
            self::recordBillingResume($customer, $resumeDate);

            return;
        }

        if (in_array($newStatus, ['inactive', 'suspended'], true)) {
            self::clearBillingResume($customer);
        }
    }

    public static function customerHasPendingServicePause(Customer $customer): bool
    {
        return in_array($customer->pending_pause_status, ['inactive', 'suspended'], true)
            && $customer->billing_pause_date !== null;
    }

    public static function resolveBillingPauseDate(Customer $customer): ?Carbon
    {
        if (!$customer->billing_pause_date) {
            return null;
        }

        $dateString = $customer->billing_pause_date instanceof Carbon
            ? $customer->billing_pause_date->format('Y-m-d')
            : substr((string) $customer->billing_pause_date, 0, 10);

        return Carbon::createFromFormat('Y-m-d', $dateString, config('app.timezone'))->startOfDay();
    }

    /**
     * Awal pemakaian postpaid untuk periode tagihan (pakai dulu, bayar belakangan).
     */
    public static function resolvePostpaidUsageStartForPeriod(Customer $customer, string $period): Carbon
    {
        $serviceStart = self::resolveServiceStartDate($customer);
        $periodStart = Carbon::createFromFormat('Y-m', $period)->startOfMonth()->startOfDay();
        $dueThisPeriod = self::resolveDueDateForPeriod($customer, $period);

        if ($dueThisPeriod->format('Y-m') === $period) {
            $usageStart = $periodStart;
        } else {
            $previousPeriod = Carbon::createFromFormat('Y-m', $period)->subMonth()->format('Y-m');
            $usageStart = self::resolveDueDateForPeriod($customer, $previousPeriod)
                ->addDay()
                ->startOfDay();
        }

        if ($serviceStart->greaterThan($usageStart)) {
            $usageStart = $serviceStart;
        }

        return $usageStart;
    }

    /**
     * Postpaid: tagihan prorata pemakaian dari awal siklus periode s/d tanggal pause.
     *
     * @return array{amount: float, days_billed: int, is_prorated: bool}|null
     */
    public static function calculatePausePeriodInvoiceAmount(
        Customer $customer,
        string $period,
        Carbon $pauseDate,
        float $monthlyPrice
    ): ?array {
        $pauseDate = $pauseDate->copy()->startOfDay();
        $usageStart = self::resolvePostpaidUsageStartForPeriod($customer, $period);

        if ($pauseDate->lt($usageStart)) {
            return null;
        }

        if (!self::isProrataEnabled()) {
            return [
                'amount' => round($monthlyPrice, 2),
                'days_billed' => self::PRORATA_BASE_DAYS,
                'is_prorated' => false,
            ];
        }

        $daysActive = $usageStart->diffInDays($pauseDate) + 1;
        $daysActive = (int) min(max($daysActive, 1), self::PRORATA_BASE_DAYS);

        return [
            'amount' => round(($monthlyPrice / self::PRORATA_BASE_DAYS) * $daysActive, 2),
            'days_billed' => $daysActive,
            'is_prorated' => true,
        ];
    }

    /**
     * Apakah invoice lunas sudah menagih pemakaian sampai tanggal pause.
     */
    public static function paidInvoiceCoversPauseUsage(
        Customer $customer,
        Invoice $paidInvoice,
        string $period,
        Carbon $pauseDate
    ): bool {
        if ($paidInvoice->billing_period !== $period) {
            return false;
        }

        $usageStart = self::resolvePostpaidUsageStartForPeriod($customer, $period);
        if ($pauseDate->lt($usageStart)) {
            return false;
        }

        $daysUsed = (int) ($usageStart->diffInDays($pauseDate) + 1);

        return (int) $paidInvoice->days_billed >= $daysUsed;
    }

    /**
     * Siapkan pause layanan (postpaid): buat tagihan prorata pemakaian, nonaktif setelah lunas.
     *
     * @return array{
     *     pending_payment: bool,
     *     invoice_number?: string,
     *     total_amount?: float,
     *     billing_period?: string,
     *     due_date?: string,
     *     days_billed?: int,
     *     message: string
     * }
     */
    public static function initiateServicePause(
        Customer $customer,
        Carbon $pauseDate,
        string $targetStatus
    ): array {
        $customer->loadMissing('package');

        if ($customer->service_type !== 'pppoe') {
            throw new \InvalidArgumentException('Pause layanan hanya untuk pelanggan PPPoE.');
        }

        if (!$customer->package) {
            throw new \InvalidArgumentException('Pelanggan belum memiliki paket internet.');
        }

        if (!in_array($targetStatus, ['inactive', 'suspended'], true)) {
            throw new \InvalidArgumentException('Status pause tidak valid.');
        }

        if (self::customerHasPendingServicePause($customer)) {
            $existingInvoice = self::findPausePeriodInvoice($customer);

            if ($existingInvoice && $existingInvoice->status === 'unpaid') {
                return [
                    'pending_payment' => true,
                    'invoice_number' => $existingInvoice->invoice_number,
                    'total_amount' => (float) $existingInvoice->total_amount,
                    'billing_period' => (string) $existingInvoice->billing_period,
                    'due_date' => $existingInvoice->due_date?->format('Y-m-d'),
                    'days_billed' => (int) $existingInvoice->days_billed,
                    'message' => 'Tagihan pause masih menunggu pembayaran. Layanan akan nonaktif setelah lunas.',
                ];
            }
        }

        $pauseDate = $pauseDate->copy()->startOfDay();
        $period = $pauseDate->format('Y-m');
        $monthlyPrice = (float) $customer->package->price;

        $paidInvoice = Invoice::query()
            ->where('customer_id', $customer->id)
            ->where('billing_period', $period)
            ->where('status', 'paid')
            ->first();

        if ($paidInvoice && self::paidInvoiceCoversPauseUsage($customer, $paidInvoice, $period, $pauseDate)) {
            $customer->update([
                'billing_pause_date' => null,
                'pending_pause_status' => null,
            ]);

            return [
                'pending_payment' => false,
                'message' => 'Pemakaian periode ini sudah ditagih dan lunas. Layanan dapat langsung dinonaktifkan.',
            ];
        }

        $billing = self::calculatePausePeriodInvoiceAmount($customer, $period, $pauseDate, $monthlyPrice);
        if ($billing === null) {
            throw new \RuntimeException('Tidak dapat menghitung tagihan pemakaian untuk tanggal pause yang dipilih.');
        }

        $dueDate = $pauseDate->copy()->addDays(7)->startOfDay();
        $invoiceResult = self::upsertPausePeriodInvoice($customer, $period, $pauseDate, $dueDate, $billing);

        $customer->update([
            'billing_pause_date' => $pauseDate->toDateString(),
            'pending_pause_status' => $targetStatus,
        ]);

        self::clearBillingResume($customer);

        return [
            'pending_payment' => true,
            'invoice_number' => $invoiceResult['invoice_number'],
            'total_amount' => $invoiceResult['total_amount'],
            'billing_period' => $invoiceResult['billing_period'],
            'due_date' => $invoiceResult['due_date'],
            'days_billed' => $billing['days_billed'],
            'message' => sprintf(
                'Tagihan prorata pemakaian %d hari dibuat. Layanan akan nonaktif setelah pelanggan membayar tagihan ini.',
                $billing['days_billed']
            ),
        ];
    }

    /**
     * Buat tagihan prorata pause jika belum ada (perbaikan / pelanggan sudah nonaktif).
     *
     * @return array{invoice_number: string, total_amount: float, billing_period: string, due_date: string, days_billed: int, message: string}|null
     */
    public static function createPauseInvoiceIfMissing(Customer $customer, Carbon $pauseDate): ?array
    {
        $customer->loadMissing('package');

        if ($customer->service_type !== 'pppoe' || !$customer->package) {
            return null;
        }

        $pauseDate = $pauseDate->copy()->startOfDay();
        $period = $pauseDate->format('Y-m');
        $monthlyPrice = (float) $customer->package->price;

        $paidInvoice = Invoice::query()
            ->where('customer_id', $customer->id)
            ->where('billing_period', $period)
            ->where('status', 'paid')
            ->first();

        if ($paidInvoice && self::paidInvoiceCoversPauseUsage($customer, $paidInvoice, $period, $pauseDate)) {
            return null;
        }

        $billing = self::calculatePausePeriodInvoiceAmount($customer, $period, $pauseDate, $monthlyPrice);
        if ($billing === null) {
            return null;
        }

        $dueDate = $pauseDate->copy()->addDays(7)->startOfDay();
        $invoiceResult = self::upsertPausePeriodInvoice($customer, $period, $pauseDate, $dueDate, $billing);

        return [
            'invoice_number' => $invoiceResult['invoice_number'],
            'total_amount' => $invoiceResult['total_amount'],
            'billing_period' => $invoiceResult['billing_period'],
            'due_date' => $invoiceResult['due_date'],
            'days_billed' => $billing['days_billed'],
            'message' => sprintf(
                'Tagihan prorata pemakaian %d hari dibuat untuk periode pause.',
                $billing['days_billed']
            ),
        ];
    }

    /**
     * @param array{amount: float, days_billed: int, is_prorated: bool} $billing
     * @return array{invoice_number: string, total_amount: float, billing_period: string, due_date: string}
     */
    private static function upsertPausePeriodInvoice(
        Customer $customer,
        string $period,
        Carbon $pauseDate,
        Carbon $dueDate,
        array $billing
    ): array {
        $amount = round((float) $billing['amount'], 2);
        $taxRate = (float) SettingService::get('system.tax_rate', 0);
        $tax = round($amount * $taxRate, 2);
        $total = round($amount + $tax, 2);

        $existing = Invoice::query()
            ->where('customer_id', $customer->id)
            ->where('billing_period', $period)
            ->where('status', 'unpaid')
            ->where('is_accumulated', false)
            ->first();

        if ($existing) {
            $existing->update([
                'amount' => $amount,
                'days_billed' => $billing['days_billed'],
                'is_prorated' => $billing['is_prorated'],
                'tax' => $tax,
                'total_amount' => $total,
                'due_date' => $dueDate->toDateString(),
            ]);

            self::syncCustomerBillingDate($customer->fresh());

            return [
                'invoice_number' => $existing->invoice_number,
                'total_amount' => $total,
                'billing_period' => $period,
                'due_date' => $dueDate->toDateString(),
            ];
        }

        $invNumber = 'INV-' . str_replace('-', '', $period) . '-' . str_pad((string) $customer->id, 4, '0', STR_PAD_LEFT) . '-' . strtoupper(bin2hex(random_bytes(2)));

        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => $invNumber,
            'billing_period' => $period,
            'amount' => $amount,
            'days_billed' => $billing['days_billed'],
            'is_prorated' => $billing['is_prorated'],
            'tax' => $tax,
            'total_amount' => $total,
            'due_date' => $dueDate->toDateString(),
            'status' => 'unpaid',
        ]);

        self::syncCustomerBillingDate($customer->fresh());

        try {
            $message = MessageTemplateService::renderWithPaymentInstructions('whatsapp.template.invoice_new', [
                'customer_name' => $customer->name,
                'brand_name' => BrandingService::companyName(),
                'period' => self::formatWhatsAppBillingPeriod($period),
                'invoice_number' => $invNumber,
                'service_type' => strtoupper($customer->service_type),
                'username' => $customer->username,
                'subtotal' => self::formatWhatsAppMoney($amount),
                'prorata_line' => self::buildProrataLine($billing['is_prorated'], (int) $billing['days_billed']),
                'total' => self::formatWhatsAppMoney($total),
                'due_date' => self::formatWhatsAppDueDate($dueDate),
            ]);

            if (class_exists(\App\Services\WhatsAppService::class)) {
                \App\Services\WhatsAppService::sendText($customer->phone_number, $message);
            }
        } catch (\Exception $waEx) {
            Log::error("Failed to send WhatsApp pause billing notification for {$customer->username}: " . $waEx->getMessage());
        }

        return [
            'invoice_number' => $invNumber,
            'total_amount' => $total,
            'billing_period' => $period,
            'due_date' => $dueDate->toDateString(),
        ];
    }

    public static function findPausePeriodInvoice(Customer $customer): ?Invoice
    {
        $pauseDate = self::resolveBillingPauseDate($customer);
        if ($pauseDate === null) {
            return null;
        }

        return Invoice::query()
            ->where('customer_id', $customer->id)
            ->where('billing_period', $pauseDate->format('Y-m'))
            ->whereIn('status', ['unpaid', 'paid'])
            ->where('is_accumulated', false)
            ->orderByDesc('id')
            ->first();
    }

    /**
     * Terapkan nonaktif setelah tagihan pemakaian (pause) lunas.
     */
    public static function completePendingServicePause(Customer $customer, Invoice $invoice): bool
    {
        if (!self::customerHasPendingServicePause($customer)) {
            return false;
        }

        $pauseDate = self::resolveBillingPauseDate($customer);
        if ($pauseDate === null) {
            return false;
        }

        if ($invoice->status !== 'paid' || $invoice->billing_period !== $pauseDate->format('Y-m')) {
            return false;
        }

        $targetStatus = $customer->pending_pause_status;
        if (!in_array($targetStatus, ['inactive', 'suspended'], true)) {
            return false;
        }

        $customer->update([
            'status' => $targetStatus,
            'billing_pause_date' => null,
            'pending_pause_status' => null,
        ]);

        self::applyRestrictedStatusOnRouter($customer->fresh());

        Log::info("Service pause completed after payment for {$customer->username}", [
            'invoice_number' => $invoice->invoice_number,
            'status' => $targetStatus,
        ]);

        return true;
    }

    /**
     * Nonaktifkan secret PPPoE sesuai status restricted (inactive/suspended/isolated).
     */
    public static function applyRestrictedStatusOnRouter(Customer $customer): bool
    {
        $customer->loadMissing(['router', 'package']);

        if (!in_array($customer->status, ['isolated', 'inactive', 'suspended'], true)) {
            return false;
        }

        $router = $customer->router;
        if (!$router || !$router->status || !$customer->package) {
            return false;
        }

        try {
            $connector = RouterService::getConnector($router);

            if ($customer->status === 'isolated') {
                $isolirProfile = SettingService::get('mikrotik.isolir_profile', 'ISOLIR');

                $success = (bool) $connector->updateSecret($customer->username, [
                    'profile' => $isolirProfile,
                ]);

                if ($success) {
                    $connector->kickActiveConnection($customer->username);
                }

                return $success;
            }

            $success = (bool) $connector->updateSecret($customer->username, [
                'profile' => $customer->package->mikrotik_profile,
                'disabled' => 'yes',
            ]);

            if ($success) {
                $connector->kickActiveConnection($customer->username);
            }

            return $success;
        } catch (Exception $e) {
            Log::error("Failed to apply restricted status for {$customer->username}: " . $e->getMessage());

            return false;
        }
    }

    /**
     * Hapus billing_resume_date setelah tagihan periode aktivasi ulang lunas.
     */
    public static function clearBillingResumeIfInvoicePaid(Customer $customer, Invoice $invoice): void
    {
        $resumeDate = self::resolveBillingResumeDate($customer);
        if ($resumeDate === null) {
            return;
        }

        $resumePeriod = $resumeDate->format('Y-m');

        if (!empty($invoice->accumulated_periods) && is_array($invoice->accumulated_periods)) {
            if (in_array($resumePeriod, $invoice->accumulated_periods, true)) {
                self::clearBillingResume($customer);

                return;
            }
        }

        $billingPeriod = (string) ($invoice->billing_period ?? '');
        if ($billingPeriod === $resumePeriod) {
            self::clearBillingResume($customer);

            return;
        }

        if (str_contains($billingPeriod, '+')) {
            $parts = array_map('trim', explode('+', $billingPeriod));
            $first = $parts[0] ?? '';
            $last = $parts[array_key_last($parts)] ?? '';

            if ($resumePeriod >= $first && $resumePeriod <= $last) {
                self::clearBillingResume($customer);
            }
        }
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

    public static function isCustomerNotifyEnabled(): bool
    {
        return filter_var(
            SettingService::get('system.billing_notify_customer', '1'),
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
     * Anchor date for recurring billing (includes day, month, and year).
     */
    public static function resolveBillingAnchorDate(Customer $customer): Carbon
    {
        $raw = $customer->billing_date;

        if ($raw instanceof Carbon) {
            return $raw->copy()->startOfDay();
        }

        if ($raw) {
            return Carbon::parse($raw)->startOfDay();
        }

        return Carbon::today()->startOfDay();
    }

    /**
     * Human-readable billing due date label (e.g. "1 Juli 2026").
     */
    public static function formatBillingDateLabel(mixed $billingDate): string
    {
        if ($billingDate === null || $billingDate === '') {
            return '-';
        }

        return Carbon::parse($billingDate)
            ->locale('id')
            ->translatedFormat('d F Y');
    }

    /**
     * Due date for a customer in a billing period (YYYY-MM).
     */
    public static function resolveDueDateForPeriod(Customer $customer, string $period): Carbon
    {
        $anchor = self::resolveBillingAnchorDate($customer);

        return Carbon::createFromFormat('Y-m', $period)
            ->setUnitNoOverflow('day', $anchor->day, 'month')
            ->startOfDay();
    }

    /**
     * Jatuh tempo berikutnya pada atau setelah tanggal acuan (memperhitungkan bulan & tahun).
     */
    public static function resolveNextDueDateFrom(Customer $customer, Carbon $fromDate): Carbon
    {
        $fromDate = $fromDate->copy()->startOfDay();

        $candidate = self::resolveDueDateForPeriod($customer, $fromDate->format('Y-m'));

        if ($candidate->lt($fromDate)) {
            $nextMonth = $fromDate->copy()->addMonth()->startOfMonth();

            return self::resolveDueDateForPeriod($customer, $nextMonth->format('Y-m'));
        }

        return $candidate;
    }

    /**
     * Jatuh tempo berikutnya yang relevan untuk tampilan data pelanggan.
     * Mengikuti logika tagihan selanjutnya di log invoice (unpaid → paid preview → jadwal).
     */
    public static function resolveCustomerUpcomingDueDate(Customer $customer, ?Carbon $today = null): ?Carbon
    {
        $today = ($today ?? Carbon::today())->copy()->startOfDay();

        $pendingDeferral = BillingDeferral::query()
            ->where('customer_id', $customer->id)
            ->where('status', 'pending')
            ->latest('id')
            ->first();

        if ($pendingDeferral?->combined_due_date) {
            return Carbon::parse($pendingDeferral->combined_due_date)->startOfDay();
        }

        $unpaid = Invoice::query()
            ->where('customer_id', $customer->id)
            ->where('status', 'unpaid')
            ->orderBy('due_date')
            ->first();

        if ($unpaid?->due_date) {
            return Carbon::parse($unpaid->due_date)->startOfDay();
        }

        $latestPaid = Invoice::query()
            ->where('customer_id', $customer->id)
            ->where('status', 'paid')
            ->whereNotNull('billing_period')
            ->orderByDesc('billing_period')
            ->first();

        if ($latestPaid) {
            $preview = self::resolveNextBillingPreview($latestPaid);
            if (!empty($preview['due_date'])) {
                return Carbon::parse($preview['due_date'])->startOfDay();
            }
        }

        return self::resolveNextDueDateFrom($customer, $today);
    }

    /**
     * Target periode & jatuh tempo untuk generate tagihan manual (admin).
     * Mengutamakan jadwal H-N, periode terlewat yang sudah jatuh tempo, lalu periode berikutnya.
     *
     * @return array{period: string, due_date: Carbon}|null
     */
    public static function resolveManualInvoiceTarget(Customer $customer, ?Carbon $today = null): ?array
    {
        $today = ($today ?? Carbon::today())->copy()->startOfDay();

        $schedule = self::resolveInvoiceSchedule($customer, $today);
        if ($schedule !== null) {
            return $schedule;
        }

        $hasInvoices = Invoice::where('customer_id', $customer->id)->exists();

        if ($hasInvoices) {
            $overdueMissing = self::resolveOverdueMissingInvoiceTarget($customer, $today);
            if ($overdueMissing !== null) {
                return $overdueMissing;
            }

            $latestInvoice = self::findLatestRecurringInvoice($customer);
            if ($latestInvoice) {
                $nextPeriod = Carbon::createFromFormat('Y-m', $latestInvoice->billing_period)
                    ->addMonth()
                    ->format('Y-m');

                if (Invoice::where('customer_id', $customer->id)
                    ->where('billing_period', $nextPeriod)
                    ->exists()) {
                    throw new \InvalidArgumentException("Invoice periode {$nextPeriod} sudah ada untuk pelanggan ini.");
                }

                if (self::isPeriodDeferredForCustomer($customer, $nextPeriod)) {
                    throw new \InvalidArgumentException("Periode {$nextPeriod} sedang ditunda (tunda bayar aktif).");
                }

                return [
                    'period' => $nextPeriod,
                    'due_date' => self::resolveDueDateForPeriod($customer, $nextPeriod),
                ];
            }

            return self::resolveFirstInvoiceTarget($customer);
        }

        $serviceStart = self::resolveServiceStartDate($customer);

        // Pelanggan lama tanpa riwayat invoice di sistem: selaraskan dengan jatuh tempo di UI,
        // bukan siklus tagihan pertama dari tanggal mulai layanan.
        if ($serviceStart->lt($today->copy()->startOfMonth())) {
            $anchorOverdue = self::resolveRecentAnchorOverduePeriod($customer, $today);
            if ($anchorOverdue !== null) {
                return $anchorOverdue;
            }

            $upcoming = self::resolveCustomerUpcomingDueDate($customer, $today);
            if ($upcoming !== null) {
                return [
                    'period' => $upcoming->format('Y-m'),
                    'due_date' => $upcoming->copy()->startOfDay(),
                ];
            }
        }

        return self::resolveFirstInvoiceTarget($customer);
    }

    private static function findLatestRecurringInvoice(Customer $customer): ?Invoice
    {
        return Invoice::query()
            ->where('customer_id', $customer->id)
            ->whereNotNull('billing_period')
            ->orderByDesc('billing_period')
            ->get()
            ->first(function (Invoice $invoice) {
                if (!preg_match('/^\d{4}-\d{2}$/', (string) $invoice->billing_period)) {
                    return false;
                }

                return !VpsCatalogService::isVpsInvoice($invoice);
            });
    }

    /**
     * Sinkronkan kolom billing_date pelanggan ke jatuh tempo berikutnya.
     */
    public static function syncCustomerBillingDate(Customer $customer, ?Carbon $today = null): void
    {
        $upcoming = self::resolveCustomerUpcomingDueDate($customer, $today);
        if ($upcoming === null) {
            return;
        }

        $current = $customer->billing_date
            ? Carbon::parse($customer->billing_date)->startOfDay()
            : null;

        if ($current === null || !$current->equalTo($upcoming)) {
            $customer->update(['billing_date' => $upcoming->toDateString()]);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public static function enrichCustomerBillingFields(Customer $customer, ?Carbon $today = null): array
    {
        $upcoming = self::resolveCustomerUpcomingDueDate($customer, $today);

        return [
            'billing_date' => self::formatDateOnly($customer->billing_date),
            'upcoming_due_date' => self::formatDateOnly($upcoming),
            'billing_resume_date' => self::formatDateOnly($customer->billing_resume_date),
            'billing_pause_date' => self::formatDateOnly($customer->billing_pause_date),
            'pending_pause_status' => $customer->pending_pause_status,
        ];
    }

    /**
     * Resolve billing period and due date for a customer's first invoice (matches registration preview).
     *
     * @return array{period: string, due_date: Carbon}
     */
    public static function resolveFirstInvoiceTarget(Customer $customer): array
    {
        $serviceStart = self::resolveServiceStartDate($customer);
        $dueDate = self::resolveNextDueDateFrom($customer, $serviceStart);

        return [
            'period' => $dueDate->format('Y-m'),
            'due_date' => $dueDate,
        ];
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
     * Periode tagihan terlewat yang jatuh temponya sudah lewat (catch-up scheduler / manual).
     *
     * @return array{period: string, due_date: Carbon}|null
     */
    public static function resolveOverdueMissingInvoiceTarget(Customer $customer, ?Carbon $today = null): ?array
    {
        $today = ($today ?? Carbon::today())->copy()->startOfDay();
        $customer->loadMissing('package');

        if ($customer->service_type !== 'pppoe' || !$customer->package) {
            return null;
        }

        $latestInvoice = self::findLatestRecurringInvoice($customer);

        if ($latestInvoice === null) {
            return self::resolveRecentAnchorOverduePeriod($customer, $today);
        }

        $startPeriod = Carbon::createFromFormat('Y-m', $latestInvoice->billing_period)
            ->addMonth()
            ->format('Y-m');
        $endPeriod = $today->format('Y-m');
        $monthlyPrice = (float) $customer->package->price;

        for ($current = $startPeriod; $current <= $endPeriod; $current = self::addMonthsToPeriod($current, 1)) {
            if (self::customerHasInvoiceCoverageForPeriod($customer, $current)) {
                continue;
            }

            if (self::isPeriodDeferredForCustomer($customer, $current)) {
                continue;
            }

            if (self::calculateInvoiceAmount($customer, $current, $monthlyPrice) === null) {
                continue;
            }

            $dueDate = self::resolveDueDateForPeriod($customer, $current);

            if ($dueDate->lt($today)) {
                return [
                    'period' => $current,
                    'due_date' => $dueDate,
                ];
            }
        }

        return null;
    }

    /**
     * Periode jatuh tempo dari billing_date yang baru diubah admin (bulan ini / bulan lalu).
     *
     * @return array{period: string, due_date: Carbon}|null
     */
    public static function resolveRecentAnchorOverduePeriod(Customer $customer, ?Carbon $today = null): ?array
    {
        $today = ($today ?? Carbon::today())->copy()->startOfDay();
        $anchor = self::resolveBillingAnchorDate($customer);
        $period = $anchor->format('Y-m');
        $periodStart = Carbon::createFromFormat('Y-m', $period)->startOfMonth();
        $lookbackStart = $today->copy()->subMonth()->startOfMonth();

        if ($periodStart->lt($lookbackStart)) {
            return null;
        }

        $dueDate = self::resolveDueDateForPeriod($customer, $period);

        if ($dueDate->gt($today)) {
            return null;
        }

        if (self::customerHasInvoiceCoverageForPeriod($customer, $period)) {
            return null;
        }

        if (self::isPeriodDeferredForCustomer($customer, $period)) {
            return null;
        }

        return [
            'period' => $period,
            'due_date' => $dueDate,
        ];
    }

    /**
     * Jadwal H-N atau catch-up periode terlewat yang sudah jatuh tempo.
     *
     * @return array{period: string, due_date: Carbon}|null
     */
    public static function resolveScheduledInvoiceTarget(Customer $customer, ?Carbon $today = null, ?int $daysBeforeDue = null): ?array
    {
        $today = ($today ?? Carbon::today())->copy()->startOfDay();

        $schedule = self::resolveInvoiceSchedule($customer, $today, $daysBeforeDue);
        if ($schedule !== null) {
            return $schedule;
        }

        return self::resolveOverdueMissingInvoiceTarget($customer, $today);
    }

    /**
     * Buat invoice untuk periode terlewat yang sudah jatuh tempo (jika belum ada).
     *
     * @return array{invoice_number: string, customer_name: string, total_amount: float, billing_period: string, due_date: string}|null
     */
    public static function ensureOverdueInvoiceForCustomer(Customer $customer, ?Carbon $today = null): ?array
    {
        $customer->loadMissing('package');

        if ($customer->service_type !== 'pppoe' || !$customer->package) {
            return null;
        }

        if (!in_array($customer->status, ['active', 'isolated'], true)) {
            return null;
        }

        if (self::customerHasPendingServicePause($customer)) {
            return null;
        }

        if (self::customerHasPastDueUnpaidInvoices($customer)) {
            return null;
        }

        $target = self::resolveOverdueMissingInvoiceTarget($customer, $today);
        if ($target === null) {
            $target = self::resolveRecentAnchorOverduePeriod($customer, $today);
        }

        if ($target === null) {
            return null;
        }

        return self::createInvoiceForCustomer($customer, $target['period'], $target['due_date'], false);
    }
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

            if (self::customerHasPendingServicePause($customer)) {
                continue;
            }

            $schedule = self::resolveScheduledInvoiceTarget($customer, $today, $daysBeforeDue);
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

            $created = self::createInvoiceForCustomer($customer, $schedule['period'], $schedule['due_date'], false);
            if ($created !== null) {
                $count++;
                $createdInvoices[] = $created;
            }
        }

        $customerWhatsAppStats = ['sent' => 0, 'failed' => 0, 'skipped' => 0];
        if ($count > 0 && self::isCustomerNotifyEnabled()) {
            $customerWhatsAppStats = self::sendScheduledCustomerWhatsAppNotifications($createdInvoices);
            Log::info('Billing scheduled customer WhatsApp notifications completed.', [
                'run_date' => $today->toDateString(),
                'invoice_count' => $count,
                'whatsapp_sent' => $customerWhatsAppStats['sent'],
                'whatsapp_failed' => $customerWhatsAppStats['failed'],
                'whatsapp_skipped' => $customerWhatsAppStats['skipped'],
            ]);
        }

        self::recordScheduledInvoiceRun($today, $daysBeforeDue, $count, $createdInvoices, $customerWhatsAppStats);

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
    /**
     * @param array{sent: int, failed: int, skipped: int} $customerWhatsAppStats
     */
    public static function recordScheduledInvoiceRun(
        Carbon $runDate,
        int $daysBeforeDue,
        int $count,
        array $createdInvoices,
        array $customerWhatsAppStats = ['sent' => 0, 'failed' => 0, 'skipped' => 0]
    ): BillingActivityLog {
        $totalAmount = array_sum(array_column($createdInvoices, 'total_amount'));
        $brandName = BrandingService::companyName();
        $dateLabel = $runDate->format('d-m-Y');

        if ($count === 0) {
            $message = "Generate tagihan otomatis (H-{$daysBeforeDue}) pada {$dateLabel}: tidak ada invoice baru.";
        } else {
            $message = "Generate tagihan otomatis (H-{$daysBeforeDue}) pada {$dateLabel}: {$count} invoice baru, total Rp " . number_format($totalAmount, 0, ',', '.') . '.';
            if (self::isCustomerNotifyEnabled()) {
                $message .= sprintf(
                    ' WA pelanggan: %d terkirim, %d gagal, %d dilewati.',
                    $customerWhatsAppStats['sent'] ?? 0,
                    $customerWhatsAppStats['failed'] ?? 0,
                    $customerWhatsAppStats['skipped'] ?? 0
                );
            }
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
            'customer_whatsapp' => $customerWhatsAppStats,
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
                'customer_whatsapp' => $customerWhatsAppStats,
            ],
            'run_date' => $runDate->toDateString(),
        ]);
    }

    /**
     * Kirim WA tagihan baru ke pelanggan setelah semua invoice scheduler selesai dibuat (fase 2).
     *
     * @param array<int, array<string, mixed>> $createdInvoices
     * @return array{sent: int, failed: int, skipped: int}
     */
    public static function sendScheduledCustomerWhatsAppNotifications(array $createdInvoices): array
    {
        $sent = 0;
        $failed = 0;
        $skipped = 0;

        foreach ($createdInvoices as $row) {
            $invoiceNumber = $row['invoice_number'] ?? null;
            if (!is_string($invoiceNumber) || $invoiceNumber === '') {
                $skipped++;
                continue;
            }

            $invoice = Invoice::query()
                ->where('invoice_number', $invoiceNumber)
                ->with('customer')
                ->first();

            if (!$invoice?->customer) {
                $skipped++;
                continue;
            }

            if (empty(trim((string) $invoice->customer->phone_number))) {
                $skipped++;
                continue;
            }

            $message = self::buildNewInvoiceWhatsAppMessage($invoice);
            if ($message === null) {
                $failed++;
                continue;
            }

            try {
                if (class_exists(\App\Services\WhatsAppService::class)
                    && \App\Services\WhatsAppService::sendText($invoice->customer->phone_number, $message)) {
                    $sent++;
                } else {
                    $failed++;
                }
            } catch (\Exception $e) {
                Log::error("Failed to send scheduled invoice WhatsApp for {$invoice->customer->username}: " . $e->getMessage());
                $failed++;
            }
        }

        return [
            'sent' => $sent,
            'failed' => $failed,
            'skipped' => $skipped,
        ];
    }

    public static function buildNewInvoiceWhatsAppMessage(Invoice $invoice): ?string
    {
        $invoice->loadMissing('customer');
        $customer = $invoice->customer;

        if (!$customer) {
            return null;
        }

        return MessageTemplateService::renderWithPaymentInstructions('whatsapp.template.invoice_new', [
            'customer_name' => $customer->name,
            'brand_name' => BrandingService::companyName(),
            'period' => self::formatWhatsAppBillingPeriod($invoice->billing_period),
            'invoice_number' => $invoice->invoice_number,
            'service_type' => strtoupper($customer->service_type),
            'username' => $customer->username,
            'subtotal' => self::formatWhatsAppMoney((float) $invoice->amount),
            'prorata_line' => self::buildProrataLine((bool) $invoice->is_prorated, (int) $invoice->days_billed),
            'total' => self::formatWhatsAppMoney((float) $invoice->total_amount),
            'due_date' => self::formatWhatsAppDueDate($invoice->due_date),
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
    public static function createInvoiceForCustomer(
        Customer $customer,
        string $period,
        Carbon $dueDate,
        bool $sendWhatsApp = true
    ): ?array {
        if (!$customer->package) {
            return null;
        }

        $billing = self::calculateInvoiceAmount($customer, $period, (float) $customer->package->price);
        if ($billing === null) {
            return null;
        }

        $result = null;
        $whatsappPayload = null;

        DB::transaction(function () use ($customer, $period, $dueDate, $billing, $sendWhatsApp, &$result, &$whatsappPayload) {
            if (Invoice::query()
                ->where('customer_id', $customer->id)
                ->where('billing_period', $period)
                ->lockForUpdate()
                ->exists()) {
                return;
            }

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

            self::syncCustomerBillingDate($customer->fresh());

            $result = [
                'invoice_number' => $invNumber,
                'customer_name' => $customer->name,
                'total_amount' => $total,
                'billing_period' => $period,
                'due_date' => $dueDate->toDateString(),
            ];

            if ($sendWhatsApp) {
                $whatsappPayload = [
                    'phone' => $customer->phone_number,
                    'username' => $customer->username,
                    'message' => MessageTemplateService::renderWithPaymentInstructions('whatsapp.template.invoice_new', [
                        'customer_name' => $customer->name,
                        'brand_name' => BrandingService::companyName(),
                        'period' => self::formatWhatsAppBillingPeriod($period),
                        'invoice_number' => $invNumber,
                        'service_type' => strtoupper($customer->service_type),
                        'username' => $customer->username,
                        'subtotal' => self::formatWhatsAppMoney($amount),
                        'prorata_line' => self::buildProrataLine($billing['is_prorated'], (int) $billing['days_billed']),
                        'total' => self::formatWhatsAppMoney($total),
                        'due_date' => self::formatWhatsAppDueDate($dueDate),
                    ]),
                ];
            }
        });

        if ($whatsappPayload !== null) {
            try {
                if (class_exists(\App\Services\WhatsAppService::class)) {
                    \App\Services\WhatsAppService::sendText(
                        $whatsappPayload['phone'],
                        $whatsappPayload['message']
                    );
                }
            } catch (\Exception $waEx) {
                Log::error("Failed to send WhatsApp billing notification for {$whatsappPayload['username']}: " . $waEx->getMessage());
            }
        }

        return $result;
    }

    /**
     * Calculate invoice subtotal for a customer and billing period.
     *
     * Prorata (bulan pertama): hari ditagih = tgl mulai layanan s/d tgl jatuh tempo periode berjalan.
     * Jika tgl jatuh tempo di bulan mulai layanan sudah lewat, dipakai jatuh tempo bulan berikutnya.
     *
     * @return array{amount: float, days_billed: int, is_prorated: bool}|null Null when customer is not billable in period.
     */
    public static function calculateInvoiceAmount(Customer $customer, string $period, float $monthlyPrice): ?array
    {
        $periodStart = Carbon::createFromFormat('Y-m', $period)->startOfMonth()->startOfDay();
        $periodEnd = Carbon::createFromFormat('Y-m', $period)->endOfMonth()->startOfDay();
        $serviceStart = self::resolveServiceStartDate($customer);
        $resumeDate = self::resolveBillingResumeDate($customer);

        if ($serviceStart->gt($periodEnd)) {
            return null;
        }

        if (!self::isProrataEnabled()) {
            return [
                'amount' => round($monthlyPrice, 2),
                'days_billed' => self::PRORATA_BASE_DAYS,
                'is_prorated' => false,
            ];
        }

        $resumeInPeriod = $resumeDate !== null
            && $resumeDate->gte($periodStart)
            && $resumeDate->lte($periodEnd)
            && $resumeDate->gt($serviceStart);

        if ($resumeInPeriod) {
            $activeStart = $resumeDate;
            $dueDate = self::resolveDueDateForPeriod($customer, $period);
            if ($dueDate->lt($activeStart)) {
                $nextPeriod = Carbon::createFromFormat('Y-m', $period)->addMonth()->format('Y-m');
                $dueDate = self::resolveDueDateForPeriod($customer, $nextPeriod);
            }

            $daysActive = $activeStart->diffInDays($dueDate) + 1;
            $daysActive = (int) min(max($daysActive, 1), self::PRORATA_BASE_DAYS);

            return [
                'amount' => round(($monthlyPrice / self::PRORATA_BASE_DAYS) * $daysActive, 2),
                'days_billed' => $daysActive,
                'is_prorated' => true,
            ];
        }

        $activeStart = $serviceStart->greaterThan($periodStart) ? $serviceStart : $periodStart;
        $isCrossMonthFirstCycle = false;

        if ($serviceStart->lt($periodStart)) {
            $previousPeriod = Carbon::createFromFormat('Y-m', $period)->subMonth()->format('Y-m');
            $previousDue = self::resolveDueDateForPeriod($customer, $previousPeriod);

            if ($serviceStart->gt($previousDue)) {
                $activeStart = $serviceStart;
                $isCrossMonthFirstCycle = true;
            }
        }

        if ($serviceStart->lte($periodStart) && !$isCrossMonthFirstCycle) {
            return [
                'amount' => round($monthlyPrice, 2),
                'days_billed' => self::PRORATA_BASE_DAYS,
                'is_prorated' => false,
            ];
        }

        $dueDate = self::resolveDueDateForPeriod($customer, $period);
        if ($dueDate->lt($activeStart)) {
            $nextPeriod = Carbon::createFromFormat('Y-m', $period)->addMonth()->format('Y-m');
            $dueDate = self::resolveDueDateForPeriod($customer, $nextPeriod);
        }

        $daysActive = $activeStart->diffInDays($dueDate) + 1;
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

        if (VpsCatalogService::isVpsInvoice($invoice)) {
            return null;
        }

        if (! preg_match('/^\d{4}-\d{2}$/', (string) $invoice->billing_period)) {
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
     * Serialize a calendar date for API/frontend without UTC timezone shift.
     */
    public static function formatDateOnly(mixed $date): ?string
    {
        if ($date === null || $date === '') {
            return null;
        }

        return Carbon::parse($date)->timezone(config('app.timezone', 'Asia/Jakarta'))->format('Y-m-d');
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
            $data['due_date'] = self::formatDateOnly($invoice->due_date);

            if ($invoice->customer) {
                $data['customer'] = array_merge(
                    $data['customer'] ?? [],
                    self::enrichCustomerBillingFields($invoice->customer)
                );
            }

            if ($invoice->status === 'paid') {
                $data['next_billing'] = self::resolveNextBillingPreview($invoice);
                $data['can_void_payment'] = self::canVoidPaidInvoice($invoice);
            }

            $data['can_delete_invoice'] = self::canDeleteInvoice($invoice);

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
     * Daily revenue trend from paid invoices (paid_at) and hotspot voucher sales.
     *
     * @param  callable(\Illuminate\Database\Eloquent\Builder): void|null  $scopeInvoices
     * @param  callable(\Illuminate\Database\Eloquent\Builder): void|null  $scopeHotspotSales
     * @return array{
     *     days: int,
     *     total: float,
     *     invoice_total: float,
     *     voucher_total: float,
     *     payment_count: int,
     *     voucher_sale_count: int,
     *     change_percent: float,
     *     series: array<int, array{
     *         date: string,
     *         label: string,
     *         total: float,
     *         invoice_total: float,
     *         voucher_total: float,
     *         payment_count: int,
     *         voucher_sale_count: int
     *     }>
     * }
     */
    public static function summarizeDailyRevenue(
        int $days = 14,
        ?Carbon $today = null,
        ?callable $scopeInvoices = null,
        ?callable $scopeHotspotSales = null,
    ): array {
        $today = ($today ?? Carbon::today())->copy()->startOfDay()->locale('id');
        $days = max(7, min(31, $days));

        $rangeStart = $today->copy()->subDays($days - 1)->startOfDay();
        $rangeEnd = $today->copy()->endOfDay();

        $invoiceQuery = Invoice::query()
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$rangeStart, $rangeEnd]);

        if ($scopeInvoices) {
            $scopeInvoices($invoiceQuery);
        }

        $invoiceGrouped = (clone $invoiceQuery)
            ->selectRaw('DATE(paid_at) as sale_date, SUM(total_amount) as total, COUNT(*) as sale_count')
            ->groupBy('sale_date')
            ->get()
            ->keyBy(fn ($row) => (string) $row->sale_date);

        $voucherQuery = HotspotSale::query()
            ->whereBetween('created_at', [$rangeStart, $rangeEnd]);

        if ($scopeHotspotSales) {
            $scopeHotspotSales($voucherQuery);
        }

        $voucherGrouped = (clone $voucherQuery)
            ->selectRaw('DATE(created_at) as sale_date, SUM(price) as total, COUNT(*) as sale_count')
            ->groupBy('sale_date')
            ->get()
            ->keyBy(fn ($row) => (string) $row->sale_date);

        $series = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $day = $today->copy()->subDays($i);
            $dateKey = $day->toDateString();
            $invoiceRow = $invoiceGrouped->get($dateKey);
            $voucherRow = $voucherGrouped->get($dateKey);

            $invoiceTotal = round((float) ($invoiceRow->total ?? 0), 2);
            $voucherTotal = round((float) ($voucherRow->total ?? 0), 2);

            $series[] = [
                'date' => $dateKey,
                'label' => $day->translatedFormat('d M'),
                'invoice_total' => $invoiceTotal,
                'voucher_total' => $voucherTotal,
                'total' => round($invoiceTotal + $voucherTotal, 2),
                'payment_count' => (int) ($invoiceRow->sale_count ?? 0),
                'voucher_sale_count' => (int) ($voucherRow->sale_count ?? 0),
            ];
        }

        $invoiceTotal = round((float) array_sum(array_column($series, 'invoice_total')), 2);
        $voucherTotal = round((float) array_sum(array_column($series, 'voucher_total')), 2);
        $total = round($invoiceTotal + $voucherTotal, 2);
        $paymentCount = (int) array_sum(array_column($series, 'payment_count'));
        $voucherSaleCount = (int) array_sum(array_column($series, 'voucher_sale_count'));

        $half = (int) floor($days / 2);
        $olderTotal = round((float) array_sum(array_column(array_slice($series, 0, $half), 'total')), 2);
        $recentTotal = round((float) array_sum(array_column(array_slice($series, $half), 'total')), 2);

        $changePercent = 0.0;
        if ($olderTotal > 0) {
            $changePercent = round((($recentTotal - $olderTotal) / $olderTotal) * 100, 1);
        } elseif ($recentTotal > 0) {
            $changePercent = 100.0;
        }

        return [
            'days' => $days,
            'total' => $total,
            'invoice_total' => $invoiceTotal,
            'voucher_total' => $voucherTotal,
            'payment_count' => $paymentCount,
            'voucher_sale_count' => $voucherSaleCount,
            'change_percent' => $changePercent,
            'series' => $series,
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

            if (self::createInvoiceForCustomer($customer, $period, $dueDate, false) !== null) {
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
        int $dueExtensionDays = 7,
        bool $sendWhatsApp = false
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

        if (!in_array($dueExtensionDays, [0, 3, 5, 7], true)) {
            throw new \InvalidArgumentException('Perpanjangan jatuh tempo harus 0 (tanpa perpanjangan), 3, 5, atau 7 hari.');
        }

        $dueDate = null;

        if ($period === null) {
            $target = self::resolveManualInvoiceTarget($customer);
            if ($target === null) {
                throw new \InvalidArgumentException('Tidak dapat menentukan periode tagihan berikutnya untuk pelanggan ini.');
            }

            $period = $target['period'];
            $dueDate = $target['due_date'];
        }

        if (Invoice::where('customer_id', $customer->id)
            ->where('billing_period', $period)
            ->exists()) {
            throw new \InvalidArgumentException("Invoice periode {$period} sudah ada untuk pelanggan ini.");
        }

        if (self::isPeriodDeferredForCustomer($customer, $period)) {
            throw new \InvalidArgumentException("Periode {$period} sedang ditunda (tunda bayar aktif).");
        }

        if ($dueDate === null) {
            $dueDate = self::resolveDueDateForPeriod($customer, $period);
        }

        if ($dueDate->isPast() || $dueDate->isToday()) {
            if ($dueExtensionDays > 0) {
                $dueDate = Carbon::now()->addDays($dueExtensionDays)->startOfDay();
            }
        }

        $created = self::createInvoiceForCustomer($customer, $period, $dueDate, $sendWhatsApp);
        if ($created === null) {
            throw new \RuntimeException('Gagal membuat invoice. Periksa tanggal mulai layanan dan paket pelanggan.');
        }

        $customer->refresh();
        self::reactivateCustomerIfBillingClear($customer);

        return $created;
    }

    /**
     * Whether a billing period already has invoice coverage (individual or accumulated).
     */
    public static function customerHasInvoiceCoverageForPeriod(Customer $customer, string $period): bool
    {
        if (!preg_match('/^\d{4}-\d{2}$/', $period)) {
            return false;
        }

        if (Invoice::query()
            ->where('customer_id', $customer->id)
            ->where('billing_period', $period)
            ->exists()) {
            return true;
        }

        return Invoice::query()
            ->where('customer_id', $customer->id)
            ->where('is_accumulated', true)
            ->whereIn('status', ['unpaid', 'paid'])
            ->get()
            ->contains(fn (Invoice $invoice) => in_array($period, $invoice->accumulated_periods ?? [], true));
    }

    /**
     * Billing periods from first invoice target through the current month that still need invoices.
     *
     * @return array<int, string>
     */
    public static function resolveMissingBillingPeriods(Customer $customer, ?Carbon $today = null): array
    {
        $today = ($today ?? Carbon::today())->copy()->startOfDay();
        $customer->loadMissing('package');

        if ($customer->service_type !== 'pppoe' || !$customer->package) {
            return [];
        }

        $firstTarget = self::resolveFirstInvoiceTarget($customer);
        $startPeriod = $firstTarget['period'];
        $endPeriod = $today->format('Y-m');
        $monthlyPrice = (float) $customer->package->price;
        $periods = [];

        for ($current = $startPeriod; $current <= $endPeriod; $current = self::addMonthsToPeriod($current, 1)) {
            if (self::customerHasInvoiceCoverageForPeriod($customer, $current)) {
                continue;
            }

            if (self::isPeriodDeferredForCustomer($customer, $current)) {
                continue;
            }

            if (self::calculateInvoiceAmount($customer, $current, $monthlyPrice) === null) {
                continue;
            }

            $periods[] = $current;
        }

        return $periods;
    }

    /**
     * @return array<string, mixed>
     */
    public static function previewBackfillInvoices(
        Customer $customer,
        int $dueExtensionDays = 0,
        ?Carbon $today = null
    ): array {
        $today = ($today ?? Carbon::today())->copy()->startOfDay();
        $customer->loadMissing('package');

        if ($customer->service_type !== 'pppoe') {
            throw new \InvalidArgumentException('Backfill tagihan hanya untuk pelanggan PPPoE.');
        }

        if (!in_array($customer->status, ['active', 'isolated'], true)) {
            throw new \InvalidArgumentException('Status pelanggan harus aktif atau isolir.');
        }

        if (!$customer->package) {
            throw new \InvalidArgumentException('Pelanggan belum memiliki paket internet.');
        }

        if (self::customerHasPendingDeferral($customer)) {
            throw new \InvalidArgumentException('Pelanggan masih memiliki tunda bayar aktif.');
        }

        if (!in_array($dueExtensionDays, [0, 3, 5, 7], true)) {
            throw new \InvalidArgumentException('Perpanjangan jatuh tempo harus 0 (tanpa perpanjangan), 3, 5, atau 7 hari.');
        }

        $missingPeriods = self::resolveMissingBillingPeriods($customer, $today);
        $monthlyPrice = (float) $customer->package->price;
        $lines = [];
        $amount = 0.0;

        foreach ($missingPeriods as $period) {
            $billing = self::calculateInvoiceAmount($customer, $period, $monthlyPrice);
            if ($billing === null) {
                continue;
            }

            $dueDate = self::resolveBackfillDueDate($customer, $period, $dueExtensionDays, $today);
            $lineAmount = round((float) $billing['amount'], 2);
            $taxRate = (float) SettingService::get('system.tax_rate', 0);
            $tax = round($lineAmount * $taxRate, 2);
            $total = round($lineAmount + $tax, 2);

            $lines[] = [
                'period' => $period,
                'period_label' => self::parseBillingPeriodMonth($period)->locale('id')->translatedFormat('F Y'),
                'amount' => $lineAmount,
                'tax' => $tax,
                'total_amount' => $total,
                'days_billed' => $billing['days_billed'],
                'is_prorated' => $billing['is_prorated'],
                'due_date' => $dueDate->toDateString(),
                'due_date_label' => self::formatWhatsAppDueDate($dueDate),
            ];
            $amount += $lineAmount;
        }

        $amount = round($amount, 2);
        $taxRate = (float) SettingService::get('system.tax_rate', 0);
        $tax = round($amount * $taxRate, 2);
        $totalAmount = round($amount + $tax, 2);

        return [
            'periods' => array_column($lines, 'period'),
            'period_labels' => array_column($lines, 'period_label'),
            'count' => count($lines),
            'amount' => $amount,
            'tax' => $tax,
            'total_amount' => $totalAmount,
            'lines' => $lines,
        ];
    }

    /**
     * Generate invoices for all missed billing periods up to the current month.
     *
     * @return array{count: int, invoices: array<int, array<string, mixed>>, total_amount: float, whatsapp_sent: int}
     */
    public static function backfillInvoicesForCustomer(
        Customer $customer,
        int $dueExtensionDays = 0,
        bool $sendWhatsApp = false,
        ?Carbon $today = null
    ): array {
        $preview = self::previewBackfillInvoices($customer, $dueExtensionDays, $today);

        if ($preview['count'] === 0) {
            throw new \InvalidArgumentException('Tidak ada periode tagihan terlewat yang perlu digenerate.');
        }

        $today = ($today ?? Carbon::today())->copy()->startOfDay();
        $created = [];

        foreach ($preview['lines'] as $line) {
            $period = $line['period'];

            if (self::customerHasInvoiceCoverageForPeriod($customer, $period)) {
                continue;
            }

            $dueDate = Carbon::parse($line['due_date'])->startOfDay();
            $result = self::createInvoiceForCustomer($customer, $period, $dueDate, $sendWhatsApp);

            if ($result !== null) {
                $created[] = $result;
            }
        }

        if ($created === []) {
            throw new \RuntimeException('Gagal membuat invoice backfill. Periksa periode yang sudah ada.');
        }

        $customer->refresh();
        self::reactivateCustomerIfBillingClear($customer);

        return [
            'count' => count($created),
            'invoices' => $created,
            'total_amount' => round((float) array_sum(array_column($created, 'total_amount')), 2),
            'whatsapp_sent' => $sendWhatsApp ? count($created) : 0,
        ];
    }

    private static function resolveBackfillDueDate(
        Customer $customer,
        string $period,
        int $dueExtensionDays,
        Carbon $today
    ): Carbon {
        $dueDate = self::resolveDueDateForPeriod($customer, $period);

        if (($dueDate->isPast() || $dueDate->isToday()) && $dueExtensionDays > 0) {
            return $today->copy()->addDays($dueExtensionDays)->startOfDay();
        }

        return $dueDate->copy()->startOfDay();
    }

    /**
     * Restore service when customer is isolated but has no overdue unpaid invoices.
     */
    public static function reactivateCustomerIfBillingClear(Customer $customer): bool
    {
        if (!in_array($customer->status, ['isolated', 'inactive', 'suspended'], true)) {
            return false;
        }

        if (self::customerHasPendingDeferral($customer)) {
            return false;
        }

        if (self::customerHasPastDueUnpaidInvoices($customer)) {
            return false;
        }

        return self::reactivateCustomerOnRouter($customer);
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
     * Isolir satu pelanggan aktif yang punya tagihan unpaid lewat jatuh tempo.
     *
     * @return array<string, mixed>|null Ringkasan isolir jika berhasil.
     */
    public static function attemptAutoIsolationForCustomer(Customer $customer, ?Invoice $invoice = null): ?array
    {
        $customer->loadMissing(['router', 'package']);

        if ($customer->status !== 'active') {
            return null;
        }

        if (!self::isCustomerEligibleForAutoIsolation($customer)) {
            return null;
        }

        if (self::customerHasPendingDeferral($customer)) {
            return null;
        }

        $invoice = $invoice ?? Invoice::query()
            ->where('customer_id', $customer->id)
            ->where('status', 'unpaid')
            ->where('due_date', '<', Carbon::today())
            ->orderBy('due_date')
            ->first();

        if (!$invoice) {
            return null;
        }

        DB::beginTransaction();
        try {
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
                    Log::info("Customer {$customer->username} successfully isolated on router {$router->name}");
                } else {
                    Log::warning("Failed to update PPPoE profile for {$customer->username} on router {$router->name}");
                }
            }

            $waNotified = false;
            try {
                $message = MessageTemplateService::renderWithPaymentInstructions('whatsapp.template.isolation', [
                    'customer_name' => $customer->name,
                    'brand_name' => BrandingService::companyName(),
                    'username' => $customer->username,
                    'invoice_number' => $invoice->invoice_number,
                    'total' => self::formatWhatsAppMoney((float) $invoice->total_amount),
                    'due_date' => self::formatWhatsAppDueDate($invoice->due_date),
                ]);
                if (class_exists(\App\Services\WhatsAppService::class)) {
                    $waNotified = \App\Services\WhatsAppService::sendText($customer->phone_number, $message);
                }
            } catch (Exception $waEx) {
                Log::error("Failed to send WhatsApp isolation alert to {$customer->phone_number}: " . $waEx->getMessage());
            }

            DB::commit();

            return [
                'customer_name' => $customer->name,
                'customer_username' => $customer->username,
                'invoice_number' => $invoice->invoice_number,
                'total_amount' => (float) $invoice->total_amount,
                'due_date' => $invoice->due_date->toDateString(),
                'router_name' => $router?->name,
                'wa_notified' => $waNotified,
            ];
        } catch (Exception $e) {
            DB::rollBack();
            Log::error("Failed to isolate customer {$customer->username}: " . $e->getMessage());

            return null;
        }
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
        $isolatedCustomers = [];

        Customer::where('status', 'active')
            ->where('service_type', 'pppoe')
            ->with('package')
            ->chunkById(100, function ($customers) use ($today) {
                foreach ($customers as $customer) {
                    self::ensureOverdueInvoiceForCustomer($customer, $today);
                }
            });

        $invoices = Invoice::where('status', 'unpaid')
            ->where('due_date', '<', $today)
            ->whereHas('customer', function ($query) {
                $query->where('status', 'active');
            })
            ->with(['customer', 'customer.router', 'customer.package'])
            ->get();

        foreach ($invoices as $invoice) {
            $customer = $invoice->customer;
            if (!$customer) {
                continue;
            }

            $result = self::attemptAutoIsolationForCustomer($customer, $invoice);
            if ($result !== null) {
                $count++;
                $isolatedCustomers[] = $result;
            }
        }

        self::recordAutoIsolationRun($today, $count, $isolatedCustomers);

        return $count;
    }

    /**
     * @param  array<int, array<string, mixed>>  $isolatedCustomers
     */
    public static function recordAutoIsolationRun(Carbon $runDate, int $count, array $isolatedCustomers): BillingActivityLog
    {
        $dateLabel = $runDate->format('d-m-Y');

        if ($count === 0) {
            $message = "Pengecekan isolir otomatis pada {$dateLabel}: tidak ada pelanggan yang di-isolir.";
        } else {
            $message = "Pengecekan isolir otomatis pada {$dateLabel}: {$count} pelanggan di-isolir karena tagihan jatuh tempo.";
        }

        Log::info('Billing auto-isolation run completed.', [
            'run_date' => $runDate->toDateString(),
            'isolation_count' => $count,
        ]);

        return BillingActivityLog::create([
            'event_type' => 'auto_isolation',
            'message' => $message,
            'meta' => [
                'isolation_count' => $count,
                'customers' => $isolatedCustomers,
            ],
            'run_date' => $runDate->toDateString(),
        ]);
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
     * Restore package profile on MikroTik when customer was isolated.
     * Customers already active are left unchanged so ongoing PPPoE sessions stay connected.
     */
    public static function reactivateCustomerOnRouter(Customer $customer): bool
    {
        $customer->loadMissing(['router', 'package']);

        if (!$customer->package) {
            return false;
        }

        $needsRouterReactivation = in_array($customer->status, ['isolated', 'inactive', 'suspended'], true);

        if (!$needsRouterReactivation) {
            return $customer->status === 'active';
        }

        $customer->update(['status' => 'active']);

        $router = $customer->router;
        if (!$router || !$router->status) {
            return $customer->fresh()->status === 'active';
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

            return $success || $customer->fresh()->status === 'active';
        } catch (Exception $e) {
            Log::error("Failed to reactivate customer {$customer->username} on router: " . $e->getMessage());

            return $customer->fresh()->status === 'active';
        }
    }

    /**
     * Process invoice payment, mark it paid, and reactivate the customer if isolated.
     */
    public static function processPaidInvoice(Invoice $invoice, string $gateway, string $reference, float $amountPaid, float $fee = 0, ?array $payload = null, bool $sendWhatsApp = true): bool
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
                'payment_method' => self::resolvePaymentMethodFromPayload($gateway, $payload),
                'amount_paid' => $amountPaid,
                'fee_charged' => $fee,
                'payload_response' => $payload,
            ]);

            $invoice->update([
                'status' => 'paid',
                'paid_at' => Carbon::now(),
            ]);

            $customer = $invoice->customer;
            $pauseCompleted = false;
            if ($customer) {
                self::syncCustomerBillingDate($customer->fresh());
                self::clearBillingResumeIfInvoicePaid($customer->fresh(), $invoice->fresh());
                $pauseCompleted = self::completePendingServicePause($customer->fresh(), $invoice->fresh());
                $customer = $customer->fresh();
            }

            $isVpsOrder = \App\Services\VpsCatalogService::isVpsInvoice($invoice);
            $wasRestricted = $customer && in_array($customer->status, ['isolated', 'inactive', 'suspended'], true);
            $shouldRestoreService = $customer
                && ! $isVpsOrder
                && ! $pauseCompleted
                && ! self::customerHasPastDueUnpaidInvoices($customer, $invoice->id);

            if ($shouldRestoreService) {
                self::reactivateCustomerOnRouter($customer);
            }

            if ($sendWhatsApp) {
                try {
                    $message = self::buildPaidInvoiceWhatsAppMessage(
                        $invoice,
                        includeReactivationNote: $shouldRestoreService && $wasRestricted
                    );
                    if ($message && class_exists(\App\Services\WhatsAppService::class)) {
                        \App\Services\WhatsAppService::sendText($customer->phone_number, $message);
                    }
                } catch (Exception $waEx) {
                    Log::error("Failed to send WhatsApp payment receipt: " . $waEx->getMessage());
                }
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
     * Whether admin can void a paid invoice back to unpaid.
     */
    public static function canVoidPaidInvoice(Invoice $invoice): bool
    {
        if ($invoice->status !== 'paid') {
            return false;
        }

        $invoice->loadMissing('payments');

        if ($invoice->payments->isEmpty()) {
            return false;
        }

        foreach ($invoice->payments as $payment) {
            $gateway = strtolower((string) $payment->gateway_name);

            if ($gateway === 'manual') {
                continue;
            }

            if (! self::isGatewayInSandboxMode($gateway)) {
                return false;
            }
        }

        return true;
    }

    public static function isGatewayInSandboxMode(string $gateway): bool
    {
        return match (strtolower(trim($gateway))) {
            'manual' => true,
            'midtrans' => SettingService::get('payment.midtrans.mode', 'sandbox') === 'sandbox',
            'tripay' => SettingService::get('payment.tripay.mode', 'sandbox') === 'sandbox',
            'duitku' => SettingService::get('payment.duitku.mode', 'sandbox') === 'sandbox',
            default => false,
        };
    }

    /**
     * @deprecated Use canVoidPaidInvoice()
     */
    public static function canVoidGatewayDemoPayment(Invoice $invoice): bool
    {
        $invoice->loadMissing('payments');

        return $invoice->payments->contains(
            fn (Payment $payment) => strtolower((string) $payment->gateway_name) !== 'manual'
        ) && self::canVoidPaidInvoice($invoice);
    }

    /**
     * Whether admin can permanently delete an invoice from the log.
     */
    public static function canDeleteInvoice(Invoice $invoice): bool
    {
        if (in_array($invoice->status, ['unpaid', 'canceled', 'expired'], true)) {
            return true;
        }

        if ($invoice->status !== 'paid') {
            return false;
        }

        if (VpsCatalogService::isVpsInvoice($invoice)) {
            return false;
        }

        return self::canVoidPaidInvoice($invoice);
    }

    /**
     * Reverse a paid invoice to unpaid (manual admin or gateway sandbox cleanup).
     *
     * @throws Exception When invoice is not eligible for reversal.
     */
    public static function reversePaidInvoice(Invoice $invoice): bool
    {
        if ($invoice->status !== 'paid') {
            throw new Exception('Invoice belum lunas, tidak ada pembayaran yang perlu dibatalkan.');
        }

        $invoice->load(['customer.package', 'customer.router', 'payments']);

        if (! self::canVoidPaidInvoice($invoice)) {
            throw new Exception(
                'Hanya pembayaran manual admin atau pembayaran gateway mode sandbox (Midtrans, Tripay, Duitku) yang dapat dibatalkan dari sistem.'
            );
        }

        $hasManual = $invoice->payments()->where('gateway_name', 'manual')->exists();
        $hasGateway = $invoice->payments()->where('gateway_name', '!=', 'manual')->exists();

        if ($hasManual && $hasGateway) {
            throw new Exception('Invoice ini memiliki campuran pembayaran manual dan gateway. Hubungi developer.');
        }

        DB::beginTransaction();
        try {
            $invoice->payments()->delete();
            $invoice->update([
                'status' => 'unpaid',
                'paid_at' => null,
            ]);

            $customer = $invoice->customer;
            $isVpsOrder = VpsCatalogService::isVpsInvoice($invoice)
                || VpsCatalogService::isShowcaseCustomer($customer);
            $dueDate = $invoice->due_date ? Carbon::parse($invoice->due_date)->startOfDay() : null;

            if (
                ! $isVpsOrder
                && $customer
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

            if ($customer) {
                self::syncCustomerBillingDate($customer->fresh());
            }

            $kind = $hasGateway ? 'gateway sandbox' : 'manual';
            Log::info("Paid invoice reversed ({$kind}) for invoice {$invoice->invoice_number}");

            return true;
        } catch (Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Reverse an admin manual payment (undo accidental Bayar Manual).
     *
     * @throws Exception When invoice is not eligible for reversal.
     */
    public static function reverseManualPayment(Invoice $invoice): bool
    {
        return self::reversePaidInvoice($invoice);
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
            throw new \RuntimeException('Tunda bayar hanya untuk pelanggan PPPoE.');
        }

        if (!$customer->package) {
            throw new \RuntimeException('Pelanggan belum memiliki paket internet.');
        }

        if (self::customerHasPendingDeferral($customer)) {
            throw new \RuntimeException('Pelanggan masih memiliki tunda bayar aktif.');
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
            throw new \RuntimeException('Hanya tunda bayar berstatus pending yang dapat dibatalkan.');
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
                'Invoice ini ditunda oleh tunda bayar aktif. Batalkan tunda bayar di panel atas jika ingin memulihkan tagihan periode ini.'
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
     * Permanently delete an invoice (unpaid/canceled/expired, or paid non-VPS that can be voided).
     */
    public static function deleteInvoice(Invoice $invoice): void
    {
        $invoice->loadMissing(['payments', 'customer']);

        if ($invoice->status === 'paid') {
            if (VpsCatalogService::isVpsInvoice($invoice)) {
                throw new \RuntimeException(
                    'Invoice VPS lunas tidak dapat dihapus langsung. Batalkan pembayaran terlebih dahulu, lalu hapus.'
                );
            }

            if (! self::canVoidPaidInvoice($invoice)) {
                throw new \RuntimeException(
                    'Invoice lunas tidak dapat dihapus. Batalkan pembayaran terlebih dahulu jika memungkinkan.'
                );
            }

            self::reversePaidInvoice($invoice);
            $invoice->refresh();
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
                $message = MessageTemplateService::renderWithPaymentInstructions('whatsapp.template.invoice_accumulated_new', [
                    'customer_name' => $customer->name,
                    'brand_name' => BrandingService::companyName(),
                    'period_label' => self::formatWhatsAppBillingPeriod(implode(' + ', $periods)),
                    'invoice_number' => $invNumber,
                    'username' => $customer->username,
                    'subtotal' => self::formatWhatsAppMoney($amount),
                    'total' => self::formatWhatsAppMoney($total),
                    'due_date' => self::formatWhatsAppDueDate($dueDate),
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
                'customer_router_id' => $deferral->customer?->router_id,
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
                ? self::formatWhatsAppBillingPeriod(implode(' + ', $periods))
                : self::formatWhatsAppBillingPeriod($invoice->billing_period);

            return MessageTemplateService::renderWithPaymentInstructions('whatsapp.template.invoice_accumulated', [
                'customer_name' => $customer->name,
                'brand_name' => BrandingService::companyName(),
                'period_label' => $periodLabel,
                'invoice_number' => $invoice->invoice_number,
                'service_type' => strtoupper($customer->service_type),
                'username' => $customer->username,
                'subtotal' => self::formatWhatsAppMoney((float) $invoice->amount),
                'total' => self::formatWhatsAppMoney((float) $invoice->total_amount),
                'due_date' => self::formatWhatsAppDueDate($invoice->due_date),
            ]);
        }

        return MessageTemplateService::renderWithPaymentInstructions('whatsapp.template.invoice_unpaid', [
            'customer_name' => $customer->name,
            'brand_name' => BrandingService::companyName(),
            'period' => self::formatWhatsAppBillingPeriod($invoice->billing_period),
            'invoice_number' => $invoice->invoice_number,
            'service_type' => strtoupper($customer->service_type),
            'username' => $customer->username,
            'subtotal' => self::formatWhatsAppMoney((float) $invoice->amount),
            'prorata_line' => self::buildProrataLine((bool) $invoice->is_prorated, (int) $invoice->days_billed),
            'total' => self::formatWhatsAppMoney((float) $invoice->total_amount),
            'due_date' => self::formatWhatsAppDueDate($invoice->due_date),
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
        $method = self::formatPaymentMethodLabel(
            $payment?->payment_method,
            $payment?->gateway_name ?? $gateway
        );
        $paidAt = self::formatDisplayDateTime($invoice->paid_at ?? $payment?->created_at);
        $templateKey = $includeReactivationNote
            ? 'whatsapp.template.payment_reactivated'
            : 'whatsapp.template.payment_received';

        return MessageTemplateService::render($templateKey, [
            'brand_name' => BrandingService::companyName(),
            'invoice_number' => $invoice->invoice_number,
            'customer_name' => $customer->name,
            'username' => $customer->username,
            'period' => self::formatWhatsAppBillingPeriod($invoice->billing_period),
            'payment_method' => $method,
            'amount_paid' => self::formatWhatsAppMoney($amountPaid),
            'paid_at' => $paidAt,
            'next_billing_block' => self::buildPaidInvoiceNextBillingBlock($invoice),
            'footer_note' => $includeReactivationNote
                ? "\n\nLayanan internet Anda telah aktif kembali secara otomatis. Terima kasih atas kepercayaan dan kerja samanya."
                : "\n\nTerima kasih atas kepercayaan dan kerja samanya.",
        ]);
    }

    public static function buildPaidInvoiceNextBillingBlock(Invoice $invoice): string
    {
        $preview = self::resolveNextBillingPreview($invoice);

        if ($preview === null) {
            return '';
        }

        $period = self::formatWhatsAppBillingPeriod((string) $preview['period']);
        $dueDate = self::formatWhatsAppDueDate($preview['due_date'] ?? null);
        $total = self::formatWhatsAppMoney((float) ($preview['total_amount'] ?? 0));

        $lines = [
            '',
            '*Tagihan Berikutnya*',
            '• Periode       : *' . $period . '*',
            '• Jatuh Tempo   : *' . $dueDate . '*',
            '• Total         : *' . $total . '*',
        ];

        if (!empty($preview['is_prorated'])) {
            $lines[] = '• Prorata       : *' . (int) ($preview['days_billed'] ?? 0) . ' hari* / 30 hari';
        }

        if (!empty($preview['already_generated']) && !empty($preview['invoice_number'])) {
            $lines[] = '• No. Invoice   : *' . $preview['invoice_number'] . '*';
        }

        return implode("\n", $lines);
    }

    public static function formatWhatsAppMoney(float $amount): string
    {
        return 'Rp ' . number_format($amount, 0, ',', '.');
    }

    /**
     * Human-readable payment method label for reports, receipts, and WhatsApp.
     */
    public static function formatPaymentMethodLabel(?string $method, ?string $gateway = null): string
    {
        $raw = trim((string) ($method ?? ''));
        $normalized = strtolower(str_replace([' ', '-'], '_', $raw));

        if ($raw === '' || $normalized === 'unknown') {
            return match (strtolower((string) ($gateway ?? ''))) {
                'manual' => 'Cash / Tunai',
                'midtrans' => 'Midtrans',
                'tripay' => 'Tripay',
                'duitku' => 'Duitku',
                default => $gateway ? ucfirst($gateway) : '—',
            };
        }

        $labels = [
            'gopay' => 'GoPay',
            'qris' => 'QRIS',
            'other_qris' => 'QRIS',
            'shopeepay' => 'ShopeePay',
            'ovo' => 'OVO',
            'dana' => 'DANA',
            'linkaja' => 'LinkAja',
            'bank_transfer' => 'Transfer Bank',
            'bca_va' => 'VA BCA',
            'bni_va' => 'VA BNI',
            'bri_va' => 'VA BRI',
            'permata_va' => 'VA Permata',
            'mandiri_va' => 'VA Mandiri',
            'cimb_va' => 'VA CIMB',
            'echannel' => 'Mandiri Bill',
            'other_va' => 'Virtual Account',
            'alfamart' => 'Alfamart',
            'indomaret' => 'Indomaret',
            'cstore' => 'Gerai Retail',
            'credit_card' => 'Kartu Kredit',
            'cash' => 'Cash / Tunai',
            'cash_/_tunai' => 'Cash / Tunai',
            'cash_/_tunai_(massal)' => 'Cash / Tunai (Massal)',
            'vc' => 'Kartu Kredit',
            'bc' => 'VA BCA',
            'm2' => 'VA Mandiri',
            'br' => 'VA BRI',
            'i1' => 'Indomaret',
            'a1' => 'Alfamart',
            'sq' => 'ShopeePay QRIS',
            'sp' => 'ShopeePay',
            'da' => 'DANA',
            'ov' => 'OVO',
            'la' => 'LinkAja',
            'bt' => 'VA Permata',
            'b1' => 'CIMB Niaga VA',
            'va' => 'Virtual Account',
        ];

        if (isset($labels[$normalized])) {
            return $labels[$normalized];
        }

        if (preg_match('/[\/\s]/', $raw)) {
            return $raw;
        }

        return ucwords(str_replace('_', ' ', $normalized));
    }

    /**
     * Resolve payment method from gateway webhook or manual payment payload.
     */
    public static function resolvePaymentMethodFromPayload(string $gateway, ?array $payload = null): string
    {
        if ($payload === null) {
            return self::formatPaymentMethodLabel(null, $gateway);
        }

        if (!empty($payload['payment_method'])) {
            return self::formatPaymentMethodLabel((string) $payload['payment_method'], $gateway);
        }

        if (!empty($payload['payment_type'])) {
            $type = (string) $payload['payment_type'];

            if ($type === 'bank_transfer' && !empty($payload['va_numbers'][0]['bank'])) {
                $type = strtolower((string) $payload['va_numbers'][0]['bank']) . '_va';
            } elseif ($type === 'cstore' && !empty($payload['store'])) {
                $type = (string) $payload['store'];
            }

            return self::formatPaymentMethodLabel($type, $gateway);
        }

        if (!empty($payload['paymentCode'])) {
            return self::formatPaymentMethodLabel((string) $payload['paymentCode'], $gateway);
        }

        return self::formatPaymentMethodLabel(null, $gateway);
    }

    public static function formatWhatsAppBillingPeriod(?string $period): string
    {
        if ($period === null || $period === '' || $period === '-') {
            return '-';
        }

        if (str_contains($period, '+')) {
            $parts = preg_split('/\s*\+\s*/', $period) ?: [];
            $formatted = array_map(
                fn (string $part) => self::formatWhatsAppBillingPeriod(trim($part)),
                array_filter($parts, fn (string $part) => trim($part) !== '')
            );

            return implode(' + ', $formatted);
        }

        if (!preg_match('/^\d{4}-\d{2}$/', $period)) {
            return $period;
        }

        return Carbon::createFromFormat('Y-m', $period)
            ->locale('id')
            ->translatedFormat('F Y');
    }

    public static function formatWhatsAppDueDate(mixed $date): string
    {
        if ($date === null || $date === '' || $date === '-') {
            return '-';
        }

        $parsed = $date instanceof Carbon
            ? $date->copy()
            : Carbon::parse($date);

        return $parsed->locale('id')->translatedFormat('d F Y');
    }

    public static function buildProrataLine(bool $isProrated, int $daysBilled): string
    {
        if (!$isProrated) {
            return '';
        }

        return "\n• Prorata    : *{$daysBilled} hari* / " . self::PRORATA_BASE_DAYS . ' hari';
    }

    /**
     * Preview first-cycle billing for a newly registered customer (welcome WhatsApp).
     *
     * @return array{
     *     period: string,
     *     period_label: string,
     *     due_date: string,
     *     monthly_price: string,
     *     estimated_subtotal: string,
     *     estimated_total: string,
     *     is_prorated: bool,
     *     days_billed: int,
     *     prorata_line: string,
     *     billing_info: string,
     * }|null
     */
    public static function previewRegistrationBilling(Customer $customer, ?float $monthlyPrice = null): ?array
    {
        if ($customer->service_type !== 'pppoe') {
            return null;
        }

        $monthlyPrice = $monthlyPrice ?? (float) ($customer->package?->price ?? 0);
        if ($monthlyPrice <= 0) {
            return null;
        }

        $serviceStart = self::resolveServiceStartDate($customer);
        $firstTarget = self::resolveFirstInvoiceTarget($customer);
        $dueDate = $firstTarget['due_date'];
        $period = $firstTarget['period'];

        $billing = self::calculateInvoiceAmount($customer, $period, $monthlyPrice);
        if ($billing === null) {
            return null;
        }

        $taxRate = (float) SettingService::get('system.tax_rate', 0);
        $tax = round($billing['amount'] * $taxRate, 2);
        $total = round($billing['amount'] + $tax, 2);
        $periodLabel = Carbon::createFromFormat('Y-m', $period)
            ->locale('id')
            ->translatedFormat('F Y');
        $prorataFromLabel = $serviceStart->locale('id')->translatedFormat('d F Y');
        $dueDateLabel = self::formatWhatsAppDueDate($dueDate);

        $prorataLine = self::buildProrataLine($billing['is_prorated'], (int) $billing['days_billed']);
        $billingInfo = self::buildRegistrationBillingInfoBlock(
            $periodLabel,
            $dueDateLabel,
            $monthlyPrice,
            $billing['amount'],
            $total,
            $billing['is_prorated'],
            (int) $billing['days_billed'],
            $tax > 0,
            $billing['is_prorated'] ? $prorataFromLabel : null
        );

        return [
            'period' => $period,
            'period_label' => $periodLabel,
            'due_date' => $dueDateLabel,
            'monthly_price' => self::formatWhatsAppMoney($monthlyPrice),
            'estimated_subtotal' => self::formatWhatsAppMoney($billing['amount']),
            'estimated_total' => self::formatWhatsAppMoney($total),
            'is_prorated' => $billing['is_prorated'],
            'days_billed' => (int) $billing['days_billed'],
            'prorata_line' => $prorataLine,
            'billing_info' => $billingInfo,
        ];
    }

    public static function buildRegistrationBillingInfoBlock(
        string $periodLabel,
        string $dueDate,
        float $monthlyPrice,
        float $subtotal,
        float $total,
        bool $isProrated,
        int $daysBilled,
        bool $hasTax,
        ?string $prorataFromDate = null
    ): string {
        $lines = [
            '*Estimasi Tagihan Pertama*',
            '• Periode     : ' . $periodLabel,
            '• Paket       : ' . self::formatWhatsAppMoney($monthlyPrice) . '/bulan',
        ];

        if ($isProrated) {
            $rangeLabel = $prorataFromDate !== null
                ? " ({$prorataFromDate} s/d {$dueDate})"
                : ' (mulai layanan s/d jatuh tempo)';
            $lines[] = '• Prorata     : *' . $daysBilled . ' hari* / ' . self::PRORATA_BASE_DAYS . ' hari' . $rangeLabel;
            $lines[] = '• Subtotal    : *' . self::formatWhatsAppMoney($subtotal) . '*';
        } else {
            $lines[] = '• Tagihan     : *' . self::formatWhatsAppMoney($subtotal) . '*';
        }

        if ($hasTax) {
            $lines[] = '• Total+PPN   : *' . self::formatWhatsAppMoney($total) . '*';
        } elseif ($isProrated) {
            $lines[] = '• Total       : *' . self::formatWhatsAppMoney($total) . '*';
        }

        $lines[] = '• Jatuh Tempo : *' . $dueDate . '*';
        $lines[] = '';
        $lines[] = '_Nominal final mengikuti invoice yang diterbitkan sistem._';

        return implode("\n", $lines);
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
