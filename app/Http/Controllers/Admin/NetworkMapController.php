<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Router;
use App\Services\GenieAcsService;
use App\Services\Router\MikrotikTrafficService;
use App\Services\Router\RouterService;
use Illuminate\Support\Facades\Log;

class NetworkMapController extends Controller
{
    /**
     * Aggregate ONT telemetry (GenieACS) and live session traffic (MikroTik).
     */
    public function metrics()
    {
        $ontDevices = GenieAcsService::getOntDevices();
        $trafficPayload = $this->fetchTrafficPayload();

        return response()->json([
            'ont' => $this->indexOntByUsername($ontDevices),
            'ont_devices' => $ontDevices,
            'traffic' => $trafficPayload['merged'],
            'traffic_by_router' => $trafficPayload['by_router'],
        ]);
    }

    private function indexOntByUsername(array $devices): array
    {
        $map = [];

        foreach ($devices as $device) {
            $username = trim((string) ($device['username'] ?? ''));
            if ($username === '' || $username === 'unknown_ont') {
                continue;
            }

            $aliases = array_unique(array_filter([
                $username,
                strtolower($username),
                explode('@', $username)[0],
                strtolower(explode('@', $username)[0]),
            ]));

            foreach ($aliases as $alias) {
                $map[$alias] = $device;
            }
        }

        return $map;
    }

    private function fetchTrafficPayload(): array
    {
        $merged = [];
        $byRouter = [];

        foreach (Router::all() as $router) {
            try {
                $connector = RouterService::getConnector($router);
                $routerTraffic = MikrotikTrafficService::fetchForConnector($connector);
                $byRouter[(string) $router->id] = $routerTraffic;

                foreach ($routerTraffic as $username => $entry) {
                    $merged[$username] = $entry;
                }
            } catch (\Exception $e) {
                Log::warning("Network map traffic fetch failed for router {$router->id}: " . $e->getMessage());
                $byRouter[(string) $router->id] = [];
            }
        }

        return [
            'merged' => $merged,
            'by_router' => $byRouter,
        ];
    }
}
