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

#[Fillable(['name', 'email', 'password', 'profile_title', 'avatar'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

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
}
