<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_themes', function (Blueprint $table) {
            $table->id();
            $table->string('company_code')->unique();
            $table->json('config')->nullable();
            $table->json('allowed_store_ids')->nullable();
            $table->timestamps();
        });
        Schema::create('theme_revisions', function (Blueprint $table) {
            $table->id();
            $table->string('scope_key');
            $table->unsignedInteger('revision');
            $table->json('config')->nullable();
            $table->json('allowed_store_ids')->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('operation', 30);
            $table->timestamps();
            $table->unique(['scope_key', 'revision']);
        });
        Schema::create('tenant_theme_presets', function (Blueprint $table) {
            $table->id();
            $table->string('company_code');
            $table->string('name', 60);
            $table->json('config');
            $table->timestamps();
            $table->unique(['company_code', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_theme_presets');
        Schema::dropIfExists('theme_revisions');
        Schema::dropIfExists('tenant_themes');
    }
};
