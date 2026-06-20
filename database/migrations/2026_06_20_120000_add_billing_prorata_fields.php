<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->date('service_start_date')->nullable()->after('billing_date');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->unsignedTinyInteger('days_billed')->nullable()->after('amount');
            $table->boolean('is_prorated')->default(false)->after('days_billed');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('service_start_date');
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['days_billed', 'is_prorated']);
        });
    }
};
