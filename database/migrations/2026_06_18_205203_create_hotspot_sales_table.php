<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hotspot_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('router_id')->constrained('routers')->cascadeOnDelete();
            $table->string('username', 50);
            $table->string('package_name', 100);
            $table->decimal('price', 10, 2);
            $table->string('payment_method', 50)->default('cash');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hotspot_sales');
    }
};
