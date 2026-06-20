<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('billing_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->string('event_type', 32);
            $table->text('message');
            $table->json('meta')->nullable();
            $table->date('run_date');
            $table->timestamps();

            $table->index(['event_type', 'run_date']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('billing_activity_logs');
    }
};
