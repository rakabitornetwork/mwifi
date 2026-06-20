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
    protected $signature = 'billing:generate {period? : Format YYYY-MM — jika diisi, generate semua pelanggan untuk periode tersebut}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate invoice otomatis H-N sebelum jatuh tempo (default H-5), atau bulk per periode jika period diberikan';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $period = $this->argument('period');

        try {
            if ($period) {
                $this->info("Membuat invoice tagihan untuk periode {$period}...");
                $count = BillingService::generateInvoices($period);
            } else {
                $daysBefore = BillingService::getGenerateDaysBeforeDue();
                $this->info("Memeriksa jadwal generate invoice (H-{$daysBefore} jatuh tempo)...");
                $count = BillingService::generateScheduledInvoices();
            }

            $this->info("Sukses membuat {$count} invoice tagihan baru.");
            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Gagal membuat tagihan: " . $e->getMessage());
            return Command::FAILURE;
        }
    }
}
