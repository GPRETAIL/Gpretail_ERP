<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * SettingsController::salesCustomization() was a stub - PUT silently
 * discarded whatever was saved, and GET always returned a fixed set of
 * unrelated toggles (stock/discount settings, not receipt layout). Every
 * POS page calls this on load to sync receipt customization into
 * localStorage, and the merge logic didn't preserve the existing local
 * value when server data didn't match - so this was actively resetting
 * saved receipt customization back to defaults on every page load, not
 * just failing to persist it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            if (!Schema::hasColumn('stores', 'receipt_customization')) {
                $table->json('receipt_customization')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            if (Schema::hasColumn('stores', 'receipt_customization')) {
                $table->dropColumn('receipt_customization');
            }
        });
    }
};
