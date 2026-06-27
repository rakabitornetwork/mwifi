<?php

namespace App\Services;

class PaymentInstructionService
{
    public static function activeGatewayName(): string
    {
        return strtolower(trim((string) SettingService::get('payment.active_gateway', 'tripay')));
    }

    public static function isActiveGatewaySandbox(): bool
    {
        $gateway = self::activeGatewayName();
        $modeKey = match ($gateway) {
            'midtrans' => 'payment.midtrans.mode',
            'duitku' => 'payment.duitku.mode',
            default => 'payment.tripay.mode',
        };

        return SettingService::get($modeKey, 'sandbox') !== 'production';
    }

    /**
     * Whether customers can open checkout on the active payment gateway from the portal.
     */
    public static function isPortalGatewayCheckoutEnabled(): bool
    {
        $explicit = trim((string) SettingService::get('payment.portal_gateway_enabled', ''));
        if ($explicit !== '') {
            return filter_var($explicit, FILTER_VALIDATE_BOOLEAN);
        }

        return !self::isActiveGatewaySandbox();
    }

    public static function manualConfirmPhone(): string
    {
        $phone = trim((string) SettingService::get('payment.manual_confirm_phone', ''));
        if ($phone !== '') {
            return $phone;
        }

        return WhatsAppService::getLinkedPhoneForMessages();
    }

    /**
     * Payment guidance shown on the customer portal when gateway checkout is unavailable.
     *
     * @return array<string, mixed>
     */
    public static function portalManualPaymentInfo(): array
    {
        $danaNumber = self::danaNumber();

        return [
            'gateway_checkout_enabled' => self::isPortalGatewayCheckoutEnabled(),
            'gateway_sandbox' => self::isActiveGatewaySandbox(),
            'active_gateway' => self::activeGatewayName(),
            'cash_enabled' => true,
            'bank' => [
                'name' => self::bankName(),
                'account_number' => self::bankAccountNumber(),
                'account_holder' => self::bankAccountHolder(),
                'configured' => self::hasBankInfo(),
            ],
            'dana' => [
                'number' => $danaNumber !== '' ? self::formatDanaDisplayNumber($danaNumber) : '',
                'account_holder' => self::danaAccountHolder(),
                'configured' => self::hasDanaInfo(),
            ],
            'whatsapp' => self::manualConfirmPhone(),
        ];
    }

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

    public static function danaNumber(): string
    {
        return trim((string) SettingService::get('payment.dana_number', ''));
    }

    public static function danaAccountHolder(): string
    {
        return trim((string) SettingService::get('payment.dana_account_holder', ''));
    }

    public static function hasBankInfo(): bool
    {
        return self::bankName() !== '' || self::bankAccountNumber() !== '';
    }

    public static function hasDanaInfo(): bool
    {
        return self::danaNumber() !== '';
    }

    public static function hasAnyPaymentMethod(): bool
    {
        return self::hasBankInfo() || self::hasDanaInfo();
    }

    public static function formatBankInfo(): string
    {
        if (!self::hasBankInfo()) {
            return '';
        }

        $lines = ['*Transfer Bank*'];
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

    public static function formatDanaInfo(): string
    {
        if (!self::hasDanaInfo()) {
            return '';
        }

        $lines = ['*E-Wallet DANA*'];
        $lines[] = '• Nomor DANA    : *' . self::formatDanaDisplayNumber(self::danaNumber()) . '*';
        if (self::danaAccountHolder() !== '') {
            $lines[] = '• Atas Nama     : *' . self::danaAccountHolder() . '*';
        }

        return implode("\n", $lines);
    }

    public static function formatDanaDisplayNumber(string $number): string
    {
        $digits = preg_replace('/[^0-9]/', '', $number);
        if ($digits === '') {
            return $number;
        }

        if (str_starts_with($digits, '62')) {
            return '0' . substr($digits, 2);
        }

        return $digits;
    }

    public static function formatPaymentInstructions(): string
    {
        $bankInfo = self::formatBankInfo();
        $danaInfo = self::formatDanaInfo();
        $whatsapp = WhatsAppService::getLinkedPhoneForMessages();

        $lines = ['', '*Cara Pembayaran*'];

        if ($bankInfo !== '') {
            $lines[] = $bankInfo;
        }

        if ($danaInfo !== '') {
            if ($bankInfo !== '') {
                $lines[] = '';
            }
            $lines[] = $danaInfo;
        }

        if ($bankInfo === '' && $danaInfo === '') {
            $lines[] = 'Silakan lakukan pembayaran melalui Portal Pelanggan atau metode yang tersedia.';
        }

        $lines[] = '';

        if ($whatsapp !== '' && $whatsapp !== '-') {
            $lines[] = 'Setelah pembayaran, mohon konfirmasi dan kirim bukti transfer ke WhatsApp kami:';
            $lines[] = '*' . $whatsapp . '*';
        } else {
            $lines[] = 'Setelah pembayaran, mohon konfirmasi melalui Portal Pelanggan atau hubungi tim kami.';
        }

        return implode("\n", $lines);
    }

    /**
     * @return array{bank_info: string, dana_info: string, whatsapp_contact: string, payment_instructions: string}
     */
    public static function templateVariables(): array
    {
        return [
            'bank_info' => self::formatBankInfo(),
            'dana_info' => self::formatDanaInfo(),
            'whatsapp_contact' => WhatsAppService::getLinkedPhoneForMessages(),
            'payment_instructions' => self::formatPaymentInstructions(),
        ];
    }
}
