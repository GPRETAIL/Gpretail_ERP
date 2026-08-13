<?php

namespace App\Models;

use CodeIgniter\Model;

class PurchaseInvoiceModel extends Model
{
    protected $table            = 'purchases';
    protected $primaryKey       = 'id';
    protected $allowedFields    = [
        'ref',
        'attime'
    ]; // Add other fields if needed
    protected $returnType       = 'object';
    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';

    protected $columnSearch = [
        'id',
        'ref'
    ];

    protected $order = [
        'id' => 'desc'
    ];

    /**
     * For DataTables server-side processing
     */
    public function getDatatables($requestData)
    {
        $builder = $this->builder();

        if (!empty($requestData['search']['value'])) {
            $searchValue = trim($requestData['search']['value']);
            $builder->groupStart();
            foreach ($this->columnSearch as $key => $item) {
                if ($key === 0) {
                    $builder->like($item, $searchValue);
                } else {
                    $builder->orLike($item, $searchValue);
                }
            }
            $builder->groupEnd();
        }

        if (isset($requestData['order'])) {
            $columnIdx = $requestData['order'][0]['column'];
            $columnDir = $requestData['order'][0]['dir'];
            $columnName = $this->columnSearch[$columnIdx];
            $builder->orderBy($columnName, $columnDir);
        } else {
            $builder->orderBy(key($this->order), $this->order[key($this->order)]);
        }

        if (isset($requestData['length']) && $requestData['length'] != -1) {
            $builder->limit($requestData['length'], $requestData['start']);
        }

        return $builder->get()->getResult();
    }

    /**
     * Count filtered records
     */
    public function countFiltered($requestData)
    {
        $builder = $this->builder();

        if (!empty($requestData['search']['value'])) {
            $searchValue = trim($requestData['search']['value']);
            $builder->groupStart();
            foreach ($this->columnSearch as $key => $item) {
                if ($key === 0) {
                    $builder->like($item, $searchValue);
                } else {
                    $builder->orLike($item, $searchValue);
                }
            }
            $builder->groupEnd();
        }

        return $builder->countAllResults();
    }

    /**
     * Count all records
     */
    public function countAll()
    {
        return $this->countAllResults();
    }

    /**
     * Get purchase invoice by ID
     */
    public function getById($id)
    {
        return $this->find($id);
    }

    /**
     * Save new purchase invoice
     */
    public function savePurchase($data)
    {
        return $this->insert($data);
    }

    /**
     * Update purchase invoice
     */
    public function updatePurchase($id, $data)
    {
        return $this->update($id, $data);
    }

    /**
     * Delete purchase invoice by ID
     */
    public function deletePurchase($id)
    {
        return $this->delete($id);
    }
}
