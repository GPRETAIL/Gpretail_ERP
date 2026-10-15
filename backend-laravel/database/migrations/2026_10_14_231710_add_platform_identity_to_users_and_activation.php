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
        Schema::table('users', function (Blueprint $table): void {
            $table->string('platform_company_code', 40)->nullable()->index();
            $table->unsignedInteger('platform_password_version')->default(0);
        });
        Schema::table('stores', function (Blueprint $table): void {
            $table->string('platform_company_code', 40)->nullable()->index();
        });
        Schema::table('platform_activations', function (Blueprint $table): void {
            $table->string('tenant_admin_email')->nullable();
            $table->boolean('onboarding_required')->default(false);
            $table->timestamp('first_erp_login_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn(['platform_company_code', 'platform_password_version']));
        Schema::table('stores', fn (Blueprint $table) => $table->dropColumn('platform_company_code'));
        Schema::table('platform_activations', fn (Blueprint $table) => $table->dropColumn(['tenant_admin_email', 'onboarding_required', 'first_erp_login_at']));
    }
};
