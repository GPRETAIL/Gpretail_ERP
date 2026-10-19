<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->uuid('device_id');
            $table->unsignedBigInteger('token_id');
            $table->timestamps();
            $table->unique(['user_id', 'device_id']);
        });
        Schema::table('notification_preferences', function (Blueprint $table) {
            $table->string('timezone', 64)->default('UTC');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_devices');
        Schema::table('notification_preferences', fn (Blueprint $table) => $table->dropColumn('timezone'));
    }
};
