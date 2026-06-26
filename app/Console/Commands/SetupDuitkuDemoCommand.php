<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Models\Package;
use App\Models\Router;
use App\Models\User;
use App\Services\SettingService;
use App\Services\VpsCatalogService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class SetupDuitkuDemoCommand extends Command
{
    protected $signature = 'duitku:setup-demo
                            {--phone=6281888777666 : Nomor WhatsApp pelanggan demo (gunakan nomor unik)}
                            {--skip-invoice : Jangan buat invoice VPS uji coba}';

    protected $description = 'Siapkan akun demo Duitku: aktifkan VPS, whitelist, pelanggan demo, dan tampilkan link akses tanpa OTP';

    public function handle(): int
    {
        $phone = (string) $this->option('phone');

        $this->info('1/5 Mengaktifkan layanan VPS...');
        SettingService::set('vps.enabled', '1', 'vps', false);
        SettingService::set('vps.whitelist_usernames', 'duitku', 'vps', false);
        SettingService::set('vps.whitelist_phones', $phone, 'vps', false);
        SettingService::set('vps.demo_link_days', '30', 'vps', false);

        if (SettingService::get('vps.plans', '') === '') {
            SettingService::set(
                'vps.plans',
                json_encode(VpsCatalogService::defaultPlans(), JSON_UNESCAPED_UNICODE),
                'vps',
                false
            );
        }

        $this->info('2/5 Membuat pelanggan demo duitku@demo...');
        $customer = $this->ensureDemoCustomer($phone);

        $this->info('3/5 Mengonfigurasi gateway Duitku sandbox...');
        SettingService::set('payment.active_gateway', 'duitku', 'payment', false);
        SettingService::set('payment.duitku.mode', 'sandbox', 'payment', false);

        $this->info('4/5 Memverifikasi whitelist dan showcase...');
        if (! VpsCatalogService::isShowcaseCustomer($customer)) {
            $this->error('Pelanggan demo tidak cocok dengan whitelist VPS. Periksa username dan pengaturan.');

            return self::FAILURE;
        }

        $showcaseCount = VpsCatalogService::showcaseCustomers()->count();
        $this->line("   Pelanggan showcase terdaftar: {$showcaseCount}");

        if (! $this->option('skip-invoice')) {
            $hasUnpaidVps = $customer->invoices()
                ->where('status', 'unpaid')
                ->where('billing_period', 'like', 'vps:%')
                ->exists();

            if (! $hasUnpaidVps) {
                VpsCatalogService::createOrderInvoice($customer, 'starter');
                $this->line('   Invoice VPS starter (unpaid) dibuat untuk uji pembayaran.');
            } else {
                $this->line('   Invoice VPS unpaid sudah ada.');
            }
        }

        $this->info('5/5 Menghasilkan link demo...');
        $demoUrl = VpsCatalogService::generateDemoLoginUrl($customer);

        if ($demoUrl === null) {
            $this->error('Gagal membuat link demo.');

            return self::FAILURE;
        }

        $appUrl = rtrim((string) config('app.url'), '/');
        $orderUrl = "{$appUrl}/#pesan";
        $expiresDays = VpsCatalogService::demoLinkExpiryDays();

        $this->newLine();
        $this->components->twoColumnDetail('Pelanggan', "{$customer->name} ({$customer->username})");
        $this->components->twoColumnDetail('Customer ID', (string) $customer->id);
        $this->components->twoColumnDetail('Masa berlaku link', "{$expiresDays} hari");
        $this->newLine();
        $this->line('<fg=cyan>Link demo (tanpa OTP):</>');
        $this->line($demoUrl);
        $this->newLine();
        $this->line('<fg=yellow>Template balasan email ke Duitku:</>');
        $this->line($this->emailTemplate($demoUrl, $orderUrl, $expiresDays));

        $merchantCode = SettingService::get('payment.duitku.merchant_code', '');
        $apiKey = SettingService::get('payment.duitku.api_key', '');

        if ($merchantCode === '' || $apiKey === '') {
            $this->newLine();
            $this->warn('Catatan: payment.duitku.merchant_code atau payment.duitku.api_key masih kosong.');
            $this->warn('Isi kredensial sandbox Duitku di Admin → Pengaturan Pembayaran sebelum uji checkout.');
        }

        return self::SUCCESS;
    }

    private function ensureDemoCustomer(string $phone): Customer
    {
        $router = Router::query()->first();
        $package = Package::query()->first();

        if (! $router || ! $package) {
            $this->error('Router atau paket belum ada. Jalankan php artisan db:seed terlebih dahulu.');

            exit(self::FAILURE);
        }

        $user = User::updateOrCreate(
            ['email' => 'duitku_demo@mwifi.test'],
            [
                'name' => 'Duitku Demo',
                'password' => Hash::make('duitku-demo-not-used'),
                'phone_number' => $phone,
            ]
        );

        return Customer::updateOrCreate(
            ['username' => 'duitku@demo'],
            [
                'user_id' => $user->id,
                'router_id' => $router->id,
                'package_id' => $package->id,
                'service_type' => 'pppoe',
                'password' => 'duitku-demo-not-used',
                'name' => 'Duitku Demo',
                'phone_number' => $phone,
                'address' => 'Akun demo verifikasi payment gateway',
                'status' => 'active',
                'billing_date' => now()->day,
                'service_start_date' => now()->format('Y-m-d'),
            ]
        );
    }

    private function emailTemplate(string $demoUrl, string $orderUrl, int $expiresDays): string
    {
        return implode("\n", [
            'Halo Tim Duitku,',
            '',
            'Terima kasih atas follow-up-nya.',
            '',
            'Untuk kebutuhan verifikasi, kami menyediakan link akses demo ke portal pelanggan yang tidak memerlukan OTP WhatsApp. Cukup buka link berikut di browser:',
            '',
            $demoUrl,
            '',
            "Link berlaku selama {$expiresDays} hari. Setelah dibuka, Anda akan langsung masuk ke dashboard pelanggan demo dan dapat menguji alur pembayaran melalui Duitku sandbox.",
            '',
            'Alternatif tanpa login — formulir pesanan di beranda:',
            $orderUrl,
            '',
            'Panduan singkat:',
            '1. Buka link demo → masuk otomatis ke dashboard',
            '2. Pilih invoice belum bayar → klik Bayar',
            '3. Anda akan diarahkan ke halaman checkout Duitku sandbox',
            '',
            'Mohon konfirmasi jika link sudah berhasil diakses atau ada kendala.',
            '',
            'Terima kasih.',
        ]);
    }
}
