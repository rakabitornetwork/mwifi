<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_advance_ledgers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 30);
            $table->string('counterparty', 150)->nullable();
            $table->string('title', 150);
            $table->decimal('amount', 12, 2);
            $table->date('transaction_date');
            $table->string('payment_method', 50)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('transaction_date');
            $table->index('type');
            $table->index('staff_user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_advance_ledgers');
    }
};
