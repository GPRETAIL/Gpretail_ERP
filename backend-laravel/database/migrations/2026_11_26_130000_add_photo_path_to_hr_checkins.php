<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A store can ask for a photo with every self check in and check out. It is kept on the private disk, named here. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hr_checkins', function (Blueprint $table) {
            $table->string('photo_path', 255)->nullable()->after('distance_m');
        });
    }

    public function down(): void
    {
        Schema::table('hr_checkins', function (Blueprint $table) {
            $table->dropColumn('photo_path');
        });
    }
};
