<?php

namespace App\Controllers;

use App\Models\Category;
use CodeIgniter\Controller;

class Help extends BaseController
{
    protected $user;

    public function __construct()
    {
        helper(['url']);
        $session = session();
        $this->user = $session->get('user');

        if (!$this->user) {
            return redirect()->to(site_url('login'))->send();
        }
    }

    public function index()
    {
        $data['categories'] = model(Category::class)->findAll();
        return view('help', $data);
    }
}
