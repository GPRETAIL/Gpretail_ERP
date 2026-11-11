<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Staff app: employees sign in to the separate employee app (/hr) with their mobile number and a PIN that
 * HR sets and the employee changes on first sign-in.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->boolean('app_access')->default(false)->after('is_active');
            $table->string('app_pin')->nullable()->after('app_access');
            $table->boolean('app_pin_must_change')->default(true)->after('app_pin');
            $table->timestamp('app_pin_set_at')->nullable()->after('app_pin_must_change');
            $table->timestamp('app_last_login_at')->nullable()->after('app_pin_set_at');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['app_access', 'app_pin', 'app_pin_must_change', 'app_pin_set_at', 'app_last_login_at']);
        });
    }
};
