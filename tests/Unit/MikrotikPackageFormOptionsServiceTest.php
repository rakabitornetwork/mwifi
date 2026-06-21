<?php

namespace Tests\Unit;

use App\Services\Router\MikrotikPackageFormOptionsService;
use App\Services\Router\RouterConnectorInterface;
use PHPUnit\Framework\TestCase;

class MikrotikPackageFormOptionsServiceTest extends TestCase
{
    public function test_build_collects_profile_and_pool_options(): void
    {
        $connector = new class implements RouterConnectorInterface
        {
            public function connect(string $host, int $port, string $username, string $password): bool
            {
                return true;
            }

            public function getSecrets(): array
            {
                return [];
            }

            public function addSecret(array $data): bool
            {
                return true;
            }

            public function updateSecret(string $username, array $data): bool
            {
                return true;
            }

            public function deleteSecret(string $username): bool
            {
                return true;
            }

            public function getActiveConnections(): array
            {
                return [];
            }

            public function getProfiles(): array
            {
                return [[
                    'name' => 'Family-20M',
                    'local-address' => '192.168.22.1',
                    'remote-address' => 'pool_ppp',
                    'dns-server' => '8.8.8.8',
                    'rate-limit' => '20M/20M',
                    'parent-queue' => 'GLOBAL',
                    'queue-type' => 'cake',
                ]];
            }

            public function addPppProfile(array $data): bool
            {
                return true;
            }

            public function updatePppProfile(string $name, array $data): bool
            {
                return true;
            }

            public function kickActiveConnection(string $username): bool
            {
                return true;
            }

            public function getHotspotProfiles(): array
            {
                return [[
                    'name' => 'HS-1D',
                    'rate-limit' => '10M/10M',
                    'address-pool' => 'pool_hotspot',
                ]];
            }

            public function addHotspotProfile(array $data): bool
            {
                return true;
            }

            public function updateHotspotProfile(string $name, array $data): bool
            {
                return true;
            }

            public function getHotspotUsers(): array
            {
                return [];
            }

            public function addHotspotUser(array $data): bool
            {
                return true;
            }

            public function deleteHotspotUser(string $username): bool
            {
                return true;
            }

            public function getHotspotActive(): array
            {
                return [];
            }

            public function kickHotspotActive(string $username): bool
            {
                return true;
            }

            public function getIpPools(): array
            {
                return [['name' => 'pool_ppp'], ['name' => 'pool_hotspot']];
            }

            public function getSimpleQueues(): array
            {
                return [['name' => 'queue-parent']];
            }

            public function getQueueTypes(): array
            {
                return [['name' => 'default'], ['name' => 'cake']];
            }

            public function getInterfaceTrafficStats(): array
            {
                return [];
            }

            public function getInterfaces(): array
            {
                return [];
            }

            public function getInterfaceLiveTraffic(string $interfaceName): array
            {
                return ['name' => $interfaceName, 'rx_bps' => 0, 'tx_bps' => 0];
            }

            public function getSimpleQueueTrafficStats(): array
            {
                return [];
            }

            public function getSystemResources(): array
            {
                return [];
            }

            public function getHotspotServers(): array
            {
                return [];
            }

            public function getHotspotServerProfiles(): array
            {
                return [];
            }
        };

        $options = MikrotikPackageFormOptionsService::build($connector);

        $this->assertSame(['Family-20M'], $options['ppp_profile_names']);
        $this->assertSame(['HS-1D'], $options['hotspot_profile_names']);
        $this->assertContains('20M/20M', $options['bandwidth_limits']);
        $this->assertContains('192.168.22.1', $options['local_addresses']);
        $this->assertContains('pool_ppp', $options['ip_pool_names']);
        $this->assertContains('cake', $options['queue_types']);
        $this->assertSame('20M/20M', $options['ppp_profile_details']['Family-20M']['bandwidth_limit']);
    }
}
