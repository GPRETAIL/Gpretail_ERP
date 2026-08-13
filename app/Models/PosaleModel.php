<?php

namespace App\Models;

use CodeIgniter\Model;

class PosaleModel extends Model
{
    protected $table = 'posales';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'user_id',
        'store_id',
        'total',
        'attime',
        'status',
        'qt_id',
        'number',
        'attime'
    ]; // 🔥 Adjust based on your `posales` table
    protected $returnType = 'object';
    protected $useTimestamps = false; // If you have `created_at`, `updated_at` columns

    // protected $createdField  = 'attime';
    // protected $updatedField  = ''; // Leave blank or omit to disable updated_at

    // Function to get a posale by ID
    public function getPosaleById($id)
    {
        return $this->find($id);
    }

    // Function to get all posales
    public function getAllPosales()
    {
        return $this->findAll();
    }

    // Function to get the first posale
    public function getFirstPosale()
    {
        return $this->orderBy('id', 'ASC')->first();
    }

    // Function to get the last posale
    public function getLastPosale()
    {
        return $this->orderBy('id', 'DESC')->first();
    }

    // Create a new posale
    public function createPosale($data)
    {
        return $this->insert($data);
    }

    // Update a posale
    public function updatePosale($id, $data)
    {
        return $this->update($id, $data);
    }

    // Delete a posale
    public function deletePosale($id)
    {
        return $this->delete($id);
    }

    // Dynamic "first" with optional conditions
    public function firstWhere(array $conditions = [])
    {
        return $this->where($conditions)->orderBy('id', 'ASC')->first();
    }

    // Dynamic "last" with optional conditions
    public function lastWhere(array $conditions = [])
    {
        return $this->where($conditions)->orderBy('id', 'DESC')->first();
    }

    // Find single record by any condition
    public function findWhere(array $conditions = [])
    {
        return $this->where($conditions)->first();
    }

    // Find all matching records
    public function allWhere(array $conditions = [])
    {
        return $this->where($conditions)->findAll();
    }

    // Find all matching records with ordering
    public function allOrderBy(array $conditions = [], $orderBy = 'ASC')
    {
        return $this->where($conditions)->orderBy('attime', $orderBy)->findAll();
    }

    // Update multiple posales based on condition
    public function updateAll(array $conditions, array $data)
    {
        return $this->where($conditions)->set($data)->update();
    }

    // Delete multiple posales based on condition
    public function deleteAllWhere(array $conditions)
    {
        return $this->where($conditions)->delete();
    }
}
