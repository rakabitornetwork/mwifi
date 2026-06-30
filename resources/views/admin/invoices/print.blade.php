<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cetak Invoice — {{ $invoice->invoice_number }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 0;
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #111827;
            background: #e5e7eb;
        }

        .toolbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 100;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: #111827;
            color: #fff;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .toolbar-title {
            font-size: 13px;
            font-weight: 700;
            margin-right: auto;
        }

        .toolbar-note {
            font-size: 11px;
            color: #9ca3af;
        }

        .toolbar a,
        .toolbar button {
            border: 0;
            border-radius: 8px;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            text-decoration: none;
            color: #111827;
            background: #fff;
        }

        .toolbar button.primary,
        .toolbar a.primary {
            background: #10b981;
            color: #fff;
        }

        .sheet {
            width: 210mm;
            height: 297mm;
            margin: 72px auto 24px;
            position: relative;
            background: #fff;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        .half-guide {
            position: absolute;
            left: 0;
            right: 0;
            top: 148.5mm;
            border-top: 1px dashed #d1d5db;
            pointer-events: none;
        }

        .half-guide-label {
            position: absolute;
            right: 8mm;
            top: 149mm;
            font-size: 9px;
            color: #9ca3af;
            background: #fff;
            padding: 0 4px;
        }

        .invoice-slip {
            width: 210mm;
            height: 148.5mm;
            padding: 7mm 10mm;
            overflow: hidden;
            position: absolute;
            left: 0;
        }

        .invoice-slip--top {
            top: 0;
        }

        .invoice-slip--bottom {
            top: 148.5mm;
        }

        .slip-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 12px;
            border-bottom: 2px solid #10b981;
            padding-bottom: 6px;
            margin-bottom: 8px;
        }

