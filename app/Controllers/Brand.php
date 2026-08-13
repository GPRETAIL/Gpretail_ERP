<?php

namespace App\Controllers;

use App\Models\CategoryModel;
use App\Models\BrandModel;
use CodeIgniter\Controller;
use Config\Database;

class Brand extends BaseController
{
    protected $db;
    protected $builder;

    public function __construct()
    {
        helper(['url', 'form']);
        $this->db = Database::connect();

        if (!session()->get('user_id')) {
            return redirect()->to('/login')->send(); // adjust login path
        }
    }
    public function index22()
    {  //$this->content_view = 'brand/users_view';
        //return view('users_view');
        return $this->render('brand/users_view');
    }

    public function fetch_all_records()
    {
        ini_set('memory_limit', '2048M');

        // Get all rows from 'timesheet' table
        //$query = $this->db->get('products'); // 🔁 Replace with your actual table name
        //$rows = $query->result_array();
        //$fetch = mysql_query("SELECT * FROM products   order by name asc  ");
        //$rows = [];
        //while ($row = mysql_fetch_array($fetch)) {
        //  $rows[] = $row;
        //}
        // Step 1
        $this->db->query("
                        CREATE TEMPORARY TABLE temp_stock_summary AS
                        SELECT 
                            st.pro_id,
                            st.store_id,
                            SUM(
                                CASE 
                                    WHEN st.tyoftrans IN (1, 3, 4, 5) THEN st.qty
                                    WHEN st.tyoftrans IN (2, 6) THEN -st.qty
                                    ELSE 0
                                END
                            ) AS total_qty
                        FROM stock_transfer st
                        GROUP BY st.pro_id, st.store_id
                    ");

        // Step 2
        $query1 = $this->db->query("
                        CREATE TEMPORARY TABLE temp_store_string AS
                        SELECT 
                            tss.pro_id,
                            GROUP_CONCAT(CONCAT(s.name, ' - ', tss.total_qty) ORDER BY s.name SEPARATOR ', ') AS store_stock
                        FROM temp_stock_summary tss
                        JOIN stores s ON s.id = tss.store_id
                        GROUP BY tss.pro_id
                    ");


        $query2 = $this->db->query("SELECT * FROM temp_store_string");
        $rows2 = $query2->getResultArray();

        // Step 3
        $query = $this->db->query("
                            SELECT 
                                    pr.*,
                                    bbr.name AS bname,
                                    ssr.name AS sname,
                                    COALESCE(st.store_stock, 0) AS store_stock
                                FROM products pr
                                LEFT JOIN brand bbr ON bbr.id = pr.brandd
                                LEFT JOIN suppliers ssr ON ssr.id = pr.supplier
                                LEFT JOIN (
                                    SELECT stk.product_id, SUM(stk.quantity) AS store_stock
                                    FROM stocks stk
                                    GROUP BY stk.product_id
                                ) st ON st.product_id = pr.id
                                ORDER BY pr.name ASC;
                        ");



        $products = $query->getResultArray();

        // Step 4: Fetch stock string into associative array (faster lookup)
        // $stockQuery = $this->db->query("SELECT * FROM temp_store_string");
        $stockQuery = $this->db->query("SELECT product_id, SUM(quantity) AS total_quantity FROM stocks GROUP BY product_id");
        $store = $this->db->table('stores')->where('id', $this->store)->get()->getRow();
        $stockMap = [];
        foreach ($stockQuery->getResultArray() as $row) {
            $stockMap[$row['product_id']] = (isset($store->name) ? $store->name . '-' : '')  . $row['total_quantity'];
        }

        // Step 5: Append store_stock manually (in PHP loop)
        // foreach ($products as &$product) {
        //     $product['store_stock'] = $stockMap[$product['id']] ?? '';
        // }


        // Final JSON output
        header('Content-Type: application/json');
        echo json_encode(['rows' => $products]);
        exit;
        $rows = $query->getResultArray();


        // Set header to JSON and output data
        header('Content-Type: application/json');
        echo json_encode(['rows' => $rows]);
        exit;
    }


    public function index()
    {
        if (!isLoggedIn()) {
            return redirect()->to('/login');
        }

        // $model = new CategoryModel();
        // $brandModel = new BrandModel();
        $categoryModel = new \App\Models\CategoryModel();
        $brandModel = new \App\Models\BrandModel();
        $data['categories'] = $categoryModel->findAll();

        $brands = $brandModel->asArray()->findAll();
        $data['brands'] = $brands;
        return $this->render('brand/view', $data);
    }

    public function add()
    {
        $date = date("Y-m-d H:i:s");
        $categoryName = $this->request->getPost('CategoryName');

        $query = $this->db->query("SELECT * FROM brand WHERE name = ?", [$categoryName]);
        if ($query->getNumRows() == 0) {
            $this->db->query("INSERT INTO brand (name, created_at, status) VALUES (?, ?, ?)", [$categoryName, $date, 0]);
        }

        return redirect()->to('/brand');
    }

    public function addajax()
    {
        $date = date("Y-m-d H:i:s");
        $name = $this->request->getPost('name');

        $this->db->query("INSERT INTO brand (name, created_at, status) VALUES (?, ?, ?)", [$name, $date, 1]);

        $options = '';
        $query = $this->db->query("SELECT * FROM brand ORDER BY name ASC");
        foreach ($query->getResultArray() as $row) {
            $options .= '<option value="' . $row['id'] . '">' . esc($row['name']) . '</option>';
        }

        echo $options;
        exit;
    }


    public function edit($id = null)
    {
        if (!$id) {
            return redirect()->to('/brand');
        }

        $role = session()->get('user')->role ?? '';
        $perm = $this->db->query("SELECT * FROM permission_new WHERE nname = ?", [$role])->getRowArray();

        if (!isset($perm['bre']) || $perm['bre'] != 1) {
            return redirect()->to('/');
        }

        // Load existing brand from DB
        $brand = $this->db->table('brand')->where('id', $id)->get()->getRowArray();

        if (!$brand) {
            return redirect()->to('/brand')->with('error', 'Brand not found.');
        }

        if ($this->request->getPost()) {
            $categoryName = $this->request->getPost('CategoryName');

            $exists = $this->db->query("SELECT * FROM brand WHERE id != ? AND name = ?", [$id, $categoryName]);
            if ($exists->getNumRows() == 0) {
                $this->db->query("UPDATE brand SET name = ? WHERE id = ?", [$categoryName, $id]);
            }

            return redirect()->to('/brand');
        }

        // Pass $brand to the view
        return $this->render('brand/edit', ['brand' => $brand]);
    }
    public function delete($id)
    {
        $query = $this->db->query("SELECT * FROM brand WHERE id = ?", [$id]);
        if ($query->getNumRows() == 1) {
            $this->db->query("DELETE FROM brand WHERE id = ?", [$id]);
        }

        return redirect()->to('/brand');
    }
}
