<?php

namespace App\Models;

use CodeIgniter\Model;

class PurModel extends Model
{
    protected $table            = 'purchases';
    protected $primaryKey       = 'id';
    protected $allowedFields    = [
        'ref',
        'supplier_id',
        'date',
        'total',
        'tax',
        'discount',
        'grand_total',
        'status',
        'created_by',
        'attime'
        // Add all your 'purchases' table fields here
    ];
    protected $returnType       = 'object';

    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';

    /**
     * Fetch all purchases with optional filters
     */
    public function getAllPurchases(array $filters = [])
    {
        if (!empty($filters)) {
            return $this->where($filters)->findAll();
        }
        return $this->findAll();
    }

    /**
     * Find a purchase by ID
     */
    public function findPurchase($id)
    {
        return $this->find($id);
    }

    /**
     * Create a new purchase record
     */
    public function createPurchase(array $data)
    {
        return $this->insert($data, true); // true to return inserted ID
    }

    /**
     * Update an existing purchase
     */
    public function updatePurchase($id, array $data)
    {
        return $this->update($id, $data);
    }

    /**
     * Delete a purchase by ID
     */
    public function deletePurchase($id)
    {
        return $this->delete($id);
    }

    /**
     * Advanced DataTables Query for server-side processing
     */
    public function getDatatables($search = '', $order = ['id' => 'desc'], $limit = 10, $offset = 0)
    {
        $builder = $this->builder();

        if (!empty($search)) {
            $builder->like('ref', $search)
                ->orLike('supplier_id', $search)
                ->orLike('status', $search);
        }

        if (!empty($order)) {
            foreach ($order as $column => $dir) {
                $builder->orderBy($column, $dir);
            }
        }

        return $builder->limit($limit, $offset)->get()->getResult();
    }

    public function countFiltered($search = '')
    {
        $builder = $this->builder();

        if (!empty($search)) {
            $builder->like('ref', $search)
                ->orLike('supplier_id', $search)
                ->orLike('status', $search);
        }

        return $builder->countAllResults();
    }

    public function countAllPurchases()
    {
        return $this->countAllResults();
    }
}
