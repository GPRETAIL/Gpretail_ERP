<?php

namespace App\Services\Reports;

use Carbon\Carbon;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * "Summary layouts" for the report pages: one dataset (SummaryDatasets) grouped by one of its layouts, with its
 * measures summed in the database and a totals row. Only whitelisted expressions run; the request picks a dataset,
 * a layout and a date range, nothing else. Rows are limited to the stores in the request's store context, and an
 * endpoint only reaches the datasets of its own module, so each keeps its page's permission.
 */
class ReportSummaryService
{
    public const MAX_GROUPS = 2000;

    /** @param list<int> $storeIds */
    public function run(string $module, string $datasetKey, ?string $layoutKey, ?string $from, ?string $to, array $storeIds): array
    {
        $dataset = SummaryDatasets::all()[$datasetKey] ?? null;
        if (! $dataset || $dataset['module'] !== $module) {
            throw new NotFoundHttpException('Unknown summary.');
        }
        $layout = $dataset['layouts'][$layoutKey ?? ''] ?? null;
        if (! $layout) {
            throw ValidationException::withMessages(['layout' => 'Choose one of this report\'s summary layouts.']);
        }
        $dated = isset($dataset['date']);
        if ($dated) {
            $to = $to ? Carbon::parse($to)->toDateString() : now()->toDateString();
            $from = $from ? Carbon::parse($from)->toDateString() : Carbon::parse($to)->subDays(30)->toDateString();
            if ($from > $to) {
                throw ValidationException::withMessages(['from' => 'From must be on or before To.']);
            }
        }

        $base = $this->base($dataset, [...($dataset['joins'] ?? []), ...($layout['joins'] ?? [])], $storeIds, $dated ? [$from, $to] : null);
        $measures = $dataset['measures'];
        $measureSelects = collect($measures)->map(fn ($m, $key) => $this->sql($m['expr'])." as m_$key")->values()->all();
        $extras = $layout['extras'] ?? [];

        $rows = (clone $base)
            ->selectRaw(implode(', ', [
                $this->sql($layout['group']).' as group_key',
                $this->sql($layout['label'] ?? 'MAX('.$layout['group'].')').' as group_label',
                ...collect($extras)->map(fn ($e, $key) => $this->sql($e['expr'])." as x_$key")->values()->all(),
                ...$measureSelects,
            ]))
            // By the alias: MariaDB's ONLY_FULL_GROUP_BY does not match a repeated expression, and both engines accept it.
            ->groupByRaw('group_key')
            ->when(($layout['order'] ?? 'measure') === 'key',
                fn (Builder $q) => $q->orderByRaw('group_key'),
                fn (Builder $q) => $q->orderByRaw('m_'.$this->rankBy($measures).' desc'))
            ->limit(self::MAX_GROUPS + 1)->get();
        $totals = (clone $base)->selectRaw(implode(', ', $measureSelects))->first();

        $labels = $layout['labels'] ?? [];
        $out = $rows->take(self::MAX_GROUPS)->values()->map(function ($row, $index) use ($measures, $extras, $labels) {
            $label = $row->group_label;
            $label = $label === null || $label === '' ? '(Blank)' : ($labels[$label] ?? $label);
            $item = ['s_no' => $index + 1, 'group_key' => $row->group_key, 'label' => (string) $label];
            foreach ($extras as $key => $extra) {
                $item[$key] = $row->{"x_$key"};
            }
            foreach ($measures as $key => $measure) {
                $item[$key] = $this->number($row->{"m_$key"}, $measure['type']);
            }

            return $item;
        })->all();

        return [
            'dataset' => $datasetKey, 'layout' => $layoutKey, 'layout_label' => $layout['title'],
            'group_header' => $layout['header'] ?? $layout['title'], 'dated' => $dated, 'from' => $dated ? $from : null, 'to' => $dated ? $to : null,
            'columns' => [
                ...collect($extras)->map(fn ($e, $key) => ['key' => $key, 'label' => $e['label'], 'type' => $e['type'] ?? 'text'])->values()->all(),
                ...collect($measures)->map(fn ($m, $key) => ['key' => $key, 'label' => $m['label'], 'type' => $m['type']])->values()->all(),
            ],
            'rows' => $out,
            'totals' => collect($measures)->map(fn ($m, $key) => $this->number($totals?->{"m_$key"}, $m['type']))->all(),
            'capped' => $rows->count() > self::MAX_GROUPS,
        ];
    }

    /** The layouts each dataset offers, for the Summary layouts panel. */
    public function layouts(string $module): array
    {
        return collect(SummaryDatasets::all())->filter(fn ($d) => $d['module'] === $module)
            ->map(fn ($d) => ['dated' => isset($d['date']), 'layouts' => collect($d['layouts'])->map(fn ($l, $key) => ['value' => $key, 'label' => $l['title']])->values()->all()])
            ->all();
    }

    private function base(array $dataset, array $joins, array $storeIds, ?array $range): Builder
    {
        $query = DB::table($dataset['table']);
        $seen = [];
        foreach ($joins as $join) {
            [$table, $first, $second] = $join;
            if (isset($seen[$table])) {
                continue;
            }
            $seen[$table] = true;
            // The key can be an expression (e.g. the line's brand, else the product's).
            $on = fn ($j) => $j->on($first, '=', str_contains($second, '(') ? DB::raw($second) : $second);
            ($join[3] ?? 'left') === 'inner' ? $query->join($table, $on) : $query->leftJoin($table, $on);
        }
        // Store isolation: a row belongs to the context when any of its store columns is one of the context's stores.
        $query->where(function (Builder $q) use ($dataset, $storeIds) {
            foreach ($dataset['stores'] as $column) {
                $q->orWhereIn($column, $storeIds ?: [0]);
            }
        });
        foreach ($dataset['where'] ?? [] as $condition) {
            $query->whereRaw($this->sql($condition));
        }
        if ($range) {
            $query->whereRaw($this->sql('{date:'.$dataset['date'].'}').' between ? and ?', $range);
        }

        return $query;
    }

    /** {date:x} and {month:x} for both MariaDB and the SQLite test database. */
    private function sql(string $expr): string
    {
        $sqlite = DB::connection()->getDriverName() === 'sqlite';

        return preg_replace_callback('/\{(date|month):([a-z0-9_.]+)\}/i', fn ($m) => match ($m[1]) {
            'date' => $sqlite ? "date({$m[2]})" : "DATE({$m[2]})",
            'month' => $sqlite ? "strftime('%Y-%m', {$m[2]})" : "DATE_FORMAT({$m[2]}, '%Y-%m')",
        }, $expr);
    }

    /** Biggest first by money (sales, amount, value), else by the first measure. */
    private function rankBy(array $measures): string
    {
        return collect($measures)->search(fn ($m) => $m['type'] === 'money') ?: array_key_first($measures);
    }

    private function number(mixed $value, string $type): float|int
    {
        return $type === 'count' ? (int) $value : round((float) $value, $type === 'money' ? 2 : 3);
    }
}
