<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\BillingService;
use App\Services\Payment\PaymentService;
use App\Services\BrandingService;
use App\Services\SettingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Exception;

class CustomerPortalController extends Controller
{
    /**
     * Display the customer dashboard.
     */
    public function index()
    {
        $user = Auth::user();
        $customer = $user->customer()->with(['package', 'router'])->firstOrFail();

        // Get all invoices, sorted by latest
        $invoices = Invoice::where('customer_id', $customer->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Customer/Dashboard', [
            'customer' => $customer,
            'invoices' => BillingService::appendNextBillingToInvoices($invoices),
            'activeGateway' => SettingService::get('payment.active_gateway', 'tripay'),
        ]);
    }

    /**
     * Print invoice (half A4) for the authenticated customer.
     */
    public function printInvoice(Request $request, Invoice $invoice)
    {
        $request->validate([
            'position' => 'nullable|in:top,bottom',
        ]);

        $customer = Auth::user()->customer;

        if (!$customer || $invoice->customer_id !== $customer->id) {
            abort(403);
        }

        $invoice->load(['customer.package']);
        $position = $request->query('position', 'top');
        $nextBilling = $invoice->status === 'paid'
            ? BillingService::resolveNextBillingPreview($invoice)
            : null;

        return view('admin.invoices.print', [
            'invoice' => $invoice,
            'customer' => $invoice->customer,
            'package' => $invoice->customer?->package,
            'nextBilling' => $nextBilling,
            'position' => $position,
            'branding' => BrandingService::get(),
        ]);
    }

    /**
     * Initiate payment for an unpaid invoice.
     */
    public function payInvoice(Request $request, $invoiceId)
    {
        $request->validate([
            'payment_method' => 'required|string'
        ]);

        $user = Auth::user();
        $customer = $user->customer;
        
        $invoice = Invoice::where('id', $invoiceId)
            ->where('customer_id', $customer->id)
            ->where('status', 'unpaid')
            ->firstOrFail();

        try {
            $paymentMethod = $request->input('payment_method');
            $driver = PaymentService::getDriver();
            
            $transaction = $driver->createTransaction($invoice, $paymentMethod);

            if ($transaction['success'] ?? false) {
                return response()->json([
                    'success'     => true,
                    'reference'   => $transaction['reference'],
                    'payment_url' => $transaction['payment_url'],
                    'qr_data'     => $transaction['qr_data'] ?? '',
                    'message'     => 'Transaksi pembayaran berhasil dibuat.'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => $transaction['message'] ?? 'Gagal membuat transaksi ke payment gateway.'
            ], 400);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem: ' . $e->getMessage()
            ], 500);
        }
    }
}
