<?php

namespace App\Controllers;

use App\Models\ProductModel;
use App\Models\CategoryModel;
use App\Models\CustomerModel;
use App\Models\StoreModel;
use App\Models\RegisterModel;
use App\Models\PosaleModel;
use App\Models\HoldModel;
use App\Models\StockModel;
use App\Models\SettingModel;
use CodeIgniter\Controller;

class Goodsout extends BaseController
{
    protected $user;
    protected $register;
    protected $store;
    protected $setting;

    public function __construct()
    {
        helper(['url', 'form']);
        $session = session();
        $this->user = $session->get('user') ?? null;
        $this->register = $session->get('register') ?? false;
        $this->store = $session->get('store') ?? false;
        $this->PosaleModel = new PosaleModel();
        $this->RegisterModel = new RegisterModel();
        $this->StockModel = new StockModel();
        $this->CustomerModel = new CustomerModel();
        $this->StoreModel = new StoreModel();
        $this->HoldModel = new HoldModel();
        $this->CategoryModel = new CategoryModel();

        if (!$this->user) {
            return redirect()->to(site_url('login'))->send();
        }
        $SettingModel = new SettingModel();
        $this->setting = $SettingModel->find(1);
    }

    public function index()
    {
        return $this->render('goodsoutview', [
            'register' => $this->register,
        ]);
    }

    public function edit($id = null)
    {
        date_default_timezone_set($this->setting->timezone);

        $productModel = new Product();
        $registerModel = new Register();
        $stockModel = new Stock();

        $products = $productModel->findAll();
        if ($this->register) {
            $register = $registerModel->find($this->register);
            foreach ($products as &$product) {
                if ($product['type'] == '0') {
                    $stock = $stockModel->where([
                        'store_id' => $register['store_id'],
                        'product_id' => $product['id']
                    ])->first();

                    $product['price'] = $stock && $stock['price'] > 0 ? $stock['price'] : $product['price'];
                }
            }
        }

        $data = [
            'customers'  => model('Customer_model')->findAll(),
            'products'   => $products,
            'categories' => model('Category_model')->findAll(),
            'Stores'     => model('Store_model')->findAll(),
        ];

        $posale = model('Posale_model')->first();
        if (!$posale) {
            $hold = model('Hold_model')->orderBy('id', 'DESC')->first();
            if ($hold) {
                model('Hold_model')->update($hold['id'], ['time' => date("H:i")]);
            }
        }

        return view('goodsoutedit', $data);
    }

    public function addgoodsout()
    {
        // Clear existing pending POS entries for current user
        $userId = session()->get('user_id');
        $this->PosaleModel->where(['status' => 5, 'user_id' => $userId])->delete();

        // Permission check
        $role = $this->user->role;
        $perm = db_connect()->table('permission_new')->where('nname', $role)->get()->getRowArray();
        if (!isset($perm['goa']) || $perm['goa'] != 1) {
            return redirect()->to(site_url('/'));
        }

        $productModel = new ProductModel();
        $products = $productModel->findAll();

        if ($this->register) {
            $register = $this->RegisterModel->find($this->register);
            foreach ($products as &$product) {
                if ($product->type == '0') {
                    $stock = $this->StockModel->where([
                        'store_id' => $register->store_id,
                        'product_id' => $product->id,
                    ])->first();
                    $product->price = $stock && $stock->price > 0 ? $stock->price : $product->price;
                }
            }
        }

        date_default_timezone_set($this->setting->timezone);

        $data = [
            'customers'  => $this->CustomerModel->findAll(),
            'products'   => $products,
            'categories' => $this->CategoryModel->findAll(),
            'Stores'     => $this->StoreModel->findAll(),
            'register'   => session()->get('register'),

        ];

        $posale = $this->PosaleModel->first();
        if (!$posale) {
            $hold = $this->HoldModel->orderBy('id', 'DESC')->first();
            if ($hold) {
                $this->HoldModel->update($hold['id'], ['time' => date("H:i")]);
            }
        }

        return $this->render('goodsout', $data);
    }
}
