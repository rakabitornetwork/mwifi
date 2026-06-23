<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 30)->nullable()->after('password');
            $table->boolean('is_active')->default(true)->after('role');
        });

        $customerUserIds = DB::table('customers')->whereNotNull('user_id')->pluck('user_id');

        if ($customerUserIds->isNotEmpty()) {
            DB::table('users')->whereIn('id', $customerUserIds)->update(['role' => null]);
        }

        DB::table('users')
            ->whereNull('role')
            ->update(['role' => 'super_admin']);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'is_active']);
        });
    }
};
