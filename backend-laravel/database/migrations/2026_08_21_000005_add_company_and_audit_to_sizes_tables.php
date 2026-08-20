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
        Schema::table('sizes', function (Blueprint $table) {
            if (!Schema::hasColumn('sizes', 'company_id')) {
                $table->unsignedBigInteger('company_id')->nullable()->after('sort_order');
            }
            if (!Schema::hasColumn('sizes', 'created_by')) {
                $table->string('created_by', 100)->nullable()->after('company_id');
            }
            if (!Schema::hasColumn('sizes', 'updated_by')) {
                $table->string('updated_by', 100)->nullable()->after('created_by');
            }
        });

        Schema::table('size_groups', function (Blueprint $table) {
            if (!Schema::hasColumn('size_groups', 'company_id')) {
                $table->unsignedBigInteger('company_id')->nullable()->after('is_active');
            }
            if (!Schema::hasColumn('size_groups', 'created_by')) {
                $table->string('created_by', 100)->nullable()->after('company_id');
            }
            if (!Schema::hasColumn('size_groups', 'updated_by')) {
                $table->string('updated_by', 100)->nullable()->after('created_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sizes', function (Blueprint $table) {
            $table->dropColumn(['company_id', 'created_by', 'updated_by']);
        });

        Schema::table('size_groups', function (Blueprint $table) {
            $table->dropColumn(['company_id', 'created_by', 'updated_by']);
        });
    }
};
