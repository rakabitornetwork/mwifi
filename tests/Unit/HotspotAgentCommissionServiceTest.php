<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\HotspotAgentCommissionService;
use App\Services\SettingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HotspotAgentCommissionServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_split_amount_calculates_agent_and_owner_shares(): void
    {
        $split = HotspotAgentCommissionService::splitAmount(10000, 20);

        $this->assertSame(20.0, $split['commission_percent']);
        $this->assertSame(2000.0, $split['agent_amount']);
        $this->assertSame(8000.0, $split['owner_amount']);
    }

    public function test_resolve_commission_percent_uses_operator_default_setting(): void
    {
        SettingService::set(
            HotspotAgentCommissionService::SETTING_DEFAULT_PERCENT,
            '25',
            'hotspot',
            false,
        );

        $operator = User::factory()->create([
            'role' => User::ROLE_OPERATOR,
            'hotspot_commission_percent' => null,
        ]);

        $this->assertSame(25.0, HotspotAgentCommissionService::resolveCommissionPercent($operator));
    }

    public function test_resolve_commission_percent_uses_user_override(): void
    {
        SettingService::set(
            HotspotAgentCommissionService::SETTING_DEFAULT_PERCENT,
            '25',
            'hotspot',
            false,
        );

        $operator = User::factory()->create([
            'role' => User::ROLE_OPERATOR,
            'hotspot_commission_percent' => 30,
        ]);

        $this->assertSame(30.0, HotspotAgentCommissionService::resolveCommissionPercent($operator));
    }

    public function test_resolve_commission_percent_is_zero_without_seller(): void
    {
        $this->assertSame(0.0, HotspotAgentCommissionService::resolveCommissionPercent(null));
    }
}
