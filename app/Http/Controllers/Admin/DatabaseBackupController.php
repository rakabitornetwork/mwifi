<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\DatabaseBackupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class DatabaseBackupController extends Controller
{
    public function __construct(
        private DatabaseBackupService $backupService
    ) {}

    public function createBackup(Request $request): BinaryFileResponse|JsonResponse
    {
        $this->ensureAdmin($request);

        try {
            $backup = $this->backupService->createBackup();

            return response()->download(
                $backup['absolute_path'],
                $backup['filename'],
                ['Content-Type' => 'application/octet-stream']
            )->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Gagal membuat backup: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function restoreBackup(Request $request)
    {
        $this->ensureAdmin($request);

        $request->validate([
            'backup_file' => 'required|file|max:512000',
            'confirm' => 'required|in:RESTORE',
        ], [
            'confirm.in' => 'Ketik RESTORE untuk mengonfirmasi pemulihan database.',
            'backup_file.required' => 'Unggah file backup (.sql atau .sqlite).',
        ]);

        try {
            $file = $request->file('backup_file');
            if (!$file instanceof \Illuminate\Http\UploadedFile) {
                throw new \RuntimeException('File backup wajib diunggah.');
            }

            $extension = strtolower($file->getClientOriginalExtension() ?: '');
            if (!in_array($extension, ['sql', 'sqlite'], true)) {
                throw new \RuntimeException('Format file tidak didukung. Gunakan .sql atau .sqlite');
            }

            $this->backupService->restoreFromUpload($file);

            return redirect()->back()->with(
                'success',
                'Database berhasil dipulihkan. Disarankan refresh halaman atau login ulang jika ada anomali.'
            );
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal restore database: ' . $e->getMessage());
        }
    }

    public function resetApplicationData(Request $request)
    {
        $this->ensureAdmin($request);

        $request->validate([
            'confirm' => 'required|in:RESET',
        ], [
            'confirm.in' => 'Ketik RESET untuk mengonfirmasi reset database.',
        ]);

        try {
            $result = $this->backupService->resetApplicationData(
                $request->user(),
                $request->session()->getId()
            );

            $adminCount = $result['preserved_admin_count'];
            $customerCount = $result['deleted']['customers'] ?? 0;
            $invoiceCount = $result['deleted']['invoices'] ?? 0;

            return redirect()->back()->with(
                'success',
                "Database berhasil direset. {$customerCount} pelanggan, {$invoiceCount} tagihan, dan data operasional terkait dihapus. {$adminCount} akun administrator tetap aman."
            );
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal reset database: ' . $e->getMessage());
        }
    }

    private function ensureAdmin(Request $request): void
    {
        if ($request->user()?->customer) {
            abort(403, 'Hanya administrator yang dapat mengelola backup database.');
        }
    }
}
