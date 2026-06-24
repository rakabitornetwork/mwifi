<?php

namespace App\Services;

class MessageTemplateService
{
    /**
     * Urutan tampilan template di halaman WhatsApp & Telegram (alur siklus pelanggan).
     *
     * @return array<int, string>
     */
    public static function templateDisplayOrder(): array
    {
        return [
            'whatsapp.template.customer_registered',
            'whatsapp.template.invoice_new',
            'whatsapp.template.invoice_unpaid',
            'whatsapp.template.invoice_accumulated_new',
            'whatsapp.template.invoice_accumulated',
            'whatsapp.template.isolation',
            'whatsapp.template.payment_reactivated',
            'whatsapp.template.payment_received',
            'whatsapp.template.admin_scheduler',
            'whatsapp.template.staff_advance_admin',
            'whatsapp.template.staff_advance_technician',
        ];
    }

    /**
     * @return array<string, array{label: string, description: string, placeholders: array<int, string>}>
     */
    public static function definitions(): array
    {
        $definitions = [
            'whatsapp.template.customer_registered' => [
                'label' => 'Selamat datang (pendaftaran pelanggan baru)',
                'description' => 'Dikirim otomatis ke pelanggan setelah pendaftaran berhasil di panel admin.',
                'placeholders' => [
                    'customer_name', 'brand_name', 'username', 'password', 'phone_number',
                    'address', 'portal_email_line', 'router_name', 'package_name',
                    'monthly_price', 'package_bandwidth', 'odp_name', 'gps_coordinates',
                    'maps_link_line', 'service_type', 'status_label', 'billing_date',
                    'billing_info', 'billing_period', 'due_date', 'estimated_subtotal',
                    'estimated_total', 'prorata_line',
                ],
                'placeholder_groups' => [
                    'Identitas & Kontak' => [
                        'customer_name', 'username', 'password', 'phone_number', 'address', 'portal_email_line',
                    ],
                    'Lokasi & Jaringan' => [
                        'router_name', 'package_name', 'monthly_price', 'package_bandwidth',
                        'odp_name', 'gps_coordinates', 'maps_link_line',
                    ],
                    'Status & Billing' => [
                        'service_type', 'status_label', 'billing_date', 'billing_info', 'billing_period',
                        'due_date', 'estimated_subtotal', 'estimated_total', 'prorata_line', 'brand_name',
                    ],
                ],
            ],
            'whatsapp.template.invoice_new' => [
                'label' => 'Tagihan baru (generate otomatis)',
                'description' => 'Dikirim saat invoice baru dibuat oleh penjadwal tagihan.',
                'placeholders' => [
                    'customer_name', 'brand_name', 'period', 'invoice_number', 'service_type',
                    'username', 'subtotal', 'prorata_line', 'total', 'due_date',
                    'bank_info', 'dana_info', 'whatsapp_contact', 'payment_instructions',
                ],
            ],
            'whatsapp.template.invoice_unpaid' => [
                'label' => 'Tagihan belum bayar (kirim ulang)',
                'description' => 'Dikirim dari tombol WhatsApp di halaman Invoice untuk status belum bayar.',
                'placeholders' => [
                    'customer_name', 'brand_name', 'period', 'invoice_number', 'service_type',
                    'username', 'subtotal', 'prorata_line', 'total', 'due_date',
                    'bank_info', 'dana_info', 'whatsapp_contact', 'payment_instructions',
                ],
            ],
            'whatsapp.template.invoice_accumulated' => [
                'label' => 'Tagihan akumulasi (kirim ulang)',
                'description' => 'Invoice akumulasi yang dikirim ulang manual dari panel admin.',
                'placeholders' => [
                    'customer_name', 'brand_name', 'period_label', 'invoice_number', 'service_type',
                    'username', 'subtotal', 'total', 'due_date',
                    'bank_info', 'dana_info', 'whatsapp_contact', 'payment_instructions',
                ],
            ],
            'whatsapp.template.invoice_accumulated_new' => [
                'label' => 'Tagihan akumulasi baru',
                'description' => 'Dikirim saat invoice akumulasi baru dibuat dari penundaan tagihan.',
                'placeholders' => [
                    'customer_name', 'brand_name', 'period_label', 'invoice_number',
                    'username', 'subtotal', 'total', 'due_date',
                    'bank_info', 'dana_info', 'whatsapp_contact', 'payment_instructions',
                ],
            ],
            'whatsapp.template.payment_received' => [
                'label' => 'Konfirmasi pembayaran',
                'description' => 'Bukti pembayaran lunas (kirim ulang manual atau notifikasi tanpa reaktivasi).',
                'placeholders' => [
                    'brand_name', 'invoice_number', 'customer_name', 'username', 'period',
                    'payment_method', 'amount_paid', 'paid_at', 'footer_note',
                ],
            ],
            'whatsapp.template.payment_reactivated' => [
                'label' => 'Pembayaran + layanan aktif kembali',
                'description' => 'Dikirim otomatis setelah pelanggan membayar dan layanan diaktifkan kembali.',
                'placeholders' => [
                    'brand_name', 'invoice_number', 'customer_name', 'username', 'period',
                    'payment_method', 'amount_paid', 'paid_at', 'footer_note',
                ],
            ],
            'whatsapp.template.isolation' => [
                'label' => 'Informasi layanan dinonaktifkan',
                'description' => 'Dikirim saat layanan sementara dinonaktifkan karena tagihan melewati jatuh tempo.',
                'placeholders' => [
                    'customer_name', 'brand_name', 'username', 'invoice_number', 'total', 'due_date',
                    'bank_info', 'dana_info', 'whatsapp_contact', 'payment_instructions',
                ],
            ],
            'whatsapp.template.admin_scheduler' => [
                'label' => 'Ringkasan generate tagihan (admin)',
                'description' => 'Notifikasi ke nomor admin setelah generate tagihan otomatis.',
                'placeholders' => [
                    'brand_name', 'run_date', 'days_before', 'invoice_count', 'invoice_list', 'total',
                ],
            ],
            'whatsapp.template.staff_advance_admin' => [
                'label' => 'Hutang & piutang (admin)',
                'description' => 'Notifikasi ke admin saat transaksi kasbon, pelunasan, hutang, atau bayar hutang dicatat/diperbarui/dihapus.',
                'placeholders' => [
                    'brand_name', 'action_header', 'type_label', 'staff_name', 'router_name', 'counterparty',
                    'title', 'amount', 'transaction_date', 'payment_method', 'notes', 'recorded_by', 'balance_line',
                ],
            ],
            'whatsapp.template.staff_advance_technician' => [
                'label' => 'Kasbon teknisi (teknisi lapangan)',
                'description' => 'Notifikasi ke teknisi saat kasbon atau pelunasan kasbon dicatat, diperbarui, atau dihapus.',
                'placeholders' => [
                    'brand_name', 'action_header', 'type_label', 'staff_name', 'router_name', 'title', 'amount',
                    'transaction_date', 'payment_method', 'notes', 'recorded_by', 'balance_line',
                ],
            ],
        ];

        return self::sortDefinitions($definitions);
    }

