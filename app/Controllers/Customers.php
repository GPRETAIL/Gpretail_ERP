<?php

namespace App\Controllers;

use App\Models\CustomerModel;
use App\Models\WarehouseModel;
use App\Models\StoreModel;
use App\Models\UserModel;
use CodeIgniter\Controller;

class Customers extends BaseController
{
    protected $customerModel;
    protected $warehouseModel;
    protected $storeModel;
    protected $userModel;

    public function __construct()
    {
        helper(['url', 'form']);
        $this->customerModel  = new CustomerModel();
        $this->warehouseModel = new WarehouseModel();
        $this->storeModel     = new StoreModel();
        $this->userModel      = new UserModel();
    }

    public function index()
    {
        $session = session();
        $user = $session->get('user');

        if (!$user) {
            return redirect()->to('login');
        }

        // Use object access
        $role = $user?->role ?? '';

        $db = \Config\Database::connect();
        $permission = $db->table('permission_new')->where('nname', $role)->get()->getRowArray();
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();

        $data = [
            'customers'  => $this->customerModel->findAll(),
            'user'       => $user,
            'permission' => $permission,
            'settings'   => $settings,
            'db'         => $this->db,
        ];

        return $this->render('customer/view', $data);
    }

    public function add()
    {
        $phone = $this->request->getPost('phone');
        $exists = array();
        if (!empty($phone)) {
            $exists = $this->customerModel->where('phone', $phone)->find();
        }

        if (!$exists) {
            $data = $this->request->getPost();
            $data['created_at'] = date('Y-m-d H:i:s');
            $this->customerModel->insert($data);
        }

        return redirect()->to('customers');
    }

    public function addn()
    {
        $phone = $this->request->getPost('phone');
        $exists = $this->customerModel->where('phone', $phone)->find();

        if (!$exists) {
            $data = $this->request->getPost();
            $data['created_at'] = date('Y-m-d H:i:s');
            $this->customerModel->insert($data);
        }

        return redirect()->to('/');
    }

    public function viewcustomer($id = null)
    {
        $data = [
            'warehouses' => $this->warehouseModel->findAll(),
            'Stores'     => $this->storeModel->findAll(),
            'Users'      => $this->userModel->findAll(),
            'Timezones'  => $this->tz_list(),
            'myidd'      => $id,
        ];

        return view('customerview', $data);
    }



    public function edit($id = null)
    {
        $session = session();
        $user = $session->get('user');

        if (!$user || empty($user->role)) {
            return redirect()->to('/login');
        }

        $role = $user->role;
        $db = \Config\Database::connect();
        $perm = $db->table('permission_new')->where('nname', $role)->get()->getRowArray();

        if (($perm['cue'] ?? 0) != 1) {
            return redirect()->to('/');
        }

        if ($this->request->getMethod() === 'POST') {
            $postData = $this->request->getPost();

            if ($this->customerModel->update($id, $postData)) {
                return redirect()->to('/customers')->with('success', 'Customer updated successfully.');
            } else {
                return redirect()->back()->with('error', 'Update failed.');
            }
        }

        $customer = $this->customerModel->find($id);

        if (!$customer) {
            return redirect()->to('/customers')->with('error', 'Customer not found.');
        }

        return $this->render('customer/edit', ['customer' => $customer]);
    }

    public function delete($id = null)
    {
        $this->customerModel->delete($id);
        return redirect()->to('customers');
    }

    public function tz_list()
    {
        return \DateTimeZone::listIdentifiers();
    }
}
