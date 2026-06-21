<?php

namespace App\Services;

class PaymentInstructionService
{
    public static function bankName(): string
    {
        return trim((string) SettingService::get('payment.bank_name', ''));
    }

    public static function bankAccountNumber(): string
    {
        return trim((string) SettingService::get('payment.bank_account_number', ''));
    }

    public static function bankAccountHolder(): string
    {
        return trim((string) SettingService::get('payment.bank_account_holder', ''));
    }

    public static function hasBankInfo(): bool
    {
        return self::bankName() !== '' || self::bankAccountNumber() !== '';
    }

    public static function formatBankInfo(): string
    {
        if (!self::hasBankInfo()) {
            return '';
        }

        $lines = [];
        if (self::bankName() !== '') {
            $lines[] = '• Bank          : *' . self::bankName() . '*';
        }
        if (self::bankAccountNumber() !== '') {
            $lines[] = '• No. Rekening  : *' . self::bankAccountNumber() . '*';
        }
        if (self::bankAccountHolder() !== '') {
            $lines[] = '• Atas Nama     : *' . self::bankAccountHolder() . '*';
        }

        return implode("\n", $lines);
    }

    public static function formatPaymentInstructions(): string
    {
        $bankInfo = self::formatBankInfo();
        $whatsapp = WhatsAppService::getLinkedPhoneForMessages();

        $lines = ['', '*Cara Pembayaran*'];

        if ($bankInfo !== '') {
            $lines[] = $bankInfo;
        } else {
            $lines[] = 'Silakan lakukan pembayaran melalui Portal Pelanggan atau metode yang tersedia.';
        }

        $lines[] = '';

        if ($whatsapp !== '' && $whatsapp !== '-') {
            $lines[] = 'Setelah transfer, mohon konfirmasi dan kirim bukti pembayaran ke WhatsApp kami:';
            $lines[] = '*' . $whatsapp . '*';
        } else {
            $lines[] = 'Setelah transfer, mohon konfirmasi pembayaran melalui Portal Pelanggan atau hubungi tim kami.';
        }

        return implode("\n", $lines);
    }

    /**
     * @return array{bank_info: string, whatsapp_contact: string, payment_instructions: string}
     */
    public static function templateVariables(): array
    {
        return [
            'bank_info' => self::formatBankInfo(),
            'whatsapp_contact' => WhatsAppService::getLinkedPhoneForMessages(),
            'payment_instructions' => self::formatPaymentInstructions(),
        ];
    }
}
