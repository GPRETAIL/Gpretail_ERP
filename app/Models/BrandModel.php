<?php

namespace App\Models;

use CodeIgniter\Model;

class BrandModel extends Model
{
    protected $table            = 'brand'; // assuming your table is 'brand'
    protected $primaryKey       = 'id';

    protected $allowedFields    = [
        'name',    // Add all brand table fields here
        'description',
        'image',   // If your brand table has image field
        'created_at',
        'attime'
    ];

    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';

    protected $returnType       = 'object'; // So you get result as object (like $brand->name)
    protected $useSoftDeletes   = false;    // Change to true if you have soft delete in table

    // Custom methods
    public function getBrandById($id)
    {
        return $this->where('id', $id)->first();
    }

    public function getAllBrands()
    {
        return $this->orderBy('name', 'asc')->findAll();
    }

    public function createBrand($data)
    {
        return $this->insert($data);
    }

    public function updateBrand($id, $data)
    {
        return $this->update($id, $data);
    }

    public function deleteBrand($id)
    {
        return $this->delete($id);
    }
}
