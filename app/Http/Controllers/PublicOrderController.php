<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Router;
use App\Models\User;
use App\Services\Payment\PaymentService;
use App\Services\VpsCatalogService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class PublicOrderController extends Controller
{
    public function store(Request $request)
    {
        $planIds = collect(VpsCatalogService::plans())->pluck('id')->implode(',');

        $request->validate([
            'name' => 'required|string|max:150',
            'phone' => 'required|string|max:20',
            'email' => 'required|email|max:150',
            'service_type' => 'required|in:' . $planIds,
            'payment_method' => 'nullable|string',
        ]);

        $name = $request->input('name');
        $phone = \App\Support\PhoneNumber::normalize($request->input('phone'));
        $email = strtolower(trim($request->input('email')));
        $serviceType = $request->input('service_type');
        $paymentMethod = $request->input('payment_method', 'all');

        $plan = VpsCatalogService::findPlan($serviceType);
        if (! $plan) {
            return response()->json([
                'success' => false,
                'message' => 'Layanan tidak valid atau tidak ditemukan.',
            ], 422);
        }

        try {
            $customer = Customer::where('phone_number', $phone)
                ->orWhereHas('user', function ($q) use ($email) {
                    $q->where('email', $email);
                })
                ->first();

            if (! $customer) {
                $user = User::where('email', $email)->first();
                if (! $user) {
                    $user = User::create([
                        'name' => $name,
                        'email' => $email,
                        'password' => Hash::make($phone),
                    ]);
                }

                $customer = Customer::create([
                    'user_id' => $user->id,
                    'router_id' => Router::first()?->id,
                    'package_id' => null,
                    'service_type' => 'pppoe',
                    'username' => 'usr_' . preg_replace('/[^a-z0-9]/', '', strtolower($name)) . '_' . rand(100, 999),
                    'password' => $phone,
                    'name' => $name,
                    'phone_number' => $phone,
                    'address' => 'Pemesanan via Landing Page',
                    'status' => 'active',
                    'billing_date' => (int) now()->day,
                    'service_start_date' => now()->toDateString(),
                ]);
            }

            $invoice = VpsCatalogService::createOrderInvoice($customer, $serviceType);

            $driver = PaymentService::getDriver();

            $mappedMethod = (string) $paymentMethod;
            if ($driver instanceof \App\Services\Payment\Drivers\TripayGateway) {
                $mappedMethod = strtoupper($mappedMethod);
            }

            $transaction = $driver->createTransaction($invoice, $mappedMethod);

            if ($transaction['success'] ?? false) {
                return response()->json([
                    'success' => true,
                    'reference' => $transaction['reference'],
                    'payment_url' => $transaction['payment_url'],
                    'invoice_number' => $invoice->invoice_number,
                    'message' => 'Transaksi pemesanan berhasil dibuat.',
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
