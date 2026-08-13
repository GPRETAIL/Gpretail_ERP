<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\SupplierModel;
use App\Models\SettingModel;
use CodeIgniter\Database\BaseConnection;

class Suppliers extends BaseController
{
    protected $supplierModel;
    protected $db;
    protected $session;

    public function __construct()
    {
        $this->supplierModel = new SupplierModel();
        $this->SettingModel = new SettingModel();
        $this->db = \Config\Database::connect();
        $this->session = session();

        if (!$this->session->get('user')) {
            redirect()->to('/login')->send();
            exit;
        }
    }

    public function index()
    {
        $data['suppliers'] = $this->supplierModel->findAll();
        $data['user'] = $this->user;
        $data['db'] = $this->db;
        return $this->render('supplier/view', $data);
    }

    public function add()
    {
        $data = $this->request->getPost();
        $data['created_at'] = date("Y-m-d H:i:s");

        $this->supplierModel->insert($data);

        return redirect()->to('/suppliers');
    }

    public function addajax()
    {
        $data = $this->request->getPost();
        $data['created_at'] = date("Y-m-d H:i:s");

        $this->supplierModel->insert($data);

        $options = '';
        $suppliers = $this->db->table('suppliers')->orderBy('name', 'ASC')->get()->getResultArray();

        foreach ($suppliers as $supplier) {
            $options .= '<option value="' . $supplier['id'] . '">' . $supplier['name'] . '</option>';
        }

        return $this->response->setBody($options);
    }

    public function edit($id = null)
    {
        $role = session()->get('user')->role;
        $permission = $this->db->table('permission_new')->where('nname', $role)->get()->getRowArray();

        if (!isset($permission['sue']) || $permission['sue'] != 1) {
            return redirect()->to('/');
        }

        if ($this->request->getMethod() === 'POST') {
            $postData = $this->request->getPost();
            $this->supplierModel->update($id, $postData);
            return redirect()->to('/suppliers');
        }

        $data['supplier'] = $this->supplierModel->find($id);
        return $this->render('supplier/edit', $data);
    }

    public function delete($id)
    {
        $this->supplierModel->delete($id);

        return redirect()->to('/suppliers');
    }
}
