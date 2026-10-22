<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sizes', function (Blueprint $table) {
            $table->string('measurement')->nullable();
            $table->string('age_set')->nullable();
            $table->string('uom')->nullable();
            $table->boolean('is_combo_size')->default(false);
            $table->boolean('is_meter_size')->default(false);
            $table->boolean('is_variant')->default(false);
            $table->boolean('is_active')->default(true);
        });
        Schema::table('size_groups', function (Blueprint $table) {
            $table->integer('sort_order')->default(0);
            $table->boolean('enable_size_ratio')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('sizes', fn (Blueprint $table) => $table->dropColumn(['measurement', 'age_set', 'uom', 'is_combo_size', 'is_meter_size', 'is_variant', 'is_active']));
        Schema::table('size_groups', fn (Blueprint $table) => $table->dropColumn(['sort_order', 'enable_size_ratio']));
    }
};
