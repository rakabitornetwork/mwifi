<?php

namespace Tests\Feature;

use App\Models\Router;
use App\Models\User;
use App\Services\Router\RouterConnectorInterface;
use App\Services\Router\RouterService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class PppoeActiveSessionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    public function test_get_pppoe_active_sessions(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $router = Router::create([
            'name' => 'Active Test Router',
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'admin',
            'protocol_type' => 'legacy_socket',
        ]);

        // Mock the RouterOS connector
        $mockConnector = Mockery::mock(RouterConnectorInterface::class);
        $mockConnector->shouldReceive('getActiveConnections')
            ->once()
            ->andReturn([
                [
                    'name' => 'client1',
                    'service' => 'pppoe',
                    'caller-id' => '00:11:22:33:44:55',
                    'address' => '10.10.10.2',
                    'uptime' => '1d2h3m',
                ]
            ]);

        // Override connector resolver in RouterService
        RouterService::setConnectorResolver(function ($r) use ($router, $mockConnector) {
            if ($r->id === $router->id) {
                return $mockConnector;
            }
            throw new \Exception('Unexpected router instance');
        });

        $response = $this->actingAs($admin)
            ->getJson("/admin/pppoe/active-sessions?router_id={$router->id}");

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonCount(1, 'sessions');
        $response->assertJsonFragment([
            'username' => 'client1',
            'caller_id' => '00:11:22:33:44:55',
            'address' => '10.10.10.2',
            'uptime' => '1d2h3m',
        ]);

        // Cleanup resolver
        RouterService::setConnectorResolver(null);
    }

    public function test_kick_pppoe_active_session(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_SUPER_ADMIN,
        ]);

        $router = Router::create([
            'name' => 'Active Test Router 2',
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'admin',
            'protocol_type' => 'legacy_socket',
        ]);

        // Mock the RouterOS connector
        $mockConnector = Mockery::mock(RouterConnectorInterface::class);
        $mockConnector->shouldReceive('kickActiveConnection')
            ->with('client1')
            ->once()
            ->andReturn(true);

        // Override connector resolver in RouterService
        RouterService::setConnectorResolver(function ($r) use ($router, $mockConnector) {
            if ($r->id === $router->id) {
                return $mockConnector;
            }
            throw new \Exception('Unexpected router instance');
        });

        $response = $this->actingAs($admin)
            ->postJson('/admin/pppoe/kick-active', [
                'router_id' => $router->id,
                'username' => 'client1',
            ]);

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);
        $response->assertJsonPath('message', 'Sesi PPPoE berhasil diputus.');

        // Cleanup resolver
        RouterService::setConnectorResolver(null);
    }
}