    /**
     * @param  array<string, array{label: string, description: string, placeholders: array<int, string>}>  $definitions
     * @return array<string, array{label: string, description: string, placeholders: array<int, string>}>
     */
    public static function sortDefinitions(array $definitions): array
    {
        $ordered = [];

        foreach (self::templateDisplayOrder() as $key) {
            if (isset($definitions[$key])) {
                $ordered[$key] = $definitions[$key];
            }
        }

        foreach ($definitions as $key => $meta) {
            if (!isset($ordered[$key])) {
                $ordered[$key] = $meta;
            }
        }

        return $ordered;
    }

    /**
     * @return array<string, string>
     */
    public static function defaults(): array
    {
        $defaults = [
            'whatsapp.template.customer_registered' => <<<'TEMPLATE'
*SELAMAT DATANG · {brand_name}*

Yth. Bapak/Ibu *{customer_name}*,

Pendaftaran layanan internet Anda telah kami terima. Berikut data lengkap Anda:

*Identitas & Kontak*
• Nama Lengkap : {customer_name}
• Username     : *{username}*
• Password     : *{password}*
• Telepon (WA) : {phone_number}
• Alamat       : {address}{portal_email_line}

*Lokasi & Jaringan*
• Router       : {router_name}
• Paket        : {package_name} · {monthly_price}
• Kecepatan    : {package_bandwidth}
• Titik ODP    : {odp_name}
• GPS          : {gps_coordinates}
{maps_link_line}

*Status & Billing*
• Layanan      : {service_type}
• Status       : {status_label}
• Tgl Tagihan  : Setiap tanggal *{billing_date}*

{billing_info}

Simpan pesan ini sebagai referensi login layanan Anda.

Hormat kami,
*{brand_name}*
TEMPLATE,

            'whatsapp.template.invoice_new' => <<<'TEMPLATE'
*INFORMASI TAGIHAN · {brand_name}*

Yth. Bapak/Ibu *{customer_name}*,

Tagihan internet Anda periode *{period}* telah kami terbitkan. Berikut rinciannya:

*Rincian Tagihan*
• No. Invoice : *{invoice_number}*
• Layanan     : {service_type} ({username})
• Subtotal    : *{subtotal}*{prorata_line}
• Total       : *{total}*
• Jatuh Tempo : *{due_date}*
{payment_instructions}

Apabila ada pertanyaan, tim kami siap membantu.

Hormat kami,
*{brand_name}*
TEMPLATE,

            'whatsapp.template.invoice_unpaid' => <<<'TEMPLATE'
*PENGINGAT TAGIHAN · {brand_name}*

Yth. Bapak/Ibu *{customer_name}*,

Berikut kami sampaikan kembali rincian tagihan internet periode *{period}*:

*Rincian Tagihan*
• No. Invoice : *{invoice_number}*
• Layanan     : {service_type} ({username})
• Subtotal    : *{subtotal}*{prorata_line}
• Total       : *{total}*
• Jatuh Tempo : *{due_date}*
{payment_instructions}

Terima kasih atas perhatian dan kerja samanya.

Hormat kami,
*{brand_name}*
TEMPLATE,

            'whatsapp.template.invoice_accumulated' => <<<'TEMPLATE'
*TAGIHAN AKUMULASI · {brand_name}*

Yth. Bapak/Ibu *{customer_name}*,

Berikut rincian tagihan akumulasi periode *{period_label}*:

*Rincian Tagihan*
• No. Invoice : *{invoice_number}*
• Layanan     : {service_type} ({username})
• Subtotal    : *{subtotal}*
• Total       : *{total}*
• Jatuh Tempo : *{due_date}*
{payment_instructions}

Apabila memerlukan penjelasan lebih lanjut, hubungi tim kami.

Hormat kami,
*{brand_name}*
TEMPLATE,

            'whatsapp.template.invoice_accumulated_new' => <<<'TEMPLATE'
*TAGIHAN AKUMULASI · {brand_name}*

Yth. Bapak/Ibu *{customer_name}*,

Tagihan akumulasi periode *{period_label}* telah kami terbitkan. Berikut rinciannya:

*Rincian Tagihan*
• No. Invoice : *{invoice_number}*
• Layanan     : PPPoE ({username})
• Subtotal    : *{subtotal}*
• Total       : *{total}*
• Jatuh Tempo : *{due_date}*
{payment_instructions}

Terima kasih atas kerja samanya.

Hormat kami,
*{brand_name}*
TEMPLATE,

            'whatsapp.template.payment_received' => <<<'TEMPLATE'
*KONFIRMASI PEMBAYARAN · {brand_name}*

Yth. Bapak/Ibu *{customer_name}*,

Terima kasih — pembayaran Anda telah kami terima dengan baik.

*Rincian Pembayaran*
• No. Invoice  : *{invoice_number}*
• Periode       : *{period}*
• Username      : {username}
• Metode Bayar  : {payment_method}
• Jumlah Bayar  : *{amount_paid}*
• Waktu Bayar   : {paid_at}{footer_note}

Hormat kami,
*{brand_name}*
TEMPLATE,

            'whatsapp.template.payment_reactivated' => <<<'TEMPLATE'
*KONFIRMASI PEMBAYARAN · {brand_name}*

Yth. Bapak/Ibu *{customer_name}*,

Terima kasih — pembayaran Anda telah kami terima dengan baik.

*Rincian Pembayaran*
• No. Invoice  : *{invoice_number}*
• Periode       : *{period}*
• Username      : {username}
• Metode Bayar  : {payment_method}
• Jumlah Bayar  : *{amount_paid}*
• Waktu Bayar   : {paid_at}{footer_note}

Hormat kami,
*{brand_name}*
TEMPLATE,

            'whatsapp.template.isolation' => <<<'TEMPLATE'
*INFORMASI LAYANAN · {brand_name}*

Yth. Bapak/Ibu *{customer_name}*,

Dengan hormat kami informasikan bahwa layanan internet (username: *{username}*) sementara dinonaktifkan karena tagihan berikut belum kami terima hingga melewati jatuh tempo:

*Rincian Tagihan*
• No. Invoice : *{invoice_number}*
• Nominal     : *{total}*
• Jatuh Tempo : {due_date}
{payment_instructions}

Kami siap membantu apabila Bapak/Ibu memerlukan bantuan.

Hormat kami,
*{brand_name}*
TEMPLATE,

            'whatsapp.template.admin_scheduler' => <<<'TEMPLATE'
*LAPORAN GENERATE TAGIHAN · {brand_name}*

Ringkasan penjadwalan otomatis:

• Tanggal      : *{run_date}*
• Jadwal       : H-{days_before} sebelum jatuh tempo
• Invoice baru : *{invoice_count}*

{invoice_list}

*Total tagihan baru: {total}*

Detail lengkap tersedia di panel Admin → Invoice.
TEMPLATE,

            'whatsapp.template.staff_advance_admin' => <<<'TEMPLATE'
*HUTANG & PIUTANG · {brand_name}*

{action_header}

• Jenis       : {type_label}
• Teknisi     : {staff_name}
• Router      : {router_name}
• Pihak hutang: {counterparty}
• Keterangan  : {title}
• Nominal     : *{amount}*
• Tanggal     : {transaction_date}
• Metode      : {payment_method}
• Catatan     : {notes}
• Dicatat oleh: {recorded_by}{balance_line}

Panel Admin → Hutang & Piutang
TEMPLATE,

            'whatsapp.template.staff_advance_technician' => <<<'TEMPLATE'
*{brand_name}*

Yth. *{staff_name}*,

{action_header}

• Jenis      : {type_label}
• Router     : {router_name}
• Keterangan : {title}
• Nominal    : *{amount}*
• Tanggal    : {transaction_date}
• Metode     : {payment_method}
• Catatan    : {notes}
• Admin      : {recorded_by}{balance_line}

Jika ada ketidaksesuaian, hubungi admin.
TEMPLATE,
        ];

        return self::sortDefaults($defaults);
    }

