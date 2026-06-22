<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Router;
use Illuminate\Support\Facades\Cache;

class NavbarStatsService
{
    /**
     * @return array{
     *     unpaid_invoices: int,
     *     isolated_customers: int,
     *     routers_online: int,
     *     routers_total: int,
     *     today_revenue: float,
     *     whatsapp: array{state: string, label: string}
     * }
     */
    public static function summarize(): array
    {
        return [
            'unpaid_invoices' => Invoice::query()->where('status', 'unpaid')->count(),
            'isolated_customers' => Customer::query()->where('status', 'isolated')->count(),
            'routers_online' => Router::query()->where('status', true)->count(),
            'routers_total' => Router::query()->count(),
            'today_revenue' => (float) (BillingService::summarizeTodayRevenue()['total'] ?? 0),
            'whatsapp' => self::whatsappStatus(),
        ];
    }

    /**
     * @return array{state: string, label: string}
     */
    public static function whatsappStatus(): array
    {
        $config = WhatsAppService::configuration();

        if (!$config['enabled']) {
            return [
                'state' => 'disabled',
                'label' => 'Nonaktif',
            ];
        }

        if ($config['api_url'] === '') {
            return [
                'state' => 'unconfigured',
                'label' => 'Belum diatur',
            ];
        }

        return Cache::remember('navbar.whatsapp_status', 45, function () {
            $session = WhatsAppService::getSessionStatus();

            if (!($session['ok'] ?? false)) {
                return [
                    'state' => 'unreachable',
                    'label' => 'Gateway offline',
                ];
            }

            if (($session['status'] ?? '') === 'open') {
                return [
                    'state' => 'connected',
                    'label' => 'Terhubung',
                ];
            }

            if (($session['has_qr'] ?? false)) {
                return [
                    'state' => 'pairing',
                    'label' => 'Scan QR',
                ];
            }

            return [
                'state' => 'disconnected',
                'label' => 'Terputus',
            ];
        });
    }
}
