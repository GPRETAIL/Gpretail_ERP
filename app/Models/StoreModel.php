<?php

namespace App\Models;

use CodeIgniter\Model;

class StoreModel extends Model
{
    protected $table = 'stores';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'name',
        'email',
        'phone',
        'adresse',
        'footer_text',
        'country',
        'city',
        'location',
        'created_at',
        'attime'
    ]; // Adjust fields to match your DB table
    protected $returnType = 'object';
    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';

    // Function to get all stores
    public function getAllStores()
    {
        return $this->findAll();
    }

    // Function to get a store by ID
    public function getStoreById($id)
    {
        return $this->find($id);
    }

    // Function to create a new store
    public function createStore($data)
    {
        return $this->insert($data);
    }

    // Function to update an existing store
    public function updateStore($id, $data)
    {
        return $this->update($id, $data);
    }

    // Function to delete a store
    public function deleteStore($id)
    {
        return $this->delete($id);
    }
}
