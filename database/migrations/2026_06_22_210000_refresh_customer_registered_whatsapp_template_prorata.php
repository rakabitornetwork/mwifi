<?php

use App\Models\Setting;
use App\Services\MessageTemplateService;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        $key = 'whatsapp.template.customer_registered';
        $value = MessageTemplateService::defaults()[$key] ?? '';

        if ($value === '') {
            return;
        }

        Setting::updateOrCreate(
            ['key' => $key],
            [
                'group' => 'whatsapp',
                'value' => $value,
                'is_encrypted' => false,
            ]
        );
    }

    public function down(): void
    {
        //
    }
};
