<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NavbarStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_admin_pages_include_navbar_stats(): void
    {
        $admin = User::factory()->create();

        $response = $this->actingAs($admin)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('navbarStats.unpaid_invoices')
            ->has('navbarStats.isolated_customers')
            ->has('navbarStats.routers_online')
            ->has('navbarStats.routers_total')
            ->has('navbarStats.today_revenue')
            ->has('navbarStats.whatsapp.state')
            ->has('navbarStats.whatsapp.label')
        );
    }
}
