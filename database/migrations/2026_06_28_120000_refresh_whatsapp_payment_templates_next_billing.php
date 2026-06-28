<?php

use App\Models\Setting;
use App\Services\MessageTemplateService;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    private const PAYMENT_TEMPLATE_KEYS = [
        'whatsapp.template.payment_received',
        'whatsapp.template.payment_reactivated',
    ];

    public function up(): void
    {
        foreach (self::PAYMENT_TEMPLATE_KEYS as $key) {
            $default = MessageTemplateService::defaults()[$key] ?? null;
            if ($default === null) {
                continue;
            }

            $existing = Setting::query()->where('key', $key)->value('value');

            if (!is_string($existing) || trim($existing) === '') {
                Setting::updateOrCreate(
                    ['key' => $key],
                    [
                        'group' => 'whatsapp',
                        'value' => $default,
                        'is_encrypted' => false,
                    ]
                );

                continue;
            }

            if (str_contains($existing, '{next_billing_block}')) {
                continue;
            }

            $patched = str_replace(
                '• Waktu Bayar   : {paid_at}{footer_note}',
                '• Waktu Bayar   : {paid_at}{next_billing_block}{footer_note}',
                $existing
            );

            if ($patched === $existing) {
                Setting::updateOrCreate(
                    ['key' => $key],
                    [
                        'group' => 'whatsapp',
                        'value' => $default,
                        'is_encrypted' => false,
                    ]
                );

                continue;
            }

            Setting::query()->where('key', $key)->update(['value' => $patched]);
        }
    }

    public function down(): void
    {
        foreach (self::PAYMENT_TEMPLATE_KEYS as $key) {
            $value = Setting::query()->where('key', $key)->value('value');
            if (!is_string($value)) {
                continue;
            }

            $reverted = str_replace(
                '• Waktu Bayar   : {paid_at}{next_billing_block}{footer_note}',
                '• Waktu Bayar   : {paid_at}{footer_note}',
                $value
            );

            if ($reverted !== $value) {
                Setting::query()->where('key', $key)->update(['value' => $reverted]);
            }
        }
    }
};
