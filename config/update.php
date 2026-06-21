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

    /*
    | Versi fallback jika Git tag tidak tersedia (mis. deploy tanpa .git).
    | Versi aktif diambil otomatis dari Git tag terdekat.
    */
    'app_version' => '1.3',

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

    /*
    | Detik cache status update untuk muat halaman cepat (tanpa git fetch).
    | Refresh penuh (fetch) tetap via tombol "Cek Ulang" atau background check.
    */
    'status_cache_seconds' => 120,

    /*
    | Timeout git fetch / ls-remote saat cek pembaruan (detik).
    */
    'fetch_timeout' => 45,

    /*
    | Path PHP CLI untuk artisan migrate/optimize saat update dari menu.
    | Wajib diisi jika server web memakai PHP-FPM (PHP_BINARY = php-fpm, bukan php).
    | Contoh: /usr/bin/php8.4
    */
    'php_cli_binary' => env('UPDATE_PHP_CLI'),

    /*
    | Cadangkan database otomatis sebelum migrate saat update dari menu.
    | File disimpan permanen di storage/app/backups/pre-update/
    */
    'backup_database_before_update' => true,

    /*
    | Untuk MySQL/MariaDB: buat database salinan baru di server (mis. mwifi_snap_20260621_143000)
    | sehingga database lama tetap ada utuh jika migrasi bermasalah.
    */
    'clone_mysql_database_before_update' => true,

];
