<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\NetworkMapMetricsService;
use App\Services\StaffRouterScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

class NetworkMapController extends Controller
{
    /**
     * Aggregate ONT telemetry (GenieACS) and live session traffic (MikroTik).
     */
    public function metrics(Request $request)
    {
        $scope = StaffRouterScope::for($request->user());
        $routerId = $request->filled('router_id') ? (int) $request->integer('router_id') : null;
        $force = $request->boolean('refresh');

        try {
            return response()->json(
                NetworkMapMetricsService::getPayload($scope, $routerId, $force)
            );
        } catch (\Throwable $e) {
            if ($e instanceof HttpExceptionInterface) {
                throw $e;
            }

            Log::warning('Network map metrics failed: ' . $e->getMessage());

            $stale = NetworkMapMetricsService::getStalePayload($scope, $routerId);
            if ($stale !== null) {
                return response()->json($stale);
            }

            return response()->json([
                'ont' => [],
                'ont_devices' => [],
                'traffic' => [],
                'traffic_by_router' => [],
                'stale' => true,
                'error' => 'Metrik sementara tidak tersedia. Coba lagi dalam beberapa detik.',
            ]);
        }
    }

    /**
     * Save custom network cable path coordinates for a customer.
     */
    public function saveCablePath(\Illuminate\Http\Request $request)
    {
        $data = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'cable_path' => 'nullable|array',
        ]);

        $customer = \App\Models\Customer::findOrFail($data['customer_id']);

        $customer->update([
            'cable_path' => $data['cable_path'],
        ]);

        return redirect()->back()->with('success', 'Jalur kabel pelanggan ' . $customer->name . ' berhasil disimpan.');
    }

    /**
     * Update customer GPS coordinates.
     */
    public function updateCustomerGps(\Illuminate\Http\Request $request)
    {
        $data = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $customer = \App\Models\Customer::findOrFail($data['customer_id']);

        $customer->update([
            'latitude' => $data['latitude'],
            'longitude' => $data['longitude'],
        ]);

        return redirect()->back()->with('success', 'Lokasi GPS pelanggan ' . $customer->name . ' berhasil diperbarui.');
    }
}
