<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_bandwidth_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customers')->cascadeOnDelete();
            $table->char('period', 7);
            $table->unsignedBigInteger('upload_bytes')->default(0);
            $table->unsignedBigInteger('download_bytes')->default(0);
            $table->unsignedBigInteger('last_raw_upload')->default(0);
            $table->unsignedBigInteger('last_raw_download')->default(0);
            $table->string('last_source', 32)->nullable();
            $table->timestamp('last_sampled_at')->nullable();
            $table->timestamps();

            $table->unique(['customer_id', 'period']);
            $table->index('period');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_bandwidth_usages');
    }
};
