<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('store_local_nodes', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id')->unique();
            $table->string('tenant_key', 64)->unique();
            $table->string('sync_token', 64);
            $table->boolean('enabled')->default(false);
            $table->string('local_server_url')->nullable();
            $table->string('advertised_local_server_url')->nullable();
            $table->boolean('local_healthy')->default(false);
            $table->timestamp('last_heartbeat_at')->nullable();
            $table->timestamp('last_health_check_at')->nullable();
            $table->timestamps();

            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_local_nodes');
    }
};
