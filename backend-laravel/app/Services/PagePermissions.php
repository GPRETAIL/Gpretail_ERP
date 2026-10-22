<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Validation\ValidationException;

class PagePermissions
{
    public function effective(User $user): ?array
    {
        if ($user->page_permissions !== null) {
            return $user->page_permissions;
        }
        // Compatibility for accounts whose role was saved before page grants were persisted.
        $presets = json_decode(file_get_contents(config_path('role_page_presets.json')), true, 512, JSON_THROW_ON_ERROR);

        return $presets[$user->role] ?? null;
    }

    public function allows(User $user, string $path, string $action): bool
    {
        $grants = $user->page_permissions;
        if ($grants === null) {
            return true;
        }
        $path = rtrim(strtolower($path), '/');
        $matched = null;
        foreach ($grants as $key => $value) {
            if ($key === '*' || $path === $key || str_starts_with($path, rtrim($key, '/').'/')) {
                if ($matched === null || strlen($key) > strlen($matched)) {
                    $matched = $key;
                }
            }
        }
        if ($matched === null) {
            return false;
        }
        $permission = $grants[$matched];
        $action = match ($action) {
            'export' => 'view', 'approve' => 'edit', default => $action
        };

        return ($permission['view'] ?? false) === true && ($permission[$action] ?? false) === true;
    }

    public function normalize(array $permissions): array
    {
        $result = [];
        foreach ($permissions as $path => $actions) {
            if ($path !== '*' && ! preg_match('#^/(dashboard|warehouse|crm|sales|finance|store|analytical|masters|hrms|settings)(/[a-z0-9_-]+)*$#', $path)) {
                throw ValidationException::withMessages(['pagePermissions' => 'Invalid page permission path.']);
            }
            $result[$path] = array_fill_keys(['view', 'add', 'edit', 'delete'], false);
            foreach (array_keys($result[$path]) as $action) {
                $result[$path][$action] = ($actions[$action] ?? false) === true;
            }
            if (! $result[$path]['view']) {
                $result[$path] = array_fill_keys(array_keys($result[$path]), false);
            }
        }

        return $result;
    }
}
