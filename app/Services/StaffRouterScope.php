<?php

namespace App\Services;

use App\Models\BillingActivityLog;
use App\Models\Customer;
use App\Models\Odp;
use App\Models\Router;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class StaffRouterScope
{
    public function __construct(private ?User $user) {}

    public static function for(?User $user): self
    {
        return new self($user);
    }

    public function isScoped(): bool
    {
        return $this->user !== null
            && $this->user->role === User::ROLE_TECHNICIAN
            && $this->user->assigned_router_id !== null;
    }

    public function routerId(): ?int
    {
        return $this->isScoped() ? (int) $this->user->assigned_router_id : null;
    }

    public function canAccessRouter(?int $routerId): bool
    {
        if (!$this->isScoped()) {
            return true;
        }

        return $routerId !== null && (int) $routerId === $this->routerId();
    }

    public function ensureCanAccessRouter(?int $routerId): void
    {
        if (!$this->canAccessRouter($routerId)) {
            abort(403, 'Anda tidak memiliki akses ke router ini.');
        }
    }

    public function routersQuery(): Builder
    {
        $query = Router::query();

        if ($this->isScoped()) {
            $query->where('id', $this->routerId());
        }

        return $query;
    }

    public function scopeCustomers(Builder $query): Builder
    {
        if ($this->isScoped()) {
            $query->where('router_id', $this->routerId());
        }

        return $query;
    }

    public function scopePackages(Builder $query): Builder
    {
        if ($this->isScoped()) {
            $query->where('router_id', $this->routerId());
        }

        return $query;
    }

    public function scopeInvoices(Builder $query): Builder
    {
        if ($this->isScoped()) {
            $query->whereHas('customer', fn (Builder $customerQuery) => $customerQuery->where('router_id', $this->routerId()));
        }

        return $query;
    }

    public function scopeBillingDeferrals(Builder $query): Builder
    {
        if ($this->isScoped()) {
            $query->whereHas('customer', fn (Builder $customerQuery) => $customerQuery->where('router_id', $this->routerId()));
        }

        return $query;
    }

    /**
     * @return Collection<int, BillingActivityLog>
     */
    public function filterBillingActivityLogs(Collection $logs): Collection
    {
        if (!$this->isScoped()) {
            return $logs;
        }

        $customerNames = Customer::query()
            ->where('router_id', $this->routerId())
            ->pluck('name')
            ->flip();

        return $logs->filter(function (BillingActivityLog $log) use ($customerNames) {
            foreach (['invoices', 'customers'] as $metaKey) {
                $items = $log->meta[$metaKey] ?? [];

                if (!is_array($items) || $items === []) {
                    continue;
                }

                foreach ($items as $item) {
                    $name = $item['customer_name'] ?? null;

                    if ($name !== null && $customerNames->has($name)) {
                        return true;
                    }
                }
            }

            return false;
        })->values();
    }

    /**
     * @return array{node_count: int, total_ports: int, used_ports: int}
     */
    public function odpSummary(): array
    {
        if (!$this->isScoped()) {
            return [
                'node_count' => Odp::query()->count(),
                'total_ports' => (int) Odp::query()->sum('total_ports'),
                'used_ports' => (int) Customer::query()->whereNotNull('odp_id')->count(),
            ];
        }

        $odpQuery = Odp::query()->whereHas(
            'customers',
            fn (Builder $query) => $query->where('router_id', $this->routerId())
        );

        return [
            'node_count' => (clone $odpQuery)->count(),
            'total_ports' => (int) (clone $odpQuery)->sum('total_ports'),
            'used_ports' => (int) Customer::query()
                ->where('router_id', $this->routerId())
                ->whereNotNull('odp_id')
                ->count(),
        ];
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, Odp>
     */
    public function odpsForNetworkMap()
    {
        if (!$this->isScoped()) {
            return Odp::withCount('customers')->get();
        }

        return Odp::query()
            ->whereHas('customers', fn (Builder $query) => $query->where('router_id', $this->routerId()))
            ->withCount(['customers' => fn (Builder $query) => $query->where('router_id', $this->routerId())])
            ->get();
    }
}
