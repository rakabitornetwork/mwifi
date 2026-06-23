<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('sku', 100)->nullable();
            $table->string('category', 50)->default('other');
            $table->unsignedInteger('quantity')->default(0);
            $table->string('unit', 30)->default('pcs');
            $table->unsignedInteger('min_stock')->default(0);
            $table->string('location')->nullable();
            $table->string('condition', 30)->default('new');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['category', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};
