<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * HRMS phase 2, payroll: salary components and the lines of the existing Salary Structure records, the store's
 * payroll settings (PF, ESI, professional tax, OT, batta), one-off pay, and monthly runs with their payslips.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hr_salary_components', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->string('code', 12);
            $table->string('name', 80);
            $table->string('type', 10); // EARNING, DEDUCTION
            $table->string('statutory', 10)->nullable(); // BASIC, PF, ESI, PT, OT, INCENTIVE, BATTA
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
            $table->unique(['store_id', 'code']);
        });

        // A Salary Structure is an HR Configuration record (hr_departments, configuration_type salary_structure).
        Schema::create('hr_salary_structure_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('structure_id')->constrained('hr_departments')->cascadeOnDelete();
            $table->foreignId('component_id')->constrained('hr_salary_components')->cascadeOnDelete();
            $table->string('calc', 20); // PERCENT_OF_GROSS, PERCENT_OF_BASIC, FIXED, BALANCE
            $table->decimal('value', 12, 2)->default(0);
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('hr_payroll_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->unique()->constrained('stores')->cascadeOnDelete();
            $table->json('settings');
            $table->timestamps();
        });

        Schema::create('hr_additional_pay', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('component_id')->constrained('hr_salary_components')->restrictOnDelete();
            $table->char('month', 7); // YYYY-MM
            $table->decimal('amount', 12, 2);
            $table->string('note', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['store_id', 'month']);
        });

        Schema::create('hr_payroll_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->char('month', 7);
            $table->string('status', 10)->default('DRAFT'); // DRAFT, SUBMITTED, PAID
            $table->unsignedInteger('employees')->default(0);
            $table->decimal('gross', 14, 2)->default(0);
            $table->decimal('deductions', 14, 2)->default(0);
            $table->decimal('net', 14, 2)->default(0);
            $table->decimal('employer_cost', 14, 2)->default(0);
            $table->date('paid_on')->nullable();
            $table->string('pay_mode', 6)->nullable(); // BANK, CASH
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            $table->unique(['store_id', 'month']);
        });

        Schema::create('hr_payslips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('run_id')->constrained('hr_payroll_runs')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->unsignedTinyInteger('days_in_month');
            $table->decimal('payable_days', 5, 1);
            $table->decimal('lop_days', 5, 1);
            $table->decimal('gross_fixed', 12, 2);
            $table->json('earnings');
            $table->json('deductions');
            $table->decimal('gross_earned', 12, 2);
            $table->decimal('total_deductions', 12, 2);
            $table->decimal('net_pay', 12, 2);
            $table->decimal('employer_pf', 12, 2)->default(0);
            $table->decimal('employer_esi', 12, 2)->default(0);
            $table->boolean('held')->default(false);
            $table->json('snapshot'); // name, code, designation, bank, IFSC, UAN, ESI no at the time of the run
            $table->timestamps();
            $table->unique(['run_id', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_payslips');
        Schema::dropIfExists('hr_payroll_runs');
        Schema::dropIfExists('hr_additional_pay');
        Schema::dropIfExists('hr_payroll_settings');
        Schema::dropIfExists('hr_salary_structure_lines');
        Schema::dropIfExists('hr_salary_components');
    }
};
