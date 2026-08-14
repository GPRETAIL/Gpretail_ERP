<?php

namespace App\Services;

/**
 * Bulk price-update grid business logic: the column map and base query
 * used by ProductsPrice::datatableList(). Extracted out of the
 * controller, same Phase 4 pattern as the other services.
 */
class ProductPriceService
{
    /**
     * Maps DataTables client-side column indexes to sortable/filterable DB
     * columns. Client layout is: 0=select-checkbox, 1=id, 2=code, 3=name,
     * 4=price, 5=update-price (client-only, not orderable/searchable),
     * 6=attime, 7=actions (client-only) - indexes 0, 5 and 7 are
     * intentionally absent since those columns aren't backed by a DB field.
     */
    public function columnMap(): array
    {
        return [
            1 => 'pr.id', 2 => 'pr.code', 3 => 'pr.name', 4 => 'pr.price', 6 => 'pr.attime',
        ];
    }

    public function buildQuery(string $search, string $supplier, array $colFilters)
    {
        $db = db_connect();
        $columns = $this->columnMap();

        $builder = $db->table('products pr')
            ->select("pr.id, pr.code, pr.name, pr.price, pr.attime")
            ->join('suppliers ssr', 'ssr.id = pr.supplier', 'left');

        if ($supplier !== '' && $supplier !== '99') {
            $builder->where('pr.supplier', $supplier);
        }
        if ($search !== '') {
            $builder->groupStart()
                ->like('pr.name', $search)
                ->orLike('pr.code', $search)
                ->orWhere('pr.id', $search)
                ->groupEnd();
        }
        foreach ($colFilters as $i => $val) {
            if (isset($columns[$i])) {
                $builder->like($columns[$i], $val);
            }
        }

        return $builder;
    }
}
