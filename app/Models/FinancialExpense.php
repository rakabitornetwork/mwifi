<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialExpense extends Model
{
    public const CATEGORIES = [
        'operasional' => 'Operasional',
        'gaji' => 'Gaji & Honor',
        'infrastruktur' => 'Infrastruktur & Jaringan',
        'perangkat' => 'Pembelian Perangkat',
        'transportasi' => 'Transportasi',
        'lainnya' => 'Lainnya',
    ];

    protected $fillable = [
        'router_id',
        'recorded_by',
        'category',
        'title',
        'amount',
        'expense_date',
        'payment_method',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'expense_date' => 'date',
    ];

    public function router(): BelongsTo
    {
        return $this->belongsTo(Router::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function categoryLabel(): string
    {
        return self::CATEGORIES[$this->category] ?? ucfirst(str_replace('_', ' ', (string) $this->category));
    }
}
