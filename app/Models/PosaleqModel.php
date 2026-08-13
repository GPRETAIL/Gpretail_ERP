<?php

namespace App\Models;

use CodeIgniter\Model;

class PosaleqModel extends Model
{
    protected $table            = 'posaleqs';
    protected $primaryKey       = 'id';
    protected $allowedFields    = [
        'clientname',
        'tax',
        'discount',
        'total',
        'created_by',
        'totalitems',
        'status',
        'attime'
    ]; // Update fields as needed
    protected $returnType       = 'object';

    /**
     * Get all posaleqs with optional conditions
     */
    public function getAll(array $where = [])
    {
        return $this->where($where)->findAll();
    }

    /**
     * Get a single posaleq record by condition(s)
     */
    public function getOne(array $where)
    {
        return $this->where($where)->first();
    }

    /**
     * Create a new posaleq record
     */
    public function create(array $data)
    {
        return $this->insert($data);
    }

    /**
     * Delete one or more records based on condition
     */
    public function deleteByCondition(array $where)
    {
        return $this->where($where)->delete();
    }
}
