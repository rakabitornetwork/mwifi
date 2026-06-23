<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Package;
use Illuminate\Support\Facades\Log;

class CustomerNotificationService
{
    public static function statusLabel(string $status): string
    {
        return match ($status) {
            'active' => 'Aktif',
            'isolated' => 'Isolir',
            'inactive' => 'Nonaktif',
            'suspended' => 'Ditangguhkan',
            default => ucfirst($status),
        };
    }

    /**
     * Kirim WhatsApp selamat datang setelah pendaftaran pelanggan baru.
     */
    public static function sendRegistrationWhatsApp(Customer $customer, ?Package $package = null): bool
    {
        $phone = trim((string) $customer->phone_number);
        if ($phone === '') {
            Log::info('Registration WhatsApp skipped: empty phone number.', [
                'customer_id' => $customer->id,
                'username' => $customer->username,
            ]);

            return false;
        }

        $message = MessageTemplateService::render('whatsapp.template.customer_registered', [
            'customer_name' => $customer->name,
            'brand_name' => BrandingService::companyName(),
            'service_type' => strtoupper((string) $customer->service_type),
            'package_name' => $package?->name ?? '-',
            'username' => $customer->username,
            'password' => $customer->password,
            'billing_date' => (string) $customer->billing_date,
            'status_label' => self::statusLabel((string) $customer->status),
        ]);

        return WhatsAppService::sendText($phone, $message, skipBulkDelay: true);
    }
}
