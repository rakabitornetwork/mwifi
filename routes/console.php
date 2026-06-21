<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Otomatisasi Billing & Isolir
Schedule::command('billing:generate')->dailyAt('00:00');
Schedule::command('billing:isolir-check')->hourly();
Schedule::command('bandwidth:sample')->everyFiveMinutes();
