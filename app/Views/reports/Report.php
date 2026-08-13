<?php

namespace App\Controllers;

use App\Models\Product;
use App\Models\Store_model;
use App\Models\Customer_model;
use App\Models\Warehouse;
use App\Models\Category_model;
use App\Models\Sale;
use App\Models\Sale_item;
use App\Models\Expence;
use CodeIgniter\Controller;
use Config\Database;

class Report extends BaseController
{
    protected $db;
    protected $setting;
    protected $user;

    public function __construct()
    {
        helper(['url', 'form']);
        $this->db = Database::connect();
        $session = session();

        $this->user = $session->get('user');
        $this->setting = model('SettingModel')->find(1); // replace with actual setting model logic

        if (!$this->user) {
            return redirect()->to('/login');
        }

        // permission check
        $role = $this->user['role'] ?? '';
        $kkar = $this->db->query("SELECT * FROM permission_new WHERE nname = ?", [$role])->getRowArray();
        if (!isset($kkar['rev']) || $kkar['rev'] != 1) {
            return redirect()->to('/');
        }

        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');
    }

    public function customerreport()
    {
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');
    
        $date = date('Y-m-d');
        $year = date('Y');
    
        // Fetch summary values
        $TodaySales = Sale::query("SELECT SUM(total) AS sum FROM sales WHERE created_at = ?", [$date])->getRow();
        $Top5product = Sale_item::query("
            SELECT name, product_id, SUM(qt) AS totalquantity 
            FROM sale_items 
            WHERE YEAR(date) = ? 
            GROUP BY product_id 
            ORDER BY totalquantity DESC 
            LIMIT 5
        ", [$year])->getResult();
    
        $monthlySales = Sale::query("
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
                GROUP BY id, MONTH(created_at)
            ) AS SubTable1
        ", [$year])->getRow();
    
        $monthlyExp = Expence::query("
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
                GROUP BY id, MONTH(date)
            ) AS SubTable1
        ", [$year])->getRow();
    
        $data = [
            'customers'       => Customer_model::all(),
            'Products'        => Product::all(),
            'Stores'          => Store_model::all(),
            'Warehouses'      => Warehouse::all(),
            'monthly'         => $monthlySales,
            'monthlyExp'      => $monthlyExp,
            'year'            => $year,
            'Top5product'     => $Top5product,
            'TodaySales'      => number_format((float)($TodaySales->sum ?? 0), $this->setting['decimals'] ?? 2, '.', ''),
            'CustomerNumber'  => Customer_model::countAll(),
            'CategoriesNumber'=> Category_model::countAll()
        ];
    
        return view('report/customerreport', $data);
    }
    

    public function brsearch()
    {
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');
    
        $data = [
            'Products' => Product::all(),
            'Stores'   => Store_model::all(),
        ];
    
        return view('report/searchbrreport1', $data);
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
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');
        $date = date("Y-m-d");
        $year = date("Y");
    
        $TodaySales = Sale::find_by_sql("SELECT SUM(total) AS sum FROM sales WHERE created_at = '$date'");
        $Top5product = Sale_item::find_by_sql("SELECT name, product_id, SUM(qt) AS totalquantity FROM sale_items WHERE DATE_FORMAT(date, '%Y') = $year GROUP BY product_id ORDER BY SUM(qt) DESC LIMIT 5");
    
        $data = [
            'customers'         => Customer_model::all(),
            'Products'          => Product::all(),
            'Stores'            => Store_model::all(),
            'Warehouses'        => Warehouse::all(),
            'monthlyExp'        => 0, // No calculation given
            'year'              => $year,
            'Top5product'       => $Top5product,
            'TodaySales'        => number_format((float)($TodaySales[0]->sum ?? 0), $this->setting['decimals'] ?? 2, '.', ''),
            'CustomerNumber'    => Customer_model::count(),
            'CategoriesNumber'  => Category_model::count(),
            'ProductNumber'     => Product::count(),
        ];
    
        return view('report/purchasetotalreportss', $data);
    }
    public function salesretunreport()
    {
        return view('report/salesreturnreport');
    }
        



    public function customertaxreport()
    {
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');
        $date = date("Y-m-d");
        $year = date("Y");
    
        $TodaySales = Sale::find_by_sql("SELECT SUM(total) AS sum FROM sales WHERE created_at = '$date'");
        $Top5product = Sale_item::find_by_sql("SELECT name, product_id, SUM(qt) AS totalquantity FROM sale_items WHERE DATE_FORMAT(date, '%Y') = $year GROUP BY product_id ORDER BY SUM(qt) DESC LIMIT 5");
    
        $monthlySales = Sale::find_by_sql("SELECT ..."); // Keep full SQL query as-is
    
        $monthlyExp = Expence::find_by_sql("SELECT ..."); // Keep full SQL query as-is
    
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
        ];
    
        return view('report/customertaxreport', $data);
    }
    public function customertaxgstr3b()
    {
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');
    
        $data = [
            'CustomerNumber'   => Customer_model::count(),
            'CategoriesNumber' => Category_model::count(),
            'ProductNumber'    => Product::count(),
        ];
    
        return view('report/customertaxgstrtb', $data);
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
        ];
    
