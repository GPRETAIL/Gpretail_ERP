<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A named, saved snapshot of a theme config -- entirely separate from stores.theme_customization
     * (the one currently *active* theme, unchanged by this table's existence). "Apply" just copies
     * a preset's config column into that existing field via the same validated updateTheme path, so
     * every other part of the theme system (createTenantTheme, TenantThemeProvider, themeStyles.css)
     * needs no changes at all to support this.
     */
    public function up(): void
    {
        Schema::create('theme_presets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('store_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->json('config');
            $table->timestamps();

            $table->unique(['store_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('theme_presets');
    }
};
