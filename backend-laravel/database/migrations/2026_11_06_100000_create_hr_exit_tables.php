<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * HRMS phase 3c: exits. A separation (resignation, termination, retirement) with its notice period and exit
 * interview, the employee's relieving date, and the full and final settlement that pays the last salary,
 * leave, gratuity and recoveries in one go.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->date('relieving_date')->nullable()->after('joining_date');
        });

        Schema::create('hr_separations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('type', 12); // RESIGNATION, TERMINATION, RETIREMENT, OTHER
            $table->date('applied_on');
            $table->string('reason', 500)->nullable();
            $table->date('requested_last_day')->nullable();
            $table->date('last_working_day')->nullable();
            $table->unsignedSmallInteger('notice_days')->default(0);
            $table->unsignedSmallInteger('notice_short_days')->default(0);
            $table->boolean('notice_waived')->default(false);
            $table->string('status', 10)->default('REQUESTED'); // REQUESTED, ACCEPTED, REJECTED, WITHDRAWN, RELIEVED, SETTLED
            $table->foreignId('applied_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approver_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->string('decision_note', 255)->nullable();
            $table->json('exit_interview')->nullable();
            $table->foreignId('interviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('interviewed_at')->nullable();
            $table->timestamp('relieved_at')->nullable();
            $table->timestamps();
            $table->index(['store_id', 'status']);
            $table->index(['employee_id', 'status']);
        });

        Schema::create('hr_settlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('separation_id')->unique()->constrained('hr_separations')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->char('month', 7);
            $table->date('last_working_day');
            $table->json('earnings')->nullable();
            $table->json('deductions')->nullable();
            $table->json('encash_days')->nullable(); // leave_type_id => days
            $table->json('adjustments')->nullable(); // [{type: EARNING|DEDUCTION, name, amount}]
            $table->json('summary')->nullable(); // payable days, gratuity years, day rate, leftover loan balance...
            $table->json('links')->nullable(); // claims, encashments, loans paid or recovered here
            $table->decimal('gross', 12, 2)->default(0);
            $table->decimal('total_deductions', 12, 2)->default(0);
            $table->decimal('net', 12, 2)->default(0);
            $table->decimal('employer_pf', 12, 2)->default(0);
            $table->decimal('employer_esi', 12, 2)->default(0);
            $table->string('status', 10)->default('DRAFT'); // DRAFT, SUBMITTED, PAID
            $table->date('paid_on')->nullable();
            $table->string('pay_mode', 6)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            $table->index(['store_id', 'status']);
        });

        Schema::table('hr_loan_recoveries', function (Blueprint $table) {
            $table->foreignId('settlement_id')->nullable()->after('payslip_id')->constrained('hr_settlements')->cascadeOnDelete();
        });
        Schema::table('hr_expense_claims', function (Blueprint $table) {
            $table->foreignId('settlement_id')->nullable()->after('payslip_id')->constrained('hr_settlements')->nullOnDelete();
        });
        Schema::table('hr_leave_encashments', function (Blueprint $table) {
            $table->foreignId('settlement_id')->nullable()->after('payslip_id')->constrained('hr_settlements')->nullOnDelete();
        });
    }

    public function down(): void
    {
        foreach (['hr_leave_encashments', 'hr_expense_claims', 'hr_loan_recoveries'] as $name) {
            Schema::table($name, function (Blueprint $table) {
                $table->dropConstrainedForeignId('settlement_id');
            });
        }
        Schema::dropIfExists('hr_settlements');
        Schema::dropIfExists('hr_separations');
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('relieving_date');
        });
    }
};
