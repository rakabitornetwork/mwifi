<?php

namespace App\Services;

use App\Models\Customer;
use App\Services\Router\RouterService;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Log;

class CustomerServiceScheduleService
{
    /**
     * Whether the customer has a complete schedule configuration.
     */
    public static function isScheduleEnabled(Customer $customer): bool
    {
        return (bool) $customer->service_schedule_enabled
            && $customer->service_schedule_off_at !== null
            && $customer->service_schedule_on_at !== null;
    }

    /**
     * Normalize stored time (H:i:s or H:i) to minutes since midnight.
     */
    public static function timeToMinutes(?string $time): ?int
    {
        if ($time === null || trim($time) === '') {
            return null;
        }

        $parts = explode(':', trim($time));
        if (count($parts) < 2) {
            return null;
        }

        return ((int) $parts[0] * 60) + (int) $parts[1];
    }

    /**
     * Whether the current time falls inside the scheduled off window.
     */
    public static function isInOffWindow(Customer $customer, ?Carbon $now = null): bool
    {
        if (! self::isScheduleEnabled($customer)) {
            return false;
        }

        $offMinutes = self::timeToMinutes((string) $customer->service_schedule_off_at);
        $onMinutes = self::timeToMinutes((string) $customer->service_schedule_on_at);

        if ($offMinutes === null || $onMinutes === null || $offMinutes === $onMinutes) {
            return false;
        }

        $now = $now ?? Carbon::now(config('app.timezone'));
        $currentMinutes = ($now->hour * 60) + $now->minute;

        if ($offMinutes < $onMinutes) {
            return $currentMinutes >= $offMinutes && $currentMinutes < $onMinutes;
        }

        return $currentMinutes >= $offMinutes || $currentMinutes < $onMinutes;
    }

    /**
     * Schedule only applies to active PPPoE customers without pending billing pause.
     */
    public static function canApplySchedule(Customer $customer): bool
    {
        if ($customer->service_type !== 'pppoe') {
            return false;
        }

        if ($customer->status !== 'active') {
            return false;
        }

        return ! BillingService::customerHasPendingServicePause($customer);
    }

    /**
     * Turn off PPPoE on router for the scheduled off window.
     */
    public static function applyScheduledOff(Customer $customer): bool
    {
        if (! self::canApplySchedule($customer) || $customer->service_schedule_is_off) {
            return false;
        }

        if (! self::disableOnRouter($customer)) {
            return false;
        }

        $customer->update(['service_schedule_is_off' => true]);

        return true;
    }

    /**
     * Turn PPPoE back on after the scheduled off window ends.
     */
    public static function applyScheduledOn(Customer $customer): bool
    {
        if (! $customer->service_schedule_is_off) {
            return false;
        }

        if (! self::canApplySchedule($customer)) {
            $customer->update(['service_schedule_is_off' => false]);

            return false;
        }

        if (! self::enableOnRouter($customer)) {
            return false;
        }

        $customer->update(['service_schedule_is_off' => false]);

        return true;
    }

    /**
     * Process all customers with an active schedule.
     *
     * @return array{off: int, on: int}
     */
    public static function processScheduledCustomers(): array
    {
        $turnedOff = 0;
        $turnedOn = 0;

        Customer::query()
            ->where('service_schedule_enabled', true)
            ->where('service_type', 'pppoe')
            ->whereNotNull('service_schedule_off_at')
            ->whereNotNull('service_schedule_on_at')
            ->chunkById(100, function ($customers) use (&$turnedOff, &$turnedOn) {
                foreach ($customers as $customer) {
                    if (self::isInOffWindow($customer)) {
                        if (self::applyScheduledOff($customer)) {
                            $turnedOff++;
                        }
                    } elseif (self::applyScheduledOn($customer)) {
                        $turnedOn++;
                    }
                }
            });

        return ['off' => $turnedOff, 'on' => $turnedOn];
    }

    /**
     * Reconcile router state after admin saves schedule settings.
     */
    public static function syncAfterScheduleChange(Customer $customer): void
    {
        $customer = $customer->fresh();

        if (! self::isScheduleEnabled($customer)) {
            if ($customer->service_schedule_is_off) {
                self::applyScheduledOn($customer);
            }

            return;
        }

        if (self::isInOffWindow($customer)) {
            self::applyScheduledOff($customer);
        } elseif ($customer->service_schedule_is_off) {
            self::applyScheduledOn($customer);
        }
    }

    /**
     * Disable PPPoE secret on MikroTik without changing billing status.
     */
    public static function disableOnRouter(Customer $customer): bool
    {
        $customer->loadMissing(['router', 'package']);

        $router = $customer->router;
        if (! $router || ! $router->status || ! $customer->package) {
            return false;
        }

        try {
            $connector = RouterService::getConnector($router);

            $success = (bool) $connector->updateSecret($customer->username, [
                'profile' => $customer->package->mikrotik_profile,
                'disabled' => 'yes',
            ]);

            if ($success) {
                $connector->kickActiveConnection($customer->username);
            }

            return $success;
        } catch (Exception $e) {
            Log::error("Failed scheduled off for {$customer->username}: " . $e->getMessage());

            return false;
        }
    }

    /**
     * Re-enable PPPoE secret on MikroTik without changing billing status.
     */
    public static function enableOnRouter(Customer $customer): bool
    {
        $customer->loadMissing(['router', 'package']);

        $router = $customer->router;
        if (! $router || ! $router->status || ! $customer->package) {
            return false;
        }

        try {
            $connector = RouterService::getConnector($router);

            return (bool) $connector->updateSecret($customer->username, [
                'profile' => $customer->package->mikrotik_profile,
                'disabled' => 'no',
            ]);
        } catch (Exception $e) {
            Log::error("Failed scheduled on for {$customer->username}: " . $e->getMessage());

            return false;
        }
    }

    /**
     * Format schedule time for HTML time inputs (HH:MM).
     */
    public static function formatTimeForInput(?string $time): ?string
    {
        $minutes = self::timeToMinutes($time);
        if ($minutes === null) {
            return null;
        }

        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
    }
}
