<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Assign a Counter" (POS Sales/POS Old) never actually persisted the
 * chosen counter anywhere - AuthController::counter() just echoed back
 * whatever counterId the frontend sent, so it reset on every login/reload
 * and the dialog reappeared every time. Gives it somewhere real to live.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'counter_id')) {
                $table->unsignedBigInteger('counter_id')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'counter_id')) {
                $table->dropColumn('counter_id');
            }
        });
    }
};