        return view('report/productreport', $data);
    }
    

    public function categoryreport()
    {
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');
    
        $TodaySales = Sale::find_by_sql("SELECT SUM(total) AS sum FROM sales WHERE created_at = CURDATE()");
        $Top5product = Sale_item::find_by_sql("SELECT name, product_id, SUM(qt) AS totalquantity FROM sale_items WHERE YEAR(date) = YEAR(CURDATE()) GROUP BY product_id ORDER BY totalquantity DESC LIMIT 5");
    
        $data = [
            'Products'         => Product::all(),
            'Stores'           => Store_model::all(),
            'Warehouses'       => Warehouse::all(),
            'monthly'          => [], // No calculation in this function
            'monthlyExp'       => [],
            'year'             => date("Y"),
            'Top5product'      => $Top5product,
            'TodaySales'       => isset($TodaySales[0]) ? number_format((float)($TodaySales[0]->sum ?? 0), $this->setting['decimals'] ?? 2, '.', '') : 0,
            'CustomerNumber'   => Customer_model::count(),
            'ddd'              => Category_model::all(),
            'ProductNumber'    => Product::count()
        ];
    
        return view('report/categoryreport', $data);
    }
    

    public function storereport()
    {
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');
        $date = date("Y-m-d");
        $year = date("Y");
    
        $TodaySales = Sale::find_by_sql("SELECT SUM(total) AS sum FROM sales WHERE created_at = '$date'");
        $Top5product = Sale_item::find_by_sql("
            SELECT name, product_id, SUM(qt) AS totalquantity 
            FROM sale_items 
            WHERE DATE_FORMAT(date, '%Y') = $year 
            GROUP BY product_id 
            ORDER BY totalquantity DESC 
            LIMIT 5
        ");
    
        $monthlySales = Sale::find_by_sql("
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
    
        $monthlyExp = Expence::find_by_sql("
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
    
        $data = [
            'customers'        => Customer_model::all(),
            'Products'         => Product::all(),
            'Stores'           => Store_model::all(),
            'Warehouses'       => Warehouse::all(),
            'monthly'          => $monthlySales,
            'monthlyExp'       => $monthlyExp,
            'year'             => $year,
            'Top5product'      => $Top5product,
            'TodaySales'       => isset($TodaySales[0]) ? number_format((float)$TodaySales[0]->sum, $this->setting['decimals'] ?? 2, '.', '') : 0,
            'CustomerNumber'   => Customer_model::count(),
            'CategoriesNumber' => Category_model::count(),
            'ProductNumber'    => Product::count()
        ];
    
        return view('report/storereport', $data);
    }
    



    public function producttaxreport()
    {
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');
        $date = date("Y-m-d");
        $year = date("Y");
    
        $TodaySales = Sale::find_by_sql("SELECT SUM(total) AS sum FROM sales WHERE created_at = '$date'");
        $Top5product = Sale_item::find_by_sql("
            SELECT name, product_id, SUM(qt) AS totalquantity 
            FROM sale_items 
            WHERE DATE_FORMAT(date, '%Y') = $year 
            GROUP BY product_id 
            ORDER BY totalquantity DESC 
            LIMIT 5
        ");
    
        $monthlySales = Sale::find_by_sql("
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
    
        $monthlyExp = Expence::find_by_sql("
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
    
        $data = [
            'customers'        => Customer_model::all(),
            'Products'         => Product::all(),
            'Stores'           => Store_model::all(),
            'Warehouses'       => Warehouse::all(),
            'monthly'          => $monthlySales,
            'monthlyExp'       => $monthlyExp,
            'year'             => $year,
            'Top5product'      => $Top5product,
            'TodaySales'       => isset($TodaySales[0]) ? number_format((float)$TodaySales[0]->sum, $this->setting['decimals'] ?? 2, '.', '') : 0,
            'CustomerNumber'   => Customer_model::count(),
            'CategoriesNumber' => Category_model::count(),
            'ProductNumber'    => Product::count()
        ];
    
        return view('report/producttaxreport', $data);
    }
    

    public function supplierreport()
    {
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');
    
        $data = [
            'Suppliers' => Supplier_model::all()
        ];
    
        return view('report/supplierreport', $data);
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
        date_default_timezone_set($this->setting['timezone'] ?? 'Asia/Dhaka');
    
        return view('report/purchasedailyreportproduct');
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
    
        return view('purchasedealerreport', [
            'CustomerNumber' => count(model('CustomerModel')->findAll()),
            'CategoriesNumber' => count(model('CategoryModel')->findAll()),
            'ProductNumber' => count(model('Product')->findAll())
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
    
        return view('salestotalreportss', [
            'customers' => model('CustomerModel')->findAll(),
            'stores'    => model('StoreModel')->findAll(),
        ]);
    }
    


    public function cashinhandreport()
    {
        date_default_timezone_set($this->setting->timezone);
    
        return view('cashinhandreport', [
            'customers' => model('CustomerModel')->findAll(),
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
    
        return view('profitdailyreportss', [
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
    
        return view('fastreport', [
            'customers'        => model('CustomerModel')->findAll(),
            'Products'         => model('ProductModel')->findAll(),
            'Stores'           => model('StoreModel')->findAll(),
            'cctt'             => model('CategoryModel')->findAll(),
            'Warehouses'       => model('WarehouseModel')->findAll(),
            'year'             => $year,
            'CustomerNumber'   => model('CustomerModel')->countAllResults(),
            'CategoriesNumber' => model('CategoryModel')->countAllResults(),
            'ProductNumber'    => model('ProductModel')->countAllResults(),
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

    return view('storestockreall', [
        'Stores' => model('StoreModel')->findAll()
    ]);
}

}
