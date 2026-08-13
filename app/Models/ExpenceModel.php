<?php

namespace App\Models;

use CodeIgniter\Model;

class ExpenceModel extends Model
{
    protected $table            = 'expences';
    protected $primaryKey       = 'id';
    protected $allowedFields    = ['date', 'reference', 'amount', 'category_id', 'store_id'];
    protected $useTimestamps    = false;

    protected $columnSearch     = ['id', 'date', 'reference', 'amount', 'category_id', 'store_id'];
    protected $order            = ['created_date' => 'desc'];

    protected function getRequest()
    {
        return service('request');
    }

    private function _getDatatablesQuery()
    {
        $builder = $this->builder(); // CI4 Query Builder
        $request = $this->getRequest();
        $post = $request->getPost();

        $searchValue = isset($post['search']['value']) ? ltrim($post['search']['value'], '0') : '';

        if (!empty($searchValue)) {
            $builder->groupStart();
            foreach ($this->columnSearch as $index => $column) {
                if ($index === 0) {
                    $builder->like($column, $searchValue);
                } else {
                    $builder->orLike($column, $searchValue);
                }
            }
            $builder->groupEnd();
        }

        // Ordering
        if (isset($post['order'])) {
            $orderCol = $post['order'][0]['column'];
            $orderDir = $post['order'][0]['dir'];
            $builder->orderBy($this->columnSearch[$orderCol], $orderDir);
        } else {
            $builder->orderBy(key($this->order), $this->order[key($this->order)]);
        }

        return $builder;
    }

    public function get_datatables()
    {
        $request = $this->getRequest();
        $post = $request->getPost();

        $builder = $this->_getDatatablesQuery();

        if ($post['length'] != -1) {
            $builder->limit((int)$post['length'], (int)$post['start']);
        }

        return $builder->get()->getResult();
    }

    public function countFiltered()
    {
        return $this->_getDatatablesQuery()->countAllResults(false);
    }

    public function countAll()
    {
        return $this->countAllResults();
    }

    public function getById($id)
    {
        return $this->find($id);
    }

    public function saveData($data)
    {
        return $this->insert($data);
    }

    public function updateData($where, $data)
    {
        if (is_array($where)) {
            return $this->builder()->where($where)->update($data);
        } else {
            return $this->update($where, $data);
        }
    }

    public function deleteById($id)
    {
        return $this->delete($id);
    }
}
