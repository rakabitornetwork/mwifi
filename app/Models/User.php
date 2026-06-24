<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Services\SettingService;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;

#[Fillable(['name', 'email', 'password', 'profile_title', 'avatar', 'role', 'is_active', 'assigned_router_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public const ROLE_SUPER_ADMIN = 'super_admin';

    public const ROLE_ADMIN = 'admin';

    public const ROLE_TECHNICIAN = 'technician';

    public const ROLE_OPERATOR = 'operator';

    /** Role legacy — digabung ke teknisi (read-only). */
    public const ROLE_FINANCE = 'finance';

    public const ROLES = [
        self::ROLE_SUPER_ADMIN => [
            'label' => 'Super Admin',
            'description' => 'Akses penuh: user, database, update, dan semua menu operasional.',
        ],
        self::ROLE_ADMIN => [
            'label' => 'Administrator',
            'description' => 'Kelola operasional harian, pengaturan, dan integrasi (tanpa database/update/user).',
        ],
        self::ROLE_TECHNICIAN => [
            'label' => 'Teknisi Lapangan',
            'description' => 'Lihat data satu router Mikrotik (pelanggan, paket, tagihan, peta). Tidak dapat mengubah atau menghapus.',
        ],
        self::ROLE_OPERATOR => [
            'label' => 'Operator Hotspot',
            'description' => 'Pelanggan, voucher hotspot, dan tagihan dasar.',
        ],
    ];

    /** @var list<string> */
    public const READ_ONLY_ROLES = [
        self::ROLE_TECHNICIAN,
        self::ROLE_FINANCE,
    ];

    /** @var array<string, list<string>> */
    public const TAB_PERMISSIONS = [
        self::ROLE_SUPER_ADMIN => ['*'],
        self::ROLE_ADMIN => [
            'dashboard', 'routers', 'network-map', 'packages', 'customers', 'hotspot',
            'invoices', 'inventory', 'messaging', 'settings', 'profile',
        ],
        self::ROLE_TECHNICIAN => [
            'dashboard', 'routers', 'network-map', 'packages', 'customers', 'inventory',
            'invoices', 'profile',
        ],
        self::ROLE_FINANCE => [
            'dashboard', 'routers', 'network-map', 'packages', 'customers', 'inventory',
            'invoices', 'profile',
        ],
        self::ROLE_OPERATOR => [
            'dashboard', 'customers', 'hotspot', 'invoices', 'profile',
        ],
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function avatarUrl(): ?string
    {
        if (!$this->avatar || SettingService::isBrokenUploadPath($this->avatar)) {
            return null;
        }

        if (!Storage::disk('public')->exists($this->avatar)) {
            return null;
        }

        $version = $this->updated_at?->timestamp ?? time();

        return route('profile.avatar') . '?v=' . $version;
    }

    public function initials(): string
    {
        $words = preg_split('/\s+/', trim($this->name)) ?: [];
        $initials = '';

        foreach (array_slice($words, 0, 2) as $word) {
            $initials .= mb_strtoupper(mb_substr($word, 0, 1));
        }

        return $initials ?: '?';
    }

    public function customer(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Customer::class);
    }

    public function assignedRouter(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Router::class, 'assigned_router_id');
    }

    public function isRouterScoped(): bool
    {
        return $this->role === self::ROLE_TECHNICIAN && $this->assigned_router_id !== null;
    }

    public function canAccessRouter(?int $routerId): bool
    {
        if (!$this->isRouterScoped()) {
            return true;
        }

        return $routerId !== null && (int) $this->assigned_router_id === (int) $routerId;
    }

    public function isStaff(): bool
    {
        return $this->role !== null && !$this->customer()->exists();
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === self::ROLE_SUPER_ADMIN;
    }

    public function canManageUsers(): bool
    {
        return $this->isSuperAdmin();
    }

    public function isReadOnly(): bool
    {
        return in_array($this->role, self::READ_ONLY_ROLES, true);
    }

    public function canWriteData(): bool
    {
        return $this->isStaff() && !$this->isReadOnly();
    }

    public function roleLabel(): string
    {
        if ($this->role === self::ROLE_FINANCE) {
            return self::ROLES[self::ROLE_TECHNICIAN]['label'] . ' (Legacy)';
        }

        return self::ROLES[$this->role]['label'] ?? ucfirst(str_replace('_', ' ', (string) $this->role));
    }

    public function roleDescription(): string
    {
        if ($this->role === self::ROLE_FINANCE) {
            return self::ROLES[self::ROLE_TECHNICIAN]['description'];
        }

        return self::ROLES[$this->role]['description'] ?? '';
    }

    /**
     * @return list<string>
     */
    public function allowedTabs(): array
    {
        $role = $this->role;
        $permissions = self::TAB_PERMISSIONS[$role] ?? [];

        if (in_array('*', $permissions, true)) {
            return [
                'dashboard', 'routers', 'network-map', 'packages', 'customers', 'hotspot',
                'invoices', 'inventory', 'messaging', 'settings', 'database', 'update',
                'users', 'profile',
            ];
        }

        return array_values(array_unique([...$permissions, 'profile']));
    }

    public function canAccessTab(string $tab): bool
    {
        if ($tab === 'profile') {
            return $this->isStaff();
        }

        return in_array($tab, $this->allowedTabs(), true);
    }

    /**
     * @return array<string, array{label: string, description: string, tabs: list<string>}>
     */
    public static function roleCatalog(): array
    {
        return collect(self::ROLES)
            ->map(function (array $meta, string $key) {
                $tabs = self::TAB_PERMISSIONS[$key] ?? [];
                if (in_array('*', $tabs, true)) {
                    $tabs = (new self(['role' => $key]))->allowedTabs();
                }

                return [
                    'label' => $meta['label'],
                    'description' => $meta['description'],
                    'tabs' => array_values(array_filter($tabs, fn ($tab) => $tab !== 'profile')),
                ];
            })
            ->all();
    }

    public static function assignableRoles(?User $actor = null): array
    {
        $roles = self::ROLES;

        if ($actor && !$actor->isSuperAdmin()) {
            unset($roles[self::ROLE_SUPER_ADMIN]);
        }

        return $roles;
    }
}
