<?php

return [

    /*
    |--------------------------------------------------------------------------
    | MikroTik API timeouts (seconds)
    |--------------------------------------------------------------------------
    |
    | Router remote / tunnel (contoh: tunnel.my.id) sering butuh waktu lebih
    | lama daripada koneksi LAN. Naikkan MIKROTIK_API_TIMEOUT jika sync gagal
    | dengan cURL error 28 (connection timed out).
    |
    */

    'api_timeout' => (int) env('MIKROTIK_API_TIMEOUT', 20),

    'api_connect_timeout' => (int) env('MIKROTIK_API_CONNECT_TIMEOUT', 15),

    'api_timeout_long' => (int) env('MIKROTIK_API_TIMEOUT_LONG', 35),

];
