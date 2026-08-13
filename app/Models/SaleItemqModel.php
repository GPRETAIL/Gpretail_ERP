<?php

namespace App\Models;

use CodeIgniter\Model;

class SaleItemqModel extends Model
{
    protected $table = 'sale_itemqs';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'sale_id',
        'product_id',
        'product_name',
        'quantity',
        'price',
        'tax',
        'subtotal',
        'discount',
        'created_at',
        'updated_at',
        'attime'
    ]; // Adjust based on your real database fields
    protected $returnType = 'object';
    protected $useTimestamps = false; // If your table has created_at/updated_at

    /**
     * Create a new SaleItemq record
     */
    public function createSaleItemq(array $data)
    {
        $this->insert($data);
        return $this->getInsertID();
    }

    /**
     * Find a SaleItemq by ID or conditions
     */
    public function findSaleItemq($idOrConditions)
    {
        if (is_array($idOrConditions)) {
            return $this->where($idOrConditions)->first();
        }
        return $this->find($idOrConditions);
    }

    /**
     * Get all SaleItemq records by condition
     */
    public function getAllSaleItemqs($conditions = [])
    {
        if (!empty($conditions)) {
            return $this->where($conditions)->findAll();
        }
        return $this->findAll();
    }
}
