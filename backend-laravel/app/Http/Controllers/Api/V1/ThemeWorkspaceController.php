<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Services\StoreContext;
use App\Services\TenantThemes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ThemeWorkspaceController extends Controller
{
    public function __construct(private TenantThemes $themes) {}

    private function target(Request $request, $id = null, bool $write = false): array
    {
        $user = $request->user();
        abort_unless($user->is_active && in_array($user->role, ['admin', 'super_admin'], true), 403);
        if ($id !== null) {
            $store = app(StoreContext::class)->available($user)->findOrFail($id);
            abort_if($write && ! $this->themes->overrideAllowed($store), 403, 'This store inherits its company theme. Ask your Tenant Administrator to allow an override.');

            return ['store:'.$store->id, $store, $store->platform_company_code];
        }
        abort_unless($this->themes->companyAdmin($user), 403, 'Only the Tenant Administrator can manage the company theme.');
        abort_unless(! empty($user->platform_company_code), 422, 'Link this installation to a company before setting a company theme. Existing store themes remain available.');

        return ['tenant:'.$user->platform_company_code, null, $user->platform_company_code];
    }

    private function config(?Store $store, ?string $code): array
    {
        return $store ? ($store->theme_customization ?: []) : $this->themes->decode($this->themes->company($code)?->config);
    }

    private function allowed(?string $code): array
    {
        $company = $this->themes->company($code);
        if ($company) {
            return $this->themes->decode($company->allowed_store_ids);
        }

        return $code ? Store::where('platform_company_code', $code)->whereNotNull('theme_customization')->pluck('id')->all() : [];
    }

    public function index(Request $request, $id = null)
    {
        [$scope, $store, $code] = $this->target($request, $id);

        return response()->json(['success' => true, 'data' => $this->config($store, $code), 'meta' => [
            'revision' => $this->themes->revision($scope), 'source' => $store?->theme_customization && $this->themes->overrideAllowed($store) ? 'store' : ($this->themes->company($code) ? 'company' : 'default'),
            'effective' => $this->themes->effective($store, $code), 'company_admin' => $this->themes->companyAdmin($request->user()),
            'override_allowed' => ! $store || $this->themes->overrideAllowed($store), 'allowed_store_ids' => $this->allowed($code),
            'stores' => $this->themes->companyAdmin($request->user()) ? app(StoreContext::class)->available($request->user())->orderBy('name')->get(['id', 'name']) : [],
        ]]);
    }

    public function update(Request $request, $id = null)
    {
        [$scope, $store, $code] = $this->target($request, $id, true);
        $validated = $request->validate($this->themes->rules());
        $request->validate(['expected_revision' => ($store ? 'sometimes' : 'required').'|integer|min:0', 'allowed_store_ids' => 'sometimes|array|max:1000', 'allowed_store_ids.*' => 'integer|min:1|distinct']);
        $config = array_filter($validated, fn ($value) => $value !== null);
        $allowed = $store ? $this->allowed($code) : $request->input('allowed_store_ids', $this->allowed($code));
        $allowed = array_values(array_map('intval', $allowed));
        if (! $store) {
            $available = app(StoreContext::class)->available($request->user())->pluck('id')->all();
            abort_if(array_diff($allowed, $available) !== [], 422, 'Override permissions must belong to this company.');
        }
        $this->themes->validateContrast($store ? array_replace_recursive($this->themes->decode($this->themes->company($code)?->config), $config) : $config);
        DB::transaction(function () use ($request, $scope, $store, $code, $config, $allowed) {
            if ($store) {
                if ($code) {
                    DB::table('tenant_themes')->where('company_code', $code)->lockForUpdate()->first();
                }
                abort_unless($this->themes->overrideAllowed($store), 403, 'This store now inherits the company theme. Reload before making changes.');
                $locked = Store::whereKey($store->id)->lockForUpdate()->firstOrFail();
                $before = $locked->theme_customization ?: [];
            } else {
                DB::table('tenant_themes')->insertOrIgnore(['company_code' => $code, 'config' => '{}', 'allowed_store_ids' => json_encode($this->allowed($code)), 'created_at' => now(), 'updated_at' => now()]);
                $locked = DB::table('tenant_themes')->where('company_code', $code)->lockForUpdate()->first();
                $before = $this->themes->decode($locked->config);
            }
            $this->themes->validateContrast($store ? array_replace_recursive($this->themes->decode($this->themes->company($code)?->config), $config) : $config);
            if (! $store && $allowed) {
                foreach (Store::whereIn('id', $allowed)->where('platform_company_code', $code)->lockForUpdate()->get() as $overriddenStore) {
                    try {
                        $this->themes->validateContrast(array_replace_recursive($config, $overriddenStore->theme_customization ?: []));
                    } catch (ValidationException $error) {
                        throw ValidationException::withMessages(['allowed_store_ids' => 'The retained theme for '.$overriddenStore->name.' would have insufficient contrast. Adjust that store theme or disable its override before applying this company theme.']);
                    }
                }
            }
            $revision = $this->themes->revision($scope);
            abort_if($request->has('expected_revision') && $request->integer('expected_revision') !== $revision, 409, 'This theme changed since you opened it. Reload the saved theme before applying your changes.');
            if ($revision === 0) {
                $this->themes->record($scope, $before, $this->allowed($code), $request->user(), 'baseline');
            }
            if ($store) {
                $locked->update(['theme_customization' => $config ?: null]);
            } else {
                DB::table('tenant_themes')->where('company_code', $code)->update(['config' => json_encode($config), 'allowed_store_ids' => json_encode($allowed), 'updated_at' => now()]);
            }
            $this->themes->record($scope, $config, $allowed, $request->user(), $request->attributes->get('theme_operation', 'apply'));
        });

        return $this->index($request, $id);
    }

    public function history(Request $request, $id = null)
    {
        [$scope] = $this->target($request, $id);
        $request->validate(['before_revision' => 'sometimes|integer|min:1']);
        $rows = DB::table('theme_revisions')->leftJoin('users', 'users.id', '=', 'theme_revisions.actor_id')->where('scope_key', $scope)
            ->where('operation', '!=', 'deleted')
            ->when($request->filled('before_revision'), fn ($query) => $query->where('revision', '<', $request->integer('before_revision')))
            ->orderByDesc('revision')->limit(51)->get(['theme_revisions.id', 'revision', 'operation', 'theme_revisions.created_at', 'users.name as author']);
        $more = $rows->count() > 50;
        $rows = $rows->take(50)->values();

        return response()->json(['success' => true, 'data' => $rows, 'meta' => ['next_before' => $more ? $rows->last()->revision : null]]);
    }

    public function removeHistory(Request $request, $id = null, $revisionId = null)
    {
        if ($request->route('id') === null) {
            $revisionId = $request->route('revisionId');
            $id = null;
        }
        [$scope, $store, $code] = $this->target($request, $id, true);
        $request->validate(['expected_revision' => 'required|integer|min:0']);
        $count = DB::transaction(function () use ($request, $scope, $store, $code, $revisionId) {
            // Use the same lock as Apply, so clearing history cannot race a new theme revision.
            if ($store) {
                Store::whereKey($store->id)->lockForUpdate()->firstOrFail();
            } else {
                DB::table('tenant_themes')->where('company_code', $code)->lockForUpdate()->first();
            }
            abort_if($this->themes->revision($scope) !== $request->integer('expected_revision'), 409, 'The theme changed. Reload before removing history.');
            $rows = DB::table('theme_revisions')->where('scope_key', $scope)->where('operation', '!=', 'deleted')
                ->where('revision', '<=', $request->integer('expected_revision'))
                ->when($revisionId !== null, fn ($query) => $query->where('id', $revisionId));
            if ($revisionId !== null) {
                abort_unless((clone $rows)->exists(), 404);
            }

            // Erase restore data while retaining the revision number. Physically deleting the
            // latest row would reuse old version numbers and let stale Apply requests succeed.
            return $rows->update(['config' => null, 'allowed_store_ids' => null, 'actor_id' => null, 'operation' => 'deleted', 'updated_at' => now()]);
        });

        return response()->json(['success' => true, 'deleted_count' => $count]);
    }

    public function restore(Request $request, $id = null, $revisionId = null)
    {
        // Company routes have only the revision parameter; store routes also include the store ID.
        if ($request->route('id') === null) {
            $revisionId = $request->route('revisionId');
            $id = null;
        }
        [$scope, $store] = $this->target($request, $id, true);
        $revision = DB::table('theme_revisions')->where('scope_key', $scope)->where('id', $revisionId)->where('operation', '!=', 'deleted')->first();
        abort_unless($revision !== null, 404);
        $input = $this->themes->decode($revision->config);
        if ($request->has('expected_revision')) {
            $input['expected_revision'] = $request->input('expected_revision');
        }
        if (! $store) {
            $available = app(StoreContext::class)->available($request->user())->pluck('id')->all();
            $input['allowed_store_ids'] = array_values(array_intersect($this->themes->decode($revision->allowed_store_ids), $available));
        }
        $request->replace($input);
        $request->attributes->set('theme_operation', 'restore');

        return $this->update($request, $id);
    }

    public function presets(Request $request, $id = null)
    {
        [, $store, $code] = $this->target($request, $id);
        $rows = $store ? $store->themePresets()->orderBy('name')->get(['id', 'name', 'config'])
            : DB::table('tenant_theme_presets')->where('company_code', $code)->orderBy('name')->get(['id', 'name', 'config'])->map(function ($row) {
                $row->config = $this->themes->decode($row->config);

                return $row;
            });

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function savePreset(Request $request, $id = null)
    {
        [, $store, $code] = $this->target($request, $id, true);
        $data = $request->validate(['name' => 'required|string|max:60', ...$this->themes->rules()]);
        $name = $data['name'];
        unset($data['name']);
        $config = array_filter($data, fn ($v) => $v !== null);
        $this->themes->validateContrast($config);
        if ($store) {
            $preset = $store->themePresets()->updateOrCreate(['name' => $name], ['config' => $config]);
        } else {
            DB::table('tenant_theme_presets')->updateOrInsert(['company_code' => $code, 'name' => $name], ['config' => json_encode($config), 'updated_at' => now(), 'created_at' => now()]);
            $preset = DB::table('tenant_theme_presets')->where('company_code', $code)->where('name', $name)->first();
            $preset->config = $config;
        }

        return response()->json(['success' => true, 'data' => ['id' => $preset->id, 'name' => $name, 'config' => $config]], 201);
    }

    public function applyPreset(Request $request, $id = null, $presetId = null)
    {
        if ($request->route('id') === null) {
            $presetId = $request->route('presetId');
            $id = null;
        }
        [, $store, $code] = $this->target($request, $id, true);
        $preset = $store ? $store->themePresets()->findOrFail($presetId) : DB::table('tenant_theme_presets')->where('company_code', $code)->where('id', $presetId)->first();
        abort_unless($preset, 404);
        $payload = $this->themes->decode($preset->config);
        if ($request->has('expected_revision')) {
            $payload['expected_revision'] = $request->input('expected_revision');
        }
        $request->replace($payload);
        $request->attributes->set('theme_operation', 'preset');

        return $this->update($request, $id);
    }

    public function deletePreset(Request $request, $id = null, $presetId = null)
    {
        if ($request->route('id') === null) {
            $presetId = $request->route('presetId');
            $id = null;
        }
        [, $store, $code] = $this->target($request, $id, true);
        if ($store) {
            $store->themePresets()->findOrFail($presetId)->delete();
        } else {
            abort_unless(DB::table('tenant_theme_presets')->where('company_code', $code)->where('id', $presetId)->delete() > 0, 404);
        }

        return response()->json(['success' => true]);
    }
}
