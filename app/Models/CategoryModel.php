<?php

namespace App\Models;

use CodeIgniter\Model;

class CategoryModel extends Model
{
    protected $table = 'categories';
    protected $primaryKey = 'id';
    protected $allowedFields = ['name', 'description', 'attime']; // ✅ Adjust these fields to match your table columns
    protected $returnType = 'object';
    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';

    // Function to get all categories
    public function getAllCategories()
    {
        return $this->orderBy('id', 'DESC')->findAll();
    }

    // Function to get a category by ID
    public function getCategoryById($id)
    {
        return $this->find($id);
    }

    // Function to create a new category
    public function createCategory($data)
    {
        return $this->insert($data);
    }

    // Function to update an existing category
    public function updateCategory($id, $data)
    {
        return $this->update($id, $data);
    }

    // Function to delete a category
    public function deleteCategory($id)
    {
        return $this->delete($id);
    }

    // Function to count all categories
    public function countCategories()
    {
        return $this->countAllResults();
    }
}
