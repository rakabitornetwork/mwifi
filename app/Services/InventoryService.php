<?php

namespace App\Services;

use App\Models\InventoryItem;
use App\Models\InventoryMovement;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class InventoryService
{
    public static function isLowStockNotifyEnabled(): bool
    {
        return filter_var(
            SettingService::get('inventory.notify_low_stock', '1'),
            FILTER_VALIDATE_BOOLEAN
        );
    }

    public static function getAdminNotifyPhone(): ?string
    {
        $phone = trim((string) SettingService::get('system.billing_admin_phone', ''));
        if ($phone === '') {
            $phone = trim((string) SettingService::get('system.company_phone', ''));
        }

        return $phone !== '' ? $phone : null;
    }

    public static function recordMovement(
        InventoryItem $item,
        string $type,
        int $quantityBefore,
        int $quantityChange,
        int $quantityAfter,
        ?string $notes = null,
        ?int $customerId = null,
        ?int $userId = null,
    ): InventoryMovement {
        return InventoryMovement::create([
            'inventory_item_id' => $item->id,
            'customer_id' => $customerId,
            'user_id' => $userId ?? Auth::id(),
            'type' => $type,
            'quantity_before' => $quantityBefore,
            'quantity_change' => $quantityChange,
            'quantity_after' => $quantityAfter,
            'notes' => $notes,
        ]);
    }

    public static function adjustStock(
        InventoryItem $item,
        string $type,
        int $amount,
        ?string $notes = null,
        ?int $customerId = null,
    ): InventoryMovement {
        $amount = max(1, $amount);
        $previousQuantity = (int) $item->quantity;

        $quantityChange = match ($type) {
            InventoryMovement::TYPE_IN => $amount,
            InventoryMovement::TYPE_OUT => -$amount,
            default => throw new \InvalidArgumentException('Tipe pergerakan stok tidak valid.'),
        };

        $newQuantity = $previousQuantity + $quantityChange;
        if ($newQuantity < 0) {
            throw new \RuntimeException("Stok \"{$item->name}\" tidak cukup (tersedia: {$previousQuantity}).");
        }

        $item->update(['quantity' => $newQuantity]);
        $item->refresh();

        $movement = self::recordMovement(
            $item,
            $type,
            $previousQuantity,
            $quantityChange,
            $newQuantity,
            $notes,
            $customerId,
        );

        self::notifyLowStockIfNeeded($item, $previousQuantity);

        return $movement;
    }

    public static function recordEditAdjustment(
        InventoryItem $item,
        int $previousQuantity,
        int $newQuantity,
    ): ?InventoryMovement {
        if ($previousQuantity === $newQuantity) {
            return null;
        }

        return self::recordMovement(
            $item,
            InventoryMovement::TYPE_ADJUST,
            $previousQuantity,
            $newQuantity - $previousQuantity,
            $newQuantity,
            'Penyesuaian manual via form edit item.',
        );
    }

    public static function notifyLowStockIfNeeded(InventoryItem $item, int $previousQuantity): void
    {
        if (!self::isLowStockNotifyEnabled()) {
            return;
        }

        if (!array_key_exists($item->category, InventoryItem::WATCH_CATEGORIES)) {
            return;
        }

        $wasLowStock = $item->min_stock > 0 && $previousQuantity <= $item->min_stock;
        $isLowStock = $item->isLowStock();

        if (!$isLowStock || $wasLowStock) {
            if (!$isLowStock) {
                Cache::forget(self::lowStockCacheKey($item->id));
            }

            return;
        }

        $cacheKey = self::lowStockCacheKey($item->id);
        if (Cache::has($cacheKey)) {
            return;
        }

        $phone = self::getAdminNotifyPhone();
        if (!$phone) {
            Log::info('Inventory low stock alert skipped: admin phone not configured.');

            return;
        }

        if (!WhatsAppService::sendText($phone, self::buildLowStockMessage($item), true)) {
            return;
        }

        Cache::put($cacheKey, true, now()->addHours(24));
    }

    private static function lowStockCacheKey(int $itemId): string
    {
        return "inventory_low_stock_notified_{$itemId}";
    }

    private static function buildLowStockMessage(InventoryItem $item): string
    {
        $brand = BrandingService::companyName();
        $category = $item->categoryLabel();
        $unit = InventoryItem::UNITS[$item->unit] ?? $item->unit;

        return implode("\n", [
            "[{$brand}] Peringatan Stok Inventaris",
            '',
            "Kategori: {$category}",
            "Barang: {$item->name}",
            "Stok saat ini: {$item->quantity} {$unit}",
            "Stok minimum: {$item->min_stock} {$unit}",
            '',
            'Segera restock ONT/Adaptor jika diperlukan.',
        ]);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function recentMovements(int $limit = 25): array
    {
        return InventoryMovement::query()
            ->with(['item:id,name,category,unit', 'customer:id,name,username', 'user:id,name'])
            ->latest()
            ->limit($limit)
            ->get()
            ->map(fn (InventoryMovement $movement) => [
                'id' => $movement->id,
                'type' => $movement->type,
                'type_label' => $movement->typeLabel(),
                'quantity_before' => $movement->quantity_before,
                'quantity_change' => $movement->quantity_change,
                'quantity_after' => $movement->quantity_after,
                'notes' => $movement->notes,
                'created_at' => $movement->created_at?->toIso8601String(),
                'created_at_label' => $movement->created_at?->format('d/m/Y H:i'),
                'item' => $movement->item ? [
                    'id' => $movement->item->id,
                    'name' => $movement->item->name,
                    'category' => $movement->item->category,
                    'category_label' => $movement->item->categoryLabel(),
                    'unit' => $movement->item->unit,
                ] : null,
                'customer' => $movement->customer ? [
                    'id' => $movement->customer->id,
                    'name' => $movement->customer->name,
                    'username' => $movement->customer->username,
                ] : null,
                'user' => $movement->user ? [
                    'id' => $movement->user->id,
                    'name' => $movement->user->name,
                ] : null,
            ])
            ->all();
    }
}
