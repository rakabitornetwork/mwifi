<?php

namespace Tests\Feature;

use App\Models\StaffAdvanceLedger;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StaffAdvanceLedgerTest extends TestCase
{
    use RefreshDatabase;

    public function test_hutang_piutang_page_is_accessible_for_admin(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-06-24 12:00:00'));

        $admin = User::factory()->create();
        $technician = User::factory()->create([
            'role' => User::ROLE_TECHNICIAN,
            'name' => 'Teknisi A',
        ]);

        StaffAdvanceLedger::create([
            'staff_user_id' => $technician->id,
            'recorded_by' => $admin->id,
            'type' => StaffAdvanceLedger::TYPE_KASBON,
            'title' => 'Kasbon BBM',
            'amount' => 150000,
            'transaction_date' => '2026-06-24',
        ]);

        $response = $this->actingAs($admin)->get('/hutang-piutang');

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Admin/HutangPiutang/Index')
            ->has('report.summary')
            ->where('report.summary.total_piutang', 150000)
            ->where('report.summary.period_kasbon', 150000)
        );
    }

    public function test_admin_can_record_kasbon_and_pelunasan(): void
    {
        $admin = User::factory()->create();
        $technician = User::factory()->create(['role' => User::ROLE_TECHNICIAN]);

        $this->actingAs($admin)->post('/admin/hutang-piutang/save', [
            'type' => StaffAdvanceLedger::TYPE_KASBON,
            'staff_user_id' => $technician->id,
            'title' => 'Kasbon operasional',
            'amount' => 200000,
            'transaction_date' => '2026-06-24',
        ])->assertRedirect();

        $this->actingAs($admin)->post('/admin/hutang-piutang/save', [
            'type' => StaffAdvanceLedger::TYPE_PELUNASAN,
            'staff_user_id' => $technician->id,
            'title' => 'Pelunasan kasbon',
            'amount' => 50000,
            'transaction_date' => '2026-06-24',
        ])->assertRedirect();

        $this->assertDatabaseCount('staff_advance_ledgers', 2);

        $balance = StaffAdvanceLedger::query()->get()->sum(fn (StaffAdvanceLedger $entry) => $entry->signedAmount());
        $this->assertSame(150000.0, $balance);
    }

    public function test_technician_cannot_access_hutang_piutang_page(): void
    {
        $technician = User::factory()->create(['role' => User::ROLE_TECHNICIAN]);

        $this->actingAs($technician)->get('/hutang-piutang')->assertForbidden();
    }
}
