<?php

namespace App\Services\Router;

use App\Models\Customer;
use App\Models\CustomerBandwidthUsage;

class CustomerBandwidthUsageService
{
    public static function currentPeriod(): string
    {
        return now()->format('Y-m');
    }

    /**
     * @return array<string, mixed>
     */
    public static function getMonthlyUsage(Customer $customer, bool $sample = true): array
    {
        if (!$customer->router) {
            return self::emptyPayload(false);
        }

        if ($sample) {
            try {
                self::sampleCustomer($customer);
            } catch (\Throwable) {
                // Keep last stored totals when RouterOS is unreachable.
            }
        }

        $usage = CustomerBandwidthUsage::query()
            ->where('customer_id', $customer->id)
            ->where('period', self::currentPeriod())
            ->first();

        if (!$usage) {
            return self::emptyPayload(self::isCustomerOnline($customer));
        }

        return [
            'online' => self::isCustomerOnline($customer),
            'download_bytes' => (int) $usage->download_bytes,
            'upload_bytes' => (int) $usage->upload_bytes,
            'total_bytes' => (int) $usage->total_bytes,
            'download_limit_bytes' => null,
            'upload_limit_bytes' => null,
            'period' => $usage->period,
            'last_sampled_at' => $usage->last_sampled_at?->toIso8601String(),
        ];
    }

    public static function sampleCustomer(Customer $customer): ?CustomerBandwidthUsage
    {
        $customer->loadMissing('router');

        if (!$customer->router) {
            return null;
        }

        $connector = RouterService::getConnector($customer->router);
        $quotaMap = MikrotikQuotaService::fetchForConnector($connector);
        $raw = MikrotikQuotaService::resolveForUsername($quotaMap, $customer->username);

        $usage = CustomerBandwidthUsage::query()->firstOrCreate(
            [
                'customer_id' => $customer->id,
                'period' => self::currentPeriod(),
            ],
            [
                'upload_bytes' => 0,
                'download_bytes' => 0,
                'last_raw_upload' => 0,
                'last_raw_download' => 0,
            ]
        );

        if (!$raw) {
            $usage->last_sampled_at = now();
            $usage->save();

            return $usage;
        }

        $rawUpload = (int) ($raw['upload_bytes'] ?? 0);
        $rawDownload = (int) ($raw['download_bytes'] ?? 0);
        $source = (string) ($raw['source'] ?? '');

        if ($usage->last_sampled_at === null) {
            $usage->last_raw_upload = $rawUpload;
            $usage->last_raw_download = $rawDownload;
            $usage->last_source = $source;
            $usage->last_sampled_at = now();
            $usage->save();

            return $usage;
        }

        if ($usage->last_source !== null && $usage->last_source !== $source) {
            $usage->last_raw_upload = $rawUpload;
            $usage->last_raw_download = $rawDownload;
            $usage->last_source = $source;
            $usage->last_sampled_at = now();
            $usage->save();

            return $usage;
        }

        $usage->upload_bytes += self::deltaBytes($rawUpload, (int) $usage->last_raw_upload);
        $usage->download_bytes += self::deltaBytes($rawDownload, (int) $usage->last_raw_download);
        $usage->last_raw_upload = $rawUpload;
        $usage->last_raw_download = $rawDownload;
        $usage->last_source = $source;
        $usage->last_sampled_at = now();
        $usage->save();

        return $usage;
    }

    public static function sampleAllActiveCustomers(): int
    {
        $count = 0;

        Customer::query()
            ->whereNotNull('router_id')
            ->whereIn('status', ['active', 'isolated'])
            ->with('router')
            ->orderBy('id')
            ->chunkById(50, function ($customers) use (&$count) {
                foreach ($customers as $customer) {
                    try {
                        self::sampleCustomer($customer);
                        $count++;
                    } catch (\Throwable) {
                        continue;
                    }
                }
            });

        return $count;
    }

    private static function deltaBytes(int $current, int $previous): int
    {
        if ($current >= $previous) {
            return $current - $previous;
        }

        return $current;
    }

    private static function isCustomerOnline(Customer $customer): bool
    {
        if (!$customer->router) {
            return false;
        }

        try {
            $connector = RouterService::getConnector($customer->router);

            foreach ($connector->getActiveConnections() as $session) {
                if (!is_array($session)) {
                    continue;
                }

                if (RouterService::matchesPppUsername($session, $customer->username)) {
                    return true;
                }
            }
        } catch (\Throwable) {
            return false;
        }

        return false;
    }

    /**
     * @return array<string, mixed>
     */
    private static function emptyPayload(bool $online): array
    {
        return [
            'online' => $online,
            'download_bytes' => 0,
            'upload_bytes' => 0,
            'total_bytes' => 0,
            'download_limit_bytes' => null,
            'upload_limit_bytes' => null,
            'period' => self::currentPeriod(),
            'last_sampled_at' => null,
        ];
    }
}
