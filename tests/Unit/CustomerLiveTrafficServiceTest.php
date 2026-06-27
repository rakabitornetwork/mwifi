<?php

namespace Tests\Unit;

use App\Services\Router\CustomerLiveTrafficService;
use PHPUnit\Framework\TestCase;

class CustomerLiveTrafficServiceTest extends TestCase
{
    public function test_resolve_entry_matches_username_aliases(): void
    {
        $method = new \ReflectionMethod(CustomerLiveTrafficService::class, 'resolveEntry');
        $method->setAccessible(true);

        $trafficMap = [
            'user@test' => [
                'online' => true,
                'download_bps' => 5_000_000,
                'upload_bps' => 1_000_000,
            ],
        ];

        $entry = $method->invoke(null, $trafficMap, 'user@test');

        $this->assertSame(5_000_000, $entry['download_bps']);
        $this->assertSame(1_000_000, $entry['upload_bps']);
    }

    public function test_resolve_entry_matches_username_without_domain(): void
    {
        $method = new \ReflectionMethod(CustomerLiveTrafficService::class, 'resolveEntry');
        $method->setAccessible(true);

        $trafficMap = [
            'user' => [
                'online' => true,
                'download_bps' => 2_000_000,
                'upload_bps' => 500_000,
            ],
        ];

        $entry = $method->invoke(null, $trafficMap, 'user@test');

        $this->assertSame(2_000_000, $entry['download_bps']);
    }
}
