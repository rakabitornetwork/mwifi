<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerBandwidthUsage extends Model
{
    protected $guarded = [];

    protected $casts = [
        'upload_bytes' => 'integer',
        'download_bytes' => 'integer',
        'last_raw_upload' => 'integer',
        'last_raw_download' => 'integer',
        'last_sampled_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function getTotalBytesAttribute(): int
    {
        return $this->upload_bytes + $this->download_bytes;
    }
}
