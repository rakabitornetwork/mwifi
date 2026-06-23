<?php

namespace Tests\Feature;

use App\Models\Package;
use App\Models\Router;
use App\Services\Router\PackageRouterSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use ReflectionMethod;
use Tests\TestCase;

class PackageRouterSyncIsolationTest extends TestCase
{
    use RefreshDatabase;

    private function makeRouter(string $name): Router
    {
        return Router::create([
            'name' => $name,
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'secret',
            'protocol_type' => 'legacy_socket',
            'status' => false,
        ]);
    }

    private function makePackage(Router $router, string $profile): Package
    {
        return Package::create([
            'router_id' => $router->id,
            'name' => $profile,
            'type' => 'pppoe',
            'price' => 150000,
            'bandwidth_limit' => '20M/20M',
            'mikrotik_profile' => $profile,
            'description' => 'Test package',
        ]);
    }

    public function test_remove_packages_missing_on_router_only_affects_selected_router(): void
    {
        $routerA = $this->makeRouter('Router A');
        $routerB = $this->makeRouter('Router B');

        $packageA = $this->makePackage($routerA, '10 Mbps - 150K');
        $packageB = $this->makePackage($routerB, '20 Mbps - 200K');

        $method = new ReflectionMethod(PackageRouterSyncService::class, 'removePackagesMissingOnRouter');
        $method->setAccessible(true);

        $result = $method->invoke(null, $routerB, [
            '20 mbps - 200k' => [
                'name' => '20 Mbps - 200K',
                'type' => 'pppoe',
                'payload' => [],
            ],
        ]);

        $this->assertSame(0, $result['removed']);
        $this->assertTrue(Package::query()->whereKey($packageA->id)->exists());
        $this->assertTrue(Package::query()->whereKey($packageB->id)->exists());
    }

    public function test_remove_packages_missing_on_router_deletes_only_current_router_packages(): void
    {
        $routerA = $this->makeRouter('Router A');
        $routerB = $this->makeRouter('Router B');

        $packageA = $this->makePackage($routerA, '10 Mbps - 150K');
        $stalePackageB = $this->makePackage($routerB, '30 Mbps - 300K');

        $method = new ReflectionMethod(PackageRouterSyncService::class, 'removePackagesMissingOnRouter');
        $method->setAccessible(true);

        $result = $method->invoke(null, $routerB, [
            '20 mbps - 200k' => [
                'name' => '20 Mbps - 200K',
                'type' => 'pppoe',
                'payload' => [],
            ],
        ]);

        $this->assertSame(1, $result['removed']);
        $this->assertTrue(Package::query()->whereKey($packageA->id)->exists());
        $this->assertFalse(Package::query()->whereKey($stalePackageB->id)->exists());
    }
}
