<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Odp extends Model
{
    protected $guarded = [];

    protected $casts = [
        'latitude' => 'double',
        'longitude' => 'double',
        'total_ports' => 'integer',
        'used_ports' => 'integer',
    ];

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }
}
