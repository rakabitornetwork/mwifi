<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('settings')) {
                config([
                    'services.midtrans.client_key' => setting('payment.midtrans.client_key'),
                    'services.midtrans.server_key' => setting('payment.midtrans.server_key'),
                    'services.tripay.api_key' => setting('payment.tripay.api_key'),
                    'services.tripay.merchant_code' => setting('payment.tripay.merchant_code'),
                    'services.tripay.private_key' => setting('payment.tripay.private_key'),
                    'services.whatsapp.api_url' => setting('whatsapp.api_url'),
                    'services.whatsapp.api_key' => setting('whatsapp.api_key'),
                    'services.whatsapp.session_id' => setting('whatsapp.session_id'),
                    'services.genieacs.api_url' => setting('genieacs.api_url'),
                ]);
            }
        } catch (\Exception $e) {
            // Menghindari error saat migrasi atau CLI dijalankan pertama kali
        }
    }
}
