<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * HRMS phase 1, leave: leave types and policies per store, applications with approval, and a ledger whose sum
 * per employee, leave type and year is the balance (allocations and carry forward credit, approved leave debits).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hr_leave_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->string('code', 10);
            $table->string('name', 80);
            $table->boolean('is_paid')->default(true);
            $table->boolean('allow_half_day')->default(true);
            $table->boolean('carry_forward')->default(false);
            $table->decimal('max_carry_days', 5, 1)->default(0);
            $table->decimal('max_days_per_application', 5, 1)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['store_id', 'code']);
        });

        Schema::create('hr_leave_policies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->string('name', 80);
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        Schema::create('hr_leave_policy_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('policy_id')->constrained('hr_leave_policies')->cascadeOnDelete();
            $table->foreignId('leave_type_id')->constrained('hr_leave_types')->cascadeOnDelete();
            $table->decimal('days_per_year', 5, 1)->default(0);
            $table->timestamps();
            $table->unique(['policy_id', 'leave_type_id']);
        });

        Schema::table('employees', function (Blueprint $table) {
            $table->foreignId('leave_policy_id')->nullable()->constrained('hr_leave_policies')->nullOnDelete();
        });

        Schema::create('hr_leave_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('leave_type_id')->constrained('hr_leave_types')->restrictOnDelete();
            $table->date('from_date');
            $table->date('to_date');
            $table->boolean('half_day')->default(false);
            $table->decimal('days', 5, 1);
            $table->string('reason', 500)->nullable();
            $table->string('status', 12)->default('PENDING'); // PENDING, APPROVED, REJECTED, CANCELLED
            $table->foreignId('applied_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approver_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->string('decision_note', 255)->nullable();
            $table->timestamps();
            $table->index(['employee_id', 'from_date']);
            $table->index(['store_id', 'status']);
        });

        Schema::create('hr_leave_ledger', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('leave_type_id')->constrained('hr_leave_types')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->decimal('days', 6, 1); // + credit, − debit
            $table->string('kind', 15); // ALLOCATION, CARRY_FORWARD, APPLICATION, CANCEL, ADJUSTMENT
            $table->foreignId('leave_application_id')->nullable()->constrained('hr_leave_applications')->nullOnDelete();
            $table->string('note', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['employee_id', 'leave_type_id', 'year']);
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->foreign('leave_application_id')->references('id')->on('hr_leave_applications')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('attendances', fn (Blueprint $table) => $table->dropForeign(['leave_application_id']));
        Schema::dropIfExists('hr_leave_ledger');
        Schema::dropIfExists('hr_leave_applications');
        Schema::table('employees', fn (Blueprint $table) => $table->dropConstrainedForeignId('leave_policy_id'));
        Schema::dropIfExists('hr_leave_policy_items');
        Schema::dropIfExists('hr_leave_policies');
        Schema::dropIfExists('hr_leave_types');
    }
};
