<?php

namespace App\Console\Commands;

use App\Services\WhatsAppService;
use Illuminate\Console\Command;

class WhatsAppTestCommand extends Command
{
    protected $signature = 'whatsapp:test
                            {phone : Nomor tujuan (08xx atau 628xx)}
                            {message? : Isi pesan uji coba}';

    protected $description = 'Uji koneksi Baileys gateway dan kirim pesan WhatsApp percobaan (menggunakan Pengaturan panel)';

    public function handle(): int
    {
        $phone = (string) $this->argument('phone');
        $message = (string) ($this->argument('message') ?: WhatsAppService::defaultTestMessage());

        $config = WhatsAppService::configuration();

        $this->info('Sumber konfigurasi: menu Pengaturan (database settings)');
        $this->info('Gateway URL : ' . ($config['api_url'] ?: '(kosong)'));
        $this->info('Session ID  : ' . $config['session_id']);
        $this->info('Aktif       : ' . ($config['enabled'] ? 'Ya' : 'Tidak'));

        if (!$config['enabled']) {
            $this->error('Integrasi WhatsApp dinonaktifkan. Aktifkan di Pengaturan → Konfigurasi WhatsApp Gateway.');

            return self::FAILURE;
        }

        $health = WhatsAppService::checkGatewayHealth();
        if (!$health['ok']) {
            $this->error($health['message']);

            return self::FAILURE;
        }

        $this->line('Health      : OK');

        $sent = WhatsAppService::sendText($phone, $message, skipBulkDelay: true);

        if (!$sent) {
            $this->error('Gagal mengirim pesan. Cek storage/logs/laravel.log dan pastikan sesi WhatsApp sudah ter-scan (QR).');

            return self::FAILURE;
        }

        $this->info("Pesan terkirim ke {$phone}.");

        return self::SUCCESS;
    }
}
