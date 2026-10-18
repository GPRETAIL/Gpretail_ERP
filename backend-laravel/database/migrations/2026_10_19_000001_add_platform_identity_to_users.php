<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('platform_identity', 96)->nullable();
            $table->unique(['platform_company_code', 'platform_identity'], 'users_platform_identity_unique');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropUnique('users_platform_identity_unique');
            $table->dropColumn('platform_identity');
        });
    }
};
