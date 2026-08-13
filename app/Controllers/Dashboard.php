<?php

namespace App\Controllers;

use App\Models\SupplierModel;
use App\Models\CustomerModel;
use App\Models\CategoryModel;
use App\Models\StoreModel;
use App\Models\PosaleModel;
use App\Models\HoldModel;
use App\Models\SettingModel;
use App\Models\ProductModel;
use App\Models\UserModel;
use CodeIgniter\Controller;
use Config\Database;

class Dashboard extends BaseController
{
    protected $db;
    protected $supplierModel;
    protected $customerModel;
    protected $categoryModel;
    protected $storeModel;
    protected $posaleModel;
    protected $holdModel;
    protected $settingModel;
    protected $UserModel;
    protected $ProductModel;

    public function __construct()
    {
        $this->db = Database::connect();

        if (!session('user_id')) {
            return redirect()->to('login');
        }

        // $this->supplierModel = new SupplierModel();
        // $this->customerModel = new CustomerModel();
        // $this->categoryModel = new CategoryModel();
        // $this->storeModel = new StoreModel();
        // $this->posaleModel = new PosaleModel();
        // $this->holdModel = new HoldModel();
    }

    public function index()
    {

        // $purchase_item = $this->db->table('purchase_items pi')
        //     ->select('
        //             pi.product_id, 
        //             SUM(pi.qt) as qt,
        //             COALESCE(s.sale_qt, 0) AS sale_qt,
        //             COALESCE(d.dsale_qt, 0) AS dsale_qt
        //         ')
        //     ->join(
        //         '(SELECT product_id, SUM(qt) AS sale_qt FROM sale_items GROUP BY product_id) s',
        //         's.product_id = pi.product_id',
        //         'left'
        //     )
        //     ->join(
        //         '(SELECT product_id, SUM(qt) AS dsale_qt FROM dsale_items GROUP BY product_id) d',
        //         'd.product_id = pi.product_id',
        //         'left'
        //     )
        //     ->groupBy('pi.product_id')
        //     ->limit(1500, 6000)  // still offset-based, consider keyset pagination for huge tables
        //     ->get()
        //     ->getResult();



        // echo '<pre>';
        // print_r($purchase_item);
        // echo '</pre>';
        // foreach ($purchase_item as $item) {
        //     // Process each purchase item
        //     // $sales_item = $this->db->table('sale_items')->select('SUM(qt) AS qt')->where('product_id', $item->product_id)->groupBy('product_id')->get()->getRow()->qt ?? 0;
        //     // $dsales_item = $this->db->table('dsale_items')->select('SUM(qt) AS qt')->where('product_id', $item->product_id)->groupBy('product_id')->get()->getRow()->qt ?? 0;
        //     $sales_total = $item->sale_qt + $item->dsale_qt;
        //     $purchase_total = $item->qt;
        //     $available_stock = $purchase_total - $sales_total;
        //     echo $available_stock;
        //     $this->db->table('stocks')->where('product_id', $item->product_id)->limit(1)->update(['quantity' => $available_stock]);
        // }
        // // print_r(session());
        // die;
        if (!session()->get('user_id')) {
            return redirect()->to('login');
        }
        $supplierModel = new SupplierModel();
        $customerModel = new CustomerModel();
        $categoryModel = new CategoryModel();
        $storeModel = new StoreModel();
        $posaleModel = new PosaleModel();
        $holdModel = new holdModel();
        $settingModel = new SettingModel();
        $ProductModel = new ProductModel();


        // Update posales status
        $this->db->table('posales')->where(['user_id' => session('user_id'), 'qt_id' => 0, 'number' => 1])->update(['status' => 1]);
        $this->db->table('posales')->where(['user_id' => session('user_id')])->where('qt_id !=', 0)->delete();

        // Update expired offers
        $today = date('Y-m-d');
        $expiredOffers = $this->db->query("SELECT products.id, products.offer_id, products.category AS of_category FROM products JOIN offers ON products.offer_id = offers.of_id WHERE of_validtill < '$today'")->getResultArray();
        foreach ($expiredOffers as $offer) {
            $this->db->table('offers')->where('of_id', $offer['offer_id'])->update(['of_status' => 0]);
            $this->db->table('products')->where('id', $offer['id'])->update([
                'offer_id' => 0,
                'offer_price' => 0,
                'category' => $offer['of_category']
            ]);
        }

        $role = session('role');
        $this->view_data['kkar'] = $this->db->table('permission_new')->where('nname', $role)->get()->getRowArray();
        $this->view_data['xzxz'] = $this->db->table('report_stting')->where('rsi', 1)->get()->getRowArray();
        $this->view_data['imnn'] = $this->db->table('brand')->orderBy('name', 'asc')->limit(100)->get()->getResultArray();
        $this->view_data['taxx'] = $this->db->table('tax')->orderBy('name', 'asc')->where('tax_for', 0)->get()->getResultArray();
        $this->view_data['oii'] = $this->db->table('settings')->where('id', 1)->get()->getRowArray();
        $this->view_data['suppliers'] = $supplierModel->findAll();
        $this->view_data['stty'] = $this->db->table('state')->where('CountryID', 1)->orderBy('StateName', 'asc')->get()->getRowArray();

        date_default_timezone_set($this->view_data['oii']['timezone'] ?? 'UTC');

        $this->view_data['customers'] = $customerModel->getAllCustomers();
        $this->view_data['categories'] = $categoryModel->getAllCategories();
        $this->view_data['Stores'] = $storeModel->getAllStores();
        $this->view_data['store'] = $storeModel->find();
        $this->view_data['setting'] = $settingModel->find(1);
        $this->view_data['ProductModel'] = $ProductModel;
        $this->view_data['register'] = $this->register;

        $request_uri = $_SERVER['REQUEST_URI'];

        // Remove the query string (if any), leaving only the path
        $uri_path = parse_url($request_uri, PHP_URL_PATH);

        // Explode the URI into an array using the '/' delimiter
        $uri_segments = explode('/', trim($uri_path, '/'));
        if (isset($uri_segments[3])) {
            $this->view_data['segment_3'] = $this->uri->getSegment(3);
        } else {
            $this->view_data['segment_3'] = false;
        }

        if (!$posaleModel->getFirstPosale()) {
            $hold = $holdModel->getLastHold();
            if ($hold) {
                $holdModel->update($hold->id, ['time' => date('H:i')]);
            }
        }

        return $this->render('pos', $this->view_data);
    }

    public function change($type)
    {
        $this->db->table('settings')->where('id', 1)->update(['language' => $type]);
        return redirect()->to('/');
    }

    public function posview()
    {
        return $this->render('dashpos');
    }
}
