<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Invoice;
use App\Support\PhoneNumber;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class VpsCatalogService
{
    public const SETTING_ENABLED = 'vps.enabled';

    public const SETTING_PAGE_TITLE = 'vps.page_title';

    public const SETTING_PAGE_DESCRIPTION = 'vps.page_description';

    public const SETTING_WHITELIST_USERNAMES = 'vps.whitelist_usernames';

    public const SETTING_WHITELIST_PHONES = 'vps.whitelist_phones';

    public const SETTING_PLANS = 'vps.plans';

    public const SETTING_DEMO_LINK_DAYS = 'vps.demo_link_days';

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
        if (! $customer || ! self::isEnabled()) {
            return false;
        }

        $usernames = self::whitelistUsernames();
        $phones = self::whitelistPhones();

        if ($usernames === [] && $phones === []) {
            return false;
        }

        $usernameMatch = $usernames === []
            || self::usernameMatchesWhitelist((string) $customer->username, $usernames);

        $phoneMatch = $phones === []
            || self::phoneMatchesWhitelist(self::resolveCustomerPhone($customer), $phones);

        if ($usernames !== [] && $phones !== []) {
            return $usernameMatch && $phoneMatch;
        }

        return $usernameMatch && $phoneMatch;
    }

    /**
     * Pelanggan fiktif VPS (whitelist) — tampilan portal memakai persona cloud, bukan PPPoE.
     * Cukup cocok username ATAU nomor WhatsApp pada whitelist (lebih longgar dari aturan checkout).
     */
    public static function isShowcaseCustomer(?Customer $customer): bool
    {
        if (! $customer || ! self::isEnabled()) {
            return false;
        }

        $usernames = self::whitelistUsernames();
        $phones = self::whitelistPhones();

        if ($usernames === [] && $phones === []) {
            return false;
        }

        $usernameMatch = $usernames !== []
            && self::usernameMatchesWhitelist((string) $customer->username, $usernames);

        $phoneMatch = $phones !== []
            && self::phoneMatchesWhitelist(self::resolveCustomerPhone($customer), $phones);

        return $usernameMatch || $phoneMatch;
    }

    public static function shouldUseShowcasePortal(?Customer $customer, bool $vpsLoginIntent = false): bool
    {
        if ($vpsLoginIntent && self::isEnabled()) {
            return true;
        }

        return self::isShowcaseCustomer($customer);
    }

    public static function resolveCustomerPhone(Customer $customer): string
    {
        $phone = trim((string) $customer->phone_number);

        if ($phone !== '') {
            return $phone;
        }

        return trim((string) ($customer->user?->phone_number ?? ''));
    }

    /**
     * @param  list<string>  $whitelist
     */
    public static function usernameMatchesWhitelist(string $username, array $whitelist): bool
    {
        $username = strtolower(trim($username));

        if ($username === '') {
            return false;
        }

        foreach ($whitelist as $entry) {
            $entry = strtolower(trim($entry));

            if ($entry === '') {
                continue;
            }

            if ($username === $entry) {
                return true;
            }

            if (str_starts_with($username, $entry . '@')) {
                return true;
            }

            if (str_starts_with($entry, $username . '@')) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array{
     *     portal_view: string,
     *     customer: array{name: string, phone_number: string, server_id: string, status: string, billing_cycle: string, region: string},
     *     vps_plan: ?array,
     *     catalog_url: string
     * }
     */
    public static function showcasePortalData(Customer $customer): array
    {
        $plan = self::resolveDisplayPlanForCustomer($customer);
        $planId = $plan['id'] ?? 'cloud';

        return [
            'portal_view' => 'vps',
            'customer' => [
                'name' => $customer->name,
                'phone_number' => PhoneNumber::mask((string) $customer->phone_number),
                'server_id' => 'SRV-' . strtoupper($planId) . '-' . str_pad((string) $customer->id, 5, '0', STR_PAD_LEFT),
                'status' => self::mapVpsServerStatus((string) $customer->status),
                'billing_cycle' => 'Bulanan (prepaid)',
                'region' => 'IDC Jakarta',
            ],
            'vps_plan' => $plan,
            'catalog_url' => url('/layanan/vps'),
        ];
    }

    /**
     * @return ?array{id: string, name: string, cpu: string, ram: string, storage: string, bandwidth: string, price: int, description: string, featured: bool}
     */
    public static function resolveDisplayPlanForCustomer(Customer $customer): ?array
    {
        $latestVpsInvoice = Invoice::query()
            ->where('customer_id', $customer->id)
            ->where(function ($query) {
                $query->where('billing_period', 'like', 'vps:%')
                    ->orWhere('invoice_number', 'like', 'VPS-%');
            })
            ->latest('created_at')
            ->first();

        if ($latestVpsInvoice) {
            $fromInvoice = self::planFromInvoice($latestVpsInvoice);
            if ($fromInvoice) {
                return $fromInvoice;
            }
        }

        $plans = self::plans();
        $featured = collect($plans)->first(fn (array $plan) => ! empty($plan['featured']));

        return $featured ?? $plans[0] ?? null;
    }

    /**
     * @return array<string, mixed>
     */
    public static function transformInvoiceForShowcase(Invoice $invoice): array
    {
        $plan = self::planFromInvoice($invoice);
        $periodLabel = $plan
            ? $plan['name'] . ' · ' . now()->locale('id')->translatedFormat('M Y')
            : 'Sewa VPS Cloud';

        return [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'billing_period' => $periodLabel,
            'service_label' => self::itemLabelForInvoice($invoice),
            'amount' => (float) $invoice->amount,
            'tax' => (float) $invoice->tax,
            'total_amount' => (float) $invoice->total_amount,
            'due_date' => $invoice->due_date?->format('Y-m-d'),
            'paid_at' => $invoice->paid_at?->toIso8601String(),
            'status' => $invoice->status,
            'is_prorated' => false,
            'days_billed' => null,
            'next_billing' => null,
        ];
    }

    public static function mapVpsServerStatus(string $customerStatus): string
    {
        return match ($customerStatus) {
            'active' => 'running',
            'isolated' => 'suspended',
            'inactive' => 'stopped',
            'suspended' => 'suspended',
            default => 'running',
        };
    }

    public static function vpsStatusLabel(string $vpsStatus): string
    {
        return match ($vpsStatus) {
            'running' => 'SERVER AKTIF',
            'suspended' => 'SERVER SUSPEND',
            'stopped' => 'SERVER NONAKTIF',
            default => 'SERVER AKTIF',
        };
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

    public static function demoLinkExpiryDays(): int
    {
        $days = (int) SettingService::get(self::SETTING_DEMO_LINK_DAYS, '30');

        return max(1, min(90, $days));
    }

    /**
     * @return Collection<int, Customer>
     */
    public static function showcaseCustomers(): Collection
    {
        if (! self::isEnabled()) {
            return collect();
        }

        if (self::whitelistUsernames() === [] && self::whitelistPhones() === []) {
            return collect();
        }

        return Customer::query()
            ->with('user')
            ->orderBy('name')
            ->get()
            ->filter(fn (Customer $customer) => self::isShowcaseCustomer($customer))
            ->values();
    }

    public static function generateDemoLoginUrl(Customer $customer): ?string
    {
        if (! self::isShowcaseCustomer($customer)) {
            return null;
        }

        return URL::temporarySignedRoute(
            'portal.demo.login',
            now()->addDays(self::demoLinkExpiryDays()),
            ['customer' => $customer->id],
        );
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
