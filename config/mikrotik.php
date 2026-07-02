<?php

$apiTimeout = (int) env('MIKROTIK_API_TIMEOUT', 25);

return [

    /*
    |--------------------------------------------------------------------------
    | MikroTik API timeouts (seconds)
    |--------------------------------------------------------------------------
    |
    | Router remote / tunnel sering butuh waktu lebih lama. Jika connect timeout
    | (cURL 28 ~15000ms), naikkan MIKROTIK_API_CONNECT_TIMEOUT sama atau lebih
    | besar dari MIKROTIK_API_TIMEOUT.
    |
    */

    'api_timeout' => max(5, $apiTimeout),

    'api_connect_timeout' => max(5, (int) env('MIKROTIK_API_CONNECT_TIMEOUT', $apiTimeout)),

    'api_timeout_long' => max(10, (int) env('MIKROTIK_API_TIMEOUT_LONG', max($apiTimeout + 10, 40))),

    'api_retry_times' => max(1, (int) env('MIKROTIK_API_RETRY_TIMES', 2)),

    'api_retry_sleep_ms' => max(100, (int) env('MIKROTIK_API_RETRY_SLEEP_MS', 1500)),

    'prefer_ipv4' => filter_var(env('MIKROTIK_PREFER_IPV4', true), FILTER_VALIDATE_BOOL),

    'package_profiles_cache_ttl' => max(30, (int) env('MIKROTIK_PACKAGE_PROFILES_CACHE_TTL', 180)),

    'network_map_ont_cache_ttl' => max(10, (int) env('NETWORK_MAP_ONT_CACHE_TTL', 30)),

    'network_map_traffic_cache_ttl' => max(3, (int) env('NETWORK_MAP_TRAFFIC_CACHE_TTL', 8)),

];
