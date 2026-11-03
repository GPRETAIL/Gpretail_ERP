<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Credit sales follow the approval limits too: the amount a role may put on a customer's account without a
 * supervisor/manager approval. 0 = every credit sale needs approval, null = unlimited. Stores that already use
 * approval limits get the recommended values, so the rule is on there straight away.
 */
return new class extends Migration
{
    private const RECOMMENDED = ['cashier' => 0, 'sales' => 0, 'store_user' => 0, 'supervisor' => 5000, 'manager' => 25000];

    public function up(): void
    {
        Schema::table('approval_limits', function (Blueprint $table) {
            $table->decimal('max_credit_amount', 12, 2)->nullable()->after('max_refund_amount')->comment('null = unlimited');
        });
        foreach (self::RECOMMENDED as $role => $amount) {
            DB::table('approval_limits')->where('role', $role)->update(['max_credit_amount' => $amount]);
        }
    }

    public function down(): void
    {
        Schema::table('approval_limits', fn (Blueprint $table) => $table->dropColumn('max_credit_amount'));
    }
};