    /**
     * @param  array<string, string>  $defaults
     * @return array<string, string>
     */
    public static function sortDefaults(array $defaults): array
    {
        $ordered = [];

        foreach (self::templateDisplayOrder() as $key) {
            if (isset($defaults[$key])) {
                $ordered[$key] = $defaults[$key];
            }
        }

        foreach ($defaults as $key => $value) {
            if (!isset($ordered[$key])) {
                $ordered[$key] = $value;
            }
        }

        return $ordered;
    }

    public static function get(string $key): string
    {
        $stored = SettingService::get($key);

        if (is_string($stored) && trim($stored) !== '') {
            return $stored;
        }

        return self::defaults()[$key] ?? '';
    }

    /**
     * @param  array<string, scalar|null>  $variables
     */
    public static function render(string $key, array $variables = []): string
    {
        return self::renderContent(self::get($key), $variables);
    }

    /**
     * @param  array<string, scalar|null>  $variables
     */
    public static function renderWithPaymentInstructions(string $key, array $variables = []): string
    {
        if (!in_array($key, self::paymentInstructionKeys(), true)) {
            return self::render($key, $variables);
        }

        return self::render($key, array_merge($variables, PaymentInstructionService::templateVariables()));
    }

    /**
     * @return array<int, string>
     */
    public static function paymentInstructionKeys(): array
    {
        return [
            'whatsapp.template.invoice_new',
            'whatsapp.template.invoice_unpaid',
            'whatsapp.template.invoice_accumulated',
            'whatsapp.template.invoice_accumulated_new',
            'whatsapp.template.isolation',
        ];
    }

