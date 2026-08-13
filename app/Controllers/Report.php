<?php

namespace App\Controllers;

use App\Models\ProductModel;
use App\Models\StoreModel;
use App\Models\CustomerModel;
use App\Models\WarehouseModel;
use App\Models\CategoryModel;
use App\Models\SaleItemModel;
use App\Models\SaleModel;
use App\Models\ExpenceModel;
use App\Models\SupplierModel;
use CodeIgniter\Controller;
use Config\SettingModel;
use App\Models\DsaleModel;

use Config\Database;

class Report extends BaseController
{
    protected $db;
    protected $setting;
    protected $user;
    public function __construct()
    {
        helper(['url', 'form']);
        $this->SaleItemModel = new SaleItemModel();
        $this->db = Database::connect();
        $session = session();

        $this->user = $session->get('user');
        $this->setting = model('SettingModel')->find(1); // replace with actual setting model logic

        if (!$this->user) {
            return redirect()->to('/login');
        }

        // permission check
        $role = $this->user->role ?? '';
        $kkar = $this->db->query("SELECT * FROM permission_new WHERE nname = ?", [$role])->getRowArray();
        if (!isset($kkar['rev']) || $kkar['rev'] != 1) {
            return redirect()->to('/');
        }

        date_default_timezone_set($this->setting->timezone ?? 'Asia/Dhaka');
    }

