<?php

namespace App\Services;

class MessageTemplateService
{
    /**
     * @return array<string, array{label: string, description: string, placeholders: array<int, string>}>
     */
    public static function definitions(): array
    {
        return [
            'whatsapp.template.invoice_new' => [
                'label' => 'Tagihan baru (generate otomatis)',
                'description' => 'Dikirim saat invoice baru dibuat oleh penjadwal tagihan.',
                'placeholders' => [
                    'customer_name', 'brand_name', 'period', 'invoice_number', 'service_type',
                    'username', 'subtotal', 'prorata_line', 'total', 'due_date',
                ],
            ],
            'whatsapp.template.invoice_unpaid' => [
                'label' => 'Tagihan belum bayar (kirim ulang)',
                'description' => 'Dikirim dari tombol WhatsApp di halaman Invoice untuk status belum bayar.',
                'placeholders' => [
                    'customer_name', 'brand_name', 'period', 'invoice_number', 'service_type',
                    'username', 'subtotal', 'prorata_line', 'total', 'due_date',
                ],
            ],
            'whatsapp.template.invoice_accumulated' => [
                'label' => 'Tagihan akumulasi (kirim ulang)',
                'description' => 'Invoice akumulasi yang dikirim ulang manual dari panel admin.',
                'placeholders' => [
                    'customer_name', 'brand_name', 'period_label', 'invoice_number', 'service_type',
                    'username', 'subtotal', 'total', 'due_date',
                ],
            ],
            'whatsapp.template.invoice_accumulated_new' => [
                'label' => 'Tagihan akumulasi baru',
                'description' => 'Dikirim saat invoice akumulasi baru dibuat dari penundaan tagihan.',
                'placeholders' => [
                    'customer_name', 'brand_name', 'period_label', 'invoice_number',
                    'username', 'subtotal', 'total', 'due_date',
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
                'label' => 'Isolir otomatis',
                'description' => 'Dikirim saat pelanggan di-isolir karena melewati jatuh tempo.',
                'placeholders' => [
                    'customer_name', 'brand_name', 'username', 'invoice_number', 'total', 'due_date',
                ],
            ],
            'whatsapp.template.admin_scheduler' => [
                'label' => 'Ringkasan generate tagihan (admin)',
                'description' => 'Notifikasi ke nomor admin setelah generate tagihan otomatis.',
                'placeholders' => [
                    'brand_name', 'run_date', 'days_before', 'invoice_count', 'invoice_list', 'total',
                ],
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function defaults(): array
    {
        return [
            'whatsapp.template.invoice_new' => "Yth. Bapak/Ibu {customer_name},\n\nTagihan internet {brand_name} Anda untuk periode *{period}* telah terbit.\n\n*Detail Tagihan*:\n- No. Invoice: *{invoice_number}*\n- Layanan: {service_type} ({username})\n- Subtotal: *{subtotal}*{prorata_line}\n- Total Tagihan: *{total}*\n- Jatuh Tempo: *{due_date}*\n\nSilakan melakukan pembayaran melalui Portal Pelanggan sebelum jatuh tempo untuk menghindari isolir otomatis. Terima kasih.",

            'whatsapp.template.invoice_unpaid' => "Yth. Bapak/Ibu {customer_name},\n\nTagihan internet {brand_name} Anda untuk periode *{period}*.\n\n*Detail Tagihan*:\n- No. Invoice: *{invoice_number}*\n- Layanan: {service_type} ({username})\n- Subtotal: *{subtotal}*{prorata_line}\n- Total Tagihan: *{total}*\n- Jatuh Tempo: *{due_date}*\n\nSilakan melakukan pembayaran melalui Portal Pelanggan sebelum jatuh tempo untuk menghindari isolir otomatis. Terima kasih.",

            'whatsapp.template.invoice_accumulated' => "Yth. Bapak/Ibu {customer_name},\n\nTagihan internet {brand_name} *akumulasi* periode *{period_label}*.\n\n*Detail Tagihan*:\n- No. Invoice: *{invoice_number}*\n- Layanan: {service_type} ({username})\n- Subtotal: *{subtotal}*\n- Total Tagihan: *{total}*\n- Jatuh Tempo: *{due_date}*\n\nSilakan lakukan pembayaran sebelum jatuh tempo melalui Portal Pelanggan. Terima kasih.",

            'whatsapp.template.invoice_accumulated_new' => "Yth. Bapak/Ibu {customer_name},\n\nTagihan internet {brand_name} *akumulasi* periode *{period_label}* telah terbit.\n\n*Detail Tagihan*:\n- No. Invoice: *{invoice_number}*\n- Layanan: PPPoE ({username})\n- Subtotal: *{subtotal}*\n- Total Tagihan: *{total}*\n- Jatuh Tempo: *{due_date}*\n\nSilakan lakukan pembayaran sebelum jatuh tempo. Terima kasih.",

            'whatsapp.template.payment_received' => "Terima Kasih!\n\nPembayaran tagihan {brand_name} Anda telah berhasil diterima.\n\n*Detail Pembayaran*:\n- No. Invoice: *{invoice_number}*\n- Pelanggan: *{customer_name}* ({username})\n- Periode: *{period}*\n- Metode Bayar: {payment_method}\n- Jumlah Bayar: *{amount_paid}*\n- Tanggal Bayar: {paid_at}{footer_note}",

            'whatsapp.template.payment_reactivated' => "Terima Kasih!\n\nPembayaran tagihan {brand_name} Anda telah berhasil diterima.\n\n*Detail Pembayaran*:\n- No. Invoice: *{invoice_number}*\n- Pelanggan: *{customer_name}* ({username})\n- Periode: *{period}*\n- Metode Bayar: {payment_method}\n- Jumlah Bayar: *{amount_paid}*\n- Tanggal Bayar: {paid_at}{footer_note}",

            'whatsapp.template.isolation' => "Yth. Bapak/Ibu {customer_name},\n\nLayanan internet {brand_name} Anda dengan username *{username}* telah di-isolir otomatis karena tagihan {invoice_number} sebesar {total} melewati jatuh tempo ({due_date}).\n\nSilakan lakukan pembayaran segera melalui Portal Pelanggan agar internet otomatis aktif kembali.",

            'whatsapp.template.admin_scheduler' => "*[{brand_name}] Generate Tagihan Otomatis*\n\nTanggal: *{run_date}*\nJadwal: *H-{days_before} sebelum jatuh tempo*\nInvoice baru: *{invoice_count}*\n\n{invoice_list}\nTotal: *{total}*\n\nDetail lengkap tersedia di panel admin tab Invoice.",
        ];
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
        return match ($key) {
            'whatsapp.template.invoice_new',
            'whatsapp.template.invoice_unpaid' => [
                'customer_name' => 'Budi Santoso',
                'brand_name' => BrandingService::companyName(),
                'period' => '2026-06',
                'invoice_number' => 'INV-202606-0001-AB12',
                'service_type' => 'PPPOE',
                'username' => 'budi001',
                'subtotal' => 'Rp 150.000',
                'prorata_line' => "\n- Prorata: *15 hari* / 30 hari",
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
                    ? "\n\nLayanan internet Anda otomatis aktif kembali secara instan. Terima kasih atas kepercayaan Anda."
                    : "\n\nTerima kasih atas kepercayaan Anda.",
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
            default => [],
        };
    }
}
