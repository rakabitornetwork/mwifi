<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Setting;

return new class extends Migration
{
    public function up(): void
    {
        $defaults = [
            'system.app_name' => 'mWiFi',
            'system.company_tagline' => 'Network Operations Console',
            'system.company_email' => '',
            'system.company_phone' => '',
            'system.company_address' => '',
            'system.company_website' => '',
        ];

        foreach ($defaults as $key => $value) {
            Setting::firstOrCreate(
                ['key' => $key],
                [
                    'group' => 'system',
                    'value' => $value,
                    'is_encrypted' => false,
                ]
            );
        }
    }

    public function down(): void
    {
        Setting::whereIn('key', [
            'system.app_name',
            'system.company_tagline',
            'system.company_email',
            'system.company_phone',
            'system.company_address',
            'system.company_website',
            'system.logo',
            'system.favicon',
        ])->delete();
    }
};
