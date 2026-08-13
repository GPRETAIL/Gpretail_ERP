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

class ComboOffers extends BaseController
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

        if (!$this->session->get('user')) {
            return redirect()->to('/login')->send();
        }
    }

    public function index()
    {
        $user = $this->session->get('user');
        $perm = $this->db->table('permission_new')->where('nname', $user['role'])->get()->getRowArray();
        if ($perm['en1'] ?? 0) {
            return view('combooffers', ['register' => $this->register]);
        }
        return redirect()->to('/');
    }

    public function listItems()
    {
        $user = $this->session->get('user');
        $perm = $this->db->table('permission_new')->where('nname', $user['role'])->get()->getRowArray();
        if ($perm['en2'] ?? 0) {
            return view('ppproductionentryw', ['register' => $this->register]);
        }
        return redirect()->to('/');
    }

    public function addRowRet()
    {
        return view('returnnew', ['count' => $this->request->getPost('countid')]);
    }

    public function findState()
    {
        $country = $this->request->getGet('country');
        $products = $this->db->table('products')->where('brandd', $country)->get()->getResultArray();

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
        return view('problemaddrow', ['count' => $this->request->getPost('countid')]);
    }

    public function addRowPhy()
    {
        return view('problemaddrowphy', ['count' => $this->request->getPost('countid')]);
    }

    public function stockAdd()
    {
        $register = RegisterModel::find($this->register);
        $user = UserModel::find($register->user_id);
        $createdBy = $user->firstname . ' ' . $user->lastname;
        $storeid = $register->store_id;

        $warr = $this->request->getPost('warr');
        $avvl = $this->request->getPost('avalqqt');
        $productId = $this->request->getPost('statediv');
        $quantities = $this->request->getPost('srrtr');

        $total = array_sum($quantities);

        if ($avvl >= $total) {
            $stores = $this->db->table('stores')->orderBy('name')->get()->getResultArray();
            foreach ($stores as $index => $store) {
                $qty = $quantities[$index];
                $date = date('Y-m-d');
                if ($qty > 0) {
                    $stock = $this->db->table('stocks')
                        ->where('product_id', $productId)
                        ->where('store_id', $store['id'])
                        ->get()
                        ->getRowArray();

                    $this->db->table('stock_transfer')->insert([
                        'war_id' => $warr,
                        'store_id' => $store['id'],
                        'pro_id' => $productId,
                        'qty' => $qty,
                        'tyoftrans' => 1,
                        'date' => $date,
                        'bywhom' => $createdBy,
                        'perselphy_ids' => 0,
                    ]);

                    if ($stock) {
                        $updatedQty = $stock['quantity'] + $qty;
                        $this->db->table('stocks')->where([
                            'product_id' => $productId,
                            'store_id' => $store['id']
                        ])->update([
                            'type' => 0,
                            'quantity' => $updatedQty,
                            'datte' => $date,
                            'warehouse_id' => $warr
                        ]);
                    } else {
                        $this->db->table('stocks')->insert([
                            'product_id' => $productId,
                            'type' => 'IN',
                            'store_id' => $store['id'],
                            'warehouse_id' => $warr,
                            'quantity' => $qty,
                            'datte' => $date,
                        ]);
                    }
                }
            }
        }

        return redirect()->to('/purchase');
    }
}
