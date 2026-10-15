<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('platform_activations', fn (Blueprint $table) => $table->uuid('deployment_id')->nullable());
        Schema::table('stores', function (Blueprint $table) {
            $table->unsignedBigInteger('platform_store_id')->nullable()->unique();
            $table->boolean('activation_required')->default(false);
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('platform_active_till')->nullable();
            $table->text('platform_licence_token')->nullable();
            $table->json('platform_subscription')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stores', fn (Blueprint $table) => $table->dropColumn(['platform_store_id', 'activation_required', 'activated_at', 'platform_active_till', 'platform_licence_token', 'platform_subscription']));
        Schema::table('platform_activations', fn (Blueprint $table) => $table->dropColumn('deployment_id'));
    }
};
