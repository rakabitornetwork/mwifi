<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Invoice;
use App\Support\PhoneNumber;
use Carbon\Carbon;
use Illuminate\Support\Str;

class VpsCatalogService
{
    public const SETTING_ENABLED = 'vps.enabled';

    public const SETTING_PAGE_TITLE = 'vps.page_title';

    public const SETTING_PAGE_DESCRIPTION = 'vps.page_description';

    public const SETTING_WHITELIST_USERNAMES = 'vps.whitelist_usernames';

    public const SETTING_WHITELIST_PHONES = 'vps.whitelist_phones';

    public const SETTING_PLANS = 'vps.plans';

    /**
     * @return list<array{id: string, name: string, cpu: string, ram: string, storage: string, bandwidth: string, price: int, description: string, featured: bool}>
     */
    public static function defaultPlans(): array
    {
        return [
            [
                'id' => 'starter',
                'name' => 'VPS Starter',
                'cpu' => '1 vCPU',
                'ram' => '2 GB RAM',
                'storage' => '40 GB SSD NVMe',
                'bandwidth' => '1 TB / bulan',
                'price' => 99000,
                'description' => 'Cocok untuk website kecil, API ringan, atau panel administrasi.',
                'featured' => false,
            ],
            [
                'id' => 'business',
                'name' => 'VPS Business',
                'cpu' => '2 vCPU',
                'ram' => '4 GB RAM',
                'storage' => '80 GB SSD NVMe',
                'bandwidth' => '2 TB / bulan',
                'price' => 199000,
                'description' => 'Untuk aplikasi bisnis, e-commerce menengah, dan layanan SaaS awal.',
                'featured' => true,
            ],
            [
                'id' => 'enterprise',
                'name' => 'VPS Enterprise',
                'cpu' => '4 vCPU',
                'ram' => '8 GB RAM',
                'storage' => '160 GB SSD NVMe',
                'bandwidth' => 'Unmetered Fair Usage',
                'price' => 399000,
                'description' => 'Performa tinggi untuk database, aplikasi produksi, dan traffic besar.',
                'featured' => false,
            ],
        ];
    }

    public static function isEnabled(): bool
    {
        return SettingService::get(self::SETTING_ENABLED, '0') === '1';
    }

    public static function pageTitle(): string
    {
        return (string) SettingService::get(self::SETTING_PAGE_TITLE, 'Sewa VPS Cloud Indonesia');
    }

    public static function pageDescription(): string
    {
        return (string) SettingService::get(
            self::SETTING_PAGE_DESCRIPTION,
            'Layanan Virtual Private Server (VPS) dengan SSD NVMe, jaringan stabil, dan dukungan teknis. Pilih paket sesuai kebutuhan server Anda.'
        );
    }

    /**
     * @return list<array{id: string, name: string, cpu: string, ram: string, storage: string, bandwidth: string, price: int, description: string, featured: bool}>
     */
    public static function plans(): array
    {
        $raw = SettingService::get(self::SETTING_PLANS, '');

        if ($raw === '' || $raw === null) {
            return self::defaultPlans();
        }

        $decoded = json_decode((string) $raw, true);

        if (! is_array($decoded) || $decoded === []) {
            return self::defaultPlans();
        }

        return collect($decoded)
            ->map(function (array $plan) {
                return [
                    'id' => (string) ($plan['id'] ?? Str::slug((string) ($plan['name'] ?? 'plan'))),
                    'name' => (string) ($plan['name'] ?? 'VPS Plan'),
                    'cpu' => (string) ($plan['cpu'] ?? '-'),
                    'ram' => (string) ($plan['ram'] ?? '-'),
                    'storage' => (string) ($plan['storage'] ?? '-'),
                    'bandwidth' => (string) ($plan['bandwidth'] ?? '-'),
                    'price' => max(0, (int) ($plan['price'] ?? 0)),
                    'description' => (string) ($plan['description'] ?? ''),
                    'featured' => (bool) ($plan['featured'] ?? false),
                ];
            })
            ->filter(fn (array $plan) => $plan['id'] !== '' && $plan['price'] > 0)
            ->values()
            ->all();
    }

