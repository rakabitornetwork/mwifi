<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Services\BillingService;
use App\Services\Payment\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentWebhookController extends Controller
{
    /**
     * Handle payment gateway webhook callbacks.
     */
    public function handle(Request $request)
    {
        if ($request->isMethod('GET')) {
            return response()->json([
                'ok' => true,
                'message' => 'mWiFi payment webhook endpoint is reachable.',
            ]);
        }

        $payload = $request->json()->all();
        $headers = $request->headers->all();

        Log::info('Payment webhook callback received.', [
            'headers' => $headers,
            'payload' => $payload,
        ]);

        try {
            [$driver, $gatewayName] = PaymentService::resolveDriverForWebhook($headers, $payload);

            if (! $driver->verifyWebhook($headers, $payload)) {
                Log::warning("Payment webhook signature verification failed for gateway: {$gatewayName}");
                return response()->json(['message' => 'Invalid signature'], 401);
            }

            $data = $driver->extractWebhookData($payload);

            if (empty($data['invoice_number'])) {
                Log::warning('Payment webhook: missing invoice number in payload.');

                return response()->json([
                    'success' => true,
                    'message' => 'Webhook acknowledged; missing invoice number.',
                ]);
            }

            $invoice = Invoice::where('invoice_number', $data['invoice_number'])->with('customer')->first();

            if (! $invoice) {
                Log::warning("Payment webhook: Invoice {$data['invoice_number']} not found.");

                // Midtrans expects HTTP 200 even for unknown order IDs (e.g. test notifications).
                return response()->json([
                    'success' => true,
                    'message' => 'Webhook acknowledged; invoice not found.',
                ]);
            }

            if ($data['status'] === 'paid') {
                $processed = BillingService::processPaidInvoice(
                    $invoice,
                    $gatewayName,
                    $data['reference'],
                    $data['amount_paid'],
                    $data['fee'],
                    $payload
                );

                if ($processed) {
                    return response()->json(['success' => true, 'message' => 'Invoice paid and customer reactivated']);
                }

                return response()->json(['message' => 'Failed to process payment status'], 500);
            }

            return response()->json(['success' => true, 'message' => 'Webhook received with status: ' . $data['status']]);

        } catch (\Exception $e) {
            Log::error('Payment webhook error: ' . $e->getMessage());

            return response()->json(['message' => 'Internal Server Error: ' . $e->getMessage()], 500);
        }
    }
}
