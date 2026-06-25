<?php

use App\Models\Setting;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Setting::firstOrCreate(
            ['key' => 'system.terms_of_service'],
            [
                'group' => 'system',
                'value' => '',
                'is_encrypted' => false,
            ]
        );
    }

    public function down(): void
    {
        Setting::where('key', 'system.terms_of_service')->delete();
    }
};
