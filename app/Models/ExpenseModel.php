<?php

namespace App\Models;

use CodeIgniter\Model;

class ExpenceModel extends Model
{
    protected $table            = 'expences';           // Table name
    protected $primaryKey       = 'id';                 // Primary key
    protected $allowedFields    = ['date', 'reference', 'amount', 'category_id', 'store_id', 'created_date', 'attime'];
    protected $returnType       = 'object';             // Return results as objects
    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';
    protected $order            = ['created_date' => 'desc']; // Default order

    /**
     * Build query for DataTables server-side processing
     */
    private function _get_datatables_query($searchValue = null, $orderColumn = null, $orderDir = null)
    {
        $builder = $this->builder();

        if (!empty($searchValue)) {
            $searchValue = ltrim($searchValue, '0'); // Remove leading 0
            $builder->groupStart();
            foreach (['id', 'date', 'reference', 'amount', 'category_id', 'store_id'] as $column) {
                $builder->orLike($column, $searchValue);
            }
            $builder->groupEnd();
        }

        if ($orderColumn !== null && $orderDir !== null) {
            $builder->orderBy($orderColumn, $orderDir);
        } else {
            $builder->orderBy('created_date', 'DESC');
        }

        return $builder;
    }

    /**
     * Fetch paginated datatables records
     */
    public function getDatatables($length, $start, $searchValue = null, $orderColumn = null, $orderDir = null)
    {
        $builder = $this->_get_datatables_query($searchValue, $orderColumn, $orderDir);

        if ($length != -1) {
            $builder->limit($length, $start);
        }

        return $builder->get()->getResult();
    }

    /**
     * Count filtered records
     */
    public function countFiltered($searchValue = null)
    {
        $builder = $this->_get_datatables_query($searchValue);

        return $builder->countAllResults(false);
    }

    /**
     * Count all records
     */
    public function countAll()
    {
        return $this->countAllResults();
    }

    /**
     * Get record by ID
     */
    public function getById($id)
    {
        return $this->find($id);
    }

    /**
     * Save new record
     */
    public function saveExpence($data)
    {
        return $this->insert($data);
    }

    /**
     * Update existing record
     */
    public function updateExpence($id, $data)
    {
        return $this->update($id, $data);
    }

    /**
     * Delete record by ID
     */
    public function deleteById($id)
    {
        return $this->delete($id);
    }
}
