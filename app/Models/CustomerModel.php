<?php

namespace App\Models;

use CodeIgniter\Model;

class CustomerModel extends Model
{
    protected $table = 'customers';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'name',
        'phone',
        'email',
        'discount',
        'created_at',
        'customeraddress',
        'custstate',
        'custtype',
        'gstno',
        'creddate',
        'shppingad',
        'tot_creaditpoint',
        'birthday_date',
        'anniversary_date',
        'attime',
    ];
    protected $returnType = 'object';

    // Function to get a customer by ID
    public function getCustomerById($id)
    {
        return $this->find($id);
    }

    // Function to get all customers
    public function getAllCustomers()
    {
        return $this->findAll();
    }

    // Function to create a new customer
    public function createCustomer($data)
    {
        return $this->insert($data);
    }

    // Function to update an existing customer
    public function updateCustomer($id, $data)
    {
        return $this->update($id, $data);
    }

    // Function to delete a customer
    public function deleteCustomer($id)
    {
        return $this->delete($id);
    }
}
