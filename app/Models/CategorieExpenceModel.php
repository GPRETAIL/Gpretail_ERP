<?php

namespace App\Models;

use CodeIgniter\Model;

class CategorieExpenceModel extends Model
{
    protected $table            = 'categorie_expences'; // Table name
    protected $primaryKey       = 'id';

    protected $allowedFields    = ['name', 'description', 'created_at', 'attime'];
    // 👆 Adjust according to your actual table fields!

    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';  // Set to true if you have created_at / updated_at columns
    protected $returnType       = 'object';

    protected $useSoftDeletes   = false; // Set to true if you want soft deletion

    // Custom Methods

    public function findExpence($id)
    {
        return $this->find($id);
    }

    public function getAllExpences()
    {
        return $this->findAll();
    }

    public function createExpence($data)
    {
        return $this->insert($data);
    }

    public function deleteExpence($id)
    {
        return $this->delete($id);
    }
}
