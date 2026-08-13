<?php

namespace App\Controllers;

use App\Models\ProductModel;
use App\Models\StoreModel;
use App\Models\Customer_model;
use App\Models\Warehouse;
use App\Models\Category_model;
use App\Models\SaleModel;
use App\Models\PaymentModel;

use App\Models\SaleItemModel;
use App\Models\Expence;
use CodeIgniter\Controller;
use Config\Database;
use App\Models\SettingModel;
use App\Models\PurchaseReportModel;

class Reports extends BaseController
{

    public function __construct()
    {
        helper(['url', 'form', 'language']);

        $this->session = session();
        $this->db = \Config\Database::connect();
        $this->builder = $this->db;

        // Load user
        $userId = $this->session->get('user_id');
        $this->user = $userId ? (new \App\Models\UserModel())->find($userId) : false;

        // Load setting
        $this->setting = (new \App\Models\SettingModel())->find(1);

        // Set language
        $lang = $this->session->get('lang') ?? 'english';
        service('language')->setLocale($lang);
        $this->SaleItemModel = new SaleItemModel();
    }




    public function searchbasecodee()
    {
        $request = $this->request;
        $db = \Config\Database::connect();

        $code = $request->getPost('barcodee');

        $builder = $db->table('sale_items');
        $builder->select([
            'sale_items.name',
            'sale_items.qt',
            'sale_items.subtotal',
            'sale_items.date',
            'sale_items.sale_id',
            'products.code',
            'products.name'
        ]);
        $builder->join('products', 'products.id = sale_items.product_id');
        $builder->where('products.code', $code);
        $builder->orderBy('sale_items.id', 'DESC');

        $query = $builder->get();
        $results = $query->getResult();

        return view('reports/search_by_barcode_table', [
            'results' => $results
        ]);
    }



    public function getCustomerCollection()
    {
        $request = service('request');
        $db = \Config\Database::connect();

        $salesmanId = $request->getPost('sssSelect');
        $start = $request->getPost('start');
        $end = $request->getPost('end');

        $storeId = session('store');
        $startFormatted = date("Y-m-d", strtotime($start));
        $endFormatted = date("Y-m-d", strtotime($end));

        $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
        $store = $db->table('stores')->getWhere(['id' => $storeId])->getRowArray();
        $decimals = $settings['decimals'];

        // Get payment entries
        $query = $db->table('payements')
            ->where('date >=', $startFormatted)
            ->where('date <=', $endFormatted);

        if (!empty($salesmanId)) {
            $query->where('salesman', $salesmanId);
        }

        $query->orderBy('id', 'asc');
        $payments = $query->get()->getResult();

        $results = [];
        $totalPaid = 0;

        foreach ($payments as $sale) {
            $salesmanName = '----';
            if ($sale->salesman > 0) {
                $userModel = new \App\Models\UserModel();
                $salesman = $userModel->find($sale->salesman);
                $salesmanName = $salesman ? $salesman->firstname . ' ' . $salesman->lastname : '----';
            }

            $salesRow = $db->table('sales')->getWhere(['id' => $sale->sale_id])->getRowArray();

            $results[] = [
                'customer' => $salesRow['clientname'] ?? '',
                'salesman' => $salesmanName,
                'sale_id' => $sale->sale_id,
                'date' => $sale->date,
                'paid' => $sale->paid
            ];

            $totalPaid += $sale->paid;
        }

        return view('reports/customer_collection_report_table', [
            'results' => $results,
            'totalPaid' => $totalPaid,
            'companyName' => $settings['companyname'],
            'storeAddress' => $store['adresse'] ?? '',
            'start' => $start,
            'end' => $end,
            'decimals' => $decimals
        ]);
    }



    public function viewPriceMore()
    {
        $request = service('request');
        $data['prince_mas'] = $request->getPost('Range');
        return view('product/view_price_more', $data);
    }

    public function viewMrpMore()
    {
        $request = service('request');
        $data['prince_mas'] = $request->getPost('Range');
        return view('product/view_mrp_more', $data);
    }



    public function getCustomerReport()
    {
        $storeId = session()->get('store');
        $request = \Config\Services::request();
        $db = \Config\Database::connect();
        $start       = $request->getPost('start');
        $end         = $request->getPost('end');
        $esuppr      = $request->getPost('client_id');
        // $pamode_id   = $request->getPost('selectedValues');
        $pamode_id = (array) ($this->request->getPost('selectedValues') ?? []);


        $poql = $this->db->query("select * from settings where id=1 ")->getResultArray();
        $poss = $db->query("SELECT * FROM stores WHERE id = ?", [$storeId])->getResultArray();
        $logoPath = $poql['logo'] ?? 'default.png';
        $kmmokk = base_url('files/Setting/' . $logoPath);

        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;

        $rttt = session()->get('store');


        //$prduct = Product::find($product_id);



        $la322x = explode('-', $start);
        $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

        $lax = explode('-', $end);
        $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];


        $lkmm = $this->db->query(" select * from  settings where id=1 ")->getRowArray();

        $sales = "sales";
        if (isset($this->setting->themblock) && $this->setting->themblock == 0) {
            $sales = "sales";
        } else {
            $sales = "dsales";
        } //  ".$sales."

        $ret_idd = $lkmm['themblock'] ?? null;

        if ($esuppr > 0) {
            $prducts = $this->db->query("SELECT *," . $sales . ".id as ssid  FROM " . $sales . " inner join registers on " . $sales . ".register_id=registers.id WHERE registers.store_id='$rttt' and  client_id='$esuppr' and    created_at  between '$la32' AND '$laxg' order by " . $sales . ".id desc ")->getResult();
        } else if ($esuppr == '') {
            $prducts = $this->db->query("SELECT *," . $sales . ".id as ssid  FROM " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE registers.store_id='$rttt' and  created_at between '$la32' AND '$laxg' order by " . $sales . ".id desc ")->getResult();
        } else {
            $prducts = $this->db->query("SELECT *," . $sales . ".id as ssid  FROM " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE registers.store_id='$rttt' and  client_id=0 and    created_at between '$la32' AND '$laxg' order by " . $sales . ".id desc ")->getResult();
        }

        $result = '
        <table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="14" style="text-align:center; " >' . (isset($poss['companyname']) ? $poss['companyname'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="14"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="14">Customer Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>
         <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;"> ' . label("Bill") . ' ' . label("Number") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("customers") . '</th>
        <th style="border: 1px solid #1c76bc;width:100px;">' . label("Date") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("NoOfItems") . '   </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . ' ' . label("Amount") . '   </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("tax") . '   </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Summary") . '   </th>
       
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Discount") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Shipping") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . ' ' . label("Amount") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Cash") . '  </th>

        ';


        $mkj = $this->db->query("select * from payment_mode where id!=1 order by id asc ")->getResultArray();
        foreach ($mkj as $mkjf) {

            $ll = $mkjf['id'];
            $mn = 'sss_' . $ll;
            $$mn = 0;
            if (!empty($ll) && in_array($ll, $pamode_id)) {

                $result .= '<th style="border: 1px solid #1c76bc;"   >' . $mkjf['name'] . '</th>';
            }
        }

        $result .= '<th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Status") . ' </th>
        </tr></thead><tbody>';


        $tt = 1;
        $billamt = 0;
        $tottax = 0;
        $tottaxs = 0;
        $tottaxi = 0;
        $discc = 0;
        $toott = 0;
        $paidd = 0;
        $mes_cashtt = 0;

        $cashr = 0;
        $coupr = 0;
        $carddr = 0;
        $cpointr = 0;
        $sub2 = 0;
        $csub2 = 0;
        $ssub2 = 0;
        $isub2 = 0;

        $billamt_cc = 0;
        $tottax_cc = 0;
        $fimdis_cc = 0;
        $toott_cc = 0;
        $cashr_cc = 0;
        $coupr_cc = 0;
        $carddr_cc = 0;
        $cpointr_cc = 0;

        $billamt_rr = 0;
        $tottax_rr = 0;
        $fimdis_rr = 0;
        $toott_rr = 0;
        $cashr_rr = 0;
        $coupr_rr = 0;
        $carddr_rr = 0;
        $cpointr_rr = 0;
        $toott_ship = 0;
        $toott_ship_cc = 0;
        $fimdis = 0;

        foreach ($prducts as $prd) {


            if ($prd->client_id > 0) {
                $custt_name = $this->db->query("select * from customers where id='" . $prd->client_id . "' ")->getResultArray();
                $custt_namef = $custt_name['name'];
            } else {
                $custt_namef = "Walk in Customer";
            }



            $csub2 = 0;
            $ssub2 = 0;
            $isub2 = 0;
            $csubrr_2 = 0;
            $sslalf_rr = 0;





            // $sslal = Sale::find($prd->id);
            $oltaxl = '';

            $overal_tax = 0;

            $return_ck = $this->db->query("select * from  returnss where re_sales_id='" . $prd->ssid . "' and  rsale_type='" . $ret_idd . "' ")->getResult();
            // $return_ck_num = $return_ck->getNumRows();
            $return_ck_num = count($return_ck);


            // $yuikk = $this->db->query("select * from  tax_summary where salesid='" . $prd->ssid . "' ")->getResultArray();
            // foreach ($yuikk as $yuikkf) {
            //     $oltaxl .= $yuikkf['taxname'] . '-' . number_format((float)$yuikkf['taxfrom'], $this->setting->decimals, '.', '') . '<br>';

            //     $overal_tax = $overal_tax + $yuikkf['taxfrom'];
            // }
            $yuikk = $this->db->query("SELECT * FROM tax_summary WHERE salesid = '" . $prd->ssid . "'")->getResultArray();

            foreach ($yuikk as $yuikkf) {
                $oltaxl .= $yuikkf['taxname'] . '-' .
                    number_format((float)$yuikkf['taxfrom'], $this->setting->decimals, '.', '') . '<br>';

                $overal_tax += $yuikkf['taxfrom'];
            }

            // print_r($oltaxl);
            // die;
            $sslalf = $prd->discountamount;
            $discout_per = ($prd->discountamount * 100) / $prd->subtotal;



            $uyjhh = $this->db->query("select * from sale_items where sale_id='" . $prd->ssid . "'   ")->getResultArray();
            foreach ($uyjhh as $uyjhhf) {
                $iknmm = $this->db->query("select * from retunn_items where sl_id='" . $uyjhhf['id'] . "' and sall_idd='" . $prd->ssid . "' and rsaleit_type='" . $ret_idd . "' ")->getResultArray();
                if ($iknmm->getNumRows() == 1) {


                    $retun_res = $iknmm->getRowArray();

                    $discout_amt_rr = ($retun_res['sl_subtotal'] * $discout_per) / 100;
                    $sslalf_rr = $discout_amt_rr + $sslalf_rr;
                    $sslalff_rr = $retun_res['sl_subtotal'] - $discout_amt_rr;

                    if (intval($uyjhhf['cgst']) > 0) {
                        $ctax_rr = $sslalff_rr - ($sslalff_rr / (1 + (intval($uyjhhf['cgst']) / 100)));
                        $itax = 0;
                        $csubrr_2 = $csubrr_2 + $ctax_rr;
                    } else {
                        $ctax_rr = 0;
                        $itax_rr = $sslalff_rr - ($sslalff_rr / (1 + (intval($uyjhhf['igstt']) / 100)));
                        $csubrr_2 = $csubrr_2 + $itax_rr;
                    }
                }




                $discout_amt = ($uyjhhf['subtotal'] * $discout_per) / 100;
                $sslalff = $uyjhhf['subtotal'] - $discout_amt;

                if (intval($uyjhhf['cgst']) > 0) {
                    $ctax = $sslalff - ($sslalff / (1 + (intval($uyjhhf['cgst']) / 100)));
                    $itax = 0;
                    $csub2 = $csub2 + $ctax;
                } else {
                    $ctax = 0;
                    $itax = $sslalff - ($sslalff / (1 + (intval($uyjhhf['igstt']) / 100)));
                    $csub2 = $csub2 + $itax;
                }
            }









            $oll = explode(" ", $prd->attime);

            if ($prd->paidmethod == 6) {
                $cash = 0;
                $coup = 0;
                $cardd = 0;
                $cpoint = $prd->paid;
            } elseif ($prd->paidmethod == 1) {
                $cash = 0;
                $coup = 0;
                $cardd = $prd->paid;
                $cpoint = 0;
            } elseif ($prd->paidmethod == 10) {
                $cash = 0;
                $coup = $prd->paid;
                $cardd = 0;
                $cpoint = 0;
            } else {

                $cash = $prd->paid;
                $coup = 0;
                $cardd = 0;
                $cpoint = 0;
            }

            $pxxx = $csub2;
            $pxxxs = $ssub2;
            $pxxxi = $isub2;
            $dixxss = $prd->discount_indujul + $prd->discountamount;




            if ($prd->status == 3) {
                $bil_ststy = "style=background:#e9c0c0;";
                $sstaus_w = "Cancel";
            } elseif (intval($return_ck_num) > 0) {
                $bil_ststy = "style=background:#f86e50;";
                $sstaus_w = "Return";
            } else {
                $bil_ststy = '';
                $sstaus_w = "Sales";
            }


            $ee = explode('~', $prd->paidmethod);



            $mes_cash = $prd->recivamt;





            $result .= '<tr ' . $bil_ststy . ' >
            <td style="text-align:center;border: 1px solid #1c76bc; " >' . $prd->ssid . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; " >' . $custt_namef . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; " >' .  date("d-m-Y", strtotime($oll[0])) . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->totalitems . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->subtotal, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$overal_tax, $this->setting->decimals, '.', '') . '</td>  
            <td style="text-align:left;border: 1px solid #1c76bc; padding: 0px;">' . $oltaxl . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$dixxss, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->disamtssh, $this->setting->decimals, '.', '') . '</td> 

            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->total, $this->setting->decimals, '.', '') . '</td>  
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$mes_cash, $this->setting->decimals, '.', '') . '</td>';





            if (in_array($ee[0], $pamode_id)) {


                $mkj = $this->db->query("select * from payment_mode where id!=1 order by id asc ")->getResultArray();
                foreach ($mkj as $mkjf) {

                    $ll = $mkjf['id'];
                    $mn = 'sss_' . $ll;




                    $ee = explode('~', $prd->paidmethod);

                    if (in_array($ll, $pamode_id)) {
                        if ($ee[0] == $ll) {
                            if ($prd->total <= $prd->paid) {



                                $$mn = $$mn + $prd->recivamt2;
                                $result .= '<td style="text-align:right;    border: 1px solid #1c76bc;   
                                 width: 118px; " >' . number_format((float)$prd->recivamt2, $this->setting->decimals, '.', ' ') . '</td>';
                            } else {
                                $$mn = $$mn + $prd->recivamt2;
                                $result .= '<td  style="text-align:right;    border: 1px solid #1c76bc;   
                             width: 118px; " >' . number_format((float)$prd->recivamt2, $this->setting->decimals, '.', ' ') . '</td>';
                            }
                        } else {

                            $result .= '<td style="text-align:right;border: 1px solid #1c76bc; " >0.00</td>';
                        }
                    }
                }
            } else {
                $ddd = count($pamode_id);
                for ($nml = 0; $nml < $ddd; $nml++) {
                    if ($pamode_id[$nml] > 0) {

                        $result .= '<td style="text-align:right;border: 1px solid #1c76bc; " >0.00</td>';
                    }
                }
            }

            $result .= '<td style="text-align:center;border: 1px solid #1c76bc; " >' . $sstaus_w . '</td>

            </tr>';






            $mes_cashtt = $mes_cashtt + $mes_cash;
            $billamt = $billamt + $prd->subtotal;
            $tottax = $tottax + $overal_tax;
            $fimdis = $dixxss + $fimdis;
            $toott = $toott + $prd->total;
            $toott_ship = $toott_ship + $prd->disamtssh;
            $cashr = $cashr + $cash;
            $coupr = $coupr + $coup;
            $carddr = $carddr + $cardd;
            $cpointr = $cpointr + $cpoint;


            if ($prd->status == 3) {
                $billamt_cc = $billamt_cc + $prd->subtotal;
                $tottax_cc = $tottax_cc + $overal_tax;
                $fimdis_cc = $dixxss + $fimdis_cc;
                $toott_ship_cc = $toott_ship_cc + $prd->disamtssh;
                $toott_cc = $toott_cc + $prd->total;
                $cashr_cc = $cashr_cc + $cash;
                $coupr_cc = $coupr_cc + $coup;
                $carddr_cc = $carddr_cc + $cardd;
                $cpointr_cc = $cpointr_cc + $cpoint;
            }
            if ($return_ck_num > 0) {

                foreach ($return_ck as $return_sal) {


                    $billamt_rr = $billamt_rr + $return_sal->sutott;
                    $tottax_rr = $tottax_rr + $csubrr_2;
                    $fimdis_rr = $sslalf_rr + $fimdis_rr;
                    $toott_rr = $toott_rr + $return_sal->tootal;
                    $cashr_rr = 0;
                    $coupr_rr = 0;
                    $carddr_rr = 0;
                    $cpointr_rr = 0;
                }
            }


            $tottaxs = $tottaxs + $pxxxs;


            $tottaxi = $tottaxi + $pxxxi;
            $discc = $discc + $dixxss;

            $paidd = $paidd + $prd->total;








            $tt++;
        }



        $result .= '</tbody>
        <tr>
           
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Sub Total</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$billamt, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$tottax, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$fimdis, $this->setting->decimals, '.', ' ') . '</b></td> 
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$toott_ship, $this->setting->decimals, '.', ' ') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$toott, $this->setting->decimals, '.', ' ') . '</b></td>



           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$mes_cashtt, $this->setting->decimals, '.', ' ') . '</b></td>

           ';

        $mkj = $this->db->query("select * from payment_mode where id!=1 order by id asc ")->getResultArray();
        foreach ($mkj as $mkjf) {

            $ll = $mkjf['id'];
            $mn = 'sss_' . $ll;
            if (in_array($ll, $pamode_id)) {

                $result .= '<td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$$mn, $this->setting->decimals, '.', ' ') . '</b></td>';
            }
        }

        $result .= '<td style="text-align:center;border: 1px solid #1c76bc; "></td>

            </tr>

             <tr>
           
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Cancel</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$billamt_cc, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$tottax_cc, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$fimdis_cc, $this->setting->decimals, '.', ' ') . '</b></td> 
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>0</b></td><td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$toott_cc, $this->setting->decimals, '.', ' ') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc;"></td>';

        $mkj = $this->db->query("select * from payment_mode where id!=1 order by id asc ")->getResultArray();
        foreach ($mkj as $mkjf) {
            $ll = $mkjf['id'];
            if (in_array($ll, $pamode_id)) {
                $result .= ' <td style="text-align:right;border: 1px solid #1c76bc;"></td> ';
            }
        }
        $result .= '<td style="text-align:right;border: 1px solid #1c76bc; "></td>
           
           


           
            </tr>  

            <tr>
           
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Return</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$billamt_rr, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$tottax_rr, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$fimdis_rr, $this->setting->decimals, '.', ' ') . '</b></td> 
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>0</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$toott_rr, $this->setting->decimals, '.', ' ') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc;"></td>';

        $mkj = $this->db->query("select * from payment_mode where id!=1 order by id asc ")->getResultArray();
        foreach ($mkj as $mkjf) {
            $ll = $mkjf['id'];
            if (in_array($ll, $pamode_id)) {
                $result .= ' <td style="text-align:right;border: 1px solid #1c76bc;"></td> ';
            }
        }
        $result .= '<td style="text-align:right;border: 1px solid #1c76bc; "></td>

            </tr>  

            <tr>
           
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Total</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)($billamt - $billamt_cc - $billamt_rr), $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)($tottax - $tottax_cc - $tottax_rr), $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)($fimdis - $fimdis_cc - $fimdis_rr), $this->setting->decimals, '.', ' ') . '</b></td> 
           
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$toott_ship, $this->setting->decimals, '.', ' ') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)($toott - $toott_cc - $toott_rr), $this->setting->decimals, '.', ' ') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc;"></td>';

        $mkj = $this->db->query("select * from payment_mode where id!=1 order by id asc ")->getResultArray();

        foreach ($mkj as $mkjf) {
            $ll = $mkjf['id'];
            if (in_array($ll, $pamode_id)) {
                $result .= ' <td style="text-align:right;border: 1px solid #1c76bc;"></td> ';
            }
        }
        $result .= '<td style="text-align:right;border: 1px solid #1c76bc; "></td>
           
           


           
            </tr>  
            </table>';

        echo $result;
    }

    public function getCustomerCredit()
    {
        $request = service('request');
        $db = \Config\Database::connect();

        $clientId = $request->getPost('client_id');
        $salesmanId = $request->getPost('sssSelect');
        $start = $request->getPost('start');
        $end = $request->getPost('end');

        $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
        $store = $db->table('stores')->getWhere(['id' => session('store')])->getRowArray();
        $decimals = $settings['decimals'];
        $themeBlock = $settings['themblock'];
        $salesTable = $themeBlock == 0 ? 'sales' : 'dsales';

        $builder = $db->table($salesTable)->where('creddate >', 0)
            ->where('created_at >=', $start)
            ->where('created_at <=', $end);

        if (!empty($clientId)) {
            $builder->where('client_id', $clientId);
        }
        if (!empty($salesmanId)) {
            $builder->where('salesperson', $salesmanId);
        }

        $sales = $builder->orderBy('id', 'asc')->get()->getResult();

        // Load salesperson names
        $userModel = new \App\Models\UserModel();
        foreach ($sales as &$sale) {
            $sale->salesperson_name = $sale->salesperson > 0
                ? ($userModel->find($sale->salesperson)->firstname ?? '') . ' ' . ($userModel->find($sale->salesperson)->lastname ?? '')
                : '----';
        }

        return view('reports/customer_credit_report_table', [
            'sales' => $sales,
            'settings' => $settings,
            'store' => $store,
            'start' => $start,
            'end' => $end,
            'decimals' => $decimals
        ]);
    }



    public function getCustomerTaxReport()
    {
        $storeId = session()->get('store');
        $db = \Config\Database::connect();
        $request = \Config\Services::request();
        $client_id       = $request->getPost('client_id');
        $startpp       = $request->getPost('start');
        $endpp       = $request->getPost('end');

        $start = date("Y-m-d", strtotime($startpp));
        $end = date("Y-m-d", strtotime($endpp));

        $totals = 0;
        $toamt = 0;
        $ltot = 0;

        $lkmm = $this->db->query(" select * from  settings where id=1 ")->getRowArray();

        if (isset($this->setting->themblock) && $this->setting->themblock == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
        } else {
            $sales = "dsales";
            $sale_items = "dsale_items";
        }
        //  ".$sales."
        //  ".$sale_items."

        $poql = $this->db->query("select * from settings where id=1 ")->getResultArray();
        $poss = $db->query("SELECT * FROM stores WHERE id = ?", [$storeId])->getResultArray();

        $logoPath = $poql['logo'] ?? 'default.png';
        $kmmokk = base_url('files/Setting/' . $logoPath);
        if ($client_id == '') {


            $builder = $db->table('sales');
            // $builder->select('sales.*, SUM(sale_items.subtotal2) as mmm');
            $builder->select('sales.*, sale_items.tottax, SUM(sale_items.subtotal2) as mmm');
            $builder->join('sale_items', 'sales.id = sale_items.sale_id');
            $builder->where('sale_items.date >=', $start);
            $builder->where('sale_items.date <=', $end);
            $builder->groupBy(['sale_items.tottax', 'sales.client_id']);

            $query = $builder->get();
            $sales = $query->getResult();


            $custarr[] = array();
            $perarr[] = array();

            foreach ($sales as $sale) {
                $custarr[] = $sale->client_id;
                $perarr[] = $sale->tottax;
            }

            @$custarrf = array_values(array_flip(array_flip($custarr)));
            @$perarrf = array_values(array_flip(array_flip($perarr)));



            $lcl = count($perarrf);
            $ccl = count($custarrf);
            $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="9" style="text-align:center; " >' . (isset($poql['companyname']) ? $poql['companyname'] : '') . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9">Customer Tax Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

         <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;" >' . label("Customer") . ' ' . label("Name") . '</th>
        ';
            for ($io = 0; $io < $lcl; $io++) {
                $result .= '<th style="border: 1px solid #1c76bc;">' . $perarrf[$io] . '%</th>';
            }



            $result .= '<th style="border: 1px solid #1c76bc;">' . label("Amount") . '</th><th style="border: 1px solid #1c76bc;text-align:center;">' . label("Total") . '  ' . label("tax") . '</th>

        <th style="border: 1px solid #1c76bc;text-align:center; ">' . label("Total") . '</th>
        </tr></thead><tbody>';


            $tt1 = 0;
            $tt2 = 0;
            $tt3 = 0;

            for ($ii = 0; $ii < $ccl; $ii++) {
                $lmdkm = $this->db->query("select * from customers where id='" . $custarrf[$ii] . "' ")->getResultArray();
                $result .= '<tr><th style="border: 1px solid #1c76bc;"  >' . (isset($lmdkm['name']) ? $lmdkm['name'] : "") . '</th>';
                $tottax = 0;
                $totamtt = 0;
                $lasttot = 0;
                for ($io = 0; $io < $lcl; $io++) {
                    $sales = 'sales';
                    $mnnp = $this->db->query("SELECT *,sum(" . $sale_items . ".subtotal2) as mmm FROM " . $sales . " INNER JOIN `" . $sale_items . "` ON (" . $sales . ".id=" . $sale_items . ".sale_id and " . $sales . ".client_id='$custarrf[$ii]' and " . $sale_items . ".tottax='$perarrf[$io]'  ) AND " . $sale_items . ".date between '$start' AND '$end' group by " . $sale_items . ".tottax," . $sales . ".client_id  ")->getResultArray();

                    $ommkcxx = ((isset($mnnp['mmm']) ? $mnnp['mmm'] : 0) * (isset($mnnp['tottax']) ? $mnnp['tottax'] : 0)) / 100;
                    $lasttot = $ommkcxx + (isset($mnnp['mmm']) ? $mnnp['mmm'] : 0) + $lasttot;
                    $tottax = $tottax + $ommkcxx;
                    $totamtt = (isset($mnnp['mmm']) ? $mnnp['mmm'] : 0) + $totamtt;


                    $result .= '<th style="border: 1px solid #1c76bc;text-align:right;" >' . number_format((float)$ommkcxx, $this->setting->decimals, '.', '') . '</th>';
                }
                $result .= ' <th style="border: 1px solid #1c76bc;text-align:right;">' . number_format((float)$totamtt, $this->setting->decimals, '.', '') . '</th><th style="border: 1px solid #1c76bc;text-align:right;">' . number_format((float)$tottax, $this->setting->decimals, '.', '') . '</th> <th style="border: 1px solid #1c76bc;text-align:right;">' . number_format((float)$lasttot, $this->setting->decimals, '.', '') . '</th> </tr>';
                $tt1 = $tt1 + $tottax;
                $tt2 = $tt2 + $totamtt;
                $tt3 = $tt3 + $lasttot;
            }


            $result .= '</tbody>
                        <tr><td style="border: 1px solid #1c76bc;"></td>';
            for ($io = 0; $io < $lcl; $io++) {
                if ($io == 0) {
                    $result .= '<td style="border: 1px solid #1c76bc;text-align:center;">' . label("Total") . '</td>';
                } else {
                    $result .= '<td style="border: 1px solid #1c76bc;"></td>';
                }
            }

            $result .= '<td style="border: 1px solid #1c76bc;text-align:right;"><b>Rs.' . $tt2 . '</b></td><td style="border: 1px solid #1c76bc;text-align:right;"><b>Rs.' . $tt1 . '</b></td><td style="border: 1px solid #1c76bc;text-align:right;"><b>Rs.' . $tt3 . '</b></td></tr>


      </table>';

            echo $result;
        } else {
            $builder = $db->table('sales');
            $builder->select('sale_items.tottax, SUM(sale_items.subtotal) as mmm');
            $builder->join('sale_items', 'sales.id = sale_items.sale_id');
            $builder->where('sales.client_id', $client_id);
            $builder->where('sale_items.date >=', $start);
            $builder->where('sale_items.date <=', $end);
            $builder->groupBy('sale_items.tottax');

            $query = $builder->get();
            $sales = $query->getResult();

            $lmdkm = $this->db->query("select * from customers where id='" . $client_id . "' ")->getResultArray();
            if (isset($lmdkm['name']) && $lmdkm['name'] != '') {
                $llname = $lmdkm['name'];
            } else {
                $llname = "Walk in Customer";
            }


            $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="9" style="text-align:center; " >' . (isset($poql['companyname']) ? $poql['companyname'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9">Customer Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

        <tr style="background:#1c76bc;color:#fff;">
        <th style="border: 1px solid #1c76bc;">Party Name</th>
        ';
            foreach ($sales as $sale) {
                $result .= '<th style="border: 1px solid #1c76bc;">' . $sale->tottax . '%</th>';
            }


            $result .= '<th style="border: 1px solid #1c76bc;">' . label("Amount") . '</th><th style="border: 1px solid #1c76bc;text-align:center;">' . label("Total") . ' ' . label("tax") . '</th>

        <th style="border: 1px solid #1c76bc;text-align:center;">' . label("Total") . '</th>
        </tr></thead><tbody>
        <tr style="border: 1px solid #1c76bc;">
        <td style="border: 1px solid #1c76bc;">' . $llname . '</td>
        
        ';
            foreach ($sales as $sale) {

                $ommk = ((float)$sale->mmm * (float)$sale->tottax) / 100;
                $result .= '
            
            
            <td style="border: 1px solidrgb(73, 81, 87);">' . $ommk . '</td>
            ';

                $ltot = $ltot + $ommk + $sale->mmm;
                $toamt = $sale->mmm + $toamt;
                $totals += $ommk;
            }
            $result .= '<td style="border: 1px solid #1c76bc;">' . $toamt . '</td><td style="border: 1px solid #1c76bc;">' . $totals . '</td><td style="border: 1px solid #1c76bc;">' . $ltot . '</td>
        </tbody>

      </table>';

            echo $result;
        }
    }

    public function getCustomertaxgstrtb()
    {
        $storeId = session()->get('store');
        $db = \Config\Database::connect();
        $request = \Config\Services::request();

        $mmonth       = $request->getPost('mmonth');
        $yyear       = $request->getPost('yyear');
        $client_id       = $request->getPost('client_id');





        $poql = $this->db->query("select * from settings where id=1 ")->getResultArray();
        $poss = $db->query("SELECT * FROM stores WHERE id = ?", [$storeId])->getResultArray();

        $logoPath = $poql['logo'] ?? 'default.png';
        $kmmokk = base_url('files/Setting/' . $logoPath);



        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class=""><th colspan="9" style="text-align:center; " ><h3>GSTR-3B <br>
        [See rule 61(5)]</h3></th></tr>
       


         <tr >
        <th   >GSTIN</th>
        <th  >' . (isset($poql['gstnoo']) ? $poql['gstnoo'] : '') . '</th>
        <th  >Year</th>
        <th  >' . $yyear . '</th>
        <th  >Sheet Status:</th>
        <th   ></th>
        </tr>

        <tr > 
        <th >Legal name of the registered person</th>
        <th   >' . (isset($poql['companyname']) ? $poql['companyname'] : '') . '</th>
        <th   >Month</th>
        <th   >' . $client_id . '</th>
        <th  ></th>
        <th   ></th>
        
        </tr>
        ';

        $lkmm = $this->db->query(" select * from  settings where id=1 ")->getRowArray();
        if (isset($lkmm['themblock']) && $lkmm['themblock']   == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
            $tax_summary = "tax_summary";
        } else {
            $sales = "dsales";
            $sale_items = "dsale_items";
            $tax_summary = "dtax_summary";
        }
        //  ".$sales."
        //  ".$sale_items."
        //  ".$tax_summary."


        $fumll = $yyear . '-' . sprintf("%02d", $mmonth);

        $c_kmmm = $this->db->query("select  sum(taxfrom) as ctaxx  from " . $tax_summary . " where c_s_i=1 and datedd like '" . $fumll . "-%' ")->getResultArray();
        $i_kmmm = $this->db->query("select  sum(taxfrom) as itaxx  from  " . $tax_summary . " where c_s_i=2 and datedd like '" . $fumll . "-%' ")->getResultArray();
        $t_kmmm = $this->db->query("select  sum(taxamount) as ttoptal  from  " . $tax_summary . " where  datedd like '" . $fumll . "-%' ")->getResultArray();


        $result .= '
        </thead>
        <tbody>';

        $result .= '<tr><td colspan="6" style=" text-align:center;" >
                <h4>
                3.1 Details of Outward Supplies and inward supplies liable to reverse charge
                </h4>
                </td></tr>';
        $result .= '<tr>
                    <td  style=" text-align:center;" >Nature of Supplies</td>
                    <td  style=" text-align:center;" >Total Taxable value</td>
                    <td  style=" text-align:center;" >Integrated Tax</td>
                    <td  style=" text-align:center;" >Central Tax</td>
                    <td  style=" text-align:center;" >State/UT Tax</td>
                    <td  style=" text-align:center;" >Cess</td>
                    </tr>';

        $result .= '<tr>
                <td  style=" text-align:center;" >1</td>
                <td  style=" text-align:center;" >2</td>
                <td  style=" text-align:center;" >3</td>
                <td  style=" text-align:center;" >4</td>
                <td  style=" text-align:center;" >5</td>
                <td  style=" text-align:center;" >6</td>
                </tr>';


        $result .= '<tr>
            <td  style=" text-align:center;" >(a) Outward Taxable  supplies  (other than zero rated, nil rated and exempted)</td>
            <td  style=" text-align:center;" >' . number_format((float)($t_kmmm['ttoptal'] ?? 0), $this->setting->decimals, '.', '') . '</td>
            <td  style=" text-align:center;" > ' . number_format((float)($i_kmmm['itaxx'] ?? 0), $this->setting->decimals, '.', '')  . '</td>
            <td  style=" text-align:center;" >' . number_format(((float)($c_kmmm['ctaxx'] ?? 0) / 2), $this->setting->decimals, '.', '') . ' </td>
            <td  style=" text-align:center;" > ' . number_format(((float)($c_kmmm['ctaxx'] ?? 0) / 2), $this->setting->decimals, '.', '') . '</td>
            <td  style=" text-align:center;" >0.00</td>
            </tr>';
        $result .= '<tr>
            <td  style=" text-align:center;" >(b) Outward Taxable  supplies  (zero rated )</td>
            <td  style=" text-align:center;" >0.00 </td>
            <td  style=" text-align:center;" >0.00 </td>
            <td  style=" text-align:center;" >0.00 </td>
            <td  style=" text-align:center;" >0.00 </td>
            <td  style=" text-align:center;" >0.00</td>
            </tr>';
        $result .= '<tr>
                <td  style=" text-align:center;" >(c) Other Outward Taxable  supplies (Nil rated, exempted)</td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00</td>
                </tr>';
        $result .= '<tr>
                <td  style=" text-align:center;" >(d) Inward supplies (liable to reverse charge) </td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                </tr>';
        $result .= '<tr>
                    <td  style=" text-align:center;" >(e) Non-GST Outward supplies</td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    </tr>';
        $result .= '<tr>
                <td  style=" text-align:center;" >Total</td>
               <td  style=" text-align:center;" >' . number_format((float)($t_kmmm['ttoptal'] ?? 0), $this->setting->decimals, '.', '') . '</td>
            <td  style=" text-align:center;" > ' . number_format((float)($i_kmmm['itaxx'] ?? 0), $this->setting->decimals, '.', '')  . '</td>
            <td  style=" text-align:center;" >' . number_format(((float)($c_kmmm['ctaxx'] ?? 0) / 2), $this->setting->decimals, '.', '') . ' </td>
            <td  style=" text-align:center;" > ' . number_format(((float)($c_kmmm['ctaxx'] ?? 0) / 2), $this->setting->decimals, '.', '') . '</td>
                <td  style=" text-align:center;" >0.00</td>
                </tr>';



        $result .= '<tr><td colspan="6" style=" text-align:center;" ></td></tr>';
        $result .= '<tr><td colspan="5" style=" text-align:center;" ><h4>4. Eligible ITC</h4></td></tr>';


        $result .= '<tr>
                    <td  style=" text-align:center;" >Details</td>
                    <td  style=" text-align:center;" >Integrated Tax</td>
                    <td  style=" text-align:center;" >Central Tax</td>
                    <td  style=" text-align:center;" >State/UT Tax</td>
                    <td  style=" text-align:center;" >Cess</td>
                    </tr>';
        $result .= '<tr>
            <td  style=" text-align:center;" >1</td>
            <td  style=" text-align:center;" >2</td>
            <td  style=" text-align:center;" >3</td>
            <td  style=" text-align:center;" >4</td>
            <td  style=" text-align:center;" >5</td>
            </tr>';

        $result .= '<tr>
            <td  style=" text-align:center;" > <b>(A) ITC Available (Whether in full or part) </b></td>
            <td  style=" text-align:center;" > </td>
            <td  style=" text-align:center;" > </td>
            <td  style=" text-align:center;" >  </td>
            <td  style=" text-align:center;" >  </td>
            
            </tr>';

        $result .= '<tr>
                    <td  style=" text-align:center;" >(1)   Import of goods </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    
                    </tr>';
        $result .= '<tr>
                <td  style=" text-align:center;" >(2)   Import of services</td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                
                </tr>';
        $result .= '<tr>
                    <td  style=" text-align:center;" >(3)   Inward supplies liable to reverse charge
                            (other than 1 &2 above)</td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    </tr>';
        $result .= '<tr>
                <td  style=" text-align:center;" >(4)   Inward supplies from ISD</td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                </tr>';





        $pur_kmmm = mysql_fetch_array(mysql_query("select  sum(cgst) as ccgst,sum(sgst) as ssgst  from  purchases where  date like '" . $fumll . "-%' "));

        $result .= '<tr>
                <td  style=" text-align:center;" >(5)   All other ITC</td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" > ' . number_format((float)$pur_kmmm['ccgst'], $this->setting->decimals, '.', '') . '</td>
                <td  style=" text-align:center;" > ' . number_format((float)$pur_kmmm['ssgst'], $this->setting->decimals, '.', '') . '</td>
                <td  style=" text-align:center;" >0.00 </td>
                </tr>';


        $result .= '<tr>
                <td  style=" text-align:center;" > <b>(B) ITC Reversed </b></td>
                <td  style=" text-align:center;" > </td>
                <td  style=" text-align:center;" > </td>
                <td  style=" text-align:center;" >  </td>
                <td  style=" text-align:center;" >  </td>
                
                </tr>';





        $result .= '<tr>
                <td  style=" text-align:center;" >(1)   As per Rule 42 & 43 of SGST/CGST rules </td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                <td  style=" text-align:center;" >0.00 </td>
                
                </tr>';
        $result .= '<tr>
                    <td  style=" text-align:center;" >(2)   Others</td>
                    <td  style=" text-align:center;" >0.00 </td>
                    
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    </tr>';

        $result .= '<tr>
                <td  style=" text-align:center;" > <b> (C) Net ITC Available (A)-(B)</b></td>
                
                <td  style=" text-align:center;" >0.00</td>
                <td  style=" text-align:center;" > ' . number_format((float)$pur_kmmm['ccgst'], $this->setting->decimals, '.', '') . '</td>
                <td  style=" text-align:center;" > ' . number_format((float)$pur_kmmm['ssgst'], $this->setting->decimals, '.', '') . '</td>
                <td  style=" text-align:center;" >0.00</td>
                </tr>';
        $result .= '<tr>
                    <td  style=" text-align:center;" > <b>(D) Ineligible ITC </b></td>
                    
                    <td  style=" text-align:center;" > </td>
                    <td  style=" text-align:center;" >  </td>
                    <td  style=" text-align:center;" >  </td>
                    <td  style=" text-align:center;" > </td>
                    </tr>';


        $result .= '<tr>
                    <td  style=" text-align:center;" >(1)   As per section 17(5) of CGST//SGST Act</td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    
                    <td  style=" text-align:center;" >0.00 </td>
                    </tr>';
        $result .= '<tr>
                    <td  style=" text-align:center;" >(2)   Others</td>
                    
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    </tr>';






        $result .= '<tr><td colspan="3" style=" text-align:center;" ></td></tr>';
        $result .= '<tr><td colspan="3" style=" text-align:center;" ><h4>5. Values of exempt, Nil-rated and non-GST inward supplies</h4></td></tr>';



        $result .= '<tr>
                    <td  style=" text-align:center;" >Nature of supplies</td>
                    <td  style=" text-align:center;" >Inter-State supplies</td>
                    <td  style=" text-align:center;" >Intra-state supplies</td>

                    </tr>';
        $result .= '<tr>
                <td  style=" text-align:center;" >1</td>
                <td  style=" text-align:center;" >2</td>
                <td  style=" text-align:center;" >3</td>

                </tr>';

        $result .= '<tr>
                    <td  style=" text-align:center;" >From a supplier under composition scheme, Exempt  and Nil rated </td>
                    
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>


                    </tr>';
        $result .= '<tr>
            <td  style=" text-align:center;" >Non GST supply</td>
            
            <td  style=" text-align:center;" >0.00 </td>
            <td  style=" text-align:center;" >0.00 </td>


            </tr>';
        $result .= '<tr>
                    <td  style=" text-align:center;" ><b>Total</b></td>
                    
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>


                    </tr>';




        $result .= '<tr><td colspan="5" style=" text-align:center;" ></td></tr>';
        $result .= '<tr><td colspan="5" style=" text-align:center;" ><h4>
                    5.1 Interest & late fee payable</h4></td></tr>';



        $result .= '<tr>
                    <td  style=" text-align:center;" >Description</td>
                    <td  style=" text-align:center;" >Integrated Tax</td>
                    <td  style=" text-align:center;" >Central Tax</td>
                    <td  style=" text-align:center;" >State/UT Tax</td>
                    <td  style=" text-align:center;" >Cess</td>

                    </tr>';
        $result .= '<tr>
                    <td  style=" text-align:center;" >1</td>
                    <td  style=" text-align:center;" >2</td>
                    <td  style=" text-align:center;" >3</td>
                    <td  style=" text-align:center;" >4</td>
                    <td  style=" text-align:center;" >5</td>

                    </tr>';

        $result .= '<tr>
                    <td  style=" text-align:center;" >Interest</td>
                    
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>
                    <td  style=" text-align:center;" >0.00 </td>


                    </tr>';


        $result .= '</tbody>


      </table>';

        echo $result;
    }



    public function getProductReport()
    {
        $request = service('request');
        $db = \Config\Database::connect();

        $productId = $request->getPost('product_id');
        $start = $request->getPost('start');
        $end = $request->getPost('end');

        $startDate = date("Y-m-d", strtotime($start));
        $endDate = date("Y-m-d", strtotime($end));

        $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
        $store = $db->table('stores')->getWhere(['id' => session('store')])->getRowArray();

        $decimals = $settings['decimals'];

        $saleItemsBuilder = $db->table('sale_items')
            ->where('date >=', $startDate)
            ->where('date <=', $endDate);

        if (!empty($productId)) {
            $saleItemsBuilder->where('product_id', $productId);
        }

        $saleItems = $saleItemsBuilder->orderBy('sale_id', 'DESC')->get()->getResult();

        // Append sale status for each item
        foreach ($saleItems as &$item) {
            $sale = $db->table('sales')->getWhere(['id' => $item->sale_id])->getRow();
            $item->sale_status = $sale->status ?? 0;

            switch ($item->sale_status) {
                case 3:
                    $item->status_label = 'Cancel';
                    break;
                case 1:
                    $item->status_label = 'Unpaid';
                    break;
                case 2:
                    $item->status_label = 'Partially paid';
                    break;
                default:
                    $item->status_label = 'Paid';
            }

            $item->tax = $item->subtotal - $item->subtotal2;
        }

        return view('reports/product_report_table', [
            'saleItems' => $saleItems,
            'settings' => $settings,
            'store' => $store,
            'start' => $start,
            'end' => $end,
            'decimals' => $decimals
        ]);
    }


    // public function getccdReport()
    // {
    //     helper('text');
    //     $db = \Config\Database::connect();
    //     $session = session();

    //     $product_id = $this->request->getPost('product_id');
    //     $start = $this->request->getPost('start');
    //     $end = $this->request->getPost('end');
    //     $storeId = $session->get('store');

    //     $startDate = date("Y-m-d", strtotime($start));
    //     $endDate = date("Y-m-d", strtotime($end));

    //     $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    //     $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();
    //     $logoUrl = base_url('files/Setting/' . $settings['logo']);

    //     $salesTable = $settings['themblock'] == 0 ? 'sales' : 'dsales';
    //     $saleItemsTable = $settings['themblock'] == 0 ? 'sale_items' : 'dsale_items';

    //     if ($product_id > 0) {
    //         $productsQuery = $db->query("
    //             SELECT p.*, SUM(s.qt) as ttt, 
    //                    SUM(CASE WHEN s.cancel_status = 1 THEN s.qt ELSE 0 END) as qt_cancel, 
    //                    c.name as ccc, p.name as pprd, s.product_id 
    //             FROM {$saleItemsTable} s
    //             JOIN products p ON p.id = s.product_id
    //             JOIN categories c ON p.category = c.id
    //             WHERE s.store_irrdd = ? AND p.category = ? AND s.date BETWEEN ? AND ?
    //             GROUP BY s.product_id, c.id
    //             ORDER BY pprd ASC
    //         ", [$storeId, $product_id, $startDate, $endDate]);
    //     } else {
    //         $productsQuery = $db->query("
    //             SELECT p.*, SUM(s.qt) as ttt, 
    //                    SUM(CASE WHEN s.cancel_status = 1 THEN s.qt ELSE 0 END) as qt_cancel, 
    //                    c.name as ccc, p.name as pprd, s.product_id 
    //             FROM {$saleItemsTable} s
    //             JOIN products p ON p.id = s.product_id
    //             JOIN categories c ON p.category = c.id
    //             WHERE s.store_irrdd = ? AND s.date BETWEEN ? AND ?
    //             GROUP BY s.product_id, c.id
    //             ORDER BY pprd ASC
    //         ", [$storeId, $startDate, $endDate]);
    //     }

    //     $products = $productsQuery->getResult();


    //     $reportData = [];

    //     foreach ($products as $product) {
    //         $returnQuery = $db->table('retunn_items')
    //             ->select('SUM(sl_newqt) as r_retun')
    //             ->where('prodd_ids', $product->product_id)
    //             ->where("to_datte >=", $startDate)
    //             ->where("to_datte <=", $endDate)
    //             ->get()->getRowArray();

    //         $returnedQty = (int) ($returnQuery['r_retun'] ?? 0);
    //         $totalQty = (int) $product->ttt;
    //         $cancelledQty = (int) $product->qt_cancel;
    //         $finalQty = $totalQty - $cancelledQty - $returnedQty;

    //         $reportData[] = [
    //             'category' => $product->ccc,
    //             'product' => $product->pprd,
    //             'sales' => $totalQty,
    //             'cancel' => $cancelledQty,
    //             'return' => $returnedQty,
    //             'total' => $finalQty,
    //         ];
    //     }

    //     return view('reports/ccd_report', [
    //         'companyname' => $settings['companyname'],
    //         'address' => $store['adresse'] ?? '',
    //         'start' => $startDate,
    //         'end' => $endDate,
    //         'reportData' => $reportData,
    //     ]);
    // }


    public function getccdReport()
    {
        $db = \Config\Database::connect();

        // Get POST values
        $product_id = $this->request->getPost('product_id');
        $start = $this->request->getPost('start');
        $end = $this->request->getPost('end');

        $totalprofit = 0;

        $startpp = date("Y-m-d", strtotime($start));
        $endpp = date("Y-m-d", strtotime($end));
        //$prduct = Product::find($product_id);
        $storeiid = $this->session->get('store');

        $poql = $this->db->query("select * from settings where id=1 ")->getRowArray();
        $poss = $this->db->query("select * from stores where id='" . $this->session->get('store') . "' ")->getRowArray();
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];

        $lkmm = $this->db->query(" select * from  settings where id=1 ")->getRowArray();
        if ($lkmm['themblock'] == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
            $tax_summary = "tax_summary";
        } else {
            $sales = "dsales";
            $sale_items = "dsale_items";
            $tax_summary = "dtax_summary";
        }
        //  ".$sales."
        //  ".$sale_items."
        //  ".$tax_summary."

        if ($product_id > 0) {
            $prducts = $this->db->query("select *,sum(qt) as ttt,sum(Case When cancel_status=1 THEN qt ELSE 0 END) as qt_cancel,c.name ccc,p.name as pprd
            from products p, " . $sale_items . " s, categories c
            where    s.store_irrdd ='$storeiid' and p.id = s.product_id and p.category = c.id and  p.category='$product_id'  and s.date between '$startpp' AND '$endpp'  group by product_id,c.id order by pprd asc");
        } else {
            $prducts = $this->db->query("select *,sum(qt) as ttt,sum(Case When cancel_status=1 THEN qt ELSE 0 END) as qt_cancel,c.name ccc,p.name as pprd
            from products p, " . $sale_items . " s, categories c
            where  s.store_irrdd ='$storeiid' and  p.id = s.product_id and p.category = c.id and s.date between '$startpp' AND '$endpp'  group by product_id,c.id order by pprd asc");
        }
        $prducts = $prducts->getResult();

        // print_r($prducts);
        // die;


        $result = '
        <table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="6" style="text-align:center; " >' . (isset($poql['companyname']) ? (isset($poql['companyname']) ? $poql['companyname'] : "") : "")  . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="6"> ' . (isset($poss['adresse']) ? (isset($poss['adresse']) ? $poss['adresse'] : "") : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " >
        <th colspan="6">Category Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th>
        </tr>

         <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;">' . label("Category") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Product") . '</th>
        <th style="border: 1px solid #1c76bc;text-align:center;">' . label("Sales") . '</th>
        <th style="border: 1px solid #1c76bc;text-align:center;">' . label("Cancel") . '</th>
        <th style="border: 1px solid #1c76bc;text-align:center;">' . label("Return") . '</th>
        <th style="border: 1px solid #1c76bc;text-align:center;">' . label("Total") . ' ' . label("Sales") . '</th>

        </tr></thead><tbody>';


        foreach ($prducts as $prd) {





            $sl_newqtf = $this->db->query("select *,sum(sl_newqt) as r_retun from retunn_items where prodd_ids='" . $prd->product_id . "' and  to_datte between '$startpp' AND '$endpp'  ")->getRowArray();

            $sl_newqtf_qty = intval($sl_newqtf['r_retun']);


            $final_qt = intval($prd->ttt) - intval($prd->qt_cancel) - intval($sl_newqtf_qty);


            $result .= '<tr style="border: 1px solid #1c76bc;">
            <td style="border: 1px solid #1c76bc;">' . $prd->ccc . '</td>
            <td style="border: 1px solid #1c76bc;">' . $prd->pprd . '</td>
            <td style="border: 1px solid #1c76bc;text-align:center; ">' . $prd->ttt . ' </td>
            <td style="border: 1px solid #1c76bc;text-align:center; ">' . $prd->qt_cancel . ' </td>
            <td style="border: 1px solid #1c76bc;text-align:center; ">' . $sl_newqtf_qty . ' </td>
            <td style="border: 1px solid #1c76bc;text-align:center; ">' . $final_qt . ' </td>
            </tr>';
        }

        $result .= '</tbody></table>';

        echo $result;
    }




    public function getCategoryWiseSalesReport()
    {
        $request = service('request');
        $db = \Config\Database::connect();

        $categoryId = $request->getPost('product_id'); // actually refers to category ID
        $start = $request->getPost('start');
        $end = $request->getPost('end');

        $startDate = date("Y-m-d", strtotime($start));
        $endDate = date("Y-m-d", strtotime($end));
        $storeId = session('store');

        $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
        $store = $db->table('stores')->getWhere(['id' => $storeId])->getRowArray();
        $themeBlock = $settings['themblock'];

        $saleItemsTable = $themeBlock == 0 ? 'sale_items' : 'dsale_items';

        $builder = $db->table('products p')
            ->select("p.id as product_id, p.name as product_name, c.name as category_name, SUM(s.qt) as total_qt, SUM(CASE WHEN s.cancel_status=1 THEN s.qt ELSE 0 END) as cancelled_qt")
            ->join("$saleItemsTable s", 'p.id = s.product_id')
            ->join('categories c', 'p.category = c.id')
            ->where('s.store_irrdd', $storeId)
            ->where('s.date >=', $startDate)
            ->where('s.date <=', $endDate);

        if (!empty($categoryId)) {
            $builder->where('p.category', $categoryId);
        }

        $builder->groupBy('p.id, c.id');
        $builder->orderBy('p.name', 'asc');
        $items = $builder->get()->getResult();

        // Fetch return quantities
        foreach ($items as &$item) {
            $returnData = $db->table('retunn_items')
                ->select('SUM(sl_newqt) as returned_qty')
                ->where('prodd_ids', $item->product_id)
                ->where('to_datte >=', $startDate)
                ->where('to_datte <=', $endDate)
                ->get()->getRowArray();

            $item->returned_qty = intval($returnData['returned_qty']);
            $item->final_qt = intval($item->total_qt) - intval($item->cancelled_qt) - intval($item->returned_qty);
        }

        return view('reports/category_sales_report_table', [
            'items' => $items,
            'settings' => $settings,
            'store' => $store,
            'start' => $start,
            'end' => $end
        ]);
    }



    public function getFastMovingReport()
    {
        $request = service('request');
        $db = \Config\Database::connect();

        $categoryId = $request->getPost('product_id');
        $start = $request->getPost('start');
        $end = $request->getPost('end');

        $startDate = date("Y-m-d", strtotime($start));
        $endDate = date("Y-m-d", strtotime($end));
        $storeId = session('store');

        $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
        $store = $db->table('stores')->getWhere(['id' => $storeId])->getRowArray();
        $decimals = $settings['decimals'];
        $saleItemsTable = $settings['themblock'] == 0 ? 'sale_items' : 'dsale_items';

        // Main product query
        $builder = $db->table('products p')
            ->select("p.id as product_id, p.name as product_name, c.name as category_name, SUM(s.qt) as total_qt, SUM(CASE WHEN s.cancel_status=1 THEN s.qt ELSE 0 END) as cancelled_qt")
            ->join("$saleItemsTable s", 'p.id = s.product_id')
            ->join('categories c', 'p.category = c.id')
            ->where('s.store_irrdd', $storeId)
            ->where('s.date >=', $startDate)
            ->where('s.date <=', $endDate);

        if (!empty($categoryId)) {
            $builder->where('p.category', $categoryId);
        }

        $builder->groupBy('p.id, c.id');
        $builder->orderBy('total_qt', 'DESC');
        $products = $builder->get()->getResult();

        // Fetch return quantities
        foreach ($products as &$product) {
            $return = $db->table('retunn_items')
                ->select('SUM(sl_newqt) as returned_qty')
                ->where('prodd_ids', $product->product_id)
                ->where('store_idsi', $storeId)
                ->where('to_datte >=', $startDate)
                ->where('to_datte <=', $endDate)
                ->get()->getRow();

            $product->returned_qty = (int)($return->returned_qty ?? 0);
            $product->final_qt = (int)$product->total_qt - (int)$product->cancelled_qt - $product->returned_qty;
        }

        return view('reports/fast_moving_report_table', [
            'products' => $products,
            'settings' => $settings,
            'store' => $store,
            'start' => $startDate,
            'end' => $endDate,
            'decimals' => $decimals,
        ]);
    }







    public function getPurchaseReport()
    {
        $request = service('request');
        $db = \Config\Database::connect();

        $productId = $request->getPost('product_id') ?? '';
        $start = $request->getPost('start');
        $end = $request->getPost('end');

        $startDate = date("Y-m-d", strtotime($start));
        $endDate = date("Y-m-d", strtotime($end));

        $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
        $decimals = $settings['decimals'];

        $builder = $db->table('sale_items')->select('*, SUM(qt) as nnn')
            ->where('date >=', $startDate)
            ->where('date <=', $endDate)
            ->groupBy(['tottax', 'price']);

        if (!empty($productId)) {
            $builder->where('product_id', $productId);
        }

        $saleItems = $builder->get()->getResult();

        // Get unit for each product
        $productUnits = [];
        foreach ($saleItems as $item) {
            $product = $db->table('products')->select('unit')->getWhere(['id' => $item->product_id])->getRowArray();
            $productUnits[$item->product_id] = $product['unit'] ?? '';
        }

        return view('reports/purchase_report_table', [
            'saleItems' => $saleItems,
            'productUnits' => $productUnits,
            'settings' => $settings,
            'decimals' => $decimals,
            'start' => $startDate,
            'end' => $endDate
        ]);
    }


    // public function getProducttaxReport()
    // {
    //     $db = \Config\Database::connect();
    //     $product_id = $this->request->getPost('product_id');
    //     $startpp = $this->request->getPost('start');
    //     $endpp = $this->request->getPost('end');
    //     $storeId = $this->request->getPost('Stores');

    //     $start = date("Y-m-d", strtotime($startpp));
    //     $end = date("Y-m-d", strtotime($endpp));

    //     $storeClause = ($storeId > 0) ? "store_irrdd='$storeId' AND " : "";

    //     $settings = $this->db->query("SELECT * FROM settings WHERE id=1")->getRowArray();
    //     // $store = $this->db->query("SELECT * FROM stores WHERE id=" . session()->get('store'))->getRowArray();
    //     $register    = $db->table('registers')->getWhere(['id' => $this->register])->getRowArray();
    //     print_r($register);
    //     die;
    //     $store    = $db->table('stores')->getWhere(['id' => $register->store_id])->getRow();

    //     $saleTable = $settings['themblock'] == 0 ? 'sales' : 'dsales';
    //     $saleItemsTable = $settings['themblock'] == 0 ? 'sale_items' : 'dsale_items';

    //     $query = "SELECT * FROM $saleItemsTable WHERE $storeClause date BETWEEN '$start' AND '$end'";
    //     if (!empty($product_id)) {
    //         $query .= " AND product_id = '$product_id'";
    //     }
    //     $query .= " ORDER BY sale_id DESC";

    //     $saleItems = $this->db->query($query)->getResult();

    //     $data = [
    //         'saleItems'      => $saleItems,
    //         'store'          => $store,
    //         'settings'       => $settings,
    //         'start'          => $startpp,
    //         'end'            => $endpp,
    //         'saleTable'      => $saleTable,
    //         'ret_idd'        => $settings['themblock'],
    //     ];

    //     return view('reports/product_tax_report_table', $data);
    // }

    public function getProducttaxReport_old()
    {

        $product_id = $this->input->post('product_id');
        $startpp = $this->input->post('start');
        $endpp = $this->input->post('end');


        $rstts = $this->input->post('Stores');

        if ($rstts > 0) {
            $rstt = 'store_irrdd=' . $rstts . ' and ';
        } else {
            $rstt = '';
        }

        $lkmm = $this->db->query(" select * from  settings where id=1 ")->getRowArray();
        if ($lkmm['themblock'] == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
            $tax_summary = "tax_summary";
        } else {
            $sales = "dsales";
            $sale_items = "dsale_items";
            $tax_summary = "dtax_summary";
        }

        $ret_idd = $lkmm['themblock'];

        //  ".$sales."
        //  ".$sale_items."
        //  ".$tax_summary."


        $start = date("Y-m-d", strtotime($startpp));
        $end = date("Y-m-d", strtotime($endpp));


        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;
        $sasasas = 0;
        $totalprofit_cc = 0;
        $sasasas_cc = 0;
        $totalprocg_cc = 0;
        $gtotal_cc = 0;

        $totalprofit_rr = 0;
        $sasasas_rr = 0;
        $totalprocg_rr = 0;
        $gtotal_rr = 0;

        $itemtot_profit = 0;
        $tot_profit = 0;
        $itemtot_prcan_amt = 0;

        $poql = $this->db->query("select * from settings where id=1 ")->getRowArray();
        $poss = $this->db->query("select * from stores where id='" . $this->session->userdata('store') . "' ")->getRowArray();
        $logo = $poql['logo'] ?? 'default-logo.png';
        $kmmokk = base_url('files/Setting/' . $logo);


        //$prduct = Product::find($product_id);
        if ($product_id == 0  || $product_id == '') {
            $prducts = $this->SaleItemModel->findBySql("SELECT * FROM " . $sale_items . " WHERE  $rstt   date between '$start' AND '$end' ORDER BY sale_id desc  ");
        } else {
            $prducts = $this->SaleItemModel->findBySql("SELECT *  FROM " . $sale_items . " WHERE   $rstt   product_id = '$product_id' AND date between '$start' AND '$end' ORDER BY sale_id desc ");
        }

        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="11" style="text-align:center; " >' . (isset($poql['companyname']) ? $poql['companyname'] : '') . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="11"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="11">Product Tax  Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

         <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc; ">Sales ID</th>
        <th style="border: 1px solid #1c76bc; ">' . label("ProductName") . '</th>
        <th style="border: 1px solid #1c76bc; ">' . label("Stores") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">GST </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Qty</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Unit") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Perchase<br> Price </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">MRP <br> Price</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Selling") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . '  </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Discount") . '  </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">CGST+SGST</th>
        
        <th style="text-align:center;border: 1px solid #1c76bc; ">IGST</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Profit</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Status</th>
        
        </tr></thead><tbody>';

        $tt = 1;
        foreach ($prducts as $prd) {
            $itemtot_profit = 0;

            $oloo = $this->db->query("select id,status from " . $sales . " where id='" . $prd->sale_id . "' ")->getRowArray();
            $return_ck = $this->db->query("select * from  retunn_items where sl_id='" . $prd->id . "'  and rsaleit_type='" . $ret_idd . "'  ")->getRowArray();
            $return_ck_num = count($return_ck);

            if ($prd->cancel_status == 1) {
                $bil_ststy = "style=background:#e9c0c0;";
                $sstaus_w = "Cancel";
            } elseif (intval($return_ck_num) > 0) {
                $bil_ststy = "style=background:#f86e50;";
                $sstaus_w = "Return";
            } else {
                $bil_ststy = '';
                $sstaus_w = "Sales";
            }

            $induj_rr = 0;
            $induj_amtt_rr = 0;



            $mkn = $this->db->query("select id,unit from products where  id='" . $prd->product_id . "' ")->getRowArray();
            $sslal = $this->db->query("select * from  " . $sales . " where id='" . $prd->sale_id . "' ")->getRowArray();
            $sslalf = $sslal['discountamount'];
            $discout_per = ($sslal['discountamount'] * 100) / $sslal['subtotal'];
            $totarat = $prd->subtotal;
            $discout_amt = ($prd->subtotal * $discout_per) / 100;
            if ($prd->dis_per > 0) {
                $discout_amt = $prd->dis_per;
            } else {
                $discout_amt = ($prd->subtotal * $discout_per) / 100;
            }
            $sslalff = $prd->subtotal - $discout_amt;
            if ($prd->cgst > 0) {
                $ctax = $sslalff - ($sslalff / (1 + ($prd->cgst / 100)));
                $sst = $prd->cgst;
                $itax = 0;
            } else {
                $ctax = 0;
                $sst = $prd->igstt;
                $itax = $sslalff - ($sslalff / (1 + ($prd->igstt / 100)));
            }

            if ($prd->cancel_status == 1) {
                $itemtot_prcan = 0;
                $totalprofit_cc = $totalprofit_cc + $prd->subtotal;

                $discout_amt_cc = ($prd->subtotal * $discout_per) / 100;
                $sasasas_cc = $sasasas_cc + $discout_amt_cc;

                $sslalff_cc = $prd->subtotal - $discout_amt_cc;
                if ($prd->cgst > 0) {
                    $ctax_cc = $sslalff_cc - ($sslalff_cc / (1 + ($prd->cgst / 100)));
                    $sst_cc = $prd->cgst;
                    $itax_cc = 0;
                } else {
                    $ctax_cc = 0;
                    $sst_cc = $prd->igstt;
                    $itax_cc = $sslalff_cc - ($sslalff_cc / (1 + ($prd->igstt / 100)));
                }
                $totalprocg_cc = $totalprocg_cc + $ctax_cc;
                $gtotal_cc = $gtotal_cc + $itax_cc;

                $itemtot_prcan = $prd->subtotal - floatval($discout_amt) - floatval($ctax) - floatval($itax) - ($prd->qt * $prd->perprice);
                $itemtot_prcan_amt = $itemtot_prcan_amt + $itemtot_prcan;
            }
            if ($return_ck_num > 0) {
                foreach ($return_ck as $return_sal) {
                    $totalprofit_rr = $totalprofit_rr + $return_sal->sl_subtotal;
                    $induj_rr = $induj_rr + $return_sal->sl_newqt;
                    $induj_amtt_rr = $induj_amtt_rr + $return_sal->sl_subtotal;
                    $discout_amt_rr = ($return_sal->sl_subtotal * $discout_per) / 100;
                    $sasasas_rr = $sasasas_rr + $discout_amt_rr;
                    $sslalff_rr = $return_sal->sl_subtotal - $discout_amt_rr;
                    if ($prd->cgst > 0) {
                        $ctax_rr = $sslalff_rr - ($sslalff_rr / (1 + ($prd->cgst / 100)));
                        $sst_rr = $prd->cgst;
                        $itax_rr = 0;
                    } else {
                        $ctax_rr = 0;
                        $sst_rr = $prd->igstt;
                        $itax_rr = $sslalff_rr - ($sslalff_rr / (1 + ($prd->igstt / 100)));
                    }
                    $totalprocg_rr = $totalprocg_rr + $ctax_rr;
                    $gtotal_rr = $gtotal_rr + $itax_rr;
                }
            }




            $induj_amtt_rrd = $induj_amtt_rr - ($induj_amtt_rr / (1 + ($prd->cgst / 100)));

            $rfvrfv = $prd->qt - $induj_rr;

            if ($oloo->status != 3) {
                $itemtot_profit = $prd->subtotal - floatval($discout_amt) - floatval($ctax) - floatval($itax) - ($rfvrfv * $prd->perprice) - $induj_amtt_rr + $induj_amtt_rrd;
            }


            $tot_profit = $tot_profit + $itemtot_profit;

            $ggtot = $ctax + $itax + $totarat;
            $store_name = $this - db->query("select name,id from stores  where id='" . $prd->store_irrdd . "' ")->getRowArray();


            $result .= '<tr ' . $bil_ststy . '  >
            <td style="border: 1px solid #1c76bc; ">' . $prd->sale_id . '</td>
            <td style="border: 1px solid #1c76bc; ">' . ucfirst($prd->name) . '</td>
            <td style="border: 1px solid #1c76bc; ">' . ucfirst($store_name['name']) . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $sst . '%</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->qt . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $mkn['unit'] . '</td>


            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->perprice . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->mrpp . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->price, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->subtotal, $this->setting->decimals, '.', '') . '</td> 
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$discout_amt, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$ctax, $this->setting->decimals, '.', '')  . '</td>
           
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$itax, $this->setting->decimals, '.', '')  . '</td>  

            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$itemtot_profit, $this->setting->decimals, '.', '')  . '</td>

            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $sstaus_w . '</td>
            
            </tr>';

            $totalprofit += $totarat;
            $sasasas += $discout_amt;
            $totalprocg += $ctax;
            $gtotal += $itax;





            $tt++;
        }

        $result .= '</tbody>


        <tr>
            <td style="text-align:right;border: 1px solid #1c76bc; " ></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . label("Sub Total") . '</td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprofit, $this->setting->decimals, '.', '') . '</b></td>      

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$sasasas, $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprocg, $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$gtotal, $this->setting->decimals, '.', ' ') . '</b></td><td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$tot_profit, $this->setting->decimals, '.', ' ') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
         
            </tr>      


            <tr>
            <td style="text-align:right;border: 1px solid #1c76bc; " ></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . label("Cancel") . '</td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprofit_cc, $this->setting->decimals, '.', '') . '</b></td>      

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$sasasas_cc, $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprocg_cc, $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$gtotal_cc, $this->setting->decimals, '.', ' ') . '</b></td>  

             <td style="text-align:right;border: 1px solid #1c76bc; "></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
        
            </tr>
  <tr>
            <td style="text-align:right;border: 1px solid #1c76bc; " ></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . label("Return") . '</td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprofit_rr, $this->setting->decimals, '.', '') . '</b></td>      

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$sasasas_rr, $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprocg_rr, $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$gtotal_rr, $this->setting->decimals, '.', ' ') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            </tr> 


            <tr>
            <td style="text-align:right;border: 1px solid #1c76bc; " ></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . label("Total") . '</td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)($totalprofit - $totalprofit_cc - $totalprofit_rr), $this->setting->decimals, '.', '') . '</b></td>      

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)($sasasas - $sasasas_cc - $sasasas_rr), $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)($totalprocg - $totalprocg_cc - $totalprocg_rr), $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)($gtotal - $gtotal_cc - $gtotal_rr), $this->setting->decimals, '.', ' ') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            </tr>



            </table>';

        echo $result;
    }

    // public function getProducttaxReport()
    // {
    //     $storeId = session()->get('store');
    //     $product_id = $this->request->getPost('product_id');
    //     $startpp    = $this->request->getPost('start');
    //     $endpp      = $this->request->getPost('end');
    //     $rstts      = $this->request->getPost('Stores');

    //     if ($rstts > 0) {
    //         $rstt = 'store_irrdd=' . $rstts . ' and ';
    //     } else {
    //         $rstt = '';
    //     }

    //     $lkmm = $this->db->query(" select * from  settings where id=1 ")->getRowArray();
    //     if (isset($this->setting->themblock) && $this->setting->themblock == 0) {
    //         $sales = "sales";
    //         $sale_items = "sale_items";
    //         $tax_summary = "tax_summary";
    //     } else {
    //         $sales = "dsales";
    //         $sale_items = "dsale_items";
    //         $tax_summary = "dtax_summary";
    //     }

    //     $ret_idd = $lkmm['themblock'] ?? 0;

    //     //  ".$sales."
    //     //  ".$sale_items."
    //     //  ".$tax_summary."


    //     $start = date("Y-m-d", strtotime($startpp));
    //     $end = date("Y-m-d", strtotime($endpp));


    //     $totalprofit = 0;
    //     $totalprocg = 0;
    //     $totalprosg = 0;
    //     $gtotal = 0;
    //     $sasasas = 0;
    //     $totalprofit_cc = 0;
    //     $sasasas_cc = 0;
    //     $totalprocg_cc = 0;
    //     $gtotal_cc = 0;

    //     $totalprofit_rr = 0;
    //     $sasasas_rr = 0;
    //     $totalprocg_rr = 0;
    //     $gtotal_rr = 0;

    //     $itemtot_profit = 0;
    //     $tot_profit = 0;
    //     $itemtot_prcan_amt = 0;

    //     $poql = $this->db->query("select * from settings where id=1 ")->getRowArray();
    //     $poss = $this->db->query("select * from stores where id=" . $storeId)->getRowArray();
    //     $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];

    //     //$prduct = Product::find($product_id);
    //     if ($product_id == 0  || $product_id == '') {
    //         $prducts = $this->SaleItemModel->findBySql("SELECT * FROM " . $sale_items . " WHERE  $rstt   date between '$start' AND '$end' ORDER BY sale_id desc  ");
    //     } else {
    //         $prducts = $this->SaleItemModel->findBySql("SELECT *  FROM " . $sale_items . " WHERE   $rstt   product_id = '$product_id' AND date between '$start' AND '$end' ORDER BY sale_id desc ");
    //     }

    //     $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
    //     <thead><tr class="hideme"><th colspan="11" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
    //     <tr class="hideme" style="text-align:center; " ><th colspan="11"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
    //     <tr class="hideme" style="text-align:center; " ><th colspan="11">Product Tax  Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

    //      <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
    //     <th style="border: 1px solid #1c76bc; ">Sales ID</th>
    //     <th style="border: 1px solid #1c76bc; ">' . label("ProductName") . '</th>
    //     <th style="border: 1px solid #1c76bc; ">' . label("Stores") . '</th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">GST </th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">Qty</th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Unit") . ' </th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">Perchase<br> Price </th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">MRP <br> Price</th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Selling") . ' </th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . '  </th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Discount") . '  </th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">CGST+SGST</th>

    //     <th style="text-align:center;border: 1px solid #1c76bc; ">IGST</th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">Profit</th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">Status</th>

    //     </tr></thead><tbody>';

    //     $tt = 1;
    //     foreach ($prducts as $prd) {
    //         $itemtot_profit = 0;

    //         $oloo = $this->db->query("select id,status from " . $sales . " where id='" . $prd->sale_id . "' ")->getRowArray();
    //         // $return_ck = $this->db->query("select * from  retunn_items where sl_id='" . $prd->id . "'  and rsaleit_type='" . $ret_idd . "'  ")->getResultArray();
    //         // $return_ck_num = count($return_ck);
    //         $return_ck = $this->db->query("select * from  retunn_items where sl_id='" . $prd->id . "'  and rsaleit_type='" . $ret_idd . "'  ")->getResult();
    //         $return_ck_num = count($return_ck);

    //         if ($prd->cancel_status == 1) {
    //             $bil_ststy = "style=background:#e9c0c0;";
    //             $sstaus_w = "Cancel";
    //         } elseif (intval($return_ck_num) > 0) {
    //             $bil_ststy = "style=background:#f86e50;";
    //             $sstaus_w = "Return";
    //         } else {
    //             $bil_ststy = '';
    //             $sstaus_w = "Sales";
    //         }

    //         $induj_rr = 0;
    //         $induj_amtt_rr = 0;



    //         $mkn = $this->db->query("select id,unit,name from products where  id='" . $prd->product_id . "' ")->getRowArray();
    //         $sslal = $this->db->query("select * from  " . $sales . " where id='" . $prd->sale_id . "' ")->getRowArray();
    //         $sslalf = $sslal['discountamount'];
    //         $discout_per = ($sslal['discountamount'] * 100) / $sslal['subtotal'];
    //         $totarat = $prd->subtotal;
    //         $discout_amt = ($prd->subtotal * $discout_per) / 100;
    //         if ($prd->dis_per > 0) {
    //             $discout_amt = $prd->dis_per;
    //         } else {
    //             $discout_amt = ($prd->subtotal * $discout_per) / 100;
    //         }
    //         $sslalff = $prd->subtotal - $discout_amt;
    //         if ($prd->cgst > 0) {
    //             $ctax = $sslalff - ($sslalff / (1 + ($prd->cgst / 100)));
    //             $sst = $prd->cgst;
    //             $itax = 0;
    //         } else {
    //             $ctax = 0;
    //             $sst = $prd->igstt;
    //             $itax = floatval(floatval($sslalff)) - (floatval($sslalff) / (1 + (floatval($prd->igstt) / 100)));
    //         }

    //         // if ($prd->cancel_status == 1) {
    //         if ($prd->cancel_status == 1) {
    //             $itemtot_prcan = 0;
    //             $totalprofit_cc = $totalprofit_cc + $prd->subtotal;

    //             $discout_amt_cc = ($prd->subtotal * $discout_per) / 100;
    //             $sasasas_cc = $sasasas_cc + $discout_amt_cc;

    //             $sslalff_cc = $prd->subtotal - $discout_amt_cc;
    //             if ($prd->cgst > 0) {
    //                 $ctax_cc = $sslalff_cc - ($sslalff_cc / (1 + ($prd->cgst / 100)));
    //                 $sst_cc = $prd->cgst;
    //                 $itax_cc = 0;
    //             } else {
    //                 $ctax_cc = 0;
    //                 $sst_cc = $prd->igstt;
    //                 $itax_cc = floatval(
    //                     floatval($sslalff_cc)
    //                 ) - floatval(floatval($sslalff_cc) / (1 + (floatval($prd->igstt) / 100)));
    //             }
    //             $totalprocg_cc = $totalprocg_cc + $ctax_cc;
    //             $gtotal_cc = $gtotal_cc + $itax_cc;

    //             $itemtot_prcan = $prd->subtotal - floatval($discout_amt) - floatval($ctax) - floatval($itax) - (floatval($prd->qt) * floatval($prd->perprice));
    //             $itemtot_prcan_amt = $itemtot_prcan_amt + $itemtot_prcan;
    //         }
    //         if ($return_ck_num > 0) {
    //             foreach ($return_ck as $return_sal) {
    //                 $totalprofit_rr = $totalprofit_rr + $return_sal->sl_subtotal;
    //                 $induj_rr = $induj_rr + $return_sal->sl_newqt;
    //                 $induj_amtt_rr = $induj_amtt_rr + $return_sal->sl_subtotal;
    //                 $discout_amt_rr = ($return_sal->sl_subtotal * $discout_per) / 100;
    //                 $sasasas_rr = $sasasas_rr + $discout_amt_rr;
    //                 $sslalff_rr = $return_sal->sl_subtotal - $discout_amt_rr;
    //                 if ($prd->cgst > 0) {
    //                     $ctax_rr = $sslalff_rr - ($sslalff_rr / (1 + ($prd->cgst / 100)));
    //                     $sst_rr = $prd->cgst;
    //                     $itax_rr = 0;
    //                 } else {
    //                     $ctax_rr = 0;
    //                     $sst_rr = $prd->igstt;
    //                     $itax_rr = $sslalff_rr - ($sslalff_rr / (1 + (floatval($prd->igstt) / 100)));
    //                 }
    //                 $totalprocg_rr = $totalprocg_rr + $ctax_rr;
    //                 $gtotal_rr = $gtotal_rr + $itax_rr;
    //             }
    //         }


    //         $induj_amtt_rrd =
    //             floatval(floatval($induj_amtt_rr)) - floatval(floatval($induj_amtt_rr) / (1 + (floatval($prd->cgst) / 100)));

    //         $rfvrfv = $prd->qt - $induj_rr;

    //         if (isset($oloo['status']) && $oloo['status'] != 3) {
    //             $itemtot_profit = $prd->subtotal - floatval($discout_amt) - floatval($ctax) - floatval($itax) - (floatval($rfvrfv) * floatval($prd->perprice)) - $induj_amtt_rr + $induj_amtt_rrd;
    //         }


    //         $tot_profit = $tot_profit + $itemtot_profit;

    //         $ggtot = $ctax + $itax + $totarat;
    //         $store_name = $this->db->query("select name,id from stores  where id='" . session()->get('store') . "' ")->getRowArray();


    //         $result .= '<tr ' . $bil_ststy . '  >
    //         <td style="border: 1px solid #1c76bc; ">' . $prd->sale_id . '</td>
    //         <td style="border: 1px solid #1c76bc; ">' . ucfirst($mkn['name']) . '</td>
    //         <td style="border: 1px solid #1c76bc; ">' . ucfirst(isset($store_name['name']) ? $store_name['name'] : '') . '</td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; ">' . $sst . '%</td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->qt . '</td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; ">' . $mkn['unit'] . '</td>


    //         <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->perprice . '</td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->mrpp . '</td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->price, $this->setting->decimals, '.', '') . '</td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->subtotal, $this->setting->decimals, '.', '') . '</td> 
    //         <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$discout_amt, $this->setting->decimals, '.', '') . '</td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$ctax, $this->setting->decimals, '.', '')  . '</td>

    //         <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$itax, $this->setting->decimals, '.', '')  . '</td>  

    //         <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$itemtot_profit, $this->setting->decimals, '.', '')  . '</td>

    //         <td style="text-align:center;border: 1px solid #1c76bc; ">' . $sstaus_w . '</td>

    //         </tr>';

    //         $totalprofit += $totarat;
    //         $sasasas += $discout_amt;
    //         $totalprocg += $ctax;
    //         $gtotal += $itax;





    //         $tt++;
    //     }

    //     $result .= '</tbody>


    //     <tr>
    //         <td style="text-align:right;border: 1px solid #1c76bc; " ></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; ">' . label("Sub Total") . '</td>
    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprofit, $this->setting->decimals, '.', '') . '</b></td>      

    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$sasasas, $this->setting->decimals, '.', '') . '</b></td>

    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprocg, $this->setting->decimals, '.', '') . '</b></td>

    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$gtotal, $this->setting->decimals, '.', ' ') . '</b></td><td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$tot_profit, $this->setting->decimals, '.', ' ') . '</b></td>
    //        <td style="text-align:right;border: 1px solid #1c76bc; "></td>

    //         </tr>      


    //         <tr>
    //         <td style="text-align:right;border: 1px solid #1c76bc; " ></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; ">' . label("Cancel") . '</td>
    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprofit_cc, $this->setting->decimals, '.', '') . '</b></td>      

    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$sasasas_cc, $this->setting->decimals, '.', '') . '</b></td>

    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprocg_cc, $this->setting->decimals, '.', '') . '</b></td>

    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$gtotal_cc, $this->setting->decimals, '.', ' ') . '</b></td>  

    //          <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //        <td style="text-align:right;border: 1px solid #1c76bc; "></td>

    //         </tr>
    //          <tr>
    //         <td style="text-align:right;border: 1px solid #1c76bc; " ></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; ">' . label("Return") . '</td>
    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprofit_rr, $this->setting->decimals, '.', '') . '</b></td>      

    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$sasasas_rr, $this->setting->decimals, '.', '') . '</b></td>

    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprocg_rr, $this->setting->decimals, '.', '') . '</b></td>

    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$gtotal_rr, $this->setting->decimals, '.', ' ') . '</b></td>
    //        <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //        <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         </tr> 


    //         <tr>
    //         <td style="text-align:right;border: 1px solid #1c76bc; " ></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; ">' . label("Total") . '</td>
    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)($totalprofit - $totalprofit_cc - $totalprofit_rr), $this->setting->decimals, '.', '') . '</b></td>      

    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)($sasasas - $sasasas_cc - $sasasas_rr), $this->setting->decimals, '.', '') . '</b></td>

    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)($totalprocg - $totalprocg_cc - $totalprocg_rr), $this->setting->decimals, '.', '') . '</b></td>

    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)($gtotal - $gtotal_cc - $gtotal_rr), $this->setting->decimals, '.', ' ') . '</b></td>
    //        <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //        <td style="text-align:right;border: 1px solid #1c76bc; "></td>
    //         </tr>



    //         </table>';

    //     echo $result;
    // }


    public function getProducttaxReport()
    {
        $storeId = session()->get('store');
        $product_id = $this->request->getPost('product_id');
        $startpp    = $this->request->getPost('start');
        $endpp      = $this->request->getPost('end');
        $rstts      = $this->request->getPost('Stores');


        if ($rstts > 0) {
            $rstt = 'store_irrdd=' . $rstts . ' and ';
        } else {
            $rstt = '';
        }

        $lkmm = $this->db->query(" select * from  settings where id=1")->getRowArray();
        if (isset($this->setting->themblock) && $this->setting->themblock == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
            $tax_summary = "tax_summary";
        } else {
            $sales = "dsales";
            $sale_items = "dsale_items";
            $tax_summary = "dtax_summary";
        }

        $ret_idd = $this->setting->themblock ?? null;;

        //  ".$sales."
        //  ".$sale_items."
        //  ".$tax_summary."


        $start = date("Y-m-d",  strtotime($startpp));
        $end = date("Y-m-d", strtotime($endpp));




        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;
        $sasasas = 0;
        $totalprofit_cc = 0;
        $sasasas_cc = 0;
        $totalprocg_cc = 0;
        $gtotal_cc = 0;

        $totalprofit_rr = 0;
        $sasasas_rr = 0;
        $totalprocg_rr = 0;
        $gtotal_rr = 0;

        $itemtot_profit = 0;
        $tot_profit = 0;
        $itemtot_prcan_amt = 0;

        $poql = $this->db->query("select * from settings where id=1 ")->getResultArray();
        $poss = $this->db->query("SELECT * FROM stores WHERE id = ?", [$storeId])->getResultArray();
        $kmmokk = base_url('files/Setting/' . ($poql['logo'] ?? 'default.png'));

        //$prduct = Product::find($product_id);
        // if ($product_id == 0  || $product_id == '') {
        //     $prducts = $this->db->query("SELECT $sale_items.*, products.name   FROM " . $sale_items . " JOIN products ON products.id=$sale_items.product_id WHERE $rstt date >= $start AND date <= $end  ORDER BY sale_id DESC")->getResult();
        // } else {
        //     $prducts =  $this->db->query("SELECT $sale_items.*, products.name  FROM " . $sale_items . " JOIN products ON products.id=$sale_items.product_id  WHERE   $rstt   product_id = '$product_id' AND date >= $start AND date <= $end  ORDER BY sale_id desc")->getResult();
        // }
        $db = \Config\Database::connect();
        $builder = $db->table($sale_items); // Make sure $sale_items = 'sale_items' or similar

        $builder->select("$sale_items.*, products.name");
        $builder->join('products', "$sale_items.product_id = products.id");

        // Optional extra condition (like store_id = 'X' or status != 3)
        if (!empty($rstt)) {
            $builder->where($rstt); // $rstt must be a valid string or array condition
        }

        // Add date filtering
        $builder->where("$sale_items.date <=", $start);
        $builder->where("$sale_items.date >=", $end);

        // Order by sale_id DESC
        $builder->orderBy('sale_id', 'DESC');

        // Fetch the result
        $prducts = $builder->get()->getResult();
        // print_r($prducts);

        // die;

        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="11" style="text-align:center; " >' . (isset($poql['companyname']) ? $poql['companyname'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="11"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="11">Product Tax  Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

         <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc; ">Sales ID</th>
        <th style="border: 1px solid #1c76bc; ">' . label("ProductName") . '</th>
        <th style="border: 1px solid #1c76bc; ">' . label("Stores") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">GST </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Qty</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Unit") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Perchase<br> Price </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">MRP <br> Price</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Selling") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . '  </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Discount") . '  </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">CGST+SGST</th>
        
        <th style="text-align:center;border: 1px solid #1c76bc; ">IGST</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Profit</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Status</th>      
        </tr></thead><tbody>';
        $tt = 1;

        foreach ($prducts as $prd) {

            // print_r($prd);
            // die;

            $itemtot_profit = 0;
            $oloo = $this->db->query("select id,status from " . $sales . " where id='" . $prd->sale_id . "' ")->getResult();
            $return_ck = $this->db->query("select * from  retunn_items where sl_id='" . $prd->id . "'  and rsaleit_type='" . $ret_idd . "'  ")->getResultArray();
            // $return_ck_num = mysql_num_rows($return_ck);
            // $return_ck_num = $return_ck->getNumRows();
            $return_ck_num = count(value: $return_ck);

            if ($prd->cancel_status == 1) {
                $bil_ststy = "style=background:#e9c0c0;";
                $sstaus_w = "Cancel";
            } elseif (intval($return_ck_num) > 0) {
                $bil_ststy = "style=background:#f86e50;";
                $sstaus_w = "Return";
            } else {
                $bil_ststy = '';
                $sstaus_w = "Sales";
            }

            $induj_rr = 0;
            $induj_amtt_rr = 0;



            $mkn = $this->db->query("select id,unit from products where  id='" . $prd->product_id . "' ")->getResultArray();

            $sslal = $this->db->query("select * from  " . $sales . " where id='" . $prd->sale_id . "' ")->getResultArray();
            $sslalf = isset($sslal['discountamount']) ? $sslal['discountamount'] : 0;
            $subtotal = isset($sslal['subtotal']) ? $sslal['subtotal'] : 0;
            $discout_per = ($subtotal != 0) ? ($sslalf * 100) / $subtotal : 0;
            $totarat = $prd->subtotal;
            $discout_amt = ($prd->subtotal * $discout_per) / 100;
            if ($prd->dis_per > 0) {
                $discout_amt = $prd->dis_per;
            } else {
                $discout_amt = ($prd->subtotal * $discout_per) / 100;
            }
            $sslalff = $prd->subtotal - $discout_amt;
            if ($prd->cgst > 0) {
                $ctax = $sslalff - ($sslalff / (1 + ($prd->cgst / 100)));
                $sst = $prd->cgst;
                $itax = 0;
            } else {
                $ctax = 0;
                $sst = $prd->igstt;
                // $itax = $sslalff - ($sslalff / (1 + ($prd->igstt / 100)));
                $igstt = isset($prd->igstt) && is_numeric($prd->igstt) ? $prd->igstt : 0;

                if ($igstt != 0) {
                    $itax = $sslalff - ($sslalff / (1 + ($igstt / 100)));
                } else {
                    $itax = 0; // or set it to $sslalff if that's your fallback logic
                }
            }

            if ($prd->cancel_status == 1) {
                $itemtot_prcan = 0;
                $totalprofit_cc = $totalprofit_cc + $prd->subtotal;

                $discout_amt_cc = ($prd->subtotal * $discout_per) / 100;
                $sasasas_cc = $sasasas_cc + $discout_amt_cc;

                $sslalff_cc = $prd->subtotal - $discout_amt_cc;
                if ($prd->cgst > 0) {
                    $ctax_cc = $sslalff_cc - ($sslalff_cc / (1 + ($prd->cgst / 100)));
                    $sst_cc = $prd->cgst;
                    $itax_cc = 0;
                } else {
                    $ctax_cc = 0;
                    $sst_cc = $prd->igstt;
                    // $itax_cc = $sslalff_cc - ($sslalff_cc / (1 + ($prd->igstt / 100)));
                    $itax_cc = (float)$sslalff_cc - ((float)$sslalff_cc / (1 + ((float)$prd->igstt / 100)));
                }
                $totalprocg_cc = $totalprocg_cc + $ctax_cc;
                $gtotal_cc = $gtotal_cc + $itax_cc;

                // $itemtot_prcan = $prd->subtotal - floatval($discout_amt) - floatval($ctax) - floatval($itax) - ($prd->qt * $prd->perprice);
                $itemtot_prcan = floatval($prd->subtotal)
                    - floatval($discout_amt)
                    - floatval($ctax)
                    - floatval($itax)
                    - (floatval($prd->qt) * floatval($prd->perprice));
                $itemtot_prcan_amt = $itemtot_prcan_amt + $itemtot_prcan;
            }
            if ($return_ck_num > 0) {
                foreach ($return_ck as $return_sal) {
                    $totalprofit_rr = $totalprofit_rr + $return_sal['sl_subtotal'];
                    $induj_rr = $induj_rr + $return_sal['sl_newqt'];
                    $induj_amtt_rr = $induj_amtt_rr + $return_sal['sl_subtotal'];
                    $discout_amt_rr = ($return_sal['sl_subtotal'] * $discout_per) / 100;
                    $sasasas_rr = $sasasas_rr + $discout_amt_rr;
                    $sslalff_rr = $return_sal['sl_subtotal'] - $discout_amt_rr;
                    if ($prd->cgst > 0) {
                        $ctax_rr = $sslalff_rr - ($sslalff_rr / (1 + ($prd->cgst / 100)));
                        $sst_rr = $prd->cgst;
                        $itax_rr = 0;
                    } else {
                        $ctax_rr = 0;
                        $sst_rr = $prd->igstt;
                        // $itax_rr = $sslalff_rr - ($sslalff_rr / (1 + ($prd->igstt / 100)));
                        $itax_rr = floatval($sslalff_rr) - (floatval($sslalff_rr) / (1 + (floatval($prd->igstt) / 100)));
                    }
                    $totalprocg_rr = $totalprocg_rr + $ctax_rr;
                    $gtotal_rr = $gtotal_rr + $itax_rr;
                }
            }




            // $induj_amtt_rrd = $induj_amtt_rr - ($induj_amtt_rr / (1 + ($prd->cgst / 100)));
            $cgst = isset($prd->cgst) && is_numeric($prd->cgst) ? (float)$prd->cgst : 0;

            if ($cgst != 0) {
                $induj_amtt_rrd = $induj_amtt_rr - ($induj_amtt_rr / (1 + ($cgst / 100)));
            } else {
                $induj_amtt_rrd = 0; // or just $induj_amtt_rr depending on your logic
            }

            $rfvrfv = $prd->qt - $induj_rr;

            if (isset($oloo['status']) && $oloo['status'] != 3) {
                $itemtot_profit = $prd->subtotal - floatval($discout_amt) - floatval($ctax) - floatval($itax) - ($rfvrfv * $prd->perprice) - $induj_amtt_rr + $induj_amtt_rrd;
            }


            $tot_profit = $tot_profit + $itemtot_profit;

            $ggtot = $ctax + $itax + $totarat;
            $store_name = $this->db->query("SELECT stores.name, stores.id FROM stores JOIN stocks ON stocks.store_id=stores.id WHERE stocks.product_id='" . $prd->product_id . "' ")->getRowArray();

            // $purchase = $this->db->table('purchase_items')->select('cost')->where('product_id', $prd->product_id)->get()->getRow();


            $result .= '<tr ' . $bil_ststy . '  >
            <td style="border: 1px solid #1c76bc; ">' . $prd->sale_id . '</td>
            <td style="border: 1px solid #1c76bc; ">' . ucfirst($prd->name) . '</td>
            <td style="border: 1px solid #1c76bc; ">' . (!empty($store_name['name']) ? ucfirst($store_name['name']) : '') . '</td>

            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $sst . '%</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->qt . '</td>
          <td style="text-align:right;border: 1px solid #1c76bc;">' . (isset($mkn['unit']) ? $mkn['unit'] : 0) . '</td>



           <td style="text-align:right;border: 1px solid #1c76bc;">' . (isset($prd->perprice) ? $prd->perprice : 0) . '</td>

            <td style="text-align:right;border: 1px solid #1c76bc; ">' . (isset($prd->mrpp) ? $prd->mrpp : 0) . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->price, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->subtotal, $this->setting->decimals, '.', '') . '</td> 
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$discout_amt, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$ctax, $this->setting->decimals, '.', '')  . '</td>
           
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$itax, $this->setting->decimals, '.', '')  . '</td>  

            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$itemtot_profit, $this->setting->decimals, '.', '')  . '</td>

            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $sstaus_w . '</td>
            
            </tr>';

            $totalprofit += $totarat;
            $sasasas += $discout_amt;
            $totalprocg += $ctax;
            $gtotal += $itax;





            $tt++;
        }

        $result .= '</tbody>


        <tr>
            <td style="text-align:right;border: 1px solid #1c76bc; " ></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . label("Sub Total") . '</td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprofit, $this->setting->decimals, '.', '') . '</b></td>      

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$sasasas, $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprocg, $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$gtotal, $this->setting->decimals, '.', ' ') . '</b></td><td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$tot_profit, $this->setting->decimals, '.', ' ') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
         
            </tr>      


            <tr>
            <td style="text-align:right;border: 1px solid #1c76bc; " ></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . label("Cancel") . '</td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprofit_cc, $this->setting->decimals, '.', '') . '</b></td>      

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$sasasas_cc, $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprocg_cc, $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$gtotal_cc, $this->setting->decimals, '.', ' ') . '</b></td>  

             <td style="text-align:right;border: 1px solid #1c76bc; "></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
        
            </tr>
             <tr>
            <td style="text-align:right;border: 1px solid #1c76bc; " ></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . label("Return") . '</td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprofit_rr, $this->setting->decimals, '.', '') . '</b></td>      

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$sasasas_rr, $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totalprocg_rr, $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$gtotal_rr, $this->setting->decimals, '.', ' ') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            </tr> 


            <tr>
            <td style="text-align:right;border: 1px solid #1c76bc; " ></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . label("Total") . '</td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)($totalprofit - $totalprofit_cc - $totalprofit_rr), $this->setting->decimals, '.', '') . '</b></td>      

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)($sasasas - $sasasas_cc - $sasasas_rr), $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)($totalprocg - $totalprocg_cc - $totalprocg_rr), $this->setting->decimals, '.', '') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)($gtotal - $gtotal_cc - $gtotal_rr), $this->setting->decimals, '.', ' ') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            </tr>



            </table>';

        echo $result;
    }


    public function getProducttaxReportsupp()
    {
        $request = service('request');
        $session = session();
        $settingsModel = new SettingModel();
        $StoreModel = new StoreModel();
        $setting = $settingsModel->find(1);
        // $setting = model(SettingsModel::class)->find(1);

        $product_id = $request->getPost('product_id');
        $start = date("Y-m-d", strtotime($request->getPost('start')));
        $end = date("Y-m-d", strtotime($request->getPost('end')));
        $innon = $request->getPost('innon');
        $prrcc = $request->getPost('prrcc');

        $storeId = $session->get('store');
        $store = $StoreModel->find($storeId);
        $logoPath = base_url('files/Setting/' . $setting->logo);
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $paymentModel = new PaymentModel();

        if ($innon) {
            $payments = $this->db->table('payment_suplls')->where('invoicen', $innon)->orderBy('purchaid')->get()->getResult();
        } elseif ($prrcc) {
            $payments = $this->db->table('payment_suplls')->where('purchaid', $prrcc)->orderBy('purchaid')->get()->getResult();
        } elseif (($product_id == 0 || $product_id == '') && !$innon) {
            $payments = $this->db->table('payment_suplls')->where("datet >=", $start)->where("datet <=", $end)->orderBy('purchaid')->get()->getResult();
        } else {
            $payments = $this->db->table('payment_suplls')->where('sup_id', $product_id)->where("datet >=", $start)->where("datet <=", $end)->orderBy('purchaid')->get()->getResult();
        }
        $decimals = $this->setting->decimals;
        $data = [
            'decimals'       => $decimals,
            'setting'       => $setting,
            'store'         => $store,
            'payments'      => $payments,
            'start'         => $startpp,
            'end'            => $endpp,
            'db'              => $this->db,

        ];

        return view('reports/supplier_tax_report_table', $data);
    }



    public function getSupplierTaxReport()
    {
        $request = service('request');
        $db = \Config\Database::connect();

        $product_id = $request->getPost('product_id');
        $innon      = $request->getPost('innon');
        $prrcc      = $request->getPost('prrcc');
        $start      = date("Y-m-d", strtotime($request->getPost('start')));
        $end        = date("Y-m-d", strtotime($request->getPost('end')));

        $settings = $db->table('settings')->getWhere(['id' => 1])->getRowArray();
        $store    = $db->table('stores')->getWhere(['id' => session()->get('store')])->getRowArray();

        // Build query conditionally
        $query = $db->table('payment_suplls');
        if (!empty($innon)) {
            $query->where('invoicen', $innon);
        } elseif (!empty($prrcc)) {
            $query->where('purchaid', $prrcc);
        } elseif (empty($product_id)) {
            $query->where("datet >=", $start)->where("datet <=", $end);
        } else {
            $query->where('sup_id', $product_id)
                ->where("datet >=", $start)
                ->where("datet <=", $end);
        }

        $query->orderBy('purchaid');
        $payments = $query->get()->getResult();

        return view('reports/supplier_tax_report_table', [
            'payments'   => $payments,
            'settings'   => $settings,
            'store'      => $store,
            'start'      => $start,
            'end'        => $end,
            'decimals'   => $settings['decimals']
        ]);
    }


    // public function getPurchasedailyReport()
    // {
    //     $request = service('request');
    //     $db = \Config\Database::connect();

    //     $storeId = session()->get('store');
    //     $startRaw = $request->getPost('Range');
    //     $endRaw = $request->getPost('Range1');
    //     $billType = $request->getPost('bill_type');

    //     $start = date("Y-m-d", strtotime($startRaw ?: date("Y-m-d")));
    //     $end = date("Y-m-d", strtotime($endRaw ?: date("Y-m-d")));

    //     $purchaseType = ($billType !== null && $billType != '') ? ($billType == 1 ? 0 : 1) : null;

    //     $builder = $db->table('purchases')->where('store_id', $storeId)->where("purdat >=", $start)->where("purdat <=", $end);

    //     if ($purchaseType !== null) {
    //         $builder->where('ppurchase_type', $purchaseType);
    //     }

    //     $purchases = $builder->orderBy('purdat', 'ASC')->get()->getResult();


    //     $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
    //     $storeInfo = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

    //     return view('reports/purchase_daily_report_table', [
    //         'purchases' => $purchases,
    //         'settings'  => $settings,
    //         'store'     => $storeInfo,
    //         'start'     => $startRaw,
    //         'end'       => $endRaw,

    //     ]);
    // }


    // public function getpurchasedailyReport()
    // {

    //     $start = $this->request->getPost('Range');
    //     $end = $this->request->getPost('Range1');
    //     $btypess = $this->request->getPost('btypess');

    //     $db = \Config\Database::connect();
    //     $totalprofit = 0;
    //     $totalprocg = 0;
    //     $totalprosg = 0;
    //     $gtotal = 0;

    //     $poql = $this->db->query("select * from settings where id=1 ")->getRowArray();
    //     $poss = $this->db->query("select * from stores where id='" . session()->get('user_id') . "' ")->getRowArray();

    //     $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
    //     $startpp = date("d-m-Y", strtotime($start));
    //     $endpp = date("d-m-Y", strtotime($end));

    //     $fvfff = session()->get('user_id');
    //     // $btypess = $poql['purchase_type'];
    //     $btypess = '';
    //     if (isset($_POST['bill_type']) && !empty($_POST['bill_type'])) {
    //         $btypess = $_POST['bill_type'] == 1 ? 0 : 1;
    //     }
    //     // $products = [];
    //     //$prduct = Product::find($product_id);
    //     if ($start == 0  || $start == '') {
    //         $lmm = date("Y-m-d");
    //         if (!empty($btypess)) {
    //             // $prducts = $this->db->query("SELECT *  FROM `purchases` WHERE ppurchase_type='$btypess' and  store_id='$fvfff' and purdat between '$lmm' AND '$lmm'  order by purdat asc ");
    //             $builder = $db->table('purchases');
    //             $builder->where('ppurchase_type', $btypess);
    //             $builder->where('store_id', $fvfff);
    //             $builder->where('purdat >=', $lmm);
    //             $builder->where('purdat <=', $lmm);
    //             $builder->orderBy('purdat', 'ASC');

    //             $prducts = $builder->get()->getResult();
    //         } else {
    //             // $prducts = $this->db->query("SELECT *  FROM `purchases` WHERE store_id='$fvfff' and purdat between '$lmm' AND '$lmm'  order by purdat asc ");
    //             $builder = $db->table('purchases');
    //             $builder->where('store_id', $fvfff);
    //             $builder->where('purdat >=', $lmm);
    //             $builder->where('purdat <=', $lmm);
    //             $builder->orderBy('purdat', 'ASC');

    //             $prducts = $builder->get()->getResult();
    //         }
    //     } else {

    //         $la322x = explode('-', $start);
    //         $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

    //         $lax = explode('-', $end);
    //         $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];




    //         $lmm = date("Y-m-d");

    //         if (!empty($btypess)) {
    //             // $prducts = $this->db->query("SELECT *  FROM `purchases` WHERE ppurchase_type='$btypess' and  store_id='$fvfff' and purdat between '$la32' AND '$laxg'  order by purdat asc ");
    //             $builder = $db->table('purchases');
    //             $builder->where('ppurchase_type', $btypess);
    //             $builder->where('store_id', $fvfff);
    //             $builder->where('purdat >=', $la32);
    //             $builder->where('purdat <=', $laxg);
    //             $builder->orderBy('purdat', 'ASC');

    //             $prducts = $builder->get()->getResult();
    //         } else {
    //             // $prducts = $this->db->query("SELECT *  FROM `purchases` WHERE store_id='$fvfff' and purdat between  '$la32' AND '$laxg'  order by purdat asc ");
    //             $builder = $db->table('purchases');
    //             $builder->where('store_id', $fvfff);
    //             $builder->where('purdat >=', $la32);
    //             $builder->where('purdat <=', $laxg);
    //             $builder->orderBy('purdat', 'ASC');

    //             $products = $builder->get()->getResult();
    //         }
    //     }

    //     $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
    //     <thead><tr class="hideme"><th colspan="9" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
    //     <tr class="hideme" style="text-align:center; " ><th colspan="9"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
    //     <tr class="hideme" style="text-align:center; " ><th colspan="9">Purchase Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

    //     <tr style="background:#1c76bc;color:#fff;">
    //     <th style="border: 1px solid #1c76bc;"> ' . label("Date") . '</th>
    //     <th style="border: 1px solid #1c76bc;">  ' . label("Dealer") . ' ' . label("Name") . ' </th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bill") . ' ' . label("Number") . ' </th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bill") . ' ' . label("Amount") . '  </th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("tax") . ' </th>

    //     <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Discount") . ' </th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">  ' . label("Amount") . '  </th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Return") . ' ' . label("Amount") . '  </th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Net") . ' ' . label("Amount") . '  </th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Paid") . '  </th>
    //     <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Balanceamt") . ' </th>
    //     </tr></thead><tbody>';

    //     $tt = 1;
    //     $billamt = 0;
    //     $tottax = 0;
    //     $discc = 0;
    //     $toott = 0;
    //     $paidd = 0;
    //     $toott_rrr = 0;
    //     $toott_ssss = 0;
    //     $toott_bbbb = 0;

    //     foreach ($products as $prd) {
    //         print_r($prd);
    //         die();

    //         // $ibb = $this->db->query("SELECT SUM(total) AS rrtty  FROM purchases_return WHERE pur_id='" . $prd->id . "'  GROUP BY pur_id  ")->getRowArray();
    //         // $ibb = $this->db->query("SELECT SUM(total) AS rrtty  FROM purchases_return WHERE pur_id='" . $prd->id . "'  GROUP BY pur_id ")->getRowArray();
    //         $ibb['rrtty'] = 0;

    //         $prdf = $prd->supplier_id;
    //         $pxxx = $prd->cgst;
    //         $pxxxs = $prd->sgst;
    //         $olaaa = $this->db->query("SELECT * from suppliers where id='" . $prdf . "'  ")->getRowArray();

    //         $result .= '<tr  >
    //         <td style="border: 1px solid #1c76bc; ">' . date("d-m-Y", strtotime($prd->purdat))  . '</td>
    //         <td style="border: 1px solid #1c76bc; ">' . $olaaa['name'] . '</td>
    //         <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->id . '</td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->betot, $this->setting->decimals, '.', '') . '</td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->cgst * 2, $this->setting->decimals, '.', '') . '</td>

    //         <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->discamt, $this->setting->decimals, '.', '') . '</td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->total, $this->setting->decimals, '.', '') . '</td> 

    //         <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$ibb['rrtty'], $this->setting->decimals, '.', '') . '</td> 

    //         <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)(intval($prd->total) - $ibb['rrtty']), $this->setting->decimals, '.', '') . '</td>


    //         <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->paiddd, $this->setting->decimals, '.', '') . '</td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)(floatval($prd->total) - floatval($prd->paiddd) - $ibb['rrtty']), $this->setting->decimals, '.', '') . '</td>


    //         </tr>';
    //         $billamt = $billamt + $prd->betot;
    //         $tottax = $tottax + $pxxx;
    //         $tottaxs = $tottax + $pxxxs;
    //         $discc = $discc + $prd->discamt;
    //         $toott = $toott + $prd->total;

    //         $toott_rrr = $toott_rrr + $ibb['rrtty'];
    //         $toott_ssss = $toott_ssss + $prd->total - $ibb['rrtty'];
    //         //$toott = $toott+$prd->total;

    //         //  $toott_bbbb = $toott_bbbb+$toott-$paidd;

    //         $paidd = $paidd + intval($prd->paiddd);




    //         $tt++;
    //     }

    //     $result .= '</tbody>
    //     <tr>
    //         <td style="border: 1px solid #1c76bc;"></td>
    //         <td style="border: 1px solid #1c76bc;"></td>
    //         <td style="border: 1px solid #1c76bc;"></td>
    //         <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$billamt, $this->setting->decimals, '.', '') . '</b></td>
    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$tottax * 2, $this->setting->decimals, '.', '') . '</b></td>

    //        <td style="text-align:right; border: 1px solid #1c76bc;"><b>Rs.' . number_format((float)$discc, $this->setting->decimals, '.', ' ') . '</b></td> 
    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott, $this->setting->decimals, '.', ' ') . '</b></td> 
    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott_rrr, $this->setting->decimals, '.', ' ') . '</b></td>

    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott_ssss, $this->setting->decimals, '.', ' ') . '</b></td> 

    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$paidd, $this->setting->decimals, '.', ' ') . '</b></td> 
    //        <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott_ssss - $paidd, $this->setting->decimals, '.', ' ') . '</b></td> 



    //         </tr></table>';

    //     echo $result;
    // }

    public function getpurchasedailyReport()
    {
        $storeId = $this->session->store;
        if (empty($storeId)) {
            return $this->response->setJSON(['status' => 'error', 'message' => 'Please open store']);
        }

        $storeId = $this->session->store;

        $db = \Config\Database::connect();
        $request = \Config\Services::request();
        // echo '<pre>';
        // print_r($db->table('purchases')->get()->getResult());
        // echo '</pre>';
        // die;

        $start       = $request->getPost('Range');
        $end       = $request->getPost('Range1');
        // $btypess       = $request->getPost('btypess');


        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;


        $poql = $this->db->query("select * from settings where id=1 ")->getRowArray();
        $poss = $db->query("SELECT * FROM stores WHERE id = ?", [$storeId])->getRowArray();
        $logoPath = $poql['logo'] ?? 'default.png';
        $kmmokk = base_url('files/Setting/' . $logoPath);

        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $fvfff = $this->session->store;
        if (empty($fvfff)) {
            echo json_encode(['status' => 'error', 'message' => 'Please open store']);
            return false;
        }
        $btypess = $poql['purchase_type'];
        // $btypess = $request->getPost('btypess');
        // if (isset($_POST['bill_type']) && !empty($_POST['bill_type'])) {
        //     $btypess = $_POST['bill_type'] == 1 ? 0 : 1;
        // }
        $lmm = date("Y-m-d", strtotime($startpp));
        $lmmend = date("Y-m-d", strtotime($endpp));
        //$prduct = Product::find($product_id);
        // $lmm = date("Y-m-d");
        if (($btypess) != 2) {
            $prducts = $this->db->query("SELECT *  FROM `purchases` WHERE ppurchase_type='$btypess' and  store_id='$fvfff' and `date` between '$lmm' AND '$lmmend'  order by `date` asc ")->getResult();
        } else {
            $prducts = $this->db->query("SELECT *  FROM `purchases` WHERE store_id='$fvfff' and `date` between  '$lmm' AND '$lmmend'  order by `date` asc ")->getResult();
        }

        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="9" style="text-align:center; " >' . (isset($poss['companyname']) ? $poss['companyname'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9">Purchase Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

        <tr style="background:#1c76bc;color:#fff;">
        <th style="border: 1px solid #1c76bc;"> ' . label("Date") . '</th>
        <th style="border: 1px solid #1c76bc;">  ' . label("Dealer") . ' ' . label("Name") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bill") . ' ' . label("Number") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bill") . ' ' . label("Amount") . '  </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("tax") . ' </th>
        
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Discount") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">  ' . label("Amount") . '  </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Return") . ' ' . label("Amount") . '  </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Net") . ' ' . label("Amount") . '  </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Paid") . '  </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Balanceamt") . ' </th>
        </tr></thead><tbody>';

        $tt = 1;
        $billamt = 0;
        $tottax = 0;
        $discc = 0;
        $toott = 0;
        $paidd = 0;
        $toott_rrr = 0;
        $toott_ssss = 0;
        $toott_bbbb = 0;

        foreach ($prducts as $prd) {

            // $ibb = mysql_fetch_array(mysql_query("SELECT SUM(total) AS rrtty  FROM purchases_return WHERE pur_id='" . $prd->id . "'  GROUP BY pur_id  "));
            // $ibb = mysql_fetch_array(mysql_query("SELECT SUM(total) AS rrtty  FROM purchases_return WHERE pur_id='" . $prd->id . "'  GROUP BY pur_id "));
            $ibb['rrtty'] = 0;

            $prdf = $prd->supplier_id;
            $pxxx = $prd->cgst;
            $pxxxs = $prd->sgst;
            $olaaa = $this->db->query("SELECT * FROM suppliers WHERE id='" . $prdf . "'")->getRowArray();

            $result .= '<tr  >
            <td style="border: 1px solid #1c76bc; ">' . date("d-m-Y", strtotime($prd->purdat))  . '</td>
            <td style="border: 1px solid #1c76bc;">' . ($olaaa['name'] ?? '') . '</td>

            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->id . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->betot, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->cgst * 2, $this->setting->decimals, '.', '') . '</td>
           
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->discamt, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->total, $this->setting->decimals, '.', '') . '</td> 

            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$ibb['rrtty'], $this->setting->decimals, '.', '') . '</td> 

            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)(intval($prd->total) - $ibb['rrtty']), $this->setting->decimals, '.', '') . '</td>


            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->paiddd, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)(floatval($prd->total) - floatval($prd->paiddd) - $ibb['rrtty']), $this->setting->decimals, '.', '') . '</td>
            

            </tr>';
            $billamt = $billamt + $prd->betot;
            $tottax = $tottax + floatval($pxxx);
            $tottaxs = $tottax + floatval($pxxxs);
            $discc = $discc + $prd->discamt;
            $toott = $toott + $prd->total;

            $toott_rrr = $toott_rrr + $ibb['rrtty'];
            $toott_ssss = $toott_ssss + $prd->total - $ibb['rrtty'];
            //$toott = $toott+$prd->total;

            //  $toott_bbbb = $toott_bbbb+$toott-$paidd;

            $paidd = $paidd + intval($prd->paiddd);
            $tt++;
        }

        $result .= '</tbody>
        <tr>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$billamt, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$tottax * 2, $this->setting->decimals, '.', '') . '</b></td>
          
           <td style="text-align:right; border: 1px solid #1c76bc;"><b>Rs.' . number_format((float)$discc, $this->setting->decimals, '.', ' ') . '</b></td> 
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott, $this->setting->decimals, '.', ' ') . '</b></td> 
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott_rrr, $this->setting->decimals, '.', ' ') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott_ssss, $this->setting->decimals, '.', ' ') . '</b></td> 

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$paidd, $this->setting->decimals, '.', ' ') . '</b></td> 
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott_ssss - $paidd, $this->setting->decimals, '.', ' ') . '</b></td> 
        </tr></table>';

        echo $result;
    }

    public function getpurchasedailyReport_new()
    {
        $storeId = (int) $this->session->get('store');
        if (!$storeId) {
            return $this->response->setJSON([
                'draw' => intval($this->request->getPost('draw')),
                'recordsTotal' => 0,
                'recordsFiltered' => 0,
                'data' => []
            ]);
        }

        $db      = db_connect();
        $request = service('request');

        // DataTables inputs
        $draw   = intval($request->getPost('draw'));
        $start  = intval($request->getPost('start'));
        $length = intval($request->getPost('length'));
        $search = $request->getPost('search')['value'] ?? '';
        $orderCol = $request->getPost('order')[0]['column'] ?? 0;
        $orderDir = $request->getPost('order')[0]['dir'] ?? 'asc';

        // Date filters
        $startIn = trim((string) $request->getPost('Range')  ?? $request->getGet('Range'));
        $endIn   = trim((string) $request->getPost('Range1') ?? $request->getGet('Range1'));
        $dateFrom = $startIn ? date('Y-m-d', strtotime($startIn)) : date('Y-m-d');
        $dateTo   = $endIn   ? date('Y-m-d', strtotime($endIn))   : date('Y-m-d');

        // Column mapping for ordering
        $columns = [
            0 => 'p.date',
            1 => 's.name',
            2 => 'p.invno',
            3 => 'p.betot',
            4 => 'p.cgst',
            5 => 'p.discamt',
            6 => 'p.total',
            7 => 'p.paiddd'
        ];

        $orderBy = $columns[$orderCol] ?? 'p.date';

        // Base query
        $builder = $db->table('purchases p')
            ->select("p.id, p.date, p.invno, p.betot, p.cgst, p.sgst, p.discamt, p.total, p.paiddd, s.name AS supplier_name")
            ->join('suppliers s', 's.id = p.supplier_id', 'left')
            ->where('p.date >=', $dateFrom)
            ->groupBy('date', 'DESC')
            ->where('p.date <=', $dateTo);

        if ($storeId != null) {
            $builder->where('p.store_id', $storeId);
        }

        // Search filter
        if ($search) {
            $builder->groupStart()
                ->like('s.name', $search)
                ->orLike('p.invno', $search)
                ->groupEnd();
        }

        // Count total records
        $recordsTotal = $db->table('purchases')
            ->where('store_id', $storeId)
            ->countAllResults();

        // Count filtered records
        $recordsFiltered = $builder->countAllResults(false);

        // Apply limit and order
        $rows = $builder
            ->orderBy($orderBy, $orderDir)
            ->limit($length, $start)
            ->get()
            ->getResultArray();

        // Format data
        $settings = (array) ($this->setting);
        $decimals = (int) ($settings['decimals'] ?? 2);

        $data = [];
        foreach ($rows as $r) {
            $taxBoth = (float) $r['cgst'] * 2;
            $bal     = (float) $r['total'] - (float) $r['paiddd'];

            $data[] = [
                date('d-m-Y', strtotime($r['date'])),
                esc($r['supplier_name'] ?? ''),
                esc($r['invno']),
                (float)$r['betot'],
                (float)$taxBoth,
                (float)$r['discamt'],
                (float)$r['total'],
                (float)$r['paiddd'],
                (float)$bal,
                '',
                ''
            ];
        }

        // Return JSON response
        return $this->response->setJSON([
            'draw' => $draw,
            'recordsTotal' => $recordsTotal,
            'recordsFiltered' => $recordsFiltered,
            'data' => $data
        ]);
    }


    /**
     * Shared filter extraction + base query builder for the Sales Report
     * (Detailed and Summary modes, plus export). Works with both GET (export
     * links) and POST (DataTables serverSide requests) via getVar().
     */
    private function salesReportFilters(): array
    {
        $request = service('request');

        $rangeIn  = trim((string) $request->getVar('Range'));
        $range1In = trim((string) $request->getVar('Range1'));

        return [
            'dateFrom' => $rangeIn  ? date('Y-m-d', strtotime($rangeIn))  : date('Y-m-d', strtotime('-30 days')),
            'dateTo'   => $range1In ? date('Y-m-d', strtotime($range1In)) : date('Y-m-d'),
            'store'    => trim((string) $request->getVar('store')),
            'customer' => $request->getVar('suppr'),
            'payment'  => trim((string) $request->getVar('selectedValues')),
            'search'   => trim((string) $request->getVar('customSearch')),
            // '', 'sales', 'exchange', 'return', or 'cancel' - see
            // applyTxnTypeFilter().
            'type'     => trim((string) $request->getVar('txnType')),
        ];
    }

    /**
     * Scopes a `sales s`-based (or returnss-joined-to-sales) builder to one
     * transaction type, matching the same Sales/Return/Exchange/Cancel
     * classification used for row highlighting (see attachTaxAndReturns()):
     * a sale is Cancel if status=3, else Return if it has a returnss row
     * with retrn_amt_mtd=1 (refund), else Exchange if it has a returnss row
     * with any other retrn_amt_mtd (swap-for-another-item), else Sales.
     *
     * $defaultExcludesCancelled controls what happens when no type is
     * selected ('' / "All"): Detailed mode wants every row visible
     * (including cancelled, so it can be highlighted) so it passes false;
     * Summary/aggregate totals want cancelled sales excluded from the
     * default "All" view like before, so they pass true.
     */
    private function applyTxnTypeFilter($builder, string $type, bool $defaultExcludesCancelled)
    {
        switch ($type) {
            case 'cancel':
                $builder->where('s.status', 3);
                break;
            case 'sales':
                $builder->where('s.status !=', 3);
                $ids = $this->getReturnedSaleIds();
                if (!empty($ids)) {
                    $builder->whereNotIn('s.id', $ids);
                }
                break;
            case 'return':
                $builder->where('s.status !=', 3)
                    ->where('s.id IN (SELECT re_sales_id FROM returnss WHERE rsale_type = 0 AND retrn_amt_mtd = 1)', null, false);
                break;
            case 'exchange':
                $builder->where('s.status !=', 3)
                    ->where('s.id IN (SELECT re_sales_id FROM returnss WHERE rsale_type = 0 AND retrn_amt_mtd != 1)', null, false);
                break;
            default:
                if ($defaultExcludesCancelled) {
                    $builder->where('s.status !=', 3);
                }
                break;
        }
        return $builder;
    }

    /**
     * All distinct sale ids that have ANY returnss row (return or exchange
     * alike), as a plain int array - memoized per request. Used by the
     * "sales" (= no return/exchange at all) branch of applyTxnTypeFilter()
     * above.
     *
     * This exists because `sales.id` is `int` but `returnss.re_sales_id` is
     * `varchar(300)`: a `WHERE s.id NOT IN (SELECT re_sales_id FROM
     * returnss ...)` subquery hits that type mismatch and MySQL falls back
     * to a dependent (correlated) subquery - ~2 seconds per call, and it
     * was being called 3+ times per request (grid rows, recordsFiltered
     * count, and the totals box), which is what made the Sales filter (and
     * the totals box on every request, regardless of filter) slow.
     * `returnss` itself only has a few hundred rows though, so fetching the
     * (small) distinct id list once and filtering with a literal
     * `whereNotIn()` avoids the subquery entirely and is fast.
     */
    private ?array $returnedSaleIdsCache = null;

    private function getReturnedSaleIds(): array
    {
        if ($this->returnedSaleIdsCache === null) {
            $db = db_connect();
            $this->returnedSaleIdsCache = array_map('intval', array_column(
                $db->table('returnss')->distinct()->select('re_sales_id')->where('rsale_type', 0)->get()->getResultArray(),
                're_sales_id'
            ));
        }
        return $this->returnedSaleIdsCache;
    }

    /**
     * Reads DataTables' standard per-column search values
     * (columns[i][search][value]) from the current POST body, for whichever
     * column indexes are given. Returns [index => trimmed value], omitting
     * blanks.
     */
    private function columnSearchValues(array $indexes): array
    {
        $posted = service('request')->getPost('columns') ?? [];
        $out = [];
        foreach ($indexes as $i) {
            $val = trim((string) ($posted[$i]['search']['value'] ?? ''));
            if ($val !== '') {
                $out[$i] = $val;
            }
        }
        return $out;
    }

    /**
     * Base (unbounded) query for Sales Report - Detailed mode: one row per
     * sale. Deliberately does NOT join tax_summary/returnss here - joining
     * those as aggregated derived tables against the full sales range made
     * even a 25-row page take 4+ seconds (MySQL falls back to a temp
     * table + filesort for the whole matched set before applying LIMIT,
     * even though the derived tables themselves are tiny). Tax/return
     * totals for just the rows actually being displayed are fetched
     * separately by attachTaxAndReturns() below, which is a few
     * milliseconds regardless of how big the overall date range is.
     *
     * $colFilters is per-column search text keyed by the DETAILED_COLUMNS
     * index on the client (see columnSearchValues()). Columns 7 (Tax) and 8
     * (Returns) are intentionally not filterable here - they're attached
     * after pagination for the performance reason above, so filtering on
     * them would require the exact join this method exists to avoid.
     */
    private function buildSalesDetailedQuery(array $f, array $colFilters = [])
    {
        $db = db_connect();

        $builder = $db->table('sales s')
            ->select("s.id, s.created_at, s.clientname, c.name AS cust_name, st.name AS store_name, s.paidmethod, s.subtotal, s.discountamount, s.total, s.paid, s.status")
            ->join('customers c', 'c.id = s.client_id', 'left')
            ->join('registers r', 'r.id = s.register_id', 'left')
            ->join('stores st', 'st.id = r.store_id', 'left')
            ->where('s.created_at >=', $f['dateFrom'])
            ->where('s.created_at <=', $f['dateTo']);

        // Cancelled sales are no longer excluded here - Detailed mode shows
        // every row by default (Sales/Return/Exchange/Cancel alike) and
        // highlights it by type; applyTxnTypeFilter() narrows to exactly
        // one type when the left panel's Transaction Type filter is used.
        $this->applyTxnTypeFilter($builder, $f['type'], false);

        if ($f['store'] !== '') {
            $builder->where('r.store_id', $f['store']);
        }
        if ($f['customer'] !== null && $f['customer'] !== '') {
            $builder->where('s.client_id', $f['customer']);
        }
        if ($f['payment'] !== '') {
            // paidmethod stores a "~"-delimited list of payment_mode ids
            // (e.g. "1~3~"). A plain LIKE '%1%' would also match "21" or
            // "31" - wrap both sides in the delimiter so only a real,
            // whole id matches.
            $builder->where("CONCAT('~', s.paidmethod, '~') LIKE CONCAT('%~', " . (int) $f['payment'] . ", '~%')", null, false);
        }
        if ($f['search'] !== '') {
            $builder->groupStart()
                ->like('c.name', $f['search'])
                ->orLike('s.clientname', $f['search'])
                ->orLike('s.id', $f['search'])
                ->groupEnd();
        }

        $columnFieldMap = [
            0 => 's.id',
            1 => "DATE_FORMAT(s.created_at, '%d-%m-%Y')",
            2 => 'st.name',
            3 => 'COALESCE(c.name, s.clientname)',
            4 => 's.paidmethod',
            5 => 's.subtotal',
            6 => 's.discountamount',
            9 => 's.total',
            10 => 's.paid',
            11 => '(s.total - s.paid)',
        ];
        foreach ($colFilters as $i => $val) {
            if (isset($columnFieldMap[$i])) {
                $builder->like($columnFieldMap[$i], $val);
            }
        }

        return $builder;
    }

    /**
     * Fetches SUM(tax)/SUM(returns) for exactly the given sale IDs and
     * merges them into $rows (keyed by 'id'). Bounded by count($rows), so
     * this stays fast no matter how large the overall filtered date range
     * is - see note on buildSalesDetailedQuery() above.
     *
     * Also splits returnss into return_total (retrn_amt_mtd=1, a refund)
     * vs exchange_total (any other retrn_amt_mtd, a swap-for-another-item)
     * and derives each row's 'row_type' (sales/return/exchange/cancel),
     * used both for the Status column and for highlighting the row on the
     * client - same classification as applyTxnTypeFilter() uses server-side
     * for the left panel's Transaction Type filter.
     */
    private function attachTaxAndReturns(array $rows): array
    {
        if (empty($rows)) {
            return $rows;
        }
        $db = db_connect();
        $ids = array_column($rows, 'id');

        $taxBySale = [];
        foreach ($db->table('tax_summary')->select('salesid, SUM(CAST(taxamount AS DECIMAL(12,2))) AS tax_total')->whereIn('salesid', $ids)->groupBy('salesid')->get()->getResultArray() as $t) {
            $taxBySale[$t['salesid']] = (float) $t['tax_total'];
        }

        $returnBySale = [];
        $exchangeBySale = [];
        foreach (
            $db->table('returnss')
                ->select('re_sales_id, retrn_amt_mtd, SUM(CAST(tootal AS DECIMAL(12,2))) AS ret_total')
                ->where('rsale_type', 0)
                ->whereIn('re_sales_id', $ids)
                ->groupBy('re_sales_id, retrn_amt_mtd')
                ->get()->getResultArray() as $r
        ) {
            if ((int) $r['retrn_amt_mtd'] === 1) {
                $returnBySale[$r['re_sales_id']] = ($returnBySale[$r['re_sales_id']] ?? 0) + (float) $r['ret_total'];
            } else {
                $exchangeBySale[$r['re_sales_id']] = ($exchangeBySale[$r['re_sales_id']] ?? 0) + (float) $r['ret_total'];
            }
        }

        foreach ($rows as &$row) {
            $row['tax_total'] = $taxBySale[$row['id']] ?? 0.0;
            $returnAmt = $returnBySale[$row['id']] ?? 0.0;
            $exchangeAmt = $exchangeBySale[$row['id']] ?? 0.0;
            $row['return_total'] = $returnAmt;
            $row['exchange_total'] = $exchangeAmt;
            // Combined, for the grid's existing "Returns" column.
            $row['ret_total'] = $returnAmt + $exchangeAmt;

            if ((int) ($row['status'] ?? 0) === 3) {
                $row['row_type'] = 'cancel';
            } elseif ($returnAmt > 0) {
                $row['row_type'] = 'return';
            } elseif ($exchangeAmt > 0) {
                $row['row_type'] = 'exchange';
            } else {
                $row['row_type'] = 'sales';
            }
        }

        return $rows;
    }

    /**
     * Base (unbounded) query for Sales Report - Summary mode: totals
     * aggregated per day or per month. Tax/returns are attached afterward
     * by attachPeriodTaxAndReturns() (aggregated directly by their own date
     * columns) for the same reason described on buildSalesDetailedQuery().
     */
    private function buildSalesSummaryQuery(array $f, string $group, array $colFilters = [])
    {
        $db = db_connect();
        $periodExpr = $group === 'monthly' ? "DATE_FORMAT(s.created_at, '%Y-%m')" : "DATE(s.created_at)";

        $builder = $db->table('sales s')
            ->select("$periodExpr AS period, COUNT(*) AS invoice_count, SUM(s.subtotal) AS subtotal, SUM(s.discountamount) AS discount, SUM(s.total) AS net_total, SUM(s.paid) AS paid")
            ->where('s.created_at >=', $f['dateFrom'])
            ->where('s.created_at <=', $f['dateTo']);

        // Unlike Detailed mode, Summary's default ('' / "All") view still
        // excludes cancelled sales from the aggregated totals (as before) -
        // there's no per-row highlighting here to make a mixed-in cancelled
        // amount visible/obvious, so silently including it would just be
        // misleading. Selecting "Cancel" explicitly still works.
        $this->applyTxnTypeFilter($builder, $f['type'], true);

        if ($f['store'] !== '') {
            $builder->where('s.register_id IN (SELECT id FROM registers WHERE store_id = ' . (int) $f['store'] . ')', null, false);
        }
        if ($f['customer'] !== null && $f['customer'] !== '') {
            $builder->where('s.client_id', $f['customer']);
        }
        if ($f['payment'] !== '') {
            // paidmethod stores a "~"-delimited list of payment_mode ids
            // (e.g. "1~3~"). A plain LIKE '%1%' would also match "21" or
            // "31" - wrap both sides in the delimiter so only a real,
            // whole id matches.
            $builder->where("CONCAT('~', s.paidmethod, '~') LIKE CONCAT('%~', " . (int) $f['payment'] . ", '~%')", null, false);
        }

        $builder->groupBy('period');

        // Global search box + per-column filters are both applied via
        // HAVING, since period/invoice_count/subtotal/etc are all
        // computed/aggregated columns once GROUP BY is in play. Tax (index
        // 4) and Returns (index 5) aren't filterable here - see the note on
        // buildSalesDetailedQuery().
        $havingFieldMap = [
            0 => 'period',
            1 => 'invoice_count',
            2 => 'subtotal',
            3 => 'discount',
            6 => 'net_total',
            7 => 'paid',
            8 => '(net_total - paid)',
        ];
        foreach ($colFilters as $i => $val) {
            if (isset($havingFieldMap[$i])) {
                $builder->having($havingFieldMap[$i] . ' LIKE', '%' . $val . '%');
            }
        }

        if (!empty($f['search'])) {
            $builder->having('period LIKE', '%' . $f['search'] . '%');
        }

        return $builder;
    }

    /**
     * Fetches SUM(tax)/SUM(returns) grouped by the same day/month period as
     * the summary rows (using tax_summary.datedd / returnss.todate directly,
     * not a per-sale join) and merges them into $rows (keyed by 'period').
     */
    private function attachPeriodTaxAndReturns(array $rows, string $group, array $f): array
    {
        if (empty($rows)) {
            return $rows;
        }
        $db = db_connect();
        $periodExprTax = $group === 'monthly' ? "DATE_FORMAT(datedd, '%Y-%m')" : "DATE(datedd)";
        $periodExprRet = $group === 'monthly' ? "DATE_FORMAT(todate, '%Y-%m')" : "DATE(todate)";

        $taxByPeriod = [];
        foreach (
            $db->table('tax_summary')
                ->select("$periodExprTax AS period, SUM(CAST(taxamount AS DECIMAL(12,2))) AS tax_total")
                ->where('datedd >=', $f['dateFrom'])->where('datedd <=', $f['dateTo'])
                ->groupBy('period')->get()->getResultArray() as $t
        ) {
            $taxByPeriod[$t['period']] = (float) $t['tax_total'];
        }
        $retByPeriod = [];
        foreach (
            $db->table('returnss')
                ->select("$periodExprRet AS period, SUM(CAST(tootal AS DECIMAL(12,2))) AS ret_total")
                ->where('rsale_type', 0)
                ->where('todate >=', $f['dateFrom'])->where('todate <=', $f['dateTo'])
                ->groupBy('period')->get()->getResultArray() as $r
        ) {
            $retByPeriod[$r['period']] = (float) $r['ret_total'];
        }

        foreach ($rows as &$row) {
            $row['tax_total'] = $taxByPeriod[$row['period']] ?? 0.0;
            $row['ret_total'] = $retByPeriod[$row['period']] ?? 0.0;
        }

        return $rows;
    }

    /**
     * Grand totals (Sub Total / Cancel / Return / Total) across the ENTIRE
     * filtered date range - not just the current page - shown in a summary
     * box above the grid. Three single-row aggregate queries, independent
     * of how many sales match: no per-row loop, no pagination involved.
     *
     * - Sub Total / Total: SUM(subtotal)/SUM(total) for the same
     *   non-cancelled (status != 3) sales the grid itself lists.
     * - Cancel: SUM(total) for sales matching the same filters but WITH
     *   status = 3 - informational (cancelled sales are already excluded
     *   from the grid and from Sub Total/Total, same as before).
     * - Return: SUM(returnss.tootal) joined to that same non-cancelled
     *   filtered sales set.
     */
    private function salesReportTotals(array $f): array
    {
        $db = db_connect();

        $applyCommonFilters = function ($builder) use ($f) {
            $builder->where('s.created_at >=', $f['dateFrom'])->where('s.created_at <=', $f['dateTo']);
            if ($f['store'] !== '') {
                $builder->where('r.store_id', $f['store']);
            }
            if ($f['customer'] !== null && $f['customer'] !== '') {
                $builder->where('s.client_id', $f['customer']);
            }
            if ($f['payment'] !== '') {
                $builder->where("CONCAT('~', s.paidmethod, '~') LIKE CONCAT('%~', " . (int) $f['payment'] . ", '~%')", null, false);
            }
            if (!empty($f['search'])) {
                $builder->groupStart()
                    ->like('c.name', $f['search'])
                    ->orLike('s.clientname', $f['search'])
                    ->orWhere('s.id', $f['search'])
                    ->groupEnd();
            }
            return $builder;
        };

        // Every sub-metric below is ALSO scoped by applyTxnTypeFilter() with
        // the current $f['type'] - so if the left panel's Transaction Type
        // filter is set to (say) "Return", Sales/Exchange/Cancel all
        // naturally come back 0 (their own type condition contradicts
        // "type=return") and only Return is non-zero. With type='' ("All"),
        // each sub-metric keeps its own always-applicable definition below.
        $baseRow = $applyCommonFilters(
            $this->applyTxnTypeFilter(
                $db->table('sales s')
                    ->select('COALESCE(SUM(s.subtotal),0) AS subtotal, COALESCE(SUM(s.total),0) AS total')
                    ->join('customers c', 'c.id = s.client_id', 'left')
                    ->join('registers r', 'r.id = s.register_id', 'left')
                    ->where('s.status !=', 3),
                $f['type'],
                false
            )
        )->get()->getRowArray();

        $cancelRow = $applyCommonFilters(
            $this->applyTxnTypeFilter(
                $db->table('sales s')
                    ->select('COALESCE(SUM(s.total),0) AS cancel_total')
                    ->join('customers c', 'c.id = s.client_id', 'left')
                    ->join('registers r', 'r.id = s.register_id', 'left')
                    ->where('s.status', 3),
                $f['type'],
                false
            )
        )->get()->getRowArray();

        // Sales = non-cancelled sales with no return/exchange at all.
        // whereNotIn() with the pre-fetched id list, not a NOT IN subquery -
        // see getReturnedSaleIds() for why.
        $salesBuilder = $db->table('sales s')
            ->select('COALESCE(SUM(s.total),0) AS sales_total')
            ->join('customers c', 'c.id = s.client_id', 'left')
            ->join('registers r', 'r.id = s.register_id', 'left')
            ->where('s.status !=', 3);
        $returnedIds = $this->getReturnedSaleIds();
        if (!empty($returnedIds)) {
            $salesBuilder->whereNotIn('s.id', $returnedIds);
        }
        $salesRow = $applyCommonFilters(
            $this->applyTxnTypeFilter($salesBuilder, $f['type'], false)
        )->get()->getRowArray();

        // Return = refunds only (retrn_amt_mtd = 1).
        $returnRow = $applyCommonFilters(
            $this->applyTxnTypeFilter(
                $db->table('returnss rt')
                    ->select('COALESCE(SUM(rt.tootal),0) AS return_total')
                    ->join('sales s', 's.id = rt.re_sales_id')
                    ->join('customers c', 'c.id = s.client_id', 'left')
                    ->join('registers r', 'r.id = s.register_id', 'left')
                    ->where('rt.rsale_type', 0)
                    ->where('rt.retrn_amt_mtd', 1)
                    ->where('s.status !=', 3),
                $f['type'],
                false
            )
        )->get()->getRowArray();

        // Exchange = everything else in returnss (swap for another item,
        // not a cash refund).
        $exchangeRow = $applyCommonFilters(
            $this->applyTxnTypeFilter(
                $db->table('returnss rt')
                    ->select('COALESCE(SUM(rt.tootal),0) AS exchange_total')
                    ->join('sales s', 's.id = rt.re_sales_id')
                    ->join('customers c', 'c.id = s.client_id', 'left')
                    ->join('registers r', 'r.id = s.register_id', 'left')
                    ->where('rt.rsale_type', 0)
                    ->where('rt.retrn_amt_mtd !=', 1)
                    ->where('s.status !=', 3),
                $f['type'],
                false
            )
        )->get()->getRowArray();

        return [
            'subtotal' => (float) $baseRow['subtotal'],
            'sales'    => (float) $salesRow['sales_total'],
            'exchange' => (float) $exchangeRow['exchange_total'],
            'return'   => (float) $returnRow['return_total'],
            'cancel'   => (float) $cancelRow['cancel_total'],
            'total'    => (float) $baseRow['total'],
        ];
    }

    public function getSalesReportDetailed()
    {
        $request = service('request');
        $draw   = intval($request->getPost('draw'));
        $start  = intval($request->getPost('start'));
        $length = intval($request->getPost('length'));
        $orderCol = $request->getPost('order')[0]['column'] ?? 1;
        $orderDir = $request->getPost('order')[0]['dir'] ?? 'desc';

        // Columns 7 (Tax) and 8 (Returns) aren't part of the base query
        // (see buildSalesDetailedQuery() note) so they're not sortable;
        // fall back to date ordering if requested.
        $columns = [
            0 => 's.id', 1 => 's.created_at', 2 => 'st.name', 3 => 'c.name',
            4 => 's.paidmethod', 5 => 's.subtotal', 6 => 's.discountamount',
            9 => 's.total', 10 => 's.paid',
        ];
        $orderBy = $columns[$orderCol] ?? 's.created_at';

        $f = $this->salesReportFilters();
        $f['search'] = trim((string) ($request->getPost('search')['value'] ?? ''));
        $colFilters = $this->columnSearchValues([0, 1, 2, 3, 4, 5, 6, 9, 10, 11]);

        $recordsTotal = $this->buildSalesDetailedQuery(array_merge($f, ['search' => '']))->countAllResults(false);

        $builder = $this->buildSalesDetailedQuery($f, $colFilters);
        $recordsFiltered = $builder->countAllResults(false);

        $rows = $this->buildSalesDetailedQuery($f, $colFilters)
            ->orderBy($orderBy, $orderDir)
            ->limit($length, $start)
            ->get()
            ->getResultArray();
        $rows = $this->attachTaxAndReturns($rows);

        $decimals = (int) ($this->setting->decimals ?? 2);
        $data = [];
        foreach ($rows as $r) {
            $balance = (float) $r['total'] - (float) $r['paid'];
            $data[] = [
                esc($r['id']),
                date('d-m-Y', strtotime($r['created_at'])),
                esc($r['store_name'] ?? ''),
                esc($r['cust_name'] ?: $r['clientname']),
                esc($r['paidmethod']),
                (float) $r['subtotal'],
                (float) $r['discountamount'],
                (float) $r['tax_total'],
                (float) $r['ret_total'],
                (float) $r['total'],
                (float) $r['paid'],
                round($balance, $decimals),
                $r['row_type'],
            ];
        }

        return $this->response->setJSON([
            'draw' => $draw,
            'recordsTotal' => $recordsTotal,
            'recordsFiltered' => $recordsFiltered,
            'data' => $data,
            'totals' => $this->salesReportTotals($f),
        ]);
    }

    public function getSalesReportSummary()
    {
        $request = service('request');
        $draw   = intval($request->getPost('draw'));
        $start  = intval($request->getPost('start'));
        $length = intval($request->getPost('length'));
        $group  = $request->getPost('group') === 'monthly' ? 'monthly' : 'daily';

        $f = $this->salesReportFilters();
        $f['search'] = trim((string) ($request->getPost('search')['value'] ?? ''));
        $colFilters = $this->columnSearchValues([0, 1, 2, 3, 6, 7, 8]);

        $recordsTotal = $this->buildSalesSummaryQuery(array_merge($f, ['search' => '']), $group)->countAllResults(false);
        $recordsFiltered = $this->buildSalesSummaryQuery($f, $group, $colFilters)->countAllResults(false);

        $rows = $this->buildSalesSummaryQuery($f, $group, $colFilters)
            ->orderBy('period', 'desc')
            ->limit($length, $start)
            ->get()
            ->getResultArray();
        $rows = $this->attachPeriodTaxAndReturns($rows, $group, $f);

        $data = [];
        foreach ($rows as $r) {
            $net = (float) $r['net_total'];
            $paid = (float) $r['paid'];
            $data[] = [
                esc($r['period']),
                (int) $r['invoice_count'],
                (float) $r['subtotal'],
                (float) $r['discount'],
                (float) $r['tax_total'],
                (float) $r['ret_total'],
                $net,
                $paid,
                round($net - $paid, (int) ($this->setting->decimals ?? 2)),
            ];
        }

        return $this->response->setJSON([
            'draw' => $draw,
            'recordsTotal' => $recordsTotal,
            'recordsFiltered' => $recordsFiltered,
            'data' => $data,
            'totals' => $this->salesReportTotals($f),
        ]);
    }

    /**
     * Streamed export (CSV or Excel-compatible HTML) for the Sales Report,
     * re-running the same filtered query as the grid but without pagination.
     * Rows are fetched in bounded batches so memory stays flat regardless of
     * how many rows match (this report can span 17,000+ sales).
     */
    public function exportSalesReport()
    {
        $request = service('request');
        $format = $request->getVar('format') === 'xlsx' ? 'xlsx' : 'csv';
        $mode   = $request->getVar('mode') === 'summary' ? 'summary' : 'detailed';
        $group  = $request->getVar('group') === 'monthly' ? 'monthly' : 'daily';
        $f = $this->salesReportFilters();
        $decimals = (int) ($this->setting->decimals ?? 2);

        if ($mode === 'detailed') {
            $headers = ['Bill No', 'Date', 'Store', 'Customer', 'Payment Mode', 'Subtotal', 'Discount', 'Tax', 'Returns', 'Net Total', 'Paid', 'Balance', 'Status'];
            $rowMapper = function (array $r) use ($decimals) {
                return [
                    $r['id'],
                    date('d-m-Y', strtotime($r['created_at'])),
                    $r['store_name'] ?? '',
                    $r['cust_name'] ?: $r['clientname'],
                    $r['paidmethod'],
                    number_format((float) $r['subtotal'], $decimals, '.', ''),
                    number_format((float) $r['discountamount'], $decimals, '.', ''),
                    number_format((float) $r['tax_total'], $decimals, '.', ''),
                    number_format((float) $r['ret_total'], $decimals, '.', ''),
                    number_format((float) $r['total'], $decimals, '.', ''),
                    number_format((float) $r['paid'], $decimals, '.', ''),
                    number_format((float) $r['total'] - (float) $r['paid'], $decimals, '.', ''),
                    ucfirst($r['row_type'] ?? 'sales'),
                ];
            };
            $baseBuilderFn = fn() => $this->buildSalesDetailedQuery($f)->orderBy('s.created_at', 'asc');
            $fetchBatch = fn(int $batch, int $offset) => $this->attachTaxAndReturns($baseBuilderFn()->limit($batch, $offset)->get()->getResultArray());
        } else {
            $headers = ['Period', 'Invoices', 'Subtotal', 'Discount', 'Tax', 'Returns', 'Net Total', 'Paid', 'Balance'];
            $rowMapper = function (array $r) use ($decimals) {
                $net = (float) $r['net_total'];
                $paid = (float) $r['paid'];
                return [
                    $r['period'],
                    (int) $r['invoice_count'],
                    number_format((float) $r['subtotal'], $decimals, '.', ''),
                    number_format((float) $r['discount'], $decimals, '.', ''),
                    number_format((float) $r['tax_total'], $decimals, '.', ''),
                    number_format((float) $r['ret_total'], $decimals, '.', ''),
                    number_format($net, $decimals, '.', ''),
                    number_format($paid, $decimals, '.', ''),
                    number_format($net - $paid, $decimals, '.', ''),
                ];
            };
            $baseBuilderFn = fn() => $this->buildSalesSummaryQuery($f, $group)->orderBy('period', 'asc');
            $fetchBatch = fn(int $batch, int $offset) => $this->attachPeriodTaxAndReturns($baseBuilderFn()->limit($batch, $offset)->get()->getResultArray(), $group, $f);
        }

        $filename = 'Sales-Report-' . $mode . '-' . $f['dateFrom'] . '_to_' . $f['dateTo'];
        set_time_limit(0);

        if ($format === 'csv') {
            $this->response->setHeader('Content-Type', 'text/csv');
            $this->response->setHeader('Content-Disposition', 'attachment; filename="' . $filename . '.csv"');
            $this->response->sendHeaders();

            $out = fopen('php://output', 'w');
            fputcsv($out, $headers);

            $batch = 500;
            $offset = 0;
            while (true) {
                $rows = $fetchBatch($batch, $offset);
                if (empty($rows)) {
                    break;
                }
                foreach ($rows as $r) {
                    fputcsv($out, $rowMapper($r));
                }
                $offset += $batch;
                if (count($rows) < $batch) {
                    break;
                }
            }
            fclose($out);
            exit;
        }

        // Excel: HTML table with the vnd.ms-excel content type, same
        // technique already used for other reports' Excel export in this
        // codebase - Excel opens it correctly as a worksheet.
        header('Content-Type: application/vnd.ms-excel');
        header('Content-Disposition: attachment; filename="' . $filename . '.xls"');

        $storeModel = model('StoreModel');
        $currentStore = $storeModel->find(session('store')) ?? $storeModel->first();
        if ($currentStore) {
            $addressParts = array_filter([
                trim(strip_tags($currentStore->adresse ?? '')),
                trim($currentStore->city ?? ''),
                trim($currentStore->phone ?? ''),
            ]);
            $colspan = count($headers);
            echo '<table border="0"><tr><td colspan="' . $colspan . '" style="text-align:center;font-weight:bold;">' . esc($currentStore->name) . '</td></tr>';
            if (!empty($addressParts)) {
                echo '<tr><td colspan="' . $colspan . '" style="text-align:center;">' . esc(implode(', ', $addressParts)) . '</td></tr>';
            }
            echo '<tr><td colspan="' . $colspan . '" style="text-align:center;">Sales Report (' . esc(ucfirst($mode)) . ') from ' . esc($f['dateFrom']) . ' to ' . esc($f['dateTo']) . '</td></tr>';
            echo '<tr><td colspan="' . $colspan . '">&nbsp;</td></tr></table>';
        }

        echo '<table border="1"><thead><tr>';
        foreach ($headers as $h) {
            echo '<th>' . esc($h) . '</th>';
        }
        echo '</tr></thead><tbody>';

        $batch = 500;
        $offset = 0;
        while (true) {
            $rows = $fetchBatch($batch, $offset);
            if (empty($rows)) {
                break;
            }
            foreach ($rows as $r) {
                echo '<tr>';
                foreach ($rowMapper($r) as $cell) {
                    echo '<td>' . esc((string) $cell) . '</td>';
                }
                echo '</tr>';
            }
            $offset += $batch;
            if (count($rows) < $batch) {
                break;
            }
        }
        echo '</tbody></table>';
        exit;
    }




    public function getpurchasedailyReportServerSide()
    {
        echo json_encode($this->getpurchasedailyReport_new());
        die;
        $storeId = $this->session->store;
        if (empty($storeId)) {
            return $this->response->setJSON(['status' => 'error', 'message' => 'Please open store']);
        }

        $db      = \Config\Database::connect();
        $request = \Config\Services::request();

        // Inputs
        $startParam = $request->getPost('Range');   // e.g., 2025-08-01
        $endParam   = $request->getPost('Range1');  // e.g., 2025-08-31

        // Keep your same conversions (d-m-Y -> Y-m-d round trip)
        $startpp = date("d-m-Y", strtotime($startParam));
        $endpp   = date("d-m-Y", strtotime($endParam));
        $lmm     = date("Y-m-d", strtotime($startpp));
        $lmmend  = date("Y-m-d", strtotime($endpp));

        // Settings & store (same as your code)
        $poql       = $this->db->query("SELECT * FROM settings WHERE id=1")->getRowArray();
        $poss       = $db->query("SELECT * FROM stores WHERE id = ?", [$storeId])->getRowArray();
        $btypess    = (int)($poql['purchase_type'] ?? 2);   // 2 = all
        $decimals   = (int)($this->setting->decimals ?? ($poql['decimals'] ?? 2));

        // DataTables params
        $draw        = (int)($request->getPost('draw') ?? 0);
        $startRow    = (int)($request->getPost('start') ?? 0);
        $length      = (int)($request->getPost('length') ?? 10);
        $searchValue = trim($request->getPost('search')['value'] ?? '');
        $order       = $request->getPost('order') ?? [];
        $dtColumns   = $request->getPost('columns') ?? [];

        // Column map for ordering/search (keep EXACT columns)
        // 0 Date(purdat) 1 Dealer(s.name) 2 Bill#(p.id) 3 BillAmt(betot) 4 Tax(cgst*2)
        // 5 Discount(discamt) 6 Amount(total) 7 Return(0) 8 Net(total - 0) 9 Paid(paiddd) 10 Balance(total - paiddd - 0)
        $colMap = [
            0  => 'p.date',
            1  => 's.name',
            2  => 'p.id',
            3  => 'p.betot',
            4  => 'p.cgst',      // display *2
            5  => 'p.discamt',
            6  => 'p.total',
            7  => null,          // constant 0
            8  => '(p.total)',   // total - 0
            9  => 'p.paiddd',
            10 => '(p.total - p.paiddd)',
        ];

        // Base builder (same filters you had: store, date range, purchase_type)
        $base = $db->table('purchases p')
            ->join('suppliers s', 's.id = p.supplier_id', 'left')
            ->where('p.store_id', $storeId)
            ->where('p.date >=', $lmm)
            ->where('p.date <=', $lmmend);

        if ($btypess !== 2) {
            $base->where('p.ppurchase_type', $btypess);
        }

        // Global search (keep it simple and single-table fields)
        $builder = clone $base;
        if ($searchValue !== '') {
            $builder->groupStart()
                ->like('p.date', $searchValue)
                ->orLike('s.name', $searchValue)
                ->orLike('p.id', $searchValue)
                ->orLike('p.betot', $searchValue)
                ->orLike('p.cgst', $searchValue)
                ->orLike('p.discamt', $searchValue)
                ->orLike('p.total', $searchValue)
                ->orLike('p.paiddd', $searchValue)
                ->groupEnd();
        }

        // Optional per-column search (supports contains or from|to); safe to ignore if you don’t need it.
        $applyRangeOrLike = function ($builder, $field, $raw, $isDate = false) {
            $val = trim((string)$raw);
            if ($val === '' || !$field) return;

            if ($isDate) {
                if (strpos($val, '|') !== false) {
                    [$from, $to] = array_map('trim', explode('|', $val, 2));
                    if ($from !== '') $builder->where('p.date >=', $from);
                    if ($to   !== '') $builder->where('p.date <=', $to);
                } else {
                    $builder->like('p.date', $val);
                }
                return;
            }
            if (strpos($val, '|') !== false) {
                [$from, $to] = array_map('trim', explode('|', $val, 2));
                if ($from !== '') $builder->where("$field >=", $from);
                if ($to   !== '') $builder->where("$field <=", $to);
            } else {
                $builder->like($field, $val);
            }
        };

        foreach ($dtColumns as $idx => $info) {
            $idx = (int)$idx;
            $val = trim($info['search']['value'] ?? '');
            if ($val === '' || !array_key_exists($idx, $colMap)) continue;

            if ($idx === 0) {
                $applyRangeOrLike($builder, 'p.date', $val, true);
            } elseif ($idx === 7) {
                // Return is constant 0; no-op
                continue;
            } elseif ($idx === 8) {
                // Net = total - 0 => total
                $applyRangeOrLike($builder, 'p.total', $val, false);
            } elseif ($idx === 10) {
                // Balance = total - paiddd
                if (strpos($val, '|') !== false) {
                    [$from, $to] = array_map('trim', explode('|', $val, 2));
                    if ($from !== '') $builder->where('(p.total - p.paiddd) >=', $from);
                    if ($to   !== '') $builder->where('(p.total - p.paiddd) <=', $to);
                } else {
                    $builder->like('(p.total - p.paiddd)', $val);
                }
            } else {
                $applyRangeOrLike($builder, $colMap[$idx], $val, false);
            }
        }

        // Ordering (default matches your old "order by date asc")
        $orderBy = 'p.date ASC';
        if (!empty($order[0])) {
            $colIdx = (int)$order[0]['column'];
            $dir    = strtolower($order[0]['dir']) === 'desc' ? 'DESC' : 'ASC';
            if (isset($colMap[$colIdx]) && $colMap[$colIdx]) {
                $orderBy = $colMap[$colIdx] . ' ' . $dir;
            } elseif ($colIdx === 8) {
                $orderBy = '(p.total) ' . $dir;
            } elseif ($colIdx === 10) {
                $orderBy = '(p.total - p.paiddd) ' . $dir;
            }
        }

        // Counts
        $recordsTotal = (clone $base)->select('COUNT(*) AS cnt', false)->get()->getRow('cnt');
        $recordsFiltered = (clone $builder)->select('COUNT(*) AS cnt', false)->get()->getRow('cnt');

        // Page data (same columns you output in HTML)
        $rows = (clone $builder)
            ->select("
                        p.id,
                        p.date,
                        p.betot,
                        p.cgst,
                        p.discamt,
                        p.total,
                        p.paiddd,
                        s.name AS dealer_name
                    ")
            ->orderBy($orderBy)
            ->limit($length, $startRow)
            ->get()
            ->getResultArray();

        // Build data + page totals (your same math; returns = 0)
        $data = [];
        $billamt = $tottax = $discc = $toott = $paidd = 0.0;
        $toott_rrr = 0.0; // return total (0)
        $toott_ssss = 0.0; // net = total - return(0)

        foreach ($rows as $r) {
            $dateStr = date("d-m-Y", strtotime($r['purdat']));
            $dealer  = $r['dealer_name'] ?? '';
            $billNo  = (string)$r['id'];

            $bill    = (float)$r['betot'];
            $tax     = (float)$r['cgst'] * 2;  // your display rule
            $disc    = (float)$r['discamt'];
            $amt     = (float)$r['total'];
            $retAmt  = 0.0;                    // exact same as your code now
            $net     = $amt - $retAmt;
            $paid    = (float)$r['paiddd'];
            $bal     = $amt - $paid - $retAmt;

            // Totals
            $billamt   += $bill;
            $tottax    += (float)$r['cgst'];
            $discc     += $disc;
            $toott     += $amt;
            $toott_rrr += $retAmt;
            $toott_ssss += $net;
            $paidd     += $paid;

            // Row (exact same order as your HTML table)
            $data[] = [
                $dateStr,
                $dealer,
                $billNo,
                number_format($bill, $decimals, '.', ''),
                number_format($tax,  $decimals, '.', ''),     // cgst*2
                number_format($disc, $decimals, '.', ''),
                number_format($amt,  $decimals, '.', ''),
                number_format($retAmt, $decimals, '.', ''),   // 0
                number_format($net,  $decimals, '.', ''),
                number_format($paid, $decimals, '.', ''),
                number_format($bal,  $decimals, '.', ''),
            ];
        }

        // Grand totals over FILTERED set (no extra tables; keep your exact math)
        $totals = (clone $builder)
            ->select("
            SUM(p.betot)                AS s_bill,
            SUM(p.cgst)                 AS s_cgst,      -- multiply by 2 for display
            SUM(p.discamt)              AS s_disc,
            SUM(p.total)                AS s_amt,
            SUM(p.paiddd)               AS s_paid
        ", false)
            ->get()
            ->getRowArray() ?? [];

        $grand_bill = (float)($totals['s_bill'] ?? 0);
        $grand_tax  = ((float)($totals['s_cgst'] ?? 0)) * 2; // display rule
        $grand_disc = (float)($totals['s_disc'] ?? 0);
        $grand_amt  = (float)($totals['s_amt'] ?? 0);
        $grand_ret  = 0.0;                     // no return table
        $grand_net  = $grand_amt - $grand_ret; // total - 0
        $grand_paid = (float)($totals['s_paid'] ?? 0);
        $grand_bal  = $grand_amt - $grand_paid - $grand_ret;

        return $this->response->setJSON([
            'draw'            => $draw,
            'recordsTotal'    => (int)$recordsTotal,
            'recordsFiltered' => (int)$recordsFiltered,
            'data'            => $data,

            // Page totals (you can show these in a footer if you want)
            'pageTotals' => [
                'bill' => number_format($billamt,         $decimals, '.', ''),
                'tax'  => number_format($tottax * 2,      $decimals, '.', ''), // cgst*2
                'disc' => number_format($discc,           $decimals, '.', ''),
                'amt'  => number_format($toott,           $decimals, '.', ''),
                'ret'  => number_format($toott_rrr,       $decimals, '.', ''), // 0
                'net'  => number_format($toott_ssss,      $decimals, '.', ''),
                'paid' => number_format($paidd,           $decimals, '.', ''),
                'bal'  => number_format($toott_ssss - $paidd, $decimals, '.', ''),
            ],

            // Grand totals (entire filtered set)
            'totals' => [
                'bill' => number_format($grand_bill, $decimals, '.', ''),
                'tax'  => number_format($grand_tax,  $decimals, '.', ''),
                'disc' => number_format($grand_disc, $decimals, '.', ''),
                'amt'  => number_format($grand_amt,  $decimals, '.', ''),
                'ret'  => number_format($grand_ret,  $decimals, '.', ''),
                'net'  => number_format($grand_net,  $decimals, '.', ''),
                'paid' => number_format($grand_paid, $decimals, '.', ''),
                'bal'  => number_format($grand_bal,  $decimals, '.', ''),
            ],
        ]);
    }




    public function getPurchaseSummaryReport()
    {
        $request = $this->request;

        $start = $request->getPost('Range');
        $end = $request->getPost('Range1');

        $storeId = session()->get('store');
        $settings = $this->db->query("SELECT * FROM settings WHERE id = 1")->getRowArray();
        $store = $this->db->query("SELECT * FROM stores WHERE id = ?", [$storeId])->getRowArray();

        $startDateFormatted = date("d-m-Y", strtotime($start));
        $endDateFormatted = date("d-m-Y", strtotime($end));

        $startDate = date("Y-m-d", strtotime($start));
        $endDate = date("Y-m-d", strtotime($end));

        $query = "
        SELECT COUNT(id) AS bills,
               SUM(betot) AS billamt,
               SUM(paiddd) AS baalll,
               SUM(cgst) AS cgg,
               SUM(sgst) AS sgg,
               SUM(discamt) AS dikct,
               SUM(total) AS netamtt,
               DATE_FORMAT(purdat, '%Y-%m-%d') AS DAY
        FROM purchases
        WHERE store_id = ? AND purdat BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(purdat, '%Y-%m-%d')
    ";

        $purchaseSummaries = $this->db->query($query, [$storeId, $startDate, $endDate])->getResult();

        $data = [
            'settings' => $settings,
            'store' => $store,
            'start' => $startDateFormatted,
            'end' => $endDateFormatted,
            'summaries' => $purchaseSummaries,
            'decimal' => $settings['decimals'],
        ];

        return view('reports/purchase_summary_report', $data);
    }




    public function getPurchasedailyReportProduct()
    {
        $start = $this->request->getPost('Range');
        $end   = $this->request->getPost('Range1');

        $storeId = session()->get('store');
        $setting = $this->db->table('settings')->where('id', 1)->get()->getRowArray();
        $store   = $this->db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $startDate = ($start != 0 && $start != '') ? date("Y-m-d", strtotime($start)) : date("Y-m-d");
        $endDate   = ($end != 0 && $end != '') ? date("Y-m-d", strtotime($end)) : $startDate;

        $products = $this->db->query("
        SELECT * FROM purchase_items 
        WHERE store_idd = '$storeId' 
        AND ndate BETWEEN '$startDate' AND '$endDate' 
        ORDER BY ndate DESC
    ")->getResult();

        $data = [
            'setting'      => $setting,
            'store'        => $store,
            'start_display' => date("d-m-Y", strtotime($startDate)),
            'end_display'  => date("d-m-Y", strtotime($endDate)),
            'products'     => $products,
        ];

        return view('reports/purchase_daily_product_report', $data);
    }



    public function getpurchasetally()
    {
        $start = $this->request->getPost('Range');
        $end = $this->request->getPost('Range1');

        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $settings = $this->db->query("SELECT * FROM settings WHERE id=1")->getRowArray();
        $store = $this->db->query("SELECT * FROM stores WHERE id='" . session()->get('store') . "'")->getRowArray();

        if ($start == 0 || empty($start)) {
            $date = date("Y-m-d");
            $items = $this->db->query("SELECT * FROM purchase_items WHERE ndate BETWEEN '$date' AND '$date' ORDER BY ndate DESC")->getResult();
        } else {
            [$d, $m, $y] = explode('-', $start);
            $startFormatted = "$y-$m-$d";
            [$d, $m, $y] = explode('-', $end);
            $endFormatted = "$y-$m-$d";
            $items = $this->db->query("SELECT * FROM purchase_items WHERE ndate BETWEEN '$startFormatted' AND '$endFormatted' ORDER BY ndate DESC")->getResult();
        }

        return view('reports/purchase_tally_report_table', [
            'items' => $items,
            'settings' => $settings,
            'store' => $store,
            'start' => $startpp,
            'end' => $endpp,
        ]);
    }


    public function getpurchasetallybb()
    {
        $start = $this->request->getPost('Range');
        $end = $this->request->getPost('Range1');

        $zstartpp = date("Y-m-d", strtotime($start));
        $zendpp = date("Y-m-d", strtotime($end));

        $builder = db_connect();
        $y1 = $builder->query("SELECT * FROM tallypurchase WHERE fromdatt <= '$zstartpp' AND enddatt >= '$zstartpp'")->getNumRows();
        $y2 = $builder->query("SELECT * FROM tallypurchase WHERE fromdatt <= '$zendpp' AND enddatt >= '$zendpp'")->getNumRows();
        $y3 = $builder->query("SELECT * FROM tallypurchase WHERE fromdatt >= '$zstartpp' AND enddatt <= '$zendpp'")->getNumRows();

        if ($y1 == 0 && $y2 == 0 && $y3 == 0) {
            $data['rrt'] = 1;
            $data['start'] = $start;
            $data['end'] = $end;

            $la32 = date("Y-m-d", strtotime($start));
            $laxg = date("Y-m-d", strtotime($end));

            $data['purchase_items'] = $builder->query("SELECT * FROM purchase_items WHERE ndate BETWEEN '$la32' AND '$laxg' ORDER BY ndate DESC")->getResult();

            $data['settings'] = $builder->query("SELECT * FROM settings WHERE id = 1")->getRowArray();
            $data['store'] = $builder->query("SELECT * FROM stores WHERE id = '" . session()->get('store') . "'")->getRowArray();

            return view('reports/purchase_tally_bb', $data);
        } else {
            echo '<input type="hidden" name="rrt" id="rrt" value="0" /> This Date range data already updated into tally, please refer log file for download... ';
        }
    }



    // In app/Controllers/Reports.php or similar
    public function purdownloadxl($xmml)
    {
        $db = \Config\Database::connect();
        $builder = $db->table('tallypurchase');
        $tally = $builder->where('sii', $xmml)->get()->getRowArray();

        if ($tally) {
            $start = $tally['fromdatt'];
            $end = $tally['enddatt'];
            $tyyy = $tally['companyname'];

            $zstartpp = date("Y-m-d", strtotime($start));
            $zendpp = date("Y-m-d", strtotime($end));
            $startpp = date("d-m-Y", strtotime($start));
            $endpp = date("d-m-Y", strtotime($end));

            $setting = $db->table('settings')->where('id', 1)->get()->getRowArray();
            $storeId = session('store');
            $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

            $logoPath = base_url('files/Setting/' . $setting['logo']);

            $products = $db->table('purchase_items')
                ->where("ndate >=", $zstartpp)
                ->where("ndate <=", $zendpp)
                ->orderBy('ndate', 'DESC')
                ->get()
                ->getResult();

            $data = [
                'products' => $products,
                'start' => $start,
                'end' => $end,
                'setting' => $setting,
                'store' => $store,
                'logo' => $logoPath,
                'zstartpp' => $zstartpp,
                'zendpp' => $zendpp,
            ];

            $html = view('reports/purchase_excel_export', $data);
            $filename = $start . 'to' . $end . '.xls';

            header('Content-Type: application/vnd.ms-excel');
            header("Content-Disposition: attachment; filename=\"$filename\"");
            echo $html;
            exit;
        } else {
            return 'Data not found...';
        }
    }



    public function getRegisterReport()
    {
        $store_id = $this->request->getPost('store_id');
        $start = date("Y-m-d", strtotime($this->request->getPost('start'))) . ' 00:00:00';
        $end = date("Y-m-d", strtotime($this->request->getPost('end'))) . ' 23:59:59';

        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $db = \Config\Database::connect();
        $session = session();
        $user = $session->get('user');

        $registers = $db->table('registers')
            ->where('date >=', $start)
            ->where('date <=', $end);

        if ($store_id != 0) {
            $registers->where('store_id', $store_id);
        }

        $registerData = $registers->orderBy('date', 'ASC')->get()->getResult();

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $storeInfo = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();
        $paymentModes = $db->table('payment_mode')->orderBy('id', 'ASC')->get()->getResultArray();

        $reportData = [];

        foreach ($registerData as $reg) {
            $store = $db->table('stores')->where('id', $reg->store_id)->get()->getRowArray();
            $username = $db->table('users')->where('id', $reg->user_id)->get()->getRow('username');

            $row = [
                'opening_time' => $reg->date,
                'closing_time' => $reg->closed_at,
                'store_name' => $store['name'] ?? '',
                'opened_by' => $username ?? '',
                'cash_in_hand' => $reg->cash_inhand,
                'payments' => [],
                'return' => 0,
                'expense' => 0
            ];

            foreach ($paymentModes as $mode) {
                $payment = $db->table('registers_paymentmode')
                    ->where(['reg_idd' => $reg->id, 'pay_m_id' => $mode['id']])
                    ->get()->getRowArray();

                $amount = $payment['countedcash'] ?? 0;
                $row['payments'][$mode['name']] = $amount;
            }

            $row['return'] = $db->table('registers_ret_tot')
                ->where(['reg_idd' => $reg->id, 'pay_m_id' => 1])
                ->get()->getRow('countedcash') ?? 0;

            $row['expense'] = $db->table('registers_ret_tot')
                ->where(['reg_idd' => $reg->id, 'pay_m_id' => 3])
                ->get()->getRow('countedcash') ?? 0;

            $reportData[] = $row;
        }

        return view('reports/register_report_table', [
            'company' => $settings['companyname'],
            'address' => $storeInfo['adresse'] ?? '',
            'start' => $startpp,
            'end' => $endpp,
            'data' => $reportData,
            'paymentModes' => $paymentModes
        ]);
    }


    public function getRegisterReportstore()
    {
        $db = \Config\Database::connect();
        $session = session();

        $store_id = $this->request->getPost('store_id');
        $start = $this->request->getPost('start');
        $endd = $this->request->getPost('endd');
        $stx = $this->request->getPost('ckkk');

        $start = date("Y-m-d", strtotime($start));
        $endd = date("Y-m-d", strtotime($endd));

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

        // Warehouse (store) filter
        if (!$start || $store_id == 0) {
            $warehouses = $db->table('warehouses')->orderBy('name', 'ASC')->get()->getResultArray();
        } else {
            $warehouses = $db->table('warehouses')->where('id', $store_id)->get()->getResultArray();
        }

        $reportData = [];

        foreach ($warehouses as $warehouse) {
            $products = $db->table('products')->orderBy('name', 'ASC')->get()->getResultArray();

            foreach ($products as $product) {
                $proId = $product['id'];
                $warId = $warehouse['id'];

                // Helper for stock calculations
                $sumQty = function ($type, $startDate = null, $endDate = null, $compare = 'between') use ($db, $proId, $warId) {
                    $builder = $db->table('stock_transfer')->select('SUM(qty) AS total, SUM(totamt) AS total_amt')
                        ->where('pro_id', $proId)
                        ->where('tyoftrans', $type)
                        ->where('war_id', $warId);

                    if ($compare === 'before') {
                        $builder->where('date <', $startDate);
                    } elseif ($compare === 'upto') {
                        $builder->where('date <=', $endDate);
                    } else {
                        $builder->where('date >=', $startDate)->where('date <=', $endDate);
                    }

                    return $builder->get()->getRowArray();
                };

                // Data for date range
                $data = [
                    'warehouse_name' => $warehouse['name'],
                    'product_name' => $product['name'],
                    'opening' => $sumQty(1, $start, $endd, 'before')['total'] + $sumQty(5, $start, $endd, 'before')['total']
                        + $sumQty(4, $start, $endd, 'before')['total']
                        - $sumQty(3, $start, $endd, 'before')['total']
                        - $sumQty(6, $start, $endd, 'before')['total']
                        - $sumQty(2, $start, $endd, 'before')['total'],
                    'purchase_qty' => $sumQty(1, $start, $endd)['total'],
                    'sales_qty' => $sumQty(2, $start, $endd)['total'],
                    'return_qty' => $sumQty(4, $start, $endd)['total'],
                    'adjustment_qty' => $sumQty(3, $start, $endd)['total'],
                    'dispatch_qty' => $sumQty(6, $start, $endd)['total'],
                    'in_qty' => $sumQty(9, $start, $endd)['total'],
                    'out_qty' => $sumQty(8, $start, $endd)['total'],
                    'closing' => $sumQty(1, $start, $endd, 'upto')['total'] + $sumQty(5, $start, $endd, 'upto')['total']
                        + $sumQty(4, $start, $endd, 'upto')['total']
                        - $sumQty(3, $start, $endd, 'upto')['total']
                        - $sumQty(6, $start, $endd, 'upto')['total']
                        - $sumQty(2, $start, $endd, 'upto')['total']
                        + ($sumQty(9, $start, $endd)['total'] - $sumQty(8, $start, $endd)['total']),
                    'purchase_value' => $sumQty(1, $start, $endd)['total_amt'],
                    'sales_value' => $sumQty(2, $start, $endd)['total_amt']
                ];

                $reportData[] = $data;
            }
        }

        return view('reports/store_register_report_table', [
            'company' => $settings['companyname'],
            'address' => $store['adresse'] ?? '',
            'start' => $start,
            'end' => $endd,
            'show_dispatch' => $stx === 'true',
            'reportData' => $reportData
        ]);
    }


    public function cclrtstore()
    {
        $db = \Config\Database::connect();
        $session = session();

        $store_id = $this->request->getPost('store_id');
        $start = date("Y-m-d", strtotime($this->request->getPost('start')));
        $endd = date("Y-m-d", strtotime($this->request->getPost('endd')));
        $stx = $this->request->getPost('ckkk'); // Product ID filter

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

        $levelsQuery = $db->table('levels')->orderBy('name', 'ASC');
        if ($store_id > 0) {
            $levelsQuery->where('warehousr', $store_id);
        }
        $levels = $levelsQuery->get()->getResultArray();

        $reportData = [];

        foreach ($levels as $level) {
            $warehouseId = $level['warehousr'];
            $rackCount = (int)$level['valueper'];
            $levelName = $level['name'];

            $warehouse = $db->table('warehouses')->where('id', $warehouseId)->get()->getRowArray();

            for ($rack = 1; $rack <= $rackCount; $rack++) {
                $products = $stx > 0
                    ? $db->table('products')->where('id', $stx)->get()->getResultArray()
                    : $db->table('products')->orderBy('name', 'ASC')->get()->getResultArray();

                foreach ($products as $product) {
                    $proId = $product['id'];

                    // Define helper for sum query
                    $sumQty = function ($type, $compare = 'between') use ($db, $proId, $warehouseId, $levelName, $rack, $start, $endd) {
                        $builder = $db->table('stock_transfer')->select('SUM(qty) AS qty, SUM(totamt) AS amt')
                            ->where('pro_id', $proId)
                            ->where('tyoftrans', $type)
                            ->where('war_id', $warehouseId)
                            ->where('llvel', $levelName)
                            ->where('rrack', $rack);

                        if ($compare === 'before') {
                            $builder->where('date <', $start);
                        } elseif ($compare === 'upto') {
                            $builder->where('date <=', $endd);
                        } else {
                            $builder->where('date >=', $start)->where('date <=', $endd);
                        }

                        return $builder->get()->getRowArray();
                    };

                    // Values in range
                    $purchase = $sumQty(1);
                    $purchaseDispatch = $sumQty(5);
                    $sales = $sumQty(2);
                    $returns = $sumQty(4);
                    $adjustments = $sumQty(3);
                    $dispatch = $sumQty(6);
                    $in = $sumQty(9);
                    $out = $sumQty(8);

                    // Opening
                    $openPurchase = $sumQty(1, 'before')['qty'] + $sumQty(5, 'before')['qty'];
                    $openSales = $sumQty(2, 'before')['qty'];
                    $openReturns = $sumQty(4, 'before')['qty'];
                    $openAdjust = $sumQty(3, 'before')['qty'];
                    $openDispatch = $sumQty(6, 'before')['qty'];

                    $opening = $openPurchase + $openReturns - $openSales - $openDispatch - $openAdjust;

                    // Closing
                    $closePurchase = $sumQty(1, 'upto')['qty'] + $sumQty(5, 'upto')['qty'];
                    $closeSales = $sumQty(2, 'upto')['qty'];
                    $closeReturns = $sumQty(4, 'upto')['qty'];
                    $closeAdjust = $sumQty(3, 'upto')['qty'];
                    $closeDispatch = $sumQty(6, 'upto')['qty'];
                    $inQty = $in['qty'] ?? 0;
                    $outQty = $out['qty'] ?? 0;

                    $closing = $closePurchase + $closeReturns - $closeSales - $closeDispatch - $closeAdjust + ($inQty - $outQty);

                    if ($opening > 0 || $closing > 0) {
                        $reportData[] = [
                            'warehouse' => $warehouse['name'] ?? '',
                            'product' => $product['name'],
                            'level' => $levelName,
                            'rack' => $rack,
                            'opening' => $opening,
                            'purchase' => $purchase['qty'] ?? 0,
                            'sales' => $sales['qty'] ?? 0,
                            'return' => $returns['qty'] ?? 0,
                            'adjustment' => $adjustments['qty'] ?? 0,
                            'in' => $inQty,
                            'out' => $outQty,
                            'closing' => $closing,
                            'purchase_val' => $purchase['amt'] ?? 0,
                            'sales_val' => $sales['amt'] ?? 0,
                        ];
                    }
                }
            }
        }

        return view('reports/level_stock_report_table', [
            'company' => $settings['companyname'],
            'address' => $store['adresse'] ?? '',
            'start' => $start,
            'end' => $endd,
            'reportData' => $reportData
        ]);
    }



    public function fastmovingstore()
    {
        $db = \Config\Database::connect();
        $session = session();

        $store_id = $this->request->getPost('store_id');
        $start = date("Y-m-d", strtotime($this->request->getPost('start')));
        $endd = date("Y-m-d", strtotime($this->request->getPost('endd')));

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

        // Fast moving query
        $builder = $db->table('sale_items si')
            ->select('p.id AS product_id, p.name AS product_name, p.category, SUM(si.qt) AS sold_qty')
            ->join('products p', 'p.id = si.product_id')
            ->join('categories c', 'p.category = c.id');

        if ($store_id > 0) {
            $builder->where('p.category', $store_id);
        }

        $builder->where('si.date >=', $start)
            ->where('si.date <=', $endd)
            ->groupBy('p.id')
            ->orderBy('sold_qty', 'DESC');

        $results = $builder->get()->getResultArray();

        // Map category names
        $categories = [];
        $catData = $db->table('categories')->get()->getResultArray();
        foreach ($catData as $cat) {
            $categories[$cat['id']] = $cat['name'];
        }

        return view('reports/fast_moving_stock_report', [
            'company' => $settings['companyname'],
            'address' => $store['adresse'] ?? '',
            'start' => $start,
            'end' => $endd,
            'results' => $results,
            'categories' => $categories,
        ]);
    }



    public function getrackwar()
    {
        $db = \Config\Database::connect();
        $session = session();

        $store_id = $this->request->getPost('store_id');
        $stx = $this->request->getPost('ckkk');

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

        $builder = $db->table('purchase_items')->where('avlqty >', 0);

        if ($store_id > 0) {
            $builder->where('warehouse_id', $store_id);
        }

        if ($stx > 0) {
            $builder->where('product_id', $stx);
        }

        $builder->orderBy('product_id', 'ASC');
        $items = $builder->get()->getResultArray();

        // Prefetch related products and warehouses
        $productIds = array_column($items, 'product_id');
        $warehouseIds = array_column($items, 'warehouse_id');

        $products = [];
        if (!empty($productIds)) {
            $proData = $db->table('products')->whereIn('id', $productIds)->get()->getResultArray();
            foreach ($proData as $prod) {
                $products[$prod['id']] = $prod['name'];
            }
        }

        $warehouses = [];
        if (!empty($warehouseIds)) {
            $whData = $db->table('warehouses')->whereIn('id', $warehouseIds)->get()->getResultArray();
            foreach ($whData as $wh) {
                $warehouses[$wh['id']] = $wh['name'];
            }
        }

        return view('reports/rackwise_stock_report', [
            'company' => $settings['companyname'],
            'address' => $store['adresse'] ?? '',
            'items' => $items,
            'products' => $products,
            'warehouses' => $warehouses,
        ]);
    }




    public function unsoldrackwar()
    {
        $db = \Config\Database::connect();
        $session = session();

        $store_id = $this->request->getPost('store_id');
        $prod_id = $this->request->getPost('ckkk');

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

        $builder = $db->table('purchase_items');

        if ($prod_id > 0) {
            $builder->where('product_id', $prod_id);
        }

        if ($store_id == 1) {
            $builder->orderBy('avlqty', 'DESC');
        } else {
            $builder->orderBy('ndate', 'ASC');
        }

        $items = $builder->get()->getResultArray();

        // Get related product and warehouse names
        $productIds = array_column($items, 'product_id');
        $warehouseIds = array_column($items, 'warehouse_id');

        $products = [];
        if (!empty($productIds)) {
            $productData = $db->table('products')->whereIn('id', $productIds)->get()->getResultArray();
            foreach ($productData as $product) {
                $products[$product['id']] = $product['name'];
            }
        }

        $warehouses = [];
        if (!empty($warehouseIds)) {
            $warehouseData = $db->table('warehouses')->whereIn('id', $warehouseIds)->get()->getResultArray();
            foreach ($warehouseData as $warehouse) {
                $warehouses[$warehouse['id']] = $warehouse['name'];
            }
        }

        return view('reports/unsold_rack_report', [
            'company'     => $settings['companyname'],
            'address'     => $store['adresse'] ?? '',
            'items'       => $items,
            'products'    => $products,
            'warehouses'  => $warehouses,
        ]);
    }




    public function getsalestallybb()
    {
        $db = \Config\Database::connect();
        $session = session();

        $start = $this->request->getPost('Range');
        $end = $this->request->getPost('Range1');
        $zstartpp = date("Y-m-d", strtotime($start));
        $zendpp = date("Y-m-d", strtotime($end));

        // Check overlap with existing tallysales
        $y1 = $db->table('tallysales')->where('fromdatt <=', $zstartpp)->where('enddatt >=', $zstartpp)->countAllResults();
        $y2 = $db->table('tallysales')->where('fromdatt <=', $zendpp)->where('enddatt >=', $zendpp)->countAllResults();
        $y3 = $db->table('tallysales')->where('fromdatt >=', $zstartpp)->where('enddatt <=', $zendpp)->countAllResults();

        if ($y1 == 0 && $y2 == 0 && $y3 == 0) {
            $startpp = date("d-m-Y", strtotime($start));
            $endpp = date("d-m-Y", strtotime($end));

            $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
            $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

            // Parse date formats
            if (!$start) {
                $today = date("Y-m-d");
                $sales = $db->table('sale_items')->where('date', $today)->orderBy('date', 'DESC')->get()->getResult();
            } else {
                $from = date("Y-m-d", strtotime($start));
                $to = date("Y-m-d", strtotime($end));
                $sales = $db->table('sale_items')->where("date >=", $from)->where("date <=", $to)->orderBy('date', 'DESC')->get()->getResult();
            }

            // Preload related data
            $productIds = array_column($sales, 'product_id');
            $saleIds = array_column($sales, 'sale_id');
            $supplierIds = array_column($sales, 'supplier');

            $products = $db->table('products')->whereIn('id', $productIds)->get()->getResultArray();
            $salesData = $db->table('sales')->whereIn('id', $saleIds)->get()->getResultArray();
            $suppliers = $db->table('suppliers')->whereIn('id', $supplierIds)->get()->getResultArray();

            $productMap = array_column($products, null, 'id');
            $saleMap = array_column($salesData, null, 'id');
            $supplierMap = array_column($suppliers, null, 'id');

            return view('reports/sales_tally_bb_report', [
                'sales' => $sales,
                'productMap' => $productMap,
                'saleMap' => $saleMap,
                'supplierMap' => $supplierMap,
                'company' => $settings['companyname'],
                'address' => $store['adresse'] ?? '',
                'start' => $startpp,
                'end' => $endpp,
            ]);
        } else {
            echo '<input type="hidden" name="rrt" id="rrt" value="0" /> This Date range data already updated into tally, please refer to the log file for download...';
        }
    }



    public function seldownloadxl($xmml)
    {
        $db = \Config\Database::connect();
        $session = session();

        $tally = $db->table('tallysales')->where('sii', $xmml)->get()->getRowArray();

        if (!$tally) {
            echo 'Data not found...';
            return;
        }

        $start = $tally['fromdatt'];
        $end = $tally['enddatt'];

        $startYMD = date("Y-m-d", strtotime($start));
        $endYMD = date("Y-m-d", strtotime($end));

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

        $saleItems = $db->table('sale_items')
            ->where('date >=', $startYMD)
            ->where('date <=', $endYMD)
            ->orderBy('date', 'DESC')
            ->get()->getResult();

        $productIds = array_column($saleItems, 'product_id');
        $supplierIds = array_column($saleItems, 'supplier');
        $saleIds = array_column($saleItems, 'sale_id');

        $products = array_column(
            $db->table('products')->whereIn('id', $productIds)->get()->getResultArray(),
            null,
            'id'
        );

        $suppliers = array_column(
            $db->table('suppliers')->whereIn('id', $supplierIds)->get()->getResultArray(),
            null,
            'id'
        );

        $sales = array_column(
            $db->table('sales')->whereIn('id', $saleIds)->get()->getResultArray(),
            null,
            'id'
        );

        $html = view('reports/sales_tally_bb_export', [
            'sales' => $saleItems,
            'productMap' => $products,
            'saleMap' => $sales,
            'supplierMap' => $suppliers,
            'company' => $settings['companyname'],
            'address' => $store['adresse'] ?? '',
            'start' => $start,
            'end' => $end,
        ]);

        $filename = 'SalesReport_' . $startYMD . '_to_' . $endYMD . '.xls';

        header("Content-Type: application/vnd.ms-excel");
        header("Content-Disposition: attachment; filename=\"$filename\"");
        echo $html;
        exit;
    }






    public function getRegrtstoreall()
    {
        $db = \Config\Database::connect();
        $session = session();

        $start = $this->request->getPost('start');
        $endd = $this->request->getPost('endd');
        $stx = $this->request->getPost('ckkk');
        $limittt = $this->request->getPost('limittt');
        $stores_id = !empty($this->request->getPost('storesSelect')) ? $this->request->getPost('storesSelect') : $this->session->store;

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $storeInfo = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();
        $logoPath = base_url('files/Setting/' . $settings['logo']);

        $startpp = date("Y-m-d", strtotime($start));
        $endpp = date("Y-m-d", strtotime($endd));
        $products = $db->table('products')
            ->select('id, name, price, code')
            ->orderBy('id', 'DESC')

            ->limit(100, (int) $limittt)
            ->get()
            ->getResultArray();

        $data = [
            'products' => $products,
            'start' => $startpp,
            'end' => $endpp,
            'storeId' => $stores_id,
            'setting' => $settings,
            'storeInfo' => $storeInfo,
            'startFormatted' => $startpp,
            'endFormatted' => $endpp
        ];

        return view('reports/closing_stock_report', $data);
    }




    public function wargetRegrtstoreall()
    {
        $db = \Config\Database::connect();
        $session = session();

        $start = $this->request->getPost('start');
        $endd = $this->request->getPost('endd');
        $stores_id = $this->request->getPost('storesSelect');

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $storeInfo = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($endd));

        $products = $db->table('products')->orderBy('name', 'asc')->get()->getResultArray();

        $data = [
            'start' => $start,
            'end' => $endd,
            'storeId' => $stores_id,
            'settings' => $settings,
            'storeInfo' => $storeInfo,
            'startFormatted' => $startpp,
            'endFormatted' => $endpp,
            'products' => $products
        ];

        return view('reports/warehouse_closing_stock_report', $data);
    }





    // public function getRegrtrools()
    // {
    //     $range = $this->request->getPost('Range');

    //     $db = \Config\Database::connect();
    //     $query = $db->table('permission_new')->where('nname', $range)->get();
    //     $oyu = $query->getRowArray();

    //     // Load setting config or model
    //     $settingModel = new SettingModel();
    //     $setting = $settingModel->find(1);
    //     return view('permissions/role_checkboxes', [
    //         'oyu'     => $oyu,
    //         'setting' => $setting
    //     ]);
    // }




    public function getRegrtrools()
    {

        $start = $this->request->getPost('Range');
        $oyu = $this->db->query("select * from permission_new where nname='" . $start . "' ")->getRowArray();
?>
        <table id="table" class="table table-striped table-bordered dataTable no-footer" role="grid" style="width: 50%;" width="50%" cellspacing="0">
            <thead class="thead-inverse">
                <tr role="row">
                    <th class="sorting" tabindex="0" aria-controls="table" rowspan="1" colspan="1" style="width: 252px;" aria-label="Date: activate to sort column ascending"><?= label("Menu"); ?></th>

                    <th class="sorting" tabindex="0" aria-controls="table" rowspan="1" colspan="1" style="width: 50px;" aria-label="Discount: activate to sort column ascending"><?= label("View"); ?></th>

                    <th class="sorting" tabindex="0" aria-controls="table" rowspan="1" colspan="1" style="width: 50px;" aria-label="Total: activate to sort column ascending"><?= label("Add"); ?></th>

                    <th class="sorting" tabindex="0" aria-controls="table" rowspan="1" colspan="1" style="width: 50px;" aria-label="Ceated By: activate to sort column ascending"><?= label("Edit"); ?></th>

                    <th class="sorting" tabindex="0" aria-controls="table" rowspan="1" colspan="1" style="width: 50px;" aria-label="Total Items: activate to sort column ascending"><?= label("Delete"); ?></th>


                </tr>
            </thead>
            <tbody>
                <tr role="row" class="even">
                    <td><?= label("Sales"); ?></td>
                    <input checked="checked" type="checkbox" name="ssv" value="0">
                    <input checked="checked" type="checkbox" name="ssa" value="0">
                    <input checked="checked" type="checkbox" name="sse" value="0">
                    <input checked="checked" type="checkbox" name="ssd" value="0">


                    <td><input <?php if ($oyu['ssv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="ssv" value="1"></td>
                    <td><input <?php if ($oyu['ssa'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="ssa" value="1"></td>
                    <td><input <?php if ($oyu['sse'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="sse" value="1"></td>
                    <td><input <?php if ($oyu['ssd'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="ssd" value="1"></td>
                </tr>



                <tr role="row" class="even">
                    <td><?= label("Quotation"); ?></td>

                    <input checked="checked" type="checkbox" name="qtv" value="0">
                    <input checked="checked" type="checkbox" name="qta" value="0">
                    <input checked="checked" type="checkbox" name="qte" value="0">
                    <input checked="checked" type="checkbox" name="qtd" value="0">

                    <td><input <?php if ($oyu['qtv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="qtv" value="1"></td>
                    <td><input <?php if ($oyu['qta'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="qta" value="1"></td>
                    <td><input <?php if ($oyu['qte'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="qte" value="1"></td>
                    <td><input <?php if ($oyu['qtd'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="qtd" value="1"></td>
                </tr>






                <tr role="row" class="even">
                    <td><?= label("Purchase"); ?></td>

                    <input checked="checked" type="checkbox" name="puv" value="0">
                    <input checked="checked" type="checkbox" name="pua" value="0">
                    <input checked="checked" type="checkbox" name="pue" value="0">
                    <input checked="checked" type="checkbox" name="pud" value="0">

                    <td><input <?php if ($oyu['puv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="puv" value="1"></td>
                    <td><input <?php if ($oyu['pua'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="pua" value="1"></td>
                    <td><input <?php if ($oyu['pue'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="pue" value="1"></td>
                    <td><input <?php if ($oyu['pud'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="pud" value="1"></td>
                </tr>


                <tr role="row" class="even">
                    <td><?= label("Expense"); ?> <?= label("Type"); ?></td>

                    <input checked="checked" type="checkbox" name="excv" value="0">
                    <input checked="checked" type="checkbox" name="exca" value="0">
                    <input checked="checked" type="checkbox" name="exce" value="0">
                    <input checked="checked" type="checkbox" name="excd" value="0">


                    <td><input <?php if ($oyu['excv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="excv" value="1"></td>
                    <td><input <?php if ($oyu['exca'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="exca" value="1"></td>
                    <td><input <?php if ($oyu['exce'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="exce" value="1"></td>
                    <td><input <?php if ($oyu['excd'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="excd" value="1"></td>
                </tr>





                <tr role="row" class="even">
                    <td><?= label("Expense"); ?></td>

                    <input checked="checked" type="checkbox" name="exxv" value="0">
                    <input checked="checked" type="checkbox" name="exxa" value="0">
                    <input checked="checked" type="checkbox" name="exxe" value="0">
                    <input checked="checked" type="checkbox" name="exxd" value="0">


                    <td><input <?php if ($oyu['exxv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="exxv" value="1"></td>
                    <td><input <?php if ($oyu['exxa'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="exxa" value="1"></td>
                    <td><input <?php if ($oyu['exxe'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="exxe" value="1"></td>
                    <td><input <?php if ($oyu['exxd'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="exxd" value="1"></td>
                </tr>



                <?php if ($this->setting->combo == 1) { ?>




                    <tr role="row" class="even">
                        <td><?= label("combooffers"); ?> </td>
                        <input checked="checked" type="checkbox" name="comv" value="0">
                        <input checked="checked" type="checkbox" name="coma" value="0">
                        <input checked="checked" type="checkbox" name="comd" value="0">
                        <td><input <?php if ($oyu['comv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="comv" value="1"></td>
                        <td><input <?php if ($oyu['coma'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="coma" value="1"></td>
                        <td> </td>
                        <td><input <?php if ($oyu['comd'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="comd" value="1"></td>
                    </tr>

                <?php } else { ?>

                    <input type="hidden" name="comv" value="0">
                    <input type="hidden" name="coma" value="0">
                    <input type="hidden" name="comd" value="0">


                <?php  } ?>


                <?php if ($this->setting->ooffr == 1) { ?>




                    <tr role="row" class="even">
                        <td><?= label("offers"); ?> </td>
                        <input checked="checked" type="checkbox" name="offv" value="0">
                        <input checked="checked" type="checkbox" name="offa" value="0">
                        <input checked="checked" type="checkbox" name="offe" value="0">

                        <td><input <?php if ($oyu['offv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="offv" value="1"></td>
                        <td><input <?php if ($oyu['offa'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="offa" value="1"></td>
                        <td><input <?php if ($oyu['offe'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="offe" value="1"></td>
                        <td> </td>
                    </tr>

                <?php } else { ?>

                    <input type="hidden" name="offv" value="0">
                    <input type="hidden" name="offa" value="0">
                    <input type="hidden" name="offe" value="0">


                <?php  } ?>








                <tr role="row" class="even">
                    <td><?= label("Brand"); ?> </td>
                    <input checked="checked" type="checkbox" name="brv" value="0">
                    <input checked="checked" type="checkbox" name="bra" value="0">
                    <input checked="checked" type="checkbox" name="bre" value="0">
                    <input checked="checked" type="checkbox" name="brd" value="0">
                    <td><input <?php if ($oyu['brv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="brv" value="1"></td>
                    <td><input <?php if ($oyu['bra'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="bra" value="1"></td>
                    <td><input <?php if ($oyu['bre'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="bre" value="1"></td>
                    <td><input <?php if ($oyu['brd'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="brd" value="1"></td>
                </tr>



                <tr role="row" class="even">
                    <td><?= label("Category"); ?> </td>
                    <input checked="checked" type="checkbox" name="caav" value="0">
                    <input checked="checked" type="checkbox" name="caaa" value="0">
                    <input checked="checked" type="checkbox" name="caae" value="0">
                    <input checked="checked" type="checkbox" name="caad" value="0">
                    <td><input <?php if ($oyu['caav'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="caav" value="1"></td>
                    <td><input <?php if ($oyu['caaa'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="caaa" value="1"></td>
                    <td><input <?php if ($oyu['caae'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="caae" value="1"></td>
                    <td><input <?php if ($oyu['caad'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="caad" value="1"></td>
                </tr>


                <tr role="row" class="even">
                    <td><?= label("tax"); ?> </td>
                    <input checked="checked" type="checkbox" name="taxv" value="0">
                    <input checked="checked" type="checkbox" name="taxa" value="0">
                    <input checked="checked" type="checkbox" name="taxe" value="0">
                    <input checked="checked" type="checkbox" name="taxd" value="0">
                    <td><input <?php if ($oyu['taxv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="taxv" value="1"></td>
                    <td><input <?php if ($oyu['taxa'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="taxa" value="1"></td>
                    <td><input <?php if ($oyu['taxe'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="taxe" value="1"></td>
                    <td><input <?php if ($oyu['taxd'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="taxd" value="1"></td>
                </tr>




                <tr role="row" class="even">
                    <td><?= label("Supplier"); ?> </td>
                    <input checked="checked" type="checkbox" name="cuv" value="0">
                    <input checked="checked" type="checkbox" name="cua" value="0">
                    <input checked="checked" type="checkbox" name="cue" value="0">
                    <input checked="checked" type="checkbox" name="cud" value="0">
                    <input checked="checked" type="checkbox" name="suv" value="0">
                    <td><input <?php if ($oyu['suv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="suv" value="1"></td>
                    <input checked="checked" type="checkbox" name="sua" value="0">
                    <td><input <?php if ($oyu['sua'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="sua" value="1"></td>
                    <input checked="checked" type="checkbox" name="sue" value="0">
                    <td><input <?php if ($oyu['sue'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="sue" value="1"></td>
                    <input checked="checked" type="checkbox" name="sud" value="0">
                    <td><input <?php if ($oyu['sud'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="sud" value="1"></td>
                </tr>


                <tr role="row" class="even">
                    <td><?= label("Product"); ?></td>

                    <input checked="checked" type="checkbox" name="prv" value="0">
                    <input checked="checked" type="checkbox" name="pra" value="0">
                    <input checked="checked" type="checkbox" name="pre" value="0">
                    <input checked="checked" type="checkbox" name="prd" value="0">

                    <td><input <?php if ($oyu['prv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="prv" value="1"></td>
                    <td><input <?php if ($oyu['pra'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="pra" value="1"></td>
                    <td><input <?php if ($oyu['pre'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="pre" value="1"></td>
                    <td><input <?php if ($oyu['prd'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="prd" value="1"></td>
                </tr>


                <tr role="row" class="even">
                    <td><?= label("initial_stock"); ?></td>

                    <input checked="checked" type="checkbox" name="prinv" value="0">



                    <td><input <?php if ($oyu['prinv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="prinv" value="1"></td>
                    <td> &nbsp;</td>
                    <td>&nbsp; </td>
                    <td> &nbsp;</td>
                </tr>






                <tr role="row" class="even">
                    <td><?= label("price_method"); ?></td>
                    <input checked="checked" type="checkbox" name="promov" value="0">
                    <td><input <?php if ($oyu['promov'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="promov" value="1"></td>
                    <td> &nbsp;</td>
                    <td>&nbsp; </td>
                    <td> &nbsp;</td>
                </tr>


                <tr role="row" class="even">
                    <td><?= label("price_price"); ?></td>
                    <input checked="checked" type="checkbox" name="proprp" value="0">
                    <td><input <?php if ($oyu['proprp'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="proprp" value="1"></td>
                    <td> &nbsp;</td>
                    <td>&nbsp; </td>
                    <td> &nbsp;</td>
                </tr>


                <tr role="row" class="even">
                    <td><?= label("price_mrp"); ?></td>
                    <input checked="checked" type="checkbox" name="promrpp" value="0">
                    <td><input <?php if ($oyu['promrpp'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="promrpp" value="1"></td>
                    <td> &nbsp;</td>
                    <td>&nbsp; </td>
                    <td> &nbsp;</td>
                </tr>






                <tr role="row" class="even">
                    <td><?= label("paymentMethod"); ?></td>

                    <input checked="checked" type="checkbox" name="payv" value="0">
                    <input checked="checked" type="checkbox" name="paya" value="0">
                    <input checked="checked" type="checkbox" name="paye" value="0">
                    <input checked="checked" type="checkbox" name="payd" value="0">

                    <td><input <?php if ($oyu['payv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="payv" value="1"></td>
                    <td><input <?php if ($oyu['paya'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="paya" value="1"></td>
                    <td><input <?php if ($oyu['paye'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="paye" value="1"></td>
                    <td><input <?php if ($oyu['payd'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="payd" value="1"></td>
                </tr>




                <tr role="row" class="even">
                    <td><?= label("Customer"); ?></td>

                    <td><input <?php if ($oyu['cuv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="cuv" value="1"></td>
                    <td><input <?php if ($oyu['cua'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="cua" value="1"></td>
                    <td><input <?php if ($oyu['cue'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="cue" value="1"></td>
                    <td><input <?php if ($oyu['cud'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="cud" value="1"></td>
                </tr>


                <tr role="row" class="even">
                    <td><?= label("Roles"); ?></td>


                    <input checked="checked" type="checkbox" name="rolesv" value="0">
                    <input checked="checked" type="checkbox" name="rolesa" value="0">
                    <input checked="checked" type="checkbox" name="rolese" value="0">


                    <td><input <?php if ($oyu['rolesv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="rolesv" value="1"></td>
                    <td><input <?php if ($oyu['rolesa'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="rolesa" value="1"></td>
                    <td><input <?php if ($oyu['rolese'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="rolese" value="1"></td>
                    <td>&nbsp;</td>
                </tr>





                <tr role="row" class="even">
                    <td><?= label("Physical"); ?> <?= label("Stock"); ?> </td>

                    <input checked="checked" type="checkbox" name="phv" value="0">
                    <input checked="checked" type="checkbox" name="pha" value="0">
                    <input checked="checked" type="checkbox" name="phe" value="0">
                    <input checked="checked" type="checkbox" name="phd" value="0">


                    <td><input <?php if ($oyu['phv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="phv" value="1"></td>
                    <td><input <?php if ($oyu['pha'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="pha" value="1"></td>
                    <td><input <?php if ($oyu['phe'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="phe" value="1"></td>
                    <td><input <?php if ($oyu['phd'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="phd" value="1"></td>
                </tr>



                <tr role="row" class="even">
                    <td><?= label("GoodsOut"); ?> </td>
                    <input checked="checked" type="checkbox" name="gov" value="0">
                    <input checked="checked" type="checkbox" name="goa" value="0">
                    <input checked="checked" type="checkbox" name="goe" value="0">
                    <input checked="checked" type="checkbox" name="god" value="0">

                    <td><input <?php if ($oyu['gov'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="gov" value="1"></td>
                    <td><input <?php if ($oyu['goa'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="goa" value="1"></td>
                    <td><input <?php if ($oyu['goe'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="goe" value="1"></td>
                    <td><input <?php if ($oyu['god'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="god" value="1"></td>
                </tr>
                <tr role="row" class="even">
                    <td><?= label("Sales"); ?> <?= label("Return"); ?> </td>
                    <td>
                        <input checked="checked" type="checkbox" name="salretv" value="0">
                        <input <?php if ($oyu['salretv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="salretv" value="1">
                    </td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                </tr>


                <tr role="row" class="even">
                    <td><?= label("Reports"); ?> </td>
                    <td>
                        <input checked="checked" type="checkbox" name="rev" value="0">
                        <input <?php if ($oyu['rev'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="rev" value="1">
                    </td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                </tr>




                <tr role="row" class="even">
                    <td><?= label("Production"); ?> <?= label("Entry"); ?> </td>
                    <input checked="checked" type="checkbox" name="prdenv" value="0">
                    <input checked="checked" type="checkbox" name="prdena" value="0">
                    <input checked="checked" type="checkbox" name="prdene" value="0">
                    <input checked="checked" type="checkbox" name="prdend" value="0">

                    <td><input <?php if ($oyu['prdenv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="prdenv" value="1"></td>
                    <td><input <?php if ($oyu['prdena'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="prdena" value="1"></td>
                    <td><input <?php if ($oyu['prdene'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="prdene" value="1"></td>
                    <td><input <?php if ($oyu['prdend'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="prdend" value="1"></td>
                </tr>



                <tr role="row" class="even">
                    <td><?= label("StockTransfer"); ?> </td>

                    <td>
                        <input checked="checked" type="checkbox" name="stv" value="0">
                        <input <?php if ($oyu['stv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="stv" value="1">
                    </td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                </tr>






                <?php if ($this->setting->tallyy == 1) { ?>


                    <tr role="row" class="even">
                        <td><?= label("Sales"); ?>Tally Purchase </td>
                        <td>
                            <input checked="checked" type="checkbox" name="tallypur" value="0">
                            <input <?php if ($oyu['tallypur'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="tallypur" value="1">
                        </td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                    </tr>

                    <tr role="row" class="even">
                        <td>Tally Purchase Log </td>
                        <td>
                            <input checked="checked" type="checkbox" name="tallypurlog" value="0">
                            <input <?php if ($oyu['tallypurlog'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="tallypurlog" value="1">
                        </td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                    </tr>

                    <tr role="row" class="even">
                        <td>Tally Sales</td>
                        <td>
                            <input checked="checked" type="checkbox" name="tallysale" value="0">
                            <input <?php if ($oyu['tallysale'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="tallysale" value="1">
                        </td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                    </tr>

                    <tr role="row" class="even">
                        <td>Tally Sales Log</td>
                        <td>
                            <input checked="checked" type="checkbox" name="tallysalelog" value="0">
                            <input <?php if ($oyu['tallysalelog'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="tallysalelog" value="1">
                        </td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                    </tr>

                    <tr role="row" class="even">
                        <td>Tally Update All</td>
                        <td>
                            <input checked="checked" type="checkbox" name="tallyupallv" value="0">
                            <input <?php if ($oyu['tallyupallv'] == 1) { ?> checked="checked" <?php } ?> style="display:block;" type="checkbox" name="tallyupallv" value="1">
                        </td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                        <td>&nbsp;</td>
                    </tr>
                <?php } ?>




            </tbody>
        </table>
<?php



    }





    public function delete_register($id)
    {
        $db = \Config\Database::connect();

        // Delete Sale Items for each Sale of this Register
        $sales = $db->table('sales')
            ->where('register_id', $id)
            ->get()
            ->getResult();

        foreach ($sales as $sale) {
            $db->table('sale_items')
                ->where('sale_id', $sale->id)
                ->delete();
        }

        // Delete Sales
        $db->table('sales')
            ->where('register_id', $id)
            ->delete();

        // Delete Payments
        $db->table('payements')
            ->where('register_id', $id)
            ->delete();

        // Delete Register
        $db->table('registers')
            ->where('id', $id)
            ->delete();

        return redirect()->back()->with('message', 'Register and associated records deleted successfully.');
    }


    public function getYearStats($year)
    {
        $db = \Config\Database::connect();

        // Monthly Sales Aggregation
        $monthlySalesSQL = "
        SELECT
            SUM(IF(month = 1, numRecords, 0)) AS january,
            SUM(IF(month = 1, totaltax, 0)) AS januarytax,
            SUM(IF(month = 1, totaldiscount, 0)) AS januarydisc,
            SUM(IF(month = 2, numRecords, 0)) AS feburary,
            SUM(IF(month = 2, totaltax, 0)) AS feburarytax,
            SUM(IF(month = 2, totaldiscount, 0)) AS feburarydisc,
            -- ... continue to month 12 ...
            SUM(numRecords) AS total,
            SUM(totaltax) AS totalstax,
            SUM(totaldiscount) AS totaldisc
        FROM (
            SELECT
                id,
                MONTH(created_at) AS month,
                ROUND(SUM(total)) AS numRecords,
                ROUND(SUM(taxamount)) AS totaltax,
                ROUND(SUM(discountamount)) AS totaldiscount
            FROM sales
            WHERE YEAR(created_at) = ?
            GROUP BY id, MONTH(created_at)
        ) AS SubTable1";

        $monthlySales = $db->query($monthlySalesSQL, [$year])->getRow();

        // Monthly Expenses Aggregation
        $monthlyExpenseSQL = "
        SELECT
            SUM(IF(month = 1, numRecords, 0)) AS january,
            SUM(IF(month = 2, numRecords, 0)) AS feburary,
            -- ... continue to month 12 ...
            SUM(numRecords) AS total
        FROM (
            SELECT
                id,
                MONTH(date) AS month,
                ROUND(SUM(amount)) AS numRecords
            FROM expences
            WHERE YEAR(date) = ?
            GROUP BY id, MONTH(date)
        ) AS SubTable1";

        $monthlyExpense = $db->query($monthlyExpenseSQL, [$year])->getRow();

        // Pass to view
        return view('dashboard/yearly_stats_table', [
            'monthly'     => $monthlySales,
            'monthlyExp'  => $monthlyExpense,
            'currency'    => $this->setting->currency ?? '৳'
        ]);
    }


    /**
     * ****************** register functions ***************
     */
    public function registerDetails($id)
    {
        $db = \Config\Database::connect();

        // Fetch register
        $register = $db->table('registers')->where('id', $id)->get()->getRow();

        if (!$register) {
            return 'Invalid register ID';
        }

        // Fetch users
        $user = $db->table('users')->where('id', $register->user_id)->get()->getRow();
        $user2 = $db->table('users')->where('id', $register->closed_by)->get()->getRow();

        $createdBy = $user ? $user->firstname . ' ' . $user->lastname : '-';
        $closedBy = $user2 ? $user2->firstname . ' ' . $user2->lastname : '-';

        $cashInHand = number_format((float)$register->cash_inhand, $this->setting->decimals, '.', '');

        // Payment mode details
        $paymentModes = $db->table('payment_mode')->orderBy('id')->get()->getResult();
        $payments = [];

        foreach ($paymentModes as $mode) {
            $row = $db->table('registers_paymentmode')
                ->where(['reg_idd' => $id, 'pay_m_id' => $mode->id])
                ->get()
                ->getRowArray();

            $payments[] = [
                'name' => $mode->name,
                'expected' => number_format($row['expectedcash'] ?? 0, $this->setting->decimals, '.', ''),
                'counted' => number_format($row['countedcash'] ?? 0, $this->setting->decimals, '.', ''),
                'diff' => number_format($row['diffcash'] ?? 0, $this->setting->decimals, '.', '')
            ];
        }

        // Return payment totals
        $ret1 = $db->table('registers_ret_tot')->where(['reg_idd' => $id, 'pay_m_id' => 1])->get()->getRowArray();
        $ret2 = $db->table('registers_ret_tot')->where(['reg_idd' => $id, 'pay_m_id' => 2])->get()->getRowArray();
        $ret3 = $db->table('registers_ret_tot')->where(['reg_idd' => $id, 'pay_m_id' => 3])->get()->getRowArray();

        // Denominations
        $denominations = $db->table('currencydenomination')->orderBy('name', 'desc')->get()->getResult();
        $notes = [];
        $denoTotal = 0;

        foreach ($denominations as $deno) {
            $note = $db->table('registers_note_count')
                ->where(['reg_idd' => $id, 'pay_m_id' => $deno->id])
                ->get()
                ->getRowArray();

            $counted = $note['countedcash'] ?? 0;
            $diff = $note['diffcash'] ?? 0;
            $notes[] = [
                'name' => $deno->name,
                'counted' => $counted,
                'diff' => number_format($diff, $this->setting->decimals, '.', '')
            ];
            $denoTotal += $diff;
        }

        return view('register/details', [
            'createdBy' => $createdBy,
            'closedBy' => $closedBy,
            'cashInHand' => $cashInHand,
            'currency' => $this->setting->currency,
            'decimals' => $this->setting->decimals,
            'payments' => $payments,
            'ret1' => $ret1,
            'ret2' => $ret2,
            'ret3' => $ret3,
            'notes' => $notes,
            'denoTotal' => number_format($denoTotal, $this->setting->decimals, '.', ''),
            'noteText' => $register->note
        ]);
    }



    public function getStockReport()
    {
        $request = \Config\Services::request();
        $db = \Config\Database::connect();

        $store_id_raw = $request->getPost('stock_id');
        $id = substr($store_id_raw, 1);
        $stype = ($store_id_raw[0] == 'S') ? 'warehouse_id' : 'store_id';

        // Fetch all products
        $products = $db->table('products')->get()->getResult();

        $data = [];

        foreach ($products as $product) {
            if ($product->type == '0') {
                $stockRow = $db->table('stock')
                    ->where($stype, $id)
                    ->where('product_id', $product->id)
                    ->get()
                    ->getRow();

                $stockQty = $stockRow ? $stockRow->quantity : '-';
                $alertClass = ($stockRow && $stockQty < $product->alertqt) ? 'danger' : '';

                $data[] = [
                    'name' => $product->name,
                    'code' => $product->code,
                    'quantity' => $stockQty,
                    'alertClass' => $alertClass
                ];
            }
        }

        return view('reports/stock_report_table', ['items' => $data]);
    }






    public function getPurchasedealerReport()
    {
        $request = \Config\Services::request();
        $db = \Config\Database::connect();
        $session = session();

        $start  = $request->getPost('Range');
        $end    = $request->getPost('Range1');
        $esuppr = $request->getPost('suppr');

        $storeId = $session->get('store');
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();


        if (empty($start)) {
            $startDate = $endDate = date('Y-m-d');
        } else {
            $startDate = date('Y-m-d', strtotime($start));
            $endDate   = date('Y-m-d', strtotime($end));
        }

        $builder = $db->table('purchases');
        $where = '';
        if ($settings['purchase_type'] != 2) {
            // $where = " AND ppurchase_type = " . $settings['purchase_type'];
            $builder->where('ppurchase_type', $settings['purchase_type']);
        }
        $builder->where("purdat BETWEEN '$startDate' AND '$endDate'");
        if (!empty($storeId)) {
            $builder->where('store_id', $storeId);
        }
        if (!empty($esuppr) && $esuppr > 0) {
            $builder->where('supplier_id', $esuppr);
        }
        if (!empty($where)) {
            $builder->where($where, null, false);
        }
        $builder->orderBy('purdat', 'asc');
        $purchases = $builder->get()->getResult();

        // Totals
        $summary = [
            'billamt' => 0,
            'tottax' => 0,
            'discc' => 0,
            'toott' => 0,
            'toott_return' => 0,
            'toott_ggg' => 0,
            'paidd' => 0
        ];

        $reportData = [];

        foreach ($purchases as $purchase) {
            $supplier = $db->table('suppliers')->where('id', $purchase->supplier_id)->get()->getRowArray();
            $retAmt = 0; // Placeholder, implement if needed
            $cgstSgst = $purchase->cgst + $purchase->sgst;

            $reportData[] = [
                'date' => date('d-m-Y', strtotime($purchase->purdat)),
                'supplier' => $supplier['name'] ?? '-',
                'bill_no' => $purchase->id,
                'invoice_no' => $purchase->invno,
                'betot' => $purchase->betot,
                'tax' => $cgstSgst,
                'disc' => $purchase->discamt,
                'total' => $purchase->total,
                'return' => $retAmt,
                'net' => $purchase->total - $retAmt,
                'paid' => $purchase->paiddd,
                // 'balance' => $purchase->total - $purchase->paiddd - $retAmt,
                'balance' => (float)$purchase->total - (float)$purchase->paiddd - (float)$retAmt
            ];

            // Accumulate totals
            $summary['billamt'] += $purchase->betot;
            $summary['tottax'] += $cgstSgst;
            $summary['discc'] += $purchase->discamt;
            $summary['toott'] += $purchase->total;
            $summary['toott_return'] += $retAmt;
            $summary['toott_ggg'] += ($purchase->total - $retAmt);
            // $summary['paidd'] += $purchase->paiddd;
            $summary['paidd'] += (float) $purchase->paiddd;
        }

        $summary['balance'] = $summary['toott'] - $summary['paidd'];

        return view('reports/purchase_dealer_report', [
            'settings' => $settings,
            'store' => $store,
            'start' => date('d-m-Y', strtotime($startDate)),
            'end' => date('d-m-Y', strtotime($endDate)),
            'data' => $reportData,
            'summary' => $summary
        ]);
    }


    public function getsalsumbjReport()
    {
        helper(['form', 'url']);

        $request = service('request');
        $session = session();

        $startRaw = $request->getPost('Range');
        $endRaw = $request->getPost('Range1');
        $storeId = $session->get('store');

        if (empty($startRaw)) {
            return;
        }

        $start = \DateTime::createFromFormat('d-m-Y', $startRaw)->format('Y-m-d');
        $end = \DateTime::createFromFormat('d-m-Y', $endRaw)->format('Y-m-d');

        $db = \Config\Database::connect();

        $setting = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $reportData = $db->table('returnss')
            ->select('todate, storeid, COUNT(re_id) as bills, SUM(tootal) as billamt, SUM(iteems) as iteemst')
            ->where('storeid', $storeId)
            ->where('todate >=', $start)
            ->where('todate <=', $end)
            ->groupBy('todate, storeid')
            ->orderBy('todate', 'ASC')
            ->get()
            ->getResult();

        // Prepare store names
        $storeNames = [];
        foreach ($reportData as $row) {
            $s = $db->table('stores')->where('id', $row->storeid)->get()->getRowArray();
            $storeNames[$row->storeid] = $s['name'] ?? '';
        }

        return view('reports/salsumbj_report', [
            'setting'     => $setting,
            'store'       => $store,
            'reportData'  => $reportData,
            'storeNames'  => $storeNames,
            'startpp'     => $startRaw,
            'endpp'       => $endRaw,
            'totalAmount' => array_sum(array_column(array_map(fn($r) => (array)$r, $reportData), 'billamt')),
            'decimals'    => $setting['decimals'] ?? 2,
        ]);
    }




    public function getPurchaseMonthlyReport()
    {
        $db = \Config\Database::connect();
        $request = \Config\Services::request();
        $session = session();

        $start = $request->getPost('Range');
        $end   = $request->getPost('Range1');

        $storeId = $session->get('store');
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $startDate = $start ? date('Y-m-d', strtotime(str_replace('/', '-', $start))) : date('Y-m-d');
        $endDate   = $end   ? date('Y-m-d', strtotime(str_replace('/', '-', $end)))   : $startDate;

        // Grouped Purchase Monthly Summary
        $purchases = $db->query("
        SELECT 
            COUNT(id) as bills,
            SUM(betot) as billamt,
            SUM(paiddd) as baalll,
            SUM(cgst) as cgg,
            SUM(sgst) as sgg,
            SUM(discamt) as dikct,
            SUM(total) as netamtt,
            DATE_FORMAT(purdat, '%Y-%m') AS month
        FROM purchases
        WHERE store_id = ? AND purdat BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(purdat, '%Y-%m')
    ", [$storeId, $startDate, $endDate])->getResult();

        $reportData = [];
        $summary = [
            'billamt' => 0,
            'tottax' => 0,
            'discc' => 0,
            'toott' => 0,
            'paidd' => 0,
            'paidd_rrr' => 0
        ];

        foreach ($purchases as $purchase) {
            // Fetch return amount for the same month
            $returns = $db->query("
            SELECT SUM(total) AS retnetamtt
            FROM purchases_return
            WHERE store_id = ? AND purdat BETWEEN ? AND ?
            AND DATE_FORMAT(purdat, '%Y-%m') = ?
        ", [$storeId, $startDate, $endDate, $purchase->month])->getRow();

            $returnAmount = $returns->retnetamtt ?? 0;
            $taxTotal = $purchase->cgg + $purchase->sgg;
            $netAfterReturn = $purchase->netamtt - $returnAmount;
            $balance = $purchase->netamtt - $purchase->baalll - $returnAmount;

            $reportData[] = [
                'month' => $purchase->month,
                'bills' => $purchase->bills,
                'billamt' => $purchase->billamt,
                'tax' => $taxTotal,
                'disc' => $purchase->dikct,
                'netamtt' => $purchase->netamtt,
                'returnamt' => $returnAmount,
                'netafterreturn' => $netAfterReturn,
                'paid' => $purchase->baalll,
                'balance' => $balance
            ];

            // Accumulate summary
            $summary['billamt'] += $purchase->billamt;
            $summary['tottax']  += $taxTotal;
            $summary['discc']   += $purchase->dikct;
            $summary['toott']   += $purchase->netamtt;
            $summary['paidd']   += $purchase->baalll;
            $summary['paidd_rrr'] += $returnAmount;
        }

        return view('reports/purchase_monthly_report', [
            'settings' => $settings,
            'store' => $store,
            'start' => $startDate,
            'end' => $endDate,
            'data' => $reportData,
            'summary' => $summary
        ]);
    }




    public function salesReturnDailyReport()
    {
        $db = \Config\Database::connect();
        $request = \Config\Services::request();
        $session = session();

        $start = $request->getPost('Range');
        $end   = $request->getPost('Range1');

        $storeId = $session->get('store');
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $retType = $settings['themblock'];
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $startDate = $start ? date('Y-m-d', strtotime(str_replace('/', '-', $start))) : date('Y-m-d');
        $endDate   = $end   ? date('Y-m-d', strtotime(str_replace('/', '-', $end)))   : $startDate;

        $builder = $db->table('returnss');
        $builder->where('storeid', $storeId);
        $builder->where('rsale_type', $retType);
        $builder->where('todate >=', $startDate);
        $builder->where('todate <=', $endDate);
        $builder->orderBy('todate', 'asc');

        // Only include retrn_amt_mtd = 1 if a date is selected
        if (!empty($start) && $start != '0') {
            $builder->where('retrn_amt_mtd', 1);
        }

        $returns = $builder->get()->getResult();

        $totalAmount = 0;
        $reportData = [];

        foreach ($returns as $row) {
            $storeInfo = $db->table('stores')->where('id', $row->storeid)->get()->getRowArray();
            $reportData[] = [
                'date' => date('d-m-Y', strtotime($row->todate)),
                'bill_no' => $row->re_id,
                'store' => $storeInfo['name'] ?? '-',
                'from_sale' => $row->re_sales_id,
                'to_sale' => $row->purcha_sales_id,
                'qty' => $row->iteems,
                'amount' => $row->tootal
            ];
            $totalAmount += $row->tootal;
        }

        return view('reports/sales_return_daily_report', [
            'settings' => $settings,
            'store' => $store,
            'start' => $startDate,
            'end' => $endDate,
            'data' => $reportData,
            'total' => $totalAmount
        ]);
    }


    public function getSalesSummaryReport()
    {
        $db = \Config\Database::connect();
        $request = \Config\Services::request();
        $session = session();

        $start = $request->getPost('Range');
        $end   = $request->getPost('Range1');
        $storeId = $session->get('store');

        if (empty($start)) {
            return; // exit early if no date range
        }

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
        $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $end)));

        $query = $db->query("
        SELECT 
            COUNT(re_id) AS bills,
            SUM(tootal) AS billamt,
            SUM(iteems) AS iteemst,
            storeid,
            todate
        FROM returnss
        WHERE storeid = ? AND todate BETWEEN ? AND ?
        GROUP BY todate, storeid
        ORDER BY todate ASC
    ", [$storeId, $startDate, $endDate]);

        $results = $query->getResult();

        $reportData = [];
        $totalAmount = 0;

        foreach ($results as $row) {
            $storeName = $db->table('stores')->where('id', $row->storeid)->get()->getRowArray()['name'] ?? '-';
            $reportData[] = [
                'date' => date('d-m-Y', strtotime($row->todate)),
                'bills' => $row->bills,
                'store' => $storeName,
                'qty' => $row->iteemst,
                'amount' => $row->billamt
            ];
            $totalAmount += $row->billamt;
        }

        return view('reports/sales_return_summary_report', [
            'settings' => $settings,
            'store' => $store,
            'start' => $startDate,
            'end' => $endDate,
            'data' => $reportData,
            'total' => $totalAmount
        ]);
    }



    public function salesReturnMonthlyReport()
    {
        $db = \Config\Database::connect();
        $request = \Config\Services::request();
        $session = session();

        $start = $request->getPost('Range');
        $end   = $request->getPost('Range1');
        $storeId = $session->get('store');

        if (empty($start)) {
            return; // Exit if no start date
        }

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
        $endDate   = date('Y-m-d', strtotime(str_replace('/', '-', $end)));

        $query = $db->query("
        SELECT 
            COUNT(re_id) AS bills,
            SUM(tootal) AS billamt,
            SUM(iteems) AS iteems,
            DATE_FORMAT(todate, '%Y-%m') AS month,
            storeid
        FROM returnss
        WHERE storeid = ? AND todate BETWEEN ? AND ?
        GROUP BY DATE_FORMAT(todate, '%Y-%m'), storeid
        ORDER BY month ASC
    ", [$storeId, $startDate, $endDate]);

        $results = $query->getResult();

        $reportData = [];
        $totalAmount = 0;

        foreach ($results as $row) {
            $storeName = $db->table('stores')->where('id', $row->storeid)->get()->getRowArray()['name'] ?? '-';
            $reportData[] = [
                'month' => $row->month,
                'store' => $storeName,
                'bills' => $row->bills,
                'qty' => $row->iteems,
                'amount' => $row->billamt
            ];
            $totalAmount += $row->billamt;
        }

        return view('reports/sales_return_monthly_report', [
            'settings' => $settings,
            'store' => $store,
            'start' => $startDate,
            'end' => $endDate,
            'data' => $reportData,
            'total' => $totalAmount
        ]);
    }

    // Up conplete work 

    public function getsalesdailReport1()
    {
        $request = service('request');
        $session = session();
        $db = \Config\Database::connect();

        $start  = $request->getPost('Range');
        $end    = $request->getPost('Range1');
        $esuppr = $request->getPost('suppr');

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $storeId = $session->get('store');
        $store   = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $startFormatted = date('d-m-Y', strtotime($start));
        $endFormatted   = date('d-m-Y', strtotime($end));

        $startSQL = date('Y-m-d', strtotime($start));
        $endSQL   = date('Y-m-d', strtotime($end));

        if ($esuppr > 0) {
            $sales = $db->table('sales')
                ->where('client_id', $esuppr)
                ->where("created_at >=", $startSQL)
                ->where("created_at <=", $endSQL)
                ->orderBy('id', 'DESC')
                ->get()->getResult();

            $advanceRow = $db->table('payements_advance')
                ->selectSum('paid', 'advancee')
                ->where('cust_id', $esuppr)
                ->get()->getRowArray();
            $advance = $advanceRow['advancee'] ?? 0;
        } elseif ($esuppr === '') {
            $sales = $db->table('sales')
                ->where("created_at >=", $startSQL)
                ->where("created_at <=", $endSQL)
                ->orderBy('id', 'DESC')
                ->get()->getResult();
            $advance = 0;
        } else {
            $sales = $db->table('sales')
                ->where('client_id', 0)
                ->where("created_at >=", $startSQL)
                ->where("created_at <=", $endSQL)
                ->orderBy('id', 'DESC')
                ->get()->getResult();
            $advance = 0;
        }

        $data = [
            'sales'       => $sales,
            'settings'    => $settings,
            'store'       => $store,
            'start'       => $startFormatted,
            'end'         => $endFormatted,
            'advance'     => $advance,
            'decimals'    => $settings['decimals'] ?? 2,
        ];

        return view('reports/sales_daily_report', $data);
    }

    // public function cashinhanddailyReport()
    // {
    //     $request = service('request');
    //     $db = \Config\Database::connect();

    //     $start = $request->getPost('Range');

    //     if (!$start || !preg_match('/^\d{2}-\d{2}-\d{4}$/', $start)) {
    //         return $this->response->setJSON(['error' => 'Invalid date format']);
    //     }

    //     // Convert DD-MM-YYYY to YYYY-MM-DD
    //     [$day, $month, $year] = explode('-', $start);
    //     $dateFormatted = "$year-$month-$day";

    //     $settingRow = $db->table('settings')->where('id', 1)->get()->getRowArray();
    //     $ret_idd = $settingRow['themblock'] ?? 0;
    //     $decimals = $settingRow['decimals'] ?? 2;

    //     $salesTable = ($ret_idd == 0) ? "sales" : "dsales";
    //     $returnssTable = "returnss";

    //     $salesData = $db->query("
    //         SELECT 
    //             SUM(CASE WHEN status = 3 THEN total END) AS cancelledamt,
    //             SUM(CASE WHEN total <= paid THEN total ELSE paid END) AS totalpaid,
    //             SUM(
    //                 CASE 
    //                     WHEN status = 3 AND total > paid THEN paid
    //                     WHEN status = 3 AND total <= paid THEN total
    //                 END
    //             ) AS totcancelled,
    //             SUM(total) AS totalsales_amount
    //         FROM {$salesTable}
    //         WHERE selddate = ?", [$dateFormatted])->getRowArray();

    //     $returnData = $db->query("
    //         SELECT 
    //             SUM(CASE WHEN retun_amt_stas = 0 THEN tootal END) AS amt_return,
    //             SUM(CASE WHEN retun_amt_stas = 1 THEN tootal END) AS exchange_return
    //         FROM {$returnssTable}
    //         WHERE rsale_type = ? AND todate = ?", [$ret_idd, $dateFormatted])->getRowArray();

    //     $today_sales = $salesData['totalsales_amount'] ?? 0;
    //     $cancelledamt = $salesData['cancelledamt'] ?? 0;
    //     $totcancelled = $salesData['totcancelled'] ?? 0;
    //     $exchange_return = $returnData['exchange_return'] ?? 0;
    //     $amt_return = $returnData['amt_return'] ?? 0;
    //     $totalpaid = ($salesData['totalpaid'] ?? 0) - $exchange_return;
    //     $cash_in_hand = $totalpaid - $totcancelled - $amt_return;

    //     $data = [
    //         'date' => $start,
    //         'today_sales' => $today_sales,
    //         'totalpaid' => $totalpaid,
    //         'cancelledamt' => $cancelledamt,
    //         'totcancelled' => $totcancelled,
    //         'exchange_return' => $exchange_return,
    //         'amt_return' => $amt_return,
    //         'cash_in_hand' => $cash_in_hand,
    //         'decimals' => $decimals,
    //     ];

    //     return view('reports/cashinhand_daily_report', $data);
    // }
    public function cashinhanddailyReport()
    {
        $db = \Config\Database::connect();
        $settingModel = new \App\Models\SettingModel(); // if using a model
        $start = $this->request->getPost('Range'); // expected format: 01-06-2025

        // Validate and convert date
        if (!$start || !preg_match('/^\d{2}-\d{2}-\d{4}$/', $start)) {
            return $this->response->setJSON(['error' => 'Invalid or missing date.']);
        }
        [$day, $month, $year] = explode('-', $start);
        $la32 = "$year-$month-$day"; // to YYYY-MM-DD

        // Get settings
        $lkmm = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $ret_idd = $lkmm['themblock'] ?? 0;

        // Dynamic table selection
        if ($ret_idd == 0) {
            $sales = 'sales';
            $returnss = 'returnss';
        } else {
            $sales = 'dsales';
            $returnss = 'returnss'; // This table may not change
        }

        // Fetch sales data
        $salesQuery = "
            SELECT
                SUM(CASE WHEN status = 3 THEN total END) AS cancelledamt,
                SUM(CASE WHEN total <= paid THEN total ELSE paid END) AS totalpaid,
                SUM(
                    CASE
                        WHEN status = 3 AND total > paid THEN paid
                        WHEN status = 3 AND total <= paid THEN total
                    END
                ) AS totcancelled,
                SUM(total) AS totalsales_amount
            FROM {$sales}
            WHERE DATE(created_at) = ?
        ";
        $salesff = $db->query($salesQuery, [$la32])->getRowArray();

        $cancelledamt = (float) ($salesff['cancelledamt'] ?? 0);
        $totalpaid = (float) ($salesff['totalpaid'] ?? 0);
        $totcancelled = (float) ($salesff['totcancelled'] ?? 0);
        $today_sales = (float) ($salesff['totalsales_amount'] ?? 0);

        // Fetch returns data
        $returnQuery = "
            SELECT
                SUM(CASE WHEN retun_amt_stas = 0 THEN tootal END) AS amt_return,
                SUM(CASE WHEN retun_amt_stas = 1 THEN tootal END) AS exchange_return
            FROM {$returnss}
            WHERE rsale_type = ? AND todate = ?
        ";
        $returnssff = $db->query($returnQuery, [$ret_idd, $la32])->getRowArray();


        $amt_return = (float) ($returnssff['amt_return'] ?? 0);
        $exchange_return = (float) ($returnssff['exchange_return'] ?? 0);

        // Calculate final value
        $cash_in_hand = ($totalpaid - $totcancelled) - $amt_return;

        $data = [
            'start'            => $start,
            'today_sales'      => $today_sales,
            'totalpaid'        => $totalpaid,
            'cancelledamt'     => $cancelledamt,
            'totcancelled'     => $totcancelled,
            'exchange_return'  => $exchange_return,
            'amt_return'       => $amt_return,
            'cash_in_hand'     => $cash_in_hand,
            'decimals'         => $lkmm['decimals'] ?? 2,
        ];

        return view('reports/cash_in_hand_report', $data);
    }


    public function filter_total_rows()
    {
        $db      = \Config\Database::connect();
        $session = session();

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $storeId  = $session->get('store');
        $store    = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $start       = $this->request->getPost('Range');
        $end         = $this->request->getPost('Range1');
        $esuppr      = $this->request->getPost('suppr');
        $pamode_id   = $this->request->getPost('selectedValues');

        $sales        = ($settings['themblock'] == 0) ? 'sales' : 'dsales';
        $sale_items   = ($settings['themblock'] == 0) ? 'sale_items' : 'dsale_items';
        $tax_summary  = ($settings['themblock'] == 0) ? 'tax_summary' : 'dtax_summary';

        $startDateFormatted = date('d-m-Y', strtotime($start));
        $endDateFormatted   = date('d-m-Y', strtotime($end));

        // Convert to Y-m-d format
        $from = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
        $to   = date('Y-m-d', strtotime(str_replace('/', '-', $end)));

        // Call the CI4 Sale model function to get the count
        $saleModel = new \App\Models\SaleModel();
        $total_sales_number = $saleModel->getFilteredData($sales, $esuppr, $from, $to, $sale_items);

        // Optional: paginate results logic
        $slot        = 10;
        $total_slot  = ceil($total_sales_number / $slot);
        $offset      = 0;
        $limit       = 0;
        $arr         = range(0, $total_sales_number);
        $chunks      = array_chunk($arr, $slot);

        return $this->response->setJSON(['number' => $total_sales_number]);
    }


    public function productQuery($sales, $rtttfc, $esuppr, $la32, $laxg, $ssid = 0, $ret_idd = 0)
    {
        $builder = $this->db->table($sales);
        $builder->select("{$sales}.*, {$sales}.id as ssid, {$sales}.status as ssstatus, customers.name as cname, stores.name as ssname");

        $builder->join('registers', "{$sales}.register_id = registers.id", 'left');
        $builder->join('customers', "{$sales}.client_id = customers.id", 'left');
        $builder->join('stores', "registers.store_id = stores.id", 'left');

        if ($esuppr > 0) {
            if (!empty($rtttfc)) {
                $builder->where($rtttfc);
            }

            $builder->where("{$sales}.client_id", $esuppr);
            $builder->where("{$sales}.created_at >=", $la32);
            $builder->where("{$sales}.created_at <=", $laxg);
            $builder->orderBy("{$sales}.id", 'DESC');
        } elseif ($esuppr === '') {
            $builder->select("SUM(tootal) AS return_total");
            $builder->join('returnss', "returnss.re_sales_id = {$sales}.id", 'left');

            if (!empty($rtttfc)) {
                $builder->where($rtttfc);
            }

            $builder->where("{$sales}.created_at >=", $la32);
            $builder->where("{$sales}.created_at <=", $laxg);
            // Uncomment these lines if needed
            // $builder->where('returnss.re_sales_id', $ssid);
            // $builder->where('returnss.rsale_type', $ret_idd);

            $builder->orderBy("{$sales}.id", 'DESC');
        } else {
            if (!empty($rtttfc)) {
                $builder->where($rtttfc);
            }

            $builder->where("{$sales}.client_id", 0);
            $builder->where("{$sales}.created_at >=", $la32);
            $builder->where("{$sales}.created_at <=", $laxg);
            $builder->orderBy("{$sales}.id", 'DESC');
        }

        return $builder->get(); // Returns a CI4 query object
    }


    private function processSaleRow($prd, $db, $setting, $sale_items, $tax_summary, $ret_idd, $pamode_id)
    {
        $ssid = $prd->ssid;
        $subTotal = $prd->subtotal;
        $discount = $prd->discount_indujul + $prd->discountamount;
        $shipping = $prd->disamtssh;
        $total = $prd->total;

        // Return check
        $returnQuery = $db->query("SELECT * FROM returnss WHERE re_sales_id = ? AND rsale_type = ?", [$ssid, $ret_idd]);
        $return_rows = $returnQuery->getResult();

        $return_total = 0;
        $exchange_total = 0;

        foreach ($return_rows as $ret) {
            if ($ret->retrn_amt_mtd == 1) {
                $return_total += $ret->sutott;
            } else {
                $exchange_total += $ret->sutott;
            }
        }

        // Tax summary
        $taxQuery = $db->query("SELECT * FROM $tax_summary WHERE salesid = ?", [$ssid]);
        $tax_total = 0;
        $tax_details = '';
        foreach ($taxQuery->getResult() as $tx) {
            $tax_total += $tx->taxfrom;
            $tax_details .= $tx->taxname . '-' . number_format((float)$tx->taxfrom, $setting['decimals'], '.', '') . '<br>';
        }

        // Status
        $rowStyle = '';
        if ($prd->ssstatus == 3) {
            $rowStyle = "style='background:#e9c0c0;'";
            $statusText = "<span class='cancel'>Cancel</span>";
            $cancel_total = $total;
        } elseif (!empty($return_rows)) {
            $rowStyle = "style='background:#f86e50;'";
            $statusText = "<span class='return'>Return</span>";
            $cancel_total = 0;
        } else {
            $statusText = "<span class='sales'>Sales</span>";
            $cancel_total = 0;
        }

        $dateFormatted = date('d-m-Y', strtotime(explode(' ', $prd->attime)[0]));

        return [
            'html' => "<tr $rowStyle>
                <td>{$ssid}</td>
                <td>{$prd->ssname}</td>
                <td>{$prd->cname}</td>
                <td>{$dateFormatted}</td>
                <td>{$prd->totalitems}</td>
                <td>" . number_format((float)$subTotal, $setting['decimals'], '.', '') . "</td>
                <td>" . number_format((float)$tax_total, $setting['decimals'], '.', '') . "</td>
                <td>{$tax_details}</td>
                <td>" . number_format((float)$discount, $setting['decimals'], '.', '') . "</td>
                <td>" . number_format((float)$shipping, $setting['decimals'], '.', '') . "</td>
                <td>" . number_format((float)$total, $setting['decimals'], '.', '') . "</td>
                <td>{$statusText}</td>
                <td>" . number_format((float)$cancel_total, $setting['decimals'], '.', '') . "</td>
                <td>" . number_format((float)$exchange_total, $setting['decimals'], '.', '') . "</td>
                <td>" . number_format((float)$return_total, $setting['decimals'], '.', '') . "</td>
            </tr>",
            'sub_total_amount' => $subTotal,
            'tax_total' => $tax_total,
            'discount_total' => $discount,
            'shiping_total' => $shipping,
            'total_amount_' => $total,
            'cancel_total' => $cancel_total,
            'exchange_total' => $exchange_total,
            'return_total' => $return_total,
            'grand_total_amount' => $total - ($cancel_total + $exchange_total + $return_total),
        ];
    }


    // public function get_sales_report()
    // {
    //     $request = service('request');
    //     $db = \Config\Database::connect();

    //     $offset       = (int) $request->getPost('offset');
    //     $limit        = (int) $request->getPost('limit');
    //     $start        = $request->getPost('Range');
    //     $end          = $request->getPost('Range1');
    //     $esuppr       = $request->getPost('suppr');
    //     $pamode_id    = $request->getPost('selectedValues') ?? [];
    //     $storeId      = session()->get('store');
    //     $storeFilter  = $request->getPost('StoresSelect');

    //     // Load settings and store
    //     $settingsRow  = $db->table('settings')->where('id', 1)->get()->getRowArray();
    //     $storeRow     = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

    //     $sales        = $settingsRow['themblock'] == 0 ? 'sales' : 'dsales';
    //     $sale_items   = $settingsRow['themblock'] == 0 ? 'sale_items' : 'dsale_items';
    //     $tax_summary  = $settingsRow['themblock'] == 0 ? 'tax_summary' : 'dtax_summary';
    //     $ret_idd      = $settingsRow['themblock'];

    //     // Safely parse dates
    //     // try {
    //     //     $from = $start ? date('Y-m-d', strtotime(str_replace('/', '-', $start))) : date('Y-m-d');
    //     //     $to   = $end   ? date('Y-m-d', strtotime(str_replace('/', '-', $end)))   : date('Y-m-d');
    //     // } catch (\Throwable $e) {
    //     //     $from = $to = date('Y-m-d');
    //     // }
    //     $from = date("d-m-Y", strtotime($start));
    //     $to = date("d-m-Y", strtotime($end));


    //     // $from = $start ? date('Y-m-d', strtotime($start)) : date('Y-m-d');
    //     // $to   = $end   ? date('Y-m-d', strtotime($end))   : date('Y-m-d');

    //     // Build the query
    //     $builder = $db->table($sales)
    //         ->select("$sales.*, $sales.id as ssid, $sales.status as ssstatus, customers.name as cname, stores.name as ssname")
    //         ->join('registers', "$sales.register_id = registers.id", 'left')
    //         ->join('customers', "$sales.client_id = customers.id", 'left')
    //         ->join('stores', 'registers.store_id = stores.id', 'left')
    //         ->where("$sales.created_at >=", $from)
    //         ->where("$sales.created_at <=", $to);

    //     // Optional filters
    //     if (!empty($storeFilter) && is_numeric($storeFilter)) {
    //         $builder->where('registers.store_id', (int)$storeFilter);
    //     }

    //     if (is_numeric($esuppr)) {
    //         $builder->where("$sales.client_id", $esuppr);
    //     }

    //     // Pagination
    //     if ($limit > 0) {
    //         $builder->limit($limit, $offset);
    //     }

    //     $builder->orderBy("$sales.id", 'desc');

    //     // Debug logging
    //     log_message('debug', 'SQL: ' . $builder->getCompiledSelect());

    //     $results = $builder->get()->getResultObject();

    //     if (empty($results)) {
    //         log_message('debug', 'No sales data found for the given filters.');
    //     }
    //     // dd($results);
    //     $html = view('reports/sales_report_rows', [
    //         'results'      => $results,
    //         'settings'     => $this->setting,
    //         'ret_idd'      => $ret_idd,
    //         'tax_summary'  => $tax_summary,
    //         'sale_items'   => $sale_items,
    //         'pamode_id'    => $pamode_id,
    //         'db'           => $db
    //     ]);

    //     return $this->response->setJSON([
    //         'tr'   => $html,
    //         'rows' => count($results)
    //     ]);
    // }


    public function getDataUnion()
    {
        $request = $this->request;

        $offset      = (int) $request->getPost('offset') ?? 0;
        $limit       = (int) $request->getPost('limit') ?? 50;
        $start       = trim($request->getPost('Range'));
        $end         = trim($request->getPost('Range1'));
        $esuppr      = $request->getPost('suppr');
        $pamode_id   = $request->getPost('selectedValues');
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

    public function get_sales_report()
    {
        $offset      = $this->request->getPost('offset');
        $limit       = $this->request->getPost('limit');
        $start       = $this->request->getPost('Range');
        $end         = $this->request->getPost('Range1');
        $esuppr      = $this->request->getPost('suppr');
        $pamode_id   = $this->request->getPost('selectedValues');
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

        if ($this->setting->sales_type == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
            $tax_summary = "tax_summary";
        } else if ($this->setting->sales_type == 1) {
            $sales = "dsales";
            $sale_items = "dsale_items";
            $tax_summary = "dtax_summary";
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
        } else {
            $db = \Config\Database::connect();
            $builder = $db->table($sales); // $sales should be your table name, like 'sales'
            // Select columns
            $builder->select("$sales.*");
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
            $builder->limit($limit, $offset);
            // Run the query
            $query = $builder->get();
        }

        $rows = array();

        // $query = $prducts;
        // $query = $this->db->query($sql, FALSE); // FALSE = unbuffered query

        // while ($prd = $query->unbuffered_row('object')) {
        //     // process $row one at a time
        //     print_r($prd);
        // }
        // die;

        // print_r($query->getResult());
        // die;

        $tr = '';
        $sr = 0;
        $count_rows = 0;

        $sub_total_amount = 0;
        $tax_total = 0;
        $discount_total = 0;
        $shiping_total = 0;
        $total_amount_ = 0;
        $cancel_total = 0;
        $exchange_total = 0;
        $return_total = 0;
        $grand_total_amount = 0; // echo $this->db->getLastQuery();exit;
        while ($prd = $query->getUnbufferedRow('object')) {
            $count_rows += 1;
            $sr += 1;

            $tt = 1;
            $billamt = 0;
            $tottax = 0;
            $tottaxs = 0;
            $tottaxi = 0;
            $discc = 0;
            $toott = 0;
            $paidd = 0;
            $mes_cashtt = 0;

            $cashr = 0;
            $coupr = 0;
            $carddr = 0;
            $cpointr = 0;
            $sub2 = 0;
            $csub2 = 0;
            $ssub2 = 0;
            $isub2 = 0;

            $billamt_cc = 0;
            $tottax_cc = 0;
            $fimdis_cc = 0;
            $toott_cc = 0;
            $cashr_cc = 0;
            $coupr_cc = 0;
            $carddr_cc = 0;
            $cpointr_cc = 0;

            $billamt_rr = 0;
            $tottax_rr = 0;
            $fimdis_rr = 0;
            $toott_rr = 0;
            $cashr_rr = 0;
            $coupr_rr = 0;
            $carddr_rr = 0;
            $cpointr_rr = 0;
            $toott_ship = 0;
            $toott_ship_cc = 0;

            $billamtrr_tot = 0;
            $billamtee_tot = 0;
            $fimdis = 0;
            $custt_namef = $prd->cname;


            $oltaxl = '';

            $overal_tax = 0;

            // $return_ck = $this->builder->query("SELECT SUM(tootal) AS return_total FROM  returnss WHERE re_sales_id='" . $prd->ssid . "' AND  rsale_type='" . $ret_idd . "' ");
            $return_ck = $this->db->query("SELECT * FROM  returnss WHERE re_sales_id='" . $prd->ssid . "' AND  rsale_type='" . $ret_idd . "' ");
            // $return_ck_num = $return_ck->return_total != '' ? $return_ck->return_total : 0;
               // $return_ck = array();
            // $return_ck_num = isset($prd->return_total) && $prd->return_total != '' ? $prd->return_total : 0;

            if ($this->setting->sales_type == 2) {
                $tax_summary = $prd->tax_summary;
                $sale_items = $prd->sale_items;
            }

            $yuikk_query = ("select * from  " . $tax_summary . " where salesid='" . $prd->ssid . "' ");
            $yuikk = $this->db->query($yuikk_query, FALSE)->getResult();
            foreach ($yuikk as $yuikkf) {
                $oltaxl .= $yuikkf->taxname . '-' . number_format((float)$yuikkf->taxfrom, $this->setting->decimals, '.', '') . '<br>';
                $overal_tax = $overal_tax + $yuikkf->taxfrom;
            }




            $sslalf = $prd->discountamount;
            $discout_per = !empty($prd->discountamount) ? ($prd->discountamount * 100) / $prd->subtotal : 0;

            $mkj = $this->db->query("SELECT * from payment_mode where id!=1 order by id asc ")->getResultArray();
            foreach ($mkj as $mkjf) {

                $ll = $mkjf['id'];
                $mn = 'sss_' . $ll;
                $$mn = 0;
                if (is_array($pamode_id) && in_array($ll, $pamode_id)) {

                    // $result .= '<th style="border: 1px solid #1c76bc;"   >' . $mkjf['name'] . '</th>';
                }
            }

            $uyjhh = ("SELECT * FROM " . $sale_items . " WHERE sale_id='" . $prd->ssid . "'   ");
            // $uyjhh_query = $this->builder->where('sale_id', $prd->ssid)->get($sale_items)->result_array();
            $uyjhh = $this->db->query($uyjhh, FALSE)->getResultArray();

            $sslalf_rr =  0;
            $csubrr_2 = 0;
            $itax_rr = 0;
            foreach ($uyjhh as $uyjhhf) {
                $iknmm = $this->db->query("select * from retunn_items where sl_id='" . $uyjhhf['id'] . "' and sall_idd='" . $prd->ssid . "' and rsaleit_type='" . $ret_idd . "' ")->getResultArray();
                if (count($iknmm)  > 1) {
                    foreach ($iknmm as $retun_res) {
                        $discout_amt_rr = ($retun_res['sl_subtotal'] * floatval($discout_per)) / 100;
                        $sslalf_rr = $discout_amt_rr + $sslalf_rr;
                        $sslalff_rr = $retun_res['sl_subtotal'] - $discout_amt_rr;
                        if (intval($uyjhhf['cgst']) > 0) {
                            $ctax_rr = $sslalff_rr - ($sslalff_rr / (1 + (intval($uyjhhf['cgst']) / 100)));
                            $itax = 0;
                            $csubrr_2 = $csubrr_2 + $ctax_rr;
                        } else {
                            $ctax_rr = 0;
                            $itax_rr = $sslalff_rr - ($sslalff_rr / (1 + (intval($uyjhhf['igstt']) / 100)));
                            $csubrr_2 = $csubrr_2 + $itax_rr;
                        }
                    }
                }
                $discout_amt = $discout_per != 0 && is_numeric($discout_per) ? (intval($uyjhhf['subtotal']) * intval($discout_per)) / 100 : 0;


                $sslalff = intval($uyjhhf['subtotal']) - intval($discout_amt);
                if (intval($uyjhhf['cgst']) > 0) {
                    $ctax = $sslalff - ($sslalff / (1 + (intval($uyjhhf['cgst']) / 100)));
                    $itax = 0;
                    $csub2 = $csub2 + $ctax;
                } else {
                    $ctax = 0;
                    $itax = $sslalff - ($sslalff / (1 + (intval($uyjhhf['igstt']) / 100)));
                    $csub2 = $csub2 + $itax;
                }
            }

            $oll = explode(" ", $prd->attime);
            if ($prd->paidmethod == 6) {
                $cash = 0;
                $coup = 0;
                $cardd = 0;
                $cpoint = $prd->paid;
            } elseif ($prd->paidmethod == 1) {
                $cash = 0;
                $coup = 0;
                $cardd = $prd->paid;
                $cpoint = 0;
            } elseif ($prd->paidmethod == 10) {
                $cash = 0;
                $coup = $prd->paid;
                $cardd = 0;
                $cpoint = 0;
            } else {
                $cash = $prd->paid;
                $coup = 0;
                $cardd = 0;
                $cpoint = 0;
            }

            $pxxx = $csub2;
            $pxxxs = $ssub2;
            $pxxxi = $isub2;
            $dixxss = $prd->discount_indujul + $prd->discountamount;

            if ($prd->ssstatus == 3) {
                $bil_ststy = "style=background:#f86e50;";
                $sstaus_w = "<span class='cancel'>Cancel</span>";
            } elseif ($return_ck->getNumRows() > 0) {
                $bil_ststy = "style=background:#f86e50;";
                $sstaus_w = "<span class='return'>Return</span>";
            } else {
                $bil_ststy = '';
                $sstaus_w = "<span class='sales'>Sales</span>";
            }
            $ee = explode('~', $prd->paidmethod);
            $mes_cash = $prd->recivamt;


            $exchange_amount = '0.00';
            // if (!empty($pamode_id) && in_array($ee[0], $pamode_id)) {
            if (!empty($pamode_id) && in_array($ee[0], (array) $pamode_id)) {
                foreach ($mkj as $mkjf) {
                    $ll = $mkjf['id'];
                    $mn = 'sss_' . $ll;
                    $ee = explode('~', $prd->paidmethod);

                    if (isset($ll) && $ll != '' && in_array($ll, $pamode_id)) {
                        if ($ee[0] == $ll) {
                            if ($prd->total <= $prd->paid) {
                                $$mn = $$mn + $prd->recivamt2;
                                $exchange_amount = number_format((float)$prd->recivamt2, $this->setting->decimals, '.', ' ');
                            } else {
                                $$mn = $$mn + $prd->recivamt2;
                                $exchange_amount = number_format((float)$prd->recivamt2, $this->setting->decimals, '.', ' ');
                            }
                        } else {
                            $exchange_amount = '0.00';
                        }
                    }
                }
            } else {
                // $ddd = !empty($pamode_id) ? count($pamode_id) : 0;
                $ddd = !empty($pamode_id) ? count((array) $pamode_id) : 0;
                for ($nml = 0; $nml < $ddd; $nml++) {
                    if ($pamode_id[$nml] > 0) {

                        $exchange_amount = '0.00';
                    }
                }
            }
            $cancel_amt = 0;
            if ($prd->ssstatus == 3) {
                $cancel_amt = $prd->total;
            }
            $billamtrr = 0;
            $billamtee = 0;
            if (($return_ck->getNumRows()) > 0) {
                while ($return_sal = $return_ck->getUnbufferedRow('object')) {
                    if ($return_sal->retrn_amt_mtd == 1) {
                        $billamtrr = $billamtrr + $return_sal->sutott;
                        $billamtrr_tot = $billamtrr_tot + $return_sal->sutott;
                    } else {
                        $billamtee = $billamtee + $return_sal->sutott;
                        $sstaus_w = "<span class='exchange'>Exchange</span>";
                        $billamtee_tot = $billamtee_tot + $return_sal->sutott;
                    }
                }
            }

            // $data[] = array(
            //     $prd->ssid,
            //     $prd->ssname,
            //     $custt_namef,
            //     date("d-m-Y", strtotime($oll[0])),
            //     $prd->totalitems,
            //     number_format((float)$prd->subtotal, $this->setting->decimals, '.', ''),
            //     number_format((float)$overal_tax, $this->setting->decimals, '.', ''),
            //     $oltaxl,
            //     number_format((float)$dixxss, $this->setting->decimals, '.', ''),
            //     number_format((float)$prd->disamtssh, $this->setting->decimals, '.', ''),
            //     number_format((float)$prd->total, $this->setting->decimals, '.', ''),
            //     $sstaus_w,
            //     number_format((float)$cancel_amt, $this->setting->decimals, '.', ''),
            //     $exchange_amount,
            //     $billamtrr_tot,
            //     $billamtee
            // );
            // print_r($prd);
            // die;

            $sub_total_amount += $prd->subtotal;
            $tax_total += $overal_tax;
            $discount_total += $dixxss;
            $shiping_total += $prd->disamtssh;
            $total_amount_ += $prd->total;
            $cancel_total += $cancel_amt;
            $exchange_total += $billamtee;
            $return_total += $billamtrr;

            $grand_total_amount = $total_amount_ - ($cancel_total + $exchange_total + $return_total);
            $tr = '';
            $tr  = '<tr style="' . $bil_ststy . '">';
            $tr .= '<td>' . $prd->ssid . '</td>';
            $tr .= '<td>' . $prd->ssname . '</td>';
            $tr .= '<td>' . $prd->cname . '</td>';
            $tr .= '<td>' . (!empty($prd->selddate) ? date("d-m-Y", strtotime($prd->selddate)) : "") . '</td>';
            $tr .= '<td>' . $prd->totalitems . '</td>';
            $tr .= '<td>' . number_format((float)$prd->subtotal, $this->setting->decimals, '.', '') . '</td>';
            $tr .= '<td>' . number_format((float)$overal_tax, $this->setting->decimals, '.', '') . '</td>';
            $tr .= '<td>' . $oltaxl . '</td>';
            $tr .= '<td>' . number_format((float)$dixxss, $this->setting->decimals, '.', '') . '</td>';
            $tr .= '<td>' . number_format((float)$prd->disamtssh, $this->setting->decimals, '.', '') . '</td>';
            $tr .= '<td>' . number_format((float)$prd->total, $this->setting->decimals, '.', '') . '</td>';
            $tr .= '<td>' . $sstaus_w . '</td>';
            $tr .= '<td>' . number_format((float)$cancel_amt, $this->setting->decimals, '.', '') . '</td>';
            $tr .= '<td>' . $billamtee . '</td>';
            $tr .= '<td>' . $billamtrr . '</td>';
            $tr .= '</tr>';

            $rows[] = $tr;
        }


        echo json_encode(['tr' => $rows, 'rows' => ($count_rows), 'sub_total_amount' => $sub_total_amount, 'tax_total' => $tax_total, 'discount_total' => $discount_total, 'shiping_total' => $shiping_total, 'total_amount_' => $total_amount_, 'cancel_total' => $cancel_total, 'exchange_total' => $exchange_total, 'return_total' => $return_total, 'grand_total_amount' => $grand_total_amount]);
        $this->db->close();
        die;
    }




    protected function calculateSalesSummary($results, $setting, $db, $tax_summary, $sale_items, $ret_idd, $pamode_id)
    {
        // Logic same as your while-loop: accumulate totals
        // For brevity, here’s a placeholder — expand as needed
        $totals = [
            'sub_total_amount' => 0,
            'tax_total' => 0,
            'discount_total' => 0,
            'shiping_total' => 0,
            'total_amount_' => 0,
            'cancel_total' => 0,
            'exchange_total' => 0,
            'return_total' => 0,
            'grand_total_amount' => 0,
        ];

        foreach ($results as $prd) {
            $totals['sub_total_amount'] += $prd->subtotal;
            $totals['tax_total'] += 0; // fetch from tax_summary if needed
            $totals['discount_total'] += ($prd->discountamount + $prd->discount_indujul);
            $totals['shiping_total'] += $prd->disamtssh;
            $totals['total_amount_'] += $prd->total;

            if ($prd->status == 3) {
                $totals['cancel_total'] += $prd->total;
            }

            // Similarly add logic to compute return_total and exchange_total...
        }

        $totals['grand_total_amount'] = $totals['total_amount_'] - (
            $totals['cancel_total'] + $totals['exchange_total'] + $totals['return_total']
        );

        return $totals;
    }

    public function getsalesdailReportnew1()
    {
        $db       = Database::connect();
        $session  = session();
        $request  = $this->request;

        $start       = $request->getPost('Range');
        $end         = $request->getPost('Range1');
        $esuppr      = $request->getPost('suppr');
        $pamode_id   = $request->getPost('selectedValues') ?? [];
        $storeSelect = $request->getPost('StoresSelect');
        $storeInput  = $request->getPost('store');

        $settings  = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $storeInfo = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();
        $decimals  = $settings['decimals'] ?? 2;

        $sales        = ($settings['themblock'] == 0) ? 'sales' : 'dsales';
        $sale_items   = ($settings['themblock'] == 0) ? 'sale_items' : 'dsale_items';
        $tax_summary  = ($settings['themblock'] == 0) ? 'tax_summary' : 'dtax_summary';
        $ret_idd      = $settings['themblock'];

        $from = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
        $to   = date('Y-m-d', strtotime(str_replace('/', '-', $end)));

        $rtttfc = '';
        if ($storeSelect > 0) {
            $rtttfc = "registers.store_id = $storeSelect";
        } elseif (!empty($storeInput)) {
            $rtttfc = "registers.store_id = $storeInput";
        }

        $saleModel = new SaleModel();
        $salesData = $saleModel->fetchSalesDailyReport($sales, $sale_items, $tax_summary, $ret_idd, $from, $to, $esuppr, $pamode_id, $rtttfc);

        return view('reports/sales_daily_report', [
            'data' => $salesData,
            'settings' => $settings,
            'storeInfo' => $storeInfo,
            'pamode_id' => $pamode_id,
        ]);
    }



    public function getsalesdailReportnew()
    {
        $request = $this->request;

        $draw = $request->getPost('draw');
        $data = [];

        for ($i = 1; $i <= 10; $i++) {
            $row = [];
            for ($j = 1; $j <= 14; $j++) {
                $row[] = $i; // Simulate 14 identical numeric columns
            }
            $data[] = $row;
        }

        $output = [
            'draw' => intval($draw),
            'recordsTotal' => 10,
            'recordsFiltered' => 10,
            'data' => $data,
        ];

        return $this->response->setJSON($output);
    }


    public function getsalesdailReport()
    {
        $request = $this->request;

        $start = $request->getPost('Range');
        $end = $request->getPost('Range1');
        $esuppr = $request->getPost('suppr');
        $pamode_id = $request->getPost('selectedValues');

        $db = \Config\Database::connect();
        $builder = $db->table('settings');
        $poql = $builder->where('id', 1)->get()->getRowArray();

        $storeId = session()->get('store');
        $poss = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));
        $companyLogo = base_url('files/Setting/' . $poql['logo']);

        $sales = $poql['themblock'] == 0 ? 'sales' : 'dsales';
        $sale_items = $poql['themblock'] == 0 ? 'sale_items' : 'dsale_items';
        $tax_summary = $poql['themblock'] == 0 ? 'tax_summary' : 'dtax_summary';
        $ret_idd = $poql['themblock'];

        $rttt = $request->getPost('StoresSelect');
        $storeCondition = '';
        if ($request->getPost('store')) {
            $storeCondition = "registers.store_id=" . $request->getPost('store') . " AND ";
        } elseif ($rttt > 0) {
            $storeCondition = "registers.store_id=" . $rttt . " AND ";
        }

        $from = date('Y-m-d', strtotime($start));
        $to = date('Y-m-d', strtotime($end));

        if ($esuppr > 0) {
            $query = "
            SELECT $sales.*, $sales.id as ssid, $sales.status as ssstatus, customers.name as cname, stores.name as ssname
            FROM $sales
            LEFT JOIN registers ON $sales.register_id = registers.id
            LEFT JOIN customers ON $sales.client_id = customers.id
            LEFT JOIN stores ON registers.store_id = stores.id
            WHERE {$storeCondition}client_id = '$esuppr' AND $sales.created_at BETWEEN '$from' AND '$to'
            ORDER BY $sales.id DESC
        ";
        } elseif ($esuppr === '') {
            $query = "
            SELECT $sales.*, $sales.id as ssid, $sales.status as ssstatus, customers.name as cname, stores.name as ssname
            FROM $sales
            LEFT JOIN registers ON $sales.register_id = registers.id
            LEFT JOIN customers ON $sales.client_id = customers.id
            LEFT JOIN stores ON registers.store_id = stores.id
            WHERE {$storeCondition}$sales.created_at BETWEEN '$from' AND '$to'
            ORDER BY $sales.id DESC
        ";
        } else {
            $query = "
            SELECT $sales.*, $sales.id as ssid, $sales.status as ssstatus, customers.name as cname, stores.name as ssname
            FROM $sales
            LEFT JOIN registers ON $sales.register_id = registers.id
            LEFT JOIN customers ON $sales.client_id = customers.id
            LEFT JOIN stores ON registers.store_id = stores.id
            WHERE {$storeCondition}client_id = 0 AND $sales.created_at BETWEEN '$from' AND '$to'
            ORDER BY $sales.id DESC
        ";
        }

        $products = $db->query($query)->getResult();
        $payment_modes = $db->table('payment_mode')->where('id !=', 1)->orderBy('id', 'ASC')->get()->getResultArray();

        return view('reports/sales_daily_report', [
            'products' => $products,
            'company' => $poql['companyname'],
            'address' => $poss['adresse'] ?? '',
            'start' => $startpp,
            'end' => $endpp,
            'logo' => $companyLogo,
            'ret_idd' => $ret_idd,
            'tax_summary' => $tax_summary,
            'sale_items' => $products,
            'pamode_id' => $pamode_id,
            'payment_modes' => $payment_modes,
            'setting' => $poql, // for decimal precision
        ]);
    }


    public function getprossReport()
    {
        $request = $this->request;
        $db = \Config\Database::connect();
        $session = session();

        $start = $request->getPost('Range');
        $end = $request->getPost('Range1');
        $productId = $request->getPost('suppr');

        if (empty($start)) {
            return;
        }

        // Convert dates
        [$d, $m, $y] = explode('-', $start);
        $from = "$y-$m-$d";
        [$d2, $m2, $y2] = explode('-', $end);
        $to = "$y2-$m2-$d2";

        // Settings & Store info
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $storeId = $session->get('store');
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        // Base query
        $builder = $db->table('sale_items');
        $builder->select('*');
        $builder->where("date BETWEEN '$from' AND '$to'");
        if (is_numeric($productId) && $productId > 0) {
            $builder->where('product_id', $productId);
        }
        $builder->orderBy('id', 'DESC');
        $saleItems = $builder->get()->getResult();

        // Prepare data
        $records = [];
        foreach ($saleItems as $item) {
            $sale = $db->table('sales')->where('id', $item->sale_id)->get()->getRow();
            $product = $db->table('products')->where('id', $item->product_id)->get()->getRow();

            $hsn = $product->hsn ?? '';
            $billNo = $sale->yyear . sprintf('%05d', $item->sale_id);
            $date = date('d-m-Y', strtotime($item->date));
            $qt = $item->qt;
            $rate = number_format((float)$item->price, $settings['decimals'], '.', '');
            $discount = number_format((float)$item->dis_amt, $settings['decimals'], '.', '');
            $total = number_format((float)$item->subtotal, $settings['decimals'], '.', '');

            $records[] = [
                'bill' => $billNo,
                'hsn' => $hsn,
                'date' => $date,
                'qt' => $qt,
                'rate' => $rate,
                'discount' => $discount,
                'total' => $total,
            ];
        }

        return view('reports/sales_hsn_report', [
            'company' => $settings['companyname'] ?? '',
            'address' => $store['adresse'] ?? '',
            'start' => $start,
            'end' => $end,
            'records' => $records,
        ]);
    }

    public function getprossdReport()
    {
        $request = \Config\Services::request();
        $db = \Config\Database::connect();
        $session = session();

        $start = $request->getPost('Range');
        $end = $request->getPost('Range1');
        $esuppr = $request->getPost('suppr');

        if (empty($start)) return;

        $storeId = $session->get('store');
        $poql = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $poss = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $company = $poql['companyname'] ?? '';
        $logo = base_url('files/Setting/' . $poql['logo']);
        $address = $poss['adresse'] ?? '';

        $startDate = date("Y-m-d", strtotime(str_replace('-', '/', $start)));
        $endDate = date("Y-m-d", strtotime(str_replace('-', '/', $end)));

        $builder = $db->table('sale_items')
            ->select('*, SUM(qt) as qqt, SUM(subtotal) as ssubtotal, SUM(cgst) as ccgst, SUM(sgst) as ssgst, SUM(dis_amt) as ddis_amt, COUNT(*) as bills');

        if (!empty($esuppr)) {
            $builder->where('product_id', $esuppr);
        }

        $builder->where("`date` BETWEEN '$startDate' AND '$endDate'", null, false);

        if (!empty($esuppr)) {
            $builder->groupBy(['date', 'product_id']);
        } else {
            $builder->groupBy('product_id');
        }

        $prducts = $builder->get()->getResult();

        $data = [
            'reportTitle' => "HSN Sales Summary Reports from " . date("d-m-Y", strtotime($startDate)) . " Till " . date("d-m-Y", strtotime($endDate)),
            'company'     => $company,
            'address'     => $address,
            'products'    => $prducts,
            'setting'     => $poql
        ];

        return view('reports/sales_hsn_summary_report', $data);
    }


    public function getprossmReport()
    {
        $request = service('request');
        $session = session();
        $db = \Config\Database::connect();

        $start  = $request->getPost('Range');
        $end    = $request->getPost('Range1');
        $esuppr = $request->getPost('suppr');

        if (empty($start)) {
            return;
        }

        $startDate = date("Y-m-d", strtotime(str_replace('-', '/', $start)));
        $endDate = date("Y-m-d", strtotime(str_replace('-', '/', $end)));

        $setting = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $storeId = $session->get('store');
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();
        $storeAddress = $store['adresse'] ?? '';
        $companyLogo = base_url('files/Setting/' . $setting['logo']);

        if ($esuppr > 0) {
            $builder = $db->table('sale_items');
            $builder->select("*, SUM(qt) as qqt, SUM(subtotal) as ssubtotal, SUM(cgst) as ccgst, SUM(sgst) as ssgst, SUM(dis_amt) as ddis_amt, COUNT(*) as bills");
            $builder->where('product_id', $esuppr);
            $builder->where("date BETWEEN '{$startDate}' AND '{$endDate}'", null, false);
            $builder->groupBy(["DATE_FORMAT(date, '%Y%m')", 'product_id']);
            $prducts = $builder->get()->getResult();
        } else {
            $builder = $db->table('sale_items');
            $builder->select("*, SUM(qt) as qqt, SUM(subtotal) as ssubtotal, SUM(cgst) as ccgst, SUM(sgst) as ssgst, SUM(dis_amt) as ddis_amt, COUNT(*) as bills");
            $builder->where("date BETWEEN '{$startDate}' AND '{$endDate}'", null, false);
            $builder->groupBy(["DATE_FORMAT(date, '%Y%m')", 'product_id']);
            $prducts = $builder->get()->getResult();
        }

        $reportRows = [];
        $billamt = $tottax = $tottaxs = $tottaxi = $discc = $toott = $paidd = 0;
        $cashr = $coupr = $carddr = $cpointr = 0;

        foreach ($prducts as $prd) {
            $sale = $db->table('sales')->where('id', $prd->sale_id)->get()->getRowArray();
            $tyui = date('Y-m', strtotime($prd->date));
            $subItems = $db->table('sale_items')
                ->where('product_id', $prd->product_id)
                ->where("date BETWEEN '{$startDate}' AND '{$endDate}'", null, false)
                ->like('date', $tyui)
                ->get()->getResultArray();

            $csub2 = $ssub2 = $isub2 = 0;
            foreach ($subItems as $item) {
                $csub2 += (intval($item['subtotal2']) * intval(intval($item['cgst']))) / 100;
                $ssub2 += (intval($item['subtotal2']) * intval(intval($item['sgst']))) / 100;
                $isub2 += (intval($item['subtotal2']) * intval(intval($item['igstt']))) / 100;
            }

            $cash = $coup = $cardd = $cpoint = 0;
            switch ($prd->paidmethod) {
                case 0:
                    $cash = $prd->total;
                    break;
                case 1:
                    $cardd = $prd->total;
                    break;
                case 2:
                    $coup = $prd->total;
                    break;
                default:
                    $cpoint = $prd->total;
                    break;
            }

            $product = $db->table('products')->where('id', $prd->product_id)->get()->getRowArray();

            $reportRows[] = [
                'bills' => $prd->bills,
                'hsn' => $product['hsn'] ?? '',
                'month' => date('m-Y', strtotime($prd->date)),
                'qty' => $prd->qqt,
                'price' => $prd->price,
                'discount' => $prd->ddis_amt,
                'total' => $prd->ssubtotal
            ];

            $billamt += $prd->qqt;
            $tottax += $csub2;
            $tottaxs += $ssub2;
            $tottaxi += $isub2;
            $discc += $prd->ddis_amt;
            $toott += $prd->price;
            $paidd += $prd->ssubtotal;
            $cashr += $cash;
            $coupr += $coup;
            $carddr += $cardd;
            $cpointr += $cpoint;
        }

        return view('reports/prossm_report', [
            'company' => $setting['companyname'],
            'address' => $storeAddress,
            'logo' => $companyLogo,
            'start' => $start,
            'end' => $end,
            'rows' => $reportRows,
            'billamt' => $billamt,
            'discc' => $discc,
            'paidd' => $paidd,
            'decimals' => $setting['decimals']
        ]);
    }




    public function gettotalsalsReport_new()
    {
        $db = \Config\Database::connect();
        $request = service('request');
        $session = session();

        $start = $request->getPost('Range');
        $end = $request->getPost('Range1');
        $esuppr = $request->getPost('suppr');
        $storeSelect = $request->getPost('StoresSelect');

        if (empty($start)) return;

        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $sales = $settings['themblock'] == 0 ? 'sales' : 'dsales';
        $ret_idd = $settings['themblock'];

        $storeId = $session->get('store');
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $startDate = date('Y-m-d', strtotime($start));
        $endDate = date('Y-m-d', strtotime($end));

        $where = [];
        if ($storeSelect) {
            $where['registers.store_id'] = $storeSelect;
        }

        if ($esuppr > 0) {
            $where["$sales.client_id"] = $esuppr;
        } elseif ($esuppr === '0') {
            $where["$sales.client_id"] = 0;
        }

        $builder = $db->table($sales);
        $builder->select("
                        $sales.id as ssid,
                        DATE_FORMAT($sales.created_at, '%Y-%m-%d') as created_date,
                        $sales.selddate,
                        COUNT(*) as tbils,
                        SUM(totalitems) as noofitem,
                        SUM(subtotal) as toot,
                        SUM(CASE WHEN paidmethod=0 THEN paid ELSE 0 END) as cashh,
                        SUM(CASE WHEN paidmethod=1 THEN paid ELSE 0 END) as cardd,
                        SUM(CASE WHEN $sales.status=3 THEN total ELSE 0 END) as total_can,
                        SUM(CASE WHEN paidmethod=10 THEN paid ELSE 0 END) as coupp,
                        SUM(CASE WHEN paidmethod=6 THEN paid ELSE 0 END) as ppnt,
                        SUM(taxamount) as cgst,
                        SUM(sgsttaxamt) as sgst,
                        SUM(discountamount) as disct,
                        SUM(paid) as ttot
                    ");
        $builder->join('registers', "$sales.register_id = registers.id");
        $builder->where($where);
        $builder->where("$sales.selddate >=", $startDate);
        $builder->where("$sales.selddate <=", $endDate);
        $builder->groupBy('created_date');
        $salesData = $builder->get()->getResult();

        $reportRows = [];
        $subTotal = $totalCancel = $totalReturn = $netTotal = 0;

        foreach ($salesData as $row) {
            $taxCalc = $db->table('sale_items')
                ->select('subtotal2, cgst, sgst, igstt')
                ->where('date', $row->selddate)
                ->get()->getResultArray();

            $cgstTotal = $sgstTotal = $igstTotal = 0;
            foreach ($taxCalc as $item) {
                $cgstTotal += (intval($item['subtotal2']) * intval($item['cgst'])) / 100;
                $sgstTotal += (intval($item['subtotal2']) * intval($item['sgst'])) / 100;
                $igstTotal += (intval($item['subtotal2']) * intval($item['igstt'])) / 100;
            }

            // $return = $db->table('returnss')
            //     ->selectSum('tootal', 'rretunn')
            //     ->where('purcha_sales_id', $row->ssid)
            //     ->or_where('re_sales_id', $row->ssid)
            //     ->where('rsale_type', $ret_idd)
            //     ->get()->getRow();

            $return = $db->query("SELECT 
                                        SUM(tootal) AS rretunn
                                        FROM returnss
                                        WHERE (todate = '{$row->selddate}' OR re_sales_id = '{$row->ssid}')
                                        AND rsale_type = '{$ret_idd}';
                                        ")->getRow();

            $returnTotal = $return->rretunn ?? 0;
            $totalReturn += $returnTotal;
            $subTotal += $row->toot;
            $totalCancel += $row->total_can;

            $reportRows[] = [
                'bills' => $row->tbils,
                'date' => date('d-m-Y', strtotime($row->selddate)),
                'items' => $row->noofitem,
                'amount' => $row->toot
            ];
        }

        $netTotal = $subTotal - $totalCancel - $totalReturn;

        return view('reports/totalsales_report', [
            'company' => $settings['companyname'],
            'address' => $store['adresse'] ?? '',
            'start' => $start,
            'end' => $end,
            'rows' => $reportRows,
            'subTotal' => $subTotal,
            'cancelTotal' => $totalCancel,
            'returnTotal' => $totalReturn,
            'netTotal' => $netTotal,
            'decimals' => $settings['decimals']
        ]);
    }

    //This Function in converted from old function 
    public function gettotalsalsReport()
    {

        $start  = $this->request->getPost('Range');
        $end    = $this->request->getPost('Range1');
        $esuppr = $this->request->getPost('suppr');


        $rttt = $this->request->getPost('selectedValues');

        if ($rttt > 0) {
            $rtttfc = 'registers.store_id=' . $rttt . ' and ';
        } else {
            $rtttfc = "";
        }

        $lkmm = $this->db->query(" select * from  settings where id=1 ")->getRowArray();
        if ($lkmm['themblock'] == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
            $tax_summary = "tax_summary";
        } else {
            $sales = "dsales";
            $sale_items = "dsale_items";
            $tax_summary = "dtax_summary";
        }
        //  ".$sales."
        //  ".$sale_items."
        //  ".$tax_summary."


        $poql = $this->db->query("select * from settings where id=1 ")->getRowArray();
        $ret_idd = $poql['themblock'];
        $poss = $this->db->query("select * from stores where id='" . $this->session->get('store') . "' ")->getRowArray();
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));
        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;
        $ik_ret_total = 0;
        $rttt = $this->session->get('store');

        if ($start == 0  || $start == '') {
            exit;
            $lmm = date("Y-m-d");
            $prducts = $this->db->query("SELECT *," . $sales . ".id as ssid  FROM  " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE  $rtttfc      purdat between '$lmm' AND '$lmm'  order by purdat asc ");
        } else {
            $la322x = explode('-', $start);
            // $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];
            $la32 = date('Y-m-d', strtotime($start));
            $lax = explode('-', $end);
            // $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
            $laxg = date('Y-m-d', strtotime($end));
            if ($esuppr > 0) {
                $prducts = $this->db->query("SELECT *," . $sales . ".id as ssid, sum(Case When paidmethod=0 THEN paid ELSE 0 END) as cashh,sum(Case When paidmethod=1 THEN paid ELSE 0 END) as cardd,sum(Case When " . $sales . ".status=3 THEN total ELSE 0 END) as total_can,sum(Case When paidmethod=10 THEN paid ELSE 0 END) as coupp,sum(Case When paidmethod=6 THEN paid ELSE 0 END) as ppnt,count(*) as tbils,sum(totalitems) as noofitem,sum(subtotal) as toot,sum(taxamount) as cgst,sum(sgsttaxamt) as sgst,sum(discountamount) as disct,sum(paid) as ttot  FROM " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE   $rtttfc     client_id='$esuppr' and   created_at between '$la32' AND '$laxg'  group by created_at  ");
            } elseif ($esuppr == '') {
                // $prducts = $this->db->query("SELECT *," . $sales . ".id as ssid, sum(Case When paidmethod=0 THEN paid ELSE 0 END) as cashh,sum(Case When paidmethod=1 THEN paid ELSE 0 END) as cardd,sum(Case When " . $sales . ".status=3 THEN total ELSE 0 END) as total_can,sum(Case When paidmethod=10 THEN paid ELSE 0 END) as coupp,sum(Case When paidmethod=6 THEN paid ELSE 0 END) as ppnt,count(*) as tbils,sum(totalitems) as noofitem,sum(subtotal) as toot,sum(taxamount) as cgst,sum(sgsttaxamt) as sgst,sum(discountamount) as disct,sum(paid) as ttot  FROM " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE   $rtttfc     created_at between '$la32' AND '$laxg'  GROUP BY created_at  ");
                // echo $la32;
                // $prducts = $this->db->query("
                //                             SELECT $sales.*,
                //                                 " . $sales . ".id as ssid,
                //                                 DATE(created_at) as created_date,
                //                                 created_at,
                //                                 SUM(CASE WHEN paidmethod=0 THEN paid ELSE 0 END) as cashh,
                //                                 SUM(CASE WHEN paidmethod=1 THEN paid ELSE 0 END) as cardd,
                //                                 SUM(CASE WHEN $sales.status=3 THEN total ELSE 0 END) as total_can,
                //                                 SUM(CASE WHEN paidmethod=10 THEN paid ELSE 0 END) as coupp,
                //                                 SUM(CASE WHEN paidmethod=6 THEN paid ELSE 0 END) as ppnt,
                //                                 COUNT(*) as tbils,
                //                                 SUM(totalitems) as noofitem,
                //                                 SUM(subtotal) as toot,
                //                                 SUM(taxamount) as cgst,
                //                                 SUM(sgsttaxamt) as sgst,
                //                                 SUM(discountamount) as disct,
                //                                 SUM(paid) as ttot
                //                             FROM " . $sales . "
                //                             INNER JOIN registers ON " . $sales . ".register_id = registers.id
                //                             WHERE $rtttfc $sales.created_at BETWEEN '$la32' AND '$laxg'
                //                             GROUP BY $sales.created_at
                //                         ");


                // $prducts = $this->db->query("SELECT *," . $sales . ".id as ssid, sum(Case When paidmethod=0 THEN paid ELSE 0 END) as cashh,sum(Case When paidmethod=1 THEN paid ELSE 0 END) as cardd,sum(Case When " . $sales . ".status=3 THEN total ELSE 0 END) as total_can,sum(Case When paidmethod=10 THEN paid ELSE 0 END) as coupp,sum(Case When paidmethod=6 THEN paid ELSE 0 END) as ppnt,count(*) as tbils,sum(totalitems) as noofitem,sum(subtotal) as toot,sum(taxamount) as cgst,sum(sgsttaxamt) as sgst,sum(discountamount) as disct,sum(paid) as ttot  FROM " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE   $rtttfc     created_at between '$la32' AND '$laxg'  group by created_at  ");




                // Assuming you're inside a controller/model and have $db available.
                // $sales is your table name (string). Make sure it's trusted/whitelisted.
                $builder = $this->db->table("$sales s");

                $builder->select("s.*");
                $builder->select("SUM(CASE WHEN s.paidmethod=0 THEN s.paid ELSE 0 END) AS cashh", false);
                $builder->select("SUM(CASE WHEN s.paidmethod=1 THEN s.paid ELSE 0 END) AS cardd", false);
                $builder->select("SUM(CASE WHEN s.status=3 THEN s.total ELSE 0 END) AS total_can", false);
                $builder->select("SUM(CASE WHEN s.paidmethod=10 THEN s.paid ELSE 0 END) AS coupp", false);
                $builder->select("SUM(CASE WHEN s.paidmethod=6 THEN s.paid ELSE 0 END) AS ppnt", false);

                $builder->select("COUNT(DISTINCT s.id) AS tbils", false);
                $builder->select("SUM(s.totalitems) AS noofitem", false);
                $builder->select("SUM(s.subtotal)   AS toot", false);
                $builder->select("SUM(s.taxamount)  AS cgst", false);
                $builder->select("SUM(s.sgsttaxamt) AS sgst", false);
                $builder->select("SUM(s.discountamount) AS disct", false);
                $builder->select("SUM(s.paid)       AS ttot", false);

                $builder->join('registers r', 's.register_id = r.id', 'inner');

                // if (!empty($rtttfc)) {
                //     $builder->where($rtttfc, null, false);
                // }

                $builder->where('s.created_at >=', $la32)
                    ->where('s.created_at <=', $laxg);

                $builder->groupBy('s.created_at');

                $prducts = $builder->get();

                // $result = $query->getResult();   // objects
                // or $result = $query->getResultArray();


            } else {

                $prducts = $this->db->query("SELECT *," . $sales . ".id as ssid,sum(Case When paidmethod=0 THEN paid ELSE 0 END) as cashh,sum(Case When paidmethod=1 THEN paid ELSE 0 END) as cardd,sum(Case When " . $sales . ".status=3 THEN paid ELSE 0 END) as total_can,sum(Case When paidmethod=10 THEN paid ELSE 0 END) as coupp,sum(Case When paidmethod=6 THEN paid ELSE 0 END) as ppnt,count(*) as tbils,sum(totalitems) as noofitem,sum(subtotal) as toot,sum(taxamount) as cgst,sum(sgsttaxamt) as sgst,sum(discountamount) as disct,sum(paid) as ttot  FROM " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE  $rtttfc  client_id=0 and   created_at between '$la32' AND '$laxg'  group by created_at  ");
            }
        }
        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="9" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9"> ' . $poss['adresse'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9">Sales Summary Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

       <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;"> ' . label("Total") . ' ' . label("Bill") . ' </th>
        <th style="border: 1px solid #1c76bc;width:100px;">' . label("Date") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("NoOfItems") . '   </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . ' ' . label("Amount") . '   </th>
      

        </tr></thead><tbody>';
        $tt = 1;
        $billamt = 0;
        $tottax = 0;
        $tottaxs = 0;
        $tottaxi = 0;
        $discc = 0;
        $toott = 0;
        $paidd = 0;
        $cashr = 0;
        $coupr = 0;
        $carddr = 0;
        $cpointr = 0;

        $billamt_cc = 0;
        $toott_cc = 0;
        $cashr_cc = 0;
        $coupr_cc = 0;
        $carddr_cc = 0;
        $cpointr_cc = 0;
        $prducts = $prducts->getResult();
        foreach ($prducts as $prd) {
            $csub2 = 0;
            $ssub2 = 0;
            $isub2 = 0;


            $iklp = $this->db->query("SELECT * FROM sale_items WHERE date='" . $prd->created_at . "' ");
            while ($uyjhhf = $iklp->getUnbufferedRow('array')) {
                $csub2 = ((floatval($uyjhhf['subtotal2']) * floatval($uyjhhf['cgst'])) / 100) + $csub2;
                $ssub2 = ((floatval($uyjhhf['subtotal2']) * floatval($uyjhhf['sgst'])) / 100) + $ssub2;
                $isub2 = ((floatval($uyjhhf['subtotal2']) * floatval($uyjhhf['igstt'])) / 100) + $isub2;
            }


            $rrty_value = $this->db->query("select todate,sum(tootal) as rretunn from returnss where todate='" . $prd->created_at . "' and  rsale_type='" . $ret_idd . "' ")->getRowArray();

            $ik_ret_total = floatval($rrty_value['rretunn']) + $ik_ret_total;









            $oll = explode(" ", $prd->created_at);
            if ($prd->paidmethod == 6) {
                $cash = 0;
                $coup = 0;
                $cardd = 0;
                $cpoint = $prd->paid;
            } elseif ($prd->paidmethod == 1) {
                $cash = 0;
                $coup = 0;
                $cardd = $prd->paid;
                $cpoint = 0;
            } elseif ($prd->paidmethod == 10) {
                $cash = 0;
                $coup = $prd->paid;
                $cardd = 0;
                $cpoint = 0;
            } else {

                $cash = $prd->paid;
                $coup = 0;
                $cardd = 0;
                $cpoint = 0;
            }
            $pxxx = $csub2;
            $pxxxs = $ssub2;
            $pxxxi = $isub2;
            $dixxss = $prd->discount_indujul + $prd->discountamount;
            $result .= '<tr  >
            <td style="text-align:center;border: 1px solid #1c76bc; " >' . $prd->tbils . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; " >' .  date("d-m-Y", strtotime($prd->created_at))  . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->noofitem . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->toot, $this->setting->decimals, '.', '') . '</td>
          
           

           


            
            </tr>';
            $billamt = $billamt + $prd->toot;
            $toott = $toott + $prd->ttot;
            $cashr = $cashr + $prd->cashh;
            $coupr = $coupr + $prd->coupp;
            $carddr = $carddr + $prd->cardd;
            $cpointr = $cpointr + $prd->ppnt;

            $tottax = $tottax + $pxxx;
            $tottaxs = $tottaxs + $pxxxs;
            $tottaxi = $tottaxi + $pxxxi;
            $discc = $discc + ($prd->disct / $prd->tbils);

            $paidd = $paidd + $prd->ttot;

            $billamt_cc = $billamt_cc + $prd->total_can;

            $tt++;
        }
        $result .= '</tbody>
        <tr>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Sub Total</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$billamt, $this->setting->decimals, '.', '') . '</b></td>
          
          </tr>

            <tr>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Cancel</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$billamt_cc, $this->setting->decimals, '.', '') . '</b></td>
          
            </tr>       

            <tr>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Return</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$ik_ret_total, $this->setting->decimals, '.', '') . '</b></td>
          
            </tr>   

            <tr>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Total</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)($billamt - $billamt_cc - $ik_ret_total), $this->setting->decimals, '.', '') . '</b></td>

            </tr>
            </table>';
        echo $result;
    }


    public function gettotalsalsReport_old()
    {

        $start  = $this->input->post('Range');
        $end    = $this->input->post('Range1');
        $esuppr = $this->input->post('suppr');


        $rttt = $this->input->post('StoresSelect');

        if ($rttt > 0) {
            $rtttfc = 'registers.store_id=' . $rttt . ' and ';
        } else {
            $rtttfc = "";
        }

        $lkmm = mysql_fetch_array(mysql_query(" select * from  settings where id=1 "));
        if ($lkmm['themblock'] == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
            $tax_summary = "tax_summary";
        } else {
            $sales = "dsales";
            $sale_items = "dsale_items";
            $tax_summary = "dtax_summary";
        }
        //  ".$sales."
        //  ".$sale_items."
        //  ".$tax_summary."


        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $ret_idd = $poql['themblock'];
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));
        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;
        $ik_ret_total = 0;
        $rttt = $this->session->userdata('store');

        if ($start == 0  || $start == '') {
            exit;
            $lmm = date("Y-m-d");
            $prducts = mysql_query("SELECT *," . $sales . ".id as ssid  FROM  " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE  $rtttfc      purdat between '$lmm' AND '$lmm'  order by purdat asc ");
        } else {
            $la322x = explode('-', $start);
            $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];
            $lax = explode('-', $end);
            $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
            if ($esuppr > 0) {




                $prducts = mysql_query("SELECT *," . $sales . ".id as ssid, sum(Case When paidmethod=0 THEN paid ELSE 0 END) as cashh,sum(Case When paidmethod=1 THEN paid ELSE 0 END) as cardd,sum(Case When " . $sales . ".status=3 THEN total ELSE 0 END) as total_can,sum(Case When paidmethod=10 THEN paid ELSE 0 END) as coupp,sum(Case When paidmethod=6 THEN paid ELSE 0 END) as ppnt,count(*) as tbils,sum(totalitems) as noofitem,sum(subtotal) as toot,sum(taxamount) as cgst,sum(sgsttaxamt) as sgst,sum(discountamount) as disct,sum(paid) as ttot  FROM " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE   $rtttfc     client_id='$esuppr' and   created_at between '$la32' AND '$laxg'  group by created_at  ");
            } elseif ($esuppr == '') {




                $prducts = mysql_query("SELECT *," . $sales . ".id as ssid, sum(Case When paidmethod=0 THEN paid ELSE 0 END) as cashh,sum(Case When paidmethod=1 THEN paid ELSE 0 END) as cardd,sum(Case When " . $sales . ".status=3 THEN total ELSE 0 END) as total_can,sum(Case When paidmethod=10 THEN paid ELSE 0 END) as coupp,sum(Case When paidmethod=6 THEN paid ELSE 0 END) as ppnt,count(*) as tbils,sum(totalitems) as noofitem,sum(subtotal) as toot,sum(taxamount) as cgst,sum(sgsttaxamt) as sgst,sum(discountamount) as disct,sum(paid) as ttot  FROM " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE   $rtttfc     created_at between '$la32' AND '$laxg'  group by created_at  ");
            } else {

                $prducts = mysql_query("SELECT *," . $sales . ".id as ssid,sum(Case When paidmethod=0 THEN paid ELSE 0 END) as cashh,sum(Case When paidmethod=1 THEN paid ELSE 0 END) as cardd,sum(Case When " . $sales . ".status=3 THEN paid ELSE 0 END) as total_can,sum(Case When paidmethod=10 THEN paid ELSE 0 END) as coupp,sum(Case When paidmethod=6 THEN paid ELSE 0 END) as ppnt,count(*) as tbils,sum(totalitems) as noofitem,sum(subtotal) as toot,sum(taxamount) as cgst,sum(sgsttaxamt) as sgst,sum(discountamount) as disct,sum(paid) as ttot  FROM " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE  $rtttfc  client_id=0 and   created_at between '$la32' AND '$laxg'  group by created_at  ");
            }
        }
        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="9" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9"> ' . $poss['adresse'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9">Sales Summary Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

       <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;"> ' . label("Total") . ' ' . label("Bill") . ' </th>
        <th style="border: 1px solid #1c76bc;width:100px;">' . label("Date") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("NoOfItems") . '   </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . ' ' . label("Amount") . '   </th>
      
    

        
        
        </tr></thead><tbody>';
        $tt = 1;
        $billamt = 0;
        $tottax = 0;
        $tottaxs = 0;
        $tottaxi = 0;
        $discc = 0;
        $toott = 0;
        $paidd = 0;
        $cashr = 0;
        $coupr = 0;
        $carddr = 0;
        $cpointr = 0;

        $billamt_cc = 0;
        $toott_cc = 0;
        $cashr_cc = 0;
        $coupr_cc = 0;
        $carddr_cc = 0;
        $cpointr_cc = 0;

        while ($prd = mysql_fetch_object($prducts)) {
            $csub2 = 0;
            $ssub2 = 0;
            $isub2 = 0;


            $iklp = mysql_query("select * from sale_items where date='" . $prd->created_at . "' ");
            while ($uyjhhf = mysql_fetch_array($iklp)) {
                $csub2 = (($uyjhhf['subtotal2'] * $uyjhhf['cgst']) / 100) + $csub2;
                $ssub2 = (($uyjhhf['subtotal2'] * $uyjhhf['sgst']) / 100) + $ssub2;
                $isub2 = (($uyjhhf['subtotal2'] * $uyjhhf['igstt']) / 100) + $isub2;
            }


            $rrty_value = mysql_fetch_array(mysql_query("select todate,sum(tootal) as rretunn from returnss where todate='" . $prd->created_at . "' and  rsale_type='" . $ret_idd . "' "));

            $ik_ret_total = floatval($rrty_value['rretunn']) + $ik_ret_total;









            $oll = explode(" ", $prd->attime);
            if ($prd->paidmethod == 6) {
                $cash = 0;
                $coup = 0;
                $cardd = 0;
                $cpoint = $prd->paid;
            } elseif ($prd->paidmethod == 1) {
                $cash = 0;
                $coup = 0;
                $cardd = $prd->paid;
                $cpoint = 0;
            } elseif ($prd->paidmethod == 10) {
                $cash = 0;
                $coup = $prd->paid;
                $cardd = 0;
                $cpoint = 0;
            } else {

                $cash = $prd->paid;
                $coup = 0;
                $cardd = 0;
                $cpoint = 0;
            }
            $pxxx = $csub2;
            $pxxxs = $ssub2;
            $pxxxi = $isub2;
            $dixxss = $prd->discount_indujul + $prd->discountamount;
            $result .= '<tr  >
            <td style="text-align:center;border: 1px solid #1c76bc; " >' . $prd->tbils . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; " >' .  date("d-m-Y", strtotime($prd->created_at))  . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->noofitem . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->toot, $this->setting->decimals, '.', '') . '</td>
          
           

           


            
            </tr>';
            $billamt = $billamt + $prd->toot;
            $toott = $toott + $prd->ttot;
            $cashr = $cashr + $prd->cashh;
            $coupr = $coupr + $prd->coupp;
            $carddr = $carddr + $prd->cardd;
            $cpointr = $cpointr + $prd->ppnt;

            $tottax = $tottax + $pxxx;
            $tottaxs = $tottaxs + $pxxxs;
            $tottaxi = $tottaxi + $pxxxi;
            $discc = $discc + ($prd->disct / $prd->tbils);


            $paidd = $paidd + $prd->ttot;




            $billamt_cc = $billamt_cc + $prd->total_can;





            $tt++;
        }
        $result .= '</tbody>
        <tr>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Sub Total</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$billamt, $this->setting->decimals, '.', '') . '</b></td>
          
          </tr>

            <tr>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Cancel</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$billamt_cc, $this->setting->decimals, '.', '') . '</b></td>
          

          

        

            </tr>       

            <tr>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Return</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$ik_ret_total, $this->setting->decimals, '.', '') . '</b></td>
            </tr>   
            <tr>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Toatl</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)($billamt - $billamt_cc - $ik_ret_total), $this->setting->decimals, '.', '') . '</b></td>
            </tr>


            </table>';
        echo $result;
    }




    public function gettalsalseport()
    {
        $db = \Config\Database::connect();
        $request = service('request');
        $session = session();

        $start = $request->getPost('Range');
        $end = $request->getPost('Range1');
        $esuppr = $request->getPost('suppr');
        $storeSelect = $request->getPost('StoresSelect');

        // $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
        // $endDate = date('Y-m-d', strtotime(str_replace('/', '-', $end)));

        $startDate = date('Y-m-d', strtotime($start));
        $endDate = date('Y-m-d', strtotime($end));

        $setting = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $sales = $setting['themblock'] == 0 ? 'sales' : 'dsales';
        $sales_item = $setting['themblock'] == 0 ? 'sale_items' : 'dsale_items';
        $ret_idd = $setting['themblock'];

        $store = $db->table('stores')->where('id', $session->get('store'))->get()->getRowArray();

        $where = [];
        if ($storeSelect > 0) {
            $where['registers.store_id'] = $storeSelect;
        }
        if ($esuppr != '') {
            $where["s.client_id"] = $esuppr;
        }
        $table_alies = 's';
        $builder = $db->table("$sales s");
        $builder->select("
        DATE_FORMAT(s.created_at, '%Y-%m') as month_key,
        COUNT(*) as tbils,
        SUM(totalitems) as noofitem,
        SUM(subtotal) as toot,
        SUM(paid) as ttot,
        SUM(CASE WHEN s.status=3 THEN paid ELSE 0 END) as total_can,
        SUM(CASE WHEN paidmethod=0 THEN paid ELSE 0 END) as cashh,
        SUM(CASE WHEN paidmethod LIKE '1~%' THEN paid ELSE 0 END) as cardd,
        SUM(CASE WHEN paidmethod LIKE '10~%' THEN paid ELSE 0 END) as coupp,
        SUM(CASE WHEN paidmethod LIKE '6~%' THEN paid ELSE 0 END) as ppnt,
        SUM(taxamount) as cgst,
        SUM(sgsttaxamt) as sgst,
        SUM(discountamount) as disct
    ");
        $builder->join('registers', "s.register_id = registers.id");
        $builder->where($where);
        $builder->where("s.selddate >=", $startDate);
        $builder->where("s.selddate <=", $endDate);
        // $builder->where("selddate BETWEEN '$startDate' AND '$endDate'");
        $builder->groupBy("month_key");

        $rows = $builder->get()->getResult();
        // print_r($rows);
        // die;

        $summary = [];
        $subTotal = $cancelTotal = $returnTotal = 0;

        foreach ($rows as $row) {
            $monthLike = date('Y-m', strtotime($row->month_key));
            $taxes = $db->table("$sales_item")
                ->select('subtotal2, cgst, sgst, igstt')
                ->like('date', $monthLike, 'after')
                ->get()->getResultArray();

            $cgst = $sgst = $igst = 0;
            foreach ($taxes as $taxRow) {
                $cgst += (intval($taxRow['subtotal2']) * intval($taxRow['cgst'])) / 100;
                $sgst += (intval($taxRow['subtotal2']) * intval($taxRow['sgst'])) / 100;
                $igst += (intval($taxRow['subtotal2']) * intval($taxRow['igstt'])) / 100;
            }

            $returns = $db->table('returnss')
                ->selectSum('tootal', 'rretunn')
                ->like('todate', $monthLike, 'after')
                ->where('rsale_type', $ret_idd)
                ->get()->getRow();

            $returnAmt = $returns->rretunn ?? 0;
            $returnTotal += $returnAmt;
            $subTotal += $row->toot;
            $cancelTotal += $row->total_can;

            $summary[] = [
                'month' => date('m-Y', strtotime($row->month_key . '-01')),
                'bills' => $row->tbils,
                'items' => $row->noofitem,
                'amount' => $row->toot
            ];
        }

        $netTotal = $subTotal - $cancelTotal - $returnTotal;

        return view('reports/monthly_sales_summary', [
            'company' => $setting['companyname'],
            'address' => $store['adresse'] ?? '',
            'start' => $start,
            'end' => $end,
            'rows' => $summary,
            'subTotal' => $subTotal,
            'cancelTotal' => $cancelTotal,
            'returnTotal' => $returnTotal,
            'netTotal' => $netTotal,
            'decimals' => $setting['decimals']
        ]);
    }




    public function getprofitdailReport()
    {
        $db = \Config\Database::connect();
        $request = service('request');
        $session = session();

        $start = $request->getPost('Range');
        $end = $request->getPost('Range1');

        $storeId = $session->get('store');
        $settings = $db->table('settings')->where('id', 1)->get()->getRowArray();
        $store = $db->table('stores')->where('id', $storeId)->get()->getRowArray();

        $startDate = date('Y-m-d', strtotime(str_replace('/', '-', $start)));
        $endDate = date('Y-m-d', strtotime(str_replace('/', '-', $end)));

        $summary = [];
        $ttt_tot = $sss_tot = $cann_tot = $rett_tot = $fff_tot = $total_amt_tot = 0;

        while (strtotime($startDate) <= strtotime($endDate)) {
            $ttt = $db->table('purchases')->selectSum('total', 'pur_amt')
                ->where('store_id', $storeId)
                ->where('date', $startDate)
                ->get()->getRow()->pur_amt ?? 0;

            $sss = $db->table('sales')
                ->join('registers', 'registers.id=sales.register_id')
                ->selectSum('total', 'sal_total')
                ->where('registers.store_id', $storeId)
                ->where('sales.created_at', $startDate)
                ->get()->getRow()->sal_total ?? 0;

            $cann = $db->table('sales')
                ->join('registers', 'registers.id=sales.register_id')
                ->selectSum('total', 'sal_total')
                ->where('registers.store_id', $storeId)
                ->where('sales.created_at', $startDate)
                ->where('sales.status', 3)
                ->get()->getRow()->sal_total ?? 0;

            $rett = $db->table('retunn_items')->selectSum('sl_subtotal', 'ren_tot')
                ->where('store_idsi', $storeId)
                ->where('to_datte', $startDate)
                ->get()->getRow()->ren_tot ?? 0;

            $fff = $db->table('goodsitems')->selectSum('totprice', 'ggod_tota')
                ->where('datea', $startDate)
                ->get()->getRow()->ggod_tota ?? 0;

            $total_amt = $sss - $ttt - $cann - $rett + $fff;

            $summary[] = [
                'date' => date('d-m-Y', strtotime($startDate)),
                'purchase' => $ttt,
                'sales' => $sss,
                'cancel' => $cann,
                'return' => $rett,
                'goodsout' => $fff,
                'profit' => $total_amt
            ];

            $ttt_tot += $ttt;
            $sss_tot += $sss;
            $cann_tot += $cann;
            $rett_tot += $rett;
            $fff_tot += $fff;
            $total_amt_tot += $total_amt;

            $startDate = date('Y-m-d', strtotime("+1 day", strtotime($startDate)));
        }

        return view('reports/profit_daily_report', [
            'company' => $settings['companyname'],
            'address' => $store['adresse'] ?? '',
            'start' => $start,
            'end' => $end,
            'rows' => $summary,
            'totals' => [
                'purchase' => $ttt_tot,
                'sales' => $sss_tot,
                'cancel' => $cann_tot,
                'return' => $rett_tot,
                'goodsout' => $fff_tot,
                'profit' => $total_amt_tot,
            ],
            'decimals' => $settings['decimals']
        ]);
    }



    // public function getccdReport_fastt()
    // {


    //     $storeId = session()->get('store');
    //     $db = \Config\Database::connect();
    //     $request = \Config\Services::request();
    //     $product_id       = $request->getPost('product_id');
    //     $start       = $request->getPost('start');
    //     $end       = $request->getPost('end');

    //     $totalprofit = 0;

    //     $startpp = date("Y-m-d", strtotime($start));
    //     $endpp = date("Y-m-d", strtotime($end));
    //     //$prduct = Product::find($product_id);

    //     $lkmm = $this->db->query(" select * from  settings where id=1 ")->getRowArray();
    //     if (isset($this->setting->themblock) && $this->setting->themblock == 0) {
    //         $sales = "sales";
    //         $sale_items = "sale_items";
    //         $tax_summary = "tax_summary";
    //     } else {
    //         $sales = "dsales";
    //         $sale_items = "dsale_items";
    //         $tax_summary = "dtax_summary";
    //     }
    //     //  ".$sales."
    //     //  ".$sale_items."
    //     //  ".$tax_summary."


    //     $poql = $this->db->query("select * from settings where id=1 ")->getResultArray();
    //     $poss = $db->query("SELECT * FROM stores WHERE id = ?", [$storeId])->getResultArray();

    //     $logoPath = $poql['logo'] ?? 'default.png';
    //     $kmmokk = base_url('files/Setting/' . $logoPath);



    //     $storei_ddd = session()->get('store');

    //     $builder = $db->table("$sale_items s");
    //     $builder->select("
    //         p.*, 
    //         c.name AS ccc, 
    //         p.name AS pprd,
    //         SUM(s.qt) AS ttt,
    //         SUM(CASE WHEN s.cancel_status = 1 THEN s.qt ELSE 0 END) AS qt_cancel
    //     ");
    //     $builder->join('products p', 'p.id = s.product_id');
    //     $builder->join('categories c', 'p.category = c.id');
    //     $builder->where('s.store_irrdd', $storei_ddd);
    //     $builder->where("s.date >=", $startpp);
    //     $builder->where("s.date <=", $endpp);

    //     if ($product_id > 0) {
    //         $builder->where('p.category', $product_id);
    //     }

    //     $builder->groupBy(['s.product_id', 'c.id']);
    //     $builder->orderBy('ttt', 'DESC');

    //     $prducts = $builder->get()->getResultArray();

    //     $result = '
    //         <table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
    //         <thead><tr class="hideme"><th colspan="6" style="text-align:center; " >' . (isset($poss['companyname']) ? $poss['companyname'] : "") . '</th></tr>
    //         <tr class="hideme" style="text-align:center; " ><th colspan="6"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
    //         <tr class="hideme" style="text-align:center; " ><th colspan="6">Fast Moving Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

    //         <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
    //         <th style="border: 1px solid #1c76bc;">' . label("Category") . '</th>
    //         <th style="border: 1px solid #1c76bc;">' . label("Product") . '</th>
    //         <th style="border: 1px solid #1c76bc;text-align:center;">' . label("Sales") . '</th>
    //         <th style="border: 1px solid #1c76bc;text-align:center;">' . label("Cancel") . '</th>
    //         <th style="border: 1px solid #1c76bc;text-align:center;">' . label("Return") . '</th>
    //         <th style="border: 1px solid #1c76bc;text-align:center;">' . label("Total") . ' ' . label("Sales") . '</th>

    //     </tr></thead><tbody>';


    //     foreach ($prducts as $prd) {


    //         $sl_newqtf = $this->db->query("select *,sum(sl_newqt) as r_retun from retunn_items where prodd_ids='" . $prd->product_id . "' and  store_idsi='$storei_ddd' and  to_datte between '$startpp' AND '$endpp'  ")->getResultArray();

    //         $sl_newqtf_qty = intval($sl_newqtf['r_retun']);


    //         $final_qt = intval($prd->ttt) - intval($prd->qt_cancel) - intval($sl_newqtf_qty);


    //         $result .= '<tr style="border: 1px solid #1c76bc;">
    //         <td style="border: 1px solid #1c76bc;">' . $prd->ccc . '</td>
    //         <td style="border: 1px solid #1c76bc;">' . $prd->pprd . '</td>
    //         <td style="border: 1px solid #1c76bc;text-align:center; ">' . $prd->ttt . ' </td>
    //         <td style="border: 1px solid #1c76bc;text-align:center; ">' . $prd->qt_cancel . ' </td>
    //         <td style="border: 1px solid #1c76bc;text-align:center; ">' . $sl_newqtf_qty . ' </td>
    //         <td style="border: 1px solid #1c76bc;text-align:center; ">' . $final_qt . ' </td>
    //         </tr>';
    //     }

    //     $result .= '</tbody></table>';

    //     echo $result;
    // }




    public function getccdReport_fastt()
    {
        $storeId = session()->get('store');
        $db = \Config\Database::connect();
        $request = \Config\Services::request();
        $product_id = $this->request->getPost('product_id');
        $start      = $this->request->getPost('start');
        $end        = $this->request->getPost('end');
        $totalprofit = 0;

        $startpp = date("Y-m-d", strtotime($start));
        $endpp = date("Y-m-d", strtotime($end));
        //$prduct = Product::find($product_id);

        $lkmm = $this->db->query(" select * from  settings where id=1 ")->getRowArray();
        if (isset($this->setting->themblock) && $this->setting->themblock == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
            $tax_summary = "tax_summary";
        } else {
            $sales = "dsales";
            $sale_items = "dsale_items";
            $tax_summary = "dtax_summary";
        }
        //  ".$sales."
        //  ".$sale_items."
        //  ".$tax_summary."


        $poql = $this->db->query("select * from settings where id=1 ")->getRowArray();
        $poss =  $this->db->query("select * from stores where id = ?", [$storeId])->getRowArray();
        $logoPath = isset($poql['logo']) ? $poql['logo'] : '';
        $kmmokk = base_url('files/Setting/' . $logoPath);

        $storei_ddd = session()->get('store');



        if ($product_id > 0) {
            $prducts = $this->db->query("select *,sum(qt) as ttt,sum(Case When cancel_status=1 THEN qt ELSE 0 END) as qt_cancel,c.name ccc,p.name as pprd
                    from products p, " . $sale_items . " s, categories c
                        where p.id = s.product_id and p.category = c.id and  p.category='$product_id' and  s.store_irrdd='$storei_ddd'  and s.date between '$startpp' AND '$endpp'  group by product_id,c.id order by ttt desc")->getResult();
        } else {
            $prducts = $this->db->query("select *,sum(qt) as ttt,sum(Case When cancel_status=1 THEN qt ELSE 0 END) as qt_cancel,c.name ccc,p.name as pprd
                                from products p, " . $sale_items . " s, categories c
                            where p.id = s.product_id and p.category = c.id and  s.store_irrdd='$storei_ddd' and s.date between '$startpp' AND '$endpp'  group by product_id,c.id order by ttt desc")->getResult();
        }

        $result = '
            <table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
            <thead><tr class="hideme"><th colspan="6" style="text-align:center; " >' . (isset($poql['companyname']) ? $poql['companyname'] : "")  . '</th></tr>
            <tr class="hideme" style="text-align:center; " ><th colspan="6"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
            <tr class="hideme" style="text-align:center; " ><th colspan="6">Fast Moving Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

            <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
            <th style="border: 1px solid #1c76bc;">' . label("Category") . '</th>
            <th style="border: 1px solid #1c76bc;">' . label("Product") . '</th>
            <th style="border: 1px solid #1c76bc;text-align:center;">' . label("Sales") . '</th>
            <th style="border: 1px solid #1c76bc;text-align:center;">' . label("Cancel") . '</th>
            <th style="border: 1px solid #1c76bc;text-align:center;">' . label("Return") . '</th>
            <th style="border: 1px solid #1c76bc;text-align:center;">' . label("Total") . ' ' . label("Sales") . '</th>

        </tr></thead><tbody>';

        foreach ($prducts as $prd) {


            $sl_newqtf = $this->db->query("select *,sum(sl_newqt) as r_retun from retunn_items where prodd_ids='" . $prd->product_id . "' and  store_idsi='$storei_ddd' and  to_datte between '$startpp' AND '$endpp'  ")->getRowArray();

            $sl_newqtf_qty = intval($sl_newqtf['r_retun']);


            $final_qt = intval($prd->ttt) - intval($prd->qt_cancel) - intval($sl_newqtf_qty);


            $result .= '<tr style="border: 1px solid #1c76bc;">
            <td style="border: 1px solid #1c76bc;">' . $prd->ccc . '</td>
            <td style="border: 1px solid #1c76bc;">' . $prd->pprd . '</td>
            <td style="border: 1px solid #1c76bc;text-align:center; ">' . $prd->ttt . ' </td>
            <td style="border: 1px solid #1c76bc;text-align:center; ">' . $prd->qt_cancel . ' </td>
            <td style="border: 1px solid #1c76bc;text-align:center; ">' . $sl_newqtf_qty . ' </td>
            <td style="border: 1px solid #1c76bc;text-align:center; ">' . $final_qt . ' </td>
            </tr>';
        }

        $result .= '</tbody></table>';

        echo $result;
    }

    /**
     * ===== Closing Stock Report (server-side grid) =====
     *
     * Replaces the old getRegrtstoreall()/reports/closing_stock_report.php
     * flow (left in place, untouched, as dead code) which recomputed the
     * stock ledger with ~16 raw/builder queries PER PRODUCT ROW inside a
     * PHP foreach loop (confirmed against a 2,868-row products table - that
     * is on the order of thousands of queries for a single page fetch, and
     * tens of thousands if its hardcoded ->limit(100, ...) cap were ever
     * lifted). It also string-interpolated the store filter directly into
     * two raw $db->query() calls (SQL injection via the storesSelect POST
     * field), and silently fell back to the current session's store
     * whenever "All" was selected, so the "All" option never actually
     * aggregated across stores.
     *
     * The replacement here keeps the exact same ledger formula (Initial /
     * Opening / Purchase / Sales / Cancel / Return / Closing / Value, and
     * the same date-comparison operators for "between range" vs "till end
     * date"), but computes it as a handful of GROUP BY aggregate queries
     * scoped to just the current page's product IDs (paginate first, then
     * batch-enrich - same pattern as attachTaxAndReturns() above for Sales
     * Report), all through the query builder (no string interpolation), and
     * makes "All stores" a real cross-store aggregate (no store filter
     * applied at all) instead of defaulting to the session's store.
     */
    private function stockReportFilters(): array
    {
        $request = service('request');
        $start = trim((string) $request->getPost('start'));
        $end   = trim((string) $request->getPost('endd'));

        return [
            'start' => $start !== '' ? date('Y-m-d', strtotime($start)) : date('Y-m-d'),
            'end'   => $end !== '' ? date('Y-m-d', strtotime($end)) : date('Y-m-d'),
            // '' means "All stores" - a real cross-store aggregate (no
            // store filter applied), not a fallback to the session store.
            'store' => trim((string) $request->getPost('storesSelect')),
        ];
    }

    /**
     * Client column index -> DB column, for the columns backed directly by
     * `products` (orderable/searchable via SQL). The ledger columns
     * (Initial/Opening/Purchase/Sales/Cancel/Return/Closing/Value) are
     * computed after pagination (see attachStockLedger()), so they're
     * intentionally absent here - same convention as Sales Report's
     * Tax/Returns columns.
     */
    private function stockColumnMap(): array
    {
        return [0 => 'pr.id', 1 => 'pr.code', 2 => 'pr.name'];
    }

    private function buildStockBaseQuery(string $search, array $colFilters = [])
    {
        $db = db_connect();
        $columns = $this->stockColumnMap();

        $builder = $db->table('products pr')->select('pr.id, pr.code, pr.name, pr.price');

        if ($search !== '') {
            $builder->groupStart()
                ->like('pr.name', $search)
                ->orLike('pr.code', $search)
                ->orWhere('pr.id', $search)
                ->groupEnd();
        }
        foreach ($colFilters as $i => $val) {
            if (isset($columns[$i])) {
                $builder->like($columns[$i], $val);
            }
        }

        return $builder;
    }

    /**
     * SUM($sumCol) grouped by $idCol, scoped to $ids and (optionally) a
     * store, returned as [product_id => total]. $whereTriples is a list of
     * [column, operator, value] applied as additional WHERE clauses (e.g.
     * the tyoftrans/cancel_status/date-range conditions each ledger metric
     * needs) - always via the query builder's parameter binding, never
     * string-interpolated.
     */
    private function groupedLedgerSum(string $table, string $idCol, string $sumCol, array $ids, string $storeCol, string $store, array $whereTriples = []): array
    {
        if (empty($ids)) {
            return [];
        }
        $db = db_connect();
        $builder = $db->table($table)
            ->select("$idCol as pid, SUM($sumCol) as total")
            ->whereIn($idCol, $ids)
            ->groupBy($idCol);

        if ($store !== '') {
            $builder->where($storeCol, $store);
        }
        foreach ($whereTriples as [$col, $op, $val]) {
            $builder->where("$col $op", $val);
        }

        $out = [];
        foreach ($builder->get()->getResultArray() as $r) {
            $out[(int) $r['pid']] = (float) $r['total'];
        }
        return $out;
    }

    /**
     * Attaches the full stock ledger (Initial/Opening/Purchase/Sales/
     * Cancel/Return/Closing/Value) to each row in $rows, for the given
     * date-range/store filters. Exactly 10 grouped queries total,
     * regardless of how many rows are in $rows (bounded by page size).
     */
    private function attachStockLedger(array $rows, array $f): array
    {
        if (empty($rows)) {
            return $rows;
        }
        $ids = array_map('intval', array_column($rows, 'id'));
        $store = $f['store'];
        $start = $f['start'];
        $end   = $f['end'];

        $initial          = $this->groupedLedgerSum('stock_transfer', 'pro_id', 'qty', $ids, 'store_id', $store, [['tyoftrans', '=', 5]]);
        $initialStocksT0  = $this->groupedLedgerSum('stocks', 'product_id', 'quantity', $ids, 'store_id', $store, [['type', '=', 0]]);
        $purchaseBetween  = $this->groupedLedgerSum('stock_transfer', 'pro_id', 'qty', $ids, 'store_id', $store, [['tyoftrans', '=', 1], ['date', '>=', $start], ['date', '<=', $end]]);
        $salesBetween     = $this->groupedLedgerSum('sale_items', 'product_id', 'qt', $ids, 'store_irrdd', $store, [['date', '>=', $start], ['date', '<=', $end]]);
        $cancelBetween    = $this->groupedLedgerSum('sale_items', 'product_id', 'qt', $ids, 'store_irrdd', $store, [['cancel_status', '=', 1], ['date', '>=', $start], ['date', '<=', $end]]);
        $returnBetween    = $this->groupedLedgerSum('retunn_items', 'prodd_ids', 'sl_newqt', $ids, 'store_idsi', $store, [['to_datte', '>=', $start], ['to_datte', '<=', $end]]);
        $salesTillEnd     = $this->groupedLedgerSum('sale_items', 'product_id', 'qt', $ids, 'store_irrdd', $store, [['date', '<=', $end]]);
        $purchaseTillEnd  = $this->groupedLedgerSum('stock_transfer', 'pro_id', 'qty', $ids, 'store_id', $store, [['tyoftrans', '=', 1], ['date', '<=', $end]]);
        $cancelTillEnd    = $this->groupedLedgerSum('sale_items', 'product_id', 'qt', $ids, 'store_irrdd', $store, [['cancel_status', '=', 1], ['date', '<=', $end]]);
        $returnTillEnd    = $this->groupedLedgerSum('retunn_items', 'prodd_ids', 'sl_newqt', $ids, 'store_idsi', $store, [['to_datte', '<=', $end]]);

        foreach ($rows as &$row) {
            $id = (int) $row['id'];
            $initialQty = $initial[$id] ?? 0;

            $row['initial']  = $initialQty;
            $row['opening']  = $initialQty + ($initialStocksT0[$id] ?? 0);
            $row['purchase'] = $purchaseBetween[$id] ?? 0;
            $row['sales']    = $salesBetween[$id] ?? 0;
            $row['cancel']   = $cancelBetween[$id] ?? 0;
            $row['return']   = $returnBetween[$id] ?? 0;
            $row['closing']  = $initialQty - ($salesTillEnd[$id] ?? 0) + ($purchaseTillEnd[$id] ?? 0) + ($cancelTillEnd[$id] ?? 0) + ($returnTillEnd[$id] ?? 0);
            $row['value']    = $row['closing'] * (float) $row['price'];
        }
        unset($row);

        return $rows;
    }

    public function getClosingStockReport()
    {
        $request = service('request');
        $draw   = intval($request->getPost('draw'));
        $start  = intval($request->getPost('start'));
        $length = intval($request->getPost('length'));
        $orderCol = $request->getPost('order')[0]['column'] ?? 2;
        $orderDir = $request->getPost('order')[0]['dir'] ?? 'asc';
        $search = trim((string) ($request->getPost('search')['value'] ?? ''));

        $f = $this->stockReportFilters();
        $columns = $this->stockColumnMap();
        $orderBy = $columns[$orderCol] ?? 'pr.name';

        $colFilters = $this->columnSearchValues(array_keys($columns));

        $db = db_connect();
        $recordsTotal = $db->table('products')->countAllResults();
        $recordsFiltered = $this->buildStockBaseQuery($search, $colFilters)->countAllResults(false);

        $rows = $this->buildStockBaseQuery($search, $colFilters)
            ->orderBy($orderBy, $orderDir)
            ->limit($length, $start)
            ->get()
            ->getResultArray();

        $rows = $this->attachStockLedger($rows, $f);

        $decimals = (int) ($this->setting->decimals ?? 2);
        $data = [];
        foreach ($rows as $r) {
            $data[] = [
                (int) $r['id'],
                esc($r['code']),
                esc($r['name']),
                number_format((float) $r['initial'], $decimals, '.', ''),
                number_format((float) $r['opening'], $decimals, '.', ''),
                number_format((float) $r['purchase'], $decimals, '.', ''),
                number_format((float) $r['sales'], $decimals, '.', ''),
                number_format((float) $r['cancel'], $decimals, '.', ''),
                number_format((float) $r['return'], $decimals, '.', ''),
                number_format((float) $r['closing'], $decimals, '.', ''),
                number_format((float) $r['price'], $decimals, '.', ''),
                number_format((float) $r['value'], $decimals, '.', ''),
            ];
        }

        return $this->response->setJSON([
            'draw' => $draw,
            'recordsTotal' => $recordsTotal,
            'recordsFiltered' => $recordsFiltered,
            'data' => $data,
        ]);
    }

    public function exportClosingStockReport()
    {
        $request = service('request');
        $format = $request->getVar('format') === 'xlsx' ? 'xlsx' : 'csv';
        $search = trim((string) $request->getVar('search'));
        $f = $this->stockReportFilters();
        $decimals = (int) ($this->setting->decimals ?? 2);

        $headers = ['ID', 'Code', 'Product Name', 'Initial', 'Opening', 'Purchase', 'Sales', 'Cancel', 'Return', 'Closing', 'Price', 'Value'];
        $rowMapper = function (array $r) use ($decimals) {
            return [
                $r['id'],
                $r['code'],
                $r['name'],
                number_format((float) $r['initial'], $decimals, '.', ''),
                number_format((float) $r['opening'], $decimals, '.', ''),
                number_format((float) $r['purchase'], $decimals, '.', ''),
                number_format((float) $r['sales'], $decimals, '.', ''),
                number_format((float) $r['cancel'], $decimals, '.', ''),
                number_format((float) $r['return'], $decimals, '.', ''),
                number_format((float) $r['closing'], $decimals, '.', ''),
                number_format((float) $r['price'], $decimals, '.', ''),
                number_format((float) $r['value'], $decimals, '.', ''),
            ];
        };
        $fetchBatch = function (int $batch, int $offset) use ($search, $f) {
            $rows = $this->buildStockBaseQuery($search)->orderBy('pr.name', 'asc')->limit($batch, $offset)->get()->getResultArray();
            return $this->attachStockLedger($rows, $f);
        };

        $filename = 'Closing-Stock-Report-' . $f['start'] . '_to_' . $f['end'];
        set_time_limit(0);

        if ($format === 'csv') {
            $this->response->setHeader('Content-Type', 'text/csv');
            $this->response->setHeader('Content-Disposition', 'attachment; filename="' . $filename . '.csv"');
            $this->response->sendHeaders();

            $out = fopen('php://output', 'w');
            fputcsv($out, $headers);

            $batch = 500;
            $offset = 0;
            $totalValue = 0.0;
            while (true) {
                $rows = $fetchBatch($batch, $offset);
                if (empty($rows)) {
                    break;
                }
                foreach ($rows as $r) {
                    $totalValue += $r['value'];
                    fputcsv($out, $rowMapper($r));
                }
                $offset += $batch;
                if (count($rows) < $batch) {
                    break;
                }
            }
            fputcsv($out, ['', '', '', '', '', '', '', '', '', 'Total', '', number_format($totalValue, $decimals, '.', '')]);
            fclose($out);
            exit;
        }

        header('Content-Type: application/vnd.ms-excel');
        header('Content-Disposition: attachment; filename="' . $filename . '.xls"');

        $colspan = count($headers);
        echo '<table border="0"><tr><td colspan="' . $colspan . '" style="text-align:center;">Closing Stock Report from ' . esc($f['start']) . ' to ' . esc($f['end']) . '</td></tr>';
        echo '<tr><td colspan="' . $colspan . '">&nbsp;</td></tr></table>';

        echo '<table border="1"><thead><tr>';
        foreach ($headers as $h) {
            echo '<th>' . esc($h) . '</th>';
        }
        echo '</tr></thead><tbody>';

        $batch = 500;
        $offset = 0;
        $totalValue = 0.0;
        while (true) {
            $rows = $fetchBatch($batch, $offset);
            if (empty($rows)) {
                break;
            }
            foreach ($rows as $r) {
                $totalValue += $r['value'];
                echo '<tr>';
                foreach ($rowMapper($r) as $cell) {
                    echo '<td>' . esc((string) $cell) . '</td>';
                }
                echo '</tr>';
            }
            $offset += $batch;
            if (count($rows) < $batch) {
                break;
            }
        }
        echo '<tr><td colspan="9"></td><td><strong>Total</strong></td><td></td><td><strong>' . number_format($totalValue, $decimals, '.', '') . '</strong></td></tr>';
        echo '</tbody></table>';
        exit;
    }
}
