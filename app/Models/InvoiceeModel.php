<?php

namespace App\Models;

use CodeIgniter\Model;

class InvoiceeModel extends Model
{
    protected $table            = 'dsales';
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

    protected $columnSearch = [
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

    // Get datatables
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

        // Order
        if (isset($postData['order'])) {
            $orderColumn = $this->columnSearch[$postData['order'][0]['column']];
            $orderDir = $postData['order'][0]['dir'];
            $builder->orderBy($orderColumn, $orderDir);
        } else {
            $builder->orderBy(key($this->order), $this->order[key($this->order)]);
        }

        // Limit
        if (isset($postData['length']) && $postData['length'] != -1) {
            $builder->limit($postData['length'], $postData['start']);
        }

        return $builder->get()->getResultArray();
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

    // Count all
    public function countAllRecords()
    {
        return $this->builder()->countAllResults();
    }

    // Find one by ID
    public function getById($id)
    {
        return $this->find($id);
    }

    // Insert new
    public function saveInvoice($data)
    {
        return $this->insert($data);
    }

    // Update existing
    public function updateInvoice($id, $data)
    {
        return $this->update($id, $data);
    }

    // Delete by ID
    public function deleteById($id)
    {
        return $this->delete($id);
    }
}
