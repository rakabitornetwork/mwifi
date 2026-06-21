<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Package;
use App\Models\Router;
use App\Models\User;
use App\Services\AppUpdateService;
use App\Services\DatabaseBackupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AppUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function adminUser(): User
    {
        return User::factory()->create();
    }

    public function test_admin_can_open_update_page(): void
    {
        $response = $this->actingAs($this->adminUser())
            ->get('/update');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Update/Index')
            ->has('appUpdateInfo')
        );
    }

    public function test_update_status_has_expected_structure(): void
    {
        $status = app(AppUpdateService::class)->getStatus();

        $this->assertArrayHasKey('enabled', $status);
        $this->assertArrayHasKey('available', $status);
        $this->assertArrayHasKey('can_run_update', $status);
        $this->assertArrayHasKey('requirements', $status);
        $this->assertArrayHasKey('php_cli', $status['requirements']);
        $this->assertArrayHasKey('repository', $status);
        $this->assertArrayHasKey('local', $status);
        $this->assertArrayHasKey('remote', $status);
        $this->assertArrayHasKey('update_available', $status);
        $this->assertArrayHasKey('release', $status);
        $this->assertArrayHasKey('version', $status['release']);
        $this->assertArrayHasKey('is_latest', $status['release']);
        $this->assertArrayHasKey('remote_version', $status['release']);
        $this->assertSame('1.1', $status['release']['version']);
        $this->assertSame('https://github.com/rakabitornetwork/mwifi', $status['repository']['github_url']);
    }

    public function test_admin_can_check_for_updates(): void
    {
        $response = $this->actingAs($this->adminUser())
            ->post('/admin/update/check');

        $response->assertRedirect();
        $this->assertTrue(
            $response->getSession()->has('success') || $response->getSession()->has('error')
        );
    }

    public function test_run_update_does_not_require_confirm_keyword(): void
    {
        $this->mock(AppUpdateService::class, function ($mock) {
            $mock->shouldReceive('runUpdate')
                ->once()
                ->andReturn(['message' => 'Aplikasi berhasil diperbarui.']);
        });

        $response = $this->actingAs($this->adminUser())
            ->post('/admin/update/run');

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Aplikasi berhasil diperbarui.');
        $response->assertSessionHasNoErrors();
    }

    public function test_admin_can_stream_update_logs(): void
    {
        $this->mock(AppUpdateService::class, function ($mock) {
            $mock->shouldReceive('runUpdate')
                ->once()
                ->andReturnUsing(function (?callable $onLog = null) {
                    $onLog?->__invoke('$ git fetch origin main', 'cmd');
                    $onLog?->__invoke('✓ Fetch dari GitHub', 'success');

                    return ['message' => 'Aplikasi berhasil diperbarui.'];
                });
        });

        $response = $this->actingAs($this->adminUser())
            ->post('/admin/update/run-stream');

        $response->assertOk();
        $this->assertStringContainsString('text/event-stream', (string) $response->headers->get('Content-Type'));

        $content = $response->streamedContent();
        $this->assertStringContainsString('event: log', $content);
        $this->assertStringContainsString('event: done', $content);
        $this->assertStringContainsString('Aplikasi berhasil diperbarui.', $content);
    }

    public function test_admin_can_fetch_update_status_json(): void
    {
        $response = $this->actingAs($this->adminUser())
            ->getJson('/admin/update/status');

        $response->assertOk();
        $response->assertJsonStructure([
            'enabled',
            'update_available',
            'can_run_update',
            'local',
            'remote',
            'release' => [
                'version',
                'is_latest',
                'remote_version',
            ],
        ]);
    }

    public function test_update_page_uses_cached_status_without_fetch(): void
    {
        $this->mock(AppUpdateService::class, function ($mock) {
            $mock->shouldReceive('getCachedStatus')
                ->once()
                ->andReturn([
                    'enabled' => true,
                    'update_available' => false,
                    'can_run_update' => false,
                    'local' => ['commit_short' => 'abc1234'],
                    'remote' => ['commit_short' => 'abc1234'],
                ]);
            $mock->shouldNotReceive('checkForUpdates');
        });

        $response = $this->actingAs($this->adminUser())
            ->get('/update');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/Update/Index')
            ->where('appUpdateInfo.local.commit_short', 'abc1234')
        );
    }

    public function test_customer_cannot_check_updates(): void
    {
        $user = User::factory()->create();
        $router = Router::create([
            'name' => 'Router Test',
            'host' => '127.0.0.1',
            'port' => 8728,
            'username' => 'admin',
            'password' => 'secret',
            'protocol_type' => 'legacy_socket',
            'status' => false,
        ]);
        $package = Package::create([
            'name' => 'Paket Test',
            'type' => 'pppoe',
            'price' => 100000,
            'bandwidth_limit' => '10M/10M',
            'mikrotik_profile' => '10M',
        ]);
        Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust001',
            'password' => 'secret',
            'name' => 'Pelanggan Test',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 1,
        ]);

        $response = $this->actingAs($user)
            ->post('/admin/update/check');

        $response->assertForbidden();
    }

    public function test_resolve_cli_php_binary_uses_configured_path(): void
    {
        config(['update.php_cli_binary' => PHP_BINARY]);

        $binary = app(AppUpdateService::class)->resolveCliPhpBinary();

        $this->assertSame(PHP_BINARY, $binary);
        $this->assertStringNotContainsString('fpm', strtolower($binary));
    }

    public function test_pre_update_backup_creates_persistent_sqlite_file(): void
    {
        Storage::fake('local');

        $backup = app(DatabaseBackupService::class)->createPreUpdateBackup();

        $this->assertArrayHasKey('filename', $backup);
        $this->assertArrayHasKey('relative_path', $backup);
        Storage::disk('local')->assertExists($backup['relative_path']);
        $this->assertStringContainsString('pre-update', $backup['relative_path']);
    }
}
