<?php

namespace App\Http\Controllers\Customer;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\BillingService;
use App\Services\Payment\PaymentService;
use App\Services\BrandingService;
use App\Services\GenieAcsService;
use App\Services\SettingService;
use App\Services\VpsCatalogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
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
                'invoices' => $vpsInvoices
                    ->map(fn (Invoice $invoice) => VpsCatalogService::transformInvoiceForShowcase($invoice))
                    ->values(),
                'activeGateway' => SettingService::get('payment.active_gateway', 'tripay'),
            ]);
        }

        return Inertia::render('Customer/Dashboard', [
            'portalView' => 'default',
            'customer' => array_merge($customer->toArray(), BillingService::enrichCustomerBillingFields($customer)),
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

        $data = VpsCatalogService::mergeInvoicePrintViewData($data);

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

    /**
     * Get current WiFi credentials for the authenticated customer's ONT.
     */
    public function wifiStatus(Request $request)
    {
        $customer = Auth::user()->customer;

        if (!$customer || $customer->service_type === 'hotspot') {
            return response()->json([
                'success' => false,
                'found' => false,
                'message' => 'Layanan hotspot tidak mendukung pengaturan WiFi ONT.',
            ], 422);
        }

        try {
            $probe = $request->boolean('probe', true);
            $device = GenieAcsService::findDeviceByUsernameForWifi($customer->username, $probe);

            if ($device === null) {
                return response()->json([
                    'success' => false,
                    'found' => false,
                    'message' => 'ONT untuk username "' . $customer->username . '" belum terdaftar di GenieACS.',
                ], 404);
            }

            unset($device['_raw']);

            return response()->json([
                'success' => true,
                'found' => true,
                'device' => $device,
            ]);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'found' => false,
                'message' => 'Sistem monitoring ONT sedang tidak tersedia. Coba lagi nanti.',
            ], 503);
        }
    }

    /**
     * Update WiFi SSID and/or password for the authenticated customer's ONT.
     */
    public function updateWifi(Request $request)
    {
        $customer = Auth::user()->customer;

        if (!$customer || $customer->service_type === 'hotspot') {
            return response()->json([
                'success' => false,
                'message' => 'Layanan hotspot tidak mendukung pengaturan WiFi ONT.',
            ], 422);
        }

        $validated = $request->validate([
            'ssid' => 'nullable|string|max:32',
            'password' => 'nullable|string|min:8|max:63',
        ]);

        if (empty(trim((string) ($validated['ssid'] ?? ''))) && empty(trim((string) ($validated['password'] ?? '')))) {
            throw ValidationException::withMessages([
                'ssid' => 'Isi nama WiFi baru atau password WiFi baru.',
            ]);
        }

        $ssid = isset($validated['ssid']) ? trim($validated['ssid']) : null;
        $password = isset($validated['password']) ? trim($validated['password']) : null;

        if ($ssid === '') {
            $ssid = null;
        }
        if ($password === '') {
            $password = null;
        }

        try {
            $device = GenieAcsService::findDeviceByUsername($customer->username);

            if ($device === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'ONT Anda belum terdaftar di sistem. Hubungi support.',
                ], 404);
            }

            $rawDevice = $device['_raw'] ?? null;
            $result = GenieAcsService::updateWifiCredentials(
                $device['id'],
                $ssid,
                $password,
                is_array($rawDevice) ? $rawDevice : null
            );

            if (!($result['success'] ?? false)) {
                return response()->json($result, (int) ($result['http_status'] ?? 502));
            }

            return response()->json($result);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sistem monitoring ONT sedang tidak tersedia. Coba lagi nanti.',
            ], 503);
        }
    }

    /**
     * Ask GenieACS to connection-request the customer's ONT.
     */
    public function wakeOnt(Request $request)
    {
        $customer = Auth::user()->customer;

        if (!$customer || $customer->service_type === 'hotspot') {
            return response()->json([
                'success' => false,
                'message' => 'Layanan hotspot tidak mendukung pengaturan WiFi ONT.',
            ], 422);
        }

        try {
            $device = GenieAcsService::findDeviceByUsername($customer->username);

            if ($device === null) {
                return response()->json([
                    'success' => false,
                    'message' => 'ONT Anda belum terdaftar di sistem. Hubungi support.',
                ], 404);
            }

            $rawDevice = $device['_raw'] ?? null;
            $result = GenieAcsService::requestDeviceConnection(
                $device['id'],
                is_array($rawDevice) ? $rawDevice : null
            );

            return response()->json($result, ($result['success'] ?? false) ? 200 : 502);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sistem monitoring ONT sedang tidak tersedia. Coba lagi nanti.',
            ], 503);
        }
    }

    /**
     * Disconnect a WiFi client from the authenticated customer's ONT.
     */
    public function kickConnectedDevice(Request $request)
    {
        $customer = Auth::user()->customer;

        if (!$customer || $customer->service_type === 'hotspot') {
            return response()->json([
                'success' => false,
                'message' => 'Layanan hotspot tidak mendukung pengaturan WiFi ONT.',
            ], 422);
        }

        $validated = $request->validate([
            'device_id' => 'required|string|max:255',
            'mac' => 'required|string|max:32',
            'association_path' => 'nullable|string|max:512',
        ]);

        try {
            $device = GenieAcsService::findDeviceByUsername($customer->username);

            if ($device === null || ($device['id'] ?? null) !== $validated['device_id']) {
                return response()->json([
                    'success' => false,
                    'message' => 'ONT Anda tidak cocok dengan sesi ini.',
                ], 403);
            }

            $rawDevice = $device['_raw'] ?? null;
            $result = GenieAcsService::kickConnectedDevice(
                $device['id'],
                $validated['mac'],
                is_array($rawDevice) ? $rawDevice : null,
                $validated['association_path'] ?? null
            );

            return response()->json($result, ($result['success'] ?? false) ? 200 : (int) ($result['http_status'] ?? 502));
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Sistem monitoring ONT sedang tidak tersedia. Coba lagi nanti.',
            ], 503);
        }
    }
}
