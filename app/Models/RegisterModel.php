<?php

namespace App\Models;

use CodeIgniter\Model;

class RegisterModel extends Model
{
    protected $table            = 'registers';
    protected $primaryKey       = 'id';
    protected $allowedFields    =
    [
        'attime'
    ]; // Add fields if you want mass-assignment
    protected $returnType       = 'object';

    /**
     * Find a single register by ID
     */
    public function findRegister($id)
    {
        return $this->find($id);
    }

    /**
     * Find register(s) by ID using custom query (returns multiple rows)
     */
    public function findBySql($id)
    {
        return $this->where('id', $id)->findAll();
    }
}
