<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Loyalty phase 2b.
 * - loyalty_tiers: a customer's tier comes from what they spent in the last 12 months; the tier multiplies the
 *   points they earn (Silver 1×, Gold 1.25×, ...).
 * - loyalty_bonus_rules: extra points on top: birthday or anniversary month, first purchase, a date range
 *   (double points week), or bills above an amount.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loyalty_tiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('name', 60);
            $table->decimal('min_spend', 15, 2)->default(0);
            $table->decimal('multiplier', 5, 2)->default(1);
            $table->timestamps();
            $table->index(['store_id', 'min_spend']);
        });

        Schema::create('loyalty_bonus_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('name', 100);
            $table->string('type', 20); // birthday, anniversary, first_purchase, date_range, min_bill
            $table->decimal('multiplier', 5, 2)->nullable(); // extra points as a multiple of the bill's points (2 = double)
            $table->unsignedInteger('points')->nullable(); // or a fixed number of extra points
            $table->decimal('min_bill', 15, 2)->nullable();
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['store_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loyalty_bonus_rules');
        Schema::dropIfExists('loyalty_tiers');
    }
};