@include('admin.invoices._invoice-brand-styles')

        .brand-name {
            font-size: 15px;
            font-weight: 800;
            color: #065f46;
            line-height: 1.2;
        }

        .brand-meta {
            font-size: 9px;
            color: #6b7280;
            margin-top: 3px;
            line-height: 1.45;
        }

        .doc-title {
            text-align: right;
        }

        .doc-title h1 {
            margin: 0;
            font-size: 16px;
            letter-spacing: 0.04em;
            color: #111827;
        }

        .doc-title p {
            margin: 2px 0 0;
            font-size: 10px;
            color: #6b7280;
        }

        .status-badge {
            display: inline-block;
            margin-top: 4px;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
        }

        .status-badge--paid {
            background: #d1fae5;
            color: #047857;
        }

        .status-badge--unpaid {
            background: #fee2e2;
            color: #b91c1c;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px 14px;
            margin-bottom: 8px;
        }

        .info-block h2 {
            margin: 0 0 4px;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #6b7280;
        }

        .info-block p {
            margin: 0;
            font-size: 10px;
            line-height: 1.45;
        }

        .info-block .strong {
            font-size: 11px;
            font-weight: 700;
        }

        table.items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }

        table.items th,
        table.items td {
            padding: 5px 6px;
            font-size: 10px;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
        }

        table.items th {
            background: #f9fafb;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7280;
        }

        table.items td.num {
            text-align: right;
            white-space: nowrap;
            font-weight: 700;
        }

        .totals {
            margin-left: auto;
            width: 58%;
        }

        .totals-row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            font-size: 10px;
            padding: 3px 0;
        }

        .totals-row.total {
            border-top: 2px solid #111827;
            margin-top: 4px;
            padding-top: 6px;
            font-size: 12px;
            font-weight: 800;
        }

        .next-box {
            margin-top: 8px;
            padding: 6px 8px;
            border: 1px dashed #10b981;
            border-radius: 8px;
            background: #ecfdf5;
        }

        .next-box h3 {
            margin: 0 0 4px;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #047857;
        }

        .next-box p {
            margin: 0;
            font-size: 10px;
            line-height: 1.45;
        }

        .footer-note {
            position: absolute;
            left: 10mm;
            right: 10mm;
            bottom: 6mm;
            font-size: 8px;
            color: #9ca3af;
            text-align: center;
        }

        @media print {
            body {
                background: #fff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .brand-logo:not(.brand-logo--wide) {
                height: 13mm;
                max-width: 26mm;
            }

            .brand-logo--wide {
                max-height: 15mm;
            }

            .toolbar,
            .half-guide,
            .half-guide-label {
                display: none !important;
            }

            .sheet {
                margin: 0;
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    @php
        $isPaid = $invoice->status === 'paid';
        $position = in_array($position ?? 'top', ['top', 'bottom'], true) ? $position : 'top';
        $companyName = $branding['company_name'] ?? $branding['app_name'] ?? 'mWiFi';
        $formatMoney = fn ($value) => 'Rp ' . number_format((float) $value, 0, ',', '.');
        $formatDate = fn ($value) => $value ? \Carbon\Carbon::parse($value)->format('d/m/Y') : '-';
    @endphp

    <div class="toolbar">
        <div class="toolbar-title">Cetak Invoice — {{ $invoice->invoice_number }}</div>
        @if(session('success'))
            <span class="toolbar-note" style="color: #6ee7b7; font-weight: 700;">{{ session('success') }}</span>
        @else
            <span class="toolbar-note">1 invoice = 1/2 kertas A4. Gunakan sisa kertas untuk invoice berikutnya.</span>
        @endif
        <a href="{{ request()->fullUrlWithQuery(['format' => 'a4', 'position' => $position]) }}">A4 Penuh</a>
        <a href="{{ request()->fullUrlWithQuery(['format' => 'thermal', 'position' => $position]) }}">Thermal 58mm</a>
        <a href="{{ request()->fullUrlWithQuery(['format' => 'half', 'position' => 'top']) }}" class="{{ $position === 'top' ? 'primary' : '' }}">Posisi Atas</a>
        <a href="{{ request()->fullUrlWithQuery(['format' => 'half', 'position' => 'bottom']) }}" class="{{ $position === 'bottom' ? 'primary' : '' }}">Posisi Bawah</a>
        <button type="button" class="primary" onclick="window.print()">Cetak Sekarang</button>
    </div>

    <div class="sheet">
        <div class="half-guide"></div>
        <div class="half-guide-label">Garis potong / sisa kertas A4</div>

        <div class="invoice-slip invoice-slip--{{ $position }}">
            @php
                $hasWideInvoiceLogo = !empty($branding['logo_wide_url']);
            @endphp
            <div class="slip-header{{ $hasWideInvoiceLogo ? ' slip-header--wide-brand' : '' }}">
                @include('admin.invoices._invoice-brand-header')
                <div class="doc-title">
                    <h1>{{ $isPaid ? 'BUKTI TAGIHAN' : 'INVOICE' }}</h1>
                    <p>{{ $invoice->invoice_number }}</p>
                    <span class="status-badge {{ $isPaid ? 'status-badge--paid' : 'status-badge--unpaid' }}">
                        {{ $isPaid ? 'Lunas' : 'Belum Bayar' }}
                    </span>
                </div>
            </div>

            <div class="info-grid">
                <div class="info-block">
                    <h2>Tagihan Kepada</h2>
                    @if(!empty($invoicePresentation))
                        @foreach($invoicePresentation['customer_lines'] as $line)
                            @if($line['label'])
                                <p>{{ $line['label'] }}: <span class="strong">{{ $line['value'] }}</span></p>
                            @else
                                <p class="strong">{{ $line['value'] }}</p>
                            @endif
                        @endforeach
                    @else
                        <p class="strong">{{ $customer->name ?? '-' }}</p>
                        <p>Username: {{ $customer->username ?? '-' }}</p>
                        @if(!empty($customer->phone_number))<p>Telp: {{ $customer->phone_number }}</p>@endif
                        @if(!empty($customer->address))<p>{{ $customer->address }}</p>@endif
                    @endif
                </div>
                <div class="info-block">
                    <h2>Detail Tagihan</h2>
                    <p>Periode: <strong>{{ $invoicePresentation['period_label'] ?? $invoice->billing_period }}</strong></p>
                    <p>Jatuh Tempo: <strong>{{ $formatDate($invoice->due_date) }}</strong></p>
                    @if($isPaid && $invoice->paid_at)
                        <p>Tgl Lunas: <strong>{{ $formatDate($invoice->paid_at) }}</strong></p>
                    @endif
                    @if($isPaid && !empty($latestPayment))
                        @php
                            $paymentMethod = \App\Services\BillingService::formatPaymentMethodLabel(
                                $latestPayment->payment_method,
                                $latestPayment->gateway_name
                            );
                        @endphp
                        @if($paymentMethod)
                            <p>Bayar: <strong>{{ $paymentMethod }}</strong></p>
                        @endif
                    @endif
                    @if(!empty($invoicePresentation))
                        <p>Paket: <strong>{{ $invoicePresentation['package_label'] }}</strong></p>
                        @if(!empty($invoicePresentation['package_specs']))
                            <p>Spesifikasi: <strong>{{ $invoicePresentation['package_specs'] }}</strong></p>
                        @endif
                    @elseif($package)
                        <p>Paket: <strong>{{ $package->name }}</strong></p>
                    @endif
                </div>
            </div>

            <table class="items">
                <thead>
                    <tr>
                        <th>Keterangan</th>
                        <th>Periode</th>
                        <th style="text-align:right;">Nominal</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            @if(!empty($invoicePresentation))
                                {{ $invoicePresentation['item_description'] }}
                            @else
                                Tagihan Internet
                                @if($invoice->is_prorated)
                                    (Prorata {{ $invoice->days_billed }}/30 hari)
                                @else
                                    (Penuh 30 hari)
                                @endif
                            @endif
                        </td>
                        <td>{{ $invoicePresentation['item_period'] ?? $invoice->billing_period }}</td>
                        <td class="num">{{ $formatMoney($invoice->amount) }}</td>
                    </tr>
                    @if((float) $invoice->tax > 0)
                        <tr>
                            <td>PPN</td>
                            <td>-</td>
                            <td class="num">{{ $formatMoney($invoice->tax) }}</td>
                        </tr>
                    @endif
                </tbody>
            </table>

            <div class="totals">
                <div class="totals-row">
                    <span>Subtotal</span>
                    <span>{{ $formatMoney($invoice->amount) }}</span>
                </div>
                @if((float) $invoice->tax > 0)
                    <div class="totals-row">
                        <span>PPN</span>
                        <span>{{ $formatMoney($invoice->tax) }}</span>
                    </div>
                @endif
                <div class="totals-row total">
                    <span>Total</span>
                    <span>{{ $formatMoney($invoice->total_amount) }}</span>
                </div>
            </div>

            @if($isPaid && !empty($nextBilling) && empty($invoicePresentation['hide_next_billing'] ?? false))
                <div class="next-box">
                    <h3>Tagihan Selanjutnya</h3>
                    <p>
                        Periode <strong>{{ $nextBilling['period'] ?? '-' }}</strong>
                        · Estimasi <strong>{{ $formatMoney($nextBilling['total_amount'] ?? 0) }}</strong>
                        · Jatuh tempo <strong>{{ $formatDate($nextBilling['due_date'] ?? null) }}</strong>
                        @if(!empty($nextBilling['already_generated']))
                            · Invoice <strong>{{ $nextBilling['invoice_number'] }}</strong> sudah terbit
                        @else
                            · Belum digenerate otomatis
                        @endif
                    </p>
                </div>
            @endif

            <div class="footer-note">
                Dokumen dicetak {{ now()->format('d/m/Y H:i') }} · Simpan sebagai arsip pembayaran layanan internet.
            </div>
        </div>
    </div>
</body>
</html>
