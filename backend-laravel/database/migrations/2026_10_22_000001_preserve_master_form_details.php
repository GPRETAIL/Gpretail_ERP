<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['brands', 'suppliers', 'transports', 'products', 'employees'] as $name) {
            Schema::table($name, function (Blueprint $table): void {
                $table->json('master_details')->nullable();
            });
        }
        foreach (['brands', 'suppliers', 'transports', 'agents', 'taxes', 'system_configurations', 'employees'] as $name) {
            Schema::table($name, function (Blueprint $table): void {
                $table->string('created_by')->nullable();
            });
        }
        Schema::table('system_configurations', function (Blueprint $table): void {
            $table->boolean('is_active')->default(true);
        });
        Schema::table('products', function (Blueprint $table): void {
            $table->foreignId('parent_product_id')->nullable()->constrained('products')->nullOnDelete();
        });
        Schema::table('taxes', function (Blueprint $table): void {
            $table->boolean('is_sales_tax')->default(true);
            $table->boolean('is_purchase_tax')->default(true);
            $table->json('extra_fields')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('taxes', fn (Blueprint $table) => $table->dropColumn(['is_sales_tax', 'is_purchase_tax', 'extra_fields']));
        Schema::table('products', fn (Blueprint $table) => $table->dropConstrainedForeignId('parent_product_id'));
        Schema::table('system_configurations', fn (Blueprint $table) => $table->dropColumn('is_active'));
        foreach (['brands', 'suppliers', 'transports', 'agents', 'taxes', 'system_configurations', 'employees'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->dropColumn('created_by'));
        }
        foreach (['brands', 'suppliers', 'transports', 'products', 'employees'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->dropColumn('master_details'));
        }
    }
};
