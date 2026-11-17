<?php

namespace App\Services\Reports\Scheduled;

/**
 * A report ready to be emailed: a title, the period, a few headline lines, and one or more tables (sections).
 * Column types: text | date | qty | money | count | percent. Renderers (Excel, PDF, email body) read only this.
 */
class ReportTable
{
    /**
     * @param  array<int, array{title: ?string, columns: array<int, array{key: string, label: string, type: string}>, rows: array<int, array<string, mixed>>, totals?: array<string, mixed>}>  $sections
     * @param  array<string, string>  $summary  headline lines, label => text
     */
    public function __construct(
        public string $title,
        public string $period,
        public array $sections,
        public array $summary = [],
        public bool $capped = false,
    ) {}

    public function rowCount(): int
    {
        return array_sum(array_map(fn ($section) => count($section['rows']), $this->sections));
    }

    /** One table from plain rows: columns are the row keys (ids left out), labelled and typed from their names. */
    public static function section(?string $title, iterable $rows, array $labels = [], array $types = [], array $totals = []): array
    {
        $rows = array_values(array_map(fn ($row) => (array) $row, is_array($rows) ? $rows : iterator_to_array($rows)));
        $keys = $rows ? array_keys($rows[0]) : array_keys($labels);
        $keys = array_values(array_filter($keys, fn ($key) => $key !== 'id' && ! str_ends_with((string) $key, '_id') && ! is_array($rows[0][$key] ?? null)));
        $columns = array_map(fn ($key) => ['key' => $key, 'label' => $labels[$key] ?? self::label($key), 'type' => $types[$key] ?? self::type($key, $rows)], $keys);
        if (! $totals) {
            foreach ($columns as $column) {
                if (in_array($column['type'], ['qty', 'money', 'count'], true) && ! preg_match('/(price|rate|mrp|percent|days|age)/', $column['key'])) {
                    $totals[$column['key']] = round(array_sum(array_map(fn ($row) => (float) ($row[$column['key']] ?? 0), $rows)), 2);
                }
            }
        }

        return ['title' => $title, 'columns' => $columns, 'rows' => $rows, 'totals' => $totals];
    }

    public static function label(string $key): string
    {
        return ucfirst(str_replace(['_', ' no'], [' ', ' No'], $key));
    }

    private static function type(string $key, array $rows): string
    {
        if (preg_match('/(date|_at)$/', $key)) {
            return 'date';
        }
        $sample = null;
        foreach ($rows as $row) {
            if (($row[$key] ?? null) !== null && $row[$key] !== '') {
                $sample = $row[$key];
                break;
            }
        }
        if (! is_numeric($sample) || preg_match('/(code|no|number|phone|gstin|hsn|barcode)$/', $key)) {
            return 'text';
        }

        return match (true) {
            (bool) preg_match('/(amount|value|price|cost|total|tax|paid|balance|due|refund|sales|purchase|cash|rate|mrp|profit|gst)/', $key) => 'money',
            (bool) preg_match('/(percent|pct|through)/', $key) => 'percent',
            (bool) preg_match('/(count|bills|invoices|orders|items|entries|days|age)/', $key) => 'count',
            default => 'qty',
        };
    }
}
