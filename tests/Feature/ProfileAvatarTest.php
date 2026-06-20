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

    public function test_authenticated_user_can_load_avatar_via_route(): void
    {
        Storage::fake('public');

        $path = UploadedFile::fake()->image('avatar.png')->store('avatars', 'public');

        $user = User::factory()->create([
            'avatar' => $path,
        ]);

        $response = $this->actingAs($user)->get('/profile/avatar');

        $response->assertOk();
    }

    public function test_avatar_url_uses_profile_route(): void
    {
        Storage::fake('public');

        $path = UploadedFile::fake()->image('avatar.png')->store('avatars', 'public');

        $user = User::factory()->create([
            'avatar' => $path,
        ]);

        $url = $user->avatarUrl();

        $this->assertNotNull($url);
        $this->assertStringContainsString('/profile/avatar', $url);
    }

    public function test_guest_cannot_load_profile_avatar(): void
    {
        $this->get('/profile/avatar')->assertRedirect('/login');
    }

    public function test_avatar_route_returns_404_when_file_missing(): void
    {
        Storage::fake('public');

        $user = User::factory()->create([
            'avatar' => 'avatars/missing.png',
        ]);

        $this->actingAs($user)->get('/profile/avatar')->assertNotFound();
    }
}
