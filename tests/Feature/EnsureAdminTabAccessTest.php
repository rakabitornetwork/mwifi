<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnsureAdminTabAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_operator_cannot_hit_settings_api(): void
    {
        $operator = User::factory()->create([
            'role' => User::ROLE_OPERATOR,
            'is_active' => true,
        ]);

        $this->actingAs($operator)
            ->post('/admin/settings/save', [])
            ->assertForbidden();
    }

    public function test_operator_can_hit_hotspot_api_path(): void
    {
        $operator = User::factory()->create([
            'role' => User::ROLE_OPERATOR,
            'is_active' => true,
        ]);

        // Validation may fail, but tab middleware must not 403 before the controller.
        $response = $this->actingAs($operator)
            ->getJson('/admin/hotspot/active-sessions');

        $this->assertNotSame(403, $response->status());
    }

    public function test_technician_cannot_hit_hotspot_api(): void
    {
        $technician = User::factory()->create([
            'role' => User::ROLE_TECHNICIAN,
            'is_active' => true,
        ]);

        $this->actingAs($technician)
            ->getJson('/admin/hotspot/active-sessions')
            ->assertForbidden();
    }

    public function test_admin_can_access_messaging_whatsapp_session_via_settings_prefix(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/admin/settings/whatsapp-session');

        $this->assertNotSame(403, $response->status());
    }
}
