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

        $customer->loadMissing(['package', 'router', 'odp', 'user']);
        $resolvedPackage = $package ?? $customer->package;
        $billingPreview = BillingService::previewRegistrationBilling($customer, $resolvedPackage?->price);
        $portalEmail = $customer->displayPortalEmail();

        $variables = [
            'customer_name' => $customer->name,
            'brand_name' => BrandingService::companyName(),
            'username' => $customer->username,
            'password' => $customer->password,
            'phone_number' => self::displayValue($customer->phone_number),
            'address' => self::displayValue($customer->address),
            'portal_email_line' => $portalEmail !== null
                ? "\n• Email Portal : {$portalEmail}"
                : '',
            'router_name' => self::displayValue($customer->router?->name),
            'package_name' => self::displayValue($resolvedPackage?->name),
            'monthly_price' => $billingPreview['monthly_price'] ?? '-',
            'package_bandwidth' => self::displayValue($resolvedPackage?->bandwidth_limit),
            'odp_name' => self::displayValue($customer->odp?->name),
            'gps_coordinates' => self::gpsCoordinates($customer),
            'maps_link_line' => self::mapsLinkLine($customer),
            'service_type' => strtoupper((string) $customer->service_type),
            'billing_date' => (string) $customer->billing_date,
            'status_label' => self::statusLabel((string) $customer->status),
            'billing_info' => $billingPreview['billing_info'] ?? '',
            'billing_period' => $billingPreview['period_label'] ?? '-',
            'due_date' => $billingPreview['due_date'] ?? '-',
            'estimated_subtotal' => $billingPreview['estimated_subtotal'] ?? '-',
            'estimated_total' => $billingPreview['estimated_total'] ?? '-',
            'prorata_line' => $billingPreview['prorata_line'] ?? '',
        ];

        $message = MessageTemplateService::render('whatsapp.template.customer_registered', $variables);

        return WhatsAppService::sendText($phone, $message, skipBulkDelay: true);
    }

    private static function displayValue(mixed $value): string
    {
        $value = trim((string) $value);

        return $value !== '' ? $value : '-';
    }

    private static function gpsCoordinates(Customer $customer): string
    {
        if ($customer->latitude !== null && $customer->longitude !== null) {
            return "{$customer->latitude}, {$customer->longitude}";
        }

        return '-';
    }

    private static function mapsLinkLine(Customer $customer): string
    {
        if ($customer->latitude === null || $customer->longitude === null) {
            return '';
        }

        $url = "https://www.google.com/maps?q={$customer->latitude},{$customer->longitude}";

        return "• Google Maps : {$url}";
    }
}
