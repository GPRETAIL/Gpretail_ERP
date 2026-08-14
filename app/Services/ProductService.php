<?php

namespace App\Services;

/**
 * Products grid business logic: the column map and base query shared by
 * Products::datatableList() and Products::exportProducts(). Extracted
 * out of the controller, same Phase 4 pattern as the report services.
 */
class ProductService
{
    /**
     * Column index -> SQL field map shared by the grid endpoint, export,
     * and per-column filtering below. store_stock comes from an aggregated
     * LEFT JOIN subquery (same SUM(quantity) GROUP BY product_id already
     * used for this figure elsewhere in the app, e.g. Brand::fetch_all_records()),
     * wrapped in COALESCE so filtering/ordering works the same whether or
     * not a product has any stock rows at all.
     */
    public function columnMap(): array
    {
        return [
            0 => 'pr.id', 1 => 'pr.code', 2 => 'pr.hsn', 3 => 'pr.name', 4 => 'pr.tax',
            5 => 'pr.cost', 6 => 'pr.price', 7 => 'pr.rrate', 8 => 'pr.discount_per',
            9 => 'bbr.name', 10 => 'ssr.name', 11 => 'COALESCE(st.store_stock, 0)',
        ];
    }

    public function buildQuery(string $search, array $colFilters)
    {
        $db = db_connect();
        $columns = $this->columnMap();

        $builder = $db->table('products pr')
            ->select("pr.id, pr.code, pr.hsn, pr.name, pr.tax, pr.cost, pr.price, pr.rrate, pr.discount_per, bbr.name AS bname, ssr.name AS sname, COALESCE(st.store_stock, 0) AS store_stock")
            ->join('brand bbr', 'bbr.id = pr.brandd', 'left')
            ->join('suppliers ssr', 'ssr.id = pr.supplier', 'left')
            ->join('(SELECT product_id, SUM(quantity) AS store_stock FROM stocks GROUP BY product_id) st', 'st.product_id = pr.id', 'left');

        if ($search !== '') {
            $builder->groupStart()
                ->like('pr.name', $search)
                ->orLike('pr.code', $search)
                ->orLike('pr.hsn', $search)
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
