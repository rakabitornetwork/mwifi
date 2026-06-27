<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Models\Package;
use App\Models\Router;
use App\Services\Router\RouterService;
use App\Services\SettingService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class ApplyRouterCustomerPackageCommand extends Command
{
    protected $signature = 'customers:apply-router-package
                            {--router= : Nama router (contoh: "33 NET RYZEN")}
                            {--package= : Nama paket / profil MikroTik (contoh: "1. StreamForge")}
                            {--billing-date= : Tanggal tagih YYYY-MM-DD}
                            {--price=120000 : Harga paket jika perlu dibuat otomatis}
                            {--bandwidth=10M : Limit bandwidth jika paket dibuat otomatis}
                            {--create-package : Buat paket jika belum ada di database}
                            {--sync-router : Sinkronkan profil PPPoE ke RouterOS}
                            {--dry-run : Tampilkan preview tanpa menyimpan}';

    protected $description = 'Terapkan paket & tanggal tagih ke semua pelanggan PPPoE pada satu router';

    public function handle(): int
    {
        $routerName = trim((string) $this->option('router'));
        $packageName = trim((string) $this->option('package'));
        $billingDateRaw = trim((string) $this->option('billing-date'));
        $dryRun = (bool) $this->option('dry-run');
        $syncRouter = (bool) $this->option('sync-router');
        $createPackage = (bool) $this->option('create-package');

        if ($routerName === '' || $packageName === '' || $billingDateRaw === '') {
            $this->error('Opsi --router, --package, dan --billing-date wajib diisi.');

            return Command::FAILURE;
        }

        $billingDate = Carbon::createFromFormat('Y-m-d', $billingDateRaw, config('app.timezone'))->toDateString();

        $router = Router::query()
            ->whereRaw('LOWER(name) = ?', [strtolower($routerName)])
            ->orWhere('name', 'like', '%' . $routerName . '%')
            ->orderByRaw('CASE WHEN LOWER(name) = ? THEN 0 ELSE 1 END', [strtolower($routerName)])
            ->first();

        if (!$router) {
            $this->error("Router \"{$routerName}\" tidak ditemukan.");

            return Command::FAILURE;
        }

        $package = Package::query()
            ->where('type', 'pppoe')
            ->where(function ($query) use ($packageName, $router) {
                $query->where('name', $packageName)
                    ->orWhere('mikrotik_profile', $packageName);
            })
            ->where(function ($query) use ($router) {
                $query->where('router_id', $router->id)
                    ->orWhereNull('router_id');
            })
            ->orderByRaw('CASE WHEN router_id = ? THEN 0 ELSE 1 END', [$router->id])
            ->first();

        if (!$package && !$createPackage) {
            $this->error("Paket \"{$packageName}\" tidak ditemukan. Tambahkan --create-package untuk membuat otomatis.");

            return Command::FAILURE;
        }

        if (!$package && $createPackage) {
            $template = Package::query()
                ->where('router_id', $router->id)
                ->where('type', 'pppoe')
                ->orderByDesc('id')
                ->first();

            $packagePayload = [
                'name' => $packageName,
                'mikrotik_profile' => $packageName,
                'router_id' => $router->id,
                'type' => 'pppoe',
                'price' => (float) $this->option('price'),
                'bandwidth_limit' => (string) $this->option('bandwidth'),
                'description' => 'Dibuat otomatis via customers:apply-router-package.',
                'only_one' => true,
            ];

            if ($template) {
                foreach (['local_address', 'remote_address', 'dns_server', 'parent_queue', 'queue_type_rx', 'queue_type_tx'] as $field) {
                    if ($template->{$field}) {
                        $packagePayload[$field] = $template->{$field};
                    }
                }
            }

            if ($dryRun) {
                $this->warn('[dry-run] Paket baru akan dibuat: ' . json_encode($packagePayload, JSON_UNESCAPED_UNICODE));
                $package = new Package($packagePayload);
            } else {
                $package = Package::create($packagePayload);
                $this->info("Paket baru dibuat: [{$package->id}] {$package->name}");
            }
        }

        if (!$package) {
            $this->error('Paket tidak tersedia.');

            return Command::FAILURE;
        }

        $customers = Customer::query()
            ->where('router_id', $router->id)
            ->where('service_type', 'pppoe')
            ->with('package')
            ->orderBy('username')
            ->get();

        if ($customers->isEmpty()) {
            $this->warn('Tidak ada pelanggan PPPoE pada router ini.');

            return Command::SUCCESS;
        }

        $this->info("Router : {$router->name} (#{$router->id})");
        $this->info('Paket  : ' . $package->name . ($package->id ? " (#{$package->id})" : ' (baru)'));
        $this->info("Tagih  : {$billingDate}");
        $this->info('Pelanggan: ' . $customers->count());

        if ($dryRun) {
            $this->table(
                ['Username', 'Paket lama', 'Tagih lama', 'Status'],
                $customers->take(15)->map(fn (Customer $c) => [
                    $c->username,
                    $c->package?->name ?? '-',
                    $c->billing_date?->format('Y-m-d') ?? '-',
                    $c->status,
                ])->all()
            );
            if ($customers->count() > 15) {
                $this->line('... dan ' . ($customers->count() - 15) . ' pelanggan lainnya.');
            }

            return Command::SUCCESS;
        }

        $updated = 0;
        $routerSynced = 0;
        $routerFailed = 0;
        $connector = null;
        $isolirProfile = SettingService::get('mikrotik.isolir_profile', 'ISOLIR');

        if ($syncRouter && $router->status) {
            try {
                $connector = RouterService::getConnector($router);
            } catch (\Throwable $e) {
                $this->warn('Gagal konek RouterOS — update database tetap dijalankan: ' . $e->getMessage());
                $syncRouter = false;
            }
        } elseif ($syncRouter) {
            $this->warn('Router dinonaktifkan di admin — lewati sinkron RouterOS.');
            $syncRouter = false;
        }

        $bar = $this->output->createProgressBar($customers->count());
        $bar->start();

        foreach ($customers as $customer) {
            $customer->update([
                'package_id' => $package->id,
                'billing_date' => $billingDate,
            ]);
            $updated++;

            if ($syncRouter && $connector) {
                try {
                    if ($customer->status === 'isolated') {
                        $profile = $isolirProfile;
                        $disabled = 'no';
                    } else {
                        $profile = $package->mikrotik_profile;
                        $disabled = $customer->status === 'active' ? 'no' : 'yes';
                    }

                    $success = $connector->updateSecret($customer->username, [
                        'profile' => $profile,
                        'disabled' => $disabled,
                    ]);

                    if ($success) {
                        $routerSynced++;
                        if (in_array($customer->status, ['isolated', 'inactive', 'suspended'], true)) {
                            $connector->kickActiveConnection($customer->username);
                        }
                    } else {
                        $routerFailed++;
                    }
                } catch (\Throwable $e) {
                    $routerFailed++;
                    Log::warning('Bulk package apply MikroTik sync failed', [
                        'username' => $customer->username,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("Database diperbarui: {$updated} pelanggan.");

        if ($syncRouter) {
            $this->info("RouterOS sinkron: {$routerSynced} berhasil, {$routerFailed} gagal.");
        }

        return Command::SUCCESS;
    }
}
