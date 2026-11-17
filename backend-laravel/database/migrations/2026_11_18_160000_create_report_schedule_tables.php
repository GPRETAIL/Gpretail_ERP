<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Settings > Scheduler: reports emailed on a schedule (Excel/PDF) to users, roles, recipient groups and outside
 * addresses, with a delivery log. reports:run-scheduled sends the ones that are due.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recipient_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('description', 255)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->unique(['store_id', 'name']);
        });

        Schema::create('recipient_group_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recipient_group_id')->constrained('recipient_groups')->cascadeOnDelete();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('email', 191)->nullable();
            $table->timestamps();
        });

        Schema::create('report_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('name', 150);
            $table->string('report_key', 100);
            $table->json('params')->nullable();
            $table->string('period', 30)->default('yesterday');
            $table->string('frequency', 16)->default('daily'); // daily | weekly | monthly
            $table->string('send_time', 5)->default('09:00'); // HH:MM, business time zone
            $table->unsignedTinyInteger('day_of_week')->nullable(); // 1 = Monday ... 7 = Sunday
            $table->unsignedTinyInteger('day_of_month')->nullable(); // 1-31; past month end = last day
            $table->json('formats');
            $table->string('subject', 200)->nullable();
            $table->text('message')->nullable();
            $table->boolean('skip_empty')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamp('next_run_at')->nullable()->index();
            $table->timestamp('last_run_at')->nullable();
            $table->string('last_status', 20)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('report_schedule_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_schedule_id')->constrained('report_schedules')->cascadeOnDelete();
            $table->string('type', 10); // user | role | group | email
            $table->string('value', 191);
            $table->timestamps();
        });

        Schema::create('report_schedule_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('report_schedule_id')->constrained('report_schedules')->cascadeOnDelete();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('trigger', 10)->default('schedule'); // schedule | manual
            $table->date('period_from')->nullable();
            $table->date('period_to')->nullable();
            $table->string('status', 20); // sent | partial | skipped | failed
            $table->unsignedInteger('rows')->default(0);
            $table->json('recipients')->nullable();
            $table->json('skipped_recipients')->nullable();
            $table->json('files')->nullable();
            $table->text('error')->nullable();
            $table->unsignedBigInteger('triggered_by')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
            $table->index(['store_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_schedule_runs');
        Schema::dropIfExists('report_schedule_recipients');
        Schema::dropIfExists('report_schedules');
        Schema::dropIfExists('recipient_group_members');
        Schema::dropIfExists('recipient_groups');
    }
};
