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

    /**
     * Checkout katalog VPS — aturan whitelist sama dengan portal showcase (username ATAU WhatsApp).
     */
    public static function customerCanOrder(?Customer $customer): bool
    {
        return self::isShowcaseCustomer($customer);
    }

    /**
     * Halaman /layanan/vps dapat diuji tanpa login WhatsApp jika ada pelanggan showcase.
     */
    public static function allowsGuestVerificationCheckout(): bool
    {
        return self::isEnabled() && self::showcaseCustomers()->isNotEmpty();
    }

    /**
     * Pelanggan yang dipakai untuk checkout verifikasi gateway (login opsional).
     */
    public static function resolveVerificationCustomer(?Customer $authenticated = null): ?Customer
    {
        if (! self::isEnabled()) {
            return null;
        }

        if ($authenticated && self::customerCanOrder($authenticated)) {
            return $authenticated;
        }

        return self::showcaseCustomers()->first();
    }

    /**
     * Pelanggan fiktif VPS (whitelist) — tampilan portal memakai persona cloud, bukan PPPoE.
     * Cukup cocok username ATAU nomor WhatsApp pada whitelist.
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
        if (self::isVpsInvoice($invoice)) {
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

        return [
            'id' => $invoice->id,
            'invoice_number' => $invoice->invoice_number,
            'billing_period' => 'Sewa VPS Cloud · ' . (string) $invoice->billing_period,
            'service_label' => 'Sewa VPS Cloud (Bulanan)',
            'amount' => (float) $invoice->amount,
            'tax' => (float) $invoice->tax,
            'total_amount' => (float) $invoice->total_amount,
            'due_date' => $invoice->due_date?->format('Y-m-d'),
            'paid_at' => $invoice->paid_at?->toIso8601String(),
            'status' => $invoice->status,
            'is_prorated' => (bool) $invoice->is_prorated,
            'days_billed' => $invoice->days_billed,
            'next_billing' => null,
        ];
    }

    public static function shouldPresentAsVpsInvoice(Invoice $invoice, ?Customer $customer = null): bool
    {
        if (self::isVpsInvoice($invoice)) {
            return true;
        }

        $customer ??= $invoice->customer;

        return $customer !== null
            && self::isShowcaseCustomer($customer)
            && $invoice->status === 'unpaid';
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Invoice>  $invoices
     * @return \Illuminate\Support\Collection<int, Invoice>
     */
    public static function invoicesForShowcasePortal(Collection $invoices, Customer $customer): Collection
    {
        return $invoices
            ->filter(fn (Invoice $invoice) => self::shouldPresentAsVpsInvoice($invoice, $customer))
            ->values();
    }

    /**
     * @return array{invoice_number: string, customer_name: string, total_amount: float, billing_period: string, due_date: string}
     */
    public static function generateManualInvoiceForCustomer(Customer $customer, int $dueExtensionDays = 0): array
    {
        if (! self::isShowcaseCustomer($customer)) {
            throw new \InvalidArgumentException('Pelanggan tidak terdaftar sebagai showcase VPS.');
        }

        if (! in_array($customer->status, ['active', 'isolated'], true)) {
            throw new \InvalidArgumentException('Status pelanggan harus aktif atau isolir.');
        }

        if (! in_array($dueExtensionDays, [0, 3, 5, 7], true)) {
            throw new \InvalidArgumentException('Perpanjangan jatuh tempo harus 0 (tanpa perpanjangan), 3, 5, atau 7 hari.');
        }

        $plan = self::resolveDisplayPlanForCustomer($customer);

        if (! $plan) {
            throw new \InvalidArgumentException('Belum ada paket VPS yang dikonfigurasi di menu Layanan VPS.');
        }

        $dueDate = self::resolveManualInvoiceDueDate($customer, $dueExtensionDays);

        $invoice = self::createPlanInvoice($customer, $plan, $dueDate);

        return [
            'invoice_number' => $invoice->invoice_number,
            'customer_name' => $customer->name,
            'total_amount' => (float) $invoice->total_amount,
            'billing_period' => (string) $invoice->billing_period,
            'due_date' => $invoice->due_date?->format('Y-m-d') ?? $dueDate->format('Y-m-d'),
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

    /**
     * Label item transaksi untuk payment gateway (Duitku, Midtrans, Tripay).
     *
     * @return array{name: string, id: string, product_details: string}
     */
    public static function paymentItemMetaForInvoice(Invoice $invoice): array
    {
        $customer = $invoice->customer;
        $isVpsOrder = self::isVpsInvoice($invoice) || self::isShowcaseCustomer($customer);

        if (! $isVpsOrder) {
            $packageName = $customer?->package?->name ?? 'Layanan Internet';

            return [
                'name' => $packageName,
                'id' => 'PKG-' . ($customer->package_id ?? '0'),
                'product_details' => 'Tagihan internet ' . $invoice->invoice_number,
            ];
        }

        $vpsPlan = self::isVpsInvoice($invoice)
            ? self::planFromInvoice($invoice)
            : self::resolveDisplayPlanForCustomer($customer);

        $itemName = self::isVpsInvoice($invoice)
            ? self::itemLabelForInvoice($invoice)
            : 'Sewa VPS — ' . ($vpsPlan['name'] ?? 'Cloud') . ' (Bulanan)';

        return [
            'name' => $itemName,
            'id' => 'VPS-' . ($vpsPlan['id'] ?? 'custom'),
            'product_details' => $itemName,
        ];
    }

    public static function createOrderInvoice(Customer $customer, string $planId): Invoice
    {
        $plan = self::findPlan($planId);

        if (! $plan) {
            throw new \InvalidArgumentException('Paket VPS tidak ditemukan.');
        }

        $dueDate = self::isShowcaseCustomer($customer)
            ? self::resolveManualInvoiceDueDate($customer, 0)
            : Carbon::today()->addDays(3);

        return self::createPlanInvoice($customer, $plan, $dueDate);
    }

    protected static function resolveManualInvoiceDueDate(Customer $customer, int $dueExtensionDays): Carbon
    {
        $dueDate = BillingService::resolveNextDueDateFrom($customer, Carbon::today());

        if (($dueDate->isPast() || $dueDate->isToday()) && $dueExtensionDays > 0) {
            return Carbon::now()->addDays($dueExtensionDays)->startOfDay();
        }

        return $dueDate;
    }

    /**
     * @param  array{id: string, name: string, cpu: string, ram: string, storage: string, bandwidth: string, price: int, description: string, featured: bool}  $plan
     */
    protected static function createPlanInvoice(Customer $customer, array $plan, Carbon $dueDate): Invoice
    {
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
            'due_date' => $dueDate,
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
