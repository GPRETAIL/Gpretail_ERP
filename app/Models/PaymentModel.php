<?php

namespace App\Models;

use CodeIgniter\Model;

class PaymentModel extends Model
{
    protected $table            = 'payements';
    protected $primaryKey       = 'id';
    protected $allowedFields    = [
        'amount',
        'method',
        'reference',
        'customer_id',
        'invoice_id',
        'date',
        'attime'
    ]; // Adjust fields as per actual DB
    protected $returnType       = 'object';

    /**
     * Get a single payment by ID
     */
    public function getPaymentById($id)
    {
        return $this->find($id);
    }

    /**
     * Insert a new payment
     */
    public function createPayment(array $data)
    {
        return $this->insert($data);
    }
}
