<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use CodeIgniter\HTTP\RedirectResponse;
use Config\Services;

class Products_inistock  extends BaseController
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
        $builder = $this->db->table('products AS pro');
        $builder->select('pro.id, pro.name, pro.price, stt.quantity, SUM(str.qty) as qty_plus');
        $builder->join('stocks AS stt', 'stt.product_id = pro.id');
        $builder->join('stock_transfer AS str', 'str.pro_id = pro.id');
        $builder->groupBy('pro.id');
        $builder->orderBy('pro.name', 'ASC');

        $product_count = $builder->countAllResults(false); // count without resetting query
        $limit = 50;

        $search_query = $this->request->getGet('search_query');
        $supplier = $this->request->getGet('supplier') ?? '99';
        $type = $this->request->getGet('type') ?? '99';

        // Pagination config
        $pager = Services::pager();
        $builder->limit($limit, $offset);
        $query = $builder->get();
        $products = $query->getResult();

        $data = [
            'products'   => $products,
            'pagination' => $pager->makeLinks($offset, $limit, $product_count, 'default_full')
        ];

        return $this->render('product/view_ini', $data);
    }

    
    
    public function addinis(): RedirectResponse
    {
        $post = $this->request->getPost();

        if (!empty($post['qtty_iid'])) {
            foreach ($post['qtty_iid'] as $pro_id => $qty_data) {
                foreach ($qty_data as $base_qty => $qty_to_add) {
                    $total_qty = intval($base_qty) + intval($qty_to_add);

                    if (!empty($qty_to_add) || $qty_to_add < 0) {
                        $checkStock = $this->db->query("SELECT quantity FROM stocks WHERE store_id = '1' AND product_id = ?", [$pro_id]);

                        if ($checkStock->getNumRows() == 1) {
                            $row = $checkStock->getRowArray();
                            $updatedQty = intval($row['quantity']) + intval($qty_to_add);
                            $this->db->query("UPDATE stocks SET quantity = ? WHERE product_id = ? AND store_id = '1'", [$updatedQty, $pro_id]);
                        } else {
                            $this->db->query("DELETE FROM stocks WHERE store_id = '1' AND product_id = ?", [$pro_id]);
                            $this->db->query("INSERT INTO stocks (product_id, type, store_id, warehouse_id, quantity, price, datte) VALUES (?, 0, '1', 0, ?, 0, ?)", [$pro_id, $qty_to_add, date('Y-m-d')]);
                        }

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
