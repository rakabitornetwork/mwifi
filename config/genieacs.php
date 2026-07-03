<?php

return [

    /*
    |--------------------------------------------------------------------------
    | GenieACS HTTP timeouts (seconds)
    |--------------------------------------------------------------------------
    |
    | VPS kecil mudah kehabisan PHP-FPM worker jika task GenieACS menunggu
    | connection_request terlalu lama. Gunakan timeout pendek; task tetap
    | terantre di GenieACS meski tanpa connection_request.
    |
    */

    'api_timeout' => max(5, (int) env('GENIEACS_API_TIMEOUT', 10)),

    'probe_timeout' => max(5, (int) env('GENIEACS_PROBE_TIMEOUT', 12)),

    'probe_connection_timeout' => max(3, (int) env('GENIEACS_PROBE_CONNECTION_TIMEOUT', 8)),

    'task_timeout' => max(5, (int) env('GENIEACS_TASK_TIMEOUT', 15)),

    'wifi_refresh_timeout' => max(5, (int) env('GENIEACS_WIFI_REFRESH_TIMEOUT', 20)),

];
