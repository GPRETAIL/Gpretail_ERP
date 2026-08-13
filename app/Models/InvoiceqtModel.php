<?php

namespace App\Models;

use CodeIgniter\Model;

class InvoiceqtModel extends Model
{
    protected $table            = 'saleqs';
    protected $primaryKey       = 'id';
    protected $allowedFields    = [
        'clientname',
        'tax',
        'discount',
        'total',
        'created_by',
        'totalitems',
        'status',
        'attime'
    ];
    protected $returnType       = 'object';
    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';

    protected $column_order = [
        'id',
        'clientname',
        'tax',
        'discount',
        'total',
        'created_by',
        'totalitems',
        'status'
    ];

    protected $order = ['id' => 'desc'];

    public function getDatatables($searchValue = '', $length = 10, $start = 0, $orderColIndex = 0, $orderDir = 'asc')
    {
        $builder = $this->builder();

        if (!empty($searchValue)) {
            $searchValue = ltrim($searchValue, '0');
            $builder->groupStart();
            foreach ($this->column_order as $index => $item) {
                if ($index == 0) {
                    $builder->like($item, $searchValue);
                } else {
                    $builder->orLike($item, $searchValue);
                }
            }
            $builder->groupEnd();
        }

        $orderCol = $this->column_order[$orderColIndex] ?? 'id';
        $builder->orderBy($orderCol, $orderDir);

        return $builder->get($length, $start)->getResult();
    }

    public function countFiltered($searchValue = '')
    {
        $builder = $this->builder();

        if (!empty($searchValue)) {
            $searchValue = ltrim($searchValue, '0');
            $builder->groupStart();
            foreach ($this->column_order as $index => $item) {
                if ($index == 0) {
                    $builder->like($item, $searchValue);
                } else {
                    $builder->orLike($item, $searchValue);
                }
            }
            $builder->groupEnd();
        }

        return $builder->countAllResults();
    }

    public function countAll()
    {
        return $this->builder()->countAllResults();
    }

    public function getById($id)
    {
        return $this->where('id', $id)->first();
    }

    public function deleteById($id)
    {
        return $this->delete($id);
    }
}
