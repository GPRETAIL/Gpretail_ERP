<?php

namespace App\Models;

use CodeIgniter\Model;

class SupplierModel extends Model
{
    protected $table = 'suppliers';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'name',
        'phone',
        'contact',
        'email',
        'address',
        'created_at',
        'attime'
    ];
    protected $returnType = 'object';
    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';

    // Function to get a supplier by ID
    public function getSupplierById($id)
    {
        return $this->find($id);
    }

    // Function to get all suppliers
    public function getAllSuppliers()
    {
        return $this->findAll();
    }

    // Function to create a supplier
    public function createSupplier($data)
    {
        return $this->insert($data);
    }

    // Function to update an existing supplier
    public function updateSupplier($id, $data)
    {
        return $this->update($id, $data);
    }

    // Function to delete a supplier
    public function deleteSupplier($id)
    {
        return $this->delete($id);
    }
}
