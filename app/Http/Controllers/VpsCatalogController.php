<?php

namespace App\Http\Controllers;

use App\Services\Payment\PaymentService;
use App\Services\SettingService;
use App\Services\VpsCatalogService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class VpsCatalogController extends Controller
{
    public function index(Request $request): Response
    {
        if (! VpsCatalogService::isEnabled()) {
            abort(404);
        }

        $user = $request->user();
        $customer = $user?->customer;

        if ($customer && VpsCatalogService::isShowcaseCustomer($customer)) {
            $request->session()->put('customer_portal_vps_showcase', true);
        }

        return Inertia::render('Public/VpsCatalog', [
            'pageTitle' => VpsCatalogService::pageTitle(),
            'pageDescription' => VpsCatalogService::pageDescription(),
            'plans' => VpsCatalogService::plans(),
            'canOrder' => VpsCatalogService::customerCanOrder($customer),
            'isLoggedIn' => (bool) $customer,
            'customerName' => $customer?->name,
            'activeGateway' => SettingService::get('payment.active_gateway', 'tripay'),
            'catalogUrl' => url('/layanan/vps'),
        ]);
    }

    public function order(Request $request)
    {
        if (! VpsCatalogService::isEnabled()) {
            abort(404);
        }

        $request->validate([
            'plan_id' => 'required|string|max:64',
            'payment_method' => 'nullable|string',
        ]);

        $user = Auth::user();
        $customer = $user?->customer;

        if (! $customer) {
            return response()->json([
                'success' => false,
                'message' => 'Silakan login portal pelanggan terlebih dahulu.',
                'login_url' => route('portal.login', ['redirect' => '/layanan/vps']),
            ], 401);
        }

        if (! VpsCatalogService::customerCanOrder($customer)) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda belum diizinkan memesan layanan VPS ini.',
            ], 403);
        }

        $planId = $request->input('plan_id');

        if (! VpsCatalogService::findPlan($planId)) {
            return response()->json([
                'success' => false,
                'message' => 'Paket VPS tidak valid.',
            ], 422);
        }

        try {
            $invoice = VpsCatalogService::createOrderInvoice($customer, $planId);
            $driver = PaymentService::getDriver();
            $paymentMethod = $request->input('payment_method', 'all');
            $transaction = $driver->createTransaction($invoice, (string) $paymentMethod);

            if ($transaction['success'] ?? false) {
                return response()->json([
                    'success' => true,
                    'reference' => $transaction['reference'],
                    'payment_url' => $transaction['payment_url'],
                    'invoice_number' => $invoice->invoice_number,
                    'message' => 'Transaksi pembayaran VPS berhasil dibuat.',
                ]);
            }

            $invoice->delete();

            return response()->json([
                'success' => false,
                'message' => $transaction['message'] ?? 'Gagal membuat transaksi ke payment gateway.',
            ], 400);
        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan sistem: ' . $e->getMessage(),
            ], 500);
        }
    }
}
