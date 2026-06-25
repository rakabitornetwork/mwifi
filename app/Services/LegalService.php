<?php

namespace App\Services;

class LegalService
{
    public const SETTING_TERMS_OF_SERVICE = 'system.terms_of_service';

    public const TERMS_PATH = '/syarat-ketentuan';

    /**
     * @return list<array{title: string, body: string}>
     */
    public static function termsSections(): array
    {
        $custom = trim((string) SettingService::get(self::SETTING_TERMS_OF_SERVICE, ''));

        if ($custom !== '') {
            return self::parseCustomSections($custom);
        }

        return self::defaultSections(self::companyName());
    }

    public static function termsUrl(): string
    {
        return url(self::TERMS_PATH);
    }

    public static function companyName(): string
    {
        $name = trim((string) SettingService::get('system.company_name', ''));

        return $name !== '' ? $name : 'Penyedia Layanan';
    }

    /**
     * @return list<array{title: string, body: string}>
     */
    public static function defaultSections(string $companyName): array
    {
        return [
            [
                'title' => '1. Ketentuan Umum',
                'body' => "Syarat dan Ketentuan ini mengatur penggunaan website dan layanan yang disediakan oleh {$companyName}. "
                    . 'Dengan mengakses website, melakukan pemesanan, atau menyelesaikan pembayaran, Anda dianggap telah membaca dan menyetujui ketentuan ini.',
            ],
            [
                'title' => '2. Layanan',
                'body' => "{$companyName} menyediakan layanan sewa infrastruktur cloud (VPS), layanan konektivitas internet, "
                    . 'serta layanan terkait yang dijelaskan pada halaman produk masing-masing. Spesifikasi, harga, dan ketersediaan '
                    . 'dapat diperbarui sewaktu-waktu dan akan ditampilkan pada halaman pemesanan sebelum pembayaran.',
            ],
            [
                'title' => '3. Pemesanan & Pembayaran',
                'body' => 'Pemesanan dianggap sah setelah Anda memilih paket layanan dan melanjutkan ke halaman pembayaran resmi '
                    . '(payment gateway terintegrasi). Pembayaran wajib diselesaikan sesuai nominal tagihan. Transaksi yang berhasil '
                    . 'akan dikonfirmasi secara otomatis melalui sistem kami.',
            ],
            [
                'title' => '4. Pembatalan & Pengembalian Dana',
                'body' => 'Pembatalan layanan digital yang sudah diaktifkan mengikuti kebijakan operasional kami. '
                    . 'Pengembalian dana hanya dapat dipertimbangkan apabila layanan belum diaktifkan atau terjadi kegagalan '
                    . 'sistem yang dapat dibuktikan. Permohonan diajukan melalui kontak support resmi.',
            ],
            [
                'title' => '5. Privasi & Data',
                'body' => 'Kami memproses data pelanggan (nama, email, nomor telepon, alamat, dan detail transaksi) hanya untuk '
                    . 'keperluan penyediaan layanan, penagihan, dukungan teknis, dan kepatuhan hukum. Data tidak dijual kepada pihak ketiga.',
            ],
            [
                'title' => '6. Batasan Tanggung Jawab',
                'body' => "{$companyName} berupaya menjaga ketersediaan layanan sebaik mungkin, namun tidak bertanggung jawab atas "
                    . 'gangguan di luar kendali wajar (force majeure, gangguan jaringan pihak ketiga, atau kesalahan konfigurasi pengguna).',
            ],
            [
                'title' => '7. Kontak Support',
                'body' => 'Untuk pertanyaan, keluhan, atau bantuan teknis, hubungi kontak support resmi yang tercantum di website ini '
                    . '(email, telepon/WhatsApp, dan alamat usaha).',
            ],
        ];
    }

    /**
     * @return list<array{title: string, body: string}>
     */
    protected static function parseCustomSections(string $raw): array
    {
        $sections = [];
        $currentTitle = 'Ketentuan';
        $currentBody = [];

        foreach (preg_split('/\r\n|\r|\n/', $raw) as $line) {
            $line = trim($line);

            if ($line === '' || $line === '---') {
                if ($currentBody !== []) {
                    $sections[] = [
                        'title' => $currentTitle,
                        'body' => trim(implode("\n", $currentBody)),
                    ];
                    $currentBody = [];
                }

                continue;
            }

            if (str_starts_with($line, '## ')) {
                if ($currentBody !== []) {
                    $sections[] = [
                        'title' => $currentTitle,
                        'body' => trim(implode("\n", $currentBody)),
                    ];
                    $currentBody = [];
                }

                $currentTitle = trim(substr($line, 3));

                continue;
            }

            $currentBody[] = $line;
        }

        if ($currentBody !== []) {
            $sections[] = [
                'title' => $currentTitle,
                'body' => trim(implode("\n", $currentBody)),
            ];
        }

        return $sections !== [] ? $sections : self::defaultSections(self::companyName());
    }
}
