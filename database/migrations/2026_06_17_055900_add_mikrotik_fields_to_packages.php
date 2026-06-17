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
            $table->string('local_address', 50)->nullable()->after('mikrotik_profile');
            $table->string('remote_address', 50)->nullable()->after('local_address');
            $table->string('dns_server', 100)->nullable()->after('remote_address');
            $table->string('parent_queue', 100)->nullable()->after('dns_server');
            $table->string('queue_type_rx', 100)->nullable()->after('parent_queue');
            $table->string('queue_type_tx', 100)->nullable()->after('queue_type_rx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('packages', function (Blueprint $table) {
            $table->dropColumn([
                'local_address',
                'remote_address',
                'dns_server',
                'parent_queue',
                'queue_type_rx',
                'queue_type_tx',
            ]);
        });
    }
};
