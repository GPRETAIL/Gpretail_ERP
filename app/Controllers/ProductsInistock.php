<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use CodeIgniter\HTTP\RedirectResponse;
use Config\Services;
use App\Models\ProductInitModel;

class ProductsInistock extends BaseController
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
        helper(['url', 'form']);
        if (!session()->get('user_id')) {
            return redirect()->to('/login')->send();
        }
    }

    public function index($offset = 0)
    {
        $limit = 50;
        $search_query = $this->request->getGet('search_query');
        $supplier = $this->request->getGet('supplier') ?? '99';
        $type = $this->request->getGet('type') ?? '99';

        $model = new ProductInitModel();

        $product_count = $model->countFilteredProducts($search_query, $supplier, $type);
        $products = $model->getFilteredProducts($offset, $limit, $search_query, $supplier, $type);



        $pager = \Config\Services::pager();
        $pagination = $pager->makeLinks($offset, $limit, $product_count, 'default_full');

        return $this->render('product/view_ini', [
            'products'     => $products,
            'pagination'   => $pagination,
            'search_query' => $search_query,
            'supplier'     => $supplier,
            'type'         => $type,
            'pager'        => $this->pager,
            'db'           => this->db,
        ]);
    }






    public function addinis(): RedirectResponse
    {
        $post = $this->request->getPost();

        if (!empty($post['qtty_iid'])) {
            foreach ($post['qtty_iid'] as $pro_id => $qty_data) {
                foreach ($qty_data as $base_qty => $qty_to_add) {
                    $total_qty = intval($base_qty) + intval($qty_to_add);

                    if (!empty($qty_to_add) || $qty_to_add < 0) {
                        (new \App\Models\StockModel())->adjustQuantity(1, (int) $pro_id, intval($qty_to_add));

                        $checkTransfer = $this->db->query("SELECT pro_id FROM stock_transfer WHERE store_id = '1' AND pro_id = ? AND tyoftrans = 5", [$pro_id]);
                        if ($checkTransfer->getNumRows() == 1) {
                            $this->db->query("UPDATE stock_transfer SET qty = ? WHERE store_id = '1' AND pro_id = ? AND tyoftrans = 5", [$total_qty, $pro_id]);
                        } else {
                            $this->db->query("DELETE FROM stock_transfer WHERE store_id = '1' AND pro_id = ? AND tyoftrans = 5", [$pro_id]);
                            $this->db->query("INSERT INTO stock_transfer (store_id, pro_id, qty, tyoftrans, date, bywhom) VALUES ('1', ?, ?, 5, ?, 'admin')", [$pro_id, $qty_to_add, date('Y-m-d')]);
                        }
                    }
                }
            }
        }

        return redirect()->to('/productsinistock');
    }
}
