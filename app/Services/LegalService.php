<?php

namespace App\Services;

use App\Support\PhoneNumber;

class LegalService
{
    public const SETTING_TERMS_OF_SERVICE = 'system.terms_of_service';

    public const TERMS_PATH = '/syarat-ketentuan';

    public const PRIVACY_PATH = '/kebijakan-privasi';

    public const REFUND_PATH = '/kebijakan-pengembalian';

    public const LAST_UPDATED = '25 Juni 2026';

    /**
     * @return list<array{label: string, url: string}>
     */
    public static function legalLinks(): array
    {
        return [
            ['label' => 'Syarat & Ketentuan', 'url' => url(self::TERMS_PATH)],
            ['label' => 'Kebijakan Privasi', 'url' => url(self::PRIVACY_PATH)],
            ['label' => 'Kebijakan Pengembalian', 'url' => url(self::REFUND_PATH)],
        ];
    }

    public static function termsUrl(): string
    {
        return url(self::TERMS_PATH);
    }

    public static function privacyUrl(): string
    {
        return url(self::PRIVACY_PATH);
    }

    public static function refundUrl(): string
    {
        return url(self::REFUND_PATH);
    }

    public static function companyName(): string
    {
        $name = trim((string) SettingService::get('system.company_name', ''));

        return $name !== '' ? $name : 'Teslatech';
    }

    /**
     * Ringkasan untuk preview halaman utama / VPS.
     *
     * @return list<array{title: string, body: string}>
     */
    public static function termsSections(): array
    {
        $document = self::termsDocument();

        return array_map(
            fn (array $section) => [
                'title' => $section['title'],
                'body' => self::sectionToPlainText($section),
            ],
            array_slice($document['sections'], 0, 3)
        );
    }

