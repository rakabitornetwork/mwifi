<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HotspotVoucher extends Model
{
    protected $fillable = [
        'router_id',
        'username',
        'password',
        'mikrotik_profile',
        'server',
        'wifi_name',
        'price',
        'validity',
        'status',
        'comment',
        'mac_address',
        'sold_at',
    ];

    protected $casts = [
        'sold_at' => 'datetime',
        'price' => 'float',
    ];

    public function router()
    {
        return $this->belongsTo(Router::class);
    }
}
