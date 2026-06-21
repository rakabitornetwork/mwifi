<?php

use App\Models\Setting;
use App\Services\MessageTemplateService;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        foreach (MessageTemplateService::defaults() as $key => $value) {
            if (Setting::where('key', $key)->exists()) {
                continue;
            }

            Setting::create([
                'group' => 'whatsapp',
                'key' => $key,
                'value' => $value,
                'is_encrypted' => false,
            ]);
        }
    }

    public function down(): void
    {
        Setting::whereIn('key', array_keys(MessageTemplateService::defaults()))->delete();
    }
};
