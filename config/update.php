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

    /*
    | Jalankan composer install saat update dari menu.
    | false = vendor sudah di-commit atau composer dijalankan manual di server.
    */
    'run_composer_on_update' => false,

    /*
    | Jalankan npm install & npm run build saat update dari menu.
    | false = build dilakukan di lokal (Laragon), public/build di-commit ke Git.
    */
    'run_npm_on_update' => false,

    /*
    | Strategi tarik kode dari GitHub:
    | - hard_reset: fetch + reset --hard origin/{branch} (cocok VPS; abaikan perubahan lokal file Git)
    | - ff_only: git pull --ff-only (gagal jika ada perubahan lokal belum di-commit)
    */
    'pull_strategy' => 'hard_reset',

    'allow_dirty_tree' => false,

];
