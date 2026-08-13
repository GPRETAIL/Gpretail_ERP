<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\ProductModel;
use App\Models\SettingModel;
use App\Models\UserModel;
use CodeIgniter\HTTP\ResponseInterface;

class InvoicesPro extends BaseController
{
    protected $productModel;
    protected $setting;
    protected $user;
    protected $permissions;

    public function __construct()
    {
        $this->productModel = new ProductModel();

        $userId = session()->get('user_id');
        $this->user = $userId ? (new UserModel())->find($userId) : null;
        $this->setting = (new SettingModel())->find(1);

        $db = db_connect();
        $this->permissions = $this->user
            ? $db->table('permission_new')->where('nname', $this->user->role)->get()->getRowArray()
            : [];
    }

    public function ajaxList($offset, $per_page)
    {
        $productInput = $this->request->getPost('productInput');
        $products = $this->productModel->getFilteredProducts($offset, $per_page, $productInput);
        // print_r($products);die;
        $data = [];
        foreach ($products['products'] as $product) {
            $row = [];
            $row[] = $product->id;
            $row[] = $product->code;
            $row[] = $product->hsn;
            $row[] = $product->purid;
            $row[] = $product->spname;
            $row[] = ucfirst($product->name);
            $row[] = $product->bname;

            if ($this->setting && $this->setting->gst_tax == 1) {
                $row[] = $product->tax;
            }

            $row[] = $product->cost;

            $taxRate = (int) $product->tax + (int) $product->sgst;
            $price = !$product->taxmethod || $product->taxmethod === '0'
                ? (float) $product->price
                : (float) $product->price * (1 + $taxRate / 100);

            $row[] = $price;
            $row[] = $product->rrate;
            $row[] = $product->descountperr;

            $row[] = $product->store_name . ' - ' . (float) $product->quantity;
            $row[] = '';
            $row[] = $product->quantity * $price;

            if ($this->setting && $this->setting->expi == 1) {
                $row[] = $product->batch_1m;
                $row[] = $product->packed_1m;
                $row[] = $product->expire_1m;
            }

            $row[] = $product->statuss == 0
                ? '<a class="btn btn-success" href="' . base_url('products/deactive/' . $product->id) . '">Active</a>'
                : '<a class="btn btn-danger" href="' . base_url('products/active/' . $product->id) . '">Deactive</a>';

            $buttons = '';
            if (!empty($this->permissions['prd']) && $this->permissions['prd'] == 1) {
                $buttons .= '<a class="btn btn-default" onclick="return confirm(\'Are you sure?\')" href="' . base_url('products/delete/' . $product->id) . '"><i class="fa fa-times"></i></a>';
            }
            $buttons .= '<a class="btn btn-default" href="javascript:void(0)" onclick="Viewproduct(' . $product->id . ')"><i class="fa fa-file-text"></i></a>';

            if (!empty($this->permissions['pre']) && $this->permissions['pre'] == 1) {
                $buttons .= '<a class="btn btn-default" href="' . base_url('products/edit/' . $product->id) . '"><i class="fa fa-pencil"></i></a>';
            }

            if ($product->photo) {
                $buttons .= '<a class="btn ' . $product->color . ' white open-modalimage" data-id="' . $product->photo . '" data-toggle="modal" data-target="#ImageModal"><i class="fa fa-picture-o"></i></a>';
            }

            $buttons .= '<a class="btn btn-default" href="javascript:void(0)" data-toggle="modal" data-target="#barcode" onclick="productBcode = ' . $product->id . '"><i class="fa fa-barcode"></i></a>';

            $row[] = $buttons;
            $data[] = $row;
        }

        return $this->response->setJSON([
            'draw' => 1,
            'recordsTotal' => count($data),
            'recordsFiltered' => count($data),
            'data' => $data,
        ]);
    }
    public function warehouseProducts($offset, $per_page = 50, $all = 0)
    {
        $db = \Config\Database::connect();
        $id = $_POST['user_id'];
        // $this->db->select('products.*, stocks.quantity AS stock_quantity, stocks.warehouse_id, brand.name AS bname, purchase_items.purchase_id AS purid, suppliers.name AS spname');
        // $this->db->group_by('stores.id');

        // $this->db->select('products.*,stocks.store_id, stocks.product_id,stocks.quantity,stocks.warehouse_id, purchase_items.id AS purid, brand.name AS bname, suppliers.name AS spname, stores.name AS store_name');

        $builder = $this->db->table('products');

        $builder->select('
            products.*, 
            stocks.store_id, 
            stocks.product_id, 
            stocks.quantity, 
            stocks.warehouse_id, 
            purchase_items.id AS purid, 
            brand.name AS bname, 
            suppliers.name AS spname, 
            stores.name AS store_name
        ');
        if (isset($_POST['productInput']) && !empty($_POST['productInput'])) {
            $productInput = $_POST['productInput'];
            if (is_numeric($productInput)) {
                $this->db->where('code', $productInput);
            } else {
                $this->db->like('products.name', $productInput, 'both');
            }
        }

        // $this->db->join("suppliers", "suppliers.id=products.supplier", 'left');
        // $this->db->join("stocks", "stocks.product_id=products.id", 'left');
        // $this->db->join("stores", "stores.id=stocks.store_id", 'left');
        // $this->db->join("brand", "brand.id=products.brandd", "LEFT");
        // $this->db->join("purchase_items", "purchase_items.product_id=products.id");

        $builder->join('suppliers', 'suppliers.id = products.supplier', 'left');
        $builder->join('stocks', 'stocks.product_id = products.id', 'left');
        $builder->join('stores', 'stores.id = stocks.store_id', 'left');
        $builder->join('brand', 'brand.id = products.brandd', 'left');
        $builder->join('purchase_items', 'purchase_items.product_id = products.id');

        // $this->db->join("warehouses", "warehouses.id=stocks.warehouse_id", "LEFT");

        // $this->db->where('stores.id', 1);
        // $this->db->where('warehouses.id', 4);
        if (is_numeric($offset)) {
            $builder->limit($per_page, $offset);
        }
        $query = $builder->get();
        $products = $query->getResult();
        // echo '<pre>';
        // print_r($products);
        // echo '</pre>';

        // $rolr = $this->user->role;
        // $kkar = $this->db->query("SELECT * from permission_new where nname='" . $rolr . "'  ")->row_array();
        // $mm = $this->db->query('SELECT * from settings where id=1 ')->row_array();

        // $result = mysql_query("SELECT products.*,suppliers.name as spname,brand.name as bname,purchase_items.purchase_id as  purid  FROM products
        // left join suppliers on products.supplier=suppliers.id
        // left join brand on products.brandd=brand.id
        // left join purchase_items on products.id=purchase_items.product_id group by products.id
        // order by products.name asc LIMIT 500");

        // print_r(mysql_fetch_object($result));die;




        //$lklk = mysql_fetch_array(mysql_query("select * from suppliers  where id='".$product->supplier."' "));
        //$lklkb = mysql_fetch_array(mysql_query("select * from brand  where id='".$product->brandd."' "));
        $data = [];
        $builderss = $db->table('warehouses');
        $querys = $builderss->get();
        $warehouses = $querys->getResult();

        $build = $db->table('stores');
        $quer = $build->get();
        $stor_dd = $quer->getResultArray();


        foreach ($products as $product) {

            // $brand = $this->db->select("brand.name as bname")->where('id', $product->brandd)->get('brand')->row();
            // $purchase_items = $this->db->select("purchase_items.purchase_id as  purid")->where('product_id', $product->id)->get('purchase_items')->row();
            // $supplier = $this->db->select("suppliers.name as spname")->where('id', $product->supplier)->get('suppliers')->row();
            $row = [];
            $row[] = $product->id;
            $row[] = $product->code;
            $row[] = $product->hsn;
            $row[] = $product->purid ?? '';

            $row[] = $product->spname ?? '';
            $row[] = ucfirst($product->name);

            $row[] = $product->bname ?? '';

            if ($this->mm['gst_tax'] == 1) {
                $row[] = $product->tax;
            }
            $row[] = $product->cost;
            $PostPrice = $product->price;
            $tg = intval($product->tax) + intval($product->sgst);
            $price = !$product->taxmethod || $product->taxmethod == '0' ? floatval($PostPrice) : floatval($PostPrice) * (1 + $tg / 100);

            $row[] = $price;
            $row[] = $product->rrate;
            $row[] = $product->descountperr;
            $ini_pro = '';
            $tot_sel = 0;

            // if (count($stor_dd) == 1) {
            //     $stor_ddf = mysql_fetch_array($stor_dd);
            //     $frcc = mysql_fetch_array(mysql_query("select store_id,product_id,sum(quantity) as tot_fina  from stocks where store_id='" . $stor_ddf['id'] . "' and product_id='" . $product->id . "' "));
            //     $ini_pro .= floatval($frcc['tot_fina']);

            //     if (floatval($frcc['tot_fina']) > 0) {
            //         $tot_qt = 0;
            //         $tot_pur = 0;
            //         $tot_qt = $tot_qt + floatval($frcc['tot_fina']);
            //         $tot_sel = floatval($frcc['tot_fina']) * $price;
            //         $tot_pur = $tot_pur + floatval($frcc['tot_fina']) * $product->cost;
            //     }
            // } else if (count($stor_dd) > 1) {
            //     $stor_dd = $this->db->query('SELECT * FROM stores ORDER BY name ASC')->result_array();
            //     foreach ($stor_dd as $stor_ddf) {
            //         $frcc = $this->db->query("select store_id,product_id,sum(quantity) as tot_fina  from stocks where store_id='" . $stor_ddf['id'] . "' and product_id='" . $product->id . "' ")->row_array();
            //         $tot_qt = 0;
            //         $tot_pur = 0;
            //         if (floatval($frcc['tot_fina']) > 0) {
            //             $tot_qt = $tot_qt + floatval($frcc['tot_fina']);
            //             $tot_sel = floatval($frcc['tot_fina']) * $price;
            //             $tot_pur = $tot_pur + floatval($frcc['tot_fina']) * $product->cost;
            //         }

            //         $ini_pro .= $stor_ddf['name'] . ' - ' . floatval($frcc['tot_fina']) . '<br>';
            //     }
            // }
            $warehouse_qty = '';
            // foreach ($warehouses as $k => $warehouse) {
            //     if ($product->warehouse_id == $warehouse->id) {
            //         $warehouse_qty .= $warehouse->name . " - " . $product->stock_quantity . '<br>';
            //     }
            // }

            $ini_pro = $product->store_name . ' - ' . floatval($product->quantity) . '<br>';
            $row[] = $ini_pro;
            $row[] = $warehouse_qty;
            $row[] = $tot_sel;

            if ($this->mm['expi'] == 1) {
                $row[] = $product->batch_1m;
                $row[] = $product->packed_1m;
                $row[] = $product->expire_1m;
            }

            if ($product->statuss == 0) {
                $row[] = '<a class="btn btn-success" href="' . base_url() . 'products/deactive/' . $product->id . '" >Active</a>';
            } else {
                $row[] = '<a class="btn btn-danger" href="' . base_url() . 'products/active/' . $product->id . '" > Deactive</a>';
            }

            $row_nn = '';

            if ($this->kkar['prd'] == 1) {
                $row_nn .= '<a class="btn btn-default" href="' . base_url() . 'products/delete/' . $product->id . '"  ><i class="fa fa-times"></i></a>';
            }

            $row_nn .= '<a class="btn btn-default" href="javascript:void(0)" onclick="Viewproduct(' . $product->id . ')"><i class="fa fa-file-text" data-toggle="tooltip" data-placement="top"  ></i></a>';

            if ($this->kkar['pre'] == 1) {
                $row_nn .= '  <a class="btn btn-default" href="' . base_url() . 'products/edit/' . $product->id . '" data-toggle="tooltip" data-placement="top" title=" Edit "><i class="fa fa-pencil"></i></a>';
            }

            if ($product->photo) {
                $row_nn .= ' <a class="btn ' . $product->color . ' white open-modalimage"data-id="' . $product->photo . '" href="" data-toggle="modal" data-target="#ImageModal"><i class="fa fa-picture-o" data-toggle="tooltip" data-placement="top" title=" View Image "></i></a>';
            }

            $row_nn .=
                '  <a class="btn btn-default" href="javascript:void(0)" data-toggle="modal" data-target="#barcode" onclick="productBcode = ' .
                $product->id .
                '"><i class="fa fa-barcode" data-toggle="tooltip" data-placement="top" title=" print Barcodes "></i></a>
                     ';

            $row[] = $row_nn;

            $data[] = $row;
        }
        $totalRecords = count($products);
        $json_data = [
            'draw' => 1,
            'recordsTotal' => intval($totalRecords),
            'recordsFiltered' => intval($totalRecords),
            'data' => $data,
        ];
        // send data as json format
        echo json_encode($json_data);
        die;
    }
    // public function warehouseProducts()
    // {
    //     $productInput = $this->request->getPost('productInput');
    //     $products = $this->productModel->getWarehouseFilteredProducts($productInput);

    //     $data = [];
    //     foreach ($products as $product) {
    //         $row = [];
    //         $row[] = $product->id;
    //         $row[] = $product->code;
    //         $row[] = $product->hsn;
    //         $row[] = $product->purid;
    //         $row[] = $product->spname;
    //         $row[] = ucfirst($product->name);
    //         $row[] = $product->bname;

    //         if ($this->setting && $this->setting->gst_tax == 1) {
    //             $row[] = $product->tax;
    //         }

    //         $row[] = $product->cost;

    //         $taxRate = (int) $product->tax + (int) $product->sgst;
    //         $price = !$product->taxmethod || $product->taxmethod === '0'
    //             ? (float) $product->price
    //             : (float) $product->price * (1 + $taxRate / 100);

    //         $row[] = $price;
    //         $row[] = $product->rrate;
    //         $row[] = $product->descountperr;

    //         $row[] = $product->store_name . ' - ' . (float) $product->quantity;
    //         $row[] = '';
    //         $row[] = $product->quantity * $price;

    //         if ($this->setting && $this->setting->expi == 1) {
    //             $row[] = $product->batch_1m;
    //             $row[] = $product->packed_1m;
    //             $row[] = $product->expire_1m;
    //         }

    //         $row[] = $product->statuss == 0
    //             ? '<a class="btn btn-success" href="' . base_url('products/deactive/' . $product->id) . '">Active</a>'
    //             : '<a class="btn btn-danger" href="' . base_url('products/active/' . $product->id) . '">Deactive</a>';

    //         $buttons = '';
    //         if (!empty($this->permissions['prd']) && $this->permissions['prd'] == 1) {
    //             $buttons .= '<a class="btn btn-default" onclick="return confirm(\'Are you sure?\')" href="' . base_url('products/delete/' . $product->id) . '"><i class="fa fa-times"></i></a>';
    //         }
    //         $buttons .= '<a class="btn btn-default" href="javascript:void(0)" onclick="Viewproduct(' . $product->id . ')"><i class="fa fa-file-text"></i></a>';

    //         if (!empty($this->permissions['pre']) && $this->permissions['pre'] == 1) {
    //             $buttons .= '<a class="btn btn-default" href="' . base_url('products/edit/' . $product->id) . '"><i class="fa fa-pencil"></i></a>';
    //         }

    //         if ($product->photo) {
    //             $buttons .= '<a class="btn ' . $product->color . ' white open-modalimage" data-id="' . $product->photo . '" data-toggle="modal" data-target="#ImageModal"><i class="fa fa-picture-o"></i></a>';
    //         }

    //         $buttons .= '<a class="btn btn-default" href="javascript:void(0)" data-toggle="modal" data-target="#barcode" onclick="productBcode = ' . $product->id . '"><i class="fa fa-barcode"></i></a>';

    //         $row[] = $buttons;
    //         $data[] = $row;
    //     }

    //     return $this->response->setJSON([
    //         'draw' => 1,
    //         'recordsTotal' => count($data),
    //         'recordsFiltered' => count($data),
    //         'data' => $data,
    //     ]);
    // }
}
