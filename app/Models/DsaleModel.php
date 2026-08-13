<?php

namespace App\Models;

use CodeIgniter\Model;

class DsaleModel extends Model
{
    protected $table            = 'dsales';     // Database table name
    protected $primaryKey       = 'id';          // Primary key field
    protected $allowedFields    = [
        'client_id',
        'clientname',
        'tax',
        'subtotal',
        'discount_indujul',
        'total',
        'selddate',
        'modified_at',
        'created_by',
        'created_at',
        'totalitems',
        'paid',
        'paidmethod',
        'taxamount',
        'discountamount',
        'register_id',
        'firstpayement',
        'sgsttaxamt',
        'lalid',
        'lalamt',
        'recivamt',
        'ballamtt',
        'yyear',
        'custrrf',
        'mobnnm',
        'custstattype',
        'kms',
        'disamtssh',
        'salesperson',
        'avail_point',
        'redeemed_dated',
        'recivamt2',
        'attime',
        'sales_org_id'
    ];
    // 👆 Adjust according to your `dsales` table fields!

    protected $useTimestamps    = false;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';
    protected $returnType       = 'object';      // Return objects
    protected $useSoftDeletes   = false;         // Change to true if soft deletes needed

    // Create a new Dsale record
    public function createDsale(array $data)
    {
        $this->insert($data);
        return $this->insertID(); // return last inserted id
    }

    // Find a single Dsale record by ID
    public function findDsale($id)
    {
        if (is_array($id)) {
            return $this->whereIn('id', $id)->findAll();
        }
        return $this->find($id);
    }

    // Find all Dsales matching given IDs
    public function findAllDsales($id)
    {
        if (is_array($id)) {
            return $this->whereIn('id', $id)->findAll();
        }
        return $this->where('id', $id)->findAll();
    }
}
