<?php

namespace App\Models;

use CodeIgniter\Model;

class InvoiceQuoteModel extends Model
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
        'status'
    ];
    protected $returnType       = 'object';

    protected $columnSearch = [
        'id', 'clientname', 'tax', 'discount', 'total', 'created_by', 'totalitems', 'status'
    ];
    protected $order = ['id' => 'desc'];

    public function getDatatables(array $postData)
    {
        $builder = $this->builder();

        // Search
        if (!empty($postData['search']['value'])) {
            $searchValue = ltrim($postData['search']['value'], '0');
            $builder->groupStart();
            foreach ($this->columnSearch as $i => $column) {
                if ($i === 0) {
                    $builder->like($column, $searchValue);
                } else {
                    $builder->orLike($column, $searchValue);
                }
            }
            $builder->groupEnd();
        }

        // Order
        if (isset($postData['order'])) {
            $columnIndex = $postData['order'][0]['column'];
            $dir = $postData['order'][0]['dir'];
            $builder->orderBy($this->columnSearch[$columnIndex], $dir);
        } else {
            $builder->orderBy(key($this->order), $this->order[key($this->order)]);
        }

        // Limit
        if ($postData['length'] != -1) {
            $builder->limit($postData['length'], $postData['start']);
        }

        return $builder->get()->getResult();
    }

    public function countFiltered(array $postData)
    {
        $builder = $this->builder();

        if (!empty($postData['search']['value'])) {
            $searchValue = ltrim($postData['search']['value'], '0');
            $builder->groupStart();
            foreach ($this->columnSearch as $i => $column) {
                if ($i === 0) {
                    $builder->like($column, $searchValue);
                } else {
                    $builder->orLike($column, $searchValue);
                }
            }
            $builder->groupEnd();
        }

        return $builder->countAllResults();
    }

    public function countAllRecords()
    {
        return $this->builder()->countAllResults();
    }

    public function getById($id)
    {
        return $this->find($id);
    }

    public function saveQuote($data)
    {
        return $this->insert($data);
    }

    public function updateQuote($id, $data)
    {
        return $this->update($id, $data);
    }

    public function deleteById($id)
    {
        return $this->delete($id);
    }
}
