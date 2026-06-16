<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\Router\RouterService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class BillingService
{
    /**
     * Generate invoices for all active/isolated customers for a given period.
     *
     * @param string|null $period Format YYYY-MM (e.g., "2026-06"). Defaults to current month.
     * @return int Number of generated invoices.
     */
    public static function generateInvoices(?string $period = null): int
    {
        $period = $period ?? Carbon::now()->format('Y-m');
        $count = 0;

        // Fetch all customers that should be billed (active or isolated)
        $customers = Customer::whereIn('status', ['active', 'isolated'])
            ->with('package')
            ->get();

        foreach ($customers as $customer) {
            // Check if package is assigned
            if (!$customer->package) {
                continue;
            }

            // Check if invoice for this customer and period already exists
            $exists = Invoice::where('customer_id', $customer->id)
                ->where('billing_period', $period)
                ->exists();

            if ($exists) {
                continue;
            }

            // Start transaction
            DB::transaction(function () use ($customer, $period, &$count) {
                $amount = $customer->package->price;
                $taxRate = (float) SettingService::get('system.tax_rate', 0); // e.g., 0.11 for 11% PPN
                $tax = $amount * $taxRate;
                $total = $amount + $tax;

                // Create invoice number: INV-YYYYMM-CUSTID-RAND
                $invNumber = 'INV-' . str_replace('-', '', $period) . '-' . str_pad($customer->id, 4, '0', STR_PAD_LEFT) . '-' . strtoupper(bin2hex(random_bytes(2)));

                // Due date is usually billing_date of the current billing month
                $dueDate = Carbon::createFromFormat('Y-m', $period)
                    ->setUnitNoOverflow('day', $customer->billing_date, 'month');

                // If due date falls in the past or today when generating, set it to 7 days from now
                if ($dueDate->isPast() || $dueDate->isToday()) {
                    $dueDate = Carbon::now()->addDays(7);
                }

                $invoice = Invoice::create([
                    'customer_id' => $customer->id,
                    'invoice_number' => $invNumber,
                    'billing_period' => $period,
                    'amount' => $amount,
                    'tax' => $tax,
                    'total_amount' => $total,
                    'due_date' => $dueDate,
                    'status' => 'unpaid',
                ]);

                // Send invoice notification via WhatsApp
                try {
                    $dueDateFormatted = $dueDate->format('d-m-Y');
                    $totalFormatted = number_format($total, 0, ',', '.');
                    $message = "Yth. Bapak/Ibu {$customer->name},\n\nTagihan internet mWiFi Anda untuk periode *{$period}* telah terbit.\n\n*Detail Tagihan*:\n- No. Invoice: *{$invNumber}*\n- Layanan: " . strtoupper($customer->service_type) . " ({$customer->username})\n- Total Tagihan: *Rp {$totalFormatted}*\n- Jatuh Tempo: *{$dueDateFormatted}*\n\nSilakan melakukan pembayaran melalui Portal Pelanggan sebelum jatuh tempo untuk menghindari isolir otomatis. Terima kasih.";
                    
                    if (class_exists(\App\Services\WhatsAppService::class)) {
                        \App\Services\WhatsAppService::sendText($customer->phone_number, $message);
                    }
                } catch (\Exception $waEx) {
                    Log::error("Failed to send WhatsApp billing notification for {$customer->username}: " . $waEx->getMessage());
                }

                $count++;
            });
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

        // Get all unpaid invoices past their due date, where customer is still active
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
                // 1. Update customer status in database
                $customer->update(['status' => 'isolated']);

                // 2. Synchronize to Mikrotik router
                $router = $customer->router;
                $isolirProfile = SettingService::get('mikrotik.isolir_profile', 'ISOLIR');

                if ($router && $router->status) {
                    $connector = RouterService::getConnector($router);
                    
                    // Update PPPoE profile to ISOLIR
                    $success = $connector->updateSecret($customer->username, [
                        'profile' => $isolirProfile
                    ]);

                    if ($success) {
                        // Kick active session to force redial immediately under isolated profile
                        $connector->kickActiveConnection($customer->username);
                        Log::info("Customer {$customer->username} successfully isolated on router {$router->name}");
                    } else {
                        Log::warning("Failed to update PPPoE profile for {$customer->username} on router {$router->name}");
                    }
                }

                // 3. Queue WhatsApp Alert (Failure here won't rollback transaction)
                try {
                    $message = "Yth. Bapak/Ibu {$customer->name},\n\nLayanan internet mWiFi Anda dengan username *{$customer->username}* telah di-isolir otomatis karena tagihan {$invoice->invoice_number} sebesar Rp " . number_format($invoice->total_amount, 0, ',', '.') . " melewati jatuh tempo (" . $invoice->due_date->format('d-m-Y') . ").\n\nSilakan lakukan pembayaran segera melalui Portal Pelanggan agar internet otomatis aktif kembali.";
                    // We will call the WhatsAppService dynamically
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
     *
     * @param Invoice $invoice
     * @param string $gateway Name of the payment gateway (e.g. 'tripay', 'midtrans')
     * @param string $reference Transaction reference from the gateway
     * @param float $amountPaid Total amount paid
     * @param float $fee Payment fee charged by gateway
     * @param array|null $payload Full callback webhook payload
     * @return bool
     */
    public static function processPaidInvoice(Invoice $invoice, string $gateway, string $reference, float $amountPaid, float $fee = 0, ?array $payload = null): bool
    {
        if ($invoice->status === 'paid') {
            return true; // Already paid
        }

        DB::beginTransaction();
        try {
            // 1. Create payment record
            Payment::create([
                'invoice_id' => $invoice->id,
                'gateway_name' => $gateway,
                'reference_number' => $reference,
                'payment_method' => $payload['payment_method'] ?? 'unknown',
                'amount_paid' => $amountPaid,
                'fee_charged' => $fee,
                'payload_response' => $payload,
            ]);

            // 2. Update Invoice status
            $invoice->update([
                'status' => 'paid',
                'paid_at' => Carbon::now(),
            ]);

            // 3. Reactivate customer if isolated or suspended
            $customer = $invoice->customer;
            if ($customer && in_array($customer->status, ['isolated', 'inactive'])) {
                $customer->update(['status' => 'active']);

                // Synchronize profile back to Mikrotik
                $router = $customer->router;
                $package = $customer->package;

                if ($router && $router->status && $package) {
                    $connector = RouterService::getConnector($router);
                    
                    // Restore original PPPoE profile
                    $success = $connector->updateSecret($customer->username, [
                        'profile' => $package->mikrotik_profile
                    ]);

                    if ($success) {
                        // Kick active connection so they re-dial and get active internet instantly
                        $connector->kickActiveConnection($customer->username);
                        Log::info("Customer {$customer->username} successfully reactivated on router {$router->name}");
                    } else {
                        Log::warning("Failed to restore PPPoE profile for {$customer->username} on router {$router->name}");
                    }
                }
            }

            // 4. Send payment receipt WhatsApp notification
            try {
                $message = "Terima Kasih!\n\nPembayaran tagihan mWiFi Anda telah berhasil diterima.\n\n*Detail Pembayaran*:\n- No. Invoice: *{$invoice->invoice_number}*\n- Pelanggan: *{$customer->name}* ({$customer->username})\n- Metode Bayar: " . ($payload['payment_method'] ?? ucfirst($gateway)) . "\n- Jumlah Bayar: *Rp " . number_format($amountPaid, 0, ',', '.') . "*\n- Tanggal Bayar: " . Carbon::now()->format('d-m-Y H:i') . "\n\nLayanan internet Anda otomatis aktif kembali secara instan. Terima kasih atas kepercayaan Anda.";
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
}
