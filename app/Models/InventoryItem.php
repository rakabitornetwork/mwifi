<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class InventoryItem extends Model
{
    protected $guarded = [];

    protected $casts = [
        'quantity' => 'integer',
        'min_stock' => 'integer',
    ];

    public const CATEGORIES = [
        'ont' => 'ONT / Modem',
        'adaptor' => 'Adaptor / Power Supply',
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

    /** Kategori yang dipantau khusus di halaman inventaris (ONT & perlengkapan pelanggan). */
    public const WATCH_CATEGORIES = [
        'ont' => 'ONT / Modem',
        'adaptor' => 'Adaptor / Power Supply',
    ];

    public function isLowStock(): bool
    {
        return $this->min_stock > 0 && $this->quantity <= $this->min_stock;
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function categoryLabel(): string
    {
        return self::CATEGORIES[$this->category] ?? ucfirst((string) $this->category);
    }

    public function conditionLabel(): string
    {
        return self::CONDITIONS[$this->condition] ?? ucfirst((string) $this->condition);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    public static function watchCategorySummaries(): array
    {
        $summaries = [];

        foreach (self::WATCH_CATEGORIES as $key => $label) {
            $items = self::query()->where('category', $key)->orderBy('name')->get();
            $lowStockItems = $items->filter(fn (self $item) => $item->isLowStock())->values();

            $summaries[$key] = [
                'label' => $label,
                'item_count' => $items->count(),
                'total_quantity' => (int) $items->sum('quantity'),
                'low_stock_count' => $lowStockItems->count(),
                'low_stock_items' => $lowStockItems->map(fn (self $item) => [
                    'id' => $item->id,
                    'name' => $item->name,
                    'quantity' => $item->quantity,
                    'min_stock' => $item->min_stock,
                    'unit' => $item->unit,
                ])->all(),
                'status' => $lowStockItems->isNotEmpty()
                    ? 'low'
                    : ($items->isEmpty() ? 'empty' : 'ok'),
            ];
        }

        return $summaries;
    }
}
