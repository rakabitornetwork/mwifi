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
            ['group' => 'system', 'key' => 'system.company_name', 'value' => 'mWiFi RT RW NET', 'is_encrypted' => false],
            ['group' => 'system', 'key' => 'system.currency', 'value' => 'IDR', 'is_encrypted' => false],
            ['group' => 'mikrotik', 'key' => 'mikrotik.active_router_id', 'value' => '', 'is_encrypted' => false],
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
    }
}
