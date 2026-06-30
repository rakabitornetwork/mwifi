<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cetak A4 — {{ $invoice->invoice_number }}</title>
    <style>
        @page { size: A4 portrait; margin: 12mm; }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #111827;
            background: #e5e7eb;
        }
        .toolbar {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            display: flex; align-items: center; gap: 10px; padding: 12px 16px;
            background: #111827; color: #fff;
        }
        .toolbar-title { font-size: 13px; font-weight: 700; margin-right: auto; }
        .toolbar a, .toolbar button {
            border: 0; border-radius: 8px; padding: 8px 12px;
            font-size: 12px; font-weight: 700; cursor: pointer; text-decoration: none;
            color: #111827; background: #fff;
        }
        .toolbar button.primary { background: #10b981; color: #fff; }
        .sheet {
            width: 210mm; min-height: 277mm; margin: 64px auto 24px;
            padding: 14mm; background: #fff; box-shadow: 0 8px 30px rgba(0,0,0,.12);
        }
        .slip-header {
            display: flex; justify-content: space-between; gap: 16px;
            border-bottom: 2px solid #10b981; padding-bottom: 10px; margin-bottom: 14px;
        }
@include('admin.invoices._invoice-brand-styles')
        .brand-name { font-size: 20px; font-weight: 800; color: #065f46; }
        .brand-meta { font-size: 11px; color: #6b7280; margin-top: 4px; line-height: 1.5; }
        .doc-title { text-align: right; }
        .doc-title h1 { margin: 0; font-size: 22px; letter-spacing: .04em; }
        .doc-title p { margin: 4px 0 0; font-size: 12px; color: #6b7280; }
        .status-badge {
            display: inline-block; margin-top: 6px; padding: 4px 10px;
            border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase;
        }
        .status-badge--paid { background: #d1fae5; color: #047857; }
        .status-badge--unpaid { background: #fee2e2; color: #b91c1c; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .info-block h2 {
            margin: 0 0 6px; font-size: 10px; text-transform: uppercase;
            letter-spacing: .08em; color: #6b7280;
        }
        .info-block p { margin: 0 0 4px; font-size: 12px; line-height: 1.5; }
        .info-block .strong { font-size: 14px; font-weight: 700; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        table.items th, table.items td {
            padding: 10px 8px; font-size: 12px; border-bottom: 1px solid #e5e7eb; text-align: left;
        }
        table.items th {
            background: #f9fafb; font-size: 10px; text-transform: uppercase; color: #6b7280;
        }
        table.items .col-amount, table.items td.num { text-align: right; white-space: nowrap; }
        .totals { margin-left: auto; width: 50%; }
        .totals-row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; }
        .totals-row.total {
            border-top: 2px solid #111827; margin-top: 6px; padding-top: 8px;
            font-size: 16px; font-weight: 800;
        }
        .pay-note {
            margin-top: 12px; padding: 10px 12px; border-radius: 8px;
            background: #fff7ed; border: 1px solid #fdba74; font-size: 12px;
        }
        .next-box {
            margin-top: 14px; padding: 10px 12px; border: 1px dashed #10b981;
            border-radius: 8px; background: #ecfdf5;
        }
        .next-box h3 { margin: 0 0 4px; font-size: 10px; text-transform: uppercase; color: #047857; }
        .next-box p { margin: 0; font-size: 12px; }
        .footer-note { margin-top: 20px; font-size: 10px; color: #9ca3af; text-align: center; }
        @media print {
            body { background: #fff; }
            .toolbar { display: none !important; }
            .sheet { margin: 0; box-shadow: none; width: auto; min-height: auto; }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <div class="toolbar-title">Cetak A4 — {{ $invoice->invoice_number }}</div>
        <a href="{{ request()->fullUrlWithQuery(['format' => 'thermal']) }}">Thermal 58mm</a>
        <a href="{{ request()->fullUrlWithQuery(['format' => 'half']) }}">1/2 A4</a>
        <button type="button" class="primary" onclick="window.print()">Cetak</button>
    </div>
    <div class="sheet">
        @include('admin.invoices._invoice-content')
    </div>
</body>
</html>
