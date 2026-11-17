<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Finance > Opening Balance: bills customers and suppliers owed when the store started using the books
 * (bill by bill, so they can be collected or paid like any other bill). Supplier payments can now settle
 * direct purchases and these opening bills too, not only purchase invoices.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opening_bills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('party_type', 16); // customer | supplier
            $table->unsignedBigInteger('party_id');
            $table->string('bill_no', 60);
            $table->date('bill_date');
            $table->date('due_date')->nullable();
            $table->decimal('amount', 15, 2);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->string('notes', 500)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->unique(['store_id', 'party_type', 'party_id', 'bill_no']);
            $table->index(['store_id', 'party_type', 'party_id']);
        });

        Schema::table('supplier_payment_items', function (Blueprint $table) {
            $table->unsignedBigInteger('direct_purchase_id')->nullable()->index()->after('purchase_invoice_id');
            $table->unsignedBigInteger('opening_bill_id')->nullable()->index()->after('direct_purchase_id');
        });
        Schema::table('supplier_payments', function (Blueprint $table) {
            $table->date('cheque_date')->nullable()->after('reference_no');
        });
    }

    public function down(): void
    {
        Schema::table('supplier_payments', fn (Blueprint $table) => $table->dropColumn('cheque_date'));
        Schema::table('supplier_payment_items', function (Blueprint $table) {
            $table->dropIndex(['direct_purchase_id']);
            $table->dropIndex(['opening_bill_id']);
            $table->dropColumn(['direct_purchase_id', 'opening_bill_id']);
        });
        Schema::dropIfExists('opening_bills');
    }
};
