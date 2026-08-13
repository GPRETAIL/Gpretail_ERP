<?php

namespace App\Models;

use CodeIgniter\Model;

class ComboItemModel extends Model
{
    protected $table            = 'combo_items'; // Your table name
    protected $primaryKey       = 'id';           // Assuming 'id' is primary key

    protected $allowedFields    = [
        'combo_id',
        'product_id',
        'quantity',
        'price',
        'attime'
        // Add your real columns here
    ];

    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';
    protected $returnType       = 'object';
    protected $useSoftDeletes   = false;

    // You can define custom methods if needed later
}
