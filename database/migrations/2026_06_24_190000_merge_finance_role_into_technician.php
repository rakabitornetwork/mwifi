<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('role', 'finance')->update(['role' => 'technician']);
    }

    public function down(): void
    {
        // Tidak dapat dipulihkan otomatis ke role finance.
    }
};
