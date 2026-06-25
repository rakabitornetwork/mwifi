<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Router;
use App\Models\User;
use App\Services\Payment\PaymentService;
use App\Services\SettingService;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class PublicOrderController extends Controller
{
    public function store(Request $request)
    {
        $planIds = collect(\App\Services\VpsCatalogService::plans())->pluck('id')->implode(',');

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

        $plan = \App\Services\VpsCatalogService::findPlan($serviceType);
        if (!$plan) {
            return response()->json([
                'success' => false,
                'message' => 'Layanan tidak valid atau tidak ditemukan.',
            ], 422);
        }

        $serviceDetails = [
            'name' => $plan['name'],
            'price' => (float) $plan['price'],
            'description' => $plan['description'] ?: $plan['name'],
        ];

        try {
            // Find or create Package for the service
            $package = Package::firstOrCreate(
                ['name' => $serviceDetails['name']],
                [
                    'price' => $serviceDetails['price'],
                    'description' => $serviceDetails['description'],
                    'type' => 'pppoe',
                    'bandwidth_limit' => '100M',
                    'mikrotik_profile' => Str::slug($serviceDetails['name']),
                ]
            );

            // Find or create User & Customer
            $customer = Customer::where('phone_number', $phone)
                ->orWhereHas('user', function ($q) use ($email) {
                    $q->where('email', $email);
                })
                ->first();

            if (!$customer) {
                // Check if user exists
                $user = User::where('email', $email)->first();
                if (!$user) {
                    $user = User::create([
                        'name' => $name,
                        'email' => $email,
                        'password' => Hash::make($phone),
                    ]);
                }

                $customer = Customer::create([
                    'user_id' => $user->id,
                    'router_id' => Router::first()?->id,
                    'package_id' => $package->id,
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
            } else {
                // If customer exists, make sure package is updated or linked
                $customer->update([
                    'package_id' => $package->id,
                ]);
            }

            // Create Invoice
            $taxRate = (float) SettingService::get('system.tax_rate', '0');
            $amount = $serviceDetails['price'];
            $tax = round($amount * $taxRate, 2);
            $total = $amount + $tax;

            $invoiceNumber = 'SRV-' . strtoupper(substr($serviceType, 0, 3)) . '-' . time() . '-' . rand(10, 99);

            $invoice = Invoice::create([
                'customer_id' => $customer->id,
                'invoice_number' => $invoiceNumber,
                'billing_period' => 'service:' . $serviceType,
                'amount' => $amount,
                'tax' => $tax,
                'total_amount' => $total,
                'due_date' => now()->addDays(3),
                'status' => 'unpaid',
            ]);

            // Call Payment Gateway Driver
            $driver = PaymentService::getDriver();
            
            // Map payment method codes for specific gateway drivers
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

            // Clean up invoice if gateway failed
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
