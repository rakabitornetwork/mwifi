<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hotspot_sales', function (Blueprint $table) {
            $table->foreignId('sold_by_user_id')->nullable()->after('payment_method')->constrained('users')->nullOnDelete();
            $table->decimal('commission_percent', 5, 2)->default(0)->after('sold_by_user_id');
            $table->decimal('agent_amount', 10, 2)->default(0)->after('commission_percent');
            $table->decimal('owner_amount', 10, 2)->default(0)->after('agent_amount');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->decimal('hotspot_commission_percent', 5, 2)->nullable()->after('can_manual_payment');
        });
    }

    public function down(): void
    {
        Schema::table('hotspot_sales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sold_by_user_id');
            $table->dropColumn(['commission_percent', 'agent_amount', 'owner_amount']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('hotspot_commission_percent');
        });
    }
};
