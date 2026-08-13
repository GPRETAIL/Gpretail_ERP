<?php

namespace App\Models;

class Expense
{
    protected $expenseModel;

    public function __construct()
    {
        $this->expenseModel = new ExpenseModel();
    }

    public function create(array $data)
    {
        return $this->expenseModel->insert($data);
    }

    public function find($id)
    {
        return $this->expenseModel->find($id);
    }

    public function all()
    {
        return $this->expenseModel->findAll();
    }

    public function update($id, array $data)
    {
        return $this->expenseModel->update($id, $data);
    }

    public function delete($id)
    {
        return $this->expenseModel->delete($id);
    }

    public function countAll()
    {
        return $this->expenseModel->countAllResults();
    }

    public function search($searchValue)
    {
        return $this->expenseModel
            ->like('reference', $searchValue)
            ->orLike('amount', $searchValue)
            ->findAll();
    }
}
