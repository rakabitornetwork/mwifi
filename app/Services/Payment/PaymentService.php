<?php

namespace App\Services\Payment;

use App\Services\SettingService;
use App\Services\Payment\Drivers\TripayGateway;
use App\Services\Payment\Drivers\MidtransGateway;
use App\Services\Payment\Drivers\DuitkuGateway;
use Exception;

class PaymentService
{
    /**
     * Get the active payment gateway driver instance.
     *
     * @return PaymentGatewayInterface
     * @throws Exception
     */
    public static function getDriver(): PaymentGatewayInterface
    {
        $activeGateway = SettingService::get('payment.active_gateway', 'tripay');

        switch (strtolower($activeGateway)) {
            case 'tripay':
                return new TripayGateway();
            case 'midtrans':
                return new MidtransGateway();
            case 'duitku':
                return new DuitkuGateway();
            default:
                throw new Exception("Payment gateway driver [{$activeGateway}] is not supported.");
        }
    }

    /**
     * Detect which gateway sent a webhook based on payload/headers.
     *
     * @return array{0: PaymentGatewayInterface, 1: string}
     */
    public static function resolveDriverForWebhook(array $headers, array $payload): array
    {
        if (isset($payload['signature_key'], $payload['order_id'])) {
            return [new MidtransGateway(), 'midtrans'];
        }

        if (isset($payload['merchantCode'], $payload['merchantOrderId'], $payload['signature'], $payload['resultCode'])) {
            return [new DuitkuGateway(), 'duitku'];
        }

        $tripaySignature = $headers['x-callback-signature'][0]
            ?? ($headers['X-Callback-Signature'][0] ?? null);

        if ($tripaySignature) {
            return [new TripayGateway(), 'tripay'];
        }

        $activeGateway = SettingService::get('payment.active_gateway', 'tripay');

        return [self::getDriver(), $activeGateway];
    }
}
