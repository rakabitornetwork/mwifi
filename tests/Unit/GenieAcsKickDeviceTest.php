<?php

namespace Tests\Unit;

use App\Services\GenieAcsService;
use PHPUnit\Framework\TestCase;
use ReflectionMethod;

class GenieAcsKickDeviceTest extends TestCase
{
    public function test_normalize_mac_address(): void
    {
        $this->assertSame('AA:BB:CC:DD:EE:FF', GenieAcsService::normalizeMacAddress('aa-bb-cc-dd-ee-ff'));
        $this->assertSame('AA:BB:CC:DD:EE:FF', GenieAcsService::normalizeMacAddress('aabbccddeeff'));
        $this->assertSame('', GenieAcsService::normalizeMacAddress('invalid'));
    }

    public function test_build_kick_parameter_values_uses_zte_wlan_kick_path(): void
    {
        $rawDev = [
            '_id' => '00259E-F660-TEST',
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID' => ['_value' => 'WiFi-Test'],
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_ZTE-COM_KickOffDevice' => [
                '_value' => '',
                '_writable' => true,
            ],
        ];

        $method = new ReflectionMethod(GenieAcsService::class, 'buildKickParameterValues');
        $method->setAccessible(true);

        $values = $method->invoke(null, $rawDev, 'AA:BB:CC:DD:EE:FF', null, null);

        $this->assertCount(1, $values);
        $this->assertSame(
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_ZTE-COM_KickOffDevice',
            $values[0][0]
        );
        $this->assertSame('AA:BB:CC:DD:EE:FF', $values[0][1]);
    }

    public function test_build_kick_parameter_values_uses_wlan_from_association_path(): void
    {
        $rawDev = [
            '_id' => '00259E-F660-TEST',
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID' => ['_value' => 'WiFi-2G'],
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.SSID' => ['_value' => 'WiFi-5G'],
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.X_ZTE-COM_KickOffDevice' => [
                '_value' => '',
                '_writable' => true,
            ],
        ];

        $associationPath = 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.AssociatedDevice.3';

        $method = new ReflectionMethod(GenieAcsService::class, 'buildKickParameterValues');
        $method->setAccessible(true);

        $values = $method->invoke(null, $rawDev, 'AA:BB:CC:DD:EE:FF', $associationPath, null);

        $this->assertCount(1, $values);
        $this->assertSame(
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.2.X_ZTE-COM_KickOffDevice',
            $values[0][0]
        );
    }

    public function test_build_kick_parameter_values_uses_compact_mac_for_kick_sta(): void
    {
        $rawDev = [
            '_id' => '00259E-F660-TEST',
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID' => ['_value' => 'WiFi-Test'],
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_ZTE-COM_KickSta' => [
                '_value' => '',
                '_writable' => true,
            ],
        ];

        $method = new ReflectionMethod(GenieAcsService::class, 'buildKickParameterValues');
        $method->setAccessible(true);

        $values = $method->invoke(null, $rawDev, 'AA:BB:CC:DD:EE:FF', null, null);

        $this->assertCount(1, $values);
        $this->assertSame(
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.X_ZTE-COM_KickSta',
            $values[0][0]
        );
        $this->assertSame('AABBCCDDEEFF', $values[0][1]);
    }

    public function test_device_supports_client_kick_when_wlan_exists(): void
    {
        $rawDev = [
            'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID' => ['_value' => 'WiFi-Test'],
        ];

        $this->assertTrue(GenieAcsService::deviceSupportsClientKick($rawDev));
    }
}
