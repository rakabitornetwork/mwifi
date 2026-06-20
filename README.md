# mWiFi

**mWiFi** adalah aplikasi manajemen jaringan untuk RT/RW NET, WISP, dan ISP kecil–menengah. Dibangun dengan Laravel 13, Inertia.js, dan React — terintegrasi dengan **Mikrotik RouterOS** untuk operasional harian NOC.

Repositori resmi: [github.com/rakabitornetwork/mwifi](https://github.com/rakabitornetwork/mwifi)

---

## Fitur Utama

| Modul | Keterangan |
|-------|------------|
| **Dashboard NOC** | Ringkasan operasional, monitor resource server |
| **Router Mikrotik** | Koneksi REST API / legacy socket, sync profil PPPoE & Hotspot |
| **Pelanggan PPPoE** | CRUD pelanggan, isolir/aktifkan, portal pelanggan |
| **Paket Internet** | Manajemen profil & harga |
| **Tagihan / Billing** | Invoice otomatis, pembayaran manual/gateway, isolir otomatis |
| **Hotspot** | Generate voucher, penjualan, cetak voucher, sync MAC |
| **Peta Jaringan** | ODP & topologi pelanggan di peta |
| **Pengaturan** | Branding, payment gateway (Tripay/Midtrans), WhatsApp, GenieACS |
| **Database** | Backup, restore, reset data operasional |
| **Update App** | Pembaruan otomatis dari GitHub (via panel admin) |
| **Portal Pelanggan** | Cek tagihan, bayar, cetak invoice |

---

## Persyaratan Server

Disarankan untuk VPS **Ubuntu 22.04 / 24.04 LTS** (Debian 12 juga kompatibel).

| Komponen | Versi minimum |
|----------|---------------|
| PHP | **8.3+** |
| Composer | 2.x |
| Node.js | **20 LTS+** |
| NPM | 10+ |
| Database | **MySQL 8** / MariaDB 10.6+ (disarankan produksi) |
| Web server | Nginx (disarankan) atau Apache |
| Git | 2.x |

### Ekstensi PHP wajib

```
bcmath ctype curl dom fileinfo json mbstring openssl
pdo pdo_mysql tokenizer xml zip gd
```

Untuk backup MySQL via `mysqldump`, pasang juga paket `mysql-client`.

---

## Instalasi Pertama Kali (VPS)

Langkah berikut asumsi VPS baru, login sebagai user dengan akses `sudo`, dan domain/subdomain sudah diarahkan ke IP VPS (mis. `mwifi.domainanda.com`).

Ganti `mwifi.domainanda.com` dan path `/var/www/mwifi` sesuai environment Anda (contoh shared hosting: `~/public_html`).

### Urutan langkah (penting)

Jangan menjalankan `php artisan` sebelum folder `vendor/` ada. Urutan yang benar:

```
1. Clone repo
2. cp .env.example .env  →  edit .env
3. composer install        ← wajib dulu (membuat vendor/)
4. php artisan key:generate
5. npm ci && npm run build
6. php artisan migrate
7. php artisan storage:link
8. Permission + optimasi cache
9. Nginx/Apache + SSL
10. Cron scheduler
```

Cek cepat sebelum `artisan`:

```bash
ls vendor/autoload.php   # harus ada; jika tidak → jalankan composer install
```

---

### 1. Persiapan sistem

```bash
sudo apt update && sudo apt upgrade -y

sudo apt install -y git curl unzip nginx mysql-server \
  php8.3 php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring \
  php8.3-xml php8.3-curl php8.3-zip php8.3-bcmath php8.3-gd \
  php8.3-intl php8.3-sqlite3 mysql-client

# Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verifikasi:

```bash
php -v
composer -V
node -v
npm -v
git --version
```

### 2. Buat database MySQL

```bash
sudo mysql
```

Di prompt MySQL:

```sql
CREATE DATABASE mwifi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mwifi'@'localhost' IDENTIFIED BY 'GANTI_PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON mwifi.* TO 'mwifi'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Clone repositori

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www

git clone https://github.com/rakabitornetwork/mwifi.git
cd mwifi
```

### 4. Salin & edit file `.env`

```bash
cd /var/www/mwifi   # atau cd ~/public_html

cp .env.example .env
nano .env
```

Sesuaikan minimal konfigurasi berikut:

```env
APP_NAME=mWiFi
APP_ENV=production
APP_DEBUG=false
APP_URL=https://mwifi.domainanda.com

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=mwifi
DB_USERNAME=mwifi
DB_PASSWORD=GANTI_PASSWORD_KUAT

SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database
```

> **Belum** jalankan `php artisan` di langkah ini — tunggu sampai `composer install` selesai.

### 5. Install dependensi PHP (Composer)

```bash
cd /var/www/mwifi   # atau cd ~/public_html

composer install --no-dev --optimize-autoloader
```

Jika perintah `composer` tidak ditemukan:

```bash
curl -sS https://getcomposer.org/installer | php
php composer.phar install --no-dev --optimize-autoloader
```

Verifikasi:

```bash
ls vendor/autoload.php
```

Jika file di atas **tidak ada**, semua perintah `php artisan` akan gagal dengan error `vendor/autoload.php: No such file or directory`.

### 6. Generate key & build frontend

Baru setelah `vendor/` ada:

```bash
php artisan key:generate

npm ci
npm run build
```

Jika server **tidak punya Node.js**, build di komputer lokal lalu upload folder `public/build/`:

```bash
# di komputer lokal (setelah git clone)
npm ci && npm run build
# upload public/build/ ke server
```

### 7. Migrasi database

```bash
php artisan migrate --force
```

**Opsi A — Produksi (tanpa data demo):** cukup migrasi, lalu buat admin manual:

```bash
php artisan tinker
```

```php
\App\Models\User::create([
    'name' => 'Super Admin',
    'email' => 'admin@domainanda.com',
    'password' => bcrypt('password-kuat-anda'),
]);
exit
```

**Opsi B — Demo / uji coba:** seed data contoh (router, pelanggan, paket):

```bash
php artisan db:seed --force
```

Akun default setelah seed:

| Peran | Email | Password |
|-------|-------|----------|
| Admin | `admin@mwifi.test` | `gantengmax` |

> **Penting:** ganti password admin segera setelah login pertama.

### 8. Storage & permission

```bash
php artisan storage:link

sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

Pada shared hosting (user `my`, path `~/public_html`), sesuaikan owner dengan user hosting Anda:

```bash
chown -R my:my storage bootstrap/cache
chmod -R 775 storage bootstrap/cache
```

### 9. Optimasi Laravel (produksi)

Jalankan **setelah** `.env` final, `key:generate`, dan `migrate` berhasil:

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
```

### 10. Konfigurasi Nginx

Buat file site:

```bash
sudo nano /etc/nginx/sites-available/mwifi
```

Isi:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name mwifi.domainanda.com;
    root /var/www/mwifi/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;
    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    client_max_body_size 64M;
}
```

Aktifkan site:

```bash
sudo ln -s /etc/nginx/sites-available/mwifi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 11. SSL (HTTPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d mwifi.domainanda.com
```

Pastikan `APP_URL` di `.env` sudah memakai `https://`.

### 12. Scheduler (billing otomatis)

Aplikasi menjalankan:

- `billing:generate` — setiap hari jam **00:00** (generate invoice H-N sebelum jatuh tempo)
- `billing:isolir-check` — **setiap jam** (isolir pelanggan telat bayar)

Tambahkan cron:

```bash
crontab -e
```

Tambahkan baris:

```cron
* * * * * cd /var/www/mwifi && php artisan schedule:run >> /dev/null 2>&1
```

### 13. Queue worker (opsional tapi disarankan)

Jika ada job antrian, jalankan worker via Supervisor.

Buat `/etc/supervisor/conf.d/mwifi-worker.conf`:

```ini
[program:mwifi-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/mwifi/artisan queue:work database --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=www-data
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/mwifi/storage/logs/worker.log
stopwaitsecs=3600
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start mwifi-worker:*
```

### 14. Selesai — uji aplikasi

1. Buka `https://mwifi.domainanda.com/login`
2. Login sebagai admin
3. Masuk menu **Pengaturan** → isi branding, payment, WhatsApp
4. Menu **Router Mikrotik** → tambah router & uji koneksi
5. Health check: `https://mwifi.domainanda.com/up`

---

## Setelah Instalasi

### URL penting

| URL | Fungsi |
|-----|--------|
| `/login` | Login admin |
| `/dashboard` | Dashboard NOC |
| `/customer/dashboard` | Portal pelanggan (setelah login pelanggan) |
| `/api/payment/callback` | Webhook gateway pembayaran (Tripay/Midtrans) |

Daftarkan URL webhook di panel payment gateway Anda.

### Konfigurasi via panel admin

Sebagian besar integrasi dikonfigurasi dari menu **Pengaturan**:

- Identitas & branding (logo, favicon, SEO)
- Payment gateway (Tripay / Midtrans)
- WhatsApp API
- GenieACS (GPON/TR-069)
- Billing (H-N generate, notifikasi admin)

Konfigurasi pembaruan GitHub ada di file `config/update.php` (bukan `.env`).

---

## Pembaruan Aplikasi

### Via panel admin (disarankan)

1. Login admin → menu **Update App**
2. Klik **Cek Pembaruan**
3. Backup database dulu (menu **Database**)
4. Ketik `UPDATE` → jalankan pembaruan

Server harus memiliki Git, Composer, NPM, dan folder aplikasi writable.

### Via terminal manual

```bash
cd /var/www/mwifi

git pull origin main
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan optimize:clear
php artisan optimize
php artisan config:cache
php artisan route:cache
php artisan view:cache

sudo chown -R www-data:www-data storage bootstrap/cache
```

---

## Perintah Artisan Berguna

```bash
# Generate invoice manual (semua pelanggan per periode)
php artisan billing:generate 2026-06

# Generate invoice terjadwal (H-N jatuh tempo)
php artisan billing:generate

# Cek & isolir pelanggan telat bayar
php artisan billing:isolir-check

# Backup database (alternatif CLI — juga tersedia di panel)
# via menu Database di admin panel

# Clear cache
php artisan optimize:clear
```

---

## Struktur Teknologi

- **Backend:** Laravel 13, PHP 8.3
- **Frontend:** React 19, Inertia.js 3, Tailwind CSS 4, Vite 8
- **Router:** RouterOS API (REST & legacy socket)
- **Export:** DomPDF, Maatwebsite Excel

---

## Troubleshooting

### Error `vendor/autoload.php: No such file or directory`

Penyebab: `composer install` belum dijalankan (atau gagal).

```bash
cd /var/www/mwifi   # atau ~/public_html
composer install --no-dev --optimize-autoloader
ls vendor/autoload.php
```

Baru setelah itu:

```bash
php artisan key:generate
```

### Logo / favicon tidak muncul di VPS

Penyebab umum:

1. **File logo belum ada di server** — path tersimpan di database, tapi file tidak ikut ter-upload. Solusi: upload ulang logo dari menu **Pengaturan**, atau salin folder `storage/app/public/branding/` dari komputer lokal ke VPS.

2. **Symlink storage belum dibuat** — jalankan:
   ```bash
   php artisan storage:link
   ls -la public/storage
   ```
   Aplikasi sekarang juga menyajikan logo lewat route `/branding/logo` dan `/branding/favicon` (tidak wajib bergantung symlink).

3. **`APP_URL` salah** — harus match domain HTTPS production, mis. `https://mwifi.domainanda.com`. Lalu:
   ```bash
   php artisan optimize:clear
   php artisan config:cache
   ```

4. **Permission** — pastikan web server bisa baca file:
   ```bash
   chmod -R 775 storage/app/public
   chown -R www-data:www-data storage/app/public
   ```

5. **Cache branding lama** — setelah upload logo:
   ```bash
   php artisan cache:clear
   ```

Uji langsung di browser: `https://domain-anda.com/branding/logo` — jika tampil, logo sudah benar.

### Halaman blank / error 500

```bash
cd /var/www/mwifi
php artisan optimize:clear
tail -f storage/logs/laravel.log
```

Periksa permission `storage/` dan `bootstrap/cache/`.

### Asset CSS/JS tidak load

```bash
npm run build
php artisan optimize:clear
```

Pastikan `APP_URL` benar dan Nginx/Apache `root`/`DocumentRoot` mengarah ke folder **`public/`** (bukan root Laravel).

Contoh shared hosting: jika project di `~/public_html`, arahkan document root ke `~/public_html/public`.

### Billing otomatis tidak jalan

Pastikan cron `schedule:run` aktif:

```bash
php artisan schedule:list
```

### Koneksi Mikrotik gagal

- Pastikan port API (8728 / 8729 SSL / REST) terbuka dari VPS ke router
- Cek kredensial & tipe protokol di menu Router Mikrotik
- Uji koneksi dari tombol **Test Connection** di panel

### Permission denied saat update dari panel

```bash
sudo chown -R www-data:www-data /var/www/mwifi
# atau beri ownership ke user web server + group deploy
```

---

## Keamanan Produksi

- Set `APP_DEBUG=false`
- Ganti semua password default setelah seed
- Gunakan HTTPS
- Batasi akses SSH & firewall (UFW)
- Backup database rutin (menu **Database**)
- Jangan commit file `.env` ke Git

---

## Lisensi

Proyek ini menggunakan framework Laravel yang dilisensikan under [MIT license](https://opensource.org/licenses/MIT).

---

## Kontribusi & Dukungan

- **Issues & update:** [github.com/rakabitornetwork/mwifi](https://github.com/rakabitornetwork/mwifi)
- Fork & pull request dipersilakan untuk perbaikan bug dan peningkatan fitur.
