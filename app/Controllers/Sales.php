<?php

namespace App\Controllers;

use App\Controllers\BaseController;

class Sales extends BaseController
{
    protected $session;
    protected $register;

    public function __construct()
    {
        $this->session = session();

        if (!$this->session->get('user')) {
            redirect()->to('/login')->send();
            exit;
        }

        $this->register = $this->session->get('register') ?? false;
    }

    public function index()
    {
        return $this->render('sale', [
            'register' => $this->register,
        ]);
    }

    public function quotation()
    {
        return $this->render('sales/qsale', [
            'register' => $this->register,
        ]);
    }

    public function proreturn()
    {
        return $this->render('returnprosales', [
            'register' => $this->register,
        ]);
    }
}
