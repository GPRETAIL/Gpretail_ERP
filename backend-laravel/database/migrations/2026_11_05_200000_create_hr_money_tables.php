<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * HRMS phase 3a: salary advances and interest-free staff loans recovered from salary, expense claims (paid with the
 * salary or straight away), and leave encashment paid through payroll.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hr_loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('type', 8); // ADVANCE, LOAN
            $table->decimal('amount', 12, 2);
            $table->unsignedSmallInteger('instalments')->default(1);
            $table->decimal('instalment_amount', 12, 2);
            $table->char('first_month', 7); // YYYY-MM of the first recovery
            $table->json('skip_months')->nullable();
            $table->string('reason', 500)->nullable();
            $table->string('status', 10)->default('REQUESTED'); // REQUESTED, APPROVED, REJECTED, ACTIVE, CLOSED, CANCELLED
            $table->foreignId('applied_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approver_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->string('decision_note', 255)->nullable();
            $table->date('disbursed_on')->nullable();
            $table->string('pay_mode', 6)->nullable(); // CASH, BANK
            $table->foreignId('disbursed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['store_id', 'status']);
            $table->index(['employee_id', 'status']);
        });

        Schema::create('hr_loan_recoveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('loan_id')->constrained('hr_loans')->cascadeOnDelete();
            $table->char('month', 7);
            $table->decimal('amount', 12, 2);
            $table->string('kind', 8); // PAYROLL, MANUAL
            $table->foreignId('payslip_id')->nullable()->constrained('hr_payslips')->cascadeOnDelete();
            $table->date('paid_on')->nullable();
            $table->string('pay_mode', 6)->nullable();
            $table->string('note', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['loan_id', 'month']);
        });

        Schema::create('hr_expense_claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->date('claim_date');
            $table->string('category', 20); // TRAVEL, FUEL, FOOD, STORE_PURCHASE, PHONE, OTHER
            $table->decimal('amount', 12, 2);
            $table->string('description', 500)->nullable();
            $table->string('bill_path', 255)->nullable();
            $table->string('status', 10)->default('PENDING'); // PENDING, APPROVED, REJECTED, PAID, CANCELLED
            $table->string('pay_via', 6)->nullable(); // SALARY, DIRECT
            $table->foreignId('applied_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approver_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->string('decision_note', 255)->nullable();
            $table->date('paid_on')->nullable();
            $table->string('pay_mode', 6)->nullable();
            $table->foreignId('payslip_id')->nullable()->constrained('hr_payslips')->nullOnDelete();
            $table->timestamps();
            $table->index(['store_id', 'status']);
        });

        Schema::create('hr_leave_encashments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('leave_type_id')->constrained('hr_leave_types')->restrictOnDelete();
            $table->decimal('days', 5, 1);
            $table->char('month', 7); // paid in this month's payroll
            $table->string('status', 10)->default('APPROVED'); // APPROVED, PAID, CANCELLED
            $table->decimal('amount', 12, 2)->nullable();
            $table->foreignId('payslip_id')->nullable()->constrained('hr_payslips')->nullOnDelete();
            $table->string('note', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['store_id', 'month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_leave_encashments');
        Schema::dropIfExists('hr_expense_claims');
        Schema::dropIfExists('hr_loan_recoveries');
        Schema::dropIfExists('hr_loans');
    }
};
