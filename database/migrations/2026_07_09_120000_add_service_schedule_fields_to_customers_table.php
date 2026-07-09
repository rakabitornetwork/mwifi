<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->boolean('service_schedule_enabled')->default(false)->after('pending_pause_status');
            $table->time('service_schedule_off_at')->nullable()->after('service_schedule_enabled');
            $table->time('service_schedule_on_at')->nullable()->after('service_schedule_off_at');
            $table->boolean('service_schedule_is_off')->default(false)->after('service_schedule_on_at');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn([
                'service_schedule_enabled',
                'service_schedule_off_at',
                'service_schedule_on_at',
                'service_schedule_is_off',
            ]);
        });
    }
};
