<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HotspotSale extends Model
{
    protected $fillable = [
        'router_id',
        'username',
        'package_name',
        'price',
        'payment_method',
        'sold_by_user_id',
        'commission_percent',
        'agent_amount',
        'owner_amount',
    ];

    protected $casts = [
        'price' => 'float',
        'commission_percent' => 'float',
        'agent_amount' => 'float',
        'owner_amount' => 'float',
    ];

    public function router()
    {
        return $this->belongsTo(Router::class);
    }

    public function soldBy()
    {
        return $this->belongsTo(User::class, 'sold_by_user_id');
    }
}
