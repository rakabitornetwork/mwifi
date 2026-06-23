<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$columns = DB::select('PRAGMA table_info(packages)');
foreach ($columns as $col) {
    echo "Column: {$col->name} ({$col->type})\n";
}
