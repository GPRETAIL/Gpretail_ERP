<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/** Applies the validated HTTP context to directly store-owned Eloquent records. */
class StoreModelScope
{
    private array $columns = [];

    private array $foreignKeys = [];

    private array $tableColumns = [];

    /** Cache schema only, never a user's authorization or a record's ownership. */
    private function tableColumns(Model $model, string $table): array
    {
        $key = ($model->getConnectionName() ?? config('database.default')).':'.$table;

        return $this->tableColumns[$key] ??= app(StoreSchema::class)->columns($table, $model->getConnectionName());
    }

    public function columns(Model $model): array
    {
        if (! str_starts_with($model::class, 'App\\Models\\')
            || in_array($model->getTable(), ['users', 'stores', 'platform_activations', 'personal_access_tokens'], true)) {
            return [];
        }
        $key = ($model->getConnectionName() ?? 'default').':'.$model->getTable();

        return $this->columns[$key] ??= array_values(array_intersect(
            ['store_id', 'company_id'], $this->tableColumns($model, $model->getTable()),
        ));
    }

    public function bootModel(Model $model): void
    {
        if (in_array($model->getTable(), ['users', 'stores', 'platform_activations', 'personal_access_tokens'], true)) {
            return;
        }
        $columns = $this->columns($model);
        $model::addGlobalScope('http_store_context', function (Builder $query): void {
            $request = request();
            if (! $request->attributes->has('store_context_ids')) {
                return;
            }
            StoreQuery::scope($query->getQuery(), $query->getModel()->getTable(), $query->getModel()->getTable(), $request->attributes->get('store_context_ids'));
        });
    }

    public function saving(Model $model): void
    {
        $request = request();
        if (! $request->attributes->get('store_context_write')) {
            return;
        }
        $selected = $request->attributes->get('store_context_id');
        foreach ($this->columns($model) as $column) {
            if ($model->exists && $model->getRawOriginal($column) !== null && (int) $model->getRawOriginal($column) !== $selected) {
                throw ValidationException::withMessages(['store_id' => 'This record belongs to another store.']);
            }
            if ($model->exists && $model->getAttribute($column) !== null && (int) $model->getAttribute($column) !== $selected) {
                throw ValidationException::withMessages(['store_id' => 'The record does not match the selected store.']);
            }
            $model->setAttribute($column, $selected);
        }
        $table = $model->getTable();
        $key = ($model->getConnectionName() ?? 'default').':'.$table;
        $foreignKeys = $this->foreignKeys[$key] ??= app(StoreSchema::class)->foreignKeys($table, $model->getConnectionName());
        foreach ($foreignKeys as $foreign) {
            if (in_array($foreign['foreign_table'], ['stores', 'users'], true)) {
                continue;
            }
            $query = $model->getConnection()->table($foreign['foreign_table']);
            $hasValue = true;
            foreach ($foreign['columns'] as $index => $column) {
                $value = $model->getAttribute($column);
                if ($value === null) {
                    $hasValue = false;
                    break;
                }
                $query->where($foreign['foreign_columns'][$index], $value);
            }
            if (! $hasValue) {
                continue;
            }
            $parentColumns = $this->tableColumns($model, $foreign['foreign_table']);
            $ownership = array_intersect(['store_id', 'company_id'], $parentColumns);
            StoreQuery::ownership($query, $foreign['foreign_table'], array_values($ownership), [$selected]);
            if ($ownership && ! $query->exists()) {
                throw ValidationException::withMessages([$foreign['columns'][0] => 'The related record does not belong to the selected store.']);
            }
        }
    }
}
