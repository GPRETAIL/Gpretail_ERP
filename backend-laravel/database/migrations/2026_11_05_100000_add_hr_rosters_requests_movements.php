<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * HRMS phase 2b: a shift roster that overrides an employee's shift and weekly off by date, employee requests
 * (fix a day's attendance, change a shift) with approval, overtime approval on each day, and dated
 * promotions, transfers and salary revisions.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hr_shift_roster', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->date('date');
            $table->foreignId('working_hour_id')->nullable()->constrained('hr_departments')->nullOnDelete();
            $table->boolean('is_off')->default(false);
            $table->string('source', 10)->default('ROSTER'); // ROSTER, REQUEST
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['employee_id', 'date']);
            $table->index(['store_id', 'date']);
        });

        Schema::create('hr_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('type', 12); // ATTENDANCE, SHIFT
            $table->date('from_date');
            $table->date('to_date');
            $table->json('payload'); // ATTENDANCE: check_in, check_out, status; SHIFT: working_hour_id or is_off
            $table->string('reason', 500)->nullable();
            $table->string('status', 12)->default('PENDING'); // PENDING, APPROVED, REJECTED, CANCELLED
            $table->foreignId('applied_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approver_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->string('decision_note', 255)->nullable();
            $table->timestamps();
            $table->index(['store_id', 'status']);
            $table->index(['employee_id', 'from_date']);
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->unsignedInteger('ot_minutes')->default(0)->after('worked_minutes');
            $table->unsignedInteger('ot_approved_minutes')->nullable()->after('ot_minutes');
            $table->string('ot_status', 10)->default('NONE')->after('ot_approved_minutes'); // NONE, PENDING, APPROVED, REJECTED
            $table->foreignId('ot_decided_by')->nullable()->after('ot_status')->constrained('users')->nullOnDelete();
        });

        Schema::create('hr_employee_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('type', 16); // PROMOTION, TRANSFER, SALARY_REVISION, STORE_TRANSFER
            $table->date('effective_date');
            $table->json('changes'); // {field: {from, to}}
            $table->string('status', 10)->default('SCHEDULED'); // SCHEDULED, APPLIED, CANCELLED
            $table->timestamp('applied_at')->nullable();
            $table->unsignedBigInteger('new_employee_id')->nullable(); // The copy in the receiving store (another store's row).
            $table->string('note', 255)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['store_id', 'status', 'effective_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_employee_movements');
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ot_decided_by');
            $table->dropColumn(['ot_minutes', 'ot_approved_minutes', 'ot_status']);
        });
        Schema::dropIfExists('hr_requests');
        Schema::dropIfExists('hr_shift_roster');
    }
};
