<?php

namespace App\Models;

use CodeIgniter\Model;
use App\Models\SettingModel;

class InvoiceModel extends Model
{
    protected $table            = 'sales';
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
    ];
    protected $returnType       = 'object';
    protected $useTimestamps    = true;   // Will automatically manage created_at and updated_at fields
    protected $createdField     = 'attime';
    protected $updatedField     = '';

    protected $columnSearch = [
        'id',
        'clientname',
        'tax',
        'discount',
        'total',
        'created_by',
        'totalitems',
        'status'
    ];

    protected $order = [
        'id' => 'desc'
    ];

    /**
     * For DataTables server-side processing
     */
    public function getDatatables($requestData = null)
    {
        $settingModel = new SettingModel();
        $setting = $settingModel->find(1);

        $table = $setting->themblock == 1 ?  'dsales' : 'sales';
        $builder = $this->db->table($table);

        // Search
        if (!empty($requestData['search']['value'])) {
            $searchValue = trim($requestData['search']['value']);
            $builder->groupStart();
            foreach ($this->columnSearch as $key => $item) {
                if ($key === 0) {
                    $builder->like($item, $searchValue);
                } else {
                    $builder->orLike($item, $searchValue);
                }
            }
            $builder->groupEnd();
        }

        // Order
        if (isset($requestData['order'])) {
            $columnIdx = $requestData['order'][0]['column'];
            $columnDir = $requestData['order'][0]['dir'];
            $columnName = $this->columnSearch[$columnIdx];
            $builder->orderBy($columnName, $columnDir);
        } else {
            $builder->orderBy(key($this->order), $this->order[key($this->order)]);
        }

        // Limit
        if (isset($requestData['length']) && $requestData['length'] != -1) {
            $builder->limit($requestData['length'], $requestData['start']);
        }

        return $builder->get()->getResultArray();
    }

    /**
     * Count filtered records
     */
    public function countFiltered($requestData)
    {
        $builder = $this->builder();

        if (!empty($requestData['search']['value'])) {
            $searchValue = trim($requestData['search']['value']);
            $builder->groupStart();
            foreach ($this->columnSearch as $key => $item) {
                if ($key === 0) {
                    $builder->like($item, $searchValue);
                } else {
                    $builder->orLike($item, $searchValue);
                }
            }
            $builder->groupEnd();
        }

        return $builder->countAllResults();
    }

    /**
     * Count all records
     */
    public function countAll()
    {
        return $this->countAllResults();
    }

    /**
     * Get invoice by ID
     */
    public function getById($id)
    {
        return $this->find($id);
    }

    /**
     * Save new invoice
     */
    public function saveInvoice($data)
    {
        return $this->insert($data);
    }

    /**
     * Update invoice
     */
    public function updateInvoice($id, $data)
    {
        return $this->update($id, $data);
    }

    /**
     * Delete invoice by ID
     */
    public function deleteInvoice($id)
    {
        return $this->delete($id);
    }
    public function delete_by_id($id)
    {
        $builder = $this->db->table('purchases');
        return $builder->where('id', $id)->delete();
    }
}
