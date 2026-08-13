<?php

namespace App\Models;

use CodeIgniter\Model;

class HoldModel extends Model
{
    protected $table = 'holds';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'number',
        'time',
        'register_id',
        'attime'
    ]; // ✅ Update based on your `holds` table columns
    protected $returnType = 'object';
    protected $useTimestamps = false;


    // Get a hold by ID
    public function getHoldById($id)
    {
        return $this->find($id);
    }

    // Get all holds
    public function getAllHolds()
    {
        return $this->findAll();
    }

    // Get the first hold (by ID ascending)
    public function getFirstHold()
    {
        return $this->orderBy('id', 'ASC')->first();
    }

    // Get the last hold (by ID descending)
    public function getLastHold()
    {
        return $this->orderBy('id', 'DESC')->first();
    }

    // Create a new hold
    public function createHold($data)
    {
        return $this->insert($data);
    }

    // Update a hold
    public function updateHold($id, $data)
    {
        return $this->update($id, $data);
    }

    // Delete a hold
    public function deleteHold($id)
    {
        return $this->delete($id);
    }

    // Get last hold dynamically with optional conditions
    public function lastWhere(array $conditions = [])
    {
        return $this->where($conditions)->orderBy('id', 'DESC')->first();
    }

    // Find a hold by conditions
    public function findWhere($where)
    {
        return $this->where($where)->first();
    }

    // Find all holds matching conditions
    public function allWhere($where = [])
    {
        return $this->where($where)->findAll();
    }

    // Create hold with dynamic data
    public function createDynamicHold($data)
    {
        return $this->insert($data);
    }

    // Update multiple holds by conditions
    public function updateAllWhere(array $conditions, array $data)
    {
        return $this->where($conditions)->set($data)->update();
    }

    // Delete all holds matching conditions
    public function deleteAllWhere($where = [])
    {
        return $this->where($where)->delete();
    }

    // Update specific attributes for a hold
    public function updateAttributes($id, $data)
    {
        return $this->update($id, $data);
    }
}
