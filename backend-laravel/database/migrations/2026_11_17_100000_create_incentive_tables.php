<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Salesperson incentives (Settings > Incentive Configuration): rules (item, scheme, old stock, monthly target),
 * monthly targets, and the approved payout per salesperson and month that payroll pays.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('incentive_rules', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id')->index();
            $table->string('type', 10); // item, scheme, ageing, target
            $table->string('name', 150);
            $table->string('basis', 12)->default('percent'); // percent, per_piece (target: slabs decide)
            $table->decimal('value', 12, 3)->default(0);
            $table->string('scope_type', 12)->default('all'); // all, section, category, brand, product
            $table->json('scope_ids')->nullable(); // ids, or section names
            $table->json('employee_ids')->nullable(); // blank = every salesperson
            $table->json('department_ids')->nullable(); // blank = every HR section
            $table->unsignedInteger('min_age_days')->nullable(); // ageing
            $table->string('target_type', 8)->nullable(); // target: amount, qty
            $table->json('slabs')->nullable(); // target: [{from, to, type: percent|amount, value}]
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('incentive_targets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id')->index();
            $table->char('month', 7); // YYYY-MM
            $table->unsignedBigInteger('employee_id')->nullable();
            $table->unsignedBigInteger('department_id')->nullable();
            $table->decimal('target_amount', 14, 2)->nullable();
            $table->decimal('target_qty', 12, 3)->nullable();
            $table->timestamps();
            $table->index(['store_id', 'month']);
        });

        Schema::create('incentive_payouts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('store_id');
            $table->char('month', 7);
            $table->unsignedBigInteger('employee_id');
            $table->decimal('net_sales', 14, 2)->default(0);
            $table->decimal('qty', 12, 3)->default(0);
            $table->decimal('item_amount', 12, 2)->default(0);
            $table->decimal('scheme_amount', 12, 2)->default(0);
            $table->decimal('ageing_amount', 12, 2)->default(0);
            $table->decimal('target_amount', 12, 2)->default(0);
            $table->decimal('returns_amount', 12, 2)->default(0); // negative
            $table->decimal('total', 12, 2)->default(0);
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique(['store_id', 'month', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('incentive_payouts');
        Schema::dropIfExists('incentive_targets');
        Schema::dropIfExists('incentive_rules');
    }
};
