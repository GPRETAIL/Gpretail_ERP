<?php

namespace App\Models;

use CodeIgniter\Model;

class ProductInitModel extends Model
{
    protected $table = 'products';
    protected $primaryKey = 'id';

    // Optional: list of fields to protect/allow
    protected $allowedFields = ['name', 'price', 'supplier', 'type'];

    public function countFilteredProducts($search = null, $supplier = null, $type = null)
    {
        $builder = $this->builder();

        if (!empty($search)) {
            $builder->like('name', $search);
        }

        if ($supplier && $supplier !== '99') {
            $builder->where('supplier', $supplier);
        }

        if ($type && $type !== '99') {
            $builder->where('type', $type);
        }

        return $builder->countAllResults();
    }

    public function getFilteredProducts($offset = 0, $limit = 50, $search = null, $supplier = null, $type = null)
    {
        $builder = $this->db->table('products AS pro')
            ->select('pro.id, pro.name, pro.price, stt.quantity, SUM(str.qty) AS qty_plus')
            ->join('stocks AS stt', 'stt.product_id = pro.id', 'left')
            ->join('stock_transfer AS str', 'str.pro_id = pro.id', 'left');

        // Filters
        if (!empty($search)) {
            $builder->like('pro.name', $search);
        }

        if (!empty($supplier) && $supplier !== '99') {
            $builder->where('pro.supplier', $supplier);
        }

        if (!empty($type) && $type !== '99') {
            $builder->where('pro.type', $type);
        }

        // Grouping and Ordering
        $builder->groupBy('pro.id')
            ->orderBy('pro.name', 'ASC');

        // Pagination
        $builder->limit($limit, $offset);

        return $builder->get()->getResult();
    }
}
