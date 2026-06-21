<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cetak Thermal — {{ $invoice->invoice_number }}</title>
    <style>
        @page { size: 58mm auto; margin: 2mm; }
        * { box-sizing: border-box; }
        body {
            margin: 0 auto;
            width: 58mm;
            max-width: 58mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.35;
            color: #000;
            background: #f3f4f6;
        }
        .toolbar {
            position: fixed; top: 0; left: 0; right: 0; z-index: 100;
            display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
            padding: 10px 12px; background: #111827; color: #fff;
            font-family: 'Segoe UI', sans-serif;
        }
        .toolbar-title { font-size: 12px; font-weight: 700; margin-right: auto; }
        .toolbar a, .toolbar button {
            border: 0; border-radius: 6px; padding: 6px 10px;
            font-size: 11px; font-weight: 700; cursor: pointer; text-decoration: none;
            color: #111827; background: #fff;
        }
        .toolbar button.primary { background: #10b981; color: #fff; }
        .receipt {
            width: 54mm;
            margin: 56px auto 16px;
            padding: 4mm 3mm;
            background: #fff;
            box-shadow: 0 4px 16px rgba(0,0,0,.1);
        }
        .slip-header { text-align: center; margin-bottom: 8px; }
        .brand-block { display: block; }
        .brand-logo {
            display: block; margin: 0 auto 4px; height: 12mm; max-width: 40mm; object-fit: contain;
        }
        .brand-name { font-size: 13px; font-weight: 700; text-transform: uppercase; }
        .brand-meta { font-size: 9px; margin-top: 2px; }
        .doc-title { margin-top: 8px; padding-top: 6px; border-top: 1px dashed #000; }
        .doc-title h1 { margin: 0; font-size: 12px; font-weight: 700; }
        .doc-title p { margin: 2px 0 0; font-size: 10px; word-break: break-all; }
        .status-badge {
            display: inline-block; margin-top: 4px; padding: 2px 6px;
            border: 1px solid #000; font-size: 9px; font-weight: 700;
        }
        .status-badge--paid { }
        .status-badge--unpaid { }
        .info-grid { margin: 8px 0; padding: 6px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
        .info-block { margin-bottom: 6px; }
        .info-block:last-child { margin-bottom: 0; }
        .info-block h2 { margin: 0 0 2px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
        .info-block p { margin: 0 0 2px; font-size: 10px; word-break: break-word; }
        .info-block .strong { font-weight: 700; }
        table.items { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
        table.items th, table.items td { padding: 3px 0; vertical-align: top; border-bottom: 1px dotted #ccc; }
        table.items th { font-size: 9px; text-align: left; }
        table.items .col-period { display: none; }
        table.items .col-amount, table.items td.num { text-align: right; white-space: nowrap; }
        .totals { margin-top: 6px; padding-top: 4px; border-top: 1px dashed #000; }
        .totals-row { display: flex; justify-content: space-between; font-size: 10px; padding: 2px 0; }
        .totals-row.total { font-size: 12px; font-weight: 700; margin-top: 4px; padding-top: 4px; border-top: 1px solid #000; }
        .pay-note { margin-top: 8px; font-size: 9px; text-align: center; }
        .next-box { margin-top: 8px; padding-top: 6px; border-top: 1px dashed #000; font-size: 9px; }
        .next-box h3 { margin: 0 0 2px; font-size: 9px; font-weight: 700; }
        .next-box p { margin: 0; }
        .footer-note { margin-top: 10px; padding-top: 6px; border-top: 1px dashed #000; font-size: 8px; text-align: center; }
        @media print {
            body { background: #fff; width: 58mm; }
            .toolbar { display: none !important; }
            .receipt { margin: 0; box-shadow: none; width: 54mm; }
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <div class="toolbar-title">Thermal 58mm — {{ $invoice->invoice_number }}</div>
        <a href="{{ request()->fullUrlWithQuery(['format' => 'a4']) }}">A4</a>
        <button type="button" class="primary" onclick="window.print()">Cetak</button>
    </div>
    <div class="receipt">
        @include('admin.invoices._invoice-content')
    </div>
</body>
</html>
