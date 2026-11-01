<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A sales approval is the request that must be approved before the bill is made (discount, credit sale...).
 * It keeps the exact lines and customer the screen entered; accepting it makes the POS bill (stock out,
 * books posted) and links it here. Saving or rejecting an approval moves no stock.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_approvals', function (Blueprint $table) {
            $table->string('customer_name', 150)->nullable()->after('customer_id');
            $table->string('customer_mobile', 30)->nullable()->after('customer_name');
            $table->unsignedBigInteger('pos_sale_id')->nullable()->after('status');
            $table->unsignedBigInteger('decided_by')->nullable()->after('pos_sale_id');
            $table->timestamp('decided_at')->nullable()->after('decided_by');
        });
        Schema::table('sales_approval_items', function (Blueprint $table) {
            $table->unsignedBigInteger('variant_id')->nullable()->after('product_id');
            $table->unsignedBigInteger('barcode_id')->nullable()->after('variant_id');
            $table->decimal('discount', 14, 2)->default(0)->after('price');
            $table->decimal('tax_rate', 6, 2)->default(0)->after('discount');
        });
    }

    public function down(): void
    {
        Schema::table('sales_approval_items', fn (Blueprint $table) => $table->dropColumn(['variant_id', 'barcode_id', 'discount', 'tax_rate']));
        Schema::table('sales_approvals', fn (Blueprint $table) => $table->dropColumn(['customer_name', 'customer_mobile', 'pos_sale_id', 'decided_by', 'decided_at']));
    }
};
