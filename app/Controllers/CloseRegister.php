<?php

namespace App\Controllers;

use App\Models\CustomerModel;
use CodeIgniter\Controller;
use Config\Database;

class CloseRegister extends BaseController
{
    protected $db;

    public function __construct()
    {
        $this->db = Database::connect();

        if (!session()->get('user')) {
            return redirect()->to('/login')->send();
        }
    }

    public function index()
    {
        $model = new CustomerModel();
        $data['customers'] = $model->findAll();

        return view('customer/view', $data);
    }

    public function add()
    {
        $phone = $this->request->getPost('phone');

        $builder = $this->db->table('customers');
        $exists = $builder->where('phone', $phone)->countAllResults();

        if ($exists == 0) {
            $data = $this->request->getPost();
            $data['created_at'] = date("Y-m-d H:i:s");

            $model = new CustomerModel();
            $model->insert($data);
        }

        return redirect()->to('/customers');
    }

    public function addn()
    {
        $phone = $this->request->getPost('phone');

        $builder = $this->db->table('customers');
        $exists = $builder->where('phone', $phone)->countAllResults();

        if ($exists == 0) {
            $data = $this->request->getPost();
            $data['created_at'] = date("Y-m-d H:i:s");

            $model = new CustomerModel();
            $model->insert($data);
        }

        return redirect()->to('/');
    }

    public function edit($id = null)
    {
        if (!$id) {
            return redirect()->to('/customers');
        }

        $role = session()->get('user')['role'] ?? '';
        $perm = $this->db->table('permission_new')->where('nname', $role)->get()->getRowArray();

        if (!isset($perm['cue']) || $perm['cue'] != 1) {
            return redirect()->to('/');
        }

        $model = new CustomerModel();

        if ($this->request->getPost()) {
            $model->update($id, $this->request->getPost());
            return redirect()->to('/customers');
        }

        $data['customer'] = $model->find($id);
        return view('customer/edit', $data);
    }

    public function delete($id)
    {
        $model = new CustomerModel();
        $model->delete($id);

        return redirect()->to('/customers');
    }
}
