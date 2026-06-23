<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('packages', function (Blueprint $table) {
            $table->foreignId('router_id')
                ->nullable()
                ->after('id')
                ->constrained('routers')
                ->nullOnDelete();

            $table->index(['router_id', 'mikrotik_profile']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('packages', function (Blueprint $table) {
            $table->dropForeign(['router_id']);
            $table->dropIndex(['router_id', 'mikrotik_profile']);
            $table->dropColumn('router_id');
        });
    }
};
