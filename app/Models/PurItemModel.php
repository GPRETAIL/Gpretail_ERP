<?php

namespace App\Models;

use CodeIgniter\Model;

class PurItemModel extends Model
{
    protected $table            = 'purchase_items'; // Assuming table is 'purchase_items'
    protected $primaryKey       = 'id';
    protected $allowedFields    = [
        'purchase_id',
        'product_id',
        'quantity',
        'cost',
        'subtotal',
        'attime'
        // Add your actual fields here
    ];
    protected $returnType       = 'object';

    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';

    /**
     * Fetch all purchase items
     */
    public function getAllItems(array $filters = [])
    {
        if (!empty($filters)) {
            return $this->where($filters)->findAll();
        }
        return $this->findAll();
    }

    /**
     * Find a purchase item by ID
     */
    public function findItem($id)
    {
        return $this->find($id);
    }

    /**
     * Create a new purchase item
     */
    public function createItem(array $data)
    {
        return $this->insert($data, true); // true to return inserted ID
    }

    /**
     * Update a purchase item
     */
    public function updateItem($id, array $data)
    {
        return $this->update($id, $data);
    }

    /**
     * Delete a purchase item
     */
    public function deleteItem($id)
    {
        return $this->delete($id);
    }

    /**
     * Get all items by a purchase ID
     */
    public function getItemsByPurchaseId($purchaseId)
    {
        return $this->where('purchase_id', $purchaseId)->findAll();
    }
}
