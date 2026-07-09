<?php

namespace App\Console\Commands;

use App\Services\CustomerServiceScheduleService;
use Illuminate\Console\Command;

class CustomerServiceScheduleCommand extends Command
{
    protected $signature = 'customers:service-schedule';

    protected $description = 'Menonaktifkan/mengaktifkan pelanggan sesuai jadwal on/off yang diatur';

    public function handle(): int
    {
        $this->info('Memproses jadwal on/off pelanggan...');

        try {
            $result = CustomerServiceScheduleService::processScheduledCustomers();
            $this->info("Selesai. Dimatikan: {$result['off']}, dinyalakan: {$result['on']}.");

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error('Gagal memproses jadwal layanan: ' . $e->getMessage());

            return Command::FAILURE;
        }
    }
}
