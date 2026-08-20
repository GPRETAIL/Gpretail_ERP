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
        Schema::table('attribute_values', function (Blueprint $table) {
            if (!Schema::hasColumn('attribute_values', 'code')) {
                $table->string('code', 50)->nullable()->after('value');
            }
            if (!Schema::hasColumn('attribute_values', 'sort_order')) {
                $table->integer('sort_order')->default(0)->after('code');
            }
            if (!Schema::hasColumn('attribute_values', 'extra_data')) {
                $table->json('extra_data')->nullable()->after('sort_order');
            }
            if (!Schema::hasColumn('attribute_values', 'company_id')) {
                $table->unsignedBigInteger('company_id')->nullable()->after('extra_data');
            }
            if (!Schema::hasColumn('attribute_values', 'created_by')) {
                $table->string('created_by', 100)->nullable()->after('company_id');
            }
            if (!Schema::hasColumn('attribute_values', 'updated_by')) {
                $table->string('updated_by', 100)->nullable()->after('created_by');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attribute_values', function (Blueprint $table) {
            $table->dropColumn([
                'code',
                'sort_order',
                'extra_data',
                'company_id',
                'created_by',
                'updated_by',
            ]);
        });
    }
};
