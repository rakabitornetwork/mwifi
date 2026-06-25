@php
    use App\Services\BillingService;

    $isPaid = $invoice->status === 'paid';
    $companyName = $branding['company_name'] ?? $branding['app_name'] ?? 'mWiFi';
    $formatMoney = fn ($value) => 'Rp ' . number_format((float) $value, 0, ',', '.');
    $formatDate = fn ($value) => $value ? BillingService::formatDisplayDateTime($value) : '-';
    $formatDateOnly = fn ($value) => $value
        ? \Carbon\Carbon::parse($value)->timezone(config('app.timezone', 'Asia/Jakarta'))->format('d/m/Y')
        : '-';
    $paymentMethod = ($latestPayment ?? null)
        ? \App\Services\BillingService::formatPaymentMethodLabel(
            $latestPayment->payment_method,
            $latestPayment->gateway_name
        )
        : '';
@endphp

<div class="slip-header">
    <div class="brand-block">
        @if(empty($hideLogo) && !empty($branding['logo_url']))
            <img src="{{ $branding['logo_url'] }}" alt="{{ $companyName }}" class="brand-logo">
        @endif
        <div class="brand-text">
            <div class="brand-name">{{ $companyName }}</div>
            <div class="brand-meta">
                @if(!empty($branding['company_phone'])){{ $branding['company_phone'] }}@endif
                @if(!empty($branding['company_address']))<br>{{ $branding['company_address'] }}@endif
            </div>
        </div>
    </div>
    <div class="doc-title">
        <h1>{{ $isPaid ? 'BUKTI BAYAR' : 'INVOICE' }}</h1>
        <p>{{ $invoice->invoice_number }}</p>
        <span class="status-badge {{ $isPaid ? 'status-badge--paid' : 'status-badge--unpaid' }}">
            {{ $isPaid ? 'Lunas' : 'Belum Bayar' }}
        </span>
    </div>
</div>

<div class="info-grid">
    <div class="info-block">
        <h2>Pelanggan</h2>
        <p class="strong">{{ $customer->name ?? '-' }}</p>
        <p>{{ $customer->username ?? '-' }}</p>
        @if(!empty($customer->phone_number))<p>{{ $customer->phone_number }}</p>@endif
    </div>
    <div class="info-block">
        <h2>Tagihan</h2>
        <p>Periode: <strong>{{ $invoice->billing_period }}</strong></p>
        <p>Jatuh tempo: <strong>{{ $formatDateOnly($invoice->due_date) }}</strong></p>
        @if($isPaid && $invoice->paid_at)
            <p>Lunas: <strong>{{ $formatDate($invoice->paid_at) }}</strong></p>
        @endif
        @if($isPaid && $latestPayment)
            <p>Bayar: <strong>{{ $paymentMethod ?: '-' }}</strong></p>
        @endif
        @if($package)
            <p>Paket: <strong>{{ $package->name }}</strong></p>
        @endif
    </div>
</div>

<table class="items">
    <thead>
        <tr>
            <th>Keterangan</th>
            <th class="col-period">Periode</th>
            <th class="col-amount">Nominal</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>
                Tagihan Internet
                @if($invoice->is_accumulated && is_array($invoice->accumulated_periods))
                    (Akumulasi)
                @elseif($invoice->is_prorated)
                    (Prorata {{ $invoice->days_billed }}/30)
                @endif
            </td>
            <td class="col-period">{{ $invoice->billing_period }}</td>
            <td class="col-amount num">{{ $formatMoney($invoice->amount) }}</td>
        </tr>
        @if((float) $invoice->tax > 0)
            <tr>
                <td>PPN</td>
                <td class="col-period">-</td>
                <td class="col-amount num">{{ $formatMoney($invoice->tax) }}</td>
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
        <span>TOTAL</span>
        <span>{{ $formatMoney($invoice->total_amount) }}</span>
    </div>
</div>

@if(!$isPaid)
    <div class="pay-note">
        Silakan bayar sebelum jatuh tempo melalui portal pelanggan atau kantor {{ $companyName }}.
    </div>
@endif

@if($isPaid && !empty($nextBilling))
    <div class="next-box">
        <h3>Tagihan Berikutnya</h3>
        <p>
            {{ $nextBilling['period'] ?? '-' }}
            · {{ $formatMoney($nextBilling['total_amount'] ?? 0) }}
            · JT {{ $formatDateOnly($nextBilling['due_date'] ?? null) }}
        </p>
    </div>
@endif

<div class="footer-note">
    Dicetak {{ $formatDate(now()) }} · {{ $companyName }}
</div>
