<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * On-prem failover: the counters' address and sync progress on store_local_nodes, the cloud account a copied
 * on-prem user came from, and who made each queued write (so a replayed bill keeps its cashier).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('store_local_nodes', function (Blueprint $table) {
            if (! Schema::hasColumn('store_local_nodes', 'counter_url')) {
                $table->string('counter_url')->nullable()->after('local_server_url');
            }
            if (! Schema::hasColumn('store_local_nodes', 'last_cycle_at')) {
                $table->timestamp('last_cycle_at')->nullable();
                $table->timestamp('last_users_sync_at')->nullable();
                $table->unsignedInteger('users_synced')->default(0);
            }
        });
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'cloud_user_id')) {
                $table->unsignedBigInteger('cloud_user_id')->nullable()->index();
            }
        });
        Schema::table('sync_outbox', function (Blueprint $table) {
            if (! Schema::hasColumn('sync_outbox', 'actor_username')) {
                $table->string('actor_username', 100)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('sync_outbox', fn (Blueprint $table) => $table->dropColumn('actor_username'));
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['cloud_user_id']);
            $table->dropColumn('cloud_user_id');
        });
        Schema::table('store_local_nodes', fn (Blueprint $table) => $table->dropColumn(['counter_url', 'last_cycle_at', 'last_users_sync_at', 'users_synced']));
    }
};
