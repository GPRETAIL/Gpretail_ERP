<?php

namespace App\Models;

use CodeIgniter\Model;

class SaleItemModel extends Model
{
    protected $table = 'sale_items';
    protected $primaryKey = 'id';
    // protected $allowedFields = [
    //     'sale_id',
    //     'product_id',
    //     'product_name',
    //     'quantity',
    //     'price',
    //     'tax',
    //     'subtotal',
    //     'discount',
    //     'created_at',
    //     'updated_at',
    //     'attime',
    //     'qt',
    //     'date',
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
    // ]; // Adjust to your real fields

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

    protected $returnType = 'object';
    protected $useTimestamps = false; // if you have created_at and updated_at


    public function getItemsByProductId($productId)
    {
        return $this->select('sale_items.*, products.code, products.name')
            ->join('products', 'products.id = sale_items.product_id')
            ->where('sale_items.product_id', $productId)
            ->orderBy('sale_items.id', 'DESC')
            ->findAll();
    }

    public function getItemsBySaleId($sales_id)
    {
        return $this->select('sale_items.*, sales.*, sales.id AS sale_id, products.code, products.name')
            ->join('products', 'products.id = sale_items.product_id')
            ->join('sales', 'sales.id = sale_items.sale_id')
            ->where('sale_items.sale_id', $sales_id)
            ->orderBy('sale_items.id', 'DESC')
            ->findAll();
    }

    /**
     * Find by custom SQL
     */
    public function findBySql(string $sql)
    {
        return $this->db->query($sql)->getResult();
    }

    /**
     * Find one Sale Item by ID
     */
    public function findSaleItem($id)
    {
        return $this->where('id', $id)->first();
    }

    /**
     * Get all Sale Items based on condition
     */
    public function getAll(array $where = [])
    {
        $this->select('sale_items.*, products.name');
        $this->join('products', 'products.id=sale_items.product_id');
        if (!empty($where)) {
            return $this->where($where)->findAll();
        }
        return $this->findAll();
    }

    /**
     * Create a new Sale Item
     */
    public function createSaleItem(array $data)
    {
        $this->insert($data);
        return $this->getInsertID();
    }
}
