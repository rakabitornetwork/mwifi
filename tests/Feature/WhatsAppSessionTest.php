<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WhatsAppSessionTest extends TestCase
{
    use RefreshDatabase;

    private function adminUser(): User
    {
        return User::factory()->create();
    }

    public function test_admin_can_fetch_whatsapp_session_status_with_qr(): void
    {
        Http::fake([
            'http://127.0.0.1:3003/health' => Http::response(['success' => true], 200),
            'http://127.0.0.1:3003/session/mwifi_session/status*' => Http::response([
                'success' => true,
                'session' => 'mwifi_session',
                'status' => 'qr',
                'has_qr' => true,
                'qr_data_url' => 'data:image/png;base64,abc',
                'last_error' => null,
                'profile' => null,
            ], 200),
        ]);

        $response = $this->actingAs($this->adminUser())
            ->getJson('/admin/settings/whatsapp-session');

        $response->assertOk();
        $response->assertJson([
            'ok' => true,
            'status' => 'qr',
            'has_qr' => true,
            'qr_data_url' => 'data:image/png;base64,abc',
        ]);
    }

    public function test_admin_can_start_whatsapp_session(): void
    {
        Http::fake([
            'http://127.0.0.1:3003/health' => Http::response(['success' => true], 200),
            'http://127.0.0.1:3003/session/mwifi_session/start' => Http::response([
                'success' => true,
                'session' => 'mwifi_session',
                'status' => 'connecting',
                'message' => 'Session starting.',
            ], 200),
            'http://127.0.0.1:3003/session/mwifi_session/status*' => Http::response([
                'success' => true,
                'session' => 'mwifi_session',
                'status' => 'qr',
                'has_qr' => true,
                'qr_data_url' => 'data:image/png;base64,xyz',
                'last_error' => null,
                'profile' => null,
            ], 200),
        ]);

        $response = $this->actingAs($this->adminUser())
            ->postJson('/admin/settings/whatsapp-session/start');

        $response->assertOk();
        $response->assertJson([
            'ok' => true,
            'status' => 'connecting',
            'has_qr' => true,
        ]);
    }

    public function test_admin_can_reset_whatsapp_session(): void
    {
        Http::fake([
            'http://127.0.0.1:3003/health' => Http::response(['success' => true], 200),
            'http://127.0.0.1:3003/session/mwifi_session/reset' => Http::response([
                'success' => true,
                'session' => 'mwifi_session',
                'status' => 'idle',
                'message' => 'Sesi dihapus.',
            ], 200),
        ]);

        $response = $this->actingAs($this->adminUser())
            ->postJson('/admin/settings/whatsapp-session/reset');

        $response->assertOk();
        $response->assertJson([
            'ok' => true,
            'status' => 'idle',
        ]);
    }

    public function test_admin_can_proxy_whatsapp_session_avatar(): void
    {
        Http::fake([
            'http://127.0.0.1:3003/health' => Http::response(['success' => true], 200),
            'http://127.0.0.1:3003/session/mwifi_session/profile/avatar' => Http::response(
                'fake-image-bytes',
                200,
                ['Content-Type' => 'image/jpeg']
            ),
        ]);

        $response = $this->actingAs($this->adminUser())
            ->get('/admin/settings/whatsapp-session/avatar');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'image/jpeg');
        $this->assertSame('fake-image-bytes', $response->getContent());
    }
}
