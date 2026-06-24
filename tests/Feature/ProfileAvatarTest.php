<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileAvatarTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_load_own_avatar_via_route(): void
    {
        Storage::fake('public');

        $path = UploadedFile::fake()->image('avatar.png')->store('avatars', 'public');

        $user = User::factory()->create([
            'avatar' => $path,
        ]);

        $response = $this->actingAs($user)->get("/profile/avatar/{$user->id}");

        $response->assertOk();
    }

    public function test_avatar_url_includes_user_id(): void
    {
        Storage::fake('public');

        $path = UploadedFile::fake()->image('avatar.png')->store('avatars', 'public');

        $user = User::factory()->create([
            'avatar' => $path,
        ]);

        $url = $user->avatarUrl();

        $this->assertNotNull($url);
        $this->assertStringContainsString("/profile/avatar/{$user->id}", $url);
    }

    public function test_super_admin_can_load_other_staff_avatar(): void
    {
        Storage::fake('public');

        $superAdmin = User::factory()->create(['role' => User::ROLE_SUPER_ADMIN]);
        $technician = User::factory()->create([
            'role' => User::ROLE_TECHNICIAN,
            'avatar' => UploadedFile::fake()->image('tech.png')->store('avatars', 'public'),
        ]);

        $this->actingAs($superAdmin)
            ->get("/profile/avatar/{$technician->id}")
            ->assertOk();
    }

    public function test_staff_cannot_load_other_users_avatar(): void
    {
        Storage::fake('public');

        $technician = User::factory()->create([
            'role' => User::ROLE_TECHNICIAN,
            'avatar' => UploadedFile::fake()->image('tech.png')->store('avatars', 'public'),
        ]);
        $otherTechnician = User::factory()->create([
            'role' => User::ROLE_TECHNICIAN,
            'avatar' => UploadedFile::fake()->image('other.png')->store('avatars', 'public'),
        ]);

        $this->actingAs($technician)
            ->get("/profile/avatar/{$otherTechnician->id}")
            ->assertForbidden();
    }

    public function test_guest_cannot_load_profile_avatar(): void
    {
        $user = User::factory()->create();

        $this->get("/profile/avatar/{$user->id}")->assertRedirect('/login');
    }

    public function test_avatar_route_returns_404_when_file_missing(): void
    {
        Storage::fake('public');

        $user = User::factory()->create([
            'avatar' => 'avatars/missing.png',
        ]);

        $this->actingAs($user)->get("/profile/avatar/{$user->id}")->assertNotFound();
    }
}
