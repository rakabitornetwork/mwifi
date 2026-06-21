<?php

namespace Tests\Unit;

use App\Models\Setting;
use App\Services\WhatsAppService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class WhatsAppBulkDelayTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        WhatsAppService::resetBulkDelayState();

        Setting::updateOrCreate(['key' => 'whatsapp.enabled'], [
            'group' => 'whatsapp',
            'value' => '1',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'whatsapp.api_url'], [
            'group' => 'whatsapp',
            'value' => 'http://127.0.0.1:3003',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'whatsapp.session_id'], [
            'group' => 'whatsapp',
            'value' => 'mwifi_session',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'whatsapp.bulk_delay_enabled'], [
            'group' => 'whatsapp',
            'value' => '1',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'whatsapp.bulk_delay_seconds'], [
            'group' => 'whatsapp',
            'value' => '1',
            'is_encrypted' => false,
        ]);
        Setting::updateOrCreate(['key' => 'whatsapp.bulk_delay_jitter_seconds'], [
            'group' => 'whatsapp',
            'value' => '0',
            'is_encrypted' => false,
        ]);
    }

    public function test_bulk_delay_waits_between_consecutive_messages(): void
    {
        Http::fake([
            'http://127.0.0.1:3003/send-message' => Http::response(['success' => true], 200),
        ]);

        $start = microtime(true);

        $this->assertTrue(WhatsAppService::sendText('08123456789', 'Pesan pertama'));
        $this->assertTrue(WhatsAppService::sendText('08123456780', 'Pesan kedua'));

        $elapsed = microtime(true) - $start;

        $this->assertGreaterThanOrEqual(0.9, $elapsed);
    }

    public function test_skip_bulk_delay_sends_without_waiting(): void
    {
        Http::fake([
            'http://127.0.0.1:3003/send-message' => Http::response(['success' => true], 200),
        ]);

        WhatsAppService::sendText('08123456789', 'Pesan pertama');
        WhatsAppService::resetBulkDelayState();
        WhatsAppService::sendText('08123456789', 'Pesan pertama');

        $start = microtime(true);
        $this->assertTrue(WhatsAppService::sendText('08123456780', 'Uji', skipBulkDelay: true));
        $elapsed = microtime(true) - $start;

        $this->assertLessThan(0.5, $elapsed);
    }
}
