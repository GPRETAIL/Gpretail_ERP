<?php

namespace App\Controllers;

use CodeIgniter\Controller;

class Error404 extends BaseController
{
    public function index()
    {
        return view('errors/custom_404');
    }
}
