<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Ports the CRM field set from the CI4 `customers` table (customer type/
 * category, billing name, DOB/anniversary, loyalty card number, credit
 * days/amount, bank details, city/district/state/country references) -
 * CrmCustomerForm.jsx already sends these, but the Laravel `customers`
 * table never had columns for them, so every CRM-specific field was
 * silently dropped on save. Also adds the customer_order_communications
 * table (CrmCustomerOrderForm.jsx's "communication log" UI already sends
 * this data; nothing persisted it) and store-level loyalty settings
 * (CI4 equivalent: settings.ct_point_perrs/min_ponint/ct_month).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            if (!Schema::hasColumn('customers', 'customer_type')) {
                $table->string('customer_type', 50)->default('Retail')->after('code');
            }
            if (!Schema::hasColumn('customers', 'customer_category_id')) {
                $table->unsignedBigInteger('customer_category_id')->nullable()->after('customer_type');
            }
            if (!Schema::hasColumn('customers', 'billing_name')) {
                $table->string('billing_name')->nullable()->after('name');
            }
            if (!Schema::hasColumn('customers', 'gender')) {
                $table->string('gender', 20)->nullable()->after('email');
            }
            if (!Schema::hasColumn('customers', 'date_of_birth')) {
                $table->date('date_of_birth')->nullable()->after('gender');
            }
            if (!Schema::hasColumn('customers', 'married')) {
                $table->boolean('married')->default(false)->after('date_of_birth');
            }
            if (!Schema::hasColumn('customers', 'marriage_date')) {
                $table->date('marriage_date')->nullable()->after('married');
            }
            if (!Schema::hasColumn('customers', 'kids_boy')) {
                $table->unsignedInteger('kids_boy')->nullable()->after('marriage_date');
            }
            if (!Schema::hasColumn('customers', 'kids_girl')) {
                $table->unsignedInteger('kids_girl')->nullable()->after('kids_boy');
            }
            if (!Schema::hasColumn('customers', 'loyalty_card_number')) {
                $table->string('loyalty_card_number')->nullable()->index()->after('loyalty_points');
            }
            if (!Schema::hasColumn('customers', 'disable_loyalty')) {
                $table->boolean('disable_loyalty')->default(false)->after('loyalty_card_number');
            }
            if (!Schema::hasColumn('customers', 'supply_type')) {
                $table->string('supply_type', 50)->nullable()->after('gstin');
            }
            if (!Schema::hasColumn('customers', 'tan_pan')) {
                $table->string('tan_pan', 50)->nullable()->after('supply_type');
            }
            if (!Schema::hasColumn('customers', 'support_credit')) {
                $table->boolean('support_credit')->default(false)->after('credit_limit');
            }
            if (!Schema::hasColumn('customers', 'credit_days')) {
                $table->unsignedInteger('credit_days')->nullable()->after('support_credit');
            }
            if (!Schema::hasColumn('customers', 'credit_amount')) {
                $table->decimal('credit_amount', 15, 2)->nullable()->after('credit_days');
            }
            if (!Schema::hasColumn('customers', 'district_id')) {
                $table->unsignedBigInteger('district_id')->nullable()->after('city');
            }
            if (!Schema::hasColumn('customers', 'state_id')) {
                $table->unsignedBigInteger('state_id')->nullable()->after('state');
            }
            if (!Schema::hasColumn('customers', 'country_id')) {
                $table->unsignedBigInteger('country_id')->nullable()->after('state_id');
            }
            if (!Schema::hasColumn('customers', 'registering_at_id')) {
                $table->unsignedBigInteger('registering_at_id')->nullable()->after('country_id');
            }
            if (!Schema::hasColumn('customers', 'approved_by_id')) {
                $table->unsignedBigInteger('approved_by_id')->nullable()->after('registering_at_id');
            }
            if (!Schema::hasColumn('customers', 'bank_account_name')) {
                $table->string('bank_account_name')->nullable()->after('approved_by_id');
            }
            if (!Schema::hasColumn('customers', 'account_no_ifsc')) {
                $table->string('account_no_ifsc')->nullable()->after('bank_account_name');
            }
        });

        if (!Schema::hasTable('customer_order_communications')) {
            Schema::create('customer_order_communications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('customer_order_id')->constrained('customer_orders')->cascadeOnDelete();
                $table->date('communication_date');
                $table->string('communication_person')->nullable();
                $table->text('communication_message')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        Schema::table('stores', function (Blueprint $table) {
            if (!Schema::hasColumn('stores', 'loyalty_point_value')) {
                $table->decimal('loyalty_point_value', 10, 2)->default(100);
            }
            if (!Schema::hasColumn('stores', 'loyalty_redeem_min_points')) {
                $table->unsignedInteger('loyalty_redeem_min_points')->default(100);
            }
            if (!Schema::hasColumn('stores', 'loyalty_redeem_window_months')) {
                $table->unsignedInteger('loyalty_redeem_window_months')->default(12);
            }
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            foreach (['loyalty_point_value', 'loyalty_redeem_min_points', 'loyalty_redeem_window_months'] as $col) {
                if (Schema::hasColumn('stores', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::dropIfExists('customer_order_communications');

        Schema::table('customers', function (Blueprint $table) {
            foreach ([
                'customer_type', 'customer_category_id', 'billing_name', 'gender', 'date_of_birth',
                'married', 'marriage_date', 'kids_boy', 'kids_girl', 'loyalty_card_number',
                'disable_loyalty', 'supply_type', 'tan_pan', 'support_credit', 'credit_days',
                'credit_amount', 'district_id', 'state_id', 'country_id', 'registering_at_id',
                'approved_by_id', 'bank_account_name', 'account_no_ifsc',
            ] as $col) {
                if (Schema::hasColumn('customers', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
