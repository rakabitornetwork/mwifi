<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->date('billing_pause_date')->nullable()->after('billing_resume_date');
            $table->enum('pending_pause_status', ['inactive', 'suspended'])->nullable()->after('billing_pause_date');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['billing_pause_date', 'pending_pause_status']);
        });
    }
};
