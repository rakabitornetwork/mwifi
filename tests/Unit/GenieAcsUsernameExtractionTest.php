<?php

namespace Tests\Unit;

use App\Services\GenieAcsService;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

class GenieAcsUsernameExtractionTest extends TestCase
{
    private function extractUsername(array $rawDev): string
    {
        $method = new ReflectionMethod(GenieAcsService::class, 'extractUsername');
        $method->setAccessible(true);

        return $method->invoke(null, $rawDev);
    }

    public function test_extracts_username_from_late_wan_connection_device_index(): void
    {
        $rawDev = [
            'InternetGatewayDevice' => [
                'WANDevice' => [
                    '1' => [
                        'WANConnectionDevice' => [
                            '1' => [
                                'WANPPPConnection' => [
                                    '1' => [
                                        'Username' => ['_value' => 'blank', '_type' => 'xsd:string'],
                                    ],
                                ],
                            ],
                            '3' => [
                                'WANPPPConnection' => [
                                    '1' => [
                                        'Username' => ['_value' => 'supri@kulcim', '_type' => 'xsd:string'],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $this->assertSame('supri@kulcim', $this->extractUsername($rawDev));
    }

    public function test_ignores_blank_placeholder_usernames(): void
    {
        $rawDev = [
            'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.1.WANPPPConnection.1.Username' => [
                '_value' => 'blank',
            ],
            'InternetGatewayDevice.WANDevice.1.WANConnectionDevice.3.WANPPPConnection.1.Username' => [
                '_value' => 'supri@kulcim',
            ],
        ];

        $this->assertSame('supri@kulcim', $this->extractUsername($rawDev));
    }

    public function test_extracts_username_from_virtual_parameters_pppoe_username2(): void
    {
        $rawDev = [
            'VirtualParameters.pppoeUsername' => ['_value' => 'blank'],
            'VirtualParameters.pppoeUsername2' => ['_value' => 'agus@anjun'],
        ];

        $this->assertSame('agus@anjun', $this->extractUsername($rawDev));
    }

    public function test_username_matches_full_email_case_insensitive(): void
    {
        $matches = new ReflectionMethod(GenieAcsService::class, 'usernameMatches');
        $matches->setAccessible(true);

        $this->assertTrue($matches->invoke(null, 'Agus@Anjun', 'agus@anjun'));
        $this->assertTrue($matches->invoke(null, 'agus@anjun', 'agus'));
    }

    public function test_device_is_online_follows_last_inform_threshold(): void
    {
        $this->assertTrue(GenieAcsService::deviceIsOnline([
            '_lastInform' => gmdate('c', time() - 60),
        ]));
        $this->assertFalse(GenieAcsService::deviceIsOnline([
            '_lastInform' => gmdate('c', time() - 600),
        ]));
        $this->assertFalse(GenieAcsService::deviceIsOnline(null));
    }

    public function test_device_id_double_encoding_preserves_literal_percent_sequences(): void
    {
        $encode = new ReflectionMethod(GenieAcsService::class, 'doubleUrlEncodeDeviceId');
        $encode->setAccessible(true);

        $deviceId = '2400FA-XS%20tech-CMHI2520F12D';
        $this->assertSame(
            rawurlencode(rawurlencode($deviceId)),
            $encode->invoke(null, $deviceId)
        );
        $this->assertSame('2400FA-XS%252520tech-CMHI2520F12D', $encode->invoke(null, $deviceId));
    }

    /**
     * @param array<string, mixed> $rawDev
     * @return list<array{0:string,1:string,2?:string}>
     */
    private function buildWifiParameterValues(array $rawDev, ?string $ssid, ?string $password): array
    {
        $method = new ReflectionMethod(GenieAcsService::class, 'buildWifiParameterValues');
        $method->setAccessible(true);

        return $method->invoke(null, $rawDev, $ssid, $password);
    }

    public function test_password_written_to_all_writable_password_paths(): void
    {
        $base = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1';
        $rawDev = [
            "{$base}.Enable" => ['_value' => 'true', '_writable' => true],
            "{$base}.SSID" => ['_value' => 'OLD', '_writable' => true],
            "{$base}.BeaconType" => ['_value' => 'WPA/WPA2', '_writable' => true],
            "{$base}.PreSharedKey.1.KeyPassphrase" => ['_value' => '', '_writable' => true],
            "{$base}.KeyPassphrase" => ['_value' => '', '_writable' => true],
            "{$base}.PreSharedKey.1.PreSharedKey" => ['_value' => '', '_writable' => true],
        ];

        $params = $this->buildWifiParameterValues($rawDev, null, 'secret123');
        $paths = array_map(static fn ($p) => $p[0], $params);

        $this->assertContains("{$base}.PreSharedKey.1.KeyPassphrase", $paths);
        $this->assertContains("{$base}.KeyPassphrase", $paths);
        $this->assertContains("{$base}.PreSharedKey.1.PreSharedKey", $paths);

        foreach ($params as $p) {
            if (str_contains($p[0], 'Passphrase') || str_ends_with($p[0], 'PreSharedKey')) {
                $this->assertSame('secret123', $p[1]);
            }
        }
    }

    public function test_password_falls_back_when_no_writable_paths_detected(): void
    {
        $base = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1';
        $rawDev = [
            "{$base}.Enable" => ['_value' => 'true', '_writable' => true],
            "{$base}.SSID" => ['_value' => 'OLD', '_writable' => true],
        ];

        $params = $this->buildWifiParameterValues($rawDev, null, 'secret123');
        $paths = array_map(static fn ($p) => $p[0], $params);

        $this->assertContains("{$base}.PreSharedKey.1.KeyPassphrase", $paths);
        $this->assertContains("{$base}.KeyPassphrase", $paths);
    }
}
