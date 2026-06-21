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

    public function syncUsedPorts(): void
    {
        $count = $this->customers()->count();

        if ((int) $this->used_ports !== $count) {
            $this->forceFill(['used_ports' => $count])->saveQuietly();
        }
    }

    /**
     * @param  array<int|string|null>  $ids
     */
    public static function syncUsedPortsForIds(array $ids): void
    {
        $ids = array_values(array_unique(array_filter($ids, fn ($id) => $id !== null && $id !== '')));

        if ($ids === []) {
            return;
        }

        static::query()->whereIn('id', $ids)->get()->each->syncUsedPorts();
    }
}
