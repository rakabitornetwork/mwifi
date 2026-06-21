<?php

namespace App\Console\Commands;

use App\Services\Router\CustomerBandwidthUsageService;
use Illuminate\Console\Command;

class BandwidthSampleCommand extends Command
{
    protected $signature = 'bandwidth:sample';

    protected $description = 'Sample RouterOS counters and accumulate monthly bandwidth usage per customer';

    public function handle(): int
    {
        $this->info('Sampling bandwidth usage for active customers...');

        $count = CustomerBandwidthUsageService::sampleAllActiveCustomers();

        $this->info("Selesai. {$count} pelanggan disampling untuk periode " . CustomerBandwidthUsageService::currentPeriod() . '.');

        return self::SUCCESS;
    }
}
