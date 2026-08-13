<?php

namespace App\Models;

use CodeIgniter\Model;

class Sale_item extends Model
{
    protected $table            = 'sale_items';
    protected $primaryKey       = 'id';
    protected $allowedFields    = ['product_id', 'name', 'qt', 'price', 'total', 'date']; // Add all allowed DB fields here
    protected $useTimestamps    = false;

    /**
     * Execute raw SQL and return result as array of objects.
     */
    public function findBySql(string $sql)
    {
        return $this->db->query($sql)->getResult();
    }

    /**
     * Equivalent of static find($id)
     */
    public function findById($id)
    {
        return $this->where('id', $id)->first();
    }

    /**
     * Get all records with optional where conditions.
     */
    public function getAll(array $where = [])
    {
        return $this->where($where)->findAll();
    }

    /**
     * Insert a new record and return insert ID.
     */
    public function createItem(array $data)
    {
        $this->insert($data);
        return $this->getInsertID();
    }
}
