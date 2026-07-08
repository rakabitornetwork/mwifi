<?php

namespace Tests\Unit;

use App\Services\HotspotProfileScriptBuilder;
use PHPUnit\Framework\TestCase;

class HotspotProfileScriptBuilderTest extends TestCase
{
    public function test_builds_first_login_scheduler_with_mac_lock(): void
    {
        $script = HotspotProfileScriptBuilder::buildOnLoginScript('5h', true);

        $this->assertStringContainsString('interval=5h', $script);
        $this->assertStringContainsString('mac-address=$mac', $script);
        $this->assertStringContainsString('comment=mwifi', $script);
        $this->assertStringContainsString('[:len [/system scheduler find where name=$user]] = 0', $script);
        $this->assertStringContainsString('/system scheduler get [find] name', $script);
        $this->assertStringContainsString('mac-address]] = 0', $script);
    }

    public function test_builds_without_mac_lock(): void
    {
        $script = HotspotProfileScriptBuilder::buildOnLoginScript('6h', false);

        $this->assertStringContainsString('interval=6h', $script);
        $this->assertStringNotContainsString('mac-address=$mac', $script);
    }
}
