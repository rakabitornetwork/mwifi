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
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('router_id')->constrained('routers')->cascadeOnDelete();
            $table->foreignId('package_id')->nullable()->constrained('packages')->nullOnDelete();
            $table->enum('service_type', ['pppoe', 'hotspot']);
            $table->string('username', 100);
            $table->string('password', 100);
            $table->string('name', 150);
            $table->string('phone_number', 20);
            $table->text('address');
            $table->string('odp_name', 100)->nullable();
            $table->string('gps_coordinates', 100)->nullable();
            $table->enum('status', ['active', 'isolated', 'inactive', 'suspended'])->default('active');
            $table->integer('billing_date')->default(1);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
