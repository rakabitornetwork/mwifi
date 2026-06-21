<?php

namespace Tests\Unit;

use App\Services\Router\MikrotikInterfaceService;
use PHPUnit\Framework\TestCase;

class MikrotikInterfaceServiceTest extends TestCase
{
    public function test_normalize_list_skips_template_interfaces(): void
    {
        $result = MikrotikInterfaceService::normalizeList([
            ['name' => '*1', 'type' => 'ether'],
            [
                'name' => 'ether1',
                'type' => 'ether',
                'running' => 'true',
                'disabled' => 'false',
                'rx-bits-per-second' => '1500000',
                'tx-bits-per-second' => '500000',
            ],
        ]);

        $this->assertCount(1, $result);
        $this->assertSame('ether1', $result[0]['name']);
        $this->assertSame(1500000, $result[0]['rx_bps']);
        $this->assertSame(500000, $result[0]['tx_bps']);
        $this->assertTrue($result[0]['running']);
    }

    public function test_pick_default_interface_prefers_wan_uplink(): void
    {
        $name = MikrotikInterfaceService::pickDefaultInterfaceName([
            ['name' => 'bridge1', 'type' => 'bridge', 'running' => true, 'disabled' => false],
            ['name' => 'ether1-wan', 'type' => 'ether', 'running' => true, 'disabled' => false],
        ]);

        $this->assertSame('ether1-wan', $name);
    }

    public function test_filter_for_dashboard_excludes_pppoe_sessions(): void
    {
        $filtered = MikrotikInterfaceService::filterForDashboard([
            ['name' => '<pppoe-user@realm>', 'type' => 'pppoe-in', 'running' => true, 'disabled' => false],
            ['name' => 'ether1-wan', 'type' => 'ether', 'running' => true, 'disabled' => false],
        ]);

        $this->assertCount(1, $filtered);
        $this->assertSame('ether1-wan', $filtered[0]['name']);
    }
}
