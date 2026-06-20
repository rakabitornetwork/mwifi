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

    public function runUpdateStream(Request $request)
    {
        $this->ensureAdmin($request);

        return response()->stream(function () {
            if (function_exists('set_time_limit')) {
                @set_time_limit(0);
            }

            $emit = function (string $event, array $data): void {
                echo "event: {$event}\n";
                echo 'data: ' . json_encode($data, JSON_UNESCAPED_UNICODE) . "\n\n";

                if (ob_get_level() > 0) {
                    ob_flush();
                }

                flush();
            };

            try {
                $result = $this->updateService->runUpdate(function (string $line, string $type) use ($emit) {
                    $emit('log', ['line' => $line, 'type' => $type]);
                });

                $emit('done', [
                    'success' => true,
                    'message' => $result['message'],
                ]);
            } catch (\Throwable $e) {
                $emit('log', ['line' => $e->getMessage(), 'type' => 'error']);
                $emit('done', [
                    'success' => false,
                    'message' => $e->getMessage(),
                ]);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function ensureAdmin(Request $request): void
    {
        if ($request->user()?->customer) {
            abort(403, 'Hanya administrator yang dapat memperbarui aplikasi.');
        }
    }
}
