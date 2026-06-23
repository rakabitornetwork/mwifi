<?php

namespace Tests\Unit;

use App\Services\Router\MikrotikPackageFormOptionsService;
use App\Services\Router\RouterConnectorInterface;
use PHPUnit\Framework\TestCase;

class MikrotikPackageFormOptionsServiceTest extends TestCase
{
    public function test_list_scope_skips_heavy_router_queries(): void
    {
        $connector = $this->createMock(RouterConnectorInterface::class);
        $connector->method('getProfiles')->willReturn([['name' => '10M']]);
        $connector->method('getHotspotProfiles')->willReturn([['name' => 'HS-1H']]);
        $connector->expects($this->never())->method('getSimpleQueues');
        $connector->expects($this->never())->method('getIpPools');
        $connector->expects($this->never())->method('getQueueTypes');

        $list = MikrotikPackageFormOptionsService::build($connector, MikrotikPackageFormOptionsService::SCOPE_LIST);

        $this->assertSame(['10M', 'HS-1H'], $list['all_profiles']);
        $this->assertSame([], $list['parent_queues']);
    }

    public function test_form_scope_loads_queue_metadata(): void
    {
        $connector = $this->createMock(RouterConnectorInterface::class);
        $connector->method('getProfiles')->willReturn([
            ['name' => '10M', 'parent-queue' => 'GLOBAL'],
        ]);
        $connector->method('getHotspotProfiles')->willReturn([]);
        $connector->method('getIpPools')->willReturn([['name' => 'pool_ppp']]);
        $connector->method('getSimpleQueues')->willReturn([['name' => 'queue-heavy']]);
        $connector->method('getQueueTypes')->willReturn([['name' => 'fq-codel']]);

        $form = MikrotikPackageFormOptionsService::build($connector, MikrotikPackageFormOptionsService::SCOPE_FORM);

        $this->assertContains('GLOBAL', $form['parent_queues']);
        $this->assertContains('queue-heavy', $form['parent_queues']);
        $this->assertContains('fq-codel', $form['queue_types']);
    }

    public function test_all_profiles_deduplicates_case_insensitive_names(): void
    {
        $connector = $this->createMock(RouterConnectorInterface::class);
        $connector->method('getProfiles')->willReturn([
            ['name' => 'Premium 1: RiverFlow'],
        ]);
        $connector->method('getHotspotProfiles')->willReturn([
            ['name' => 'premium 1: riverflow'],
        ]);
        $connector->expects($this->never())->method('getSimpleQueues');

        $list = MikrotikPackageFormOptionsService::build($connector, MikrotikPackageFormOptionsService::SCOPE_LIST);

        $this->assertSame(['Premium 1: RiverFlow'], $list['all_profiles']);
    }
}
