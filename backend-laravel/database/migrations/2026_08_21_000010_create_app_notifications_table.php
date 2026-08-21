<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Generic, persisted notification store - not scoped to one alert type.
 * Named app_notifications (not notifications) - User already uses
 * Laravel's built-in Notifiable trait, which expects its own
 * differently-shaped `notifications` table if the database channel is
 * ever used; this avoids colliding with that. Rows are generated lazily
 * (a short "scan and insert" step runs whenever the bell is read, see
 * NotificationController) rather than via a cron job, since this project
 * has no task scheduler running yet.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_notifications', function (Blueprint $table) {
            $table->id();
            $table->string('type', 100);
            $table->string('title');
            $table->text('message')->nullable();
            $table->string('link')->nullable();
            $table->string('reference_type', 50)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->unsignedBigInteger('store_id')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['reference_type', 'reference_id', 'type']);
            $table->index(['read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_notifications');
    }
};
