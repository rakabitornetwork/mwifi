<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\NetworkMapMetricsService;
use App\Services\StaffRouterScope;
use Illuminate\Http\Request;

class NetworkMapController extends Controller
{
    /**
     * Aggregate ONT telemetry (GenieACS) and live session traffic (MikroTik).
     */
    public function metrics(Request $request)
    {
        $scope = StaffRouterScope::for($request->user());
        $routerId = $request->filled('router_id') ? (int) $request->integer('router_id') : null;

        return response()->json(
            NetworkMapMetricsService::getPayload($scope, $routerId, $request->boolean('refresh'))
        );
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