    /**
     * @return array{
     *     page_title: string,
     *     meta_description: string,
     *     last_updated: string,
     *     introduction: ?string,
     *     sections: list<array{
     *         title: string,
     *         paragraphs?: list<string>,
     *         list?: list<string>,
     *         ordered_list?: list<string>,
     *         contact_items?: list<array{label: string, value: string, href?: string, extra_href?: string, extra_label?: string}>
     *     }>
     * }
     */
    public static function termsDocument(): array
    {
        $custom = trim((string) SettingService::get(self::SETTING_TERMS_OF_SERVICE, ''));

        if ($custom !== '') {
            return [
                'page_title' => 'Syarat & Ketentuan',
                'meta_description' => 'Syarat dan ketentuan penggunaan layanan ' . self::companyName() . '.',
                'last_updated' => self::LAST_UPDATED,
                'introduction' => null,
                'sections' => self::parseCustomSections($custom),
            ];
        }

        $company = self::companyName();

        return [
            'page_title' => 'Syarat & Ketentuan',
            'meta_description' => 'Syarat dan ketentuan penggunaan layanan ' . $company . '.',
            'last_updated' => self::LAST_UPDATED,
            'introduction' => 'Dokumen ini mengatur hak dan kewajiban antara **' . $company . '** ("Kami") dan pengguna ("Anda") '
                . 'yang menggunakan layanan teknologi informasi yang kami sediakan, termasuk namun tidak terbatas pada pembuatan website & aplikasi, '
                . 'penyewaan cloud VPS & web hosting, serta konsultasi IT dan instalasi jaringan kantor (LAN).',
            'sections' => self::defaultTermsSections($company),
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    protected static function defaultTermsSections(string $company): array
    {
        return [
                self::section(
                    '1. Ruang Lingkup Layanan',
                    [$company . ' menyediakan layanan IT berupa pengembangan software, penyewaan infrastruktur server/hosting, '
                        . 'dan jasa konsultasi serta instalasi jaringan internal kantor. Detail ruang lingkup, deliverable, '
                        . 'dan timeline ditetapkan dalam penawaran atau kontrak kerja terpisah.']
                ),
                self::section(
                    '2. Pendaftaran & Informasi Akurat',
                    ['Anda wajib memberikan informasi yang benar, lengkap, dan terkini saat melakukan pemesanan atau konsultasi. '
                        . 'Kami berhak menolak atau menangguhkan layanan jika data yang diberikan tidak valid atau digunakan untuk tujuan melanggar hukum.']
                ),
                self::section(
                    '3. Pemesanan & Pembayaran',
                    null,
                    [
                        'Pemesanan dianggap sah setelah Anda menyetujui penawaran harga dan melakukan pembayaran sesuai instruksi.',
                        'Metode pembayaran yang tersedia ditampilkan pada halaman checkout atau invoice resmi ' . $company . '.',
                        'Untuk layanan berlangganan (misalnya VPS/hosting), pembayaran dilakukan di muka sesuai periode yang dipilih.',
                        'Untuk layanan proyek (misalnya pembuatan website/LAN), pembayaran dapat dilakukan bertahap sesuai kesepakatan.',
                    ]
                ),
                self::section(
                    '4. Kewajiban Pelanggan',
                    null,
                    [
                        'Menyediakan akses, data, dan materi yang diperlukan untuk pelaksanaan proyek tepat waktu.',
                        'Memastikan penggunaan layanan tidak melanggar hukum, hak pihak ketiga, atau kebijakan platform terkait.',
                        'Menjaga kerahasiaan kredensial akun (login server, panel hosting, dll.) yang diberikan kepada Anda.',
                        'Melakukan backup data penting secara berkala, kecuali disepakati lain dalam paket layanan.',
                    ]
                ),
                self::section(
                    '5. Kewajiban ' . $company,
                    null,
                    [
                        'Menyediakan layanan sesuai spesifikasi yang disepakati dalam penawaran/kontrak.',
                        'Memberikan dukungan teknis sesuai level layanan (SLA) yang berlaku.',
                        'Menjaga kerahasiaan data pelanggan sebagaimana diatur dalam Kebijakan Privasi.',
                    ]
                ),
                self::section(
                    '6. Hak Kekayaan Intelektual',
                    ['Hak kepemilikan atas hasil kerja (source code, desain, dokumentasi) diserahkan kepada pelanggan setelah pembayaran lunas, '
                        . 'kecuali komponen pihak ketiga (library, template berlisensi, dll.) yang tetap mengikuti lisensi masing-masing. '
                        . $company . ' berhak menampilkan proyek sebagai portofolio kecuali disepakati kerahasiaan secara tertulis.']
                ),
                self::section(
                    '7. Pembatasan Tanggung Jawab',
                    [$company . ' tidak bertanggung jawab atas kerugian tidak langsung, kehilangan data akibat kelalaian pengguna, gangguan pihak ketiga, '
                        . 'force majeure, atau penggunaan layanan di luar spesifikasi yang disepakati. Tanggung jawab maksimal kami dibatasi pada nilai '
                        . 'pembayaran layanan terkait dalam periode 3 (tiga) bulan terakhir.']
                ),
                self::section(
                    '8. Penghentian Layanan',
                    ['Layanan berlangganan dapat dihentikan oleh pelanggan dengan pemberitahuan sesuai ketentuan paket. '
                        . 'Kami berhak menangguhkan layanan apabila terjadi keterlambatan pembayaran, pelanggaran ketentuan, '
                        . 'atau aktivitas yang membahayakan infrastruktur.']
                ),
                self::section(
                    '9. Perubahan Ketentuan',
                    [$company . ' dapat memperbarui Syarat & Ketentuan ini sewaktu-waktu. Versi terbaru akan dipublikasikan di halaman ini. '
                        . 'Penggunaan layanan setelah perubahan berlaku dianggap sebagai persetujuan Anda.']
                ),
                [
                    'title' => '10. Hukum yang Berlaku & Kontak',
                    'paragraphs' => ['Ketentuan ini tunduk pada hukum Republik Indonesia. Untuk pertanyaan, hubungi:'],
                    'contact_items' => self::contactItems(),
                ],
        ];
    }

    /**
     * @return array{
     *     page_title: string,
     *     meta_description: string,
     *     last_updated: string,
     *     introduction: ?string,
     *     sections: list<array<string, mixed>>
     * }
     */
    public static function privacyDocument(): array
    {
        $company = self::companyName();

        return [
            'page_title' => 'Kebijakan Privasi',
            'meta_description' => 'Kebijakan privasi ' . $company . ' mengenai pengumpulan dan perlindungan data pengguna.',
            'last_updated' => self::LAST_UPDATED,
            'introduction' => '**' . $company . '** berkomitmen untuk melindungi privasi dan kerahasiaan data pribadi Anda. '
                . 'Kebijakan ini menjelaskan jenis data yang kami kumpulkan, bagaimana data digunakan, dan hak Anda sebagai pengguna layanan kami.',
            'sections' => [
                self::section(
                    '1. Data yang Kami Kumpulkan',
                    ['Kami dapat mengumpulkan informasi berikut:'],
                    [
                        'Data identitas: nama, nama perusahaan, alamat, nomor telepon/WhatsApp, dan alamat email.',
                        'Data transaksi: riwayat pemesanan, invoice, metode pembayaran (tanpa menyimpan detail kartu penuh).',
                        'Data teknis: alamat IP, log akses server, informasi perangkat/browser saat mengunjungi website.',
                        'Data proyek: kebutuhan layanan, spesifikasi teknis, dan materi yang Anda berikan untuk pelaksanaan pekerjaan.',
                    ]
                ),
                self::section(
                    '2. Tujuan Penggunaan Data',
                    ['Data pribadi digunakan untuk:'],
                    [
                        'Memproses pemesanan, pembayaran, dan penyediaan layanan IT.',
                        'Memberikan dukungan teknis, notifikasi layanan, dan komunikasi terkait proyek.',
                        'Memenuhi kewajiban hukum, audit, dan pencegahan penipuan.',
                        'Meningkatkan kualitas layanan dan keamanan infrastruktur.',
                    ]
                ),
                self::section(
                    '3. Dasar Pemrosesan Data',
                    ['Kami memproses data berdasarkan persetujuan Anda, pelaksanaan kontrak layanan, kewajiban hukum, '
                        . 'serta kepentingan sah ' . $company . ' dalam mengoperasikan dan mengamankan layanan.']
                ),
                self::section(
                    '4. Pembagian Data kepada Pihak Ketiga',
                    ['Kami tidak menjual data pribadi Anda. Data dapat dibagikan kepada pihak ketiga terbatas, seperti:'],
                    [
                        'Penyedia payment gateway (misalnya Duitku, Midtrans) untuk memproses pembayaran.',
                        'Penyedia infrastruktur cloud/hosting yang digunakan untuk menjalankan layanan.',
                        'Mitra teknis yang terlibat dalam pelaksanaan proyek, dengan kewajiban kerahasiaan.',
                        'Otoritas berwenang apabila diwajibkan oleh hukum.',
                    ]
                ),
                self::section(
                    '5. Penyimpanan & Keamanan Data',
                    ['Kami menerapkan langkah keamanan administratif, teknis, dan organisasi yang wajar untuk melindungi data dari akses tidak sah, '
                        . 'kebocoran, atau penyalahgunaan. Data disimpan selama diperlukan untuk tujuan layanan dan kewajiban hukum, '
                        . 'kemudian dihapus atau dianonimkan sesuai kebijakan retensi internal.']
                ),
                self::section(
                    '6. Cookie & Teknologi Pelacakan',
                    ['Website kami dapat menggunakan cookie atau teknologi serupa untuk fungsi dasar, analitik, '
                        . 'dan peningkatan pengalaman pengguna. Anda dapat mengatur preferensi cookie melalui pengaturan browser.']
                ),
                self::section(
                    '7. Hak Anda',
                    ['Anda berhak untuk:'],
                    [
                        'Mengakses dan memperbarui data pribadi yang kami miliki.',
                        'Meminta koreksi data yang tidak akurat.',
                        'Meminta penghapusan data tertentu, sejauh tidak bertentangan dengan kewajiban hukum.',
                        'Menarik persetujuan pemrosesan data untuk tujuan tertentu.',
                    ]
                ),
                self::section(
                    '8. Privasi Anak',
                    ['Layanan ' . $company . ' tidak ditujukan untuk anak di bawah 17 tahun. Kami tidak dengan sengaja '
                        . 'mengumpulkan data pribadi dari anak tanpa persetujuan orang tua/wali.']
                ),
                self::section(
                    '9. Perubahan Kebijakan',
                    ['Kebijakan Privasi ini dapat diperbarui dari waktu ke waktu. Perubahan material akan diinformasikan melalui website ini. '
                        . 'Tanggal pembaruan terakhir tercantum di bagian atas halaman.']
                ),
                [
                    'title' => '10. Kontak Pengelola Data',
                    'paragraphs' => ['Untuk pertanyaan terkait privasi, hubungi:'],
                    'contact_items' => self::contactItems(),
                ],
            ],
        ];
    }

    /**
     * @return array{
     *     page_title: string,
     *     meta_description: string,
     *     last_updated: string,
     *     introduction: ?string,
     *     sections: list<array<string, mixed>>
     * }
     */
    public static function refundDocument(): array
    {
        $company = self::companyName();

        return [
            'page_title' => 'Kebijakan Pengembalian Dana',
            'meta_description' => 'Kebijakan pengembalian dana (refund) layanan ' . $company . '.',
            'last_updated' => self::LAST_UPDATED,
            'introduction' => 'Kebijakan ini menjelaskan ketentuan pembatalan dan pengembalian dana untuk layanan yang disediakan oleh **' . $company . '**, '
                . 'meliputi pembuatan website & aplikasi, penyewaan cloud VPS & web hosting, serta konsultasi IT dan instalasi jaringan kantor (LAN).',
            'sections' => [
                self::section(
                    '1. Prinsip Umum',
                    ['Setiap permintaan refund akan ditinjau berdasarkan jenis layanan, status pelaksanaan, dan bukti pembayaran yang valid. '
                        . 'Keputusan akhir mengikuti ketentuan pada dokumen penawaran atau invoice yang disepakati oleh kedua belah pihak.']
                ),
                self::section(
                    '2. Layanan Proyek (Website, Aplikasi, Instalasi LAN)',
                    null,
                    [
                        'Sebelum pekerjaan dimulai: Pembatalan dapat diajukan dan refund diproses setelah dikurangi biaya administrasi (jika ada), maksimal 7 hari kerja setelah persetujuan.',
                        'Setelah pekerjaan dimulai: Dana yang sudah digunakan untuk pekerjaan (desain, development, pengadaan perangkat, kunjungan lapangan, dll.) tidak dapat dikembalikan.',
                        'Proyek selesai & diserahkan: Pembayaran untuk deliverable yang telah diterima pelanggan tidak dapat dikembalikan.',
                    ]
                ),
                self::section(
                    '3. Layanan Berlangganan (Cloud VPS & Web Hosting)',
                    null,
                    [
                        'Layanan sudah aktif berjalan: Dana tidak dapat dikembalikan untuk periode langganan yang sedang berjalan, termasuk setelah server/hosting diaktifkan dan resource dialokasikan.',
                        'Pembatalan sebelum aktivasi: Jika layanan belum diaktifkan, pelanggan dapat mengajukan pembatalan penuh dalam waktu maksimal 24 jam setelah pembayaran.',
                        'Perpanjangan otomatis: Pembatalan untuk periode berikutnya harus diajukan minimal 7 hari sebelum tanggal perpanjangan agar tidak ditagihkan kembali.',
                    ]
                ),
                self::section(
                    '4. Konsultasi IT',
                    null,
                    [
                        'Konsultasi gratis tidak dikenakan biaya dan tidak memerlukan refund.',
                        'Konsultasi berbayar yang belum dilaksanakan dapat di-refund penuh jika dibatalkan minimal 24 jam sebelum jadwal.',
                        'Konsultasi yang sudah dilaksanakan tidak dapat dikembalikan.',
                    ]
                ),
                self::section(
                    '5. Kondisi Tidak Berlaku Refund',
                    ['Pengembalian dana tidak berlaku apabila:'],
                    [
                        'Pelanggan melanggar Syarat & Ketentuan layanan.',
                        'Layanan dihentikan karena aktivitas ilegal, penyalahgunaan resource, atau pelanggaran kebijakan penggunaan wajar.',
                        'Permintaan diajukan di luar jangka waktu yang ditentukan.',
                        'Gangguan berasal dari pihak ketiga di luar kendali ' . $company . ' (force majeure).',
                    ]
                ),
                [
                    'title' => '6. Prosedur Pengajuan Refund',
                    'ordered_list' => [
                        'Kirim permintaan ke ' . self::contactEmail() . ' atau telepon/WhatsApp ' . self::contactPhoneDisplay() . '.',
                        'Sertakan nomor invoice, tanggal pembayaran, alasan pembatalan, dan bukti transfer.',
                        'Tim kami akan meninjau permintaan dalam 3–5 hari kerja.',
                        'Jika disetujui, dana dikembalikan ke rekening sumber pembayaran dalam 7–14 hari kerja.',
                    ],
                ],
                self::section(
                    '7. Chargeback & Sengketa Pembayaran',
                    ['Kami menganjurkan pelanggan menghubungi ' . $company . ' terlebih dahulu sebelum mengajukan chargeback ke pihak bank/payment gateway. '
                        . 'Chargeback tanpa upaya penyelesaian dapat mengakibatkan penangguhan layanan dan tindakan lebih lanjut sesuai hukum yang berlaku.']
                ),
                self::section(
                    '8. Perubahan Kebijakan',
                    [$company . ' berhak memperbarui kebijakan ini. Versi terbaru berlaku sejak dipublikasikan di halaman ini '
                        . 'dan mengikat transaksi yang dilakukan setelah tanggal pembaruan.']
                ),
                [
                    'title' => '9. Kontak',
                    'contact_items' => self::contactItems(),
                ],
            ],
        ];
    }

    /**
     * @return list<array{label: string, value: string, href?: string, extra_href?: string, extra_label?: string}>
     */
    public static function contactItems(): array
    {
        $email = self::contactEmail();
        $phoneDisplay = self::contactPhoneDisplay();
        $phoneHref = self::contactPhoneHref();
        $whatsappHref = self::whatsappUrl();
        $address = self::contactAddress();

        $items = [];

        if ($email !== '') {
            $items[] = [
                'label' => 'Email',
                'value' => $email,
                'href' => 'mailto:' . $email,
            ];
        }

        if ($phoneDisplay !== '') {
            $items[] = [
                'label' => 'Telepon / WhatsApp',
                'value' => $phoneDisplay,
                'href' => $phoneHref,
                'extra_href' => $whatsappHref,
                'extra_label' => 'WhatsApp',
            ];
        }

        if ($address !== '') {
            $items[] = [
                'label' => 'Alamat',
                'value' => $address,
            ];
        }

        return $items;
    }

    public static function contactEmail(): string
    {
        return trim((string) SettingService::get('system.company_email', 'info@teslatech.my.id'));
    }

    public static function contactPhoneDisplay(): string
    {
        $phone = trim((string) SettingService::get('system.company_phone', ''));

        if ($phone === '') {
            return '0877-7888-8820';
        }

        return $phone;
    }

    public static function contactPhoneHref(): string
    {
        $phone = trim((string) SettingService::get('system.company_phone', '087778888820'));
        $digits = preg_replace('/\D+/', '', $phone) ?: '087778888820';

        return 'tel:' . $digits;
    }

    public static function whatsappUrl(): string
    {
        $phone = trim((string) SettingService::get('system.company_phone', '6287778888820'));
        $variants = PhoneNumber::variants($phone);

        if ($variants !== []) {
            return 'https://wa.me/' . ltrim($variants[0], '+');
        }

        return 'https://wa.me/6287778888820';
    }

    public static function contactAddress(): string
    {
        return trim((string) SettingService::get('system.company_address', 'Jl. Kopral Yahya Blok Anjun'));
    }

    /**
     * @param  list<string>|null  $paragraphs
     * @param  list<string>|null  $list
     * @return array{title: string, paragraphs?: list<string>, list?: list<string>}
     */
    protected static function section(string $title, ?array $paragraphs = null, ?array $list = null): array
    {
        $section = ['title' => $title];

        if ($paragraphs !== null && $paragraphs !== []) {
            $section['paragraphs'] = $paragraphs;
        }

        if ($list !== null && $list !== []) {
            $section['list'] = $list;
        }

        return $section;
    }

    /**
     * @param  array<string, mixed>  $section
     */
    protected static function sectionToPlainText(array $section): string
    {
        $parts = [];

        foreach ($section['paragraphs'] ?? [] as $paragraph) {
            $parts[] = $paragraph;
        }

        foreach ($section['list'] ?? [] as $item) {
            $parts[] = '• ' . $item;
        }

        foreach ($section['ordered_list'] ?? [] as $index => $item) {
            $parts[] = ($index + 1) . '. ' . $item;
        }

        return implode("\n", $parts);
    }

    /**
     * @return list<array{title: string, paragraphs?: list<string>, list?: list<string>, ordered_list?: list<string>, contact_items?: list<array<string, string>>, body?: string}>
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
                    $sections[] = self::section($currentTitle, [trim(implode("\n", $currentBody))]);
                    $currentBody = [];
                }

                continue;
            }

            if (str_starts_with($line, '## ')) {
                if ($currentBody !== []) {
                    $sections[] = self::section($currentTitle, [trim(implode("\n", $currentBody))]);
                    $currentBody = [];
                }

                $currentTitle = trim(substr($line, 3));

                continue;
            }

            $currentBody[] = $line;
        }

        if ($currentBody !== []) {
            $sections[] = self::section($currentTitle, [trim(implode("\n", $currentBody))]);
        }

        return $sections !== [] ? $sections : self::defaultTermsSections(self::companyName());
    }
}
