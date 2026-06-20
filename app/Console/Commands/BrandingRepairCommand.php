<?php

namespace App\Console\Commands;

use App\Services\BrandingService;
use App\Services\SettingService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class BrandingRepairCommand extends Command
{
    protected $signature = 'branding:repair {--check : Hanya tampilkan diagnosis tanpa memperbaiki}';

    protected $description = 'Perbaiki path logo/favicon di database agar sesuai file di storage/app/public/branding';

    public function handle(): int
    {
        $this->line('Diagnosis branding:');
        $this->line('  system.logo DB   : ' . ($this->formatSetting('system.logo')));
        $this->line('  system.favicon DB: ' . ($this->formatSetting('system.favicon')));
        $this->line('  system_logo DB   : ' . ($this->formatSetting('system_logo')));
        $this->line('  system_favicon DB: ' . ($this->formatSetting('system_favicon')));

        $files = Storage::disk('public')->exists('branding')
            ? Storage::disk('public')->files('branding')
            : [];

        $this->line('  File di branding/: ' . (count($files) ? implode(', ', array_map('basename', $files)) : '(kosong)'));

        if ($this->option('check')) {
            $logo = BrandingService::resolveAssetPath('logo');
            $favicon = BrandingService::resolveAssetPath('favicon');
            $this->line('  Resolve logo   : ' . ($logo ?: '(tidak ditemukan)'));
            $this->line('  Resolve favicon: ' . ($favicon ?: '(tidak ditemukan)'));

            return Command::SUCCESS;
        }

        $result = BrandingService::repairStoredPaths();

        $this->info('Logo   : ' . ($result['logo'] ?: 'tidak ditemukan'));
        $this->info('Favicon: ' . ($result['favicon'] ?: 'tidak ditemukan'));
        $this->line('Cache branding dibersihkan. Uji: /branding/logo');

        return Command::SUCCESS;
    }

    private function formatSetting(string $key): string
    {
        $value = SettingService::get($key);

        if ($value === null || $value === '') {
            return '(kosong)';
        }

        if (SettingService::isBrokenUploadPath($value)) {
            return '(path rusak) ' . $value;
        }

        $exists = Storage::disk('public')->exists($value) ? 'OK' : 'FILE HILANG';

        return "{$value} [{$exists}]";
    }
}
