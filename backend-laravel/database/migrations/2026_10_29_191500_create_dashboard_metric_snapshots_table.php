<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dashboard_metric_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->date('snapshot_date');
            $table->unsignedInteger('active_employees');
            $table->decimal('stock_value', 20, 4);
            $table->timestamps();
            $table->unique(['store_id', 'snapshot_date'], 'dashboard_snapshot_store_date_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dashboard_metric_snapshots');
    }
};