    public function customerreport()
    {
        date_default_timezone_set($this->setting->timezone ?? 'Asia/Dhaka');

        $date = date('Y-m-d');
        $year = date('Y');
        $db = \Config\Database::connect();
        // Fetch summary values
        $saleModel = new SaleModel();
        $SaleItemModel = new SaleItemModel();
        $TodaySales = $saleModel->query("SELECT SUM(total) AS sum FROM sales WHERE created_at = ?", [$date])->getRow();
        $Top5product = $this->db->query("
            SELECT name, product_id, SUM(qt) AS totalquantity 
            FROM sale_items 
            WHERE YEAR(date) = ? 
            GROUP BY product_id 
            ORDER BY totalquantity DESC 
            LIMIT 5
        ", [$year])->getResult();

        $sql = "
        SELECT 
            SUM(IF(MONTH = 1, numRecords, 0)) AS january,
            SUM(IF(MONTH = 1, totaltax, 0)) AS januarytax,
            SUM(IF(MONTH = 1, totaldiscount, 0)) AS januarydisc,
            SUM(IF(MONTH = 2, numRecords, 0)) AS february,
            SUM(IF(MONTH = 2, totaltax, 0)) AS februarytax,
            SUM(IF(MONTH = 2, totaldiscount, 0)) AS februarydisc,
            SUM(IF(MONTH = 3, numRecords, 0)) AS march,
            SUM(IF(MONTH = 3, totaltax, 0)) AS marchtax,
            SUM(IF(MONTH = 3, totaldiscount, 0)) AS marchdisc,
            -- repeat for months 4 through 12
            SUM(numRecords) AS total,
            SUM(totaltax) AS totalstax,
            SUM(totaldiscount) AS totaldisc
        FROM (
            SELECT 
                id, 
                MONTH(created_at) AS MONTH, 
                ROUND(SUM(total)) AS numRecords, 
                ROUND(SUM(taxamount)) AS totaltax, 
                ROUND(SUM(discountamount)) AS totaldiscount 
            FROM sales 
            WHERE YEAR(created_at) = ? 
            GROUP BY id, MONTH(created_at)
        ) AS SubTable1
    ";

        $monthlySales = $db->query($sql, [$year])->getRow();
        $monthlyExp = $db->query("
                                SELECT 
                                    SUM(IF(MONTH = 1, numRecords, 0)) AS january,
                                    SUM(IF(MONTH = 2, numRecords, 0)) AS february,
                                    SUM(IF(MONTH = 3, numRecords, 0)) AS march,
                                    SUM(IF(MONTH = 4, numRecords, 0)) AS april,
                                    SUM(IF(MONTH = 5, numRecords, 0)) AS may,
                                    SUM(IF(MONTH = 6, numRecords, 0)) AS june,
                                    SUM(IF(MONTH = 7, numRecords, 0)) AS july,
                                    SUM(IF(MONTH = 8, numRecords, 0)) AS august,
                                    SUM(IF(MONTH = 9, numRecords, 0)) AS september,
                                    SUM(IF(MONTH = 10, numRecords, 0)) AS october,
                                    SUM(IF(MONTH = 11, numRecords, 0)) AS november,
                                    SUM(IF(MONTH = 12, numRecords, 0)) AS december,
                                    SUM(numRecords) AS total 
                                FROM (
                                    SELECT 
                                        id, 
                                        MONTH(date) AS MONTH, 
                                        ROUND(SUM(amount)) AS numRecords 
                                    FROM expences 
                                    WHERE YEAR(date) = ? 
                                    GROUP BY id, MONTH(date)
                                ) AS SubTable1
                            ", [$year])->getRow();
        $CustomerModel = new CustomerModel();
        $ProductModel = new ProductModel();
        $StoreModel = new StoreModel();
        $Warehouse = new WarehouseModel();
        $CategoryModel = new CategoryModel();
        $data = [
            'customers'       => $CustomerModel->findAll(),
            'Products'        => $ProductModel->findAll(),
            'Stores'          => $StoreModel->findAll(),
            'Warehouses'      => $Warehouse->findAll(),
            'monthly'         => $monthlySales,
            'monthlyExp'      => $monthlyExp,
            'year'            => $year,
            'Top5product'     => $Top5product,
            'TodaySales'      => number_format((float)($TodaySales->sum ?? 0), $this->setting->decimals ?? 2, '.', ''),
            'CustomerNumber'  => $CategoryModel->countAllResults(),
            'CategoriesNumber' => $CategoryModel->countAllResults()
        ];

        return $this->render('customerreport', $data);
    }




    public function brsearch()
    {
        // Set the timezone
        // date_default_timezone_set(setting('App.timezone') ?? 'Asia/Dhaka');

        // Load models (assuming proper CI4 model usage)
        $productModel = new \App\Models\ProductModel();
        $storeModel   = new \App\Models\StoreModel();

        // Fetch data
        $products = $productModel->findAll();
        $stores   = $storeModel->findAll();

        // Pass to view
        return $this->render('searchbrreport1', [
            'Products' => $products,
            'Stores'   => $stores,
        ]);
    }


    public function creditstatus()
    {
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');
        $date = date("Y-m-d");
        $year = date("Y");

        $TodaySales = Sale::find_by_sql("SELECT SUM(total) AS sum FROM sales WHERE created_at = '$date'");
        $Top5product = Sale_item::find_by_sql("SELECT name, product_id, SUM(qt) AS totalquantity FROM sale_items WHERE DATE_FORMAT(date, '%Y') = $year GROUP BY product_id ORDER BY SUM(qt) DESC LIMIT 5");

        $monthlySales = Sale::find_by_sql("SELECT ..."); // use the same full query string here
        $monthlyExp = Expence::find_by_sql("SELECT ..."); // use the same full query string here

        $data = [
            'customers'         => Customer_model::all(),
            'Products'          => Product::all(),
            'Stores'            => Store_model::all(),
            'Warehouses'        => Warehouse::all(),
            'monthly'           => $monthlySales,
            'monthlyExp'        => $monthlyExp,
            'year'              => $year,
            'Top5product'       => $Top5product,
            'TodaySales'        => number_format((float)($TodaySales[0]->sum ?? 0), $this->setting['decimals'] ?? 2, '.', ''),
            'CustomerNumber'    => Customer_model::count(),
            'CategoriesNumber'  => Category_model::count(),
            'ProductNumber'     => Product::count(),
            'ssal'              => $this->db->query("SELECT * FROM users ORDER BY firstname ASC")->getResult(),
        ];

        return view('report/customercredit', $data);
    }





    public function collection()
    {
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');
        $date = date("Y-m-d");
        $year = date("Y");

        $TodaySales = Sale::find_by_sql("SELECT SUM(total) AS sum FROM sales WHERE created_at = '$date'");
        $Top5product = Sale_item::find_by_sql("SELECT name, product_id, SUM(qt) AS totalquantity FROM sale_items WHERE DATE_FORMAT(date, '%Y') = $year GROUP BY product_id ORDER BY SUM(qt) DESC LIMIT 5");

        $monthlySales = Sale::find_by_sql("SELECT SUM(IF(MONTH = 1, numRecords, 0)) AS 'january', SUM(IF(MONTH = 1, totaltax, 0)) AS 'januarytax', SUM(IF(MONTH = 1, totaldiscount, 0)) AS 'januarydisc', SUM(IF(MONTH = 2, numRecords, 0)) AS 'feburary', SUM(IF(MONTH = 2, totaltax, 0)) AS 'feburarytax', SUM(IF(MONTH = 2, totaldiscount, 0)) AS 'feburarydisc', SUM(IF(MONTH = 3, numRecords, 0)) AS 'march', SUM(IF(MONTH = 3, totaltax, 0)) AS 'marchtax', SUM(IF(MONTH = 3, totaldiscount, 0)) AS 'marchdisc', SUM(IF(MONTH = 4, numRecords, 0)) AS 'april', SUM(IF(MONTH = 4, totaltax, 0)) AS 'apriltax', SUM(IF(MONTH = 4, totaldiscount, 0)) AS 'aprildisc', SUM(IF(MONTH = 5, numRecords, 0)) AS 'may', SUM(IF(MONTH = 5, totaltax, 0)) AS 'maytax', SUM(IF(MONTH = 5, totaldiscount, 0)) AS 'maydisc', SUM(IF(MONTH = 6, numRecords, 0)) AS 'june', SUM(IF(MONTH = 6, totaltax, 0)) AS 'junetax', SUM(IF(MONTH = 6, totaldiscount, 0)) AS 'junedisc', SUM(IF(MONTH = 7, numRecords, 0)) AS 'july', SUM(IF(MONTH = 7, totaltax, 0)) AS 'julytax', SUM(IF(MONTH = 7, totaldiscount, 0)) AS 'julydisc', SUM(IF(MONTH = 8, numRecords, 0)) AS 'august', SUM(IF(MONTH = 8, totaltax, 0)) AS 'augusttax', SUM(IF(MONTH = 8, totaldiscount, 0)) AS 'augustdisc', SUM(IF(MONTH = 9, numRecords, 0)) AS 'september', SUM(IF(MONTH = 9, totaltax, 0)) AS 'septembertax', SUM(IF(MONTH = 9, totaldiscount, 0)) AS 'septemberdisc', SUM(IF(MONTH = 10, numRecords, 0)) AS 'october', SUM(IF(MONTH = 10, totaltax, 0)) AS 'octobertax', SUM(IF(MONTH = 10, totaldiscount, 0)) AS 'octoberdisc', SUM(IF(MONTH = 11, numRecords, 0)) AS 'november', SUM(IF(MONTH = 11, totaltax, 0)) AS 'novembertax', SUM(IF(MONTH = 11, totaldiscount, 0)) AS 'novemberdisc', SUM(IF(MONTH = 12, numRecords, 0)) AS 'december', SUM(IF(MONTH = 12, totaltax, 0)) AS 'decembertax', SUM(IF(MONTH = 12, totaldiscount, 0)) AS 'decemberdisc', SUM(numRecords) AS total, SUM(totaltax) AS totalstax, SUM(totaldiscount) AS totaldisc FROM ( SELECT id, MONTH(created_at) AS MONTH, ROUND(SUM(total)) AS numRecords, ROUND(SUM(taxamount)) AS totaltax, ROUND(SUM(discountamount)) AS totaldiscount FROM sales WHERE DATE_FORMAT(created_at, '%Y') = $year GROUP BY id, MONTH ) AS SubTable1");

        $monthlyExp = Expence::find_by_sql("SELECT SUM(IF(MONTH = 1, numRecords, 0)) AS 'january', SUM(IF(MONTH = 2, numRecords, 0)) AS 'feburary', SUM(IF(MONTH = 3, numRecords, 0)) AS 'march', SUM(IF(MONTH = 4, numRecords, 0)) AS 'april', SUM(IF(MONTH = 5, numRecords, 0)) AS 'may', SUM(IF(MONTH = 6, numRecords, 0)) AS 'june', SUM(IF(MONTH = 7, numRecords, 0)) AS 'july', SUM(IF(MONTH = 8, numRecords, 0)) AS 'august', SUM(IF(MONTH = 9, numRecords, 0)) AS 'september', SUM(IF(MONTH = 10, numRecords, 0)) AS 'october', SUM(IF(MONTH = 11, numRecords, 0)) AS 'november', SUM(IF(MONTH = 12, numRecords, 0)) AS 'december', SUM(numRecords) AS total FROM ( SELECT id, MONTH(date) AS MONTH, ROUND(SUM(amount)) AS numRecords FROM expences WHERE DATE_FORMAT(date, '%Y') = $year GROUP BY id, MONTH ) AS SubTable1");

        $data = [
            'customers'         => Customer_model::all(),
            'Products'          => Product::all(),
            'Stores'            => Store_model::all(),
            'Warehouses'        => Warehouse::all(),
            'monthly'           => $monthlySales,
            'monthlyExp'        => $monthlyExp,
            'year'              => $year,
            'Top5product'       => $Top5product,
            'TodaySales'        => number_format((float)($TodaySales[0]->sum ?? 0), $this->setting['decimals'] ?? 2, '.', ''),
            'CustomerNumber'    => Customer_model::count(),
            'CategoriesNumber'  => Category_model::count(),
            'ProductNumber'     => Product::count(),
            'ssal'              => $this->db->query("SELECT * FROM users ORDER BY firstname ASC")->getResult(),
        ];

        return view('report/collectioncredit', $data);
    }





    public function totalpurchasereport()
    {
        date_default_timezone_set($this->setting->timezone ?? 'Asia/Dhaka');
        $date = date("Y-m-d");
        $year = date("Y");
        $db = \Config\Database::connect();
        $TodaySales = $db->query("SELECT SUM(total) AS sum FROM sales WHERE created_at = '$date'");
        $Top5product = $db->query("SELECT name, product_id, SUM(qt) AS totalquantity FROM sale_items WHERE DATE_FORMAT(date, '%Y') = $year GROUP BY product_id ORDER BY SUM(qt) DESC LIMIT 5");

        $CustomerModel = new CustomerModel();
        $ProductModel = new ProductModel();
        $StoreModel = new StoreModel();
        $WarehouseModel = new WarehouseModel();
        $CategoryModel = new CategoryModel();
        $data = [
            'customers'         => $CustomerModel->findAll(),
            'Products'          => $ProductModel->findAll(),
            'Stores'            => $StoreModel->findAll(),
            'Warehouses'        => $WarehouseModel->findAll(),
            'monthlyExp'        => 0, // No calculation given
            'year'              => $year,
            'Top5product'       => $Top5product,
            'TodaySales' => number_format((float)($TodaySales->sum ?? 0), $this->setting->decimals ?? 2, '.', ''),
            'CustomerNumber'    => $CustomerModel->countAllResults(),
            'CategoriesNumber'  => $CategoryModel->countAllResults(),
            'ProductNumber'     => $ProductModel->countAllResults(),
        ];

        return $this->render('purchasetotalreportss', $data);
    }
    public function salesretunreport()
    {
        return $this->render('salesreturnreport');
    }




    public function customertaxreport()
    {
        date_default_timezone_set($this->setting->timezone ?? 'Asia/Dhaka');
        $date = date("Y-m-d");
        $year = date("Y");
        $db = \Config\Database::connect();
        $TodaySales = $db->query("SELECT SUM(total) AS sum FROM sales WHERE created_at = '$date'");
        $monthlySales = $db->query("SELECT SUM(IF(MONTH = 1, numRecords, 0)) AS 'january', SUM(IF(MONTH = 1, totaltax, 0)) AS 'januarytax', SUM(IF(MONTH = 1, totaldiscount, 0)) AS 'januarydisc', SUM(IF(MONTH = 2, numRecords, 0)) AS 'feburary', SUM(IF(MONTH = 2, totaltax, 0)) AS 'feburarytax', SUM(IF(MONTH = 2, totaldiscount, 0)) AS 'feburarydisc', SUM(IF(MONTH = 3, numRecords, 0)) AS 'march', SUM(IF(MONTH = 3, totaltax, 0)) AS 'marchtax', SUM(IF(MONTH = 3, totaldiscount, 0)) AS 'marchdisc', SUM(IF(MONTH = 4, numRecords, 0)) AS 'april', SUM(IF(MONTH = 4, totaltax, 0)) AS 'apriltax', SUM(IF(MONTH = 4, totaldiscount, 0)) AS 'aprildisc', SUM(IF(MONTH = 5, numRecords, 0)) AS 'may', SUM(IF(MONTH = 5, totaltax, 0)) AS 'maytax', SUM(IF(MONTH = 5, totaldiscount, 0)) AS 'maydisc', SUM(IF(MONTH = 6, numRecords, 0)) AS 'june', SUM(IF(MONTH = 6, totaltax, 0)) AS 'junetax', SUM(IF(MONTH = 6, totaldiscount, 0)) AS 'junedisc', SUM(IF(MONTH = 7, numRecords, 0)) AS 'july', SUM(IF(MONTH = 7, totaltax, 0)) AS 'julytax', SUM(IF(MONTH = 7, totaldiscount, 0)) AS 'julydisc', SUM(IF(MONTH = 8, numRecords, 0)) AS 'august', SUM(IF(MONTH = 8, totaltax, 0)) AS 'augusttax', SUM(IF(MONTH = 8, totaldiscount, 0)) AS 'augustdisc', SUM(IF(MONTH = 9, numRecords, 0)) AS 'september', SUM(IF(MONTH = 9, totaltax, 0)) AS 'septembertax', SUM(IF(MONTH = 9, totaldiscount, 0)) AS 'septemberdisc', SUM(IF(MONTH = 10, numRecords, 0)) AS 'october', SUM(IF(MONTH = 10, totaltax, 0)) AS 'octobertax', SUM(IF(MONTH = 10, totaldiscount, 0)) AS 'octoberdisc', SUM(IF(MONTH = 11, numRecords, 0)) AS 'november', SUM(IF(MONTH = 11, totaltax, 0)) AS 'novembertax', SUM(IF(MONTH = 11, totaldiscount, 0)) AS 'novemberdisc', SUM(IF(MONTH = 12, numRecords, 0)) AS 'december', SUM(IF(MONTH = 12, totaltax, 0)) AS 'decembertax', SUM(IF(MONTH = 12, totaldiscount, 0)) AS 'decemberdisc', SUM(numRecords) AS total, SUM(totaltax) AS totalstax, SUM(totaldiscount) AS totaldisc FROM ( SELECT id, MONTH(created_at) AS MONTH, ROUND(SUM(total)) AS numRecords, ROUND(SUM(taxamount)) AS totaltax, ROUND(SUM(discountamount)) AS totaldiscount FROM sales WHERE DATE_FORMAT(created_at, '%Y') = $year GROUP BY id, MONTH ) AS SubTable1");

        $monthlyExp = $db->query("SELECT SUM(IF(MONTH = 1, numRecords, 0)) AS 'january', SUM(IF(MONTH = 2, numRecords, 0)) AS 'feburary', SUM(IF(MONTH = 3, numRecords, 0)) AS 'march', SUM(IF(MONTH = 4, numRecords, 0)) AS 'april', SUM(IF(MONTH = 5, numRecords, 0)) AS 'may', SUM(IF(MONTH = 6, numRecords, 0)) AS 'june', SUM(IF(MONTH = 7, numRecords, 0)) AS 'july', SUM(IF(MONTH = 8, numRecords, 0)) AS 'august', SUM(IF(MONTH = 9, numRecords, 0)) AS 'september', SUM(IF(MONTH = 10, numRecords, 0)) AS 'october', SUM(IF(MONTH = 11, numRecords, 0)) AS 'november', SUM(IF(MONTH = 12, numRecords, 0)) AS 'december', SUM(numRecords) AS total FROM ( SELECT id, MONTH(date) AS MONTH, ROUND(SUM(amount)) AS numRecords FROM expences WHERE DATE_FORMAT(date, '%Y') = $year GROUP BY id, MONTH ) AS SubTable1");

        // $sql = "SELECT name, product_id, SUM(qt) AS tofastreporttalquantity
        //         FROM sale_items
        //         WHERE DATE_FORMAT(date, '%Y') = ?
        //         GROUP BY product_id
        //         ORDER BY totalquantity DESC
        //         LIMIT 5";
        $sql = "SELECT name, product_id, SUM(qt) AS totalquantity
        FROM sale_items
        WHERE DATE_FORMAT(date, '%Y') = ?
        GROUP BY product_id
        ORDER BY totalquantity DESC
        LIMIT 5";

        $query1 = $db->query($sql, [$year]);
        $Top5product = $query1->getResult();
        // $Top5product = $db->query($sql, [$year])->getResult();

        $CustomerModel = new CustomerModel();
        $ProductModel = new ProductModel();
        $StoreModel = new StoreModel();
        $Warehouse = new WarehouseModel();
        $CategoryModel = new CategoryModel();
        $data = [
            'customers'         => $CustomerModel->findAll(),
            'Products'          => $ProductModel->findAll(),
            'Stores'            => $StoreModel->findAll(),
            'Warehouses'        => $Warehouse->findAll(),
            'monthly'           => $monthlySales,
            'monthlyExp'        => $monthlyExp,
            'year'              => $year,
            'Top5product'       => $Top5product,
            'TodaySales'        => number_format((float)($TodaySales->sum ?? 0), $this->setting->decimals ?? 2, '.', ''),
            'CustomerNumber'    => $CategoryModel->countAllResults(),
            'CategoriesNumber'  => $CategoryModel->countAllResults(),
            'ProductNumber'     => $ProductModel->countAllResults(),
        ];

        return $this->render('customertaxreport', $data);
    }




    public function customertaxgstr3b()
    {
        $CustomerMdel = new CustomerModel();
        $CategoryModel = new CategoryModel();
        $ProductModel = new ProductModel();
        $data = [
            'CustomerNumber'   => $CustomerMdel->countAllResults(),
            'CategoriesNumber' => $CategoryModel->countAllResults(),
            'ProductNumber'    => $ProductModel->countAllResults(),
        ];

        return $this->render('customertaxgstrtb', $data);
    }

    public function productreport()
    {
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');
        $date = date("Y-m-d");
        $year = date("Y");

        $TodaySales = Sale::find_by_sql("SELECT SUM(total) AS sum FROM sales WHERE created_at = '$date'");
        $Top5product = Sale_item::find_by_sql("SELECT name, product_id, SUM(qt) AS totalquantity FROM sale_items WHERE DATE_FORMAT(date, '%Y') = $year GROUP BY product_id ORDER BY SUM(qt) DESC LIMIT 5");

        $monthlySales = Sale::find_by_sql("SELECT SUM(IF(MONTH = 1, numRecords, 0)) AS 'january', SUM(IF(MONTH = 1, totaltax, 0)) AS 'januarytax', SUM(IF(MONTH = 1, totaldiscount, 0)) AS 'januarydisc',
            SUM(IF(MONTH = 2, numRecords, 0)) AS 'feburary', SUM(IF(MONTH = 2, totaltax, 0)) AS 'feburarytax', SUM(IF(MONTH = 2, totaldiscount, 0)) AS 'feburarydisc',
            SUM(IF(MONTH = 3, numRecords, 0)) AS 'march', SUM(IF(MONTH = 3, totaltax, 0)) AS 'marchtax', SUM(IF(MONTH = 3, totaldiscount, 0)) AS 'marchdisc',
            SUM(IF(MONTH = 4, numRecords, 0)) AS 'april', SUM(IF(MONTH = 4, totaltax, 0)) AS 'apriltax', SUM(IF(MONTH = 4, totaldiscount, 0)) AS 'aprildisc',
            SUM(IF(MONTH = 5, numRecords, 0)) AS 'may', SUM(IF(MONTH = 5, totaltax, 0)) AS 'maytax', SUM(IF(MONTH = 5, totaldiscount, 0)) AS 'maydisc',
            SUM(IF(MONTH = 6, numRecords, 0)) AS 'june', SUM(IF(MONTH = 6, totaltax, 0)) AS 'junetax', SUM(IF(MONTH = 6, totaldiscount, 0)) AS 'junedisc',
            SUM(IF(MONTH = 7, numRecords, 0)) AS 'july', SUM(IF(MONTH = 7, totaltax, 0)) AS 'julytax', SUM(IF(MONTH = 7, totaldiscount, 0)) AS 'julydisc',
            SUM(IF(MONTH = 8, numRecords, 0)) AS 'august', SUM(IF(MONTH = 8, totaltax, 0)) AS 'augusttax', SUM(IF(MONTH = 8, totaldiscount, 0)) AS 'augustdisc',
            SUM(IF(MONTH = 9, numRecords, 0)) AS 'september', SUM(IF(MONTH = 9, totaltax, 0)) AS 'septembertax', SUM(IF(MONTH = 9, totaldiscount, 0)) AS 'septemberdisc',
            SUM(IF(MONTH = 10, numRecords, 0)) AS 'october', SUM(IF(MONTH = 10, totaltax, 0)) AS 'octobertax', SUM(IF(MONTH = 10, totaldiscount, 0)) AS 'octoberdisc',
            SUM(IF(MONTH = 11, numRecords, 0)) AS 'november', SUM(IF(MONTH = 11, totaltax, 0)) AS 'novembertax', SUM(IF(MONTH = 11, totaldiscount, 0)) AS 'novemberdisc',
            SUM(IF(MONTH = 12, numRecords, 0)) AS 'december', SUM(IF(MONTH = 12, totaltax, 0)) AS 'decembertax', SUM(IF(MONTH = 12, totaldiscount, 0)) AS 'decemberdisc',
            SUM(numRecords) AS total, SUM(totaltax) AS totalstax, SUM(totaldiscount) AS totaldisc 
            FROM (
                SELECT id, MONTH(created_at) AS MONTH, ROUND(SUM(total)) AS numRecords, ROUND(SUM(taxamount)) AS totaltax, ROUND(SUM(discountamount)) AS totaldiscount
                FROM sales
                WHERE DATE_FORMAT(created_at, '%Y') = $year
                GROUP BY id, MONTH
            ) AS SubTable1");

        $monthlyExp = Expence::find_by_sql("SELECT SUM(IF(MONTH = 1, numRecords, 0)) AS 'january',
            SUM(IF(MONTH = 2, numRecords, 0)) AS 'feburary', SUM(IF(MONTH = 3, numRecords, 0)) AS 'march',
            SUM(IF(MONTH = 4, numRecords, 0)) AS 'april', SUM(IF(MONTH = 5, numRecords, 0)) AS 'may',
            SUM(IF(MONTH = 6, numRecords, 0)) AS 'june', SUM(IF(MONTH = 7, numRecords, 0)) AS 'july',
            SUM(IF(MONTH = 8, numRecords, 0)) AS 'august', SUM(IF(MONTH = 9, numRecords, 0)) AS 'september',
            SUM(IF(MONTH = 10, numRecords, 0)) AS 'october', SUM(IF(MONTH = 11, numRecords, 0)) AS 'november',
            SUM(IF(MONTH = 12, numRecords, 0)) AS 'december', SUM(numRecords) AS total
            FROM (
                SELECT id, MONTH(date) AS MONTH, ROUND(SUM(amount)) AS numRecords
                FROM expences
                WHERE DATE_FORMAT(date, '%Y') = $year
                GROUP BY id, MONTH
            ) AS SubTable1");
        $CustomerModel = new $CustomerModel();
        $ProductModel = new $ProductModel();
        $StoreModel = new $StoreModel();
        $WarehouseModel = new $WarehouseModel();
        $CategoryModel = new $CategoryModel();
        $data = [
            'customers'         => $CustomerModel->findAll(),
            'Products'          => $ProductModel->findAll(),
            'Stores'            => $StoreModel->findAll(),
            'Warehouses'        => $WarehouseModel->findAll(),
            'monthly'           => $monthlySales,
            'monthlyExp'        => $monthlyExp,
            'year'              => $year,
            'Top5product'       => $Top5product,
            'TodaySales'        => number_format((float)($TodaySales[0]->sum ?? 0), $this->setting['decimals'] ?? 2, '.', ''),
            'CustomerNumber'    => $CustomerModel->countAllResults(),
            'CategoriesNumber'  => $CategoryModel->countAllResults(),
            'ProductNumber'     => $ProductModel->countAllResults(),
        ];

        return view('report/productreport', $data);
    }




    // public function categoryreport()
    // {
    //     $db = \Config\Database::connect();
    //     $setting = (new \App\Models\SettingModel())->find(1); // Adjust if your setting is stored differently

    //     // Today’s total sales
    //     $todaySalesRow = $db->table('sales')
    //         ->select('SUM(total) as sum')
    //         ->where('DATE(created_at)', date('Y-m-d'))
    //         ->get()
    //         ->getRow();

    //     $todaySales = $todaySalesRow ? number_format((float)($todaySalesRow->sum ?? 0), $setting->decimals ?? 2, '.', '') : 0;

    //     // Top 5 Products of the year
    //     $top5Products = $db->table('sale_items')
    //         ->select('name, product_id, SUM(qt) as totalquantity')
    //         ->where('YEAR(date)', date('Y'))
    //         ->groupBy('product_id')
    //         ->orderBy('totalquantity', 'DESC')
    //         ->limit(5)
    //         ->get()
    //         ->getResult();

    //     $data = [
    //         'Products'         => (new \App\Models\ProductModel())->findAll(),
    //         'Stores'           => (new \App\Models\StoreModel())->findAll(),
    //         'Warehouses'       => (new \App\Models\WarehouseModel())->findAll(),
    //         'monthly'          => [],
    //         'monthlyExp'       => [],
    //         'year'             => date("Y"),
    //         'Top5product'      => $top5Products,
    //         'TodaySales'       => $todaySales,
    //         'CustomerNumber'   => (new \App\Models\CustomerModel())->countAll(),
    //         'ddd'              => (new \App\Models\CategoryModel())->findAll(),
    //         'ProductNumber'    => (new \App\Models\ProductModel())->countAll()
    //     ];
    //     return $this->render('categoryreport', $data);
    // }

    public function categoryreport()
    {
        // date_default_timezone_set(setting('App.timezone') ?? 'Asia/Dhaka');

        // Load models (if not using custom base controller)
        $productModel     = new ProductModel();
        $storeModel       = new StoreModel();
        $warehouseModel   = new WarehouseModel();
        $customerModel    = new CustomerModel();
        $categoryModel    = new CategoryModel();

        $data = [];

        $data['Products']       = $productModel->findAll();
        $data['Stores']         = $storeModel->findAll();
        $data['Warehouses']     = $warehouseModel->findAll();
        $data['monthly']        = $data['monthly'] ?? [];       // set as needed
        $data['monthlyExp']     = $data['monthlyExp'] ?? [];     // set as needed
        $data['year']           = $data['year'] ?? '';           // set as needed
        $data['Top5product']    = $data['Top5product'] ?? [];    // set as needed
        $data['TodaySales']     = isset($data['TodaySales'][0])
            ? number_format((float) $data['TodaySales'][0]->sum, setting('App.decimals') ?? 2, '.', '')
            : 0;

        $data['CustomerNumber'] = count($customerModel->findAll());
        $data['ddd']            = $categoryModel->findAll();
        $data['ProductNumber']  = count($productModel->findAll());

        return $this->render('categoryreport', $data);
    }


    public function storereport()
    {
        date_default_timezone_set($this->setting->timezone ?? 'Asia/Dhaka');
        $date = date("Y-m-d");
        $year = date("Y");

        $db = \Config\Database::connect(); // Or inject if inside a model
        $builder = $db->table('sales');
        $TodaySales = $builder->selectSum('total')
            ->where('DATE(created_at)', $date) // handles DATETIME
            ->get()
            ->getRowArray();

        $Top5product = $this->db->query("
            SELECT name, product_id, SUM(qt) AS totalquantity 
            FROM sale_items 
            WHERE DATE_FORMAT(date, '%Y') = $year 
            GROUP BY product_id 
            ORDER BY totalquantity DESC 
            LIMIT 5
        ")->getResultArray();

        $SaleModel = new SaleModel();
        $monthlySales = $this->db->query("
            SELECT 
                SUM(IF(MONTH = 1, numRecords, 0)) AS 'january',
                SUM(IF(MONTH = 1, totaltax, 0)) AS 'januarytax',
                SUM(IF(MONTH = 1, totaldiscount, 0)) AS 'januarydisc',
                SUM(IF(MONTH = 2, numRecords, 0)) AS 'feburary',
                SUM(IF(MONTH = 2, totaltax, 0)) AS 'feburarytax',
                SUM(IF(MONTH = 2, totaldiscount, 0)) AS 'feburarydisc',
                SUM(IF(MONTH = 3, numRecords, 0)) AS 'march',
                SUM(IF(MONTH = 3, totaltax, 0)) AS 'marchtax',
                SUM(IF(MONTH = 3, totaldiscount, 0)) AS 'marchdisc',
                SUM(IF(MONTH = 4, numRecords, 0)) AS 'april',
                SUM(IF(MONTH = 4, totaltax, 0)) AS 'apriltax',
                SUM(IF(MONTH = 4, totaldiscount, 0)) AS 'aprildisc',
                SUM(IF(MONTH = 5, numRecords, 0)) AS 'may',
                SUM(IF(MONTH = 5, totaltax, 0)) AS 'maytax',
                SUM(IF(MONTH = 5, totaldiscount, 0)) AS 'maydisc',
                SUM(IF(MONTH = 6, numRecords, 0)) AS 'june',
                SUM(IF(MONTH = 6, totaltax, 0)) AS 'junetax',
                SUM(IF(MONTH = 6, totaldiscount, 0)) AS 'junedisc',
                SUM(IF(MONTH = 7, numRecords, 0)) AS 'july',
                SUM(IF(MONTH = 7, totaltax, 0)) AS 'julytax',
                SUM(IF(MONTH = 7, totaldiscount, 0)) AS 'julydisc',
                SUM(IF(MONTH = 8, numRecords, 0)) AS 'august',
                SUM(IF(MONTH = 8, totaltax, 0)) AS 'augusttax',
                SUM(IF(MONTH = 8, totaldiscount, 0)) AS 'augustdisc',
                SUM(IF(MONTH = 9, numRecords, 0)) AS 'september',
                SUM(IF(MONTH = 9, totaltax, 0)) AS 'septembertax',
                SUM(IF(MONTH = 9, totaldiscount, 0)) AS 'septemberdisc',
                SUM(IF(MONTH = 10, numRecords, 0)) AS 'october',
                SUM(IF(MONTH = 10, totaltax, 0)) AS 'octobertax',
                SUM(IF(MONTH = 10, totaldiscount, 0)) AS 'octoberdisc',
                SUM(IF(MONTH = 11, numRecords, 0)) AS 'november',
                SUM(IF(MONTH = 11, totaltax, 0)) AS 'novembertax',
                SUM(IF(MONTH = 11, totaldiscount, 0)) AS 'novemberdisc',
                SUM(IF(MONTH = 12, numRecords, 0)) AS 'december',
                SUM(IF(MONTH = 12, totaltax, 0)) AS 'decembertax',
                SUM(IF(MONTH = 12, totaldiscount, 0)) AS 'decemberdisc',
                SUM(numRecords) AS total,
                SUM(totaltax) AS totalstax,
                SUM(totaldiscount) AS totaldisc 
            FROM (
                SELECT id, MONTH(created_at) AS MONTH, 
                       ROUND(SUM(total)) AS numRecords,
                       ROUND(SUM(taxamount)) AS totaltax,
                       ROUND(SUM(discountamount)) AS totaldiscount 
                FROM sales 
                WHERE DATE_FORMAT(created_at, '%Y') = $year 
                GROUP BY id, MONTH
            ) AS SubTable1
        ")->getResultArray();

        $monthlyExp = $this->db->query("
            SELECT 
                SUM(IF(MONTH = 1, numRecords, 0)) AS 'january',
                SUM(IF(MONTH = 2, numRecords, 0)) AS 'feburary',
                SUM(IF(MONTH = 3, numRecords, 0)) AS 'march',
                SUM(IF(MONTH = 4, numRecords, 0)) AS 'april',
                SUM(IF(MONTH = 5, numRecords, 0)) AS 'may',
                SUM(IF(MONTH = 6, numRecords, 0)) AS 'june',
                SUM(IF(MONTH = 7, numRecords, 0)) AS 'july',
                SUM(IF(MONTH = 8, numRecords, 0)) AS 'august',
                SUM(IF(MONTH = 9, numRecords, 0)) AS 'september',
                SUM(IF(MONTH = 10, numRecords, 0)) AS 'october',
                SUM(IF(MONTH = 11, numRecords, 0)) AS 'november',
                SUM(IF(MONTH = 12, numRecords, 0)) AS 'december',
                SUM(numRecords) AS total 
            FROM (
                SELECT id, MONTH(date) AS MONTH, 
                       ROUND(SUM(amount)) AS numRecords 
                FROM expences 
                WHERE DATE_FORMAT(date, '%Y') = $year 
                GROUP BY id, MONTH
            ) AS SubTable1
        ")->getResultArray();
        $CustomerModel = new CustomerModel();
        $ProductModel = new ProductModel();
        $StoreModel = new StoreModel();
        $Warehouse = new WarehouseModel();
        $CategoryModel = new CategoryModel();
        $data = [
            'customers'        => $CustomerModel->findAll(),
            'Products'         => $ProductModel->findAll(),
            'Stores'           => $StoreModel->findAll(),
            'Warehouses'       => $Warehouse->findAll(),
            'monthly'          => $monthlySales,
            'monthlyExp'       => $monthlyExp,
            'year'             => $year,
            'Top5product'      => $Top5product,
            'TodaySales'       => isset($TodaySales[0]) ? number_format((float)$TodaySales[0]->sum, $this->setting->decimals ?? 2, '.', '') : 0,
            'CustomerNumber'   => $CustomerModel->countAllResults(),
            'CategoriesNumber' => $CategoryModel->countAllResults(),
            'ProductNumber'    => $ProductModel->countAllResults()
        ];

        return $this->render('storereport', $data);
    }




    public function producttaxreport()
    {
        date_default_timezone_set($this->setting->timezone ?? 'Asia/Dhaka');
        $date = date("Y-m-d");
        $year = date("Y");
        $db = \Config\Database::connect();
        $TodaySales = $db->query("SELECT SUM(total) AS sum FROM sales WHERE created_at = '$date'");
        $Top5product = $db->query("
            SELECT name, product_id, SUM(qt) AS totalquantity 
            FROM sale_items 
            WHERE DATE_FORMAT(date, '%Y') = $year 
            GROUP BY product_id 
            ORDER BY totalquantity DESC 
            LIMIT 5
        ");

        $monthlySales = $db->query("
            SELECT 
                SUM(IF(MONTH = 1, numRecords, 0)) AS 'january',
                SUM(IF(MONTH = 1, totaltax, 0)) AS 'januarytax',
                SUM(IF(MONTH = 1, totaldiscount, 0)) AS 'januarydisc',
                SUM(IF(MONTH = 2, numRecords, 0)) AS 'feburary',
                SUM(IF(MONTH = 2, totaltax, 0)) AS 'feburarytax',
                SUM(IF(MONTH = 2, totaldiscount, 0)) AS 'feburarydisc',
                SUM(IF(MONTH = 3, numRecords, 0)) AS 'march',
                SUM(IF(MONTH = 3, totaltax, 0)) AS 'marchtax',
                SUM(IF(MONTH = 3, totaldiscount, 0)) AS 'marchdisc',
                SUM(IF(MONTH = 4, numRecords, 0)) AS 'april',
                SUM(IF(MONTH = 4, totaltax, 0)) AS 'apriltax',
                SUM(IF(MONTH = 4, totaldiscount, 0)) AS 'aprildisc',
                SUM(IF(MONTH = 5, numRecords, 0)) AS 'may',
                SUM(IF(MONTH = 5, totaltax, 0)) AS 'maytax',
                SUM(IF(MONTH = 5, totaldiscount, 0)) AS 'maydisc',
                SUM(IF(MONTH = 6, numRecords, 0)) AS 'june',
                SUM(IF(MONTH = 6, totaltax, 0)) AS 'junetax',
                SUM(IF(MONTH = 6, totaldiscount, 0)) AS 'junedisc',
                SUM(IF(MONTH = 7, numRecords, 0)) AS 'july',
                SUM(IF(MONTH = 7, totaltax, 0)) AS 'julytax',
                SUM(IF(MONTH = 7, totaldiscount, 0)) AS 'julydisc',
                SUM(IF(MONTH = 8, numRecords, 0)) AS 'august',
                SUM(IF(MONTH = 8, totaltax, 0)) AS 'augusttax',
                SUM(IF(MONTH = 8, totaldiscount, 0)) AS 'augustdisc',
                SUM(IF(MONTH = 9, numRecords, 0)) AS 'september',
                SUM(IF(MONTH = 9, totaltax, 0)) AS 'septembertax',
                SUM(IF(MONTH = 9, totaldiscount, 0)) AS 'septemberdisc',
                SUM(IF(MONTH = 10, numRecords, 0)) AS 'october',
                SUM(IF(MONTH = 10, totaltax, 0)) AS 'octobertax',
                SUM(IF(MONTH = 10, totaldiscount, 0)) AS 'octoberdisc',
                SUM(IF(MONTH = 11, numRecords, 0)) AS 'november',
                SUM(IF(MONTH = 11, totaltax, 0)) AS 'novembertax',
                SUM(IF(MONTH = 11, totaldiscount, 0)) AS 'novemberdisc',
                SUM(IF(MONTH = 12, numRecords, 0)) AS 'december',
                SUM(IF(MONTH = 12, totaltax, 0)) AS 'decembertax',
                SUM(IF(MONTH = 12, totaldiscount, 0)) AS 'decemberdisc',
                SUM(numRecords) AS total,
                SUM(totaltax) AS totalstax,
                SUM(totaldiscount) AS totaldisc 
            FROM (
                SELECT id, MONTH(created_at) AS MONTH, 
                       ROUND(SUM(total)) AS numRecords,
                       ROUND(SUM(taxamount)) AS totaltax,
                       ROUND(SUM(discountamount)) AS totaldiscount 
                FROM sales 
                WHERE DATE_FORMAT(created_at, '%Y') = $year 
                GROUP BY id, MONTH
            ) AS SubTable1
        ");

        $monthlyExp = $db->query("
            SELECT 
                SUM(IF(MONTH = 1, numRecords, 0)) AS 'january',
                SUM(IF(MONTH = 2, numRecords, 0)) AS 'feburary',
                SUM(IF(MONTH = 3, numRecords, 0)) AS 'march',
                SUM(IF(MONTH = 4, numRecords, 0)) AS 'april',
                SUM(IF(MONTH = 5, numRecords, 0)) AS 'may',
                SUM(IF(MONTH = 6, numRecords, 0)) AS 'june',
                SUM(IF(MONTH = 7, numRecords, 0)) AS 'july',
                SUM(IF(MONTH = 8, numRecords, 0)) AS 'august',
                SUM(IF(MONTH = 9, numRecords, 0)) AS 'september',
                SUM(IF(MONTH = 10, numRecords, 0)) AS 'october',
                SUM(IF(MONTH = 11, numRecords, 0)) AS 'november',
                SUM(IF(MONTH = 12, numRecords, 0)) AS 'december',
                SUM(numRecords) AS total 
            FROM (
                SELECT id, MONTH(date) AS MONTH, 
                       ROUND(SUM(amount)) AS numRecords 
                FROM expences 
                WHERE DATE_FORMAT(date, '%Y') = $year 
                GROUP BY id, MONTH
            ) AS SubTable1
        ");
        $CustomerModel = new CustomerModel();
        $ProductModel = new ProductModel();
        $StoreModel = new StoreModel();
        $WarehouseModel = new WarehouseModel();
        $CustomerModel = new CustomerModel();
        $CategoryModel = new CategoryModel();
        $data = [
            'customers'        => $CustomerModel->findAll(),
            'Products'         => $ProductModel->findAll(),
            'Stores'           => $StoreModel->findAll(),
            'Warehouses'       => $WarehouseModel->findAll(),
            'monthly'          => $monthlySales,
            'monthlyExp'       => $monthlyExp,
            'year'             => $year,
            'Top5product'      => $Top5product,
            'TodaySales ' => $TodaySales ? number_format((float)($TodaySales->sum ?? 0), $this->setting->decimals ?? 2, ' . ', ' ') : 0,
            'CustomerNumber'   => $CustomerModel->countAllResults(),
            'CategoriesNumber' => $CategoryModel->countAllResults(),
            'ProductNumber'    => $ProductModel->countAllResults(),
            // 'store'            => $StoreModel->where('id', $this->register)->find(),
        ];

        return $this->render('producttaxreport', $data);
    }


    public function supplierreport()
    {
        $SupplierModel = new SupplierModel();
        $data = [
            'Suppliers' => $SupplierModel->findAll()
        ];

        return $this->render('supplierreport', $data);
    }


    public function purchasereport()
    {
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');

        $date = date("Y-m-d");
        $year = date("Y");

        $TodaySales = Sale::find_by_sql("SELECT SUM(total) AS sum FROM sales WHERE created_at = '$date'");
        $Top5product = Sale_item::find_by_sql("SELECT name, product_id, SUM(qt) AS totalquantity FROM sale_items WHERE DATE_FORMAT(date, '%Y') = $year GROUP BY product_id ORDER BY totalquantity DESC LIMIT 5");

        $monthlySales = Sale::find_by_sql("
            SELECT 
                SUM(IF(MONTH = 1, numRecords, 0)) AS january,
                SUM(IF(MONTH = 1, totaltax, 0)) AS januarytax,
                SUM(IF(MONTH = 1, totaldiscount, 0)) AS januarydisc,
                SUM(IF(MONTH = 2, numRecords, 0)) AS feburary,
                SUM(IF(MONTH = 2, totaltax, 0)) AS feburarytax,
                SUM(IF(MONTH = 2, totaldiscount, 0)) AS feburarydisc,
                SUM(IF(MONTH = 3, numRecords, 0)) AS march,
                SUM(IF(MONTH = 3, totaltax, 0)) AS marchtax,
                SUM(IF(MONTH = 3, totaldiscount, 0)) AS marchdisc,
                SUM(IF(MONTH = 4, numRecords, 0)) AS april,
                SUM(IF(MONTH = 4, totaltax, 0)) AS apriltax,
                SUM(IF(MONTH = 4, totaldiscount, 0)) AS aprildisc,
                SUM(IF(MONTH = 5, numRecords, 0)) AS may,
                SUM(IF(MONTH = 5, totaltax, 0)) AS maytax,
                SUM(IF(MONTH = 5, totaldiscount, 0)) AS maydisc,
                SUM(IF(MONTH = 6, numRecords, 0)) AS june,
                SUM(IF(MONTH = 6, totaltax, 0)) AS junetax,
                SUM(IF(MONTH = 6, totaldiscount, 0)) AS junedisc,
                SUM(IF(MONTH = 7, numRecords, 0)) AS july,
                SUM(IF(MONTH = 7, totaltax, 0)) AS julytax,
                SUM(IF(MONTH = 7, totaldiscount, 0)) AS julydisc,
                SUM(IF(MONTH = 8, numRecords, 0)) AS august,
                SUM(IF(MONTH = 8, totaltax, 0)) AS augusttax,
                SUM(IF(MONTH = 8, totaldiscount, 0)) AS augustdisc,
                SUM(IF(MONTH = 9, numRecords, 0)) AS september,
                SUM(IF(MONTH = 9, totaltax, 0)) AS septembertax,
                SUM(IF(MONTH = 9, totaldiscount, 0)) AS septemberdisc,
                SUM(IF(MONTH = 10, numRecords, 0)) AS october,
                SUM(IF(MONTH = 10, totaltax, 0)) AS octobertax,
                SUM(IF(MONTH = 10, totaldiscount, 0)) AS octoberdisc,
                SUM(IF(MONTH = 11, numRecords, 0)) AS november,
                SUM(IF(MONTH = 11, totaltax, 0)) AS novembertax,
                SUM(IF(MONTH = 11, totaldiscount, 0)) AS novemberdisc,
                SUM(IF(MONTH = 12, numRecords, 0)) AS december,
                SUM(IF(MONTH = 12, totaltax, 0)) AS decembertax,
                SUM(IF(MONTH = 12, totaldiscount, 0)) AS decemberdisc,
                SUM(numRecords) AS total,
                SUM(totaltax) AS totalstax,
                SUM(totaldiscount) AS totaldisc
            FROM (
                SELECT 
                    id,
                    MONTH(created_at) AS MONTH,
                    ROUND(SUM(total)) AS numRecords,
                    ROUND(SUM(taxamount)) AS totaltax,
                    ROUND(SUM(discountamount)) AS totaldiscount
                FROM sales 
                WHERE DATE_FORMAT(created_at, '%Y') = $year 
                GROUP BY id, MONTH
            ) AS SubTable1
        ");

        $monthlyExp = Expence::find_by_sql("
            SELECT 
                SUM(IF(MONTH = 1, numRecords, 0)) AS january,
                SUM(IF(MONTH = 2, numRecords, 0)) AS feburary,
                SUM(IF(MONTH = 3, numRecords, 0)) AS march,
                SUM(IF(MONTH = 4, numRecords, 0)) AS april,
                SUM(IF(MONTH = 5, numRecords, 0)) AS may,
                SUM(IF(MONTH = 6, numRecords, 0)) AS june,
                SUM(IF(MONTH = 7, numRecords, 0)) AS july,
                SUM(IF(MONTH = 8, numRecords, 0)) AS august,
                SUM(IF(MONTH = 9, numRecords, 0)) AS september,
                SUM(IF(MONTH = 10, numRecords, 0)) AS october,
                SUM(IF(MONTH = 11, numRecords, 0)) AS november,
                SUM(IF(MONTH = 12, numRecords, 0)) AS december,
                SUM(numRecords) AS total
            FROM (
                SELECT 
                    id,
                    MONTH(date) AS MONTH,
                    ROUND(SUM(amount)) AS numRecords
                FROM expences 
                WHERE DATE_FORMAT(date, '%Y') = $year 
                GROUP BY id, MONTH
            ) AS SubTable1
        ");

        $data = [
            'customers' => Customer_model::all(),
            'Products' => Product::all(),
            'Stores' => Store_model::all(),
            'Warehouses' => Warehouse::all(),
            'monthly' => $monthlySales,
            'monthlyExp' => $monthlyExp,
            'year' => $year,
            'Top5product' => $Top5product,
            'TodaySales' => number_format((float)$TodaySales[0]->sum, $this->setting['decimals'] ?? 2, '.', ''),
            'CustomerNumber' => count(Customer_model::all()),
            'CategoriesNumber' => count(Category_model::all()),
            'ProductNumber' => count(Product::all()),
        ];

        return view('report/purchasereport', $data);
    }



    public function purchasedailyreport()
    {
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');

        $date = date("Y-m-d");
        $year = date("Y");

        return view('report/purchasedailyreport');
    }
    public function purchaseproductreport()
    {

        return $this->render('purchasedailyreportproduct');
    }


    public function purchasetally()
    {
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');

        $date = date("Y-m-d");
        $year = date("Y");

        $TodaySales = (new \App\Models\SaleModel())
            ->selectSum('total')
            ->where('created_at', $date)
            ->first();

        $Top5product = (new \App\Models\SaleItemModel())
            ->select('name, product_id, SUM(qt) AS totalquantity')
            ->where("YEAR(date)", $year)
            ->groupBy('product_id')
            ->orderBy('totalquantity', 'DESC')
            ->limit(5)
            ->findAll();

        // Raw monthly sales data query (can be moved to model later)
        $db = \Config\Database::connect();
        $monthlySales = $db->query("
            SELECT 
                SUM(IF(MONTH = 1, numRecords, 0)) AS january,
                SUM(IF(MONTH = 1, totaltax, 0)) AS januarytax,
                SUM(IF(MONTH = 1, totaldiscount, 0)) AS januarydisc,
                ...
                SUM(numRecords) AS total,
                SUM(totaltax) AS totalstax,
                SUM(totaldiscount) AS totaldisc
            FROM (
                SELECT 
                    id,
                    MONTH(created_at) AS MONTH,
                    ROUND(SUM(total)) AS numRecords,
                    ROUND(SUM(taxamount)) AS totaltax,
                    ROUND(SUM(discountamount)) AS totaldiscount
                FROM sales 
                WHERE YEAR(created_at) = ?
                GROUP BY id, MONTH
            ) AS SubTable1
        ", [$year])->getResult();

        $monthlyExp = $db->query("
            SELECT 
                SUM(IF(MONTH = 1, numRecords, 0)) AS january,
                ...
                SUM(numRecords) AS total
            FROM (
                SELECT 
                    id,
                    MONTH(date) AS MONTH,
                    ROUND(SUM(amount)) AS numRecords
                FROM expences 
                WHERE YEAR(date) = ?
                GROUP BY id, MONTH
            ) AS SubTable1
        ", [$year])->getResult();

        $data = [
            'customers'        => (new \App\Models\CustomerModel())->findAll(),
            'Products'         => (new \App\Models\ProductModel())->findAll(),
            'Stores'           => (new \App\Models\StoreModel())->findAll(),
            'Warehouses'       => (new \App\Models\WarehouseModel())->findAll(),
            'monthly'          => $monthlySales,
            'monthlyExp'       => $monthlyExp,
            'year'             => $year,
            'Top5product'      => $Top5product,
            'TodaySales'       => number_format((float)($TodaySales['total'] ?? 0), $this->setting['decimals'] ?? 2, '.', ''),
            'CustomerNumber'   => (new \App\Models\CustomerModel())->countAll(),
            'CategoriesNumber' => (new \App\Models\CategoryModel())->countAll(),
            'ProductNumber'    => (new \App\Models\ProductModel())->countAll()
        ];

        return view('report/purchasetally', $data);
    }




    public function salestally()
    {
        date_default_timezone_set($this->setting->timezone);

        $date = date("Y-m-d");
        $year = date("Y");

        $db = \Config\Database::connect();

        // Today Sales
        $TodaySalesQuery = $db->query("SELECT SUM(total) AS sum FROM sales WHERE created_at = ?", [$date]);
        $TodaySales = $TodaySalesQuery->getRow();

        // Top 5 Products
        $Top5Query = $db->query("SELECT name, product_id, SUM(qt) AS totalquantity FROM sale_items WHERE DATE_FORMAT(date, '%Y') = ? GROUP BY product_id ORDER BY totalquantity DESC LIMIT 5", [$year]);
        $Top5product = $Top5Query->getResult();

        // Monthly Sales
        $monthlySalesQuery = $db->query("SELECT SUM(IF(MONTH = 1, numRecords, 0)) AS january,
            SUM(IF(MONTH = 1, totaltax, 0)) AS januarytax,
            SUM(IF(MONTH = 1, totaldiscount, 0)) AS januarydisc,
            SUM(IF(MONTH = 2, numRecords, 0)) AS feburary,
            SUM(IF(MONTH = 2, totaltax, 0)) AS feburarytax,
            SUM(IF(MONTH = 2, totaldiscount, 0)) AS feburarydisc,
            SUM(IF(MONTH = 3, numRecords, 0)) AS march,
            SUM(IF(MONTH = 3, totaltax, 0)) AS marchtax,
            SUM(IF(MONTH = 3, totaldiscount, 0)) AS marchdisc,
            SUM(IF(MONTH = 4, numRecords, 0)) AS april,
            SUM(IF(MONTH = 4, totaltax, 0)) AS apriltax,
            SUM(IF(MONTH = 4, totaldiscount, 0)) AS aprildisc,
            SUM(IF(MONTH = 5, numRecords, 0)) AS may,
            SUM(IF(MONTH = 5, totaltax, 0)) AS maytax,
            SUM(IF(MONTH = 5, totaldiscount, 0)) AS maydisc,
            SUM(IF(MONTH = 6, numRecords, 0)) AS june,
            SUM(IF(MONTH = 6, totaltax, 0)) AS junetax,
            SUM(IF(MONTH = 6, totaldiscount, 0)) AS junedisc,
            SUM(IF(MONTH = 7, numRecords, 0)) AS july,
            SUM(IF(MONTH = 7, totaltax, 0)) AS julytax,
            SUM(IF(MONTH = 7, totaldiscount, 0)) AS julydisc,
            SUM(IF(MONTH = 8, numRecords, 0)) AS august,
            SUM(IF(MONTH = 8, totaltax, 0)) AS augusttax,
            SUM(IF(MONTH = 8, totaldiscount, 0)) AS augustdisc,
            SUM(IF(MONTH = 9, numRecords, 0)) AS september,
            SUM(IF(MONTH = 9, totaltax, 0)) AS septembertax,
            SUM(IF(MONTH = 9, totaldiscount, 0)) AS septemberdisc,
            SUM(IF(MONTH = 10, numRecords, 0)) AS october,
            SUM(IF(MONTH = 10, totaltax, 0)) AS octobertax,
            SUM(IF(MONTH = 10, totaldiscount, 0)) AS octoberdisc,
            SUM(IF(MONTH = 11, numRecords, 0)) AS november,
            SUM(IF(MONTH = 11, totaltax, 0)) AS novembertax,
            SUM(IF(MONTH = 11, totaldiscount, 0)) AS novemberdisc,
            SUM(IF(MONTH = 12, numRecords, 0)) AS december,
            SUM(IF(MONTH = 12, totaltax, 0)) AS decembertax,
            SUM(IF(MONTH = 12, totaldiscount, 0)) AS decemberdisc,
            SUM(numRecords) AS total,
            SUM(totaltax) AS totalstax,
            SUM(totaldiscount) AS totaldisc
            FROM (
                SELECT id, MONTH(created_at) AS MONTH,
                ROUND(SUM(total)) AS numRecords,
                ROUND(SUM(taxamount)) AS totaltax,
                ROUND(SUM(discountamount)) AS totaldiscount
                FROM sales WHERE DATE_FORMAT(created_at, '%Y') = ?
                GROUP BY id, MONTH
            ) AS SubTable1", [$year]);
        $monthlySales = $monthlySalesQuery->getRow();

        // Monthly Expenses
        $monthlyExpQuery = $db->query("SELECT SUM(IF(MONTH = 1, numRecords, 0)) AS january,
            SUM(IF(MONTH = 2, numRecords, 0)) AS feburary,
            SUM(IF(MONTH = 3, numRecords, 0)) AS march,
            SUM(IF(MONTH = 4, numRecords, 0)) AS april,
            SUM(IF(MONTH = 5, numRecords, 0)) AS may,
            SUM(IF(MONTH = 6, numRecords, 0)) AS june,
            SUM(IF(MONTH = 7, numRecords, 0)) AS july,
            SUM(IF(MONTH = 8, numRecords, 0)) AS august,
            SUM(IF(MONTH = 9, numRecords, 0)) AS september,
            SUM(IF(MONTH = 10, numRecords, 0)) AS october,
            SUM(IF(MONTH = 11, numRecords, 0)) AS november,
            SUM(IF(MONTH = 12, numRecords, 0)) AS december,
            SUM(numRecords) AS total
            FROM (
                SELECT id, MONTH(date) AS MONTH, ROUND(SUM(amount)) AS numRecords
                FROM expences WHERE DATE_FORMAT(date, '%Y') = ?
                GROUP BY id, MONTH
            ) AS SubTable1", [$year]);
        $monthlyExp = $monthlyExpQuery->getRow();

        // Prepare data
        $data = [
            'customers' => (new CustomerModel())->findAll(),
            'Products' => (new ProductModel())->findAll(),
            'Stores' => (new StoreModel())->findAll(),
            'Warehouses' => (new WarehouseModel())->findAll(),
            'monthly' => $monthlySales,
            'monthlyExp' => $monthlyExp,
            'year' => $year,
            'Top5product' => $Top5product,
            'TodaySales' => number_format((float)$TodaySales->sum, $this->setting->decimals, '.', ''),
            'CustomerNumber' => (new CustomerModel())->countAll(),
            'CategoriesNumber' => (new CategoryModel())->countAll(),
            'ProductNumber' => (new ProductModel())->countAll()
        ];

        return view('salestally', $data);
    }



    public function purchasedealerreport()
    {
        date_default_timezone_set($this->setting->timezone);

        return $this->render('purchasedealerreport', [
            'CustomerNumber' => count(model('CustomerModel')->findAll()),
            'CategoriesNumber' => count(model('CategoryModel')->findAll()),
            'ProductNumber' => count(model('ProductModel')->findAll())
        ]);
    }



    public function purchasemonthlyreport()
    {
        date_default_timezone_set($this->setting->timezone);
        $date = date("Y-m-d");
        $year = date("Y");

        $db = \Config\Database::connect();

        $TodaySales = $db->query("SELECT SUM(total) AS sum FROM sales WHERE created_at = ?", [$date])->getRow();
        $Top5product = $db->query("SELECT name, product_id, SUM(qt) AS totalquantity FROM sale_items WHERE DATE_FORMAT(date, '%Y') = ? GROUP BY product_id ORDER BY SUM(qt) DESC LIMIT 5", [$year])->getResult();

        $monthlySales = $db->query("
            SELECT
                SUM(IF(MONTH = 1, numRecords, 0)) AS january,
                SUM(IF(MONTH = 1, totaltax, 0)) AS januarytax,
                SUM(IF(MONTH = 1, totaldiscount, 0)) AS januarydisc,
                SUM(IF(MONTH = 2, numRecords, 0)) AS feburary,
                SUM(IF(MONTH = 2, totaltax, 0)) AS feburarytax,
                SUM(IF(MONTH = 2, totaldiscount, 0)) AS feburarydisc,
                SUM(IF(MONTH = 3, numRecords, 0)) AS march,
                SUM(IF(MONTH = 3, totaltax, 0)) AS marchtax,
                SUM(IF(MONTH = 3, totaldiscount, 0)) AS marchdisc,
                SUM(IF(MONTH = 4, numRecords, 0)) AS april,
                SUM(IF(MONTH = 4, totaltax, 0)) AS apriltax,
                SUM(IF(MONTH = 4, totaldiscount, 0)) AS aprildisc,
                SUM(IF(MONTH = 5, numRecords, 0)) AS may,
                SUM(IF(MONTH = 5, totaltax, 0)) AS maytax,
                SUM(IF(MONTH = 5, totaldiscount, 0)) AS maydisc,
                SUM(IF(MONTH = 6, numRecords, 0)) AS june,
                SUM(IF(MONTH = 6, totaltax, 0)) AS junetax,
                SUM(IF(MONTH = 6, totaldiscount, 0)) AS junedisc,
                SUM(IF(MONTH = 7, numRecords, 0)) AS july,
                SUM(IF(MONTH = 7, totaltax, 0)) AS julytax,
                SUM(IF(MONTH = 7, totaldiscount, 0)) AS julydisc,
                SUM(IF(MONTH = 8, numRecords, 0)) AS august,
                SUM(IF(MONTH = 8, totaltax, 0)) AS augusttax,
                SUM(IF(MONTH = 8, totaldiscount, 0)) AS augustdisc,
                SUM(IF(MONTH = 9, numRecords, 0)) AS september,
                SUM(IF(MONTH = 9, totaltax, 0)) AS septembertax,
                SUM(IF(MONTH = 9, totaldiscount, 0)) AS septemberdisc,
                SUM(IF(MONTH = 10, numRecords, 0)) AS october,
                SUM(IF(MONTH = 10, totaltax, 0)) AS octobertax,
                SUM(IF(MONTH = 10, totaldiscount, 0)) AS octoberdisc,
                SUM(IF(MONTH = 11, numRecords, 0)) AS november,
                SUM(IF(MONTH = 11, totaltax, 0)) AS novembertax,
                SUM(IF(MONTH = 11, totaldiscount, 0)) AS novemberdisc,
                SUM(IF(MONTH = 12, numRecords, 0)) AS december,
                SUM(IF(MONTH = 12, totaltax, 0)) AS decembertax,
                SUM(IF(MONTH = 12, totaldiscount, 0)) AS decemberdisc,
                SUM(numRecords) AS total,
                SUM(totaltax) AS totalstax,
                SUM(totaldiscount) AS totaldisc
            FROM (
                SELECT id, MONTH(created_at) AS MONTH,
                       ROUND(SUM(total)) AS numRecords,
                       ROUND(SUM(taxamount)) AS totaltax,
                       ROUND(SUM(discountamount)) AS totaldiscount
                FROM sales
                WHERE DATE_FORMAT(created_at, '%Y') = ?
                GROUP BY id, MONTH
            ) AS SubTable1
        ", [$year])->getRow();

        $monthlyExp = $db->query("
            SELECT
                SUM(IF(MONTH = 1, numRecords, 0)) AS january,
                SUM(IF(MONTH = 2, numRecords, 0)) AS feburary,
                SUM(IF(MONTH = 3, numRecords, 0)) AS march,
                SUM(IF(MONTH = 4, numRecords, 0)) AS april,
                SUM(IF(MONTH = 5, numRecords, 0)) AS may,
                SUM(IF(MONTH = 6, numRecords, 0)) AS june,
                SUM(IF(MONTH = 7, numRecords, 0)) AS july,
                SUM(IF(MONTH = 8, numRecords, 0)) AS august,
                SUM(IF(MONTH = 9, numRecords, 0)) AS september,
                SUM(IF(MONTH = 10, numRecords, 0)) AS october,
                SUM(IF(MONTH = 11, numRecords, 0)) AS november,
                SUM(IF(MONTH = 12, numRecords, 0)) AS december,
                SUM(numRecords) AS total
            FROM (
                SELECT id, MONTH(date) AS MONTH, ROUND(SUM(amount)) AS numRecords
                FROM expences
                WHERE DATE_FORMAT(date, '%Y') = ?
                GROUP BY id, MONTH
            ) AS SubTable1
        ", [$year])->getRow();

        return view('purchasemonthlyreport', [
            'customers'         => model('CustomerModel')->findAll(),
            'Products'          => model('Product')->findAll(),
            'Stores'            => model('StoreModel')->findAll(),
            'Warehouses'        => model('Warehouse')->findAll(),
            'monthly'           => $monthlySales,
            'monthlyExp'        => $monthlyExp,
            'year'              => $year,
            'Top5product'       => $Top5product,
            'TodaySales'        => number_format((float)($TodaySales->sum ?? 0), $this->setting->decimals, '.', ''),
            'CustomerNumber'    => model('CustomerModel')->countAllResults(),
            'CategoriesNumber'  => model('CategoryModel')->countAllResults(),
            'ProductNumber'     => model('Product')->countAllResults(),
        ]);
    }



    public function salesdailyreport()
    {
        date_default_timezone_set($this->setting->timezone);

        $db = \Config\Database::connect();
        $date = date("Y-m-d");
        $year = date("Y");

        $TodaySales = $db->query("SELECT SUM(total) AS sum FROM sales WHERE created_at = ?", [$date])->getRow();
        $Top5product = $db->query("SELECT name, product_id, SUM(qt) AS totalquantity FROM sale_items WHERE DATE_FORMAT(date, '%Y') = ? GROUP BY product_id ORDER BY SUM(qt) DESC LIMIT 5", [$year])->getResult();

        $monthlySales = $db->query("
            SELECT
                SUM(IF(MONTH = 1, numRecords, 0)) AS january,
                SUM(IF(MONTH = 1, totaltax, 0)) AS januarytax,
                SUM(IF(MONTH = 1, totaldiscount, 0)) AS januarydisc,
                SUM(IF(MONTH = 2, numRecords, 0)) AS feburary,
                SUM(IF(MONTH = 2, totaltax, 0)) AS feburarytax,
                SUM(IF(MONTH = 2, totaldiscount, 0)) AS feburarydisc,
                SUM(IF(MONTH = 3, numRecords, 0)) AS march,
                SUM(IF(MONTH = 3, totaltax, 0)) AS marchtax,
                SUM(IF(MONTH = 3, totaldiscount, 0)) AS marchdisc,
                SUM(IF(MONTH = 4, numRecords, 0)) AS april,
                SUM(IF(MONTH = 4, totaltax, 0)) AS apriltax,
                SUM(IF(MONTH = 4, totaldiscount, 0)) AS aprildisc,
                SUM(IF(MONTH = 5, numRecords, 0)) AS may,
                SUM(IF(MONTH = 5, totaltax, 0)) AS maytax,
                SUM(IF(MONTH = 5, totaldiscount, 0)) AS maydisc,
                SUM(IF(MONTH = 6, numRecords, 0)) AS june,
                SUM(IF(MONTH = 6, totaltax, 0)) AS junetax,
                SUM(IF(MONTH = 6, totaldiscount, 0)) AS junedisc,
                SUM(IF(MONTH = 7, numRecords, 0)) AS july,
                SUM(IF(MONTH = 7, totaltax, 0)) AS julytax,
                SUM(IF(MONTH = 7, totaldiscount, 0)) AS julydisc,
                SUM(IF(MONTH = 8, numRecords, 0)) AS august,
                SUM(IF(MONTH = 8, totaltax, 0)) AS augusttax,
                SUM(IF(MONTH = 8, totaldiscount, 0)) AS augustdisc,
                SUM(IF(MONTH = 9, numRecords, 0)) AS september,
                SUM(IF(MONTH = 9, totaltax, 0)) AS septembertax,
                SUM(IF(MONTH = 9, totaldiscount, 0)) AS septemberdisc,
                SUM(IF(MONTH = 10, numRecords, 0)) AS october,
                SUM(IF(MONTH = 10, totaltax, 0)) AS octobertax,
                SUM(IF(MONTH = 10, totaldiscount, 0)) AS octoberdisc,
                SUM(IF(MONTH = 11, numRecords, 0)) AS november,
                SUM(IF(MONTH = 11, totaltax, 0)) AS novembertax,
                SUM(IF(MONTH = 11, totaldiscount, 0)) AS novemberdisc,
                SUM(IF(MONTH = 12, numRecords, 0)) AS december,
                SUM(IF(MONTH = 12, totaltax, 0)) AS decembertax,
                SUM(IF(MONTH = 12, totaldiscount, 0)) AS decemberdisc,
                SUM(numRecords) AS total,
                SUM(totaltax) AS totalstax,
                SUM(totaldiscount) AS totaldisc
            FROM (
                SELECT id, MONTH(created_at) AS MONTH,
                       ROUND(SUM(total)) AS numRecords,
                       ROUND(SUM(taxamount)) AS totaltax,
                       ROUND(SUM(discountamount)) AS totaldiscount
                FROM sales
                WHERE DATE_FORMAT(created_at, '%Y') = ?
                GROUP BY id, MONTH
            ) AS SubTable1
        ", [$year])->getRow();

        $monthlyExp = $db->query("
            SELECT
                SUM(IF(MONTH = 1, numRecords, 0)) AS january,
                SUM(IF(MONTH = 2, numRecords, 0)) AS feburary,
                SUM(IF(MONTH = 3, numRecords, 0)) AS march,
                SUM(IF(MONTH = 4, numRecords, 0)) AS april,
                SUM(IF(MONTH = 5, numRecords, 0)) AS may,
                SUM(IF(MONTH = 6, numRecords, 0)) AS june,
                SUM(IF(MONTH = 7, numRecords, 0)) AS july,
                SUM(IF(MONTH = 8, numRecords, 0)) AS august,
                SUM(IF(MONTH = 9, numRecords, 0)) AS september,
                SUM(IF(MONTH = 10, numRecords, 0)) AS october,
                SUM(IF(MONTH = 11, numRecords, 0)) AS november,
                SUM(IF(MONTH = 12, numRecords, 0)) AS december,
                SUM(numRecords) AS total
            FROM (
                SELECT id, MONTH(date) AS MONTH,
                       ROUND(SUM(amount)) AS numRecords
                FROM expences
                WHERE DATE_FORMAT(date, '%Y') = ?
                GROUP BY id, MONTH
            ) AS SubTable1
        ", [$year])->getRow();

        return view('salesdailyreportss', [
            'customers'         => model('CustomerModel')->findAll(),
            'Products'          => model('Product')->findAll(),
            'Stores'            => model('StoreModel')->findAll(),
            'Warehouses'        => model('Warehouse')->findAll(),
            'monthly'           => $monthlySales,
            'monthlyExp'        => $monthlyExp,
            'year'              => $year,
            'Top5product'       => $Top5product,
            'TodaySales'        => number_format((float)($TodaySales->sum ?? 0), $this->setting->decimals, '.', ''),
            'CustomerNumber'    => model('CustomerModel')->countAllResults(),
            'CategoriesNumber'  => model('CategoryModel')->countAllResults(),
            'ProductNumber'     => model('Product')->countAllResults(),
        ]);
    }



    public function totalsalesreport()
    {
        date_default_timezone_set($this->setting->timezone);

        $setting = model(\App\Models\SettingModel::class)->find(1);
        $storeModel = model('StoreModel');
        $currentStore = $storeModel->find(session('store')) ?? $storeModel->first();

        return $this->render('salestotalreportss', [
            'customers'    => model('CustomerModel')->findAll(),
            'stores'       => $storeModel->findAll(),
            'setting'      => $setting,
            'currentStore' => $currentStore,
        ]);
    }



    public function cashinhandreport()
    {
        // Set timezone from your settings (adjust this as needed)
        date_default_timezone_set(config('Settings')->timezone ?? 'UTC');

        $date = date("Y-m-d");
        $year = date("Y");

        // Load customers
        $CustomerModel = new CustomerModel();
        $customers = $CustomerModel->findAll();

        // Return the view with data
        return $this->render('cashinhandreport', [
            'customers' => $customers,
            'date' => $date,
            'year' => $year
        ]);
    }



    public function totalsalesreport1()
    {
        date_default_timezone_set($this->setting->timezone);

        return view('salestotalreportss1', [
            'customers' => model('CustomerModel')->findAll(),
        ]);
    }


    public function totalsalesreporthsn()
    {
        date_default_timezone_set($this->setting->timezone);
        $date = date("Y-m-d");
        $year = date("Y");

        $TodaySales = model('SaleModel')->customQuery("SELECT SUM(total) AS sum FROM sales WHERE created_at = '$date'");
        $Top5product = model('SaleItemModel')->customQuery("SELECT name, product_id, SUM(qt) AS totalquantity FROM sale_items WHERE DATE_FORMAT(date, '%Y') = $year GROUP BY product_id ORDER BY SUM(qt) DESC LIMIT 5");
        $monthlySales = model('SaleModel')->customQuery("
            SELECT
                SUM(IF(MONTH = 1, numRecords, 0)) AS january,
                SUM(IF(MONTH = 1, totaltax, 0)) AS januarytax,
                SUM(IF(MONTH = 1, totaldiscount, 0)) AS januarydisc,
                ...
                SUM(IF(MONTH = 12, numRecords, 0)) AS december,
                SUM(IF(MONTH = 12, totaltax, 0)) AS decembertax,
                SUM(IF(MONTH = 12, totaldiscount, 0)) AS decemberdisc,
                SUM(numRecords) AS total,
                SUM(totaltax) AS totalstax,
                SUM(totaldiscount) AS totaldisc
            FROM (
                SELECT
                    id,
                    MONTH(created_at) AS MONTH,
                    ROUND(SUM(total)) AS numRecords,
                    ROUND(SUM(taxamount)) AS totaltax,
                    ROUND(SUM(discountamount)) AS totaldiscount
                FROM sales
                WHERE DATE_FORMAT(created_at, '%Y') = $year
                GROUP BY id, MONTH
            ) AS SubTable1
        ");

        $monthlyExp = model('ExpenceModel')->customQuery("
            SELECT
                SUM(IF(MONTH = 1, numRecords, 0)) AS january,
                ...
                SUM(IF(MONTH = 12, numRecords, 0)) AS december,
                SUM(numRecords) AS total
            FROM (
                SELECT
                    id,
                    MONTH(date) AS MONTH,
                    ROUND(SUM(amount)) AS numRecords
                FROM expences
                WHERE DATE_FORMAT(date, '%Y') = $year
                GROUP BY id, MONTH
            ) AS SubTable1
        ");

        return view('salprodalreportss', [
            'customers'        => model('CustomerModel')->findAll(),
            'Products'         => model('ProductModel')->findAll(),
            'Stores'           => model('StoreModel')->findAll(),
            'Warehouses'       => model('WarehouseModel')->findAll(),
            'monthly'          => $monthlySales,
            'monthlyExp'       => $monthlyExp,
            'year'             => $year,
            'Top5product'      => $Top5product,
            'TodaySales'       => number_format((float)($TodaySales[0]->sum ?? 0), $this->setting->decimals, '.', ''),
            'CustomerNumber'   => model('CustomerModel')->countAllResults(),
            'CategoriesNumber' => model('CategoryModel')->countAllResults(),
            'ProductNumber'    => model('ProductModel')->countAllResults(),
        ]);
    }




    public function profitdailyreport()
    {
        date_default_timezone_set($this->setting->timezone);
        $date = date("Y-m-d");
        $year = date("Y");

        $db = \Config\Database::connect();
        $TodaySales = $db->query("SELECT SUM(total) AS sum FROM sales WHERE created_at = '$date'");
        $Top5product = $db->query("SELECT name, product_id, SUM(qt) AS totalquantity FROM sale_items WHERE DATE_FORMAT(date, '%Y') = $year GROUP BY product_id ORDER BY SUM(qt) DESC LIMIT 5");

        $sql = "
            SELECT
                SUM(IF(MONTH = 1, numRecords, 0)) AS january,
                SUM(IF(MONTH = 1, totaltax, 0)) AS januarytax,
                SUM(IF(MONTH = 1, totaldiscount, 0)) AS januarydisc,
                SUM(IF(MONTH = 2, numRecords, 0)) AS february,
                SUM(IF(MONTH = 2, totaltax, 0)) AS februarytax,
                SUM(IF(MONTH = 2, totaldiscount, 0)) AS februarydisc,
                -- repeat for other months up to December
                SUM(IF(MONTH = 12, numRecords, 0)) AS december,
                SUM(IF(MONTH = 12, totaltax, 0)) AS decembertax,
                SUM(IF(MONTH = 12, totaldiscount, 0)) AS decemberdisc,
                SUM(numRecords) AS total,
                SUM(totaltax) AS totalstax,
                SUM(totaldiscount) AS totaldisc
            FROM (
                SELECT
                    id,
                    MONTH(created_at) AS MONTH,
                    ROUND(SUM(total)) AS numRecords,
                    ROUND(SUM(taxamount)) AS totaltax,
                    ROUND(SUM(discountamount)) AS totaldiscount
                FROM sales
                WHERE YEAR(created_at) = ?
                GROUP BY id, MONTH
            ) AS SubTable1
        ";

        $monthlySales = $db->query($sql, [$year])->getRow();


        $sql1 = "
                SELECT
                    SUM(IF(MONTH = 1, numRecords, 0)) AS january,
                    SUM(IF(MONTH = 2, numRecords, 0)) AS february,
                    SUM(IF(MONTH = 3, numRecords, 0)) AS march,
                    SUM(IF(MONTH = 4, numRecords, 0)) AS april,
                    SUM(IF(MONTH = 5, numRecords, 0)) AS may,
                    SUM(IF(MONTH = 6, numRecords, 0)) AS june,
                    SUM(IF(MONTH = 7, numRecords, 0)) AS july,
                    SUM(IF(MONTH = 8, numRecords, 0)) AS august,
                    SUM(IF(MONTH = 9, numRecords, 0)) AS september,
                    SUM(IF(MONTH = 10, numRecords, 0)) AS october,
                    SUM(IF(MONTH = 11, numRecords, 0)) AS november,
                    SUM(IF(MONTH = 12, numRecords, 0)) AS december,
                    SUM(numRecords) AS total
                FROM (
                    SELECT
                        id,
                        MONTH(date) AS MONTH,
                        ROUND(SUM(amount)) AS numRecords
                    FROM expences
                    WHERE YEAR(date) = ?
                    GROUP BY id, MONTH
                ) AS SubTable1
                ";

        $monthlyExp = $db->query($sql1, [$year])->getRow();

        return $this->render('profitdailyreportss', [
            'customers'        => model('CustomerModel')->findAll(),
            'Products'         => model('ProductModel')->findAll(),
            'Stores'           => model('StoreModel')->findAll(),
            'Warehouses'       => model('WarehouseModel')->findAll(),
            'monthly'          => $monthlySales,
            'monthlyExp'       => $monthlyExp,
            'year'             => $year,
            'Top5product'      => $Top5product,
            'TodaySales' => number_format((float)($TodaySales->sum ?? 0), $this->setting->decimals, '.', ''),
            'CustomerNumber'   => model('CustomerModel')->countAllResults(),
            'CategoriesNumber' => model('CategoryModel')->countAllResults(),
            'ProductNumber'    => model('ProductModel')->countAllResults(),
        ]);
    }





    public function stockstorereport()
    {
        date_default_timezone_set($this->setting->timezone);
        $date = date("Y-m-d");
        $year = date("Y");

        $TodaySales = model('SaleModel')->customQuery("SELECT SUM(total) AS sum FROM sales WHERE created_at = '$date'");
        $Top5product = model('SaleItemModel')->customQuery("
            SELECT name, product_id, SUM(qt) AS totalquantity
            FROM sale_items
            WHERE DATE_FORMAT(date, '%Y') = $year
            GROUP BY product_id
            ORDER BY SUM(qt) DESC
            LIMIT 5
        ");


        $monthlySales = model('SaleModel')->customQuery("
            SELECT
                SUM(IF(MONTH = 1, numRecords, 0)) AS january,
                SUM(IF(MONTH = 1, totaltax, 0)) AS januarytax,
                SUM(IF(MONTH = 1, totaldiscount, 0)) AS januarydisc,
                SUM(IF(MONTH = 2, numRecords, 0)) AS feburary,
                SUM(IF(MONTH = 2, totaltax, 0)) AS feburarytax,
                SUM(IF(MONTH = 2, totaldiscount, 0)) AS feburarydisc,
                SUM(IF(MONTH = 3, numRecords, 0)) AS march,
                SUM(IF(MONTH = 3, totaltax, 0)) AS marchtax,
                SUM(IF(MONTH = 3, totaldiscount, 0)) AS marchdisc,
                SUM(IF(MONTH = 4, numRecords, 0)) AS april,
                SUM(IF(MONTH = 4, totaltax, 0)) AS apriltax,
                SUM(IF(MONTH = 4, totaldiscount, 0)) AS aprildisc,
                SUM(IF(MONTH = 5, numRecords, 0)) AS may,
                SUM(IF(MONTH = 5, totaltax, 0)) AS maytax,
                SUM(IF(MONTH = 5, totaldiscount, 0)) AS maydisc,
                SUM(IF(MONTH = 6, numRecords, 0)) AS june,
                SUM(IF(MONTH = 6, totaltax, 0)) AS junetax,
                SUM(IF(MONTH = 6, totaldiscount, 0)) AS junedisc,
                SUM(IF(MONTH = 7, numRecords, 0)) AS july,
                SUM(IF(MONTH = 7, totaltax, 0)) AS julytax,
                SUM(IF(MONTH = 7, totaldiscount, 0)) AS julydisc,
                SUM(IF(MONTH = 8, numRecords, 0)) AS august,
                SUM(IF(MONTH = 8, totaltax, 0)) AS augusttax,
                SUM(IF(MONTH = 8, totaldiscount, 0)) AS augustdisc,
                SUM(IF(MONTH = 9, numRecords, 0)) AS september,
                SUM(IF(MONTH = 9, totaltax, 0)) AS septembertax,
                SUM(IF(MONTH = 9, totaldiscount, 0)) AS septemberdisc,
                SUM(IF(MONTH = 10, numRecords, 0)) AS october,
                SUM(IF(MONTH = 10, totaltax, 0)) AS octobertax,
                SUM(IF(MONTH = 10, totaldiscount, 0)) AS octoberdisc,
                SUM(IF(MONTH = 11, numRecords, 0)) AS november,
                SUM(IF(MONTH = 11, totaltax, 0)) AS novembertax,
                SUM(IF(MONTH = 11, totaldiscount, 0)) AS novemberdisc,
                SUM(IF(MONTH = 12, numRecords, 0)) AS december,
                SUM(IF(MONTH = 12, totaltax, 0)) AS decembertax,
                SUM(IF(MONTH = 12, totaldiscount, 0)) AS decemberdisc,
                SUM(numRecords) AS total,
                SUM(totaltax) AS totalstax,
                SUM(totaldiscount) AS totaldisc
            FROM (
                SELECT id, MONTH(created_at) AS MONTH,
                       ROUND(SUM(total)) AS numRecords,
                       ROUND(SUM(taxamount)) AS totaltax,
                       ROUND(SUM(discountamount)) AS totaldiscount
                FROM sales
                WHERE DATE_FORMAT(created_at, '%Y') = $year
                GROUP BY id, MONTH
            ) AS SubTable1
        ");

        $monthlyExp = model('ExpenceModel')->customQuery("
            SELECT
                SUM(IF(MONTH = 1, numRecords, 0)) AS january,
                SUM(IF(MONTH = 2, numRecords, 0)) AS feburary,
                SUM(IF(MONTH = 3, numRecords, 0)) AS march,
                SUM(IF(MONTH = 4, numRecords, 0)) AS april,
                SUM(IF(MONTH = 5, numRecords, 0)) AS may,
                SUM(IF(MONTH = 6, numRecords, 0)) AS june,
                SUM(IF(MONTH = 7, numRecords, 0)) AS july,
                SUM(IF(MONTH = 8, numRecords, 0)) AS august,
                SUM(IF(MONTH = 9, numRecords, 0)) AS september,
                SUM(IF(MONTH = 10, numRecords, 0)) AS october,
                SUM(IF(MONTH = 11, numRecords, 0)) AS november,
                SUM(IF(MONTH = 12, numRecords, 0)) AS december,
                SUM(numRecords) AS total
            FROM (
                SELECT id, MONTH(date) AS MONTH, ROUND(SUM(amount)) AS numRecords
                FROM expences
                WHERE DATE_FORMAT(date, '%Y') = $year
                GROUP BY id, MONTH
            ) AS SubTable1
        ");

        return view('storestockre', [
            'customers'        => model('CustomerModel')->findAll(),
            'Products'         => model('ProductModel')->findAll(),
            'Stores'           => model('StoreModel')->findAll(),
            'Warehouses'       => model('WarehouseModel')->findAll(),
            'monthly'          => $monthlySales,
            'monthlyExp'       => $monthlyExp,
            'year'             => $year,
            'Top5product'      => $Top5product,
            'TodaySales'       => number_format((float)($TodaySales[0]->sum ?? 0), $this->setting->decimals, '.', ''),
            'CustomerNumber'   => model('CustomerModel')->countAllResults(),
            'CategoriesNumber' => model('CategoryModel')->countAllResults(),
            'ProductNumber'    => model('ProductModel')->countAllResults(),
        ]);
    }






    public function clstockrackereport()
    {
        date_default_timezone_set($this->setting->timezone);
        $year = date("Y");

        return view('clstorestockre', [
            'customers'        => model('CustomerModel')->findAll(),
            'Products'         => model('ProductModel')->findAll(),
            'Stores'           => model('StoreModel')->findAll(),
            'Warehouses'       => model('WarehouseModel')->findAll(),
            'year'             => $year,
            'CustomerNumber'   => model('CustomerModel')->countAllResults(),
            'CategoriesNumber' => model('CategoryModel')->countAllResults(),
            'ProductNumber'    => model('ProductModel')->countAllResults(),
        ]);
    }


    public function stockrackreport()
    {
        date_default_timezone_set($this->setting->timezone);
        $year = date("Y");

        return view('storerackreport', [
            'customers'        => model('CustomerModel')->findAll(),
            'Products'         => model('ProductModel')->findAll(),
            'Stores'           => model('StoreModel')->findAll(),
            'Warehouses'       => model('WarehouseModel')->findAll(),
            'year'             => $year,
            'CustomerNumber'   => model('CustomerModel')->countAllResults(),
            'CategoriesNumber' => model('CategoryModel')->countAllResults(),
            'ProductNumber'    => model('ProductModel')->countAllResults(),
        ]);
    }



    public function fastreport()
    {
        date_default_timezone_set($this->setting->timezone);
        $year = date("Y");

        $customerModel  = new CustomerModel();
        $productModel   = new ProductModel();
        $storeModel     = new StoreModel();
        $categoryModel  = new CategoryModel();
        $warehouseModel = new WarehouseModel();

        return $this->render('fastreport', [
            'customers'        => $customerModel->findAll(),
            'Products'         => $productModel->findAll(),
            'Stores'           => $storeModel->findAll(),
            'cctt'             => $categoryModel->findAll(),
            'Warehouses'       => $warehouseModel->findAll(),
            'year'             => $year,
            'CustomerNumber'   => $customerModel->countAllResults(),
            'CategoriesNumber' => $categoryModel->countAllResults(),
            'ProductNumber'    => $productModel->countAllResults(),
        ]);
    }



    public function unsoldreport()
    {
        date_default_timezone_set($this->setting->timezone);
        $year = date("Y");

        return view('unsoldreport', [
            'customers'        => model('CustomerModel')->findAll(),
            'Products'         => model('ProductModel')->findAll(),
            'Stores'           => model('StoreModel')->findAll(),
            'Warehouses'       => model('WarehouseModel')->findAll(),
            'year'             => $year,
            'CustomerNumber'   => model('CustomerModel')->countAllResults(),
            'CategoriesNumber' => model('CategoryModel')->countAllResults(),
            'ProductNumber'    => model('ProductModel')->countAllResults(),
        ]);
    }


    public function stockallreport()
    {
        date_default_timezone_set($this->setting->timezone);
        $StoreMode = new StoreModel();
        return $this->render('storestockreall', [
            'Stores' => $StoreMode->findAll()
        ]);
    }
    
    
    
    
    
    /*new coding by adeel sharif*/
    
    public function totalsalesreportchek()
    {
        //print_r($this->request->getPost());
        $resultt = $this->serachresult( $this->request->getPost() );

        return $resultt;
    }
    public function totalsalesreport12()
    {
       //$request = service('request');
//print_r($this->request->getVar());exit;
         $searchTerm =$this->request->getVar();; 
        if(isset( $searchTerm ['innvdda']) || isset($_GET['page1'])){
           $resultt = $this->serachresult( $searchTerm );

           $setting = model(\App\Models\SettingModel::class)->find(1);
           return $this->render('salestotalreportss12', [
            'customers' => model('CustomerModel')->findAll(),
            'stores'    => model('StoreModel')->findAll(),
            'setting'   => $setting,
            'result'   => $resultt,
            'searchTerm'   => $searchTerm,
        ]);

          /*echo "<pre>"; print_r($resultt);
            exit;*/
            /*print_r($_POST);
            exit;*/

        }
        
        date_default_timezone_set($this->setting->timezone);

        $setting = model(\App\Models\SettingModel::class)->find(1);
        return $this->render('salestotalreportss12', [
            'customers' => model('CustomerModel')->findAll(),
            'stores'    => model('StoreModel')->findAll(),
            'setting'   => $setting,
        ]);
    }
    
        public function serachresult($request){

        $offset      = 0;
        $limit       = 25;
        $start       = $request['pddate'];
        $end         = $request['innvdda'];
        $esuppr      = $request['supp'];
        $pamode_id   = $request['people'];
         $page     = (int) ($request['page'] ?? 1);
        $perPage = 30;
        $storeId = session()->get('store');

            $poql = $this->db->query("select logo,themblock,companyname from settings where id=1 ")->getRowArray();
        $poss = $this->db->query("select adresse from stores where id=" . $storeId)->getRowArray();
        $kmmokk = base_url() . 'files/Setting/' . ($poql['logo'] ?? 'default_logo.png');

        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;
        $sales = '';
//echo $this->setting->sales_type;
 $builder = new SaleModel();
        if ($this->setting->sales_type == 1) {
            $sales = "sales";
            $sale_items = "sale_items";
            $tax_summary = "tax_summary";
             $builder = new SaleModel();
        } else if ($this->setting->sales_type == 0) {
            $sales = "dsales";
            $sale_items = "dsale_items";
            $tax_summary = "dtax_summary";
             $builder = new DsaleModel();
        }
        $ret_idd = $poql['themblock'];

        $rttt = $this->request->getPost('StoresSelect');

        if ($rttt > 0) {
            $rtttfc = 'registers.store_id=' . $rttt . ' and ';
        } else {
            $rtttfc = "";
        }

        if ($this->request->getPost('store') != '') {
            $rtttfc =  $rtttfc = 'registers.store_id=' . $this->request->getPost('store') . ' and ';
        }

        $la322x = explode('-', $start);
        $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];
        $from = $la32;

        $lax = explode('-', $end);
        $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
        $to   = $laxg;


        $data = array();


        $data = [];



        if ($this->setting->sales_type == 2) {
            $query = $this->getDataUnion();
            
            //print_r($query->getResultArray());exit;
            
            return view('ajax_list', [
            'result' => $query->getResultArray(),
            'pager'    => array(),
            'page'     => 1
        ]);
        } else {
            $db = \Config\Database::connect();
            /*$builder = $db->table($sales); // $sales should be your table name, like 'sales'
            // Select columns
            $builder->select("$sales.discountamount");
            $builder->select("$sales.recivamt");
            $builder->select("$sales.attime");
            $builder->select("$sales.paid");
            $builder->select("$sales.paidmethod");
            $builder->select("$sales.discount_indujul");
            $builder->select("$sales.recivamt2");
            $builder->select("$sales.total");
            $builder->select("$sales.disamtssh");
            $builder->select("$sales.subtotal");
            $builder->select("$sales.selddate");
            $builder->select("$sales.totalitems");
            $builder->select("$sales.id as ssid");
            $builder->select("$sales.status as ssstatus");
            $builder->select('customers.name as cname');
            $builder->select('stores.name as ssname');
            // Join base tables
            $builder->join('registers', "$sales.register_id = registers.id", 'left');
            $builder->join('customers', "$sales.client_id = customers.id", 'left');
            $builder->join('stores', 'registers.store_id = stores.id', 'left');

            if ($esuppr > 0) {
                if (!empty($rtttfc)) {
                    $builder->where($rtttfc);
                }
                $builder->where("$sales.client_id", $esuppr);
                $builder->where("$sales.selddate >=", $la32);
                $builder->where("$sales.selddate <=", $laxg);
                $builder->orderBy("$sales.id", 'desc');
            } elseif ($esuppr === '') {
                if (!empty($rtttfc)) {
                    $builder->where($rtttfc);
                }
                $builder->where("$sales.selddate >=", $la32);
                $builder->where("$sales.selddate <=", $laxg);
                $builder->orderBy("$sales.id", 'desc');
                // $builder->limit($limit, $offset);
            } else {
                if (!empty($rtttfc)) {
                    $builder->where($rtttfc);
                }
                $builder->where("$sales.client_id", 0);
                $builder->where("$sales.selddate >=", $la32);
                $builder->where("$sales.selddate <=", $laxg);
                $builder->orderBy("$sales.id", 'desc');
            }
           // $builder->limit($limit, $offset);
            // Run the que
            //$query = $builder->get();

             $query['reports'] = $builder->paginate(10);*/
            // $query['pager']   = $builder->pager;
        
          //$builder = new SaleModel();

        //$builder =$saleModel// $db->table($sales); // $sales should be your table name, like 'sales'
            // Select columns
            $builder->select("$sales.discountamount");
            $builder->select("$sales.recivamt");
            $builder->select("$sales.attime");
            $builder->select("$sales.paid");
            $builder->select("$sales.paidmethod");
            $builder->select("$sales.discount_indujul");
            $builder->select("$sales.recivamt2");
            $builder->select("$sales.total");
            $builder->select("$sales.disamtssh");
            $builder->select("$sales.subtotal");
            $builder->select("$sales.selddate");
            $builder->select("$sales.totalitems");
            $builder->select("$sales.client_id");
            $builder->select("$sales.id as ssid");
            $builder->select("$sales.status as ssstatus");
            $builder->select('customers.name as cname');
            $builder->select('stores.name as ssname');
            // Join base tables
            $builder->join('registers', "$sales.register_id = registers.id", 'left');
            $builder->join('customers', "$sales.client_id = customers.id", 'left');
            $builder->join('stores', 'registers.store_id = stores.id', 'left');

            if ($esuppr > 0) {
                if (!empty($rtttfc)) {
                    $builder->where($rtttfc);
                }
                $builder->where("$sales.client_id", $esuppr);
                $builder->where("$sales.selddate >=", $la32);
                $builder->where("$sales.selddate <=", $laxg);
                $builder->orderBy("$sales.id", 'desc');
            } elseif ($esuppr === '') {
                if (!empty($rtttfc)) {
                    $builder->where($rtttfc);
                }
                $builder->where("$sales.selddate >=", $la32);
                $builder->where("$sales.selddate <=", $laxg);
                $builder->orderBy("$sales.id", 'desc');
                // $builder->limit($limit, $offset);
            } else {
                if (!empty($rtttfc)) {
                    $builder->where($rtttfc);
                }
                $builder->where("$sales.client_id", 0);
                $builder->where("$sales.selddate >=", $la32);
                $builder->where("$sales.selddate <=", $laxg);
                $builder->orderBy("$sales.id", 'desc');
            }
       // $saleModel = new SaleModel();
          /// $dddsss= $saleModel->saleReport($sales,$esuppr,$la32,$laxg,$rtttfc);
           
         $res= $builder->paginate($perPage,'default', $page);
        //echo $this->db->getLastQuery();exit;
         $pager =$builder->pager;
         //$pager =$ddd->pager;
        }
         //print_r($ddd);

          return view('ajax_list', [
            'result' => $res,
            'pager'    => $pager,
            'page'     => $page
        ]);

        }
        
        
         public function getDataUnion()
    {
        $request = $this->request;

        $offset      = (int) $request->getPost('offset') ?? 0;
        $limit       = (int) $request->getPost('limit') ?? 50;
        $start       = trim($request->getPost('pddate'));
        $end         = trim($request->getPost('innvdda'));
        $esuppr      = $request->getPost('supp');
        $pamode_id   = $request->getPost('people');
        $storeId     = session()->get('store');
        $rttt        = $request->getPost('StoresSelect');

        $sales  = 'sales';
        $dsales = 'dsales';
        $db     = \Config\Database::connect();

        // Convert dates to Y-m-d
        $la322x = explode('-', $start);
        $la32   = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

        $lax    = explode('-', $end);
        $laxg   = $lax[2] . '-' . $lax[1] . '-' . $lax[0];

        // Base condition prevents syntax error with WHERE AND...
        $baseCondition = "1=1";

        // Store filter
        $storeFilter = '';
        if (!empty($rttt)) {
            $storeFilter = " AND registers.store_id = " . $db->escape($rttt);
        }

        // Build where clause for sales
        $where = " AND {$sales}.selddate BETWEEN " . $db->escape($la32) . " AND " . $db->escape($laxg);
        if ($esuppr !== '' && $esuppr > 0) {
            $where .= " AND {$sales}.client_id = " . $db->escape($esuppr);
        } elseif ($esuppr !== '') {
            $where .= "";
        }

        // Build where clause for dsales
        $dwhere = " AND {$dsales}.selddate BETWEEN " . $db->escape($la32) . " AND " . $db->escape($laxg);
        if ($esuppr !== '' && $esuppr > 0) {
            $dwhere .= " AND {$dsales}.client_id = " . $db->escape($esuppr);
        } elseif ($esuppr !== '') {
            $dwhere .= " ";
        }

        $dateSQL = " AND sales.selddate BETWEEN '{$la32}' AND  '{$laxg}'";

        $ddateSQL = "AND dsales.selddate BETWEEN '{$la32}' AND  '{$laxg}'";
        // Final SQL with UNION
        $sql = "
        (
            SELECT 
                sales.id AS ssid, sales.client_id, sales.clientname, sales.tax, sales.discount, sales.subtotal,
                sales.discount_indujul, sales.total, sales.created_at, sales.attime, sales.selddate,
                sales.modified_at, sales.status as ssstatus, sales.created_by, sales.totalitems, sales.paid,
                sales.paidmethod, sales.taxamount, sales.discountamount, sales.register_id,
                sales.firstpayement, sales.sgsttaxamt, sales.lalid, sales.lalamt, sales.recivamt,
                sales.ballamtt, sales.yyear, sales.custrrf, sales.mobnnm, sales.custstattype,
                sales.kms, sales.disamtssh, sales.creddate, sales.salesperson, sales.tot_creaditpoint,
                sales.avail_point, sales.redeemed_dated, sales.recivamt2, NULL AS sales_org_id,
                customers.name AS cname, stores.name AS ssname, 'tax_summary' AS tax_summary, 'sale_items' AS sale_items
            FROM sales
            LEFT JOIN registers ON {$sales}.register_id = registers.id
            LEFT JOIN customers ON {$sales}.client_id = customers.id
            LEFT JOIN stores ON registers.store_id = stores.id
            WHERE {$baseCondition} {$storeFilter} {$where} {$dateSQL}
        )
        UNION
        (
            SELECT 
                dsales.id AS ssid, dsales.client_id, dsales.clientname, dsales.tax, dsales.discount, dsales.subtotal,
                dsales.discount_indujul, dsales.total, dsales.created_at, dsales.attime, dsales.selddate,
                dsales.modified_at, dsales.status as ssstatus, dsales.created_by, dsales.totalitems, dsales.paid,
                dsales.paidmethod, dsales.taxamount, dsales.discountamount, dsales.register_id,
                dsales.firstpayement, dsales.sgsttaxamt, dsales.lalid, dsales.lalamt, dsales.recivamt,
                dsales.ballamtt, dsales.yyear, dsales.custrrf, dsales.mobnnm, dsales.custstattype,
                dsales.kms, dsales.disamtssh, dsales.creddate, dsales.salesperson, dsales.tot_creaditpoint,
                dsales.avail_point, dsales.redeemed_dated, dsales.recivamt2, dsales.sales_org_id,
                customers.name AS cname, stores.name AS ssname, 'dtax_summary' AS tax_summary, 'dsale_items' AS sale_items
            FROM dsales
            LEFT JOIN registers ON {$dsales}.register_id = registers.id
            LEFT JOIN customers ON {$dsales}.client_id = customers.id
            LEFT JOIN stores ON registers.store_id = stores.id
            WHERE {$baseCondition} {$storeFilter} {$dwhere} {$ddateSQL}
        )
        ORDER BY ssid DESC
        LIMIT {$limit} OFFSET {$offset}
    ";

        $query = $db->query($sql);
        return $query;
    }

    /*end*/
}
