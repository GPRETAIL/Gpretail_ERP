<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // HR Departments
        Schema::create('hr_departments', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // HR Designations
        Schema::create('hr_designations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained('hr_departments')->cascadeOnDelete();
            $table->string('name');
            $table->string('code')->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Employees
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('hr_departments')->nullOnDelete();
            $table->foreignId('designation_id')->nullable()->constrained('hr_designations')->nullOnDelete();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('email')->nullable();
            $table->string('phone', 50)->nullable();
            $table->text('address')->nullable();
            $table->decimal('salary', 15, 2)->default(0);
            $table->date('joining_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Attendances
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->date('date');
            $table->time('check_in')->nullable();
            $table->time('check_out')->nullable();
            $table->string('status', 50)->default('PRESENT'); // PRESENT, ABSENT, HALF_DAY, LEAVE
            $table->timestamps();

            $table->unique(['employee_id', 'date']);
        });

        // Printer Configurations
        Schema::create('printer_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->nullable()->constrained('stores')->nullOnDelete();
            $table->string('name');
            $table->string('printer_type', 50)->default('THERMAL'); // THERMAL, A4, ESCPOS
            $table->string('paper_size', 50)->default('80mm');
            $table->text('header_text')->nullable();
            $table->text('footer_text')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('printer_configs');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('employees');
        Schema::dropIfExists('hr_designations');
        Schema::dropIfExists('hr_departments');
    }
};
