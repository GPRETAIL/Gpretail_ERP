<?php

namespace App\Controllers;

use CodeIgniter\Controller;
use CodeIgniter\Database\BaseConnection;
use Config\Database;

class Price extends BaseController
{
    protected $db;
    protected $session;

    public function __construct()
    {
        $this->db = Database::connect();
        $this->session = session();

        // Redirect if user not logged in
        if (!$this->session->get('user')) {
            return redirect()->to('/login')->send();
        }
    }

    public function index()
    {
        return $this->render('price/view');
    }

    public function addajax()
    {
        date_default_timezone_set(config('App')->appTimezone ?? 'Asia/Kolkata');
        $date = date("Y-m-d H:i:s");
        $name = $this->request->getPost('name');

        // Insert new brand
        $this->db->table('brand')->insert([
            'name' => $name,
            'created_at' => $date,
            'status' => 1
        ]);

        // Return updated brand options
        $builder = $this->db->table('brand')->orderBy('name', 'ASC');
        $brands = $builder->get()->getResultArray();

        $options = '';
        foreach ($brands as $brand) {
            $options .= '<option value="' . $brand['id'] . '">' . $brand['name'] . '</option>';
        }

        echo $options;
        exit;
    }

    public function add()
    {
        date_default_timezone_set(config('App')->appTimezone ?? 'Asia/Kolkata');
        $date = date("Y-m-d H:i:s");
        $name = $this->request->getPost('CategoryName');

        // Check for duplicates
        $existing = $this->db->table('brand')->where('name', $name)->countAllResults();
        if ($existing == 0) {
            $this->db->table('price_master')->insert([
                'name' => $name,
                'created_at' => $date,
                'status' => 0
            ]);
        }

        return redirect()->to('/price');
    }
  
    public function edit($id = null): mixed
    {
        $userRole = $this->session->get('user')->role ?? null;
        $permission = $this->db->table('permission_new')->where('nname', $userRole)->get()->getRowArray();
        // dd($permission['bre']);
       
        if ($permission['bre'] != 1) {
            return redirect()->to('/');
        }

        if ($this->request->getMethod() == 'POST') {
            $name = $this->request->getPost('CategoryName');
        
            $exists = $this->db->table('price_master')
                ->where('id !=', $id)
                ->where('name', $name)
                ->countAllResults();

            if ($exists == 0) {
                $this->db->table('price_master')
                    ->where('id', $id)
                    ->update(['name' => $name]);
                return redirect()->to('/price');
            }
        }

        return $this->render('price/edit', ['id' => $id]);
    }


    public function delete($id)
    {
        $row = $this->db->table('price_master')->where(['id' => $id, 'status' => 0])->get()->getRow();

        if ($row) {
            $this->db->table('price_master')->where(['id' => $id, 'status' => 0])->delete();
        }

        return redirect()->to('/price');
    }
}
