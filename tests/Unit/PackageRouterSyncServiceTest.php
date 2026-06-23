<?php

namespace Tests\Unit;

use App\Services\Router\PackageRouterSyncService;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

class PackageRouterSyncServiceTest extends TestCase
{
    public function test_guess_price_from_profile_name(): void
    {
        $method = new ReflectionMethod(PackageRouterSyncService::class, 'guessPriceFromProfileName');
        $method->setAccessible(true);

        $this->assertSame(120000.0, $method->invoke(null, '10 Mbps - 120K'));
        $this->assertSame(5000.0, $method->invoke(null, 'Voucher 5k'));
        $this->assertSame(100000.0, $method->invoke(null, 'Premium'));
    }
}
