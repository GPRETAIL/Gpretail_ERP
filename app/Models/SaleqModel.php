<?php

namespace App\Models;

use CodeIgniter\Model;

class SaleqModel extends Model
{
    protected $table            = 'saleqs';
    protected $primaryKey       = 'id';
    protected $returnType       = 'object';
    protected $useAutoIncrement = true;
    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';
    protected $allowedFields    = [
        'client_id',
        'clientname',
        'tax',
        'discount',
        'total',
        'created_by',
        'totalitems',
        'status',
        'paid',
        'paidmethod',
        'created_at',
        'updated_at',
        'attime'
        // 🔁 Add other fields based on your `saleqs` table structure
    ];

    /**
     * Find a sale record by ID or condition array
     */
    public function findSaleq($idOrConditions)
    {
        if (is_array($idOrConditions)) {
            return $this->where($idOrConditions)->first();
        }
        return $this->find($idOrConditions);
    }

    /**
     * Create a sale record and return the inserted object
     */
    public function createSaleq(array $data)
    {
        $this->insert($data);
        return $this->find($this->getInsertID());
    }
}
