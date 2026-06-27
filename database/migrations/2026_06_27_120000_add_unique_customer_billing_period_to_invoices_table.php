<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $duplicateGroups = DB::table('invoices')
            ->select('customer_id', 'billing_period', DB::raw('MIN(id) as keep_id'))
            ->groupBy('customer_id', 'billing_period')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($duplicateGroups as $group) {
            DB::table('invoices')
                ->where('customer_id', $group->customer_id)
                ->where('billing_period', $group->billing_period)
                ->where('id', '!=', $group->keep_id)
                ->delete();
        }

        Schema::table('invoices', function (Blueprint $table) {
            $table->unique(['customer_id', 'billing_period'], 'invoices_customer_period_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropUnique('invoices_customer_period_unique');
        });
    }
};
