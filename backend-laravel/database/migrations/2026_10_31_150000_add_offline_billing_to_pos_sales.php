<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Offline POS billing. A till that loses the internet keeps billing from a local catalog and
 * numbers those bills from its counter's own offline series (INV-{store}-{date}-F{counter}-0001),
 * then syncs them. offline_billed_at is when the customer was billed; sync_review lists what the
 * server had to accept as-is (stock already short, a piece already sold elsewhere, a renumbered
 * bill) for a manager to check.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pos_sales', function (Blueprint $table) {
            $table->timestamp('offline_billed_at')->nullable()->after('sale_date');
            $table->json('sync_review')->nullable()->after('offline_billed_at');
            $table->timestamp('sync_reviewed_at')->nullable()->after('sync_review');
            $table->unsignedBigInteger('sync_reviewed_by')->nullable()->after('sync_reviewed_at');
            $table->string('sync_review_note', 500)->nullable()->after('sync_reviewed_by');
            // Not led by store_id: MariaDB reuses an FK-led composite index for the FK, which blocks dropping it.
            $table->index(['offline_billed_at', 'store_id']);
        });
    }

    public function down(): void
    {
        Schema::table('pos_sales', function (Blueprint $table) {
            $table->dropIndex(['offline_billed_at', 'store_id']);
            $table->dropColumn(['offline_billed_at', 'sync_review', 'sync_reviewed_at', 'sync_reviewed_by', 'sync_review_note']);
        });
    }
};
