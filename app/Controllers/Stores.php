<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\StoreModel;
use App\Models\ProductModel;
use App\Models\StockModel;
use CodeIgniter\Database\Exceptions\DataException;

class Stores extends BaseController
{
    protected $storeModel;
    protected $productModel;
    protected $stockModel;
    protected $db;

    public function __construct()
    {
        helper(['form']);
        $this->storeModel = new StoreModel();
        $this->productModel = new ProductModel();
        $this->stockModel = new StockModel();
        $this->db = \Config\Database::connect();
    }

    public function add()
    {
        // Set timezone using config or setting model
        $timezone = config('App')->timezone ?? 'Asia/Dhaka';
        date_default_timezone_set($timezone);
        $date = date("Y-m-d H:i:s");

        $request = \Config\Services::request();

        $data = $request->getPost();
        $data['created_at'] = $date;

        // Create the new store
        $storeModel = new StoreModel(); // adjust namespace if needed
        $store = $storeModel->insert($data); // returns inserted ID


        // Load products
        $productModel = new ProductModel(); // You must create this model if not present
        $products = $productModel->orderBy('id', 'ASC')->findAll();

        // Insert into stocks
        $stockModel = new StockModel(); // You must create this model
        foreach ($products as $product) {
            $stockModel->insert([
                'product_id'   => $product->id,
                'type'         => 0,
                'store_id'     => $store,
                'datte'        => date("Y-m-d"),
                'quantity'     => 0,
                'price'        => 0,
                'puritem_id'   => 0,
                'warehouse_id' => 0
            ]);
        }

        return redirect()->to('/settings?tab=stores');
    }


    public function edit($id = null)
    {
        if ($this->request->getPost()) {
            $data = $this->request->getPost();
            $this->storeModel->update($id, $data);
            return redirect()->to('/settings?tab=stores');
        }

        $store = $this->storeModel->find($id);
        if (!$store) {
            throw \CodeIgniter\Exceptions\PageNotFoundException::forPageNotFound('Store not found');
        }

        return $this->render('setting/modifyStore', ['store' => $store]);
    }

    public function delete($id = null)
    {
        $registerCount = $this->db->table('registers')->where('store_id', $id)->countAllResults();

        if ($registerCount == 0) {
            $this->storeModel->delete($id);
        } else {
            // Optionally: do not delete if registers exist, or handle differently
            $this->storeModel->delete($id); // same as CI3 logic
        }

        return redirect()->to('/settings?tab=stores');
    }
}
