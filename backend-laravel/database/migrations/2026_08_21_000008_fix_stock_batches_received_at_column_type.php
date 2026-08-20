<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * `timestamp` columns get MySQL/MariaDB's legacy implicit
 * "DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP" behavior when
 * they're the first TIMESTAMP-type column in the table and no explicit
 * default is given - confirmed via SHOW CREATE TABLE after FIFO ordering
 * broke: every save() to update remaining_qty silently bumped received_at
 * to now(), destroying the very ordering the batch ledger depends on.
 * DATETIME never has this quirk, so that's what actually needs to be
 * stored here - no doctrine/dbal in this project, so a raw ALTER TABLE.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE stock_batches MODIFY received_at DATETIME NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE stock_batches MODIFY received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP');
    }
};
