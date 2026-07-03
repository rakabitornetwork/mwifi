#!/usr/bin/env bash
# Jalankan di VPS Virtualmin sebagai root atau sudo:
#   bash vps-diagnose.sh 2>&1 | tee /root/vps-diagnose-$(date +%F-%H%M).log
set -uo pipefail

echo "========================================"
echo " VPS Diagnostic — $(date -Is)"
echo " Hostname: $(hostname -f 2>/dev/null || hostname)"
echo " Uptime:   $(uptime)"
echo "========================================"
echo

section() { echo; echo "=== $1 ==="; }

section "1. Memory & swap"
free -h
echo
swapon --show 2>/dev/null || true
echo
if [ -f /proc/meminfo ]; then
  grep -E '^(MemTotal|MemAvailable|SwapTotal|SwapFree|Cached|Slab|SUnreclaim):' /proc/meminfo
fi

section "2. Top 15 proses by RAM"
ps aux --sort=-%mem | head -16

section "3. Top 15 proses by CPU"
ps aux --sort=-%cpu | head -16

section "4. PHP-FPM / Apache / Nginx"
pgrep -a php-fpm 2>/dev/null | wc -l | xargs -I{} echo "php-fpm processes: {}"
pgrep -a php-fpm 2>/dev/null | head -5 || true
systemctl is-active apache2 nginx php*-fpm 2>/dev/null | paste - - - 2>/dev/null || true
for f in /etc/php/*/fpm/pool.d/www.conf; do
  [ -f "$f" ] && grep -E '^(pm\.|pm =)' "$f" 2>/dev/null | head -6
done

section "5. MySQL/MariaDB"
systemctl is-active mariadb mysql mysqld 2>/dev/null | tr '\n' ' '; echo
mysqladmin -u root status 2>/dev/null || echo "(mysqladmin tidak tersedia / perlu kredensial)"

section "6. Cron Laravel & proses artisan"
pgrep -af 'artisan (schedule:run|bandwidth:sample|billing:|queue:work)' 2>/dev/null || echo "(tidak ada proses artisan aktif)"
echo
echo "Crontab www-data / root yang mengandung artisan:"
(crontab -l 2>/dev/null; crontab -u www-data -l 2>/dev/null; crontab -u $(stat -c '%U' /var/www 2>/dev/null || echo www-data) -l 2>/dev/null) \
  | grep -i artisan || echo "(tidak ditemukan di crontab root/www-data)"

section "7. PM2 / Node (Baileys gateway)"
command -v pm2 >/dev/null && pm2 list 2>/dev/null || echo "(pm2 tidak terpasang)"
pgrep -af 'node.*baileys|node.*gateway' 2>/dev/null || true

section "8. Supervisor queue worker"
command -v supervisorctl >/dev/null && supervisorctl status 2>/dev/null || echo "(supervisor tidak terpasang)"

section "9. Virtualmin — ClamAV / SpamAssassin (sering boros CPU)"
systemctl is-active clamav-daemon clamav-freshclam spamassassin 2>/dev/null | tr '\n' ' '; echo
pgrep -af 'clamd|freshclam|spamd' 2>/dev/null | head -5 || true

section "10. Disk (penuh = hang)"
df -h /
df -h /var 2>/dev/null || true
echo
echo "Log Laravel terbesar (jika ada):"
find /var/www -path '*/storage/logs/laravel.log' -exec ls -lh {} \; 2>/dev/null | head -5
echo
echo "Ukuran /var/log:"
du -sh /var/log 2>/dev/null || true

section "11. OOM killer (kernel membunuh proses karena RAM habis)"
dmesg -T 2>/dev/null | grep -iE 'out of memory|oom|killed process' | tail -20 \
  || journalctl -k --no-pager 2>/dev/null | grep -iE 'out of memory|oom|killed process' | tail -20 \
  || echo "(tidak ada entri OOM / perlu root)"

section "12. Laravel schedule log (jika ada)"
MWIFI=$(find /var/www -maxdepth 3 -name artisan -path '*/mwifi/*' 2>/dev/null | head -1)
if [ -z "$MWIFI" ]; then
  MWIFI=$(find /home -maxdepth 5 -name artisan 2>/dev/null | head -1)
fi
if [ -n "$MWIFI" ]; then
  APP_DIR=$(dirname "$MWIFI")
  echo "mwifi path: $APP_DIR"
  echo "Scheduled tasks:"
  grep -E 'Schedule::|->every|->hourly|->withoutOverlapping' "$APP_DIR/routes/console.php" 2>/dev/null || true
  echo
  echo "Tail laravel.log (50 baris terakhir):"
  tail -50 "$APP_DIR/storage/logs/laravel.log" 2>/dev/null || echo "(log kosong/tidak ada)"
else
  echo "(artisan mwifi tidak ditemukan di /var/www atau /home)"
fi

section "13. Koneksi & load"
ss -s 2>/dev/null || netstat -s 2>/dev/null | head -5
echo
cat /proc/loadavg 2>/dev/null

echo
echo "========================================"
echo " Selesai. Simpan output log ini untuk analisis."
echo "========================================"
