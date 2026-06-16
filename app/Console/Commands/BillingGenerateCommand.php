<?php

namespace App\Console\Commands;

use App\Services\BillingService;
use Illuminate\Console\Command;

class BillingGenerateCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'billing:generate {period? : Format YYYY-MM}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Membuat invoice tagihan bulanan otomatis untuk semua pelanggan aktif';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $period = $this->argument('period');
        $this->info("Memulai pembuatan invoice tagihan...");
        
        try {
            $count = BillingService::generateInvoices($period);
            $this->info("Sukses membuat {$count} invoice tagihan baru.");
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Gagal membuat tagihan: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
