<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notification_receipts', fn (Blueprint $table) => $table->timestamp('reported_at')->nullable());
    }

    public function down(): void
    {
        Schema::table('notification_receipts', fn (Blueprint $table) => $table->dropColumn('reported_at'));
    }
};
