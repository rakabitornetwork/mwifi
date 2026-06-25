<?php

use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $defaults = [
            ['group' => 'payment', 'key' => 'payment.duitku.mode', 'value' => 'sandbox', 'is_encrypted' => false],
            ['group' => 'payment', 'key' => 'payment.duitku.merchant_code', 'value' => '', 'is_encrypted' => false],
            ['group' => 'payment', 'key' => 'payment.duitku.api_key', 'value' => '', 'is_encrypted' => true],
        ];

        foreach ($defaults as $row) {
            Setting::firstOrCreate(
                ['key' => $row['key']],
                $row
            );
        }
    }

    public function down(): void
    {
        Setting::whereIn('key', [
            'payment.duitku.mode',
            'payment.duitku.merchant_code',
            'payment.duitku.api_key',
        ])->delete();
    }
};
