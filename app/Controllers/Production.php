<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\UserModel;
use App\Models\SettingModel;
use CodeIgniter\Database\BaseBuilder;

class Production extends BaseController
{
    protected $session;
    protected $setting;
    protected $register;
    protected $store;

    public function __construct()
    {
        helper(['url', 'form']);
        $this->session = session();

        $lang = $this->session->get('lang') ?? 'english';
        service('language')->setLocale($lang);

        $this->register = $this->session->get('register') ?? false;
        $this->store = $this->session->get('store') ?? false;

        $this->setting = (new SettingModel())->find(1);
        if ($this->setting && isset($this->setting['timezone'])) {
            date_default_timezone_set($this->setting['timezone']);
        }
    }

    public function index()
    {
        return view('productionentry', [
            'register' => $this->register
        ]);
    }

    public function deleteUser($id)
    {
        $userModel = new UserModel();
        $user = $userModel->find($id);

        if ($user && isset($user['avatar'])) {
            $avatarPath = FCPATH . 'files/Avatars/' . $user['avatar'];
            if (file_exists($avatarPath)) {
                unlink($avatarPath);
            }
        }

        $userModel->delete($id);
        return redirect()->to('/production');
    }

    public function findState()
    {
        $country_id = $this->request->getPost('country_id');
        $db = \Config\Database::connect();
        $query = $db->table('states')->where('country_id', $country_id)->get();
        return $this->response->setJSON($query->getResultArray());
    }

    public function stockadd()
    {
        $product_id = $this->request->getPost('product_id');
        $quantity = $this->request->getPost('quantity');

        $db = \Config\Database::connect();
        $db->table('stocks')->insert([
            'product_id' => $product_id,
            'quantity'   => $quantity,
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return $this->response->setJSON(['success' => true]);
    }

    public function addrow()
    {
        return view('production/addrow');
    }

    public function findcctn()
    {
        $term = $this->request->getPost('term');
        $db = \Config\Database::connect();

        $result = $db->table('cartons')
                     ->like('name', $term)
                     ->get()
                     ->getResultArray();

        return $this->response->setJSON($result);
    }

    public function findssss()
    {
        $keyword = $this->request->getPost('keyword');
        $db = \Config\Database::connect();

        $results = $db->table('stock_items')
                      ->like('product_name', $keyword)
                      ->get()
                      ->getResultArray();

        return $this->response->setJSON($results);
    }

    public function add()
    {
        return view('production/add', [
            'register' => $this->register
        ]);
    }

    public function addrowphy()
    {
        return view('production/addrowphy');
    }

    public function addtodbb()
    {
        $data = $this->request->getPost();

        $db = \Config\Database::connect();
        $db->table('productions')->insert($data);

        return redirect()->to('/production');
    }

    public function edit($id = false)
    {
        $db = \Config\Database::connect();
        $data = $db->table('productions')->where('id', $id)->get()->getRowArray();

        return view('production/edit', ['data' => $data]);
    }

    public function edittodbb($id = false)
    {
        $data = $this->request->getPost();

        $db = \Config\Database::connect();
        $db->table('productions')->where('id', $id)->update($data);

        return redirect()->to('/production');
    }

    public function addtodbbprodu()
    {
        $data = $this->request->getPost();

        $db = \Config\Database::connect();
        $db->table('production_items')->insert($data);

        return $this->response->setJSON(['success' => true]);
    }
}
