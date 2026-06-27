<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Http;

$deviceId = '44FB5A-F663NV3A-ZTEGCB746628';
$apiUrl = 'http://192.168.22.253:7557';

try {
    $response = Http::get("{$apiUrl}/devices", [
        'query' => json_encode(['_id' => $deviceId])
    ]);
    
    if ($response->successful()) {
        $data = $response->json();
        if (!empty($data)) {
            $d = $data[0];
            echo "Device ID: " . $d['_id'] . "\n";
            echo "Last Inform: " . ($d['_lastInform'] ?? 'N/A') . "\n";
            echo "Last Boot: " . ($d['_lastBoot'] ?? 'N/A') . "\n";
            
            // Print the tasks count
            $tasksRes = Http::get("{$apiUrl}/tasks", ['query' => json_encode(['device' => $deviceId])]);
            echo "Pending Tasks Count: " . count($tasksRes->json()) . "\n";
        }
    }
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
