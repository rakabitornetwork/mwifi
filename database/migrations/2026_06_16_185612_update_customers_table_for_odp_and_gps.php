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
        Schema::table('customers', function (Blueprint $table) {
            // Hapus kolom lama
            $table->dropColumn(['odp_name', 'gps_coordinates']);
            
            // Tambahkan kolom baru
            $table->foreignId('odp_id')->nullable()->after('package_id')->constrained('odps')->nullOnDelete();
            $table->decimal('latitude', 10, 8)->nullable()->after('address');
            $table->decimal('longitude', 11, 8)->nullable()->after('latitude');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropForeign(['odp_id']);
            $table->dropColumn(['odp_id', 'latitude', 'longitude']);
            $table->string('odp_name', 100)->nullable()->after('address');
            $table->string('gps_coordinates', 100)->nullable()->after('odp_name');
        });
    }
};
