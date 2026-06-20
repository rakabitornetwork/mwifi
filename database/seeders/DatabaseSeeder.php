<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seeding default administrator account
        User::updateOrCreate(
            ['email' => 'admin@mwifi.test'],
            [
                'name' => 'Super Admin',
                'password' => \Illuminate\Support\Facades\Hash::make('gantengmax'),
            ]
        );

        // Seeding default settings
        $defaultSettings = [
            ['group' => 'system', 'key' => 'system.app_name', 'value' => 'mWiFi', 'is_encrypted' => false],
            ['group' => 'system', 'key' => 'system.company_name', 'value' => 'mWiFi RT RW NET', 'is_encrypted' => false],
            ['group' => 'system', 'key' => 'system.company_tagline', 'value' => 'Network Operations Console', 'is_encrypted' => false],
            ['group' => 'system', 'key' => 'system.company_email', 'value' => 'admin@mwifi.test', 'is_encrypted' => false],
            ['group' => 'system', 'key' => 'system.company_phone', 'value' => '6281234567890', 'is_encrypted' => false],
            ['group' => 'system', 'key' => 'system.company_address', 'value' => 'Malang, Jawa Timur', 'is_encrypted' => false],
            ['group' => 'system', 'key' => 'system.company_website', 'value' => '', 'is_encrypted' => false],
            ['group' => 'system', 'key' => 'system.currency', 'value' => 'IDR', 'is_encrypted' => false],
            ['group' => 'system', 'key' => 'system.tax_rate', 'value' => '0', 'is_encrypted' => false],
            ['group' => 'system', 'key' => 'system.tax_rate_percent', 'value' => '11', 'is_encrypted' => false],
            ['group' => 'system', 'key' => 'system.billing_prorata_enabled', 'value' => '1', 'is_encrypted' => false],
            ['group' => 'system', 'key' => 'system.billing_generate_days_before', 'value' => '5', 'is_encrypted' => false],
            ['group' => 'system', 'key' => 'system.billing_notify_admin', 'value' => '1', 'is_encrypted' => false],
            ['group' => 'system', 'key' => 'system.billing_admin_phone', 'value' => '', 'is_encrypted' => false],
            ['group' => 'mikrotik', 'key' => 'mikrotik.active_router_id', 'value' => '', 'is_encrypted' => false],
            ['group' => 'mikrotik', 'key' => 'mikrotik.isolir_profile', 'value' => 'ISOLIR', 'is_encrypted' => false],
            ['group' => 'mikrotik', 'key' => 'mikrotik.isolir_source_router_id', 'value' => '', 'is_encrypted' => false],
            ['group' => 'payment', 'key' => 'payment.active_gateway', 'value' => 'tripay', 'is_encrypted' => false],
            ['group' => 'payment', 'key' => 'payment.midtrans.client_key', 'value' => '', 'is_encrypted' => false],
            ['group' => 'payment', 'key' => 'payment.midtrans.server_key', 'value' => '', 'is_encrypted' => true],
            ['group' => 'payment', 'key' => 'payment.tripay.api_key', 'value' => '', 'is_encrypted' => true],
            ['group' => 'payment', 'key' => 'payment.tripay.merchant_code', 'value' => '', 'is_encrypted' => false],
            ['group' => 'payment', 'key' => 'payment.tripay.private_key', 'value' => '', 'is_encrypted' => true],
            ['group' => 'whatsapp', 'key' => 'whatsapp.api_url', 'value' => 'http://localhost:3000', 'is_encrypted' => false],
            ['group' => 'whatsapp', 'key' => 'whatsapp.api_key', 'value' => '', 'is_encrypted' => true],
            ['group' => 'whatsapp', 'key' => 'whatsapp.session_id', 'value' => 'mwifi_session', 'is_encrypted' => false],
            ['group' => 'genieacs', 'key' => 'genieacs.api_url', 'value' => 'http://localhost:7557', 'is_encrypted' => false],
        ];

        foreach ($defaultSettings as $setting) {
            \App\Models\Setting::updateOrCreate(
                ['key' => $setting['key']],
                [
                    'group' => $setting['group'],
                    'value' => $setting['value'],
                    'is_encrypted' => $setting['is_encrypted'],
                ]
            );
        }

        // Seed a default Router
        $router = \App\Models\Router::updateOrCreate(
            ['host' => '103.84.12.98'],
            [
                'name' => 'CHR-Core-Virtualmin',
                'port' => 80,
                'username' => 'admin',
                'password' => 'secret_encrypted',
                'protocol_type' => 'rest_api',
                'status' => true,
            ]
        );

        // Seed a default Package
        $package = \App\Models\Package::updateOrCreate(
            ['name' => 'Family 20 Mbps'],
            [
                'price' => 150000.00,
                'bandwidth_limit' => '20M/20M',
                'mikrotik_profile' => 'Family-20M',
                'description' => 'Paket internet keluarga 20 Mbps unlimited',
            ]
        );

        // Seed some ODPs
        $odp1 = \App\Models\Odp::updateOrCreate(
            ['name' => 'ODP-JBG-01'],
            [
                'latitude' => -7.98390000,
                'longitude' => 112.62140000,
                'total_ports' => 8,
                'used_ports' => 2,
                'description' => 'Tiang listrik pojok timur Alun-alun',
            ]
        );

        $odp2 = \App\Models\Odp::updateOrCreate(
            ['name' => 'ODP-JBG-02'],
            [
                'latitude' => -7.98220000,
                'longitude' => 112.63050000,
                'total_ports' => 8,
                'used_ports' => 1,
                'description' => 'Depan ruko Swalayan A',
            ]
        );

        $odp3 = \App\Models\Odp::updateOrCreate(
            ['name' => 'ODP-JBG-03'],
            [
                'latitude' => -7.97540000,
                'longitude' => 112.62580000,
                'total_ports' => 8,
                'used_ports' => 1,
                'description' => 'Tiang dekat Masjid Jami',
            ]
        );

        // Seed some Customers with coordinates close to their respective ODPs
        $userBudi = User::updateOrCreate(
            ['email' => 'budi_pppoe@mwifi.test'],
            [
                'name' => 'Budi Santoso',
                'password' => \Illuminate\Support\Facades\Hash::make('budi123'),
            ]
        );
        \App\Models\Customer::updateOrCreate(
            ['username' => 'budi_pppoe'],
            [
                'user_id' => $userBudi->id,
                'router_id' => $router->id,
                'package_id' => $package->id,
                'odp_id' => $odp1->id,
                'service_type' => 'pppoe',
                'password' => 'budi123',
                'name' => 'Budi Santoso',
                'phone_number' => '628123456789',
                'address' => 'Jl. Merdeka No. 12, Malang',
                'latitude' => -7.98450000,
                'longitude' => 112.62250000,
                'status' => 'active',
                'billing_date' => 1,
            ]
        );

        $userSiti = User::updateOrCreate(
            ['email' => 'siti_hotspot@mwifi.test'],
            [
                'name' => 'Siti Rahma',
                'password' => \Illuminate\Support\Facades\Hash::make('siti123'),
            ]
        );
        \App\Models\Customer::updateOrCreate(
            ['username' => 'siti_hotspot'],
            [
                'user_id' => $userSiti->id,
                'router_id' => $router->id,
                'package_id' => $package->id,
                'odp_id' => $odp2->id,
                'service_type' => 'hotspot',
                'password' => 'siti123',
                'name' => 'Siti Rahma',
                'phone_number' => '628527711223',
                'address' => 'Jl. Kawi No. 4, Malang',
                'latitude' => -7.98300000,
                'longitude' => 112.63120000,
                'status' => 'active',
                'billing_date' => 1,
            ]
        );

        $userJoko = User::updateOrCreate(
            ['email' => 'joko_pppoe@mwifi.test'],
            [
                'name' => 'Joko Widodo',
                'password' => \Illuminate\Support\Facades\Hash::make('joko123'),
            ]
        );
        \App\Models\Customer::updateOrCreate(
            ['username' => 'joko_pppoe'],
            [
                'user_id' => $userJoko->id,
                'router_id' => $router->id,
                'package_id' => $package->id,
                'odp_id' => $odp3->id,
                'service_type' => 'pppoe',
                'password' => 'joko123',
                'name' => 'Joko Widodo',
                'phone_number' => '628994433221',
                'address' => 'Jl. Semeru No. 9, Malang',
                'latitude' => -7.97600000,
                'longitude' => 112.62650000,
                'status' => 'isolated',
                'billing_date' => 1,
            ]
        );

        $userDewi = User::updateOrCreate(
            ['email' => 'dewi_pppoe@mwifi.test'],
            [
                'name' => 'Dewi Lestari',
                'password' => \Illuminate\Support\Facades\Hash::make('dewi123'),
            ]
        );
        \App\Models\Customer::updateOrCreate(
            ['username' => 'dewi_pppoe'],
            [
                'user_id' => $userDewi->id,
                'router_id' => $router->id,
                'package_id' => $package->id,
                'odp_id' => $odp1->id,
                'service_type' => 'pppoe',
                'password' => 'dewi123',
                'name' => 'Dewi Lestari',
                'phone_number' => '628123456780',
                'address' => 'Jl. Trunojoyo No. 42, Malang',
                'latitude' => -7.98320000,
                'longitude' => 112.62080000,
                'status' => 'active',
                'billing_date' => 1,
            ]
        );
    }
}
