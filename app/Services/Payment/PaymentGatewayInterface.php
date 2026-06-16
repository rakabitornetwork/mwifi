<?php

namespace App\Services\Payment;

use App\Models\Invoice;

interface PaymentGatewayInterface
{
    /**
     * Create a payment transaction for an invoice.
     *
     * @param Invoice $invoice
     * @param string $paymentMethod e.g. "qris", "va_mandiri", etc.
     * @return array Contains keys like 'reference', 'payment_url', 'fee', 'amount', 'qr_data'
     */
    public function createTransaction(Invoice $invoice, string $paymentMethod): array;

    /**
     * Verify the authenticity of a webhook request.
     *
     * @param array $headers Request headers
     * @param array $payload Request JSON payload (parsed as array)
     * @return bool
     */
    public function verifyWebhook(array $headers, array $payload): bool;

    /**
     * Extract relevant data from the webhook payload.
     *
     * @param array $payload Webhook payload
     * @return array Contains keys like 'invoice_number', 'reference', 'status', 'amount_paid', 'fee', 'payment_method'
     */
    public function extractWebhookData(array $payload): array;
}
