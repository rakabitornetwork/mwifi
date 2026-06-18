<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hotspot_vouchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('router_id')->constrained('routers')->cascadeOnDelete();
            $table->string('username', 50);
            $table->string('password', 50);
            $table->string('mikrotik_profile', 100);
            $table->decimal('price', 10, 2)->default(0);
            $table->string('validity', 50)->nullable();
            $table->enum('status', ['unused', 'sold', 'expired'])->default('unused');
            $table->timestamp('sold_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hotspot_vouchers');
    }
};
