<?php

namespace App\Models;

use CodeIgniter\Model;

class SaleModel extends Model
{
    protected $table = 'sales';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'client_id',
        'clientname',
        'tax',
        'subtotal',
        'discount_indujul',
        'total',
        'selddate',
        'modified_at',
        'created_by',
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
        'created_at',
        'attime',
        'sales.selddate',
        'status',
    ];
    protected $returnType = 'object';
    protected $useTimestamps = false; // Only if your table has created_at, updated_at

    protected $selectColumn = [
        'client_id',
        'clientname',
        'tax',
        'subtotal',
        'discount_indujul',
        'total',
        'selddate',
        'modified_at',
        'created_by',
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
        'sales.id as ssid',
        'sales.status as ssstatus',
        'customers.name as cname',
        'stores.name as ssname',
        "sales.attime",
        'sales.selddate',
    ];

    /**
     * Find record by custom SQL
     */
    public function findBySql($sql)
    {
        return $this->db->query($sql)->getResult();
    }

    /**
     * Find one by ID
     */
    public function findSale($id)
    {
        return $this->where('id', $id)->first();
    }

    /**
     * Get all sales
     */
    public function allSales()
    {
        return $this->findAll();
    }

    /**
     * Create a sale
     */
    public function createSale($data)
    {
        $this->insert($data);
        return $this->insertID();
    }

    /**
     * Sales Report
     */
    public function salesReport($supplierId, $from, $to)
    {
        return $this->db->table($this->table)
            ->select(implode(',', $this->selectColumn))
            ->join('registers', 'sales.register_id = registers.id', 'left')
            ->join('customers', 'sales.client_id = customers.id', 'left')
            ->join('stores', 'registers.store_id = stores.id', 'left')
            ->where('sales.client_id', $supplierId)
            ->where('sales.created_at >=', $from)
            ->where('sales.created_at <=', $to)
            ->orderBy('sales.id', 'DESC')
            ->get()
            ->getResult();
    }

    /**
     * Prepare query for datatable
     */
    protected function prepareQuery($supplierId, $from, $to)
    {
        $builder = $this->db->table($this->table)
            ->select(implode(',', $this->selectColumn))
            ->join('registers', 'sales.register_id = registers.id', 'left')
            ->join('customers', 'sales.client_id = customers.id', 'left')
            ->join('stores', 'registers.store_id = stores.id', 'left')
            ->where('sales.client_id', $supplierId)
            ->where('sales.created_at >=', $from)
            ->where('sales.created_at <=', $to);

        if ($searchValue = post('search.value')) {
            if (is_numeric($searchValue)) {
                $builder->like('sales.id', $searchValue);
            }
        }

        return $builder;
    }

    /**
     * Get paginated sales data (Datatables)
     */
    public function getDatatables($supplierId, $from, $to, $limit = 10, $offset = 0)
    {
        $builder = $this->prepareQuery($supplierId, $from, $to);

        if (isset($_POST['order'])) {
            $builder->orderBy($this->selectColumn[$_POST['order'][0]['column']], $_POST['order'][0]['dir']);
        } else {
            $builder->orderBy('sales.id', 'desc');
        }

        return $builder->limit($limit, $offset)->get()->getResult();
    }

    /**
     * Get count of filtered data
     */
    public function getFilteredCount($supplierId, $from, $to)
    {
        return $this->prepareQuery($supplierId, $from, $to)->countAllResults(false);
    }

    /**
     * Get total sales
     */
    public function getTotalSales()
    {
        return $this->countAllResults();
    }
}
