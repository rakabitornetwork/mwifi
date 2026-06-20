<?php

namespace App\Services;

use App\Models\BillingActivityLog;
use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
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

            if ($today->equalTo($generateOn)) {
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

            $created = self::createInvoiceForCustomer($customer, $schedule['period'], $schedule['due_date']);
            if ($created !== null) {
                $count++;
                $createdInvoices[] = $created;
            }
        }

        self::recordScheduledInvoiceRun($today, $daysBeforeDue, $count, $createdInvoices);

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
        $lines = [
            "*[{$brandName}] Generate Tagihan Otomatis*",
            '',
            'Tanggal: *' . $runDate->format('d-m-Y') . '*',
            'Jadwal: *H-' . $daysBeforeDue . ' sebelum jatuh tempo*',
            'Invoice baru: *' . count($createdInvoices) . '*',
            '',
        ];

        foreach (array_slice($createdInvoices, 0, 10) as $invoice) {
            $lines[] = '- *' . $invoice['invoice_number'] . '* — ' . $invoice['customer_name']
                . ' (' . $invoice['billing_period'] . ') Rp '
                . number_format((float) $invoice['total_amount'], 0, ',', '.');
        }

        if (count($createdInvoices) > 10) {
            $lines[] = '- ... dan ' . (count($createdInvoices) - 10) . ' invoice lainnya';
        }

        $lines[] = '';
        $lines[] = 'Total: *Rp ' . number_format($totalAmount, 0, ',', '.') . '*';
        $lines[] = '';
        $lines[] = 'Detail lengkap tersedia di panel admin tab Invoice.';

        return implode("\n", $lines);
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
                $brandName = BrandingService::companyName();
                $prorataLine = $billing['is_prorated']
                    ? "\n- Prorata: *{$billing['days_billed']} hari* / " . self::PRORATA_BASE_DAYS . " hari"
                    : '';
                $message = "Yth. Bapak/Ibu {$customer->name},\n\nTagihan internet {$brandName} Anda untuk periode *{$period}* telah terbit.\n\n*Detail Tagihan*:\n- No. Invoice: *{$invNumber}*\n- Layanan: " . strtoupper($customer->service_type) . " ({$customer->username})\n- Subtotal: *Rp " . number_format($amount, 0, ',', '.') . "*{$prorataLine}\n- Total Tagihan: *Rp " . number_format($total, 0, ',', '.') . "*\n- Jatuh Tempo: *{$dueDateFormatted}*\n\nSilakan melakukan pembayaran melalui Portal Pelanggan sebelum jatuh tempo untuk menghindari isolir otomatis. Terima kasih.";

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
        return $invoices->map(function (Invoice $invoice) {
            $data = $invoice->toArray();
            if ($invoice->status === 'paid') {
                $data['next_billing'] = self::resolveNextBillingPreview($invoice);
            }

            return $data;
        })->all();
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
            ->with(['customer', 'customer.router'])
            ->get();

        foreach ($invoices as $invoice) {
            $customer = $invoice->customer;

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
                    $brandName = BrandingService::companyName();
                    $message = "Yth. Bapak/Ibu {$customer->name},\n\nLayanan internet {$brandName} Anda dengan username *{$customer->username}* telah di-isolir otomatis karena tagihan {$invoice->invoice_number} sebesar Rp " . number_format($invoice->total_amount, 0, ',', '.') . " melewati jatuh tempo (" . $invoice->due_date->format('d-m-Y') . ").\n\nSilakan lakukan pembayaran segera melalui Portal Pelanggan agar internet otomatis aktif kembali.";
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
            if ($customer && in_array($customer->status, ['isolated', 'inactive'])) {
                $customer->update(['status' => 'active']);

                $router = $customer->router;
                $package = $customer->package;

                if ($router && $router->status && $package) {
                    $connector = RouterService::getConnector($router);

                    $success = $connector->updateSecret($customer->username, [
                        'profile' => $package->mikrotik_profile
                    ]);

                    if ($success) {
                        $connector->kickActiveConnection($customer->username);
                        Log::info("Customer {$customer->username} successfully reactivated on router {$router->name}");
                    } else {
                        Log::warning("Failed to restore PPPoE profile for {$customer->username} on router {$router->name}");
                    }
                }
            }

            try {
                $brandName = BrandingService::companyName();
                $message = "Terima Kasih!\n\nPembayaran tagihan {$brandName} Anda telah berhasil diterima.\n\n*Detail Pembayaran*:\n- No. Invoice: *{$invoice->invoice_number}*\n- Pelanggan: *{$customer->name}* ({$customer->username})\n- Metode Bayar: " . ($payload['payment_method'] ?? ucfirst($gateway)) . "\n- Jumlah Bayar: *Rp " . number_format($amountPaid, 0, ',', '.') . "*\n- Tanggal Bayar: " . Carbon::now()->format('d-m-Y H:i') . "\n\nLayanan internet Anda otomatis aktif kembali secara instan. Terima kasih atas kepercayaan Anda.";
                if (class_exists(\App\Services\WhatsAppService::class)) {
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

            if ($customer && $dueDate && $dueDate->lt(Carbon::today()) && $customer->status === 'active') {
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
}
