<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->index('name', 'idx_products_name');
            $table->index('is_active', 'idx_products_is_active');
            $table->index('created_at', 'idx_products_created_at');
            $table->index(['brand_id', 'is_active'], 'idx_products_brand_active');
            $table->index(['category_id', 'is_active'], 'idx_products_category_active');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('idx_products_name');
            $table->dropIndex('idx_products_is_active');
            $table->dropIndex('idx_products_created_at');
            $table->dropIndex('idx_products_brand_active');
            $table->dropIndex('idx_products_category_active');
        });
    }
};
