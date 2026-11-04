<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * HRMS phase 3b: income tax on salary. Each employee's regime and tax-saving declarations for a financial year
 * (with proofs HR verifies), and the TDS challans the store deposits.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hr_tax_declarations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->char('fy', 7); // 2026-27
            $table->string('regime', 3)->default('NEW'); // NEW, OLD
            $table->string('status', 10)->default('DRAFT'); // DRAFT, SUBMITTED
            $table->timestamp('submitted_at')->nullable();
            $table->boolean('locked')->default(false);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['employee_id', 'fy']);
            $table->index(['store_id', 'fy']);
        });

        Schema::create('hr_tax_declaration_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('declaration_id')->constrained('hr_tax_declarations')->cascadeOnDelete();
            $table->string('section', 12); // HRA, 80C, 80D, 80CCD1B, 24B, 80E, 80G, OTHER, PREV_SALARY, PREV_TDS, PREV_PT
            $table->string('description', 255)->nullable();
            $table->decimal('declared_amount', 12, 2)->default(0);
            $table->json('details')->nullable(); // HRA: rent_per_month, months, metro, landlord_name, landlord_pan
            $table->string('proof_path')->nullable();
            $table->decimal('proof_amount', 12, 2)->nullable();
            $table->string('proof_status', 10)->default('NONE'); // NONE, SUBMITTED, VERIFIED, REJECTED
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->string('note', 255)->nullable();
            $table->timestamps();
            $table->index(['declaration_id', 'section']);
        });

        Schema::create('hr_tds_challans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->char('fy', 7);
            $table->unsignedTinyInteger('quarter'); // 1 Apr–Jun … 4 Jan–Mar
            $table->json('months'); // YYYY-MM months whose TDS this deposits
            $table->decimal('tax', 12, 2)->default(0);
            $table->decimal('interest', 12, 2)->default(0);
            $table->decimal('fee', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->string('bsr_code', 10);
            $table->string('challan_no', 10);
            $table->date('deposited_on');
            $table->string('pay_mode', 6)->default('BANK');
            $table->string('note', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['store_id', 'fy', 'quarter']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_tds_challans');
        Schema::dropIfExists('hr_tax_declaration_items');
        Schema::dropIfExists('hr_tax_declarations');
    }
};
