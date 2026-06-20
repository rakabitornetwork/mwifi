<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingActivityLog extends Model
{
    protected $fillable = [
        'event_type',
        'message',
        'meta',
        'run_date',
    ];

    protected $casts = [
        'meta' => 'array',
        'run_date' => 'date',
    ];
}
