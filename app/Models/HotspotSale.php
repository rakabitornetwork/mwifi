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
    ];

    protected $casts = [
        'price' => 'float',
    ];

    public function router()
    {
        return $this->belongsTo(Router::class);
    }
}
