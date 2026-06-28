<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HotspotVoucher extends Model
{
    protected $fillable = [
        'router_id',
        'user_id',
        'username',
        'password',
        'mikrotik_profile',
        'server',
        'wifi_name',
        'price',
        'agent_commission_amount',
        'validity',
        'status',
        'comment',
        'mac_address',
        'sold_at',
    ];

    protected $casts = [
        'sold_at' => 'datetime',
        'price' => 'float',
        'agent_commission_amount' => 'float',
        'user_id' => 'integer',
    ];

    public function router()
    {
        return $this->belongsTo(Router::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
