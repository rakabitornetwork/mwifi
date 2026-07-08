<?php

namespace App\Services;

/**
 * Build RouterOS hotspot user-profile on-login scripts for voucher lifecycle.
 */
class HotspotProfileScriptBuilder
{
    /**
     * On first login: schedule user removal after validity and optionally lock MAC.
     */
    public static function buildOnLoginScript(string $validity, bool $lockMac): string
    {
        $validity = trim($validity) !== '' ? trim($validity) : '1d';

        $removeEvent = '{/ip hotspot user remove [find where name=[/system scheduler get [find] name]];/system scheduler remove [find]}';

        $lockMacBlock = $lockMac
            ? ':if ([:len $mac] > 0) do={'
            . ' :if ([/ip hotspot user get [find where name=$user] mac-address] = "") do={'
            . ' /ip hotspot user set mac-address=$mac [find where name=$user];'
            . ' };'
            . ' };'
            : '';

        return '{'
            . ' :local mac $"mac-address";'
            . ':if ([:len [/system scheduler find where name=$user]] = 0) do={'
            . ' /system scheduler add name=$user disabled=no start-date=[/system clock get date] start-time=[/system clock get time]'
            . ' interval=' . $validity
            . ' on-event=' . $removeEvent
            . ' comment=mwifi;'
            . ' };'
            . $lockMacBlock
            . '}';
    }
}
