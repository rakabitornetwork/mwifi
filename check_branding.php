<?php

require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$settings = App\Models\Setting::whereIn('key', ['system.logo', 'system.favicon'])->pluck('value', 'key');
echo "Logo/Favicon settings:\n";
print_r($settings->toArray());

$branding = App\Services\BrandingService::get();
echo "\nlogo_url: " . ($branding['logo_url'] ?? 'null') . "\n";
echo "favicon_url: " . ($branding['favicon_url'] ?? 'null') . "\n";

$link = public_path('storage');
echo "\npublic/storage is link: " . (is_link($link) ? 'yes' : 'no') . "\n";
