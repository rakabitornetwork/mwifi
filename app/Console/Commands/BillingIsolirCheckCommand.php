<?php

namespace App\Console\Commands;

use App\Services\BillingService;
use Illuminate\Console\Command;

class BillingIsolirCheckCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'billing:isolir-check';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Memeriksa tagihan jatuh tempo dan mengisolir secara otomatis via Mikrotik';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info("Memulai pengecekan tagihan jatuh tempo...");

        try {
            $count = BillingService::isolatePastDueCustomers();
            $this->info("Pengecekan selesai. Sebanyak {$count} pelanggan telah di-isolir otomatis.");
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Gagal melakukan pengecekan isolir: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
