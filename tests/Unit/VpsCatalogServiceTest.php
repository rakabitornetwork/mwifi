<?php

namespace Tests\Unit;

use App\Services\VpsCatalogService;
use PHPUnit\Framework\TestCase;

class VpsCatalogServiceTest extends TestCase
{
    public function test_phone_matches_whitelist_with_variants(): void
    {
        $whitelist = ['081234567890'];

        $this->assertTrue(VpsCatalogService::phoneMatchesWhitelist('6281234567890', $whitelist));
        $this->assertTrue(VpsCatalogService::phoneMatchesWhitelist('081234567890', $whitelist));
        $this->assertFalse(VpsCatalogService::phoneMatchesWhitelist('6289999999999', $whitelist));
    }

    public function test_default_plans_are_not_empty(): void
    {
        $plans = VpsCatalogService::defaultPlans();

        $this->assertNotEmpty($plans);
        $this->assertSame('starter', $plans[0]['id']);
    }
}
