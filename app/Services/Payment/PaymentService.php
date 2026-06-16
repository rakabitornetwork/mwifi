<?php

namespace App\Services\Payment;

use App\Services\SettingService;
use App\Services\Payment\Drivers\TripayGateway;
use App\Services\Payment\Drivers\MidtransGateway;
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
            default:
                throw new Exception("Payment gateway driver [{$activeGateway}] is not supported.");
        }
    }
}
