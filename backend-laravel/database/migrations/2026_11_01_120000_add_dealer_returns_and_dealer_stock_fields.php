<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Dealer invoices now move stock (per variant) and can be cancelled, and dealer returns are their own
 * documents: stock comes back in and the sale is reversed in the books (they used to be saved as invoices).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dealer_invoices', function (Blueprint $table) {
            $table->decimal('discount_amount', 14, 2)->default(0)->after('subtotal');
            $table->decimal('other_charges', 14, 2)->default(0)->after('tax_amount');
            $table->string('so_no', 80)->nullable()->after('invoice_date');
            $table->string('remarks', 500)->nullable()->after('status');
            $table->timestamp('cancelled_at')->nullable()->after('remarks');
            $table->unsignedBigInteger('cancelled_by')->nullable()->after('cancelled_at');
        });
        Schema::table('dealer_invoice_items', function (Blueprint $table) {
            $table->unsignedBigInteger('variant_id')->nullable()->after('product_id');
            $table->unsignedBigInteger('barcode_id')->nullable()->after('variant_id');
            $table->decimal('discount', 14, 2)->default(0)->after('price');
        });

        Schema::create('dealer_invoice_returns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('return_no', 80);
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('dealer_invoice_id')->nullable()->constrained('dealer_invoices')->nullOnDelete();
            $table->date('return_date');
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('discount_amount', 14, 2)->default(0);
            $table->decimal('tax_amount', 14, 2)->default(0);
            $table->decimal('other_charges', 14, 2)->default(0);
            $table->decimal('grand_total', 14, 2)->default(0);
            $table->string('status', 20)->default('COMPLETED');
            $table->string('remarks', 500)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->unique(['store_id', 'return_no']);
        });
        Schema::create('dealer_invoice_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dealer_invoice_return_id')->constrained('dealer_invoice_returns')->cascadeOnDelete();
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('variant_id')->nullable();
            $table->unsignedBigInteger('barcode_id')->nullable();
            $table->decimal('quantity', 14, 3);
            $table->decimal('price', 14, 2)->default(0);
            $table->decimal('discount', 14, 2)->default(0);
            $table->decimal('tax_amount', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dealer_invoice_return_items');
        Schema::dropIfExists('dealer_invoice_returns');
        Schema::table('dealer_invoice_items', fn (Blueprint $table) => $table->dropColumn(['variant_id', 'barcode_id', 'discount']));
        Schema::table('dealer_invoices', fn (Blueprint $table) => $table->dropColumn(['discount_amount', 'other_charges', 'so_no', 'remarks', 'cancelled_at', 'cancelled_by']));
    }
};
