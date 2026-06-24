<?php

namespace App\Services\Payment;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class PaymentHttp
{
    /**
     * HTTP client tuned for external payment gateways (Tripay, Midtrans).
     * Uses an explicit CA bundle when available to avoid slow/failed TLS on Windows PHP.
     */
    public static function client(): PendingRequest
    {
        $request = Http::connectTimeout(30)->timeout(45);

        $caBundle = self::resolveCaBundle();
        if (is_string($caBundle)) {
            return $request->withOptions(['verify' => $caBundle]);
        }

        return $request;
    }

    /**
     * @return string|bool CA bundle path, or true for default Guzzle verification
     */
    private static function resolveCaBundle(): string|bool
    {
        foreach ([ini_get('curl.cainfo'), ini_get('openssl.cafile')] as $path) {
            if (is_string($path) && $path !== '' && is_file($path)) {
                return $path;
            }
        }

        return true;
    }
}
