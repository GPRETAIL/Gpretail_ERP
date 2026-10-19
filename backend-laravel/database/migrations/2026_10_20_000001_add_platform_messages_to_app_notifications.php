<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('app_notifications', function (Blueprint $table) {
            $table->uuid('platform_message_uuid')->nullable()->unique();
            $table->unsignedInteger('platform_revision')->nullable();
            $table->string('platform_company_code', 128)->nullable()->index();
            $table->unsignedBigInteger('platform_store_id')->nullable();
            $table->unsignedBigInteger('platform_warehouse_id')->nullable();
            $table->string('audience', 16)->nullable();
            $table->string('category', 32)->nullable();
            $table->string('priority', 16)->nullable();
            $table->string('platform_action', 32)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
        });
        Schema::create('notification_receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('notification_id')->constrained('app_notifications')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->unique(['notification_id', 'user_id']);
        });
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained('users')->cascadeOnDelete();
            $table->boolean('marketing')->default(false);
            $table->boolean('push_enabled')->default(false);
            $table->unsignedTinyInteger('quiet_start')->default(21);
            $table->unsignedTinyInteger('quiet_end')->default(8);
        });
        Schema::create('platform_notification_syncs', function (Blueprint $table) {
            $table->string('company_code', 128)->primary();
            $table->unsignedBigInteger('cursor')->default(0);
            $table->json('pending_acks')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->string('last_error')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_notification_syncs');
        Schema::dropIfExists('notification_preferences');
        Schema::dropIfExists('notification_receipts');
        Schema::table('app_notifications', function (Blueprint $table) {
            $table->dropUnique(['platform_message_uuid']);
            $table->dropColumn(['platform_message_uuid', 'platform_revision', 'platform_company_code', 'platform_store_id', 'platform_warehouse_id', 'audience', 'category', 'priority', 'platform_action', 'expires_at', 'revoked_at']);
        });
    }
};
