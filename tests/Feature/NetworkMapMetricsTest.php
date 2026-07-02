<?php

namespace Tests\Feature;

use App\Models\Router;
use App\Models\User;
use App\Services\Router\RouterConnectorInterface;
use App\Services\Router\RouterService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Mockery;
use Tests\TestCase;

class NetworkMapMetricsTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        RouterService::setConnectorResolver(null);
        Mockery::close();

        parent::tearDown();
    }

    public function test_guest_cannot_access_network_map_metrics(): void
    {
        $this->getJson('/admin/network-map/metrics')
            ->assertUnauthorized();
    }

    public function test_admin_gets_network_map_metrics_payload(): void
    {
        Cache::flush();

        $admin = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $router = Router::create([
            'name' => 'Map Metrics Router',
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'secret',
            'protocol_type' => 'legacy_socket',
        ]);

        $mockConnector = Mockery::mock(RouterConnectorInterface::class);
        $mockConnector->shouldReceive('getSimpleQueueTrafficStats')
            ->once()
            ->andReturn([]);
        $mockConnector->shouldReceive('getActiveConnections')
            ->once()
            ->andReturn([
                [
                    'name' => 'client_map',
                    'rx-rate' => '1048576',
                    'tx-rate' => '524288',
                ],
            ]);
        $mockConnector->shouldReceive('getHotspotActive')
            ->once()
            ->andReturn([]);
        $mockConnector->shouldNotReceive('getInterfaceTrafficStats');

        RouterService::setConnectorResolver(function ($requestedRouter) use ($router, $mockConnector) {
            if ($requestedRouter->id === $router->id) {
                return $mockConnector;
            }

            throw new \Exception('Unexpected router instance');
        });

        $response = $this->actingAs($admin)
            ->getJson("/admin/network-map/metrics?router_id={$router->id}&refresh=1");

        $response->assertOk();
        $response->assertJsonStructure([
            'ont',
            'ont_devices',
            'traffic',
            'traffic_by_router',
        ]);
        $response->assertJsonPath("traffic_by_router.{$router->id}.client_map.download_bps", 1048576);
        $response->assertJsonPath("traffic_by_router.{$router->id}.client_map.upload_bps", 524288);
    }

    public function test_technician_cannot_request_metrics_for_other_router(): void
    {
        $routerA = Router::create([
            'name' => 'Router A',
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'secret',
            'protocol_type' => 'legacy_socket',
        ]);

        $routerB = Router::create([
            'name' => 'Router B',
            'host' => '127.0.0.2',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'secret',
            'protocol_type' => 'legacy_socket',
        ]);

        $technician = User::factory()->create([
            'role' => User::ROLE_TECHNICIAN,
            'assigned_router_id' => $routerA->id,
        ]);

        $this->actingAs($technician)
            ->getJson("/admin/network-map/metrics?router_id={$routerB->id}")
            ->assertForbidden();
    }
}