    public static function findPlan(string $planId): ?array
    {
        foreach (self::plans() as $plan) {
            if ($plan['id'] === $planId) {
                return $plan;
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    public static function whitelistUsernames(): array
    {
        return self::parseList((string) SettingService::get(self::SETTING_WHITELIST_USERNAMES, ''));
    }

    /**
     * @return list<string>
     */
    public static function whitelistPhones(): array
    {
        return self::parseList((string) SettingService::get(self::SETTING_WHITELIST_PHONES, ''));
    }

    public static function customerCanOrder(?Customer $customer): bool
    {
        if (! $customer) {
            return false;
        }

        $usernames = self::whitelistUsernames();
        $phones = self::whitelistPhones();

        if ($usernames === [] && $phones === []) {
            return false;
        }

        $usernameMatch = $usernames === []
            || in_array(strtolower(trim($customer->username)), array_map('strtolower', $usernames), true);

        $phoneMatch = $phones === []
            || self::phoneMatchesWhitelist($customer->phone_number, $phones);

        if ($usernames !== [] && $phones !== []) {
            return $usernameMatch && $phoneMatch;
        }

        return $usernameMatch || $phoneMatch;
    }

    /**
     * @param  list<string>  $whitelist
     */
    public static function phoneMatchesWhitelist(string $phone, array $whitelist): bool
    {
        $customerVariants = PhoneNumber::variants($phone);

        foreach ($whitelist as $entry) {
            $entryVariants = PhoneNumber::variants($entry);

            if ($entryVariants === []) {
                continue;
            }

            if (array_intersect($customerVariants, $entryVariants) !== []) {
                return true;
            }
        }

        return false;
    }

    public static function isVpsInvoice(Invoice $invoice): bool
    {
        return str_starts_with((string) $invoice->billing_period, 'vps:')
            || str_starts_with((string) $invoice->invoice_number, 'VPS-');
    }

    public static function planFromInvoice(Invoice $invoice): ?array
    {
        if (! self::isVpsInvoice($invoice)) {
            return null;
        }

        $slug = str_starts_with((string) $invoice->billing_period, 'vps:')
            ? substr((string) $invoice->billing_period, 4)
            : null;

        if ($slug) {
            return self::findPlan($slug);
        }

        return null;
    }

    public static function itemLabelForInvoice(Invoice $invoice): string
    {
        $plan = self::planFromInvoice($invoice);

        if ($plan) {
            return 'Sewa VPS — ' . $plan['name'] . ' (Bulanan)';
        }

        return 'Sewa VPS Cloud (Bulanan)';
    }

    public static function createOrderInvoice(Customer $customer, string $planId): Invoice
    {
        $plan = self::findPlan($planId);

        if (! $plan) {
            throw new \InvalidArgumentException('Paket VPS tidak ditemukan.');
        }

        $taxRate = (float) SettingService::get('system.tax_rate', '0');
        $amount = (float) $plan['price'];
        $tax = round($amount * $taxRate, 2);
        $total = $amount + $tax;

        $invoiceNumber = 'VPS-' . strtoupper($plan['id']) . '-' . str_pad((string) $customer->id, 4, '0', STR_PAD_LEFT)
            . '-' . strtoupper(bin2hex(random_bytes(2)));

        return Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => $invoiceNumber,
            'billing_period' => 'vps:' . $plan['id'],
            'amount' => $amount,
            'tax' => $tax,
            'total_amount' => $total,
            'due_date' => Carbon::today()->addDays(3),
            'status' => 'unpaid',
        ]);
    }

    /**
     * @return list<string>
     */
    protected static function parseList(string $raw): array
    {
        $raw = trim($raw);

        if ($raw === '') {
            return [];
        }

        if (str_starts_with($raw, '[')) {
            $decoded = json_decode($raw, true);

            if (is_array($decoded)) {
                return array_values(array_filter(array_map(
                    fn ($item) => trim((string) $item),
                    $decoded
                )));
            }
        }

        return array_values(array_filter(array_map(
            'trim',
            preg_split('/[\r\n,;]+/', $raw) ?: []
        )));
    }
}
