<?php

use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Setting::firstOrCreate(
            ['key' => 'hotspot.default_commission_percent'],
            [
                'group' => 'hotspot',
                'value' => '20',
                'is_encrypted' => false,
            ]
        );
    }

    public function down(): void
    {
        Setting::where('key', 'hotspot.default_commission_percent')->delete();
    }
};
