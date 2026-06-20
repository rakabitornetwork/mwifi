<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Pembaruan Aplikasi dari GitHub
    |--------------------------------------------------------------------------
    |
    | Konfigurasi sumber pembaruan mWiFi. Ubah nilai di file ini jika memakai
    | fork atau cabang berbeda — tidak perlu variabel di .env.
    |
    */

    'enabled' => true,

    'repository' => 'https://github.com/rakabitornetwork/mwifi.git',

    'branch' => 'main',

    'github_owner' => 'rakabitornetwork',

    'github_repo' => 'mwifi',

    'timeout' => 600,

    'allow_dirty_tree' => false,

];
