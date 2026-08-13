<?php

namespace App\Models;

use CodeIgniter\Model;

class WarehouseModel extends Model
{
    protected $table            = 'warehouses';
    protected $primaryKey       = 'id';
    protected $allowedFields    =
    [
        'name',
        'phone',
        'email',
        'adresse',
        'location',
        'created_at',
        'updated_at'
    ];

    // Get all records
    public function getAll()
    {
        return $this->findAll();
    }

    // Get the first row
    public function getFirst()
    {
        return $this->first();
    }

    // Insert a new row
    public function createWarehouse(array $data)
    {
        return $this->insert($data);
    }
}
