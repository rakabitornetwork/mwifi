<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Setting;

return new class extends Migration
{
    public function up(): void
    {
        $defaults = [
            'system.footer_copyright' => '© {year} {company}. All rights reserved.',
            'system.seo_title' => '',
            'system.seo_description' => '',
            'system.seo_keywords' => '',
            'system.seo_robots' => 'index,follow',
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
            'system.footer_copyright',
            'system.seo_title',
            'system.seo_description',
            'system.seo_keywords',
            'system.seo_robots',
        ])->delete();
    }
};
