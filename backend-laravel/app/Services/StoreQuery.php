<?php

namespace App\Services;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class StoreQuery
{
    private static array $columns = [];

    private static array $foreignKeys = [];

    public static function table(string $from): Builder
    {
        $query = DB::table($from);
        if (request()->attributes->has('store_context_ids')) {
            if (! preg_match('/^([a-zA-Z0-9_]+)(?:\s+(?:as\s+)?([a-zA-Z0-9_]+))?$/i', trim($from), $match)) {
                throw new \RuntimeException('Store-scoped query requires an explicit table identity.');
            }
            $alias = $match[2] ?? $match[1];
            if (self::scope($query, $match[1], $alias, request()->attributes->get('store_context_ids'))) {
                // A derived table keeps later OR filters from escaping the ownership predicate.
                return DB::query()->fromSub($query, $alias);
            }
        }

        return $query;
    }

    public static function scope(Builder $query, string $table, string $alias, array $ids, array $visited = []): bool
    {
        if (in_array($table, $visited, true) || count($visited) > 3) {
            return false;
        }
        $visited[] = $table;
        $cacheId = DB::getDefaultConnection().':'.$table;
        $columns = self::$columns[$cacheId] ??= app(StoreSchema::class)->columns($table);
        $ownership = $table === 'stores' ? ['id'] : array_intersect(['store_id', 'company_id'], $columns);
        if ($ownership) {
            self::ownership($query, $alias, array_values($ownership), $ids);

            return true;
        }
        if (in_array($table, ['users', 'personal_access_tokens', 'platform_activations'], true)) {
            return false;
        }
        $foreignKeys = self::$foreignKeys[$cacheId] ??= app(StoreSchema::class)->foreignKeys($table);
        $scoped = false;
        $anchors = [];
        foreach ($foreignKeys as $index => $foreign) {
            if (in_array($foreign['foreign_table'], ['users', 'stores'], true)) {
                continue;
            }
            $parentAlias = 'ownership_'.count($visited).'_'.$index;
            $parent = DB::table($foreign['foreign_table'].' as '.$parentAlias)->selectRaw('1');
            if (! self::scope($parent, $foreign['foreign_table'], $parentAlias, $ids, $visited)) {
                continue;
            }
            foreach ($foreign['columns'] as $position => $column) {
                $parent->whereColumn($parentAlias.'.'.$foreign['foreign_columns'][$position], $alias.'.'.$column);
            }
            $query->where(function (Builder $relation) use ($foreign, $alias, $parent): void {
                $relation->where(function (Builder $missing) use ($foreign, $alias): void {
                    foreach ($foreign['columns'] as $column) {
                        $missing->whereNull($alias.'.'.$column);
                    }
                })->orWhereExists(clone $parent);
            });
            $anchors[] = $parent;
            $scoped = true;
        }
        if ($anchors) {
            $query->where(function (Builder $present) use ($anchors): void {
                foreach ($anchors as $parent) {
                    $present->orWhereExists(clone $parent);
                }
            });
        }

        return $scoped;
    }

    public static function cacheKey(string $key): string
    {
        if (! request()->attributes->has('store_context_ids')) {
            return $key;
        }
        $ids = request()->attributes->get('store_context_ids');
        sort($ids);

        return $key.':stores:'.implode(',', $ids);
    }

    public static function ownership(Builder $query, string $alias, array $columns, array $ids): void
    {
        if (in_array('store_id', $columns, true) && in_array('company_id', $columns, true)) {
            $query->where(function (Builder $scope) use ($alias, $ids): void {
                $scope->whereIn($alias.'.store_id', $ids)->orWhere(function (Builder $fallback) use ($alias, $ids): void {
                    $fallback->whereNull($alias.'.store_id')->whereIn($alias.'.company_id', $ids);
                });
            });
            $query->where(function (Builder $consistent) use ($alias): void {
                $consistent->whereNull($alias.'.store_id')->orWhereNull($alias.'.company_id')->orWhereColumn($alias.'.store_id', $alias.'.company_id');
            });
        } else {
            foreach ($columns as $column) {
                $query->whereIn($alias.'.'.$column, $ids);
            }
        }
    }
}
