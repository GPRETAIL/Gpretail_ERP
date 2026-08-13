<?php

namespace App\Models;

use CodeIgniter\Model;

class InvoiceProductModel extends Model
{
    protected $table            = 'products';
    protected $primaryKey       = 'id';
    protected $allowedFields    = [
        'code',
        'name',
        'brandd',
        'category',
        'cost',
        'tax',
        'price',
        'attime'
    ];
    protected $returnType       = 'object';

    protected $columnSearch = [
        'id',
        'code',
        'name',
        'brandd',
        'category',
        'cost',
        'tax',
        'price'
    ];

    protected $order = ['id' => 'desc'];

    // Fetch data for DataTables
    public function getDatatables($postData)
    {
        $builder = $this->builder();

        if (!empty($postData['search']['value'])) {
            $searchValue = ltrim($postData['search']['value'], '0');
            $builder->groupStart();
            foreach ($this->columnSearch as $index => $item) {
                if ($index === 0) {
                    $builder->like($item, $searchValue);
                } else {
                    $builder->orLike($item, $searchValue);
                }
            }
            $builder->groupEnd();
        }

        // Ordering
        if (isset($postData['order'])) {
            $orderColumn = $this->columnSearch[$postData['order'][0]['column']];
            $orderDir = $postData['order'][0]['dir'];
            $builder->orderBy($orderColumn, $orderDir);
        } else {
            $builder->orderBy(key($this->order), $this->order[key($this->order)]);
        }

        if (isset($postData['length']) && $postData['length'] != -1) {
            $builder->limit($postData['length'], $postData['start']);
        }

        return $builder->get()->getResult();
    }

    // Count filtered
    public function countFiltered($postData)
    {
        $builder = $this->builder();

        if (!empty($postData['search']['value'])) {
            $searchValue = ltrim($postData['search']['value'], '0');
            $builder->groupStart();
            foreach ($this->columnSearch as $index => $item) {
                if ($index === 0) {
                    $builder->like($item, $searchValue);
                } else {
                    $builder->orLike($item, $searchValue);
                }
            }
            $builder->groupEnd();
        }

        return $builder->countAllResults();
    }

    // Count all records
    public function countAllRecords()
    {
        return $this->builder()->countAllResults();
    }

    // Find by ID
    public function getById($id)
    {
        return $this->find($id);
    }

    // Insert new
    public function saveProduct($data)
    {
        return $this->insert($data);
    }

    // Update product
    public function updateProduct($id, $data)
    {
        return $this->update($id, $data);
    }

    // Delete product
    public function deleteById($id)
    {
        return $this->delete($id);
    }
}
