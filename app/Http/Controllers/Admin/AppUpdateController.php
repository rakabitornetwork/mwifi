<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AppUpdateService;
use Illuminate\Http\Request;

class AppUpdateController extends Controller
{
    public function __construct(
        private AppUpdateService $updateService
    ) {}

    public function checkUpdates(Request $request)
    {
        $this->ensureAdmin($request);

        try {
            $status = $this->updateService->checkForUpdates(true);

            if ($status['update_available'] ?? false) {
                $behind = (int) ($status['behind_count'] ?? 0);
                $message = $behind > 0
                    ? "Pembaruan tersedia ({$behind} commit di belakang GitHub)."
                    : 'Pembaruan tersedia di GitHub.';

                return redirect()->back()->with('success', $message);
            }

            return redirect()->back()->with('success', 'Aplikasi sudah versi terbaru dari GitHub.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal memeriksa pembaruan: ' . $e->getMessage());
        }
    }

    public function runUpdate(Request $request)
    {
        $this->ensureAdmin($request);

        try {
            $result = $this->updateService->runUpdate();

            return redirect()->back()->with('success', $result['message']);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal memperbarui aplikasi: ' . $e->getMessage());
        }
    }

    private function ensureAdmin(Request $request): void
    {
        if ($request->user()?->customer) {
            abort(403, 'Hanya administrator yang dapat memperbarui aplikasi.');
        }
    }
}
