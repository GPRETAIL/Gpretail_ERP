<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Double-entry books, one set per store. Every bill, return, purchase and payment posts a voucher
 * whose lines debit and credit ledger accounts by equal amounts (see App\Services\Accounting).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ledger_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('name', 150);
            $table->string('group_code', 40); // A key of ChartOfAccounts::GROUPS.
            $table->string('system_key', 40)->nullable(); // Accounts the automatic postings use (cash, sales, output_cgst, ...).
            $table->string('party_type', 20)->nullable(); // supplier | customer | store: one ledger per party.
            $table->unsignedBigInteger('party_id')->nullable();
            $table->decimal('opening_balance', 15, 2)->default(0); // Positive = debit.
            $table->boolean('is_active')->default(true);
            $table->string('notes', 500)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['store_id', 'name']);
            $table->unique(['store_id', 'system_key']);
            $table->unique(['store_id', 'party_type', 'party_id']);
        });

        Schema::create('vouchers', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('voucher_type', 20); // sales, sales_return, receipt, payment, purchase, purchase_return, journal, contra, transfer
            $table->string('voucher_no', 80);
            $table->date('voucher_date');
            // The bill/purchase/payment this was posted from; null for a voucher entered by hand.
            $table->string('source_type', 30)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('reference_no', 100)->nullable();
            $table->string('narration', 500)->nullable();
            $table->decimal('amount', 15, 2)->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['source_type', 'source_id']);
            $table->index(['voucher_date', 'store_id']);
        });

        Schema::create('voucher_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('voucher_id')->constrained('vouchers')->cascadeOnDelete();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignId('ledger_account_id')->constrained('ledger_accounts')->restrictOnDelete();
            $table->date('voucher_date'); // Copied from the voucher so ledgers and balances read one table.
            $table->decimal('debit', 15, 2)->default(0);
            $table->decimal('credit', 15, 2)->default(0);
            $table->string('narration', 255)->nullable();
            $table->index(['ledger_account_id', 'voucher_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('voucher_lines');
        Schema::dropIfExists('vouchers');
        Schema::dropIfExists('ledger_accounts');
    }
};
