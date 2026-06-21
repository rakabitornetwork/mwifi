<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Package;
use App\Models\Router;
use App\Models\User;
use App\Services\DatabaseBackupService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DatabaseBackupTest extends TestCase
{
    use RefreshDatabase;

    private function adminUser(): User
    {
        return User::factory()->create();
    }

    public function test_admin_can_download_backup(): void
    {
        $response = $this->actingAs($this->adminUser())
            ->post('/admin/database/backup');

        $response->assertOk();
        $response->assertDownload();
        $this->assertNotEmpty($response->getFile()->getContent());
    }

    public function test_customer_cannot_create_backup(): void
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
            'username' => 'cust_test',
            'password' => 'pass',
            'name' => 'Pelanggan Test',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 1,
        ]);

        $response = $this->actingAs($user)
            ->post('/admin/database/backup');

        $response->assertForbidden();
    }

    public function test_restore_requires_restore_confirmation(): void
    {
        $response = $this->actingAs($this->adminUser())
            ->post('/admin/database/restore', [
                'confirm' => 'SALAH',
            ]);

        $response->assertSessionHasErrors('confirm');
    }

    public function test_restore_requires_uploaded_file(): void
    {
        $response = $this->actingAs($this->adminUser())
            ->post('/admin/database/restore', [
                'confirm' => 'RESTORE',
            ]);

        $response->assertSessionHasErrors('backup_file');
    }

    public function test_backup_dump_contains_database_rows(): void
    {
        User::factory()->create(['email' => 'backup-marker@example.com']);

        $backup = app(DatabaseBackupService::class)->createBackup();
        $content = Storage::disk('local')->get(
            DatabaseBackupService::TEMP_BACKUP_PATH . '/' . $backup['filename']
        );

        $this->assertStringContainsString('backup-marker@example.com', $content);
    }

    public function test_admin_can_reset_database_while_preserving_admin_accounts(): void
    {
        $admin = $this->adminUser();
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

        $customerUser = User::factory()->create(['email' => 'customer@example.com']);
        $customer = Customer::create([
            'user_id' => $customerUser->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust_reset_test',
            'password' => 'pass',
            'name' => 'Pelanggan Reset',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 1,
        ]);
        Invoice::create([
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-RESET-001',
            'billing_period' => '2026-06',
            'amount' => 100000,
            'tax' => 0,
            'total_amount' => 100000,
            'due_date' => now()->addDays(7)->toDateString(),
            'status' => 'unpaid',
        ]);

        $response = $this->actingAs($admin)
            ->post('/admin/database/reset', ['confirm' => 'RESET']);

        $response->assertRedirect();
        $response->assertSessionHas('success');
        $this->assertDatabaseHas('users', ['email' => $admin->email]);
        $this->assertDatabaseMissing('users', ['email' => 'customer@example.com']);
        $this->assertDatabaseCount('customers', 0);
        $this->assertDatabaseCount('invoices', 0);
        $this->assertDatabaseCount('routers', 0);
        $this->assertDatabaseCount('packages', 0);
    }

    public function test_reset_requires_reset_confirmation(): void
    {
        $response = $this->actingAs($this->adminUser())
            ->post('/admin/database/reset', ['confirm' => 'SALAH']);

        $response->assertSessionHasErrors('confirm');
    }

    public function test_customer_cannot_reset_database(): void
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
        Customer::create([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'service_type' => 'pppoe',
            'username' => 'cust_no_reset',
            'password' => 'pass',
            'name' => 'Pelanggan Test',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => 1,
        ]);

        $response = $this->actingAs($user)
            ->post('/admin/database/reset', ['confirm' => 'RESET']);

        $response->assertForbidden();
    }
}
