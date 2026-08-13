<?php

namespace App\Controllers;

use CodeIgniter\Controller;

class WarehouseLevel extends BaseController
{
    protected $db;
    protected $session;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
        $this->session = session();

        if (! $this->session->get('user')) {
            redirect()->to('/login')->send();
        }
    }

    public function index()
    {
        $categories = $this->db->table('levels')->where('status', 1)->orderBy('name')->get()->getResult();
        return view('levels/warehouse', ['categories' => $categories]);
    }

    public function add()
    {
        $name = $this->request->getPost('CategoryName');
        $percent = $this->request->getPost('persent');
        $date = date('Y-m-d H:i:s');

        $exists = $this->db->table('levels')->where('name', $name)->countAllResults();

        if ($exists == 0) {
            $this->db->table('levels')->insert([
                'name' => $name,
                'valueper' => $percent,
                'status' => 1,
                'created_at' => $date
            ]);
        }

        return redirect()->to('/levels');
    }

    public function edit($id = null)
    {
        $user = $this->session->get('user');
        $perm = $this->db->table('permission_new')->where('nname', $user['role'])->get()->getRow();

        if ($this->request->getMethod() === 'post') {
            $name = $this->request->getPost('CategoryName');
            $percent = $this->request->getPost('persent');

            $exists = $this->db->table('levels')
                ->where('name', $name)
                ->where('id !=', $id)
                ->countAllResults();

            if ($exists == 0) {
                $this->db->table('levels')->where('id', $id)->update([
                    'name' => $name,
                    'valueper' => $percent
                ]);
            }

            return redirect()->to('/levels');
        }

        $category = $this->db->table('levels')->where('id', $id)->get()->getRow();
        return view('levels/edit', ['category' => $category]);
    }

    public function delete($id)
    {
        $exists = $this->db->table('tax')->where('id', $id)->countAllResults();

        if ($exists == 1) {
            $this->db->table('tax')->where('id', $id)->update(['status' => 0]);
        }

        return redirect()->to('/levels');
    }
}
