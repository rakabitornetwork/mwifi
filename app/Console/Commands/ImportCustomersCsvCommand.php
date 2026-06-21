<?php

namespace App\Console\Commands;

use App\Models\Router;
use App\Services\Customer\LegacyCsvImportService;
use Illuminate\Console\Command;

class ImportCustomersCsvCommand extends Command
{
    protected $signature = 'customers:import-csv
                            {file : Path ke file CSV export aplikasi lama}
                            {--router= : ID router tujuan (wajib jika lebih dari satu router)}
                            {--dry-run : Simulasi tanpa menyimpan ke database}
                            {--skip-existing : Lewati pelanggan yang username-nya sudah ada}';

    protected $description = 'Impor pelanggan PPP dari CSV export aplikasi billing lama (Mikhmon-style)';

    public function handle(LegacyCsvImportService $importService): int
    {
        $file = $this->argument('file');
        if (!is_file($file)) {
            $this->error("File tidak ditemukan: {$file}");

            return Command::FAILURE;
        }

        $routerId = $this->resolveRouterId();
        if ($routerId === null) {
            return Command::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $skipExisting = (bool) $this->option('skip-existing');

        if ($dryRun) {
            $this->warn('Mode dry-run: tidak ada perubahan yang disimpan.');
        }

        $this->info("Mengimpor dari: {$file}");
        $this->info("Router ID: {$routerId}");

        $result = $importService->import($file, $routerId, $dryRun, $skipExisting);

        $this->newLine();
        $this->table(
            ['Metrik', 'Jumlah'],
            [
                ['Total baris diproses', $result['total']],
                ['Pelanggan baru', $result['created']],
                ['Pelanggan diperbarui', $result['updated']],
                ['Dilewati', $result['skipped']],
                ['Paket baru dibuat', $result['packages_created']],
                ['Error', count($result['errors'])],
            ]
        );

        if ($result['errors'] !== []) {
            $this->newLine();
            $this->error('Beberapa baris gagal:');
            foreach (array_slice($result['errors'], 0, 20) as $error) {
                $this->line("  - {$error}");
            }
            if (count($result['errors']) > 20) {
                $this->line('  ... dan ' . (count($result['errors']) - 20) . ' error lainnya.');
            }
        }

        if ($dryRun) {
            $this->newLine();
            $this->comment('Dry-run selesai. Jalankan tanpa --dry-run untuk menyimpan data.');
        } else {
            $this->newLine();
            $this->info('Impor selesai.');
        }

        return $result['errors'] === [] ? Command::SUCCESS : Command::FAILURE;
    }

    private function resolveRouterId(): ?int
    {
        $routers = Router::orderBy('id')->get(['id', 'name']);

        if ($routers->isEmpty()) {
            $this->error('Belum ada router di database. Tambahkan router dulu lewat menu Admin > Router.');

            return null;
        }

        $routerOption = $this->option('router');
        if ($routerOption !== null && $routerOption !== '') {
            $router = $routers->firstWhere('id', (int) $routerOption);
            if (!$router) {
                $this->error("Router ID {$routerOption} tidak ditemukan.");

                return null;
            }

            return (int) $router->id;
        }

        if ($routers->count() === 1) {
            $router = $routers->first();
            $this->line("Menggunakan router tunggal: [{$router->id}] {$router->name}");

            return (int) $router->id;
        }

        $this->error('Beberapa router ditemukan. Tentukan dengan --router=ID:');
        foreach ($routers as $router) {
            $this->line("  [{$router->id}] {$router->name}");
        }

        return null;
    }
}
