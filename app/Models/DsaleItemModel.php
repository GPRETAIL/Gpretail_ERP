<?php

namespace App\Models;

use CodeIgniter\Model;

class DsaleItemModel extends Model
{
    protected $table            = 'dsale_items';    // Table name
    protected $primaryKey       = 'id';             // Primary key
    // protected $allowedFields    = [
    //     'dsale_id',
    //     'product_id',
    //     'sale_id',
    //     'quantity',
    //     'price',
    //     'qt',
    //     'subtotal',
    //     'date',
    //     'total',
    //     'attime',
    //     'store_irrdd',
    //     'cgst',
    //     'sgst',
    //     'igstt',
    //     'date',
    //     'dis_per',
    //     'dis_amt',
    //     'perprice',
    //     'mrpp',
    //     'subtotal2',
    //     'tottax'
    // ];
    // 👆 Update according to your table columns!


    protected $allowedFields = [
        'sale_id',
        'product_id',
        'name',
        'perprice',
        'price',
        'qt',
        'subtotal',
        'date',
        'cgst',
        'sgst',
        'tottax',
        'dis_per',
        'dis_amt',
        'mrpp',
        'subtotal2',
        'igstt',
        'purcitemid',
        'cancel_status',
        'store_irrdd',
        'attime'
    ];

    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';         // Set true if your table has created_at/updated_at
    protected $returnType       = 'object';         // Returning results as object
    protected $useSoftDeletes   = false;            // If needed for soft deletes

    // Create a new DsaleItem record
    public function createItem(array $data)
    {
        $this->insert($data);
        return $this->insertID();
    }

    // Find a single DsaleItem by ID or by conditions
    public function findItem($id)
    {
        if (is_array($id)) {
            return $this->where($id)->first(); // search by array of conditions
        }
        return $this->find($id); // search by primary key id
    }

    // Find all DsaleItems by condition
    public function findAllItems($where = [])
    {
        $this->select('dsale_items.*, products.name');
        $this->join('products', 'products.id=dsale_items.product_id');
        if (!empty($where)) {
            return $this->where($where)->findAll();
        }
        return $this->findAll();
    }
}
