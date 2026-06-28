<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('hotspot_sales')
            ->where('owner_amount', 0)
            ->where('agent_amount', 0)
            ->update([
                'owner_amount' => DB::raw('price'),
            ]);
    }

    public function down(): void
    {
        // No-op: historical backfill is not reversed.
    }
};
