<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\ProductModel;
use App\Models\CategoryModel;
use App\Models\SupplierModel;
use CodeIgniter\HTTP\RedirectResponse;
use Config\Services;

class ProductsMrp extends BaseController
{
    protected $productModel;
    protected $categoryModel;
    protected $supplierModel;
    protected $db;

    public function __construct()
    {
        helper(['url', 'form']);
        $this->productModel = new ProductModel();
        $this->categoryModel = new CategoryModel();
        $this->supplierModel = new SupplierModel();
        $this->db = \Config\Database::connect();

        if (!session('user_id')) {
            redirect()->to('/login')->send();
        }
    }

    public function index()
    {
        $pager = Services::pager();
        $request = service('request');

        // Get filter inputs
        $supplier = $request->getPost('filtersupp') ?? '99';
        $type = $request->getPost('filtertype');
        $type = ($type !== null && $type !== '') ? $type : '99';
        $search_query = $request->getPost('search') ?? '';

        // Pagination setup
        $perPage = 50;
        $page = (int) ($this->request->getVar('page') ?? 1);
        $offset = ($page - 1) * $perPage;

        // Get products and count
        $products = $this->productModel->getProducts($perPage, $offset, $search_query, $supplier, $type);
        $total = $this->productModel->getProductCount($search_query, $supplier, $type);

        return $this->render('product/view_mrp', [
            'products'   => $products,
            'pagination' => $pager->makeLinks($page, $perPage, $total, 'default_full'),
            'supplierF'  => $supplier,
            'typeF'      => $type,
            'categories' => $this->categoryModel->findAll(),
            'suppliers'  => $this->supplierModel->findAll()
        ]);
    }

    public function addinis(): RedirectResponse
    {
        $post = $this->request->getPost();

        if ($post) {
            $productIds = $post['pro_iid'] ?? [];
            $productPrices = $post['product_price'] ?? [];
            $priceType = $post['prince_mas'] ?? 0;

            if ($priceType == 0) {
                foreach ($productIds as $index => $proId) {
                    $price = floatval($productPrices[$index]);
                    $this->db->table('products')
                        ->where('id', intval($proId))
                        ->update(['rrate' => $price]);
                }
            } else {
                $this->db->table('price_marterr')
                    ->where('pp_price_type', $priceType)
                    ->delete();

                foreach ($productIds as $index => $proId) {
                    $price = floatval($productPrices[$index]);

                    $this->db->table('price_marterr')->insert([
                        'pp_pro_price'   => $price,
                        'pp_price_type'  => $priceType,
                        'pp_pro_id'      => intval($proId)
                    ]);
                }
            }
        }

        return redirect()->to('/productsMrp');
    }
}
