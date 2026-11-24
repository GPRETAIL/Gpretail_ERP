<?php

namespace App\Http\Controllers\Concerns;

use Closure;
use Illuminate\Http\Request;

/**
 * Bounds for the loose, alias-heavy payloads of the small master screens (sizes, attributes, configuration values):
 * text up to a length, whole numbers in a range, flags, and structured values up to a size. Each screen sends its own
 * mix of names (name / size_name / sizeName ...), so every alias is checked the same way and nothing else changes: a
 * request that was fine before is still fine; a field that is the wrong kind or absurdly large is now a 422.
 */
trait ValidatesMasterInput
{
    protected function validateMasterInput(Request $request): void
    {
        $text = fn (int $max): Closure => function (string $attribute, mixed $value, Closure $fail) use ($max): void {
            if ($value === null || $value === '') {
                return;
            }
            if (! is_scalar($value) || mb_strlen((string) $value) > $max) {
                $fail("The {$attribute} must be text of at most {$max} characters.");
            }
        };
        $whole = fn (int $min, int $max): Closure => function (string $attribute, mixed $value, Closure $fail) use ($min, $max): void {
            if ($value === null || $value === '') {
                return;
            }
            if (! is_numeric($value) || (float) (int) $value !== (float) $value || (int) $value < $min || (int) $value > $max) {
                $fail("The {$attribute} must be a whole number from {$min} to {$max}.");
            }
        };
        $flag = function (string $attribute, mixed $value, Closure $fail): void {
            if ($value !== null && $value !== '' && ! in_array($value, [true, false, 0, 1, '0', '1', 'true', 'false'], true)) {
                $fail("The {$attribute} must be true or false.");
            }
        };
        // A value that may be text or a structure (a configuration's value, extra data), kept to a size.
        $structured = fn (int $max): Closure => function (string $attribute, mixed $value, Closure $fail) use ($max): void {
            if ($value !== null && strlen((string) json_encode($value)) > $max) {
                $fail("The {$attribute} is too large (at most {$max} characters).");
            }
        };

        $rules = [];
        foreach (['name', 'size_name', 'sizeName', 'group_name', 'groupName', 'attribute_value', 'key', 'config_key', 'type', 'group'] as $field) {
            $rules[$field] = ['sometimes', $text(150)];
        }
        foreach (['code', 'short_code'] as $field) {
            $rules[$field] = ['sometimes', $text(60)];
        }
        $rules['updated_by'] = ['sometimes', $text(100)];
        $rules['description'] = ['sometimes', $text(500)];
        foreach (['sort_order', 'sortOrder', 'display_order'] as $field) {
            $rules[$field] = ['sometimes', $whole(0, 1000000)];
        }
        foreach (['size_group_id', 'company_id'] as $field) {
            $rules[$field] = ['sometimes', $whole(1, 4294967295)];
        }
        $rules['is_active'] = ['sometimes', $flag];
        foreach (['value', 'config_value'] as $field) {
            $rules[$field] = ['sometimes', $structured(10000)];
        }
        $rules['extra_data'] = ['sometimes', $structured(20000)];

        $request->validate($rules);
    }
}
