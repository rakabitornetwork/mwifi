<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\BillingService;
use App\Services\Payment\PaymentService;
use App\Services\BrandingService;
use App\Services\SettingService;
use App\Services\VpsCatalogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Exception;

class CustomerPortalController extends Controller
{
    /**
     * Display the customer dashboard.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $customer = $user->customer()->with(['package', 'router', 'user'])->firstOrFail();

        // Get all invoices, sorted by latest
        $invoices = Invoice::where('customer_id', $customer->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $vpsLoginIntent = (bool) $request->session()->get('customer_portal_vps_showcase', false);
        $isShowcase = VpsCatalogService::shouldUseShowcasePortal($customer, $vpsLoginIntent);

        if ($isShowcase) {
            $vpsInvoices = VpsCatalogService::invoicesForShowcasePortal($invoices, $customer);
            $showcase = VpsCatalogService::showcasePortalData($customer);

            return Inertia::render('Customer/Dashboard', [
                'portalView' => 'vps',
                'showcase' => $showcase,
                'customer' => $showcase['customer'],
                'vpsPlan' => $showcase['vps_plan'],
                'catalogUrl' => $showcase['catalog_url'],
                'invoices' => $vpsInvoices
                    ->map(fn (Invoice $invoice) => VpsCatalogService::transformInvoiceForShowcase($invoice))
                    ->values(),
                'activeGateway' => SettingService::get('payment.active_gateway', 'tripay'),
            ]);
        }

        return Inertia::render('Customer/Dashboard', [
            'portalView' => 'default',
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
            'format' => 'nullable|in:half,a4,thermal',
        ]);

        $customer = Auth::user()->customer;

        if (!$customer || $invoice->customer_id !== $customer->id) {
            abort(403);
        }

        $invoice->load(['customer.package', 'payments']);
        $position = $request->query('position', 'top');
        $format = $request->query('format', 'half');

        $data = [
            'invoice' => $invoice,
            'customer' => $invoice->customer,
            'package' => $invoice->customer?->package,
            'nextBilling' => $invoice->status === 'paid'
                ? BillingService::resolveNextBillingPreview($invoice)
                : null,
            'latestPayment' => $invoice->payments->sortByDesc('created_at')->first(),
            'position' => $position,
            'branding' => BrandingService::get(),
        ];

        return match ($format) {
            'a4' => view('admin.invoices.print-a4', $data),
            'thermal' => view('admin.invoices.print-thermal', $data),
            default => view('admin.invoices.print', $data),
        };
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
