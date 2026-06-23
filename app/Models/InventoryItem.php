<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InventoryItem extends Model
{
    protected $guarded = [];

    protected $casts = [
        'quantity' => 'integer',
        'min_stock' => 'integer',
    ];

    public const CATEGORIES = [
        'ont' => 'ONT / Modem',
        'router' => 'Router / AP',
        'switch' => 'Switch / OLT',
        'odp' => 'ODP / Splitter',
        'cable' => 'Kabel Fiber / UTP',
        'connector' => 'Konektor / Patchcord',
        'tool' => 'Alat / Tools',
        'other' => 'Lainnya',
    ];

    public const CONDITIONS = [
        'new' => 'Baru',
        'used' => 'Bekas',
        'damaged' => 'Rusak',
    ];

    public const UNITS = [
        'pcs' => 'Pcs',
        'meter' => 'Meter',
        'box' => 'Box',
        'set' => 'Set',
        'roll' => 'Roll',
    ];

    public function isLowStock(): bool
    {
        return $this->min_stock > 0 && $this->quantity <= $this->min_stock;
    }

    public function categoryLabel(): string
    {
        return self::CATEGORIES[$this->category] ?? ucfirst((string) $this->category);
    }

    public function conditionLabel(): string
    {
        return self::CONDITIONS[$this->condition] ?? ucfirst((string) $this->condition);
    }
}
