<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->date('billing_due_date')->nullable()->after('billing_date');
        });

        DB::table('customers')->orderBy('id')->each(function (object $customer): void {
            $day = max(1, min(31, (int) $customer->billing_date));
            $reference = $customer->service_start_date
                ?? ($customer->created_at ? substr((string) $customer->created_at, 0, 10) : now()->toDateString());

            $dueDate = Carbon::parse($reference)
                ->setUnitNoOverflow('day', $day, 'month')
                ->format('Y-m-d');

            DB::table('customers')->where('id', $customer->id)->update([
                'billing_due_date' => $dueDate,
            ]);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('billing_date');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->date('billing_date')->nullable()->after('status');
        });

        DB::table('customers')->orderBy('id')->each(function (object $customer): void {
            DB::table('customers')->where('id', $customer->id)->update([
                'billing_date' => $customer->billing_due_date,
            ]);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('billing_due_date');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->unsignedTinyInteger('billing_day')->nullable()->after('billing_date');
        });

        DB::table('customers')->orderBy('id')->each(function (object $customer): void {
            $day = 1;
            if ($customer->billing_date) {
                $day = max(1, min(31, (int) Carbon::parse($customer->billing_date)->format('j')));
            }

            DB::table('customers')->where('id', $customer->id)->update([
                'billing_day' => $day,
            ]);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('billing_date');
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->integer('billing_date')->default(1)->after('status');
        });

        DB::table('customers')->orderBy('id')->each(function (object $customer): void {
            DB::table('customers')->where('id', $customer->id)->update([
                'billing_date' => $customer->billing_day ?? 1,
            ]);
        });

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn('billing_day');
        });
    }
};
