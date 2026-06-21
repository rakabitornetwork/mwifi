<?php

namespace Tests\Unit;

use App\Services\Router\MikrotikQuotaService;
use PHPUnit\Framework\TestCase;

class MikrotikQuotaServiceTest extends TestCase
{
    public function test_parse_directional_bytes_handles_slash_format(): void
    {
        $parsed = MikrotikQuotaService::parseDirectionalBytes('1048576/5242880');

        $this->assertSame(1048576, $parsed['upload_bytes']);
        $this->assertSame(5242880, $parsed['download_bytes']);
    }

    public function test_parse_ppp_active_bytes_maps_customer_perspective(): void
    {
        $parsed = MikrotikQuotaService::parsePppActiveBytes([
            'bytes-in' => 2048,
            'bytes-out' => 8192,
        ]);

        $this->assertSame(2048, $parsed['upload_bytes']);
        $this->assertSame(8192, $parsed['download_bytes']);
    }

    public function test_resolve_for_username_matches_aliases(): void
    {
        $map = [
            'user@test' => [
                'download_bytes' => 100,
                'upload_bytes' => 50,
                'total_bytes' => 150,
                'source' => 'simple-queue',
            ],
        ];

        $resolved = MikrotikQuotaService::resolveForUsername($map, 'user');

        $this->assertSame(100, $resolved['download_bytes']);
        $this->assertSame('simple-queue', $resolved['source']);
    }
}
