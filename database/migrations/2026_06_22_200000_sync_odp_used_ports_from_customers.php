<?php

use App\Models\Odp;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    public function up(): void
    {
        Odp::query()->each(fn (Odp $odp) => $odp->syncUsedPorts());
    }

    public function down(): void
    {
        // Tidak ada rollback — used_ports akan disinkronkan ulang saat pelanggan diubah.
    }
};
