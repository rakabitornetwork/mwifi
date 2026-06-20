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

    /*
    | Token GitHub opsional (Personal Access Token, scope: public_repo).
    | Dipakai hanya jika git fetch gagal dan fallback ke GitHub API.
    | Kosongkan jika tidak diperlukan.
    */
    'github_token' => null,

    'timeout' => 600,

    'allow_dirty_tree' => false,

];
