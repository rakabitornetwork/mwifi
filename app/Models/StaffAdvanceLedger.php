<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StaffAdvanceLedger extends Model
{
    public const TYPE_KASBON = 'kasbon';

    public const TYPE_PELUNASAN = 'pelunasan';

    public const TYPE_HUTANG = 'hutang';

    public const TYPE_BAYAR_HUTANG = 'bayar_hutang';

    public const TYPES = [
        self::TYPE_KASBON => 'Kasbon Teknisi',
        self::TYPE_PELUNASAN => 'Pelunasan Kasbon',
        self::TYPE_HUTANG => 'Hutang',
        self::TYPE_BAYAR_HUTANG => 'Bayar Hutang',
    ];

    /** @var list<string> */
    public const PIUTANG_TYPES = [
        self::TYPE_KASBON,
        self::TYPE_PELUNASAN,
    ];

    /** @var list<string> */
    public const HUTANG_TYPES = [
        self::TYPE_HUTANG,
        self::TYPE_BAYAR_HUTANG,
    ];

    protected $fillable = [
        'staff_user_id',
        'recorded_by',
        'type',
        'counterparty',
        'title',
        'amount',
        'transaction_date',
        'payment_method',
        'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'date',
    ];

    public function staffUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_user_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function typeLabel(): string
    {
        return self::TYPES[$this->type] ?? ucfirst(str_replace('_', ' ', (string) $this->type));
    }

    public function signedAmount(): float
    {
        $amount = (float) $this->amount;

        return match ($this->type) {
            self::TYPE_KASBON, self::TYPE_HUTANG => $amount,
            self::TYPE_PELUNASAN, self::TYPE_BAYAR_HUTANG => -$amount,
            default => $amount,
        };
    }

    public function isPiutangType(): bool
    {
        return in_array($this->type, self::PIUTANG_TYPES, true);
    }

    public function isHutangType(): bool
    {
        return in_array($this->type, self::HUTANG_TYPES, true);
    }
}
