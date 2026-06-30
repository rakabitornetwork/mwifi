@php
    $hasWideLogo = !empty($branding['logo_wide_url']);
    $brandLogoUrl = $branding['logo_wide_url'] ?? $branding['logo_url'] ?? null;
@endphp

<div class="brand-block{{ $hasWideLogo ? ' brand-block--wide' : '' }}">
    @if(empty($hideLogo) && $brandLogoUrl)
        <img
            src="{{ $brandLogoUrl }}"
            alt="{{ $companyName }}"
            class="brand-logo{{ $hasWideLogo ? ' brand-logo--wide' : '' }}"
        >
    @endif
    <div class="brand-text{{ $hasWideLogo ? ' brand-text--wide' : '' }}">
        @unless($hasWideLogo)
            <div class="brand-name">{{ $companyName }}</div>
        @endunless
        <div class="brand-meta">
            @if(!empty($branding['company_phone'])){{ $branding['company_phone'] }}@endif
            @if(!empty($branding['company_address']))
                @if(!empty($branding['company_phone']))<br>@endif
                {{ $branding['company_address'] }}
            @endif
            @if(!empty($branding['company_email']))
                @if(!empty($branding['company_phone']) || !empty($branding['company_address']))<br>@endif
                {{ $branding['company_email'] }}
            @endif
        </div>
    </div>
</div>
