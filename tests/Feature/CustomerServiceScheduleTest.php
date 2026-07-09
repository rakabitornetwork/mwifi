<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Package;
use App\Models\Router;
use App\Models\User;
use App\Services\CustomerServiceScheduleService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerServiceScheduleTest extends TestCase
{
    use RefreshDatabase;

    private function makeActiveCustomer(array $overrides = []): Customer
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
            'name' => 'Paket 150K',
            'type' => 'pppoe',
            'price' => 150000,
            'bandwidth_limit' => '20M/20M',
            'mikrotik_profile' => '20M',
        ]);

        return Customer::create(array_merge([
            'user_id' => $user->id,
            'router_id' => $router->id,
            'package_id' => $package->id,
            'service_type' => 'pppoe',
            'username' => 'cust_' . uniqid(),
            'password' => 'pass',
            'name' => 'Pelanggan Jadwal',
            'phone_number' => '6281234567890',
            'address' => 'Alamat test',
            'status' => 'active',
            'billing_date' => '2026-07-01',
            'service_start_date' => '2020-01-01',
        ], $overrides));
    }

    public function test_overnight_off_window_detects_late_night(): void
    {
        $customer = $this->makeActiveCustomer([
            'service_schedule_enabled' => true,
            'service_schedule_off_at' => '22:00:00',
            'service_schedule_on_at' => '06:00:00',
        ]);

        $this->assertTrue(CustomerServiceScheduleService::isInOffWindow(
            $customer,
            Carbon::parse('2026-07-09 23:30:00', config('app.timezone'))
        ));
    }

    public function test_overnight_off_window_detects_early_morning(): void
    {
        $customer = $this->makeActiveCustomer([
            'service_schedule_enabled' => true,
            'service_schedule_off_at' => '22:00:00',
            'service_schedule_on_at' => '06:00:00',
        ]);

        $this->assertTrue(CustomerServiceScheduleService::isInOffWindow(
            $customer,
            Carbon::parse('2026-07-09 05:30:00', config('app.timezone'))
        ));
    }

    public function test_overnight_off_window_allows_daytime(): void
    {
        $customer = $this->makeActiveCustomer([
            'service_schedule_enabled' => true,
            'service_schedule_off_at' => '22:00:00',
            'service_schedule_on_at' => '06:00:00',
        ]);

        $this->assertFalse(CustomerServiceScheduleService::isInOffWindow(
            $customer,
            Carbon::parse('2026-07-09 12:00:00', config('app.timezone'))
        ));
    }

    public function test_same_day_off_window(): void
    {
        $customer = $this->makeActiveCustomer([
            'service_schedule_enabled' => true,
            'service_schedule_off_at' => '09:00:00',
            'service_schedule_on_at' => '17:00:00',
        ]);

        $this->assertTrue(CustomerServiceScheduleService::isInOffWindow(
            $customer,
            Carbon::parse('2026-07-09 12:00:00', config('app.timezone'))
        ));

        $this->assertFalse(CustomerServiceScheduleService::isInOffWindow(
            $customer,
            Carbon::parse('2026-07-09 18:00:00', config('app.timezone'))
        ));
    }

    public function test_schedule_does_not_apply_to_inactive_customers(): void
    {
        $customer = $this->makeActiveCustomer([
            'status' => 'inactive',
            'service_schedule_enabled' => true,
            'service_schedule_off_at' => '22:00:00',
            'service_schedule_on_at' => '06:00:00',
        ]);

        $this->assertFalse(CustomerServiceScheduleService::canApplySchedule($customer));
    }

    public function test_apply_scheduled_off_sets_flag_without_router(): void
    {
        $customer = $this->makeActiveCustomer([
            'service_schedule_enabled' => true,
            'service_schedule_off_at' => '22:00:00',
            'service_schedule_on_at' => '06:00:00',
        ]);

        Carbon::setTestNow(Carbon::parse('2026-07-09 23:00:00', config('app.timezone')));

        $this->assertFalse(CustomerServiceScheduleService::applyScheduledOff($customer));

        Carbon::setTestNow();
    }

    public function test_sync_after_schedule_disabled_clears_off_flag(): void
    {
        $customer = $this->makeActiveCustomer([
            'service_schedule_enabled' => false,
            'service_schedule_is_off' => true,
        ]);

        CustomerServiceScheduleService::syncAfterScheduleChange($customer);

        $this->assertFalse($customer->fresh()->service_schedule_is_off);
    }

    public function test_format_time_for_input(): void
    {
        $this->assertSame('22:00', CustomerServiceScheduleService::formatTimeForInput('22:00:00'));
        $this->assertSame('06:30', CustomerServiceScheduleService::formatTimeForInput('06:30:00'));
    }
}
