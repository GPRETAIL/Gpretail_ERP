<?php

use CodeIgniter\I18n\Time; // Optional if you want

if (!function_exists('label')) {
    function label(string $label): string
    {
        $translated = lang($label);

        // If translation doesn't exist, `lang()` returns the key itself
        if ($translated === $label) {
            return $label;
        }

        return $translated;
    }
}
