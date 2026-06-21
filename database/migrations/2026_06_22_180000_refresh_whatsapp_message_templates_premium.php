<?php

use App\Models\Setting;
use App\Services\MessageTemplateService;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        foreach (MessageTemplateService::defaults() as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                [
                    'group' => 'whatsapp',
                    'value' => $value,
                    'is_encrypted' => false,
                ]
            );
        }
    }

    public function down(): void
    {
        // Tidak mengembalikan teks lama — template premium menggantikan versi sebelumnya.
    }
};