    /**
     * @param  array<string, scalar|null>  $variables
     */
    public static function renderContent(string $template, array $variables = []): string
    {
        $output = $template;

        foreach ($variables as $name => $value) {
            $output = str_replace('{' . $name . '}', (string) ($value ?? ''), $output);
        }

        return $output;
    }

    /**
     * @return array<string, string>
     */
    public static function sampleVariables(string $key): array
    {
        $variables = match ($key) {
            'whatsapp.template.invoice_new',
            'whatsapp.template.invoice_unpaid' => [
                'customer_name' => 'Budi Santoso',
                'brand_name' => BrandingService::companyName(),
                'period' => '2026-06',
                'invoice_number' => 'INV-202606-0001-AB12',
                'service_type' => 'PPPOE',
                'username' => 'budi001',
                'subtotal' => 'Rp 150.000',
                'prorata_line' => "\n• Prorata    : *15 hari* / 30 hari",
                'total' => 'Rp 150.000',
                'due_date' => '20-06-2026',
            ],
            'whatsapp.template.invoice_accumulated',
            'whatsapp.template.invoice_accumulated_new' => [
                'customer_name' => 'Budi Santoso',
                'brand_name' => BrandingService::companyName(),
                'period_label' => '2026-04 + 2026-05',
                'invoice_number' => 'INV-ACC-2026-0001',
                'service_type' => 'PPPOE',
                'username' => 'budi001',
                'subtotal' => 'Rp 300.000',
                'total' => 'Rp 300.000',
                'due_date' => '25-06-2026',
            ],
            'whatsapp.template.payment_received',
            'whatsapp.template.payment_reactivated' => [
                'brand_name' => BrandingService::companyName(),
                'invoice_number' => 'INV-202606-0001-AB12',
                'customer_name' => 'Budi Santoso',
                'username' => 'budi001',
                'period' => '2026-06',
                'payment_method' => 'Cash / Tunai',
                'amount_paid' => 'Rp 150.000',
                'paid_at' => '22-06-2026 14:30',
                'footer_note' => $key === 'whatsapp.template.payment_reactivated'
                    ? "\n\nLayanan internet Anda telah aktif kembali secara otomatis. Terima kasih atas kepercayaan dan kerja samanya."
                    : "\n\nTerima kasih atas kepercayaan dan kerja samanya.",
            ],
            'whatsapp.template.isolation' => [
                'customer_name' => 'Budi Santoso',
                'brand_name' => BrandingService::companyName(),
                'username' => 'budi001',
                'invoice_number' => 'INV-202606-0001-AB12',
                'total' => 'Rp 150.000',
                'due_date' => '20-06-2026',
            ],
            'whatsapp.template.admin_scheduler' => [
                'brand_name' => BrandingService::companyName(),
                'run_date' => '22-06-2026',
                'days_before' => '5',
                'invoice_count' => '2',
                'invoice_list' => "- *INV-202606-0001* — Budi Santoso (2026-06) Rp 150.000\n- *INV-202606-0002* — Ani Wijaya (2026-06) Rp 200.000",
                'total' => 'Rp 350.000',
            ],
            'whatsapp.template.staff_advance_admin',
            'whatsapp.template.staff_advance_technician' => [
                'brand_name' => BrandingService::companyName(),
                'action_header' => 'Transaksi hutang/piutang *baru dicatat*.',
                'type_label' => 'Kasbon Teknisi',
                'staff_name' => 'Teknisi A',
                'router_name' => 'Router Utama',
                'counterparty' => '—',
                'title' => 'Kasbon BBM lapangan',
                'amount' => 'Rp 200.000',
                'transaction_date' => '24 Jun 2026',
                'payment_method' => 'Tunai',
                'notes' => 'Instalasi pelanggan baru',
                'recorded_by' => 'Admin',
                'balance_line' => "\n• Sisa kasbon teknisi : *Rp 200.000*",
            ],
            'whatsapp.template.customer_registered' => [
                'customer_name' => 'Budi Santoso',
                'brand_name' => BrandingService::companyName(),
                'username' => 'budi001',
                'password' => 'gantengmax',
                'phone_number' => '6281234567890',
                'address' => 'Jl. Merdeka No. 10, RT 02 RW 05',
                'portal_email_line' => "\n• Email Portal : budi001@mwifi.test",
                'router_name' => 'Router Utama',
                'package_name' => '10 Mbps - 120K',
                'monthly_price' => 'Rp 120.000',
                'package_bandwidth' => '10M/10M',
                'odp_name' => 'ODP-01 / Gang Melati',
                'gps_coordinates' => '-6.200000, 106.816666',
                'maps_link_line' => '• Google Maps : https://www.google.com/maps?q=-6.200000,106.816666',
                'service_type' => 'PPPOE',
                'billing_date' => '20',
                'status_label' => 'Aktif',
                'billing_info' => BillingService::buildRegistrationBillingInfoBlock(
                    'Juni 2026',
                    '20-06-2026',
                    120000,
                    80000,
                    80000,
                    true,
                    20,
                    false
                ),
                'billing_period' => 'Juni 2026',
                'due_date' => '20-06-2026',
                'monthly_price' => 'Rp 120.000',
                'estimated_subtotal' => 'Rp 80.000',
                'estimated_total' => 'Rp 80.000',
                'prorata_line' => BillingService::buildProrataLine(true, 20),
            ],
            default => [],
        };

        if (in_array($key, self::paymentInstructionKeys(), true)) {
            $variables = array_merge($variables, PaymentInstructionService::templateVariables());
        }

        return $variables;
    }
}
