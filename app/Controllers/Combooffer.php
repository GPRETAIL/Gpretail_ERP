<?php

namespace App\Controllers;

use App\Models\ProductModel;
use App\Models\StockModel;
use App\Models\StockTransferModel;
use App\Models\RegisterModel;
use App\Models\UserModel;
use App\Models\SettingModel;
use CodeIgniter\Controller;
use Config\Database;

class ComboOffer extends BaseController
{
    protected $db;
    protected $session;
    protected $register;
    protected $store;
    protected $setting;

    public function __construct()
    {
        helper(['form', 'url']);
        $this->db = Database::connect();
        $this->session = session();

        $this->register = $this->session->get('registerr') ?? false;
        $this->store = $this->session->get('store') ?? false;

        $settingModel = new SettingModel();
        $this->setting = $settingModel->find(1);
        date_default_timezone_set($this->setting->timezone);
    }

    public function index()
    {
        $settingModel = new SettingModel();
        return $this->render('combooffer', [
            'register' => $this->register,
        ]);
    }
    public function add()
    {
        $session = session();
        $db = \Config\Database::connect();

        // Fetch permission for the role
        $builder = $db->table('permission_new');
        $permission = $builder->where('nname', $this->role)->get()->getRowArray();

        if (!$permission || $permission['pua'] != 1) {
            return redirect()->to('/');
        }

        return $this->render('addpurchase_combo');
    }

    public function addRowRet()
    {
        $data['count'] = $this->request->getPost('countid');
        return view('returnnew', $data);
    }

    public function findState()
    {
        $country = $this->request->getGet('country');
        $builder = $this->db->table('products');
        $products = $builder->where('brandd', $country)->get()->getResultArray();

        echo '<option value="">Select</option>';
        foreach ($products as $product) {
            echo '<option value="' . esc($product['id']) . '">' . esc($product['name']) . '</option>';
        }
        exit;
    }

    public function findStateBran()
    {
        $country = $this->request->getGet('country');
        $product = $this->db->table('products')->where('id', $country)->get()->getRowArray();
        $brand = $this->db->table('brand')->where('id', $product['brandd'])->get()->getRowArray();

        echo '<option selected="selected" value="' . esc($brand['id']) . '">' . esc($brand['name']) . '</option>';
        exit;
    }

    public function addRow()
    {
        $data['count'] = $this->request->getPost('countid');
        return view('problemaddrow', $data);
    }

    public function addRowPhy()
    {
        $data['count'] = $this->request->getPost('countid');
        return view('problemaddrowphy', $data);
    }
}
