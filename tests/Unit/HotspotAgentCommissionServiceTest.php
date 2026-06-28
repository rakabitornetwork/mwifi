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

    public function test_record_sale_uses_agent_commission_amount_stored_on_voucher(): void
    {
        $router = \App\Models\Router::create([
            'name' => 'Test Router',
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'admin',
            'protocol_type' => 'legacy_socket',
        ]);

        $voucher = \App\Models\HotspotVoucher::create([
            'router_id' => $router->id,
            'username' => 'test-user',
            'password' => 'test-pass',
            'mikrotik_profile' => 'default',
            'price' => 2000.0,
            'agent_commission_amount' => 500.0,
            'status' => 'sold',
        ]);

        $seller = User::factory()->create([
            'role' => User::ROLE_OPERATOR,
            'hotspot_commission_percent' => 10.0,
        ]);

        $sale = HotspotAgentCommissionService::recordSale($voucher, 'Cash', $seller);

        $this->assertEquals(2000.0, $sale->price);
        $this->assertEquals(500.0, $sale->agent_amount);
        $this->assertEquals(1500.0, $sale->owner_amount);
        $this->assertEquals(25.0, $sale->commission_percent);
    }

    public function test_ensure_sale_recorded_uses_voucher_user_id_if_no_seller_provided(): void
    {
        $router = \App\Models\Router::create([
            'name' => 'Test Router 2',
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'admin',
            'protocol_type' => 'legacy_socket',
        ]);

        $seller = User::factory()->create([
            'role' => User::ROLE_OPERATOR,
            'hotspot_commission_percent' => 10.0,
        ]);

        $voucher = \App\Models\HotspotVoucher::create([
            'router_id' => $router->id,
            'user_id' => $seller->id,
            'username' => 'test-user-2',
            'password' => 'test-pass-2',
            'mikrotik_profile' => 'default',
            'price' => 2000.0,
            'agent_commission_amount' => 500.0,
            'status' => 'sold',
        ]);

        \App\Services\HotspotVoucherService::ensureSaleRecorded($voucher, 'Otomatis (MAC Terdeteksi)');

        $sale = \App\Models\HotspotSale::where('username', 'test-user-2')->first();

        $this->assertNotNull($sale);
        $this->assertEquals($seller->id, $sale->sold_by_user_id);
        $this->assertEquals(500.0, $sale->agent_amount);
        $this->assertEquals(1500.0, $sale->owner_amount);
    }
}
