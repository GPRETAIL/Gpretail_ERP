<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use Config\Services;
use Config\Database;

class Quotationview extends BaseController
{
    protected $session;
    protected $db;
    protected $user;
    protected $register;

    public function __construct()
    {
        helper(['url']);
        $this->session = Services::session();
        $this->db = Database::connect();

        $this->user = $this->session->get('user');
        if (!$this->user) {
            return redirect()->to('/login')->send();
        }

        $this->register = $this->session->get('register') ?? false;
    }

    public function index()
    {
        return view('saleq', ['register' => $this->register]);
    }

    public function quotation()
    {
        return view('qsale', ['register' => $this->register]);
    }

    public function proreturn()
    {
        return view('returnprosales', ['register' => $this->register]);
    }
}
