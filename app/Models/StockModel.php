<?php

namespace App\Models;

use CodeIgniter\Model;

class StockModel extends Model
{
    protected $table            = 'stocks';
    protected $primaryKey       = 'id';
    protected $returnType       = 'object';
    protected $useAutoIncrement = true;
    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';
    protected $allowedFields    = [
        'product_id',
        'quantity',
        'location',
        'store_id',
        'batch_number',
        'attime'
        // 🛠 Update this list based on actual columns in your `stocks` table
    ];

    /**
     * Find a stock item by ID or condition
     */
    public function findStock($idOrConditions)
    {
        if (is_array($idOrConditions)) {
            return $this->where($idOrConditions)->first();
        }
        return $this->find($idOrConditions);
    }

    /**
     * Create a stock record
     */
    public function createStock(array $data)
    {
        return $this->insert($data);
    }

    /**
     * Update a stock record
     */
    public function updateStock($idOrConditions, array $data)
    {
        if (is_array($idOrConditions)) {
            return $this->where($idOrConditions)->set($data)->update();
        }
        return $this->update($idOrConditions, $data);
    }

    /**
     * Atomically add (positive) or subtract (negative) a quantity delta for a
     * store+product. Relies on the unique key on (store_id, product_id) to
     * upsert in a single statement instead of a read-then-write, so
     * concurrent/duplicate calls can't create duplicate rows or race each
     * other. Result is clamped at 0 (stock can't go negative).
     */
    public function adjustQuantity(int $storeId, int $productId, int $delta): void
    {
        $this->db->query(
            "INSERT INTO stocks (product_id, store_id, warehouse_id, type, quantity, puritem_id, datte)
             VALUES (?, ?, 0, 0, GREATEST(0, ?), '0', CURDATE())
             ON DUPLICATE KEY UPDATE quantity = GREATEST(0, quantity + ?)",
            [$productId, $storeId, $delta, $delta]
        );
    }
}
