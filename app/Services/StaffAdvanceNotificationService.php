<?php

namespace App\Services;

use App\Models\StaffAdvanceLedger;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class StaffAdvanceNotificationService
{
    public const ACTION_CREATED = 'created';

    public const ACTION_UPDATED = 'updated';

    public const ACTION_DELETED = 'deleted';

    /**
     * Kirim notifikasi WhatsApp untuk transaksi hutang/piutang.
     * Mengembalikan pesan peringatan jika pengiriman gagal (null jika berhasil atau dilewati).
     */
    public static function notify(StaffAdvanceLedger $entry, string $action, ?User $recorder = null): ?string
    {
        $entry->loadMissing(['staffUser.assignedRouter', 'recorder']);

        $warnings = [];

        if (!self::sendAdminNotification($entry, $action, $recorder)) {
            $warnings[] = 'admin';
        }

        if ($entry->isPiutangType() && $entry->staffUser) {
            $technicianPhone = trim((string) ($entry->staffUser->phone_number ?? ''));
            if ($technicianPhone !== '' && !self::sendTechnicianNotification($entry, $action, $recorder)) {
                $warnings[] = 'teknisi';
            }
        }

        if ($warnings === []) {
            return null;
        }

        return 'Notifikasi WhatsApp ke ' . implode(' dan ', $warnings)
            . ' tidak terkirim. Pastikan gateway WA aktif, sesi terhubung, dan nomor tujuan benar.';
    }

    private static function sendAdminNotification(StaffAdvanceLedger $entry, string $action, ?User $recorder): bool
    {
        $phone = BillingService::getAdminNotifyPhone();
        if (!$phone) {
            Log::info('Staff advance WhatsApp skipped: admin phone not configured.');

            return true;
        }

        $message = MessageTemplateService::render('whatsapp.template.staff_advance_admin', self::variables($entry, $action, $recorder));

        return WhatsAppService::sendText($phone, $message, skipBulkDelay: true);
    }

    private static function sendTechnicianNotification(StaffAdvanceLedger $entry, string $action, ?User $recorder): bool
    {
        $phone = trim((string) ($entry->staffUser?->phone_number ?? ''));
        if ($phone === '') {
            return true;
        }

        $message = MessageTemplateService::render('whatsapp.template.staff_advance_technician', self::variables($entry, $action, $recorder));

        return WhatsAppService::sendText($phone, $message, skipBulkDelay: true);
    }

    /**
     * @return array<string, scalar|null>
     */
    private static function variables(StaffAdvanceLedger $entry, string $action, ?User $recorder): array
    {
        $staffBalance = self::staffKasbonBalance((int) $entry->staff_user_id);
        if ($action === self::ACTION_DELETED && $entry->isPiutangType() && $entry->staff_user_id) {
            $staffBalance = round($staffBalance - $entry->signedAmount(), 2);
        }

        return [
            'brand_name' => BrandingService::companyName(),
            'action_header' => self::actionHeader($action),
            'type_label' => $entry->typeLabel(),
            'staff_name' => self::displayValue($entry->staffUser?->name),
            'router_name' => self::displayValue($entry->staffUser?->assignedRouter?->name),
            'counterparty' => self::displayValue($entry->counterparty),
            'title' => self::displayValue($entry->title),
            'amount' => BillingService::formatWhatsAppMoney((float) $entry->amount),
            'transaction_date' => $entry->transaction_date?->locale('id')->translatedFormat('d M Y') ?? '-',
            'payment_method' => self::displayValue($entry->payment_method),
            'notes' => self::displayValue($entry->notes),
            'recorded_by' => self::displayValue($recorder?->name ?? $entry->recorder?->name),
            'balance_line' => self::balanceLine($entry, $staffBalance),
        ];
    }

    private static function actionHeader(string $action): string
    {
        return match ($action) {
            self::ACTION_UPDATED => 'Transaksi hutang/piutang *diperbarui*.',
            self::ACTION_DELETED => 'Transaksi hutang/piutang *dihapus*.',
            default => 'Transaksi hutang/piutang *baru dicatat*.',
        };
    }

    private static function balanceLine(StaffAdvanceLedger $entry, float $staffBalance): string
    {
        if (!$entry->isPiutangType() || !$entry->staff_user_id) {
            return '';
        }

        $formatted = BillingService::formatWhatsAppMoney(max(0, $staffBalance));

        return "\n• Sisa kasbon teknisi : *{$formatted}*";
    }

    private static function staffKasbonBalance(?int $staffUserId): float
    {
        if (!$staffUserId) {
            return 0.0;
        }

        return round((float) StaffAdvanceLedger::query()
            ->where('staff_user_id', $staffUserId)
            ->whereIn('type', StaffAdvanceLedger::PIUTANG_TYPES)
            ->get()
            ->sum(fn (StaffAdvanceLedger $ledger) => $ledger->signedAmount()), 2);
    }

    private static function displayValue(mixed $value): string
    {
        $value = trim((string) $value);

        return $value !== '' ? $value : '—';
    }
}
