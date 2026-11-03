<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * HRMS phase 1, attendance: an employee can be linked to a login and a reporting manager, punches are kept
 * as a log, and each day's attendance row records how it was worked out (late/early/worked minutes, source).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->unique()->constrained('users')->nullOnDelete();
            $table->foreignId('reports_to_id')->nullable()->constrained('employees')->nullOnDelete();
        });

        Schema::create('hr_holidays', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->date('date');
            $table->string('name', 120);
            $table->timestamps();
            $table->unique(['store_id', 'date']);
        });

        Schema::create('hr_checkins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->dateTime('punched_at'); // UTC
            $table->string('type', 3); // IN, OUT
            $table->string('source', 10); // SELF, MANAGER, IMPORT
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->unsignedInteger('distance_m')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['employee_id', 'punched_at']);
        });

        Schema::table('attendances', function (Blueprint $table) {
            $table->foreignId('store_id')->nullable()->after('id')->constrained('stores')->cascadeOnDelete();
            $table->unsignedInteger('late_minutes')->default(0)->after('status');
            $table->unsignedInteger('early_exit_minutes')->default(0)->after('late_minutes');
            $table->unsignedInteger('worked_minutes')->default(0)->after('early_exit_minutes');
            $table->string('source', 10)->default('AUTO')->after('worked_minutes'); // AUTO, MANUAL
            $table->unsignedBigInteger('leave_application_id')->nullable()->after('source');
            $table->string('remarks', 255)->nullable()->after('leave_application_id');
            $table->index(['store_id', 'date']);
        });

        // Rows marked before this change were set by a manager by hand.
        DB::table('attendances')->update([
            'source' => 'MANUAL',
            'store_id' => DB::raw('(SELECT employees.store_id FROM employees WHERE employees.id = attendances.employee_id)'),
        ]);
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropIndex(['store_id', 'date']);
            $table->dropConstrainedForeignId('store_id');
            $table->dropColumn(['late_minutes', 'early_exit_minutes', 'worked_minutes', 'source', 'leave_application_id', 'remarks']);
        });
        Schema::dropIfExists('hr_checkins');
        Schema::dropIfExists('hr_holidays');
        Schema::table('employees', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reports_to_id');
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
