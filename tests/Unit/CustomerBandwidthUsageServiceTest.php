<?php

namespace Tests\Unit;

use App\Services\Router\CustomerBandwidthUsageService;
use App\Services\Router\MikrotikQuotaService;
use PHPUnit\Framework\TestCase;

class CustomerBandwidthUsageServiceTest extends TestCase
{
    public function test_delta_bytes_handles_counter_reset_on_reconnect(): void
    {
        $method = new \ReflectionMethod(CustomerBandwidthUsageService::class, 'deltaBytes');
        $method->setAccessible(true);

        $this->assertSame(500, $method->invoke(null, 1500, 1000));
        $this->assertSame(200, $method->invoke(null, 200, 5000));
    }

    public function test_simple_queue_is_not_overwritten_by_ppp_active(): void
    {
        $map = [];

        $assign = new \ReflectionMethod(MikrotikQuotaService::class, 'assignQuota');
        $assign->setAccessible(true);

        $assign->invokeArgs(null, [
            &$map,
            'user@test',
            ['upload_bytes' => 100, 'download_bytes' => 1000],
            'simple-queue',
        ]);

        $assign->invokeArgs(null, [
            &$map,
            'user@test',
            ['upload_bytes' => 10, 'download_bytes' => 50],
            'ppp-active',
        ]);

        $resolved = MikrotikQuotaService::resolveForUsername($map, 'user@test');

        $this->assertSame('simple-queue', $resolved['source']);
        $this->assertSame(1000, $resolved['download_bytes']);
    }
}
