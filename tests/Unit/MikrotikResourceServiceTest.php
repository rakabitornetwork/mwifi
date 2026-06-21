<?php

namespace Tests\Unit;

use App\Services\Router\MikrotikResourceService;
use PHPUnit\Framework\TestCase;

class MikrotikResourceServiceTest extends TestCase
{
    public function test_normalize_maps_routeros_resource_fields(): void
    {
        $result = MikrotikResourceService::normalize([
            'cpu-load' => '42',
            'total-memory' => '268435456',
            'free-memory' => '134217728',
            'total-hdd-space' => '134217728',
            'free-hdd-space' => '67108864',
            'version' => '7.16.1',
            'platform' => 'MikroTik',
            'board-name' => 'RB750Gr3',
            'uptime' => '5d2h10m',
        ], [
            'name' => 'Core-Router',
        ]);

        $this->assertSame(42, $result['cpu']);
        $this->assertSame(50, $result['ram']);
        $this->assertSame(50, $result['disk']);
        $this->assertSame('RouterOS 7.16.1', $result['os']);
        $this->assertSame('Core-Router', $result['hostname']);
        $this->assertSame('5d2h10m', $result['uptime']);
    }
}
