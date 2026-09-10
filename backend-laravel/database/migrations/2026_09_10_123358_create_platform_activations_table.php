<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per deployment: this install's registration with the platform (Gpretail_Admin) and
     * the last configuration it pulled from there (status, entitlement limits, licence). There is
     * exactly one row in practice — a GPRETAIL_ERP deployment belongs to exactly one platform
     * company — but this is a normal table, not a fixed-id singleton, so the id column stays the
     * usual auto-increment primary key.
     */
    public function up(): void
    {
        Schema::create('platform_activations', function (Blueprint $table) {
            $table->id();
            $table->string('company_code')->unique();
            $table->string('client_id')->nullable();
            $table->text('sync_token')->nullable();
            $table->boolean('activated')->default(false);
            $table->string('status')->nullable();
            $table->dateTime('active_till')->nullable();
            $table->json('limits')->nullable();
            $table->json('feature_flags')->nullable();
            $table->string('licence_token', 2000)->nullable();
            $table->string('licence_state', 30)->nullable();
            $table->dateTime('licence_expires_at')->nullable();
            $table->dateTime('licence_grace_until')->nullable();
            $table->dateTime('registered_at')->nullable();
            $table->dateTime('last_synced_at')->nullable();
            $table->text('last_sync_error')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_activations');
    }
};
