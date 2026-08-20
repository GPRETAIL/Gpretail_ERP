<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            if (!Schema::hasColumn('agents', 'agent_type_id')) {
                $table->unsignedBigInteger('agent_type_id')->nullable()->after('code');
            }
            if (!Schema::hasColumn('agents', 'contact_person')) {
                $table->string('contact_person')->nullable()->after('name');
            }
            if (!Schema::hasColumn('agents', 'contact_no')) {
                $table->string('contact_no', 50)->nullable()->after('phone');
            }
            if (!Schema::hasColumn('agents', 'email_id')) {
                $table->string('email_id')->nullable()->after('email');
            }
            if (!Schema::hasColumn('agents', 'address')) {
                $table->text('address')->nullable()->after('email_id');
            }
            if (!Schema::hasColumn('agents', 'pan')) {
                $table->string('pan', 50)->nullable()->after('address');
            }
            if (!Schema::hasColumn('agents', 'gst')) {
                $table->string('gst', 50)->nullable()->after('pan');
            }
            if (!Schema::hasColumn('agents', 'commission_amt')) {
                $table->decimal('commission_amt', 12, 2)->default(0)->after('commission_rate');
            }
            if (!Schema::hasColumn('agents', 'commission_pct')) {
                $table->decimal('commission_pct', 8, 2)->default(0)->after('commission_amt');
            }
            if (!Schema::hasColumn('agents', 'city_id')) {
                $table->unsignedBigInteger('city_id')->nullable()->after('commission_pct');
            }
            if (!Schema::hasColumn('agents', 'tax_id')) {
                $table->unsignedBigInteger('tax_id')->nullable()->after('city_id');
            }
            if (!Schema::hasColumn('agents', 'bank_id')) {
                $table->unsignedBigInteger('bank_id')->nullable()->after('tax_id');
            }
            if (!Schema::hasColumn('agents', 'bank_account_name')) {
                $table->string('bank_account_name')->nullable()->after('bank_id');
            }
            if (!Schema::hasColumn('agents', 'ifsc')) {
                $table->string('ifsc', 50)->nullable()->after('bank_account_name');
            }
            if (!Schema::hasColumn('agents', 'account_no')) {
                $table->string('account_no', 50)->nullable()->after('ifsc');
            }
            if (!Schema::hasColumn('agents', 'state_id')) {
                $table->unsignedBigInteger('state_id')->nullable()->after('account_no');
            }
            if (!Schema::hasColumn('agents', 'pincode')) {
                $table->string('pincode', 20)->nullable()->after('state_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('agents', function (Blueprint $table) {
            $table->dropColumn([
                'agent_type_id',
                'contact_person',
                'contact_no',
                'email_id',
                'address',
                'pan',
                'gst',
                'commission_amt',
                'commission_pct',
                'city_id',
                'tax_id',
                'bank_id',
                'bank_account_name',
                'ifsc',
                'account_no',
                'state_id',
                'pincode',
            ]);
        });
    }
};
