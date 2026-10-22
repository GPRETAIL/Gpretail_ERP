<?php

namespace App\Services;

use App\Models\PlatformActivation;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TenantThemes
{
    public const STYLES = ['classic', 'apple', 'glass', 'glassmorphism', 'liquid_ai'];

    public const COLORS = ['background_color', 'surface_color', 'text_color', 'success_color', 'warning_color', 'error_color'];

    public function companyAdmin(User $user): bool
    {
        if (! $user->is_active) {
            return false;
        }
        if ($user->role === 'super_admin') {
            return true;
        }
        $activation = PlatformActivation::current();

        return $user->role === 'admin' && ! $user->store_id && $user->platform_company_code
            && $activation?->activated && $activation->company_code === $user->platform_company_code
            && strcasecmp($user->email, $activation->tenant_admin_email ?? '') === 0;
    }

    public function company(?string $code): ?object
    {
        return $code ? DB::table('tenant_themes')->where('company_code', $code)->first() : null;
    }

    public function decode($json): array
    {
        return is_array($json) ? $json : (json_decode($json ?? '[]', true) ?: []);
    }

    public function overrideAllowed(Store $store): bool
    {
        $company = $this->company($store->platform_company_code);

        // Existing installations keep their current store settings until governance is configured.
        return ! $company || in_array($store->id, $this->decode($company->allowed_store_ids), true);
    }

    public function effective(?Store $store, ?string $code): array
    {
        $base = $this->decode($this->company($code)?->config);

        return $store?->theme_customization && $this->overrideAllowed($store) ? array_replace_recursive($base, $store->theme_customization) : $base;
    }

    public function rules(): array
    {
        $hex = ['nullable', 'regex:/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/'];
        $rules = ['primary_color' => $hex, 'secondary_color' => $hex,
            'border_radius' => ['nullable', 'integer', 'min:0', 'max:32'],
            'theme_style' => ['nullable', 'in:'.implode(',', self::STYLES)],
            'font_family' => ['nullable', 'in:system,segoe_ui,manrope,ibm_plex_sans,source_sans_3,inter,roboto,poppins,playfair']];
        foreach (self::COLORS as $color) {
            $rules[$color] = $hex;
        }
        foreach (['light_colors', 'dark_colors'] as $mode) {
            $rules[$mode] = ['nullable', 'array:'.implode(',', self::COLORS)];
            foreach (self::COLORS as $color) {
                $rules[$mode.'.'.$color] = $hex;
            }
        }

        return $rules;
    }

    public function contrast(string $one, string $two): float
    {
        $luminance = function ($hex) {
            $hex = ltrim($hex, '#');
            if (strlen($hex) === 3) {
                $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
            }
            $rgb = array_map(function ($value) {
                $v = hexdec($value) / 255;

                return $v <= 0.04045 ? $v / 12.92 : (($v + 0.055) / 1.055) ** 2.4;
            }, str_split($hex, 2));

            return $rgb[0] * 0.2126 + $rgb[1] * 0.7152 + $rgb[2] * 0.0722;
        };
        $a = $luminance($one);
        $b = $luminance($two);

        return (max($a, $b) + 0.05) / (min($a, $b) + 0.05);
    }

    public function validateContrast(array $config): void
    {
        if (! empty($config['text_color']) && ! empty($config['background_color']) && $this->contrast($config['text_color'], $config['background_color']) < 4.5) {
            throw ValidationException::withMessages(['text_color' => 'Text and background need a contrast ratio of at least 4.5:1.']);
        }
        foreach (['light', 'dark'] as $mode) {
            if (! isset($config[$mode.'_colors'])) {
                continue;
            }
            $colors = array_replace(array_filter(array_intersect_key($config, array_flip(self::COLORS))), array_filter($config[$mode.'_colors'] ?? []));
            $text = $colors['text_color'] ?? ($mode === 'dark' ? '#f3f4f6' : '#1f2937');
            foreach (['background_color' => ($mode === 'dark' ? '#121212' : '#ffffff'), 'surface_color' => ($mode === 'dark' ? '#1e2030' : '#ffffff')] as $key => $default) {
                if ($this->contrast($text, $colors[$key] ?? $default) < 4.5) {
                    throw ValidationException::withMessages([$mode.'_colors.text_color' => ucfirst($mode).' text needs at least 4.5:1 contrast against the page and surface colors.']);
                }
            }
        }
    }

    public function revision(string $scope): int
    {
        return (int) DB::table('theme_revisions')->where('scope_key', $scope)->max('revision');
    }

    public function record(string $scope, array $config, array $allowed, User $actor, string $operation): void
    {
        DB::table('theme_revisions')->insert(['scope_key' => $scope, 'revision' => $this->revision($scope) + 1,
            'config' => json_encode($config), 'allowed_store_ids' => json_encode($allowed), 'actor_id' => $actor->id,
            'operation' => $operation, 'created_at' => now(), 'updated_at' => now()]);
    }
}
