<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $guarded = [];

    protected $casts = [
        'billing_date' => 'integer',
        'service_start_date' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function router(): BelongsTo
    {
        return $this->belongsTo(Router::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function odp(): BelongsTo
    {
        return $this->belongsTo(Odp::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function billingDeferrals(): HasMany
    {
        return $this->hasMany(BillingDeferral::class);
    }

    public function bandwidthUsages(): HasMany
    {
        return $this->hasMany(CustomerBandwidthUsage::class);
    }

    public function currentBandwidthUsage(): ?CustomerBandwidthUsage
    {
        return $this->bandwidthUsages()
            ->where('period', now()->format('Y-m'))
            ->first();
    }

    public function pendingBillingDeferral(): ?BillingDeferral
    {
        return $this->billingDeferrals()
            ->where('status', 'pending')
            ->latest('id')
            ->first();
    }

    public function generatedPortalEmail(): string
    {
        return strtolower($this->username) . '@mwifi.test';
    }

    /**
     * Email address safe for external payment gateways (Midtrans, Tripay).
     */
    public function paymentGatewayEmail(): string
    {
        foreach ([$this->displayPortalEmail(), $this->user?->email] as $email) {
            if ($this->isValidPaymentGatewayEmail($email)) {
                return strtolower(trim($email));
            }
        }

        return $this->syntheticPaymentGatewayEmail();
    }

    public function isValidPaymentGatewayEmail(?string $email): bool
    {
        if (! is_string($email) || trim($email) === '') {
            return false;
        }

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return false;
        }

        $domain = strtolower((string) substr(strrchr($email, '@'), 1));

        return ! in_array($domain, ['mwifi.test', 'localhost', 'invalid'], true)
            && ! str_ends_with($domain, '.local')
            && ! str_ends_with($domain, '.test');
    }

    public function syntheticPaymentGatewayEmail(): string
    {
        $local = preg_replace('/[^a-z0-9]/', '', strtolower((string) $this->username));

        if ($local === '') {
            $local = 'customer' . $this->id;
        }

        return $local . '@' . $this->paymentGatewayEmailDomain();
    }

    protected function paymentGatewayEmailDomain(): string
    {
        $companyEmail = (string) setting('system.company_email', '');

        if ($this->isValidPaymentGatewayEmail($companyEmail)) {
            return strtolower((string) substr(strrchr($companyEmail, '@'), 1));
        }

        return 'example.com';
    }

    public function displayPortalEmail(): ?string
    {
        $email = $this->user?->email;

        if (! $email) {
            return null;
        }

        if (strtolower($email) === $this->generatedPortalEmail()) {
            return null;
        }

        return $email;
    }
}
