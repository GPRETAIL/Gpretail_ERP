<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Brands
        Schema::create('brands', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('logo')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Categories
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Attribute Types
        Schema::create('attribute_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Attribute Values
        Schema::create('attribute_values', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attribute_type_id')->constrained('attribute_types')->cascadeOnDelete();
            $table->string('name');
            $table->string('value');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Size Groups
        Schema::create('size_groups', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Sizes
        Schema::create('sizes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('size_group_id')->constrained('size_groups')->cascadeOnDelete();
            $table->string('name');
            $table->string('code');
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // Taxes
        Schema::create('taxes', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->decimal('rate', 8, 2)->default(0);
            $table->string('type', 20)->default('EXCLUSIVE'); // EXCLUSIVE, INCLUSIVE, RANGED
            $table->decimal('cgst_rate', 8, 2)->default(0);
            $table->decimal('sgst_rate', 8, 2)->default(0);
            $table->decimal('igst_rate', 8, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Ranged Tax Slabs
        Schema::create('tax_slabs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tax_id')->constrained('taxes')->cascadeOnDelete();
            $table->decimal('min_price', 15, 2)->default(0);
            $table->decimal('max_price', 15, 2)->nullable();
            $table->decimal('rate', 8, 2)->default(0);
            $table->decimal('cgst_rate', 8, 2)->default(0);
            $table->decimal('sgst_rate', 8, 2)->default(0);
            $table->decimal('igst_rate', 8, 2)->default(0);
            $table->timestamps();
        });

        // Suppliers
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('company_name')->nullable();
            $table->string('code')->unique();
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->text('address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('pincode', 20)->nullable();
            $table->string('gstin', 50)->nullable();
            $table->string('pan', 50)->nullable();
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Agents
        Schema::create('agents', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->decimal('commission_rate', 8, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Transports
        Schema::create('transports', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('phone', 50)->nullable();
            $table->string('vehicle_no', 50)->nullable();
            $table->string('contact_person')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Products
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete();
            $table->foreignId('tax_id')->nullable()->constrained('taxes')->nullOnDelete();
            $table->foreignId('size_group_id')->nullable()->constrained('size_groups')->nullOnDelete();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('sku')->nullable()->unique();
            $table->string('barcode')->nullable()->index();
            $table->string('hsn_code', 50)->nullable();
            $table->string('unit', 20)->default('PCS');
            $table->decimal('cost_price', 15, 2)->default(0);
            $table->decimal('selling_price', 15, 2)->default(0);
            $table->decimal('mrp', 15, 2)->default(0);
            $table->integer('min_stock')->default(0);
            $table->integer('max_stock')->default(1000);
            $table->text('description')->nullable();
            $table->string('image')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Product Variants
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('size_id')->nullable()->constrained('sizes')->nullOnDelete();
            $table->string('sku')->unique();
            $table->string('barcode')->unique();
            $table->decimal('cost_price', 15, 2)->default(0);
            $table->decimal('selling_price', 15, 2)->default(0);
            $table->decimal('mrp', 15, 2)->default(0);
            $table->timestamps();
        });

        // System Configurations
        Schema::create('system_configurations', function (Blueprint $table) {
            $table->id();
            $table->string('key')->nullable()->index();
            $table->string('config_key')->nullable()->index();
            $table->longText('value')->nullable();
            $table->longText('config_value')->nullable();
            $table->string('group', 100)->default('general');
            $table->string('group_name', 100)->default('general');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_configurations');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('products');
        Schema::dropIfExists('transports');
        Schema::dropIfExists('agents');
        Schema::dropIfExists('suppliers');
        Schema::dropIfExists('tax_slabs');
        Schema::dropIfExists('taxes');
        Schema::dropIfExists('sizes');
        Schema::dropIfExists('size_groups');
        Schema::dropIfExists('attribute_values');
        Schema::dropIfExists('attribute_types');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('brands');
    }
};
