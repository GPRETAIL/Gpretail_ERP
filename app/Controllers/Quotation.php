<?php

namespace App\Controllers;

use App\Models\SupplierModel;
use App\Models\CustomerModel;
use App\Models\CategoryModel;
use App\Models\StoreModel;
use App\Models\PosaleModel;
use App\Models\HoldModel;
use App\Models\ProductModel;
use CodeIgniter\Controller;
use Config\Services;
use Config\Database;

class Quotation extends BaseController
{
    protected $db;
    protected $session;
    protected $user;
    protected $register;
    protected $store;
    protected $setting;

    public function __construct()
    {
        if (!isLoggedIn()) {
            return redirect()->to('/login');
        }

        $this->user = session()->get('user');
        $this->store = session()->get('store') ?? false;
    }

    public function index()
    {

        $data = [
            'kkar'       => $this->db->table('permission_new')->where('nname', $this->user->role)->get()->getRowArray(),
            'xzxz'       => $this->db->table('report_stting')->where('rsi', 1)->get()->getRowArray(),
            'imnn'       => $this->db->table('brand')->orderBy('name', 'ASC')->get()->getRowArray(),
            'taxx'       => $this->db->table('tax')->orderBy('name', 'ASC')->get()->getRowArray(),
            'oii'        => $this->db->table('settings')->where('id', 1)->get()->getRowArray(),
            'suppliers'  => (new SupplierModel())->findAll(),
            'customers'  => (new CustomerModel())->findAll(),
            'categories' => (new CategoryModel())->findAll(),
            'Stores'     => (new StoreModel())->findAll(),
            'register'   => $this->register,


        ];

        if (!(new PosaleModel())->first()) {
            $hold = (new HoldModel())->orderBy('id', 'DESC')->first();
            if ($hold) {
                $this->db->table('holds')->where('id', $hold['id'])->update(['time' => date("H:i")]);
            }
        }

        return $this->render('qpos', $data);
    }

    public function qindex($rff)
    {
        $sale = $this->db->table('saleqs')->where('id', $rff)->get()->getRow();

        if ($sale->sal_id != 0) {
            return redirect()->to('/');
        }

        $this->db->table('posales')->where([
            'user_id' => $this->session->get('user_id'),
            'qt_id' => 0
        ])->update(['status' => 0]);

        $this->db->table('posales')->where([
            'user_id' => $this->session->get('user_id'),
        ])->where('qt_id !=', 0)->delete();

        $items = $this->db->table('sale_itemqs')->where('sale_id', $rff)->get()->getResultArray();

        foreach ($items as $item) {
            $this->db->table('posales')->insert([
                'product_id'   => $item['product_id'],
                'name'         => $item['name'],
                'price'        => $item['price'],
                'qt'           => $item['qt'],
                'status'       => 1,
                'register_id'  => $this->register,
                'number'       => 1,
                'user_id'      => $this->session->get('user_id'),
                'qt_id'        => $rff

            ]);
        }

        $data = [
            'kkar'      => $this->db->table('permission_new')->where('nname', $this->user->role)->get()->getRowArray(),
            'xzxz'      => $this->db->table('report_stting')->where('rsi', 1)->get()->getRowArray(),
            'imnn'      => $this->db->table('brand')->orderBy('name', 'ASC')->get()->getResultArray(),
            'taxx'      => $this->db->table('tax')->orderBy('name', 'ASC')->get()->getResultArray(),
            'oii'       => $this->db->table('settings')->where('id', 1)->get()->getRowArray(),
            'suppliers' => (new SupplierModel())->findAll(),
            'customers' => (new CustomerModel())->findAll(),
            'categories' => (new CategoryModel())->findAll(),
            'Stores'    => (new StoreModel())->findAll(),
            'stty'      => $this->db->table('state')->where('CountryID', 1)->orderBy('StateName', 'ASC')->get()->getResultArray(),
            'setting'   => $this->setting,
            'ProductModel' => new ProductModel(),

        ];

        if (!(new PosaleModel())->first()) {
            $hold = (new HoldModel())->orderBy('id', 'DESC')->first();
            if ($hold) {
                $this->db->table('holds')->where('id', $hold['id'])->update(['time' => date("H:i")]);
            }
        }

        return $this->render('pos', $data);
    }

    public function sindex($rff)
    {
        $sale = $this->db->table('sales')->where('id', $rff)->get()->getRowObject();
        if ($sale->sal_id != 0) {
            return redirect()->to('/');
        }

        $this->db->table('posales')->where(['user_id' => $this->session->get('user_id'), 'qt_id' => 0])->update(['status' => 0]);
        $this->db->table('posales')->where('user_id', $this->session->get('user_id'))->where('qt_id !=', 0)->delete();

        $items = $this->db->table('sale_items')->where('sale_id', $rff)->get()->getResultArray();

        foreach ($items as $item) {
            $this->db->table('posales')->insert([
                'product_id'  => $item['product_id'],
                'name'        => $item['name'],
                'price'       => $item['price'],
                'mrpp'        => $item['mrpp'],
                'qt'          => $item['qt'],
                'status'      => 1,
                'register_id' => $this->register,
                'number'      => 1,
                'user_id'     => $this->session->get('user_id'),
                'qt_id'       => $rff
            ]);
        }

        $data = [
            'kkar'      => $this->db->table('permission_new')->where('nname', $this->user['role'])->get()->getRowArray(),
            'xzxz'      => $this->db->table('report_stting')->where('rsi', 1)->get()->getRowArray(),
            'imnn'      => $this->db->table('brand')->orderBy('name', 'ASC')->get()->getResultArray(),
            'taxx'      => $this->db->table('tax')->orderBy('name', 'ASC')->get()->getResultArray(),
            'oii'       => $this->db->table('settings')->where('id', 1)->get()->getRowArray(),
            'suppliers' => (new SupplierModel())->findAll(),
            'customers' => (new CustomerModel())->findAll(),
            'categories' => (new CategoryModel())->findAll(),
            'Stores'    => (new StoreModel())->findAll(),
            'stty'      => $this->db->table('state')->where('CountryID', 1)->orderBy('StateName', 'ASC')->get()->getResultArray(),
            'setting'   => $this->setting,
        ];

        if (!(new PosaleModel())->first()) {
            $hold = (new HoldModel())->orderBy('id', 'DESC')->first();
            if ($hold) {
                $this->db->table('holds')->where('id', $hold['id'])->update(['time' => date("H:i")]);
            }
        }

        return view('pos', $data);
    }

    public function change($type)
    {
        $this->session->set('lang', $type);
        $this->setting->language = $type;
        $this->setting->save();
        return redirect()->to('/');
    }

    public function posview()
    {
        return view('dashpos');
    }
}
