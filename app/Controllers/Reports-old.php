<?php
defined('BASEPATH') or exit('No direct script access allowed');

class Reports extends CI_Controller
{

    public function __construct()
    {
        parent::__construct();
        $this->load->model(['User_model', 'Setting_model', 'Sale', 'Register', 'Sale_item']);

        $lang = $this->session->userdata("lang") == null ? "english" : $this->session->userdata("lang");
        $this->lang->load($lang, $lang);
        $this->user = $this->session->userdata('user_id') ? User_model::find_by_id($this->session->userdata('user_id')) : FALSE;

        $this->setting = Setting_model::find(1);
        $this->builder = $this->db;
    }



    public function searchbasecodee()
    {

        $barcodee = $this->input->post('barcodee');


        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">



        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="text-align:center;border: 1px solid #1c76bc; ">Product Name</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Barcode</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">QT</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Price</th>
        
        <th style="border: 1px solid #1c76bc;text-align:center; ">Sales ID</th>        
        <th style="border: 1px solid #1c76bc;text-align:center; ">Date Time</th> 
        </tr></thead><tbody>';


        $tt = 1;
        $itemtot_amountt = 0;
        $prducts = $this->db->query("SELECT sale_items.name,sale_items.qt,sale_items.subtotal,sale_items.date,sale_items.sale_id,products.code  FROM `sale_items` inner join products on products.id=sale_items.product_id WHERE  sale_items.product_id = '$barcodee'  order by sale_items.id desc");
        foreach ($prducts->result() as $prd) {

            //$oloo=mysql_fetch_array(mysql_query("select * from categorie_expences where id='".$prd->category_id."' "));

            $result .= '<tr   >
            <td style="border: 1px solid #1c76bc; ">' . $prd->name . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->code . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->qt . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->subtotal . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->sale_id . '</td>

            <td style="border: 1px solid #1c76bc; ">' . date("d-m-Y", strtotime($prd->date)) . '</td>            
            </tr>';






            $tt++;
        }

        $result .= '</tbody>




            </table>';

        echo $result;
    }




    public function getCustomecollection()
    {


        $sssSelect = $this->input->post('sssSelect');

        $start = $this->input->post('start');
        $end = $this->input->post('end');
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];


        $totals = 0;
        if ($sssSelect != '') {
            $sales = mysql_query("SELECT * FROM `payements` WHERE  salesman = '$sssSelect' AND date between '$start' AND '$end' ORDER BY id asc ");
        } else {
            $sales = mysql_query("SELECT * FROM `payements` WHERE date between '$start' AND '$end' ORDER BY id asc ");
        }

        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead>
        <tr class="hideme"><th colspan="6" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="6"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="6">Collection Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

<tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">

        <th style="border: 1px solid #1c76bc;">' . label("CustomerName") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Sales Man") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Sales") . ' ' . label("ID") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("date") . '</th>
        
        
        
        <th style="border: 1px solid #1c76bc;">' . label("Paid") . '</th>
        
        </tr></thead><tbody>';

        while ($sale = mysql_fetch_object($sales)) {




            if ($sale->salesman > 0) {
                $usx = User_model::find($sale->salesman);
                $yu = $usx->firstname . ' ' . $usx->lastname;
            } else {
                $yu = "----";
            }




            $ssd = mysql_fetch_array(mysql_query("select * from sales where id='" . $sale->sale_id . "' "));

            $yuj = date("d-m-Y", strtotime($sale->date));
            $result .= '<tr style="border: 1px solid #1c76bc;" >
            <td style="border: 1px solid #1c76bc;">' . $ssd['clientname'] . '</td>
            <td style="border: 1px solid #1c76bc;">' . $yu . '</td>
            <td style="border: 1px solid #1c76bc;">' . $sale->sale_id . '</td>
            <td style="border: 1px solid #1c76bc;">' . $yuj . '</td>
         

            <td style="border: 1px solid #1c76bc;text-align:right;"> ' . number_format((float)$sale->paid, $this->setting->decimals, '.', '') . '</td>

            </tr>';
            $totals += $sale->paid;
        }
        $result .= '
        <tr style="border: 1px solid #1c76bc;" ><td colspan="4"  style="border: 1px solid #1c76bc;text-align:right;"><b>' . label("Total") . '</b></td>
        <td   style="border: 1px solid #1c76bc;text-align:right;"><b>' . number_format((float)$totals, $this->setting->decimals, '.', '') . '</b></td></tr></tbody>
      </table>';

        echo $result;
    }


    public function view_price_more()
    {
        $data['prince_mas'] = $_POST['Range'];
        $this->load->view('product/view_price_more', $data);
    }


    public function view_mrp_more()
    {
        $data['prince_mas'] = $_POST['Range'];
        $this->load->view('product/view_mrp_more', $data);
    }




    public function getCustomerReport()
    {

        $start  = $this->input->post('start');
        $end    = $this->input->post('end');
        $esuppr = $this->input->post('client_id');
        $pamode_id = $this->input->post('selectedValues');

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;

        $rttt = $this->session->userdata('store');


        //$prduct = Product::find($product_id);



        $la322x = explode('-', $start);
        $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

        $lax = explode('-', $end);
        $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];


        $lkmm = mysql_fetch_array(mysql_query(" select * from  settings where id=1 "));
        $sales = "sales";
        if ($lkmm['themblock'] == 0) {
            $sales = "sales";
        } else {
            $sales = "dsales";
        } //  ".$sales."

        $ret_idd = $lkmm['themblock'];

        if ($esuppr > 0) {
            $prducts = mysql_query("SELECT *," . $sales . ".id as ssid  FROM " . $sales . " inner join registers on " . $sales . ".register_id=registers.id WHERE registers.store_id='$rttt' and  client_id='$esuppr' and    created_at  between '$la32' AND '$laxg' order by " . $sales . ".id desc ");
        } else if ($esuppr == '') {
            $prducts = mysql_query("SELECT *," . $sales . ".id as ssid  FROM " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE registers.store_id='$rttt' and  created_at between '$la32' AND '$laxg' order by " . $sales . ".id desc ");
        } else {
            $prducts = mysql_query("SELECT *," . $sales . ".id as ssid  FROM " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE registers.store_id='$rttt' and  client_id=0 and    created_at between '$la32' AND '$laxg' order by " . $sales . ".id desc ");
        }

        $result = '
        <table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="14" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
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


        $mkj = mysql_query("select * from payment_mode where id!=1 order by id asc ");
        while ($mkjf = mysql_fetch_array($mkj)) {

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

        while ($prd = mysql_fetch_object($prducts)) {


            if ($prd->client_id > 0) {
                $custt_name = mysql_fetch_array(mysql_query("select * from customers where id='" . $prd->client_id . "' "));
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

            $return_ck = mysql_query("select * from  returnss where re_sales_id='" . $prd->ssid . "' and  rsale_type='" . $ret_idd . "' ");
            $return_ck_num = mysql_num_rows($return_ck);


            $yuikk = mysql_query("select * from  tax_summary where salesid='" . $prd->ssid . "' ");
            while ($yuikkf = mysql_fetch_array($yuikk)) {
                $oltaxl .= $yuikkf['taxname'] . '-' . number_format((float)$yuikkf['taxfrom'], $this->setting->decimals, '.', '') . '<br>';

                $overal_tax = $overal_tax + $yuikkf['taxfrom'];
            }

            $sslalf = $prd->discountamount;
            $discout_per = ($prd->discountamount * 100) / $prd->subtotal;



            $uyjhh = mysql_query("select * from sale_items where sale_id='" . $prd->ssid . "'   ");
            while ($uyjhhf = mysql_fetch_array($uyjhh)) {
                $iknmm = mysql_query("select * from retunn_items where sl_id='" . $uyjhhf['id'] . "' and sall_idd='" . $prd->ssid . "' and rsaleit_type='" . $ret_idd . "' ");
                if (mysql_num_rows($iknmm) == 1) {


                    $retun_res = mysql_fetch_array($iknmm);

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


                $mkj = mysql_query("select * from payment_mode where id!=1 order by id asc ");
                while ($mkjf = mysql_fetch_array($mkj)) {

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

                while ($return_sal = mysql_fetch_object($return_ck)) {


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


        $mkj = mysql_query("select * from payment_mode where id!=1 order by id asc ");
        while ($mkjf = mysql_fetch_array($mkj)) {

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

        $mkj = mysql_query("select * from payment_mode where id!=1 order by id asc ");
        while ($mkjf = mysql_fetch_array($mkj)) {
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

        $mkj = mysql_query("select * from payment_mode where id!=1 order by id asc ");
        while ($mkjf = mysql_fetch_array($mkj)) {
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

        $mkj = mysql_query("select * from payment_mode where id!=1 order by id asc ");
        while ($mkjf = mysql_fetch_array($mkj)) {
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





    public function getCustomercredit()
    {
        $client_id = $this->input->post('client_id');

        $sssSelect = $this->input->post('sssSelect');

        $start = $this->input->post('start');
        $end = $this->input->post('end');
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];


        $lkmm = mysql_fetch_array(mysql_query(" select * from  settings where id=1 "));
        if ($lkmm['themblock'] == 0) {
            $sales = "sales";
        } else {
            $sales = "dsales";
        } //  ".$sales."


        $totals = 0;
        if ($client_id != '' && $sssSelect != '') {
            $sales = Sale::find_by_sql("SELECT * FROM " . $sales . " WHERE creddate>0 and client_id = '$client_id' AND salesperson = '$sssSelect' AND created_at between '$start' AND '$end' ORDER BY id asc ");
        } else if ($client_id != '' && $sssSelect == '') {
            $sales = Sale::find_by_sql("SELECT * FROM " . $sales . " WHERE creddate>0 and client_id = '$client_id' AND created_at between '$start' AND '$end' ORDER BY id asc ");
        } else if ($client_id == '' && $sssSelect != '') {
            $sales = Sale::find_by_sql("SELECT * FROM " . $sales . " WHERE creddate>0 and salesperson = '$sssSelect' AND created_at between '$start' AND '$end' ORDER BY id asc ");
        } else {
            $sales = Sale::find_by_sql("SELECT * FROM " . $sales . " WHERE  creddate>0 and created_at between '$start' AND '$end' ORDER BY id asc");
        }

        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="10" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="10"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
         <tr class="hideme" style="text-align:center; " ><th colspan="10">Credit Status Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>


 <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
      
        <th style="border: 1px solid #1c76bc;">' . label("CustomerName") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Sales Man") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("sales") . ' ' . label("Number") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("date") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Credit") . ' ' . label("day's") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Total") . '</th>
        
        <th style="border: 1px solid #1c76bc;">' . label("Paid") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Unpaid") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Action") . '</th>
        </tr></thead><tbody>';
        foreach ($sales as $sale) {

            switch ($sale->status) {
                case 1: // case Credit Card
                    $satus = 'unpaid';
                    break;
                case 2: // case ckeck
                    $satus = 'Partiallypaid';
                    break;
                default:
                    $satus = 'paid';
            }

            if ($sale->salesperson > 0) {
                $usx = User_model::find($sale->salesperson);
                $ftt = $usx->firstname . ' ' . $usx->lastname;
            } else {
                $ftt = "----";
            }

            $yuj = date("d-m-Y", strtotime($sale->created_at));
            $result .= '<tr style="border: 1px solid #1c76bc;" >
            <td style="border: 1px solid #1c76bc;">' . $sale->clientname . '</td>
            <td style="border: 1px solid #1c76bc;">' . $ftt . '</td>
            <td style="border: 1px solid #1c76bc;">' . $sale->id . '</td>
            <td style="border: 1px solid #1c76bc;">' . $yuj . '</td>
            <td style="border: 1px solid #1c76bc;"> ' . $sale->creddate . '</td>
            <td style="border: 1px solid #1c76bc;"> ' . number_format((float)$sale->total, $this->setting->decimals, '.', '') . '</td>
            <td style="border: 1px solid #1c76bc;"> ' . number_format((float)$sale->paid, $this->setting->decimals, '.', '') . '</td>
            <td style="border: 1px solid #1c76bc;"> ' . number_format((float)$sale->total - $sale->paid, $this->setting->decimals, '.', '') . '</td>
            <td style="border: 1px solid #1c76bc;"><span style="padding: 8px;" >' . label($satus) . '</span>

            <a  href="javascript:void(0)" onclick="showTicket4(' . "'" . $sale->id . "'" . ')" dropdown-toggle"="" data-toggle="dropdown">View</a>

           

            </td>
            </tr>';
            $totals += $sale->total;
        }





        $result .= '
        <tr style="border: 1px solid #1c76bc;" ><td colspan="6"  style="border: 1px solid #1c76bc;">' . label("Total") . 'Rs. : <span class="">' . $totals . '</td></tr></tbody>
      </table>';

        echo $result;
    }




    public function getCustomertaxReport()
    {
        $client_id = $this->input->post('client_id');
        $startpp = $this->input->post('start');
        $endpp = $this->input->post('end');

        $start = date("Y-m-d", strtotime($startpp));
        $end = date("Y-m-d", strtotime($endpp));

        $totals = 0;
        $toamt = 0;
        $ltot = 0;

        $lkmm = ($this->db->query(" select * from  settings where id=1 ")->row_array());
        if ($lkmm['themblock'] == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
        } else {
            $sales = "dsales";
            $sale_items = "dsale_items";
        }
        //  ".$sales."
        //  ".$sale_items."


        $poql = $this->db->query("select * from settings where id=1 ")->row_array();
        $poss = ($this->db->query("select * from stores where id='" . $this->session->userdata('store') . "' ")->row_array());
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        if ($client_id == '') {
            $sales = Sale::find_by_sql("SELECT *,sum(" . $sale_items . ".subtotal2) as mmm FROM " . $sales . " INNER JOIN " . $sale_items . " ON (" . $sales . ".id=" . $sale_items . ".sale_id ) AND " . $sale_items . ".date between '$start' AND '$end' group by " . $sale_items . ".tottax," . $sales . ".client_id  ");


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
        <thead><tr class="hideme"><th colspan="9" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
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
                $lmdkm = mysql_fetch_array(mysql_query("select * from customers where id='" . $custarrf[$ii] . "' "));
                $result .= '<tr><th style="border: 1px solid #1c76bc;"  >' . (isset($lmdkm['name']) ? $lmdkm['name'] : "") . '</th>';
                $tottax = 0;
                $totamtt = 0;
                $lasttot = 0;
                for ($io = 0; $io < $lcl; $io++) {
                    $sales = 'sales';
                    $mnnp = mysql_fetch_array(mysql_query("SELECT *,sum(" . $sale_items . ".subtotal2) as mmm FROM " . $sales . " INNER JOIN `" . $sale_items . "` ON (" . $sales . ".id=" . $sale_items . ".sale_id and " . $sales . ".client_id='$custarrf[$ii]' and " . $sale_items . ".tottax='$perarrf[$io]'  ) AND " . $sale_items . ".date between '$start' AND '$end' group by " . $sale_items . ".tottax," . $sales . ".client_id  "));

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
            $sales = Sale::find_by_sql("SELECT *,sum(" . $sale_items . ".subtotal) as mmm FROM  " . $sales . " INNER JOIN " . $sale_items . " ON (" . $sales . ".id=" . $sale_items . ".sale_id and " . $sales . ".client_id = '$client_id' ) AND " . $sale_items . ".date between '$start' AND '$end' group by " . $sale_items . ".tottax ");
            $lmdkm = mysql_fetch_array(mysql_query("select * from customers where id='" . $client_id . "' "));
            if (isset($lmdkm['name']) && $lmdkm['name'] != '') {
                $llname = $lmdkm['name'];
            } else {
                $llname = "Walk in Customer";
            }


            $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="9" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
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

                $ommk = ($sale->mmm * $sale->tottax) / 100;
                $result .= '
            
            
            <td style="border: 1px solid #1c76bc;">' . $ommk . '</td>
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
        $mmonth = $this->input->post('mmonth');
        $yyear = $this->input->post('yyear');
        $client_id = $this->input->post('client_id');






        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];




        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class=""><th colspan="9" style="text-align:center; " ><h3>GSTR-3B <br>
[See rule 61(5)]</h3></th></tr>
       


         <tr >
        <th   >GSTIN</th>
        <th  >' . $poql['gstnoo'] . '</th>
        <th  >Year</th>
        <th  >' . $yyear . '</th>
        <th  >Sheet Status:</th>
        <th   ></th>
        </tr>

        <tr > 
        <th >Legal name of the registered person</th>
        <th   >' . $poql['companyname'] . '</th>
        <th   >Month</th>
        <th   >' . $client_id . '</th>
        <th  ></th>
        <th   ></th>
        
        </tr>
        ';

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


        $fumll = $yyear . '-' . sprintf("%02d", $mmonth);

        $c_kmmm = mysql_fetch_array(mysql_query("select  sum(taxfrom) as ctaxx  from " . $tax_summary . " where c_s_i=1 and datedd like '" . $fumll . "-%' "));
        $i_kmmm = mysql_fetch_array(mysql_query("select  sum(taxfrom) as itaxx  from  " . $tax_summary . " where c_s_i=2 and datedd like '" . $fumll . "-%' "));
        $t_kmmm = mysql_fetch_array(mysql_query("select  sum(taxamount) as ttoptal  from  " . $tax_summary . " where  datedd like '" . $fumll . "-%' "));


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
 <td  style=" text-align:center;" >' . number_format((float)$t_kmmm['ttoptal'], $this->setting->decimals, '.', '') . '</td>
 <td  style=" text-align:center;" > ' . number_format((float)$i_kmmm['itaxx'], $this->setting->decimals, '.', '') . '</td>
 <td  style=" text-align:center;" >' . number_format((float)$c_kmmm['ctaxx'] / 2, $this->setting->decimals, '.', '') . ' </td>
 <td  style=" text-align:center;" > ' . number_format((float)$c_kmmm['ctaxx'] / 2, $this->setting->decimals, '.', '') . '</td>
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
 <td  style=" text-align:center;" >' . number_format((float)$t_kmmm['ttoptal'], $this->setting->decimals, '.', '') . '</td>
 <td  style=" text-align:center;" > ' . number_format((float)$i_kmmm['itaxx'], $this->setting->decimals, '.', '') . '</td>
 <td  style=" text-align:center;" >' . number_format((float)$c_kmmm['ctaxx'] / 2, $this->setting->decimals, '.', '') . ' </td>
 <td  style=" text-align:center;" > ' . number_format((float)$c_kmmm['ctaxx'] / 2, $this->setting->decimals, '.', '') . '</td>
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
        $product_id = $this->input->post('product_id');
        $start = $this->input->post('start');
        $end = $this->input->post('end');
        $totalprofit = 0;
        $totalprofit_cc = 0;
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));
        //$prduct = Product::find($product_id);

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];

        if ($product_id == 0  || $product_id == '') {
            $prducts = Sale_item::find_by_sql("SELECT * FROM `sale_items` WHERE  date between '$start' AND '$end' ORDER BY sale_id desc ");
        } else {
            $prducts = Sale_item::find_by_sql("SELECT * FROM `sale_items` WHERE product_id = '$product_id' AND date between '$start' AND '$end' ORDER BY sale_id desc");
        }

        $result = '
<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="7" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="7"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="7">Product Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

        <tr style="border: 1px solid #1c76bc;"><th style="border: 1px solid #1c76bc;">' . label("SaleNum") . '</th><th style="border: 1px solid #1c76bc;">' . label("ProductName") . '</th><th style="border: 1px solid #1c76bc;">' . label("Cost") . '</th><th style="border: 1px solid #1c76bc;">' . label("Price") . '</th><th style="border: 1px solid #1c76bc;">' . label("Quantity") . '</th><th style="border: 1px solid #1c76bc;">' . label("tax") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Total") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Status") . '</th>
        </tr></thead><tbody>';


        foreach ($prducts as $prd) {


            $ttax = $prd->sgst + $prd->cgst + $prd->igstt;

            $tax = ($prd->subtotal2 * $tottax) / 100;
            $profit = $prd->subtotal2 - $prd->qt * $prd->perprice;
            $ttaxf = $prd->subtotal - $prd->subtotal2;

            $oloo = mysql_fetch_object(mysql_query("select id,status from sales where id='" . $prd->sale_id . "' "));
            if ($oloo->status == 3) {
                $bil_ststy = "style=background:#e9c0c0;border: 1px solid #1c76bc;";
                $sstaus_w = "Cancel";
            } elseif ($oloo->status == 1) {
                $bil_ststy = "style=border: 1px solid #1c76bc;";
                $sstaus_w = "Unpaid";
            } elseif ($oloo->status == 2) {

                $bil_ststy = "style=border: 1px solid #1c76bc;";
                $sstaus_w = "Partially paid";
            } else {
                $bil_ststy = "style=border: 1px solid #1c76bc;";
                $sstaus_w = "Paid";
            }


            $result .= '<tr ' . $bil_ststy . '>
            <td style="border: 1px solid #1c76bc;">' . $prd->sale_id . '</td>
            <td style="border: 1px solid #1c76bc;">' . $prd->name . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . number_format((float)$prd->perprice, $this->setting->decimals, '.', '') . ' </td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . number_format((float)$prd->subtotal2, $this->setting->decimals, '.', '') . ' </td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . $prd->qt . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . number_format((float)$ttaxf, $this->setting->decimals, '.', '') . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . number_format((float)$prd->subtotal, $this->setting->decimals, '.', '') . '</td>

            <td style="border: 1px solid #1c76bc;text-align:center;">' . $sstaus_w . '</td>
            </tr>';
            $totalprofit += $prd->subtotal;
            if ($oloo->status == 3) {
                $totalprofit_cc += $prd->subtotal;
            }
        }

        $result .= '<tr style="border: 1px solid #1c76bc;">
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;text-align:right;"></td>
            <td style="border: 1px solid #1c76bc;text-align:right;"></td>
            <td style="border: 1px solid #1c76bc;text-align:right;"></td>
            
            <td style="border: 1px solid #1c76bc;text-align:right;">Total</td>
            <td style="text-align:right;border: 1px solid #1c76bc;text-align:right;">' . number_format((float)$totalprofit, $this->setting->decimals, '.', '') . ' </td></tr>';
        $result .= '<tr style="border: 1px solid #1c76bc;">
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;text-align:right;"></td>
            <td style="border: 1px solid #1c76bc;text-align:right;"></td>
            <td style="border: 1px solid #1c76bc;text-align:right;"></td>
            
            <td style="border: 1px solid #1c76bc;text-align:right;">Total</td>
            <td style="text-align:right;border: 1px solid #1c76bc;text-align:right;">' . number_format((float)$totalprofit_cc, $this->setting->decimals, '.', '') . ' </td></tr>';


        $result .= '</tbody></table>';

        echo $result;
    }








    public function getccdReport()
    {
        $product_id = $this->input->post('product_id');
        $start = $this->input->post('start');
        $end = $this->input->post('end');
        $totalprofit = 0;

        $startpp = date("Y-m-d", strtotime($start));
        $endpp = date("Y-m-d", strtotime($end));
        //$prduct = Product::find($product_id);
        $storeiid = $this->session->userdata('store');

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];

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

        if ($product_id > 0) {
            $prducts = mysql_query("select *,sum(qt) as ttt,sum(Case When cancel_status=1 THEN qt ELSE 0 END) as qt_cancel,c.name ccc,p.name as pprd
            from products p, " . $sale_items . " s, categories c
            where    s.store_irrdd ='$storeiid' and p.id = s.product_id and p.category = c.id and  p.category='$product_id'  and s.date between '$startpp' AND '$endpp'  group by product_id,c.id order by pprd asc");
        } else {
            $prducts = mysql_query("select *,sum(qt) as ttt,sum(Case When cancel_status=1 THEN qt ELSE 0 END) as qt_cancel,c.name ccc,p.name as pprd
            from products p, " . $sale_items . " s, categories c
            where  s.store_irrdd ='$storeiid' and  p.id = s.product_id and p.category = c.id and s.date between '$startpp' AND '$endpp'  group by product_id,c.id order by pprd asc");
        }

        $result = '
<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="6" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
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


        while ($prd = mysql_fetch_object($prducts)) {





            $sl_newqtf = mysql_fetch_array(mysql_query("select *,sum(sl_newqt) as r_retun from retunn_items where prodd_ids='" . $prd->product_id . "' and  to_datte between '$startpp' AND '$endpp'  "));

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


    public function getccdReport_fastt()
    {
        $product_id = $this->input->post('product_id');
        $start = $this->input->post('start');
        $end = $this->input->post('end');
        $totalprofit = 0;

        $startpp = date("Y-m-d", strtotime($start));
        $endpp = date("Y-m-d", strtotime($end));
        //$prduct = Product::find($product_id);

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
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];

        $storei_ddd = $this->session->userdata('store');

        if ($product_id > 0) {
            $prducts = mysql_query("select *,sum(qt) as ttt,sum(Case When cancel_status=1 THEN qt ELSE 0 END) as qt_cancel,c.name ccc,p.name as pprd
from products p, " . $sale_items . " s, categories c
where p.id = s.product_id and p.category = c.id and  p.category='$product_id' and  s.store_irrdd='$storei_ddd'  and s.date between '$startpp' AND '$endpp'  group by product_id,c.id order by ttt desc");
        } else {
            $prducts = mysql_query("select *,sum(qt) as ttt,sum(Case When cancel_status=1 THEN qt ELSE 0 END) as qt_cancel,c.name ccc,p.name as pprd
from products p, " . $sale_items . " s, categories c
where p.id = s.product_id and p.category = c.id and  s.store_irrdd='$storei_ddd' and s.date between '$startpp' AND '$endpp'  group by product_id,c.id order by ttt desc");
        }

        $result = '
<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="6" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
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


        while ($prd = mysql_fetch_object($prducts)) {


            $sl_newqtf = mysql_fetch_array(mysql_query("select *,sum(sl_newqt) as r_retun from retunn_items where prodd_ids='" . $prd->product_id . "' and  store_idsi='$storei_ddd' and  to_datte between '$startpp' AND '$endpp'  "));

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






    public function getpurchaseReport()
    {


        $product_id = $this->input->post('product_id');
        $product_id = $this->input->post('waridd');
        $product_id = $this->input->post('suppid');
        $start = $this->input->post('start');
        $end = $this->input->post('end');
        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;
        //$prduct = Product::find($product_id);
        if ($product_id == 0  || $product_id == '') {
            $prducts = Sale_item::find_by_sql("SELECT *, sum(qt) as nnn  FROM `sale_items` WHERE  date between '$start' AND '$end' group by tottax,price ");
        } else {
            $prducts = Sale_item::find_by_sql("SELECT *, sum(qt) as nnn  FROM `sale_items` WHERE product_id = '$product_id' AND date between '$start' AND '$end' group by tottax,price ");
        }

        $result = '<table id="" class="table table-striped table-bordered" cellspacing="0" width="100%"><thead><tr>
        <th>S.no</th>
        <th>' . label("ProductName") . '</th>
        <th style="text-align:center; ">GST ' . label("tax") . '</th>
        <th style="text-align:center; ">Qty</th>
        <th style="text-align:center; ">' . label("Unit") . '</th>
        <th style="text-align:center; ">' . label("Price") . '</th>
        <th style="text-align:center; ">' . label("Total") . ' </th>
        <th style="text-align:center; ">CGST</th>
        <th style="text-align:center; ">SGST</th>
        <th style="text-align:center; ">' . label("Total") . '</th>
        </tr></thead><tbody>';

        $tt = 1;
        foreach ($prducts as $prd) {

            $mkn = mysql_fetch_array(mysql_query("select id,unit from products where  id='" . $prd->product_id . "' "));
            $ctax = ($prd->cgst * $prd->nnn * $prd->price) / 100;
            $stax = ($prd->sgst * $prd->nnn * $prd->price) / 100;

            $totarat = $prd->price * $prd->nnn;
            $ggtot = $ctax + $stax + $totarat;

            $result .= '<tr  >
            <td >' . $tt . '</td>
            <td>' . $prd->name . '</td>
            <td style="text-align:right; ">' . $prd->tottax . '%</td>
            <td style="text-align:right; ">' . $prd->nnn . '</td>
            <td style="text-align:right; ">' . $mkn['unit'] . '</td>
            <td style="text-align:right; " >' . number_format((float)$prd->price, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right; " >' . number_format((float)$totarat, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right; " >' . number_format((float)$ctax, $this->setting->decimals, '.', '')  . '</td>
            <td style="text-align:right; ">' . number_format((float)$stax, $this->setting->decimals, '.', '')  . '</td>
            <td style="text-align:right; ">' . number_format((float)$ggtot, $this->setting->decimals, '.', '')  . '</td>
            </tr>';
            $totalprofit += $totarat;
            $totalprocg += $ctax;
            $totalprosg += $stax;
            $gtotal += $ggtot;
            $tt++;
        }

        $result .= '</tbody><tr>
            <td></td>
            <td>' . label("Total") . '</td>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
           <td style="text-align:right; "><b>Rs.' . number_format((float)$totalprofit, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right; "><b>Rs.' . number_format((float)$totalprocg, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right; "><b>Rs.' . number_format((float)$totalprosg, $this->setting->decimals, '.', ' ') . '</b></td> 

           <td style="text-align:right; "><b>Rs.' . number_format((float)$gtotal, $this->setting->decimals, '.', ' ') . '</b></td>
            </tr></table>';

        echo $result;
    }

    public function getProducttaxReport()
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

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];

        //$prduct = Product::find($product_id);
        if ($product_id == 0  || $product_id == '') {
            $prducts = Sale_item::find_by_sql("SELECT * FROM " . $sale_items . " WHERE  $rstt   date between '$start' AND '$end' ORDER BY sale_id desc  ");
        } else {
            $prducts = Sale_item::find_by_sql("SELECT *  FROM " . $sale_items . " WHERE   $rstt   product_id = '$product_id' AND date between '$start' AND '$end' ORDER BY sale_id desc ");
        }

        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="11" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
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

            $oloo = mysql_fetch_object(mysql_query("select id,status from " . $sales . " where id='" . $prd->sale_id . "' "));
            $return_ck = mysql_query("select * from  retunn_items where sl_id='" . $prd->id . "'  and rsaleit_type='" . $ret_idd . "'  ");
            $return_ck_num = mysql_num_rows($return_ck);

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



            $mkn = mysql_fetch_array(mysql_query("select id,unit from products where  id='" . $prd->product_id . "' "));
            $sslal = mysql_fetch_array(mysql_query("select * from  " . $sales . " where id='" . $prd->sale_id . "' "));
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
                while ($return_sal = mysql_fetch_object($return_ck)) {
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
            $store_name = mysql_fetch_array(mysql_query("select name,id from stores  where id='" . $prd->store_irrdd . "' "));


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




    public function getProducttaxReportsupp()
    {
        $product_id = $this->input->post('product_id');

        $start = date("Y-m-d", strtotime($this->input->post('start')));
        $end = date("Y-m-d", strtotime($this->input->post('end')));

        $innon = $this->input->post('innon');
        $prrcc = $this->input->post('prrcc');
        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $totarat = 0;
        //$prduct = Product::find($product_id);
        if ($innon != '') {
            $prducts = mysql_query("SELECT *  FROM `payment_suplls` WHERE  invoicen = '$innon'  order by purchaid");
        } elseif ($prrcc != '') {
            $prducts = mysql_query("SELECT *  FROM `payment_suplls` WHERE  purchaid = '$prrcc' order by purchaid");
        } elseif (($product_id == 0  || $product_id == '') && $innon == '') {
            $prducts = mysql_query("SELECT *  FROM `payment_suplls` where datet between '$start' and '$end' order by purchaid");
        } else {
            $prducts = mysql_query("SELECT *  FROM `payment_suplls` where sup_id='$product_id' and datet between '$start' and '$end' order by purchaid");
        }

        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="12" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="12"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="12">Supplier Payments Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

         <tr style="background:#1c76bc;color:#fff;">
        <th style="border: 1px solid #1c76bc;border: 1px solid #1c76bc;">' . label("Date") . '</th>
        <th style="border: 1px solid #1c76bc;border: 1px solid #1c76bc;">' . label("Supplier") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Invoice") . ' ' . label("Number") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Purchase") . ' ' . label("Number") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bill") . ' ' . label("Amount") . '  </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Cash") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Cheque") . '  </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Cheque") . ' ' . label("Number") . '  </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bank") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Date") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Paid") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Balanceamt") . '</th>        
        </tr></thead><tbody>';
        $bbalmn = 0;
        $billtot = 0;
        $newpurcid = 0;
        $ttxx = 1;
        $ttip = 1;



        while ($prd = mysql_fetch_object($prducts)) {

            $mkn = mysql_fetch_array(mysql_query("select id,name from suppliers where  id='" . $prd->sup_id . "' "));
            $mkncc = mysql_fetch_array(mysql_query("select id,total from purchases where  id='" . $prd->purchaid . "' "));

            $ibb = mysql_fetch_array(mysql_query("select sum(total) as rrtty  from purchases_return where pur_id='" . $prd->purchaid . "'  group by pur_id  "));


            $tatath = $mkncc['total'] - $ibb['rrtty'];

            if ($ttip != $prd->purchaid) {
                $billtot = $billtot + $mkncc['total'];
            } else {
            }

            if ($newpurcid == $prd->purchaid) {
                $newretot = $newretot + $prd->amtpaid;
            } else {
                $newpurcid = $prd->purchaid;
                $newretot = $prd->amtpaid;
            }


            $ttip = $prd->purchaid;



            $totarat = $prd->amtpaid + $totarat;
            if ($ttxx == 1) {
                $bbalmn = $mkncc['total'] - $prd->amtpaid;
            } else {
                $bbalmn = $bbalmn - $prd->amtpaid;
            }

            if ($prd->methid == 0) {
                $tt = $prd->amtpaid;
            } else {
                $tt = 0;
            }
            if ($prd->methid != 0) {
                $tty = $prd->amtpaid;
            } else {
                $tty = 0;
            }



            $yuuu = $mkncc['total'] - $newretot - $ibb['rrtty'];


            $result .= '<tr  >
            <td style="text-align:center;border: 1px solid #1c76bc; " >' . date("d-m-Y", strtotime($prd->datet)) . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $mkn['name'] . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; " >' . $prd->invoicen . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; " >' . $prd->purchaid . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; " >' . $tatath . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' .   number_format((float)$tt, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$tty, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->chechno . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->bankname . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->datetch . '</td>
            <td  style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->amtpaid, $this->setting->decimals, '.', '') . '</td>
            <td  style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$yuuu, $this->setting->decimals, '.', '') . '</td>

                      </tr>';

            $ttxx++;
        }

        $result .= '</tbody><tr>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . label("Bill") . ' ' . label("Amount") . ' </td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . @$billtot . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
           <td style="text-align:right;border: 1px solid #1c76bc; ">' . label("Total") . '</td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$totarat, $this->setting->decimals, '.', '') . '</b></td>
           
           
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$billtot - $totarat, $this->setting->decimals, '.', '') . '</b></td>
           </tr></table>';

        echo $result;
    }






    public function getpurchasedailyReport()
    {

        $start = $this->input->post('Range');
        $end   = $this->input->post('Range1');
        //$btypess   = $this->input->post('btypess');

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));

        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $fvfff = $this->session->userdata('store');
        // $btypess = $poql['purchase_type'];
        $btypess = '';
        if (isset($_POST['bill_type']) && !empty($_POST['bill_type'])) {
            $btypess = $_POST['bill_type'] == 1 ? 0 : 1;
        }

        //$prduct = Product::find($product_id);
        if ($start == 0  || $start == '') {
            $lmm = date("Y-m-d");
            if (!empty($btypess)) {
                $prducts = mysql_query("SELECT *  FROM `purchases` WHERE ppurchase_type='$btypess' and  store_id='$fvfff' and purdat between '$lmm' AND '$lmm'  order by purdat asc ");
            } else {
                $prducts = mysql_query("SELECT *  FROM `purchases` WHERE store_id='$fvfff' and purdat between '$lmm' AND '$lmm'  order by purdat asc ");
            }
        } else {

            $la322x = explode('-', $start);
            $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

            $lax = explode('-', $end);
            $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];




            $lmm = date("Y-m-d");
            if (!empty($btypess)) {
                $prducts = mysql_query("SELECT *  FROM `purchases` WHERE ppurchase_type='$btypess' and  store_id='$fvfff' and purdat between '$la32' AND '$laxg'  order by purdat asc ");
            } else {
                $prducts = mysql_query("SELECT *  FROM `purchases` WHERE store_id='$fvfff' and purdat between  '$la32' AND '$laxg'  order by purdat asc ");
            }
        }

        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="9" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
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

        while ($prd = mysql_fetch_object($prducts)) {

            // $ibb = mysql_fetch_array(mysql_query("SELECT SUM(total) AS rrtty  FROM purchases_return WHERE pur_id='" . $prd->id . "'  GROUP BY pur_id  "));
            // $ibb = mysql_fetch_array(mysql_query("SELECT SUM(total) AS rrtty  FROM purchases_return WHERE pur_id='" . $prd->id . "'  GROUP BY pur_id "));
            $ibb['rrtty'] = 0;

            $prdf = $prd->supplier_id;
            $pxxx = $prd->cgst;
            $pxxxs = $prd->sgst;
            $olaaa = mysql_fetch_array(mysql_query("SELECT * from suppliers where id='" . $prdf . "'  "));

            $result .= '<tr  >
            <td style="border: 1px solid #1c76bc; ">' . date("d-m-Y", strtotime($prd->purdat))  . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $olaaa['name'] . '</td>
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
            $tottax = $tottax + $pxxx;
            $tottaxs = $tottax + $pxxxs;
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













    public function getpusumbjReport()
    {

        $start = $this->input->post('Range');
        $end   = $this->input->post('Range1');

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;

        $tyy = $this->session->userdata('store');


        //$prduct = Product::find($product_id);
        if ($start == 0  || $start == '') {
            exit;
            $lmm = date("Y-m-d");
            $prducts = mysql_query("SELECT *  FROM `purchases` WHERE store_id='$tyy' and    purdat between '$lmm' AND '$lmm'  order by purdat asc ");
        } else {


            $la322x = explode('-', $start);
            $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

            $lax = explode('-', $end);
            $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];

            $prducts = mysql_query(" SELECT   COUNT(id) as bills ,sum(betot) as billamt ,sum(paiddd) as baalll ,sum(cgst) as cgg,sum(sgst) as sgg,sum(discamt) as dikct,sum(total) as netamtt,   DATE_FORMAT(purdat, '%Y-%m-%d') AS DAY,    DATE_FORMAT(purdat, '%Y-%m') AS MONTH,    DATE_FORMAT(purdat, '%Y') AS YEAR
FROM  purchases WHERE  store_id='$tyy' and  purdat >= '" . $la32 . "' AND purdat <= '" . $laxg . "'
GROUP BY
    DATE_FORMAT(purdat, '%Y-%m-%d')");
        }


        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="8" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="8"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="8">Purchase Summary Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

         <tr style="background:#1c76bc;color:#fff;">
        <th style="border: 1px solid #1c76bc;">' . label("Date") . '</th>
        
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bill") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bill") . ' ' . label("Amount") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("tax") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Discount") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">  ' . label("Amount") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Return") . ' ' . label("Amount") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Net") . ' ' . label("Amount") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Paid") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Balanceamt") . '</th>
        </tr></thead><tbody>';

        $tt = 1;
        $billamt = 0;
        $tottax = 0;
        $discc = 0;
        $toott = 0;
        $paidd = 0;
        $toott_rrr = 0;
        $toott_net = 0;
        while ($prd = mysql_fetch_object($prducts)) {


            $prd_ret = mysql_fetch_array(mysql_query(" SELECT   sum(total) as retnetamtt FROM  purchases WHERE  store_id='$tyy' and  purdat >= '" . $la32 . "' AND purdat <= '" . $laxg . "'
GROUP BY
    DATE_FORMAT(purdat, '%Y-%m-%d')"));






            $pxxx = $prd->cgg + $prd->sgg;


            $result .= '<tr  >
            <td style="border: 1px solid #1c76bc; ">' . date("d-m-Y", strtotime($prd->DAY))  . '</td>
            
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->bills . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->billamt, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$pxxx, $this->setting->decimals, '.', '') . '</td>

            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->dikct, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->netamtt, $this->setting->decimals, '.', '') . '</td>

            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd_ret['retnetamtt'], $this->setting->decimals, '.', '') . '</td>

            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->netamtt - $prd_ret['retnetamtt'], $this->setting->decimals, '.', '') . '</td>

            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->baalll, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->netamtt - $prd->baalll - $prd_ret['retnetamtt'], $this->setting->decimals, '.', '') . '</td>

            </tr>';
            $billamt = $billamt + $prd->billamt;
            $tottax = $tottax + $pxxx;
            $discc = $discc + $prd->dikct;
            $toott = $toott + $prd->netamtt;
            $paidd = $paidd + $prd->baalll;

            $toott_rrr = $toott_rrr + $prd_ret['retnetamtt'];
            $toott_net = $toott_net + $prd->netamtt - $prd_ret['retnetamtt'];




            $tt++;
        }

        $result .= '</tbody>
        <tr>
            <td style="border: 1px solid #1c76bc; "></td>
            <td style="border: 1px solid #1c76bc; "></td>
            
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$billamt, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$tottax, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$discc, $this->setting->decimals, '.', ' ') . '</b></td> 
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott, $this->setting->decimals, '.', ' ') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott_rrr, $this->setting->decimals, '.', ' ') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott_net, $this->setting->decimals, '.', ' ') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$paidd, $this->setting->decimals, '.', ' ') . '</b></td> 

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott_net - $paidd, $this->setting->decimals, '.', ' ') . '</b></td> 

           
            </tr></table>';

        echo $result;
    }








    public function getpurchasedailyReportproduct()
    {

        $start = $this->input->post('Range');
        $end   = $this->input->post('Range1');

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;


        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));


        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));


        $rftt = $this->session->userdata('store');
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];


        //$prduct = Product::find($product_id);
        if ($start == 0  || $start == '') {
            $lmm = date("Y-m-d");
            $prducts = mysql_query("SELECT *  FROM `purchase_items` WHERE store_idd='$rftt' and   ndate between '$lmm' AND '$lmm'  order by ndate desc ");
        } else {

            $la322x = explode('-', $start);
            $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

            $lax = explode('-', $end);
            $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];

            $prducts = mysql_query("SELECT *  FROM `purchase_items` WHERE   store_idd='$rftt' and    ndate between '$la32' AND '$laxg' order by ndate desc ");
        }


        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="9" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9">Daily Purchase Reports Product wise from  ' . $startpp . ' Till ' . $endpp . '</th></tr>

        <tr style="background:#1c76bc;color:#fff;">
        <th style="border: 1px solid #1c76bc;">' . label("Date") . '</th>
        <th style="border: 1px solid #1c76bc;"> ' . label("Dealer") . ' ' . label("Name") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bill") . ' ' . label("Number") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Product") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Price") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Qty</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Sub Total") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Tax") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . '</th>
                </tr></thead><tbody>';

        $tt = 1;
        $billamt = 0;
        $tottax = 0;
        $discc = 0;
        $toott = 0;
        $paidd = 0;
        $taxkk = 0;
        $grand_tot = 0;
        $taxkk_tt = 0;
        $grand_tot_tt  = 0;


        while ($prd = mysql_fetch_object($prducts)) {

            $pxf = $prd->product_id;
            $prdf = $prd->supplier;
            $pxxx = $prd->cgst;

            $taxkk = ($prd->subtot * $pxxx) / 100;
            $grand_tot = $prd->subtot + $taxkk;

            $olaaa = mysql_fetch_array(mysql_query("select * from suppliers where id='" . $prdf . "'  "));

            $olaaap = mysql_fetch_array(mysql_query("select * from products where id='" . $pxf . "'  "));

            $result .= '<tr  >
            <td style="border: 1px solid #1c76bc; ">' . date("d-m-Y", strtotime($prd->ndate)) . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $olaaa['name'] . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->purchase_id . '</td>
            <td style=" border: 1px solid #1c76bc;">' . $olaaap['name'] . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->cost, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->qt . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->subtot, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$taxkk, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$grand_tot, $this->setting->decimals, '.', '') . '</td>
            
            

            </tr>';

            $discc = $discc + $prd->qt;
            $toott = $toott + $prd->subtot;

            $taxkk_tt = $taxkk_tt + $taxkk;
            $grand_tot_tt = $grand_tot_tt + $grand_tot;





            $tt++;
        }

        $result .= '</tbody>
        <tr>
            <td style="border: 1px solid #1c76bc; "></td>
            <td style="border: 1px solid #1c76bc; "></td>
            <td style="border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td> 

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . $discc . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott, $this->setting->decimals, '.', ' ') . '</b></td><td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$taxkk_tt, $this->setting->decimals, '.', ' ') . '</b></td><td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$grand_tot_tt, $this->setting->decimals, '.', ' ') . '</b></td> 
          
            
           

           
            </tr></table>';

        echo $result;
        die;
    }









    public function getpurchasetally()
    {
        $start = $this->input->post('Range');
        $end   = $this->input->post('Range1');
        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));
        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        //$prduct = Product::find($product_id);
        if ($start == 0  || $start == '') {
            $lmm = date("Y-m-d");
            $prducts = mysql_query("SELECT *  FROM `purchase_items` WHERE   ndate between '$lmm' AND '$lmm'  order by ndate desc ");
        } else {
            $la322x = explode('-', $start);
            $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];
            $lax = explode('-', $end);
            $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
            $prducts = mysql_query("SELECT *  FROM `purchase_items` WHERE   ndate between '$la32' AND '$laxg' order by ndate desc ");
        }
        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"></tr>
         <tr style="background:#1c76bc;color:#fff;">
          

        <th style="border: 1px solid #1c76bc;">Invoice Date</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Invoice No</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Supplier Invoice No</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Supplier Invoice Date
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Voucher Type
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Supplier Name
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Address 1
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Address 2
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Address 3</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">State</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Tin No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">CST No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">GSTIN/UIN
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Receipt Note No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Receipt Note Date
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Order No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Order Date
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">LR No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Despatch Through
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Destination
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Term of Payment
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Terms of Delivery
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Item Name
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Tax Rate
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Batch No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">QTY
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">UOM
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Rate
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Discount %
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Purchase Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_1 Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_1 Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_2 Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_2 Ledger
</th>

<th style="text-align:center;border: 1px solid #1c76bc; ">CGST Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">CGST Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">SGST Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">SGST Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">IGST Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">IGST Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Cost Center
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Godown
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Narration
</th>
                </tr></thead><tbody>';

        $tt = 1;
        $billamt = 0;
        $tottax = 0;
        $discc = 0;
        $toott = 0;
        $paidd = 0;
        while ($prd = mysql_fetch_object($prducts)) {
            $pxf = $prd->product_id;
            $prdf = $prd->supplier;
            $pxxx = $prd->cgst + $prd->sgst;
            $olaaa = mysql_fetch_array(mysql_query("select * from suppliers where id='" . $prdf . "'  "));
            $purt = mysql_fetch_array(mysql_query("select * from purchases where id='" . $prd->purchase_id . "'  "));
            $olaaap = mysql_fetch_array(mysql_query("select * from products where id='" . $pxf . "'  "));
            $result .= '<tr  >

            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($prd->ndate)) . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->purchase_id . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->supplier . '</td>
            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($purt['invdat']))  . '</td>
            <td style="border: 1px solid #1c76bc; ">Purchase</td>
            <td style="border: 1px solid #1c76bc; ">Karunakaran</td>

            <td style=" border: 1px solid #1c76bc;">' . $purt['phone'] . '</td>
            <td style=" border: 1px solid #1c76bc;">' . $purt['email'] . '</td>
            <td style=" border: 1px solid #1c76bc;">' . $purt['note'] . '</td>
            <td style=" border: 1px solid #1c76bc;">Tamilnadu</td>
            <td style=" border: 1px solid #1c76bc;">11111111V</td>
            <td style=" border: 1px solid #1c76bc;">11111111C</td>
            <td style=" border: 1px solid #1c76bc;">27ABCDE1234D1Z1</td>
            <td style=" border: 1px solid #1c76bc;">GRN - 001</td>
            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($prd->ndate)) . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->purchase_id . '</td>
            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($prd->ndate)) . '</td>
            <td style="border: 1px solid #1c76bc; ">LR- 1234</td>
            <td style="border: 1px solid #1c76bc; "></td>
            <td style="border: 1px solid #1c76bc; ">TamilNadu</td>
            <td style="border: 1px solid #1c76bc; ">1 Days</td>
            <td style="border: 1px solid #1c76bc; ">Ex-Works
</td>
<td style=" border: 1px solid #1c76bc;">' . $olaaap['name'] . '</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->cgst . '</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->purchase_id . '</td>

<td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->qt . '</td>
<td style=" border: 1px solid #1c76bc;">' . $olaaap['unit'] . '</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->cost . '</td>
<td style="border: 1px solid #1c76bc; ">0</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->subtot . '</td>
<td style="border: 1px solid #1c76bc; ">Purchase
</td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; ">Main Location
</td>
<td style="border: 1px solid #1c76bc; "></td>





            </tr>';
            $discc = $discc + $prd->qt;
            $toott = $toott + $prd->subtot;
            $tt++;
        }
        $result .= '</tbody>
       
       </table>';

        echo $result;
    }






    public function getpurchasetallybb()
    {
        $start = $this->input->post('Range');
        $end   = $this->input->post('Range1');
        $zstartpp = date("Y-m-d", strtotime($start));
        $zendpp = date("Y-m-d", strtotime($end));

        $y1 = mysql_num_rows(mysql_query("select * from tallypurchase where fromdatt <= '$zstartpp' and enddatt >= '$zstartpp' "));
        $y2 = mysql_num_rows(mysql_query("select * from tallypurchase where fromdatt <= '$zendpp' and enddatt >= '$zendpp' "));
        $y3 = mysql_num_rows(mysql_query("select * from tallypurchase where fromdatt >= '$zstartpp' and enddatt <= '$zendpp' "));


        if ($y1 == 0 && $y2 == 0 && $y3 == 0) {

            $totalprofit = 0;
            $totalprocg = 0;
            $totalprosg = 0;
            $gtotal = 0;
            $startpp = date("d-m-Y", strtotime($start));
            $endpp = date("d-m-Y", strtotime($end));
            $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
            $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
            $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
            //$prduct = Product::find($product_id);
            if ($start == 0  || $start == '') {
                $lmm = date("Y-m-d");
                $prducts = mysql_query("SELECT *  FROM `purchase_items` WHERE   ndate between '$lmm' AND '$lmm'  order by ndate desc ");
            } else {
                $la322x = explode('-', $start);
                $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];
                $lax = explode('-', $end);
                $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
                $prducts = mysql_query("SELECT *  FROM `purchase_items` WHERE   ndate between '$la32' AND '$laxg' order by ndate desc ");
            }
            $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"></tr>
         <tr style="background:#1c76bc;color:#fff;">
          

        <th style="border: 1px solid #1c76bc;">Invoice Date</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Invoice No</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Supplier Invoice No</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Supplier Invoice Date
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Voucher Type
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Supplier Name
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Address 1
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Address 2
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Address 3</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">State</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Tin No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">CST No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">GSTIN/UIN
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Receipt Note No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Receipt Note Date
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Order No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Order Date
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">LR No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Despatch Through
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Destination
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Term of Payment
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Terms of Delivery
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Item Name
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Tax Rate
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Batch No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">QTY
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">UOM
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Rate
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Discount %
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Purchase Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_1 Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_1 Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_2 Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_2 Ledger
</th>

<th style="text-align:center;border: 1px solid #1c76bc; ">CGST Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">CGST Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">SGST Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">SGST Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">IGST Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">IGST Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Cost Center
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Godown
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Narration
</th>
                </tr></thead><tbody><input type="hidden" name="rrt" id="rrt" value="1" />';

            $tt = 1;
            $billamt = 0;
            $tottax = 0;
            $discc = 0;
            $toott = 0;
            $paidd = 0;
            while ($prd = mysql_fetch_object($prducts)) {
                $pxf = $prd->product_id;
                $prdf = $prd->supplier;
                $pxxx = $prd->cgst + $prd->sgst;
                $olaaa = mysql_fetch_array(mysql_query("select * from suppliers where id='" . $prdf . "'  "));
                $purt = mysql_fetch_array(mysql_query("select * from purchases where id='" . $prd->purchase_id . "'  "));
                $olaaap = mysql_fetch_array(mysql_query("select * from products where id='" . $pxf . "'  "));
                $result .= '<tr  >

            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($prd->ndate)) . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->purchase_id . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->supplier . '</td>
            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($purt['invdat']))  . '</td>
            <td style="border: 1px solid #1c76bc; ">Purchase</td>
            <td style="border: 1px solid #1c76bc; ">Karunakaran</td>

            <td style=" border: 1px solid #1c76bc;">' . $purt['phone'] . '</td>
            <td style=" border: 1px solid #1c76bc;">' . $purt['email'] . '</td>
            <td style=" border: 1px solid #1c76bc;">' . $purt['note'] . '</td>
            <td style=" border: 1px solid #1c76bc;">Tamilnadu</td>
            <td style=" border: 1px solid #1c76bc;">11111111V</td>
            <td style=" border: 1px solid #1c76bc;">11111111C</td>
            <td style=" border: 1px solid #1c76bc;">27ABCDE1234D1Z1</td>
            <td style=" border: 1px solid #1c76bc;">GRN - 001</td>
            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($prd->ndate)) . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->purchase_id . '</td>
            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($prd->ndate)) . '</td>
            <td style="border: 1px solid #1c76bc; ">LR- 1234</td>
            <td style="border: 1px solid #1c76bc; "></td>
            <td style="border: 1px solid #1c76bc; ">TamilNadu</td>
            <td style="border: 1px solid #1c76bc; ">1 Days</td>
            <td style="border: 1px solid #1c76bc; ">Ex-Works
</td>
<td style=" border: 1px solid #1c76bc;">' . $olaaap['name'] . '</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->cgst . '</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->purchase_id . '</td>

<td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->qt . '</td>
<td style=" border: 1px solid #1c76bc;">' . $olaaap['unit'] . '</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->cost . '</td>
<td style="border: 1px solid #1c76bc; ">0</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->subtot . '</td>
<td style="border: 1px solid #1c76bc; ">Purchase
</td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; ">Main Location
</td>
<td style="border: 1px solid #1c76bc; "></td>





            </tr>';
                $discc = $discc + $prd->qt;
                $toott = $toott + $prd->subtot;
                $tt++;
            }
            $result .= '</tbody>
       
       </table>';






            echo $result;
        } else {
            echo '<input type="hidden" name="rrt" id="rrt" value="0" /> This Date range data already updated into tally , please refer log file for download... ';
        }
    }








    public function purdownloadxl($xmml)
    {
        $rfrp = mysql_num_rows(mysql_query("select * from tallypurchase where sii='" . $xmml . "'  "));
        $rfrpf = mysql_fetch_array(mysql_query("select * from tallypurchase where sii='" . $xmml . "'  "));
        $start = $rfrpf['fromdatt'];
        $end = $rfrpf['enddatt'];

        $zstartpp = date("Y-m-d", strtotime($start));
        $zendpp = date("Y-m-d", strtotime($end));
        $tyyy = $rfrpf['companyname'];




        if ($rfrp == 1) {

            $totalprofit = 0;
            $totalprocg = 0;
            $totalprosg = 0;
            $gtotal = 0;
            $startpp = date("d-m-Y", strtotime($start));
            $endpp = date("d-m-Y", strtotime($end));
            $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
            $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
            $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
            //$prduct = Product::find($product_id);
            if ($start == 0  || $start == '') {
                $lmm = date("Y-m-d");
                $prducts = mysql_query("SELECT *  FROM `purchase_items` WHERE   ndate between '$start' AND '$end'  order by ndate desc ");
            } else {
                $la322x = explode('-', $start);
                $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];
                $lax = explode('-', $end);
                $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
                $prducts = mysql_query("SELECT *  FROM `purchase_items` WHERE   ndate between '$start' AND '$end' order by ndate desc ");
            }
            $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead>
        <tr>
          

        <th style="border: 1px solid #1c76bc;">Invoice Date</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Invoice No</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Supplier Invoice No</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Supplier Invoice Date
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Voucher Type
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Supplier Name
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Address 1
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Address 2
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Address 3</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">State</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Tin No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">CST No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">GSTIN/UIN
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Receipt Note No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Receipt Note Date
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Order No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Order Date
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">LR No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Despatch Through
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Destination
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Term of Payment
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Terms of Delivery
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Item Name
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Tax Rate
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Batch No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">QTY
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">UOM
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Rate
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Discount %
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Purchase Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_1 Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_1 Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_2 Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_2 Ledger
</th>

<th style="text-align:center;border: 1px solid #1c76bc; ">CGST Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">CGST Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">SGST Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">SGST Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">IGST Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">IGST Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Cost Center
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Godown
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Narration
</th>
                </tr></thead><tbody><input type="hidden" name="rrt" id="rrt" value="1" />';

            $tt = 1;
            $billamt = 0;
            $tottax = 0;
            $discc = 0;
            $toott = 0;
            $paidd = 0;


            while ($prd = mysql_fetch_object($prducts)) {
                $pxf = $prd->product_id;
                $prdf = $prd->supplier;
                $pxxx = $prd->cgst + $prd->sgst;
                $olaaa = mysql_fetch_array(mysql_query("select * from suppliers where id='" . $prdf . "'  "));
                $purt = mysql_fetch_array(mysql_query("select * from purchases where id='" . $prd->purchase_id . "'  "));
                $olaaap = mysql_fetch_array(mysql_query("select * from products where id='" . $pxf . "'  "));
                $result .= '<tr  >

            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($prd->ndate)) . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->purchase_id . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->supplier . '</td>
            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($purt['invdat']))  . '</td>
            <td style="border: 1px solid #1c76bc; ">Purchase</td>
            <td style="border: 1px solid #1c76bc; ">Karunakaran</td>

            <td style=" border: 1px solid #1c76bc;">' . $purt['phone'] . '</td>
            <td style=" border: 1px solid #1c76bc;">' . $purt['email'] . '</td>
            <td style=" border: 1px solid #1c76bc;">' . $purt['note'] . '</td>
            <td style=" border: 1px solid #1c76bc;">Tamilnadu</td>
            <td style=" border: 1px solid #1c76bc;">11111111V</td>
            <td style=" border: 1px solid #1c76bc;">11111111C</td>
            <td style=" border: 1px solid #1c76bc;">27ABCDE1234D1Z1</td>
            <td style=" border: 1px solid #1c76bc;">GRN - 001</td>
            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($prd->ndate)) . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->purchase_id . '</td>
            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($prd->ndate)) . '</td>
            <td style="border: 1px solid #1c76bc; ">LR- 1234</td>
            <td style="border: 1px solid #1c76bc; "></td>
            <td style="border: 1px solid #1c76bc; ">TamilNadu</td>
            <td style="border: 1px solid #1c76bc; ">1 Days</td>
            <td style="border: 1px solid #1c76bc; ">Ex-Works
</td>
<td style=" border: 1px solid #1c76bc;">' . $olaaap['name'] . '</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->cgst . '</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->purchase_id . '</td>

<td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->qt . '</td>
<td style=" border: 1px solid #1c76bc;">' . $olaaap['unit'] . '</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->cost . '</td>
<td style="border: 1px solid #1c76bc; ">0</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->subtot . '</td>
<td style="border: 1px solid #1c76bc; ">Purchase
</td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; ">Main Location
</td>
<td style="border: 1px solid #1c76bc; "></td>





            </tr>';
                $discc = $discc + $prd->qt;
                $toott = $toott + $prd->subtot;
                $tt++;
            }
            $result .= '</tbody>
       
       </table>';


            $fnna = $start . 'to' . $end . '.xlsx';
            header('Content-type: application/vnd.ms-excel');
            header('Content-Disposition: attachment; filename=' . $fnna);
            echo $result;
            exit;
        } else {
            echo 'Data not found....';
        }
    }




    public function getRegisterReport()
    {
        $store_id = $this->input->post('store_id');
        $start = date("Y-m-d", strtotime($this->input->post('start'))) . ' 00:00:00';
        $end = date("Y-m-d", strtotime($this->input->post('end'))) . ' 23:59:59';

        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $TotalRevenue = 0;
        if ($store_id == 0) {
            // $register = Register::find_by_sql("SELECT * FROM `registers` WHERE  date between '$start' AND '$end' ORDER BY date");
            $register = $this->db->query("SELECT * FROM `registers` WHERE  date between '$start' AND '$end' ORDER BY date")->result();
        } else {
            // $register = Register::find_by_sql("SELECT * FROM `registers` WHERE store_id = '$store_id' AND date between '$start' AND '$end' ORDER BY date");
            $register = $this->db->query("SELECT * FROM `registers` WHERE store_id = '$store_id' AND date between '$start' AND '$end' ORDER BY date")->result();
        }

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];


        $result = '
        <table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="7" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr  class="hideme" style="text-align:center; " ><th colspan="7"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="7">Close Register Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

        <tr style="background: #1c76bc;color: #fff;" >
        <th style="border: 1px solid #1c76bc;">' . label("Openingtime") . '</th><th style="border: 1px solid #1c76bc;">' . label("closedat") . '</th><th style="border: 1px solid #1c76bc;">' . label("StoreName") . '</th><th style="border: 1px solid #1c76bc;">' . label("Openedby") . '</th><th style="border: 1px solid #1c76bc;">' . label("CashinHand") . '</th>';


        $mkj = mysql_query("select * from payment_mode order by id asc ");
        while ($mkjf = mysql_fetch_array($mkj)) {
            $result .= '<th style="border: 1px solid #1c76bc;">' . $mkjf['name'] . '</th>';
        }

        $result .= '<th style="border: 1px solid #1c76bc;">Return</th>';
        $result .= '<th style="border: 1px solid #1c76bc;">Expense</th>';
        $result .= '</tr></thead><tbody>';

        foreach ($register as $reg) {

            $stid = $reg->store_id;
            $stidf = mysql_fetch_array(mysql_query("select * from stores where id='" . $stid . "' "));
            if ($this->user->role === "admin")
                $action = '<div class="btn-group"><a class="btn btn-default" href="javascript:void(0)" onclick="delete_register(' . $reg->id . ')" title="' . label("Delete") . '"><i class="fa fa-times"></i></a></div>';
            else
                $action = '-';
            $result .= '<tr ><td style="border: 1px solid #1c76bc;"><a href="javascript:void(0)" ' . ($reg->closed_at ? 'onclick="RegisterDetails(' . $reg->id . ')"' : '') . '>' . date('d-m-Y H:i:s', strtotime($reg->date)) . '</a></td>
                <td style="border: 1px solid #1c76bc;">' . ($reg->closed_at ? date("d-m-Y H:i:s", strtotime($reg->closed_at)) : label("Stillopen")) . '</td>
                <td style="border: 1px solid #1c76bc;">' . (isset($stidf['name']) ? $stidf['name'] : "") . '</td>
                <td style="border: 1px solid #1c76bc;"> ' . User_model::find($reg->user_id)->username . '</td>
                <td style="border: 1px solid #1c76bc; text-align:center;">' . $reg->cash_inhand . '</td>';

            $mkj = mysql_query("select * from payment_mode order by id asc ");
            while ($mkjf = mysql_fetch_array($mkj)) {
                $mkjfff = $mkjf['id'];
                $mjmj = mysql_fetch_array(mysql_query("SELECT * FROM registers_paymentmode WHERE reg_idd='" . $reg->id . "'  AND pay_m_id='" . $mkjfff . "'   "));
                $result .= '<td style="border: 1px solid #1c76bc;">' . number_format((float)(isset($mjmj['countedcash']) ? $mjmj['countedcash'] : 0), $this->setting->decimals, '.', '') . ' </td>';

                $TotalRevenue = $TotalRevenue + (isset($mjmj['countedcash']) ? $mjmj['countedcash'] : 0);
            }



            $tot_retutn = mysql_fetch_array(mysql_query("select * from registers_ret_tot where reg_idd='" . $reg->id . "'  and pay_m_id=1  "));
            $result .= '<td style="border: 1px solid #1c76bc;">' . number_format((float)(isset($tot_retutn['countedcash']) ? $tot_retutn['countedcash'] : 0), $this->setting->decimals, '.', '') . ' </td>';

            $tot_exprn = mysql_fetch_array(mysql_query("select * from registers_ret_tot where reg_idd='" . $reg->id . "'  and pay_m_id=3  "));
            $result .= '<td style="border: 1px solid #1c76bc;">' . number_format((float)(isset($tot_exprn['countedcash']) ? $tot_exprn['countedcash'] : 0), $this->setting->decimals, '.', '') . ' </td>';

            $result .= '</tr>';
        }


        echo $result;
        die;
    }








    public function getRegisterReportstore()
    {

        $store_id = $this->input->post('store_id');
        $start = $this->input->post('start');
        $endd = $this->input->post('endd');
        $stx = $this->input->post('ckkk');
        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("Y-m-d", strtotime($start));
        $start = date("Y-m-d", strtotime($start));
        $endpp = date("Y-m-d", strtotime($endd));
        $endd = date("Y-m-d", strtotime($endd));

        $dsds = date('Y-m-d', strtotime("-1 days"));

        $TotalRevenue = 0;
        if ($start == 0) {
            $endd = date("Y-m-d");

            $register = mysql_query("SELECT * from warehouses order by name asc");
        } else if ($store_id > 0) {
            $register = mysql_query("SELECT * from warehouses where id='" . $store_id . "' ");
        } else {

            $register = mysql_query("SELECT * from warehouses order by name asc");
        }

        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="8" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="8"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="8">Store Stock Transfer Reports - from  ' . $startpp . ' Till ' . $endpp . '</th></tr>
         <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;">' . label("Store") . ' ' . label("Name") . ' </th><th style="border: 1px solid #1c76bc;">' . label("Product") . ' ' . label("Name") . ' </th><th style="border: 1px solid #1c76bc;">' . label("Opening") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Purchase") . ' </th><th style="border: 1px solid #1c76bc;">' . label("Sales") . ' </th><th style="border: 1px solid #1c76bc;">' . label("Return") . ' </th><th style="border: 1px solid #1c76bc;">' . label("Adjustment") . ' </th>';
        if ($stx == "true") {
            $result .= '<td style="border: 1px solid #1c76bc;">' . label("dispatch") . ' </td>';
        }

        $result .= '
        <th style="border: 1px solid #1c76bc;">' . label("In") . '  </th>
        <th style="border: 1px solid #1c76bc;">' . label("Out") . '  </th>
        <th style="border: 1px solid #1c76bc;">' . label("Closing") . '  </th>
        <th style="border: 1px solid #1c76bc;">' . label("Purchase Velue") . '  </th>
        <th style="border: 1px solid #1c76bc;">' . label("Sales Velue") . '  </th>
        </tr></thead><tbody>';

        while ($reg = mysql_fetch_array($register)) {
            $strid = $reg['id'];
            if ($strid > 0) {
                $rep = mysql_query("SELECT * from products order by name asc");
                while ($repr = mysql_fetch_array($rep)) {


                    $snew1 = 0;
                    $snew2 = 0;
                    $snew3 = 0;
                    $snew4 = 0;
                    $snew5 = 0;
                    $snew6 = 0;
                    $snewop = 0;
                    $snewcl = 0;


                    $codeid = $repr['id'];

                    $cal1 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1,sum(totamt) as sskm from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=1 and war_id='" . $strid . "' and date between '$start' and '$endd'  "));

                    $cal5 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=5 and war_id='" . $strid . "' and date between '$start' and '$endd'  "));
                    $snew1 = $cal1['pur1'];
                    $sskmp = $cal1['sskm'];


                    $cal2 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1,sum(totamt) as sskm from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=2 and  war_id='" . $strid . "' and date between '$start' and '$endd'  "));

                    $snew2 = $cal2['pur1'];
                    $sskm = $cal2['sskm'];


                    $cal4 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=4 and war_id='" . $strid . "' and  date between '$start' and '$endd'  "));
                    $snew4 = $cal4['pur1'];

                    $cal3 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=3 and war_id='" . $strid . "' and  date between '$start' and '$endd'  "));
                    $snew3 = $cal3['pur1'];

                    $cal6 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=6 and war_id='" . $strid . "' and date between '$start' and '$endd'  "));
                    $snew6 = $cal6['pur1'];


                    $ocal8 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=8 and  war_id='" . $strid . "' and date between '$start' and '$endd'    "));
                    $osnew8 = $ocal8['pur1'];

                    $ocal9 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=9 and war_id='" . $strid . "' and date between '$start' and '$endd'    "));
                    $osnew9 = $ocal9['pur1'];






                    /////opening
                    $ocal1 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=1 and war_id='" . $strid . "' and  date < '$start'   "));
                    $ocal5 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=5 and war_id='" . $strid . "' and  date <= '$endd' "));
                    $osnew1 = $ocal1['pur1'] + $ocal5['pur1'];


                    $ocal2 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=2 and war_id='" . $strid . "' and date < '$start'   "));
                    $osnew2 = $ocal2['pur1'];

                    $ocal4 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=4 and  war_id='" . $strid . "' and date  < '$start'   "));
                    $osnew4 = $ocal4['pur1'];

                    $ocal3 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=3 and war_id='" . $strid . "' and date < '$start'   "));
                    $osnew3 = $ocal3['pur1'];

                    $ocal6 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=6 and war_id='" . $strid . "' and date < '$start'   "));
                    $osnew6 = $ocal6['pur1'];

                    $snewop = $osnew1 + $osnew4 - $osnew3 - $osnew6 - $osnew2;


                    /////closing
                    $cocal1 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=1 and war_id='" . $strid . "' and date <= '$endd'   "));

                    $cocal5 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=5 and war_id='" . $strid . "' and date <= '$endd' "));

                    $cosnew1 = $cocal1['pur1'] + $cocal5['pur1'];


                    $cocal2 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=2 and war_id='" . $strid . "' and date <= '$endd'   "));
                    $cosnew2 = $cocal2['pur1'];

                    $cocal4 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=4 and war_id='" . $strid . "' and date  <= '$endd'   "));
                    $cosnew4 = $cocal4['pur1'];

                    $cocal3 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=3 and war_id='" . $strid . "' and date <= '$endd'   "));
                    $cosnew3 = $cocal3['pur1'];

                    $cocal6 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=6 and war_id='" . $strid . "' and date <= '$endd'   "));
                    $cosnew6 = $cocal6['pur1'];


                    $ttkm = $osnew9 - $osnew8;
                    $snewcl = $cosnew1 + $cosnew4 - $cosnew3 - $cosnew6 - $cosnew2 + $ttkm;














                    $result .= '<tr>
            
           
            <td style="border: 1px solid #1c76bc;">' . $reg['name'] . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . $repr['name'] . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($snewop) . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($snew1) . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($snew2) . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($snew4) . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($snew3) . '</td>
            
            
         
            
            ';
                    if ($stx == "true") {
                        $result .= '<td style="border: 1px solid #1c76bc;">' . $snew6 . '</td>';
                    }
                    $result .= '
         <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($osnew9) . '</td>
         <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($osnew8) . '</td>
         <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($snewcl) . '</td>

<td style="border: 1px solid #1c76bc;text-align:right;">' . number_format((float)$sskmp, $this->setting->decimals, '.', '') . '</td>

<td style="border: 1px solid #1c76bc;text-align:right;">' . number_format((float)$sskm, $this->setting->decimals, '.', '') . '</td> 

            
            
            </tr>';
                    $TotalRevenue = 0;
                }
            }
        }

        $result .= '</tbody></table>';

        echo $result;
    }







    public function cclrtstore()
    {


        $store_id = $this->input->post('store_id');


        $start = $this->input->post('start');
        $endd = $this->input->post('endd');
        $stx = $this->input->post('ckkk');

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("Y-m-d", strtotime($start));
        $start = date("Y-m-d", strtotime($start));
        $endpp = date("Y-m-d", strtotime($endd));
        $endd = date("Y-m-d", strtotime($endd));



        $dsds = date('Y-m-d', strtotime("-1 days"));

        $TotalRevenue = 0;



        if ($store_id > 0) {
            $register = mysql_query("SELECT * FROM `levels` where warehousr='" . $store_id . "' order by name asc  ");
        } else {
            $register = mysql_query("SELECT * FROM `levels`  order by name asc ");
        }





        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="8" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="8"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="8">Store Stock Transfer Reports - from  ' . $startpp . ' Till ' . $endpp . '</th></tr>
      <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;">' . label("Warehouse") . '  </th><th style="border: 1px solid #1c76bc;">' . label("Product") . ' </th>

        <th style="border: 1px solid #1c76bc;">' . label("Level") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Rack") . ' </th>

        <th style="border: 1px solid #1c76bc;">' . label("Opening") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Purchase") . ' </th><th style="border: 1px solid #1c76bc;">' . label("Sales") . ' </th><th style="border: 1px solid #1c76bc;">' . label("Return") . ' </th><th style="border: 1px solid #1c76bc;">' . label("Adjustment") . ' </th>';




        $result .= '
        <th style="border: 1px solid #1c76bc;">' . label("In") . '  </th>
        <th style="border: 1px solid #1c76bc;">' . label("Out") . '  </th>
        <th style="border: 1px solid #1c76bc;">' . label("Closing") . '  </th>
        <th style="border: 1px solid #1c76bc;">' . label("Purchase Value") . '  </th>
        <th style="border: 1px solid #1c76bc;">' . label("Sales Value") . '  </th>
        </tr></thead><tbody>';




        while ($reg = mysql_fetch_array($register)) {

            $strid = $reg['warehousr'];
            $rackss = $reg['valueper'];
            $ranamex = $reg['name'];
            $randdx = $reg['warehousr'];

            $randdxf = mysql_fetch_array(mysql_query("select * from warehouses where id='" . $randdx . "' "));

            for ($itt = 1; $itt <= $rackss; $itt++) {
                if ($stx > 0) {
                    $rep = mysql_query("SELECT * from products where id='" . $stx . "' ");
                } else {
                    $rep = mysql_query("SELECT * from products order by name asc");
                }

                while ($repr = mysql_fetch_array($rep)) {




                    $snew1 = 0;
                    $snew2 = 0;
                    $snew3 = 0;
                    $snew4 = 0;
                    $snew5 = 0;
                    $snew6 = 0;
                    $snewop = 0;
                    $snewcl = 0;


                    $codeid = $repr['id'];


                    $cal1 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1,sum(totamt) as sskm from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=1 and war_id='" . $strid . "' and llvel='" . $ranamex . "' and rrack='" . $itt . "' and date between '$start' and '$endd'  "));

                    $cal5 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=5 and war_id='" . $strid . "' and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and  date between '$start' and '$endd'  "));
                    $snew1 = $cal1['pur1'];
                    $mick1 = $cal1['sskm'];


                    $cal2 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1,sum(totamt) as sskm from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=2 and  war_id='" . $strid . "' and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and date between '$start' and '$endd'  "));
                    $snew2 = $cal2['pur1'];
                    $mick2 = $cal2['sskm'];

                    $cal4 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=4 and war_id='" . $strid . "' and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and  date between '$start' and '$endd'  "));
                    $snew4 = $cal4['pur1'];

                    $cal3 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=3 and war_id='" . $strid . "' and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and  date between '$start' and '$endd'  "));
                    $snew3 = $cal3['pur1'];

                    $cal6 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=6 and war_id='" . $strid . "' and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and date between '$start' and '$endd'  "));
                    $snew6 = $cal6['pur1'];


                    $ocal8 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=8 and  war_id='" . $strid . "' and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and date between '$start' and '$endd'    "));
                    $osnew8 = $ocal8['pur1'];

                    $ocal9 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=9 and war_id='" . $strid . "' and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and date between '$start' and '$endd'    "));
                    $osnew9 = $ocal9['pur1'];






                    /////opening
                    $ocal1 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=1 and  war_id='" . $strid . "' and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and  date < '$start'   "));
                    $ocal5 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=5 and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and war_id='" . $strid . "' and  date <= '$endd' "));
                    $osnew1 = $ocal1['pur1'] + $ocal5['pur1'];


                    $ocal2 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=2 and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and war_id='" . $strid . "' and date < '$start'   "));
                    $osnew2 = $ocal2['pur1'];

                    $ocal4 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=4 and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and  war_id='" . $strid . "' and date  < '$start'   "));
                    $osnew4 = $ocal4['pur1'];

                    $ocal3 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=3 and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and war_id='" . $strid . "' and date < '$start'   "));
                    $osnew3 = $ocal3['pur1'];

                    $ocal6 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=6 and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and war_id='" . $strid . "' and date < '$start'   "));
                    $osnew6 = $ocal6['pur1'];

                    $snewop = $osnew1 + $osnew4 - $osnew3 - $osnew6 - $osnew2;


                    /////closing
                    $cocal1 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=1 and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and war_id='" . $strid . "' and date <= '$endd'   "));

                    $cocal5 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=5 and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and war_id='" . $strid . "' and date <= '$endd' "));

                    $cosnew1 = $cocal1['pur1'] + $cocal5['pur1'];


                    $cocal2 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=2 and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and war_id='" . $strid . "' and date <= '$endd'   "));
                    $cosnew2 = $cocal2['pur1'];

                    $cocal4 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=4 and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and war_id='" . $strid . "' and date  <= '$endd'   "));
                    $cosnew4 = $cocal4['pur1'];

                    $cocal3 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=3 and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and war_id='" . $strid . "' and date <= '$endd'   "));
                    $cosnew3 = $cocal3['pur1'];

                    $cocal6 = mysql_fetch_array(mysql_query("select *,sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and tyoftrans=6 and llvel='" . $ranamex . "' and rrack='" . $itt . "'  and war_id='" . $strid . "' and date <= '$endd'   "));
                    $cosnew6 = $cocal6['pur1'];


                    $ttkm = $osnew9 - $osnew8;
                    $snewcl = $cosnew1 + $cosnew4 - $cosnew3 - $cosnew6 - $cosnew2 + $ttkm;












                    if ($snewop > 0  || $snewcl > 0) {

                        $result .= '<tr>
            <td style="border: 1px solid #1c76bc;">' . $randdxf['name'] . '</td>
            <td style="border: 1px solid #1c76bc;">' . $repr['name'] . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . $ranamex . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . $itt . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($snewop) . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($snew1) . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($snew2) . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($snew4) . '</td>
            <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($snew3) . '</td>
            ';

                        $result .= '
         <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($osnew9) . '</td>
         <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($osnew8) . '</td>
         <td style="border: 1px solid #1c76bc;text-align:right;">' . floatval($snewcl) . '</td>

<td style="border: 1px solid #1c76bc;text-align:right;">' . number_format((float)$mick1, $this->setting->decimals, '.', '') . '</td>

<td style="border: 1px solid #1c76bc;text-align:right;">' . number_format((float)$mick2, $this->setting->decimals, '.', '') . '</td> 

         </tr>';
                    }






                    $TotalRevenue = 0;
                }
            }
        }

        $result .= '</tbody></table>';

        echo $result;
    }











    public function fastmovingstore()
    {


        $store_id = $this->input->post('store_id');
        $start = $this->input->post('start');
        $endd = $this->input->post('endd');
        $stx = $this->input->post('ckkk');

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("Y-m-d", strtotime($start));
        $start = date("Y-m-d", strtotime($start));
        $endpp = date("Y-m-d", strtotime($endd));
        $endd = date("Y-m-d", strtotime($endd));



        $dsds = date('Y-m-d', strtotime("-1 days"));

        $TotalRevenue = 0;



        if ($store_id > 0) {
            $register = mysql_query("select *,sum(qt) as fas from products inner join categories on products.category=categories.id inner join sale_items on products.id=sale_items.product_id where categories.id='$store_id' and   sale_items.date between '$start' and '$endd' GROUP by products.id order by fas desc");
        } else {

            $register = mysql_query("select *,sum(qt) as fas from products inner join categories on products.category=categories.id inner join sale_items on products.id=sale_items.product_id where sale_items.date between '$start' and '$endd' GROUP by products.id order by fas desc");
        }





        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="3" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="3"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="3">Fast Moving Stock  Reports - from  ' . $startpp . ' Till ' . $endpp . '</th></tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;">' . label("Category") . '  </th><th style="border: 1px solid #1c76bc;">' . label("Product") . ' </th>

        <th style="border: 1px solid #1c76bc;">' . label("Sold Qty") . ' </th></tr></thead><tbody>
        ';

        while ($reg = mysql_fetch_array($register)) {

            $stxrid = $reg['category'];
            $stnam = $reg['name'];
            $stfas = $reg['fas'];
            $randdxf = mysql_fetch_array(mysql_query("select * from categories where id='" . $stxrid . "' "));

            $result .= '<tr><td style="border: 1px solid #1c76bc;">' . $randdxf['name'] . '</td>
         <td style="border: 1px solid #1c76bc;">' . $stnam . '</td>
         <td style="text-align:right; border: 1px solid #1c76bc;">' . floatval($stfas) . '</td>
         </tr>';
        }




        $result .= '</tbody></table>';

        echo $result;
    }







    public function getrackwar()
    {
        $store_id = $this->input->post('store_id');

        $stx = $this->input->post('ckkk');
        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($endd));

        $dsds = date('Y-m-d', strtotime("-1 days"));

        $TotalRevenue = 0;
        if ($store_id > 0 && $stx > 0) {
            $rep = mysql_query("SELECT * from purchase_items where avlqty>0 and  warehouse_id='" . $store_id . "' and  product_id='" . $stx . "' order by product_id asc");
        } else if ($store_id > 0 && $stx == 0) {
            $rep = mysql_query("SELECT * from purchase_items where avlqty>0 and  warehouse_id='" . $store_id . "'  order by product_id asc");
        } else if ($store_id == 0 && $stx > 0) {
            $rep = mysql_query("SELECT * from purchase_items where avlqty>0  and  product_id='" . $stx . "' order by product_id asc");
        } else {
            $rep = mysql_query("SELECT * from purchase_items where avlqty>0 order by product_id asc");
        }

        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="8" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="8"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="8">Store Stock Transfer Reports - from  ' . $startpp . ' Till ' . $endpp . '</th></tr>
        <tr><th style="border: 1px solid #1c76bc;">' . label("Warehouse") . ' ' . label("Name") . ' </th><th style="border: 1px solid #1c76bc;">' . label("Product") . ' ' . label("Name") . ' </th><th style="border: 1px solid #1c76bc;">' . label("Level") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Rack") . ' </th><th style="border: 1px solid #1c76bc;">' . label("Avl Qty") . ' </th>';


        $result .= '</tr></thead><tbody>';




        while ($repr = mysql_fetch_array($rep)) {

            $olx171 = $repr['product_id'];
            $olx173 = $repr['warehouse_id'];
            $olx172 = mysql_fetch_array(mysql_query("SELECT * from products where id='" . $olx171 . "'  "));
            $olx174 = mysql_fetch_array(mysql_query("SELECT * from warehouses where id='" . $olx173 . "'  "));


            $result .= '<tr>
            <td style="border: 1px solid #1c76bc;">' . $olx174['name'] . '</td>
            <td style="border: 1px solid #1c76bc;">' . $olx172['name'] . '</td>
            <td style="border: 1px solid #1c76bc;">' . $repr['levelk'] . '</td>
            <td style="border: 1px solid #1c76bc;">' . $repr['rackk'] . '</td>
            <td style="border: 1px solid #1c76bc;">' . $repr['avlqty'] . '</td>
            </tr>';




            $TotalRevenue = 0;
        }




        $result .= '</tbody></table>';

        echo $result;
    }










    public function unsoldrackwar()
    {
        $store_id = $this->input->post('store_id');
        $prod_id = $this->input->post('ckkk');


        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];

        if ($store_id == 1) {
            $rtt = "order by avlqty desc";
        } else {
            $rtt = "order by ndate asc";
        }

        if ($prod_id > 0) {
            $rep = mysql_query("SELECT * from purchase_items where product_id='$prod_id'  $rtt ");
        } else {

            $rep = mysql_query("SELECT * from purchase_items  $rtt ");
        }

        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="8" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="8"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="8">Unsold Report</th></tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;">' . label("Warehouse") . ' ' . label("Name") . ' </th><th style="border: 1px solid #1c76bc;">' . label("Product") . ' ' . label("Name") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Level") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Rack") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Purchased Date") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Purchased Qty") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Avl Qty") . ' </th>';


        $result .= '</tr></thead><tbody>';




        while ($repr = mysql_fetch_array($rep)) {

            $olx171 = $repr['product_id'];
            $olx173 = $repr['warehouse_id'];
            $olx172 = mysql_fetch_array(mysql_query("SELECT * from products where id='" . $olx171 . "'  "));
            $olx174 = mysql_fetch_array(mysql_query("SELECT * from warehouses where id='" . $olx173 . "'  "));


            $result .= '<tr>
            <td style="border: 1px solid #1c76bc;">' . $olx174['name'] . '</td>
            <td style="border: 1px solid #1c76bc;">' . $olx172['name'] . '</td>
            <td style="border: 1px solid #1c76bc;">' . $repr['levelk'] . '</td>
            <td style="border: 1px solid #1c76bc;">' . $repr['rackk'] . '</td>
            <td style="border: 1px solid #1c76bc;">' . $repr['ndate'] . '</td>
            <td style="border: 1px solid #1c76bc;">' . $repr['qt'] . '</td>
            <td style="border: 1px solid #1c76bc;">' . $repr['avlqty'] . '</td>
            </tr>';




            $TotalRevenue = 0;
        }




        $result .= '</tbody></table>';

        echo $result;
    }



    public function getsalestallybb()
    {
        $start = $this->input->post('Range');
        $end   = $this->input->post('Range1');
        $zstartpp = date("Y-m-d", strtotime($start));
        $zendpp = date("Y-m-d", strtotime($end));

        $y1 = mysql_num_rows(mysql_query("select * from tallysales where fromdatt <= '$zstartpp' and enddatt >= '$zstartpp' "));
        $y2 = mysql_num_rows(mysql_query("select * from tallysales where fromdatt <= '$zendpp' and enddatt >= '$zendpp' "));
        $y3 = mysql_num_rows(mysql_query("select * from tallysales where fromdatt >= '$zstartpp' and enddatt <= '$zendpp' "));


        if ($y1 == 0 && $y2 == 0 && $y3 == 0) {
            $totalprofit = 0;
            $totalprocg = 0;
            $totalprosg = 0;
            $gtotal = 0;
            $startpp = date("d-m-Y", strtotime($start));
            $endpp = date("d-m-Y", strtotime($end));
            $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
            $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
            $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
            //$prduct = Product::find($product_id);
            if ($start == 0  || $start == '') {
                $lmm = date("Y-m-d");
                $prducts = mysql_query("SELECT *  FROM `sale_items` WHERE   `date` between '$lmm' AND '$lmm'  order by `date` desc ");
            } else {
                $la322x = explode('-', $start);
                $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];
                $lax = explode('-', $end);
                $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
                $prducts = mysql_query("SELECT *  FROM `sale_items` WHERE   `date` between '$la32' AND '$laxg' order by `date` desc ");
            }
            $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"></tr>
       <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
          

        <th style="border: 1px solid #1c76bc;">Sales Date</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Sales No</th>


<th style="text-align:center;border: 1px solid #1c76bc; ">Voucher Type
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Customer Name
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Address 1
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Address 2
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Address 3</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">State</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Tin No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">CST No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">GSTIN/UIN
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Receipt Note No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Receipt Note Date
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Order No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Order Date
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">LR No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Despatch Through
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Destination
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Term of Payment
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Terms of Delivery
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Item Name
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Tax Rate
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Batch No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">QTY
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">UOM
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Rate
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Discount %
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Sales Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_1 Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_1 Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_2 Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_2 Ledger
</th>

<th style="text-align:center;border: 1px solid #1c76bc; ">CGST Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">CGST Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">SGST Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">SGST Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">IGST Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">IGST Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Cost Center
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Godown
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Narration
</th>
                </tr></thead><tbody><input type="hidden" name="rrt" id="rrt" value="1" />';

            $tt = 1;
            $billamt = 0;
            $tottax = 0;
            $discc = 0;
            $toott = 0;
            $paidd = 0;
            while ($prd = mysql_fetch_object($prducts)) {
                $pxf = $prd->product_id;
                $prdf = $prd->supplier;
                $pxxx = $prd->cgst + $prd->sgst;
                $olaaa = mysql_fetch_array(mysql_query("select * from suppliers where id='" . $prdf . "'  "));
                $purt = mysql_fetch_array(mysql_query("select * from sales where id='" . $prd->sale_id . "'  "));
                $olaaap = mysql_fetch_array(mysql_query("select * from products where id='" . $pxf . "'  "));
                $result .= '<tr  >

            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($prd->date)) . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->sale_id . '</td>
            

            <td style="border: 1px solid #1c76bc; ">Sales</td>
            <td style="border: 1px solid #1c76bc; ">Karunakaran</td>

            <td style=" border: 1px solid #1c76bc;">' . $purt['mobnnm'] . '</td>
            <td style=" border: 1px solid #1c76bc;">' . $purt['mobnnm'] . '</td>
            <td style=" border: 1px solid #1c76bc;">' . $purt['mobnnm'] . '</td>
            <td style=" border: 1px solid #1c76bc;">Tamilnadu</td>
            <td style=" border: 1px solid #1c76bc;">11111111V</td>
            <td style=" border: 1px solid #1c76bc;">11111111C</td>
            <td style=" border: 1px solid #1c76bc;">27ABCDE1234D1Z1</td>
            <td style=" border: 1px solid #1c76bc;">GRN - 001</td>
            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($prd->date)) . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->sale_id . '</td>
            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($prd->date)) . '</td>
            <td style="border: 1px solid #1c76bc; ">LR- 1234</td>
            <td style="border: 1px solid #1c76bc; "></td>
            <td style="border: 1px solid #1c76bc; ">TamilNadu</td>
            <td style="border: 1px solid #1c76bc; ">1 Days</td>
            <td style="border: 1px solid #1c76bc; ">Ex-Works
</td>
<td style=" border: 1px solid #1c76bc;">' . $olaaap['name'] . '</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->cgst . '</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->sale_id . '</td>

<td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->qt . '</td>
<td style=" border: 1px solid #1c76bc;">' . $olaaap['unit'] . '</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->cost . '</td>
<td style="border: 1px solid #1c76bc; ">0</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->subtot . '</td>
<td style="border: 1px solid #1c76bc; ">Sales
</td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; ">Main Location
</td>
<td style="border: 1px solid #1c76bc; "></td>





            </tr>';
                $discc = $discc + $prd->qt;
                $toott = $toott + $prd->subtot;
                $tt++;
            }
            $result .= '</tbody>
       
       </table>';

            echo $result;
        } else {
            echo '<input type="hidden" name="rrt" id="rrt" value="0" /> This Date range data already updated into tally , please refer log file for download... ';
        }
    }



    public function seldownloadxl($xmml)
    {



        $rfrp = mysql_num_rows(mysql_query("select * from  tallysales where sii='" . $xmml . "'  "));
        $rfrpf = mysql_fetch_array(mysql_query("select * from  tallysales where sii='" . $xmml . "'  "));
        $start = $rfrpf['fromdatt'];
        $end = $rfrpf['enddatt'];

        $zstartpp = date("Y-m-d", strtotime($start));
        $zendpp = date("Y-m-d", strtotime($end));
        $tyyy = $rfrpf['companyname'];




        if ($rfrp == 1) {



            $totalprofit = 0;
            $totalprocg = 0;
            $totalprosg = 0;
            $gtotal = 0;
            $startpp = date("d-m-Y", strtotime($start));
            $endpp = date("d-m-Y", strtotime($end));
            $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
            $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
            $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
            //$prduct = Product::find($product_id);
            if ($start == 0  || $start == '') {
                $lmm = date("Y-m-d");
                $prducts = mysql_query("SELECT *  FROM `sale_items` WHERE   `date` between '$start' AND '$end'  order by `date` desc ");
            } else {
                $la322x = explode('-', $start);
                $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];
                $lax = explode('-', $end);
                $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
                $prducts = mysql_query("SELECT *  FROM `sale_items` WHERE   `date` between '$start' AND '$end' order by `date` desc ");
            }
            $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
          

        <th style="border: 1px solid #1c76bc;">Sales Date</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Sales No</th>


<th style="text-align:center;border: 1px solid #1c76bc; ">Voucher Type
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Customer Name
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Address 1
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Address 2
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Address 3</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">State</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Tin No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">CST No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">GSTIN/UIN
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Receipt Note No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Receipt Note Date
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Order No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Order Date
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">LR No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Despatch Through
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Destination
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Term of Payment
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Terms of Delivery
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Item Name
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Tax Rate
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Batch No
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">QTY
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">UOM
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Rate
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Discount %
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Sales Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_1 Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_1 Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_2 Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Other Charges_2 Ledger
</th>

<th style="text-align:center;border: 1px solid #1c76bc; ">CGST Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">CGST Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">SGST Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">SGST Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">IGST Amount
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">IGST Ledger
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Cost Center
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Godown
</th>
<th style="text-align:center;border: 1px solid #1c76bc; ">Narration
</th>
                </tr></thead><tbody><input type="hidden" name="rrt" id="rrt" value="1" />';

            $tt = 1;
            $billamt = 0;
            $tottax = 0;
            $discc = 0;
            $toott = 0;
            $paidd = 0;
            while ($prd = mysql_fetch_object($prducts)) {
                $pxf = $prd->product_id;
                $prdf = $prd->supplier;
                $pxxx = $prd->cgst + $prd->sgst;
                $olaaa = mysql_fetch_array(mysql_query("select * from suppliers where id='" . $prdf . "'  "));
                $purt = mysql_fetch_array(mysql_query("select * from sales where id='" . $prd->sale_id . "'  "));
                $olaaap = mysql_fetch_array(mysql_query("select * from products where id='" . $pxf . "'  "));
                $result .= '<tr  >

            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($prd->date)) . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->sale_id . '</td>
            

            <td style="border: 1px solid #1c76bc; ">Sales</td>
            <td style="border: 1px solid #1c76bc; ">Karunakaran</td>

            <td style=" border: 1px solid #1c76bc;">' . $purt['mobnnm'] . '</td>
            <td style=" border: 1px solid #1c76bc;">' . $purt['mobnnm'] . '</td>
            <td style=" border: 1px solid #1c76bc;">' . $purt['mobnnm'] . '</td>
            <td style=" border: 1px solid #1c76bc;">Tamilnadu</td>
            <td style=" border: 1px solid #1c76bc;">11111111V</td>
            <td style=" border: 1px solid #1c76bc;">11111111C</td>
            <td style=" border: 1px solid #1c76bc;">27ABCDE1234D1Z1</td>
            <td style=" border: 1px solid #1c76bc;">GRN - 001</td>
            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($prd->date)) . '</td>
            <td style="border: 1px solid #1c76bc; ">' . $prd->sale_id . '</td>
            <td style="border: 1px solid #1c76bc; ">' . date("d/m/Y", strtotime($prd->date)) . '</td>
            <td style="border: 1px solid #1c76bc; ">LR- 1234</td>
            <td style="border: 1px solid #1c76bc; "></td>
            <td style="border: 1px solid #1c76bc; ">TamilNadu</td>
            <td style="border: 1px solid #1c76bc; ">1 Days</td>
            <td style="border: 1px solid #1c76bc; ">Ex-Works
</td>
<td style=" border: 1px solid #1c76bc;">' . $olaaap['name'] . '</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->cgst . '</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->sale_id . '</td>

<td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->qt . '</td>
<td style=" border: 1px solid #1c76bc;">' . $olaaap['unit'] . '</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->cost . '</td>
<td style="border: 1px solid #1c76bc; ">0</td>
<td style="border: 1px solid #1c76bc; ">' . $prd->subtot . '</td>
<td style="border: 1px solid #1c76bc; ">Sales
</td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; "></td>
<td style="border: 1px solid #1c76bc; ">Main Location
</td>
<td style="border: 1px solid #1c76bc; "></td>





            </tr>';
                $discc = $discc + $prd->qt;
                $toott = $toott + $prd->subtot;
                $tt++;
            }
            $result .= '</tbody>
       
       </table>';

            $fnna = $start . 'to' . $end . '.xlsx';
            header('Content-type: application/vnd.ms-excel');
            header('Content-Disposition: attachment; filename=' . $fnna);
            echo $result;
            exit;
        } else {
            echo 'Data not found...';
        }
    }






    public function getRegrtstoreall()
    {

        $start = $this->input->post('start');
        $endd = $this->input->post('endd');
        $stx = $this->input->post('ckkk');
        $limittt = $this->input->post('limittt');

        $tot_value = 0;
        $stores_id = $this->input->post('storesSelect');

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($endd));


        $dsds = date('Y-m-d', strtotime("-1 days"));

        $TotalRevenue = 0;
        if ($start == 0) {
            $endd = date("Y-m-d");

            $register = mysql_query("SELECT id , name , price from products order by name asc limit $limittt , 250 ");
        } else {

            $register = mysql_query("SELECT id , name , price from products order by name asc  limit  $limittt , 250 ");
        }

        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="9" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9">Closing Stock Reports
 from  ' . $startpp . ' Till ' . $endpp . '</th></tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;">' . label("ID") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Product") . ' ' . label("Name") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Initial") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Opening") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Purchase") . ' </th><th style="border: 1px solid #1c76bc;">' . label("Sales") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Cancel") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Return") . ' </th>

         ';


        $result .= '
     
        <th style="border: 1px solid #1c76bc;">' . label("Closing") . '  </th>
        <th style="border: 1px solid #1c76bc;">' . label("Price") . '  </th>
        <th style="border: 1px solid #1c76bc;">' . label("Value") . '  </th>
        </tr></thead><tbody>';

        while ($reg = mysql_fetch_array($register)) {

            $snew1 = 0;
            $snew2 = 0;
            $snew3 = 0;
            $snew4 = 0;
            $snew5 = 0;
            $snew6 = 0;
            $snewop = 0;
            $snewcl = 0;






            $codeid = $reg['id'];
            $stores_id;
            //Initial Stock Calculation
            $q_stock = mysql_fetch_array(mysql_query("select sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "'  and store_id='" . $stores_id . "' and tyoftrans=5  "));
            $q_stockf = $q_stock['pur1'];


            //Opening Stock Calculation
            //Before day
            $bb_sal = mysql_fetch_array(mysql_query("select sum(qt) as pur1 from sale_items where product_id='" . $codeid . "' and store_irrdd='" . $stores_id . "'  and date <  '$start'  "));
            $bb_sal_f = $bb_sal['pur1']; //sales

            $bb_purc = mysql_fetch_array(mysql_query("select sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and store_id='" . $stores_id . "' and tyoftrans=1 and date <  '$start'  "));
            $bb_purc_f = $bb_purc['pur1']; //purchase

            $bb_can = mysql_fetch_array(mysql_query("select sum(qt) as pur1 from sale_items where product_id='" . $codeid . "' and store_irrdd='" . $stores_id . "' and cancel_status=1  and date <  '$start'  "));
            $bb_can_f = $bb_can['pur1']; //cancel

            $bb_ret = mysql_fetch_array(mysql_query("select sum(sl_newqt) as pur1 from retunn_items where prodd_ids='" . $codeid . "' and store_idsi='" . $stores_id . "'  and to_datte <  '$start'  "));
            $bb_ret_f = $bb_ret['pur1']; //return



            $opening_stock = $q_stockf - $bb_sal_f + $bb_purc_f + $bb_can_f + $bb_ret_f;


            //Between  date
            $bbwn_sal = mysql_fetch_array(mysql_query("select sum(qt) as pur1 from sale_items where product_id='" . $codeid . "' and store_irrdd='" . $stores_id . "'  and date between '$start' and '$endd'  "));
            $bbwn_sal_f = $bbwn_sal['pur1']; //sales

            $bbwn_purc = mysql_fetch_array(mysql_query("select sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and store_id='" . $stores_id . "' and tyoftrans=1 and date between '$start' and '$endd'  "));
            $bbwn_purc_f = $bbwn_purc['pur1']; //purchase

            $bbwn_can = mysql_fetch_array(mysql_query("select sum(qt) as pur1 from sale_items where product_id='" . $codeid . "' and store_irrdd='" . $stores_id . "' and cancel_status=1  and date between  '$start' and '$endd'  "));
            $bbwn_can_f = $bbwn_can['pur1']; //cancel

            $bbwn_ret = mysql_fetch_array(mysql_query("select sum(sl_newqt) as pur1 from retunn_items where prodd_ids='" . $codeid . "' and store_idsi='" . $stores_id . "'  and to_datte between  '$start' and '$endd'  "));
            $bbwn_ret_f = $bbwn_ret['pur1']; //return


            $bbwn_phyin_f = 0; //in
            $bbwn_phyout_f = 0; //out


            $bbwn_proinn_f = 0;
            $bbwn_proout_f = 0;


            $todat_qty = $bbwn_sal_f + $bbwn_purc_f + $bbwn_can_f + $bbwn_ret_f;


            //end day
            $bben_sal = mysql_fetch_array(mysql_query("select sum(qt) as pur1 from sale_items where product_id='" . $codeid . "' and store_irrdd='" . $stores_id . "'  and date <= '$endd'  "));
            $bben_sal_f = $bben_sal['pur1']; //sales

            $bben_purc = mysql_fetch_array(mysql_query("select sum(qty) as pur1 from stock_transfer where pro_id='" . $codeid . "' and store_id='" . $stores_id . "' and tyoftrans=1 and date <= '$endd'  "));
            $bben_purc_f = $bben_purc['pur1']; //purchase

            $bben_can = mysql_fetch_array(mysql_query("select sum(qt) as pur1 from sale_items where product_id='" . $codeid . "' and store_irrdd='" . $stores_id . "' and cancel_status=1  and date <= '$endd'  "));
            $bben_can_f = $bben_can['pur1']; //cancel

            $bben_ret = mysql_fetch_array(mysql_query("select sum(sl_newqt) as pur1 from retunn_items where prodd_ids='" . $codeid . "' and store_idsi='" . $stores_id . "'  and to_datte <= '$endd'  "));
            $bben_ret_f = $bben_ret['pur1']; //return



            $closing_stock = $q_stockf - $bben_sal_f + $bben_purc_f + $bben_can_f + $bben_ret_f;

            $tot_value = $tot_value + $closing_stock * $reg['price'];
            $cval_value = $closing_stock * $reg['price'];






            $result .= '<tr>
            
           
            <td style="border: 1px solid #1c76bc;text-align:left;">' . $reg['id'] . '</td>
            <td style="border: 1px solid #1c76bc;text-align:left;">' . $reg['name'] . '</td>
            <td style="border: 1px solid #1c76bc;">' . floatval($q_stockf) . '</td>
            <td style="border: 1px solid #1c76bc;">' . floatval($opening_stock) . '</td>
            
            <td style="border: 1px solid #1c76bc;">' . floatval($bbwn_purc_f) . '</td>
            <td style="border: 1px solid #1c76bc;">' . floatval($bbwn_sal_f) . '</td>
            <td style="border: 1px solid #1c76bc;">' . floatval($bbwn_can_f) . '</td>
            <td style="border: 1px solid #1c76bc;">' . floatval($bbwn_ret_f) . '</td>

           


            <td style="border: 1px solid #1c76bc;">' . floatval($closing_stock) . '</td>
            <td style="border: 1px solid #1c76bc;">' . floatval($reg['price']) . '</td>
            <td style="border: 1px solid #1c76bc;">' . floatval($cval_value) . '</td>
            
            
            </tr>';
            $TotalRevenue = 0;
        }

        $result .= '<tr>
            
           
            
            
            <td style="border: 1px solid #1c76bc;text-align:left;"></td>
            <td style="border: 1px solid #1c76bc;text-align:left;"></td>
            <td style="border: 1px solid #1c76bc;text-align:left;"></td>
            <td style="border: 1px solid #1c76bc;text-align:left;"></td>

            


            <td style="border: 1px solid #1c76bc;text-align:left;"></td>
            <td style="border: 1px solid #1c76bc;text-align:left;"></td>
            <td style="border: 1px solid #1c76bc;text-align:left;"></td>
            <td style="border: 1px solid #1c76bc;text-align:left;"></td>
            <td style="border: 1px solid #1c76bc;text-align:left;"></td>

            <td style="border: 1px solid #1c76bc;text-align:left;">Total</td>
            <td style="border: 1px solid #1c76bc;">' . floatval($tot_value) . '</td>
            
            
            </tr>';

        $result .= '</tbody></table>';

        echo $result;
    }



    public function wargetRegrtstoreall()
    {

        $start = $this->input->post('start');
        $endd = $this->input->post('endd');
        $stx = $this->input->post('ckkk');

        $stores_id = $this->input->post('storesSelect');

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($endd));


        $dsds = date('Y-m-d', strtotime("-1 days"));

        $TotalRevenue = 0;
        if ($start == 0) {
            $endd = date("Y-m-d");
            $register = mysql_query("SELECT * from products order by name asc");
        } else {
            $register = mysql_query("SELECT * from products order by name asc");
        }

        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="9" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9">Closing Stock Reports
 from  ' . $startpp . ' Till ' . $endpp . '</th></tr>
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;">' . label("ID") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Product") . ' ' . label("Name") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Opening") . ' </th>
        <th style="border: 1px solid #1c76bc;"> ' . label("Purchase") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Sent to Store") . ' </th>        
        <th style="border: 1px solid #1c76bc;">' . label("Goods Out") . '  </th>
        <th style="border: 1px solid #1c76bc;">' . label("Closing") . '  </th>
        </tr></thead><tbody>';

        while ($reg = mysql_fetch_array($register)) {
            $snew1 = 0;
            $snew2 = 0;
            $snew3 = 0;
            $snew4 = 0;
            $snew5 = 0;
            $snew6 = 0;
            $snewop = 0;
            $snewcl = 0;

            $codeid = $reg['id'];
            $stores_id;

            $bb_wal = mysql_fetch_array(mysql_query("select sum(qty) as pur1 from stock_transfer where store_id=0 and tyoftrans=1 and pro_id='" . $codeid . "' and war_id='" . $stores_id . "'  and date <  '$start'  "));

            $bb_sal = mysql_fetch_array(mysql_query("select sum(qty) as pur1 from stock_transfer where store_id!=0 and tyoftrans=1 and pro_id='" . $codeid . "' and war_id='" . $stores_id . "'  and date <  '$start'  "));

            $bb_gal = mysql_fetch_array(mysql_query("select sum(qty) as pur1 from stock_transfer where  tyoftrans=6 and pro_id='" . $codeid . "' and war_id='" . $stores_id . "'  and date <  '$start'  "));

            $bb_sal_w = $bb_wal['pur1'] - $bb_sal['pur1'] - $bb_gal['pur1']; //sales


            $purr_wal = mysql_fetch_array(mysql_query("select sum(qty) as pur1 from stock_transfer where store_id=0  and tyoftrans=1  and pro_id='" . $codeid . "' and war_id='" . $stores_id . "'  and date between '$start' and '$endd'  "));

            $sent_wal = mysql_fetch_array(mysql_query("select sum(qty) as pur1 from stock_transfer where store_id!=0  and tyoftrans=1  and pro_id='" . $codeid . "' and war_id='" . $stores_id . "' and date between '$start' and '$endd'  "));

            $goo_wal = mysql_fetch_array(mysql_query("select sum(qty) as pur1 from stock_transfer where   tyoftrans=6  and pro_id='" . $codeid . "' and war_id='" . $stores_id . "' and date between '$start' and '$endd'  "));

            $closing_stock = $bb_sal_w + $purr_wal['pur1'] - $sent_wal['pur1'] - $goo_wal['pur1'];

            $result .= '<tr>
            <td style="border: 1px solid #1c76bc;text-align:left;">' . $reg['id'] . '</td>
            <td style="border: 1px solid #1c76bc;text-align:left;">' . $reg['name'] . '</td>
            <td style="border: 1px solid #1c76bc;">' . floatval($bb_sal_w) . '</td>
            <td style="border: 1px solid #1c76bc;">' . floatval($purr_wal['pur1']) . '</td>            
            <td style="border: 1px solid #1c76bc;">' . floatval($sent_wal['pur1']) . '</td>            
            <td style="border: 1px solid #1c76bc;">' . floatval($goo_wal['pur1']) . '</td>            
            <td style="border: 1px solid #1c76bc;">' . floatval($closing_stock) . '
            </td></tr>';
            $TotalRevenue = 0;
        }

        $result .= '</tbody></table>';

        echo $result;
    }




    public function getRegrtrools()
    {

        $start = $this->input->post('Range');
        $oyu = mysql_fetch_array(mysql_query("select * from permission_new where nname='" . $start . "' "));
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

        $register = Register::find($id);
        $sales = Sale::find('all', array(
            'conditions' => array(
                'register_id = ?',
                $id
            )
        ));
        foreach ($sales as $sale) {
            Sale_item::delete_all(array(
                'conditions' => array(
                    'sale_id = ?',
                    $sale->id
                )
            ));
        }
        Sale::delete_all(array(
            'conditions' => array(
                'register_id = ?',
                $id
            )
        ));
        Payement::delete_all(array(
            'conditions' => array(
                'register_id = ?',
                $id
            )
        ));

        $register->delete();
    }

    public function getyearstats($year)
    {
        $monthly = Sale::find_by_sql("SELECT SUM(IF(MONTH = 1, numRecords, 0)) AS 'january',SUM(IF(MONTH = 1, totaltax, 0)) AS 'januarytax',SUM(IF(MONTH = 1, totaldiscount, 0)) AS 'januarydisc',SUM(IF(MONTH = 2, numRecords, 0)) AS 'feburary',SUM(IF(MONTH = 2, totaltax, 0)) AS 'feburarytax',SUM(IF(MONTH = 2, totaldiscount, 0)) AS 'feburarydisc',SUM(IF(MONTH = 3, numRecords, 0)) AS 'march',SUM(IF(MONTH = 3, totaltax, 0)) AS 'marchtax',SUM(IF(MONTH = 3, totaldiscount, 0)) AS 'marchdisc',SUM(IF(MONTH = 4, numRecords, 0)) AS 'april',SUM(IF(MONTH = 4, totaltax, 0)) AS 'apriltax',SUM(IF(MONTH = 4, totaldiscount, 0)) AS 'aprildisc',SUM(IF(MONTH = 5, numRecords, 0)) AS 'may',SUM(IF(MONTH = 5, totaltax, 0)) AS 'maytax',SUM(IF(MONTH = 5, totaldiscount, 0)) AS 'maydisc',SUM(IF(MONTH = 6, numRecords, 0)) AS 'june',SUM(IF(MONTH = 6, totaltax, 0)) AS 'junetax',SUM(IF(MONTH = 6, totaldiscount, 0)) AS 'junedisc',SUM(IF(MONTH = 7, numRecords, 0)) AS 'july',SUM(IF(MONTH = 7, totaltax, 0)) AS 'julytax',SUM(IF(MONTH = 7, totaldiscount, 0)) AS 'julydisc',SUM(IF(MONTH = 8, numRecords, 0)) AS 'august',SUM(IF(MONTH = 8, totaltax, 0)) AS 'augusttax',SUM(IF(MONTH = 8, totaldiscount, 0)) AS 'augustdisc',SUM(IF(MONTH = 9, numRecords, 0)) AS 'september',SUM(IF(MONTH = 9, totaltax, 0)) AS 'septembertax',SUM(IF(MONTH = 9, totaldiscount, 0)) AS 'septemberdisc',SUM(IF(MONTH = 10, numRecords, 0)) AS 'october',SUM(IF(MONTH = 10, totaltax, 0)) AS 'octobertax',SUM(IF(MONTH = 10, totaldiscount, 0)) AS 'octoberdisc',SUM(IF(MONTH = 11, numRecords, 0)) AS 'november',SUM(IF(MONTH = 11, totaltax, 0)) AS 'novembertax',SUM(IF(MONTH = 11, totaldiscount, 0)) AS 'novemberdisc',SUM(IF(MONTH = 12, numRecords, 0)) AS 'december',SUM(IF(MONTH = 12, totaltax, 0)) AS 'decembertax',SUM(IF(MONTH = 12, totaldiscount, 0)) AS 'decemberdisc',SUM(numRecords) AS total, SUM(totaltax) AS totalstax, SUM(totaldiscount) AS totaldisc FROM ( SELECT id, MONTH(created_at) AS MONTH, ROUND(sum(total)) AS numRecords, ROUND(sum(taxamount)) AS totaltax, ROUND(sum(discountamount)) AS totaldiscount FROM sales WHERE DATE_FORMAT(created_at, '%Y') = $year GROUP BY id, MONTH ) AS SubTable1");
        $monthlyExp = Expence::find_by_sql("SELECT SUM(IF(MONTH = 1, numRecords, 0)) AS 'january', SUM(IF(MONTH = 2, numRecords, 0)) AS 'feburary', SUM(IF(MONTH = 3, numRecords, 0)) AS 'march', SUM(IF(MONTH = 4, numRecords, 0)) AS 'april', SUM(IF(MONTH = 5, numRecords, 0)) AS 'may', SUM(IF(MONTH = 6, numRecords, 0)) AS 'june', SUM(IF(MONTH = 7, numRecords, 0)) AS 'july', SUM(IF(MONTH = 8, numRecords, 0)) AS 'august', SUM(IF(MONTH = 9, numRecords, 0)) AS 'september', SUM(IF(MONTH = 10, numRecords, 0)) AS 'october', SUM(IF(MONTH = 11, numRecords, 0)) AS 'november', SUM(IF(MONTH = 12, numRecords, 0)) AS 'december', SUM(numRecords) AS total FROM ( SELECT id, MONTH(date) AS MONTH, ROUND(sum(amount)) AS numRecords FROM expences WHERE DATE_FORMAT(date, '%Y') = $year GROUP BY id, MONTH ) AS SubTable1");
        $result = '<table class="StatTable"><tr><td><span class="revenuespan" data-toggle="tooltip" data-placement="top"  data-html="true" title="<h5>' . label('tax') . ' : <b>' . $monthly[0]->januarytax . ' ' . $this->setting->currency . '</b> <br><br> ' . label('Discount') . ' : <b>' . $monthly[0]->januarydisc . ' ' . $this->setting->currency . '</b></h5>">' . $monthly[0]->january . ' ' . $this->setting->currency . '</span><span class="expencespan">' . $monthlyExp[0]->january . ' ' . $this->setting->currency . '</span>' . label('January') . '</td><td><span class="revenuespan" data-toggle="tooltip" data-placement="top"  data-html="true" title="<h5>' . label('tax') . ' : <b>' . $monthly[0]->feburarytax . ' ' . $this->setting->currency . '</b> <br><br> ' . label('Discount') . ' : <b>' . $monthly[0]->feburarydisc . ' ' . $this->setting->currency . '</b></h5>">' . $monthly[0]->feburary . ' ' . $this->setting->currency . '</span><span class="expencespan">' . $monthlyExp[0]->feburary . ' ' . $this->setting->currency . '</span>' . label('February') . '</td><td><span class="revenuespan" data-toggle="tooltip" data-placement="top"  data-html="true" title="<h5>' . label('tax') . ' : <b>' . $monthly[0]->marchtax . ' ' . $this->setting->currency . '</b> <br><br> ' . label('Discount') . ' : <b>' . $monthly[0]->marchdisc . ' ' . $this->setting->currency . '</b></h5>">' . $monthly[0]->march . ' ' . $this->setting->currency . '</span><span class="expencespan">' . $monthlyExp[0]->march . ' ' . $this->setting->currency . '</span>' . label('March') . '</td><td><span class="revenuespan" data-toggle="tooltip" data-placement="top"  data-html="true" title="<h5>' . label('tax') . ' : <b>' . $monthly[0]->apriltax . ' ' . $this->setting->currency . '</b> <br><br> ' . label('Discount') . ' : <b>' . $monthly[0]->aprildisc . ' ' . $this->setting->currency . '</b></h5>">' . $monthly[0]->april . ' ' . $this->setting->currency . '</span><span class="expencespan">' . $monthlyExp[0]->april . ' ' . $this->setting->currency . '</span>' . label('April') . '</td></tr><tr><td><span class="revenuespan" data-toggle="tooltip" data-placement="top"  data-html="true" title="<h5>' . label('tax') . ' : <b>' . $monthly[0]->maytax . ' ' . $this->setting->currency . '</b> <br><br> ' . label('Discount') . ' : <b>' . $monthly[0]->maydisc . ' ' . $this->setting->currency . '</b></h5>">' . $monthly[0]->may . ' ' . $this->setting->currency . '</span><span class="expencespan">' . $monthlyExp[0]->may . ' ' . $this->setting->currency . '</span>' . label('May') . '</td><td><span class="revenuespan" data-toggle="tooltip" data-placement="top"  data-html="true" title="<h5>' . label('tax') . ' : <b>' . $monthly[0]->junetax . ' ' . $this->setting->currency . '</b> <br><br> ' . label('Discount') . ' : <b>' . $monthly[0]->junedisc . ' ' . $this->setting->currency . '</b></h5>">' . $monthly[0]->june . ' ' . $this->setting->currency . '</span><span class="expencespan">' . $monthlyExp[0]->june . ' ' . $this->setting->currency . '</span>' . label('June') . '</td><td><span class="revenuespan" data-toggle="tooltip" data-placement="top"  data-html="true" title="<h5>' . label('tax') . ' : <b>' . $monthly[0]->julytax . ' ' . $this->setting->currency . '</b> <br><br> ' . label('Discount') . ' : <b>' . $monthly[0]->julydisc . ' ' . $this->setting->currency . '</b></h5>">' . $monthly[0]->july . ' ' . $this->setting->currency . '</span><span class="expencespan">' . $monthlyExp[0]->july . ' ' . $this->setting->currency . '</span>' . label('July') . '</td><td><span class="revenuespan" data-toggle="tooltip" data-placement="top"  data-html="true" title="<h5>' . label('tax') . ' : <b>' . $monthly[0]->augusttax . ' ' . $this->setting->currency . '</b> <br><br> ' . label('Discount') . ' : <b>' . $monthly[0]->augustdisc . ' ' . $this->setting->currency . '</b></h5>">' . $monthly[0]->august . ' ' . $this->setting->currency . '</span><span class="expencespan">' . $monthlyExp[0]->august . ' ' . $this->setting->currency . '</span>' . label('August') . '</td></tr><tr><td><span class="revenuespan" data-toggle="tooltip" data-placement="top"  data-html="true" title="<h5>' . label('tax') . ' : <b>' . $monthly[0]->septembertax . ' ' . $this->setting->currency . '</b> <br><br> ' . label('Discount') . ' : <b>' . $monthly[0]->septemberdisc . ' ' . $this->setting->currency . '</b></h5>">' . $monthly[0]->september . ' ' . $this->setting->currency . '</span><span class="expencespan">' . $monthlyExp[0]->september . ' ' . $this->setting->currency . '</span>' . label('September') . '</td><td><span class="revenuespan" data-toggle="tooltip" data-placement="top"  data-html="true" title="<h5>' . label('tax') . ' : <b>' . $monthly[0]->octobertax . ' ' . $this->setting->currency . '</b> <br><br> ' . label('Discount') . ' : <b>' . $monthly[0]->octoberdisc . ' ' . $this->setting->currency . '</b></h5>">' . $monthly[0]->october . ' ' . $this->setting->currency . '</span><span class="expencespan">' . $monthlyExp[0]->october . ' ' . $this->setting->currency . '</span>' . label('October') . '</td><td><span class="revenuespan" data-toggle="tooltip" data-placement="top"  data-html="true" title="<h5>' . label('tax') . ' : <b>' . $monthly[0]->novembertax . ' ' . $this->setting->currency . '</b> <br><br> ' . label('Discount') . ' : <b>' . $monthly[0]->novemberdisc . ' ' . $this->setting->currency . '</b></h5>">' . $monthly[0]->november . ' ' . $this->setting->currency . '</span><span class="expencespan">' . $monthlyExp[0]->november . ' ' . $this->setting->currency . '</span>' . label('November') . '</td><td><span class="revenuespan" data-toggle="tooltip" data-placement="top"  data-html="true" title="<h5>' . label('tax') . ' : <b>' . $monthly[0]->decembertax . ' ' . $this->setting->currency . '</b> <br><br> ' . label('Discount') . ' : <b>' . $monthly[0]->decemberdisc . ' ' . $this->setting->currency . '</b></h5>">' . $monthly[0]->december . ' ' . $this->setting->currency . '</span><span class="expencespan">' . $monthlyExp[0]->december . ' ' . $this->setting->currency . '</span>' . label('December') . '</td></tr></table>';

        echo $result;
    }

    /**
     * ****************** register functions ***************
     */
    public function RegisterDetails($id)
    {
        $register = Register::find($id);
        try {
            $user = User_model::find($register->user_id);
        } catch (\Exception $e) {
            $user = "-";
        }
        try {
            $user2 = User_model::find($register->closed_by);
        } catch (\Exception $e) {
            $user2 = "-";
        }

        $CashinHand = number_format((float)$register->cash_inhand, $this->setting->decimals, '.', '');
        $date = $register->date;
        $closedate = $register->closed_at;
        $createdBy = $user->firstname . ' ' . $user->lastname;
        $closedBy = $user2->firstname . ' ' . $user2->lastname;
        $total = $register->cheque_total + $register->cc_total + $register->cash_total;
        $subtotal = $register->cash_sub + $register->cc_sub + $register->cheque_sub;

        $data = '
        <div class="col-md-6"><footer><b>' . label("Openedby") . '</b></footer><p>' . $createdBy . '</p></div>
        <div class="col-md-6"><footer><b>' . label("closedBy") . '</b></footer><p>' . $closedBy . '</p></div>
          

         <div class="col-md-12" style="    height: 400px;overflow: scroll;">
         <div class="col-md-8"  >
         <h1  style="   width:100%;text-align:center;font-size:18px;margin-top: 2px;   margin-bottom: 1px;" ><b>' . label("PaymentsSummary") . '</b></h1>
         

         <table class="table table-striped"><tr><th width="25%">' . label("PayementType") . '</th>
         <th  style="text-align:right;"  width="25%">' . label("EXPECTED") . ' (' . $this->setting->currency . ')</th>
         <th  style="text-align:right;"  width="25%">' . label("COUNTED") . ' (' . $this->setting->currency . ')</th>
         <th  style="text-align:right;"  width="25%">' . label("DIFFERENCES") . ' (' . $this->setting->currency . ')</th></tr>';

        $rextf = "readonly";




        $categories = mysql_query("select * from payment_mode   order by id asc ");
        while ($category = mysql_fetch_object($categories)) {


            $idccd = mysql_fetch_array(mysql_query("select * from registers_paymentmode where reg_idd='" . $id . "' and pay_m_id='" . $category->id . "' "));
            $data .= '<tr>
<td >' . $category->name . '</td>
<td style="text-align:right;"> ' . number_format($idccd['expectedcash'], $this->setting->decimals, '.', '') . '</td>
<td style="text-align:right;"> ' . number_format($idccd['countedcash'], $this->setting->decimals, '.', '') . '</td>
<td style="text-align:right;"> ' . number_format($idccd['diffcash'], $this->setting->decimals, '.', '') . '</td></tr>
';
        }

        $idc1 = mysql_fetch_array(mysql_query("select * from registers_ret_tot where reg_idd='" . $id . "' and pay_m_id=1  "));
        $idc2 = mysql_fetch_array(mysql_query("select * from registers_ret_tot where reg_idd='" . $id . "' and pay_m_id=2  "));
        $idc3 = mysql_fetch_array(mysql_query("select * from registers_ret_tot where reg_idd='" . $id . "' and pay_m_id=3  "));

        $data .= '<tr>
<td>Return</td>
<td style="text-align:right;"> ' . number_format($idc1['expectedcash'], $this->setting->decimals, '.', '') . '</td>
<td style="text-align:right;"> ' . number_format($idc1['countedcash'], $this->setting->decimals, '.', '') . '</td>
<td style="text-align:right;"> 0</td></tr>
';
        $data .= '<tr>
<td>Return</td>
<td style="text-align:right;"> ' . number_format($idc3['expectedcash'], $this->setting->decimals, '.', '') . '</td>
<td style="text-align:right;"> ' . number_format($idc3['countedcash'], $this->setting->decimals, '.', '') . '</td>
<td style="text-align:right;"> 0</td></tr>
';
        $data .= '<tr>
<td>Total</td>
<td style="text-align:right;"> ' . number_format($idc2['expectedcash'], $this->setting->decimals, '.', '') . '</td>
<td style="text-align:right;"> ' . number_format($idc2['countedcash'], $this->setting->decimals, '.', '') . '</td>
<td style="text-align:right;"> ' . number_format($idc2['diffcash'], $this->setting->decimals, '.', '') . ' </td></tr>
';










        $ttttotal = $ttttotal + $CashinHand;

        $data .= ' 



         </table>
         </div>
         <div class="col-md-4">

           <h1  style="   width:100%;text-align:center;font-size:18px;margin-top: 2px;   margin-bottom: 1px;" ><b>' . label("Cash") . '</b></h1>


          
         <table class="table table-striped">';

        $chnl = 0;

        $ijnn = mysql_query("select * from currencydenomination order by name desc ");
        while ($ijnnf = mysql_fetch_array($ijnn)) {
            $okikkmm = mysql_fetch_array(mysql_query("select * from registers_note_count where reg_idd='" . $id . "' and pay_m_id='" . $ijnnf['id'] . "'  "));
            $data .= '
<tr>
<td   style="text-align: right;" width="30%">' . $ijnnf['name'] . '  X </td>
<td width="25%">' . $okikkmm['countedcash'] . '</td>
<td width="35%" style="text-align:right;">' . number_format($okikkmm['diffcash'], $this->setting->decimals, '.', '') . '</td>
</tr>';
            $chnl = $chnl + $okikkmm['diffcash'];
        }


        $data .= '
<td width="30%"></td>
<td width="25%">Total</td>
<td width="35%" style="text-align:right;">' . number_format($chnl, $this->setting->decimals, '.', '') . '</td></tr></table>     
       <div ><h2>' . label("note") . '</h2>' . $register->note . '</div>
       </div>
       
       </div>
       <div  class="form-group">&nbsp;</div> 
       </form>';

        echo $data;
    }


    public function getStockReport()
    {
        $store_id = $this->input->post('stock_id');
        $id = substr($store_id, 1);
        $products = Product::find('all');
        if (strcmp($store_id[0], "S"))
            $stype = 'warehouse_id';
        else
            $stype = 'store_id';
        // Stock::find('all', array('conditions' => array('store_id = ?', $id)));
        $result = '<table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%"><thead><tr>
        <th>' . label("Product") . ' (' . label("ProductCode") . ')</th>
        <th>' . label("Quantity") . '</th></tr></thead><tbody>';

        foreach ($products as $prod) {
            if ($prod->type == '0') {
                $class = '';
                if (!($stock = Stock::find('first', array('conditions' => array($stype . ' = ? AND product_id = ?', $id, $prod->id)))))
                    $stock = '-';
                else
                    $stock = $stock->quantity;

                if ($stock < $prod->alertqt)
                    $class = 'danger';
                $result .= '<tr class=' . $class . '>
            <td>' . $prod->name . ' (' . $prod->code . ')</td>
            <td>' . $stock . '</td></tr>';
            }
        }

        $result .= '</tbody></table>';

        echo $result;
    }





















    public function getpurchasedealerReport()
    {

        $start  = $this->input->post('Range');
        $end    = $this->input->post('Range1');
        $esuppr = $this->input->post('suppr');

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));


        $rfr = $this->session->userdata('store');
        $where = '';
        if ($poql['purchase_type'] != 2) {
            $where = " and ppurchase_type='" . $poql['purchase_type'] . "' ";
        }

        //$prduct = Product::find($product_id);
        if ($start == 0  || $start == '') {
            $lmm = date("Y-m-d");
            $prducts = mysql_query("SELECT *  FROM `purchases` WHERE store_id='" . $rfr . "' " . $where . "   and  purdat between '$lmm' AND '$lmm'  order by purdat asc ");
        } else {

            $la322x = explode('-', $start);
            $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

            $lax = explode('-', $end);
            $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
            if ($esuppr > 0) {

                $prducts = mysql_query("SELECT *  FROM `purchases` WHERE supplier_id='" . $esuppr . "'  " . $where . " and    purdat  between '$la32' AND '$laxg' order by purdat asc ");
            } else {
                $prducts = mysql_query("SELECT *  FROM `purchases` WHERE 1  " . $where . " and  purdat between '$la32' AND '$laxg' order by purdat asc ");
            }
        }


        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="10" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="10"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="10">Dealer Purchase Report from  ' . $startpp . ' Till ' . $endpp . '</th></tr>
       <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;"> ' . label("Date") . '</th>
        <th style="border: 1px solid #1c76bc;">  ' . label("Dealer") . ' ' . label("Name") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bill") . ' ' . label("Number") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Invo ' . label("Number") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bill") . ' ' . label("Amount") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("tax") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Discount") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; "> ' . label("Amount") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Return") . ' ' . label("Amount") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Net") . ' ' . label("Amount") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Paid") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Balanceamt") . '</th>
        </tr></thead><tbody>';

        $tt = 1;
        $billamt = 0;
        $tottax = 0;
        $discc = 0;
        $toott = 0;
        $paidd = 0;
        $toott_return = 0;
        $toott_ggg = 0;
        while ($prd = mysql_fetch_object($prducts)) {
            // $ibb = mysql_fetch_array(mysql_query("select sum(total) as rrtty  from purchases_return where pur_id='" . $prd->id . "'  group by pur_id  "));
            $ibb['rrtty'] = 0;
            $prdf = $prd->supplier_id;
            $pxxx = $prd->cgst + $prd->sgst;
            $olaaa = mysql_fetch_array(mysql_query("select * from suppliers where id='" . $prdf . "'  "));

            $result .= '<tr  >
            <td style="border: 1px solid #1c76bc;" >' . date("d-m-Y", strtotime($prd->purdat)) . '</td>
            <td style="border: 1px solid #1c76bc;">' . $olaaa['name'] . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->id . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->invno . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->betot, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$pxxx, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->discamt, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->total, $this->setting->decimals, '.', '') . '</td>

            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$ibb['rrtty'], $this->setting->decimals, '.', '') . '</td>

            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)($prd->total - $ibb['rrtty']), $this->setting->decimals, '.', '') . '</td>

            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->paiddd, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->total - floatval($prd->paiddd) - $ibb['rrtty'], $this->setting->decimals, '.', '') . '</td>

            </tr>';
            $billamt = $billamt + $prd->betot;
            $tottax = $tottax + $pxxx;
            $discc = $discc + $prd->discamt;
            $toott = $toott + $prd->total;
            $toott_return = $toott_return + floatval($ibb['rrtty']);
            $toott_ddd = $prd->total - floatval($ibb['rrtty']);
            $toott_ggg = $toott_ggg + $toott_ddd;
            $paidd = $paidd + floatval($prd->paiddd);
            $tt++;
        }

        $result .= '</tbody>
        <tr>
           <td style="border: 1px solid #1c76bc;"></td>
           <td style="border: 1px solid #1c76bc;"></td>
           <td style="border: 1px solid #1c76bc;"></td>
           <td style="border: 1px solid #1c76bc;"></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$billamt, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$tottax, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$discc, $this->setting->decimals, '.', ' ') . '</b></td> 
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott, $this->setting->decimals, '.', ' ') . '</b></td>  
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott_return, $this->setting->decimals, '.', ' ') . '</b></td> 
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott_ggg, $this->setting->decimals, '.', ' ') . '</b></td> 

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$paidd, $this->setting->decimals, '.', ' ') . '</b></td> 
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott - $paidd, $this->setting->decimals, '.', ' ') . '</b></td> 
        </tr></table>';

        echo $result;
    }









    public function getpurchasemonthlyReport()
    {

        $start = $this->input->post('Range');
        $end   = $this->input->post('Range1');

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $tyuuu = $this->session->userdata('store');


        //$prduct = Product::find($product_id);
        if ($start == 0  || $start == '') {


            $lmm = date("Y-m-d");
            $prducts = mysql_query("SELECT *  FROM `purchases` WHERE store_id='$tyuuu' and    purdat between '$lmm' AND '$lmm'  order by purdat asc ");
        } else {


            $la322x = explode('-', $start);
            $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

            $lax = explode('-', $end);
            $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];



            $prducts = mysql_query(" SELECT   COUNT(id) as bills ,sum(betot) as billamt ,sum(paiddd) as baalll ,sum(cgst) as cgg,sum(sgst) as sgg,sum(discamt) as dikct,sum(total) as netamtt,   DATE_FORMAT(purdat, '%Y-%m-%d') AS DAY,    DATE_FORMAT(purdat, '%Y-%m') AS MONTH,    DATE_FORMAT(purdat, '%Y') AS YEAR
FROM  purchases WHERE  store_id='$tyuuu' and   purdat >= '" . $la32 . "' AND purdat <= '" . $laxg . "'
GROUP BY
    DATE_FORMAT(purdat, '%Y-%m ')");
        }


        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="8" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="8"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="8">Purchase Monthly Summary Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

         <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;">' . label("Date") . '</th>
        
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bill") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bill") . ' ' . label("Amount") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("tax") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Discount") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">  ' . label("Amount") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Return") . ' ' . label("Amount") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Net") . ' ' . label("Amount") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Paid") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Balanceamt") . '</th>
        </tr></thead><tbody>';

        $tt = 1;
        $billamt = 0;
        $tottax = 0;
        $discc = 0;
        $toott = 0;
        $paidd = 0;
        $paidd_rrr = 0;
        while ($prd = mysql_fetch_object($prducts)) {

            $prd_ret = $this->db->select("SUM(total) AS retnetamtt")->where(['store_id' => $tyuuu, 'purdat >=' => $la32, 'purdat <=' => $laxg])->group_by("DATE_FORMAT(purdat, '%Y-%m ')")->get('purchases')->row_array();

            // $prd_ret = mysql_fetch_array(mysql_query(" SELECT  sum(total) as retnetamtt FROM  purchases_return WHERE  store_id='$tyuuu' and  purdat >= '" . $la32 . "' AND purdat <= '" . $laxg . "' GROUP BY DATE_FORMAT(purdat, '%Y-%m ')"));


            $pxxx = $prd->cgg + $prd->sgg;


            $result .= '<tr  >
            <td style="border: 1px solid #1c76bc;">' . date("m-Y", strtotime($prd->MONTH))  . '</td>
            
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->bills . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->billamt, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$pxxx, $this->setting->decimals, '.', '') . '</td>

            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->dikct, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->netamtt, $this->setting->decimals, '.', '') . '</td>

            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd_ret['retnetamtt'], $this->setting->decimals, '.', '') . '</td>

            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->netamtt - $prd_ret['retnetamtt'], $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->baalll, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->netamtt - $prd->baalll - $prd_ret['retnetamtt'], $this->setting->decimals, '.', '') . '</td>

            </tr>';
            $billamt = $billamt + $prd->billamt;
            $tottax = $tottax + $pxxx;
            $discc = $discc + $prd->dikct;
            $toott = $toott + $prd->netamtt;
            $paidd = $paidd + $prd->baalll;


            $paidd_rrr = $paidd_rrr + $prd_ret['retnetamtt'];




            $tt++;
        }

        $result .= '</tbody>
        <tr>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$billamt, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$tottax, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$discc, $this->setting->decimals, '.', ' ') . '</b></td> 
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott, $this->setting->decimals, '.', ' ') . '</b></td> 
            

           <td style="text-align:right;border: 1px solid #1c76bc;"><b>Rs.' . number_format((float)$paidd_rrr, $this->setting->decimals, '.', ' ') . '</b></td>  
           <td style="text-align:right;border: 1px solid #1c76bc;"><b>Rs.' . number_format((float)$toott - $paidd_rrr, $this->setting->decimals, '.', ' ') . '</b></td> 


           <td style="text-align:right;border: 1px solid #1c76bc;"><b>Rs.' . number_format((float)$paidd, $this->setting->decimals, '.', ' ') . '</b></td> 


           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$toott - $paidd - $paidd_rrr, $this->setting->decimals, '.', ' ') . '</b></td> 

           
            </tr></table>';

        echo $result;
    }










    public function salesretundailyReport()
    {

        $start = $this->input->post('Range');
        $end   = $this->input->post('Range1');

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $ret_idd = $poql['themblock'];
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $rtt = $this->session->userdata('store');


        //$prduct = Product::find($product_id);
        if ($start == 0  || $start == '') {
            $lmm = date("Y-m-d");
            $prducts = mysql_query("SELECT *  FROM `returnss` WHERE storeid='$rtt' and  rsale_type='$ret_idd' and  todate between '$lmm' AND '$lmm'  order by todate asc ");
        } else {

            $la322x = explode('-', $start);
            $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

            $lax = explode('-', $end);
            $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];

            $prducts = mysql_query("SELECT *  FROM `returnss` WHERE  storeid='$rtt' and retrn_amt_mtd=1 and  rsale_type='$ret_idd' and   todate between '$la32' AND '$laxg' order by todate asc ");
        }


        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="7" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="7"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="7">Sales Return Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

      <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">

        <th style="border: 1px solid #1c76bc;"> ' . label("Date") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bill") . ' ' . label("Number") . ' </th>
         <th style="border: 1px solid #1c76bc;">  ' . label("Store") . ' ' . label("Name") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("From") . ' ' . label("Sales") . ' ' . label("Number") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">  ' . label("To") . ' ' . label("Sales") . ' ' . label("Number") . ' </th>
       
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Qty") . '  </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bill") . ' ' . label("Amount") . '  </th>
        </tr></thead><tbody>';

        $paidd = 0;
        $tt = 0;
        while ($prd = mysql_fetch_object($prducts)) {

            $prdf = $prd->storeid;
            $pxxx = isset($prd->cgst) ? $prd->cgst : '';
            $pxxxs = isset($prd->sgst) ? $prd->sgst : '';



            $newc = date("d-m-Y", strtotime($prd->todate));
            $newcy = date("Y", strtotime($prd->todate));
            $olaaa = mysql_fetch_array(mysql_query("select * from stores where id='" . $prdf . "'  "));

            $result .= '<tr  >
            <td style="border: 1px solid #1c76bc; ">' . $newc . '</td>
            
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->re_id . '</td>
            
           <td style="text-align:left;border: 1px solid #1c76bc; ">' . $olaaa['name'] . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->re_sales_id   . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->purcha_sales_id  . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->iteems . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->tootal, $this->setting->decimals, '.', '') . '</td>
  

           
            

            </tr>';

            $paidd = $paidd + $prd->tootal;




            $tt++;
        }

        $result .= '</tbody>
        <tr>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$paidd, $this->setting->decimals, '.', ' ') . '</b></td> 
           

           
            </tr></table>';

        echo $result;
    }








    public function getsalsumbjReport()
    {

        $start = $this->input->post('Range');
        $end   = $this->input->post('Range1');

        $rttt = $this->session->userdata('store');


        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;




        //$prduct = Product::find($product_id);
        if ($start == 0  || $start == '') {
            exit;
            $lmm = date("Y-m-d");
            $prducts = mysql_query("SELECT *  FROM `returnss`  WHERE  storeid='$rttt' and   purdat between '$lmm' AND '$lmm'  order by purdat asc ");
        } else {


            $la322x = explode('-', $start);
            $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

            $lax = explode('-', $end);
            $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];



            $prducts = mysql_query(" SELECT   *,COUNT(re_id) as bills ,sum(tootal) as billamt,sum(iteems) as iteemst FROM  returnss WHERE  storeid='$rttt' and   todate >= '$la32' AND todate <= '$laxg' GROUP BY  todate, storeid ");
        }


        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="5" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="5"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="5">Sales Return Summary Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '
        </th></tr>
         <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;"> ' . label("Date") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; "> ' . label("Total") . ' ' . label("Bill") . '  </th>
        <th style="border: 1px solid #1c76bc;">  ' . label("Store") . ' ' . label("Name") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . ' ' . label("Qty") . '  </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . ' ' . label("Bill") . ' ' . label("Amount") . '  </th>
        </tr>

        </thead><tbody>';

        $tt = 1;


        $paidd = 0;
        while ($prd = mysql_fetch_object($prducts)) {
            $olxm = mysql_fetch_array(mysql_query("select * from stores where  id='" . $prd->storeid . "' "));



            $result .= '<tr  >
            <td style="border: 1px solid #1c76bc; ">' . date("d-m-Y", strtotime($prd->todate))  . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->bills . '</td>
            <td style="text-align:left;border: 1px solid #1c76bc; ">' . $olxm['name'] . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->iteemst . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->billamt, $this->setting->decimals, '.', '') . '</td>
           </tr>';
            $paidd = $paidd + $prd->billamt;
            $tt++;
        }

        $result .= '</tbody>
        <tr>
            <td style="border: 1px solid #1c76bc; "></td>
            <td style="border: 1px solid #1c76bc; "></td>
            <td style="border: 1px solid #1c76bc; "></td>
            <td style="border: 1px solid #1c76bc; "></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$paidd, $this->setting->decimals, '.', ' ') . '</b></td> 

           
            </tr></table>';

        echo $result;
    }








    public function salesretunReport()
    {

        $start = $this->input->post('Range');
        $end   = $this->input->post('Range1');

        $rttt = $this->session->userdata('store');

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));
        $rttt = $this->session->userdata('store');

        //$prduct = Product::find($product_id);
        if ($start == 0  || $start == '') {
            exit;
            $lmm = date("Y-m-d");
            $prducts = mysql_query("SELECT *  FROM `purchases` WHERE     purdat between '$lmm' AND '$lmm'  order by purdat asc ");
        } else {


            $la322x = explode('-', $start);
            $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

            $lax = explode('-', $end);
            $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];



            $prducts = mysql_query(" SELECT   *,COUNT(re_id) as bills ,sum(tootal) as billamt ,sum(iteems) as iteems ,  DATE_FORMAT(todate, '%Y-%m-%d') AS DAY,    DATE_FORMAT(todate, '%Y-%m') AS MONTH,    DATE_FORMAT(todate, '%Y') AS YEAR FROM  returnss WHERE storeid='$rttt' and  todate >= '$la32' AND todate <= '$laxg' GROUP BY  DATE_FORMAT(todate, '%Y-%m '),storeid ");
        }


        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead>
        <tr class="hideme">
        <th colspan="5" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="5"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="5">Purchase Monthly Summary Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;">' . label("Date") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Store") . ' ' . label("Name") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . '' . label("Bill") . '</th>
        
        
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . ' ' . label("Qty") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Bill") . ' ' . label("Amount") . ' </th>

        </tr></thead><tbody>';

        $tt = 1;


        $paidd = 0;
        while ($prd = mysql_fetch_object($prducts)) {


            $pxxx = $prd->storeid;
            $oloo = mysql_fetch_array(mysql_query("select * from stores where id='" . $pxxx . "' "));


            $result .= '<tr  >
            <td style="border: 1px solid #1c76bc;">' . $prd->MONTH . '</td>
            <td style="border: 1px solid #1c76bc;">' . $oloo['name'] . '</td>
            
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->bills . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->iteems . '</td>
           
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$prd->billamt, $this->setting->decimals, '.', '') . '</td>

            </tr>';



            $paidd = $paidd + $prd->billamt;




            $tt++;
        }

        $result .= '</tbody>
        <tr>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            
           
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$paidd, $this->setting->decimals, '.', ' ') . '</b></td> 

           
            </tr></table>';

        echo $result;
    }






    public function getsalesdailReport1()
    {

        $start  = $this->input->post('Range');
        $end    = $this->input->post('Range1');
        $esuppr = $this->input->post('suppr');

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;




        //$prduct = Product::find($product_id);



        $la322x = explode('-', $start);
        $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

        $lax = explode('-', $end);
        $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
        $new_advance = 0;
        if ($esuppr > 0) {

            $prducts = mysql_query("SELECT *  FROM `sales` WHERE client_id='$esuppr' and    created_at  between '$la32' AND '$laxg' order by id desc ");


            $advancc = mysql_fetch_array(mysql_query("select sum(paid) as advancee from payements_advance where cust_id='" . $esuppr . "' "));

            $advanccf = $advancc['advancee'];
        } else if ($esuppr == '') {
            $prducts = mysql_query("SELECT *  FROM `sales` WHERE   created_at between '$la32' AND '$laxg' order by id desc ");
            $advanccf = 0;
        } else {
            $prducts = mysql_query("SELECT *  FROM `sales` WHERE client_id=0 and    created_at between '$la32' AND '$laxg' order by id desc ");
            $advanccf = 0;
        }





        $result = '
        <table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="14" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="14"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="14">Daily Sales Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>
         <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;width:100px;""> ' . label("Bill") . ' ' . label("Number") . '</th>
        <th style="border: 1px solid #1c76bc;width:100px;">' . label("Date") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Customer") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Particulars") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Total Items") . '   </th>
       

        
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . ' ' . label("Amount") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Cash") . ' </th>
       <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Card") . ' </th>
        
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

        $new_paid = 0;


        while ($prd = mysql_fetch_object($prducts)) {

            $new_paid = $new_paid + $prd->paid;
            $csub2 = 0;
            $ssub2 = 0;
            $isub2 = 0;
            $csubrr_2 = 0;
            $sslalf_rr = 0;





            // $sslal = Sale::find($prd->id);
            $oltaxl = '';

            $return_ck = mysql_query("select * from  returnss where re_sales_id='" . $prd->id . "' ");
            $return_ck_num = mysql_num_rows($return_ck);






            $yuikk = mysql_query("select * from  tax_summary where salesid='" . $prd->id . "' ");
            while ($yuikkf = mysql_fetch_array($yuikk)) {
                $oltaxl .= $yuikkf['taxname'] . '-' . number_format((float)$yuikkf['taxfrom'], $this->setting->decimals, '.', '') . '<br>';
            }

            $sslalf = $prd->discountamount;
            $discout_per = ($prd->discountamount * 100) / $prd->subtotal;


            $prolist = '';
            $uyjhh = mysql_query("select * from sale_items where sale_id='" . $prd->id . "'   ");
            while ($uyjhhf = mysql_fetch_array($uyjhh)) {

                $prolist .= $uyjhhf['qt'] . ' - ' . $uyjhhf['name'] . '<br>';
                $iknmm = mysql_query("select * from retunn_items where sl_id='" . $uyjhhf['id'] . "' and sall_idd='" . $prd->id . "' ");
                if (mysql_num_rows($iknmm) == 1) {


                    $retun_res = mysql_fetch_array($iknmm);






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





            $result .= '<tr ' . $bil_ststy . ' >
            <td style="text-align:center;border: 1px solid #1c76bc; " >' . $prd->id . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; " >' .  date("d-m-Y", strtotime($oll[0])) . '</td>

            <td style="text-align:left;border: 1px solid #1c76bc; ">' . $prd->clientname . '</td>
            <td style="text-align:left;border: 1px solid #1c76bc; ">' . $prolist . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->totalitems . '</td>
         

            
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->total, $this->setting->decimals, '.', '') . '</td>
             <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$cash, $this->setting->decimals, '.', ' ') . '</td>

               <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$cardd, $this->setting->decimals, '.', ' ') . '</td>

            
            </tr>';
            $billamt = $billamt + $prd->subtotal;
            $tottax = $tottax + $pxxx;
            $fimdis = $sslalf + $fimdis;
            $toott = $toott + $prd->total;
            $toott_ship = $toott_ship + $prd->disamtssh;
            $cashr = $cashr + $cash;
            $coupr = $coupr + $coup;
            $carddr = $carddr + $cardd;
            $cpointr = $cpointr + $cpoint;

            if ($prd->status == 3) {
                $billamt_cc = $billamt_cc + $prd->subtotal;
                $tottax_cc = $tottax_cc + $pxxx;
                $fimdis_cc = $sslalf + $fimdis_cc;
                $toott_ship_cc = $toott_ship_cc + $prd->disamtssh;
                $toott_cc = $toott_cc + $prd->total;
                $cashr_cc = $cashr_cc + $cash;
                $coupr_cc = $coupr_cc + $coup;
                $carddr_cc = $carddr_cc + $cardd;
                $cpointr_cc = $cpointr_cc + $cpoint;
            }
            if ($return_ck_num > 0) {

                while ($return_sal = mysql_fetch_object($return_ck)) {

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
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Total</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$paidd, $this->setting->decimals, '.', ' ') . '</b></td> 
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$cashr, $this->setting->decimals, '.', ' ') . '</b></td> 
           <td style="text-align:right; border: 1px solid #1c76bc;"><b>' . number_format((float)$carddr, $this->setting->decimals, '.', ' ') . '</b></td> 
          </tr>

          <tr>
           
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Paid</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$new_paid, $this->setting->decimals, '.', ' ') . '</b></td> 
            <td style="text-align:right;border: 1px solid #1c76bc; "></td> 
           <td style="text-align:right; border: 1px solid #1c76bc;"></td> 
          </tr>  

          <tr>
           
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Advance</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$advanccf, $this->setting->decimals, '.', ' ') . '</b></td> 
            <td style="text-align:right;border: 1px solid #1c76bc; "></td> 
           <td style="text-align:right; border: 1px solid #1c76bc;"></td> 
          </tr> 


          <tr>
           
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Balance</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)($paidd - $new_paid - $advanccf), $this->setting->decimals, '.', ' ') . '</b></td> 
            <td style="text-align:right;border: 1px solid #1c76bc; "></td> 
           <td style="text-align:right; border: 1px solid #1c76bc;"></td> 
          </tr>




         


           

            </table>';

        echo $result;
    }




    public function cashinhanddailyReport()
    {


        $start  = $this->input->post('Range');
        $la322x = explode('-', $start);
        $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];
        $lkmm = mysql_fetch_array(mysql_query(" select * from  settings where id=1 "));
        if ($lkmm['themblock'] == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
            $tax_summary = "tax_summary";
            $returnss = "returnss";
        } else {
            $sales = "dsales";
            $sale_items = "dsale_items";
            $tax_summary = "dtax_summary";
            $returnss = "returnss";
        }
        $ret_idd = $lkmm['themblock'];




        $salesff = mysql_fetch_array(mysql_query("SELECT SUM(CASE WHEN status = 3 THEN total END) as cancelledamt ,
  SUM(CASE WHEN total <= paid THEN total else  paid END) as totalpaid ,
    SUM(
    CASE 
    WHEN   status = 3 and total > paid    THEN paid   
    WHEN   status = 3 and total <= paid    THEN total  
    END) as totcancelled ,sum(" . $sales . ".total) as totalsales_amount  FROM " . $sales . "  where    created_at='$la32'   "));



        $returnssff = mysql_fetch_array(mysql_query("SELECT SUM(CASE WHEN retun_amt_stas = 0 THEN tootal END) as amt_return,SUM(CASE WHEN retun_amt_stas = 1 THEN tootal END) as exchange_return    FROM " . $returnss . "  where  rsale_type='" . $ret_idd . "'  and  todate='$la32'    "));



        $today_sales = $salesff['totalsales_amount'];
        $cancelledamt = $salesff['cancelledamt'];
        $totcancelled = $salesff['totcancelled'];
        $exchange_return = $returnssff['exchange_return'];
        $totalpaid = $salesff['totalpaid'] - $exchange_return;
        //$exchange_amount=$salesff['exchange_amount'];
        $amt_return = $returnssff['amt_return'];



        $result = '
        <table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">        
        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;"> ' . label("Date ") . ' (A) </th>
        <th style="border: 1px solid #1c76bc;">' . label("Total Sales") . ' (B)</th>
        <th style="border: 1px solid #1c76bc;">' . label("Paid Amount") . ' (C)</th>
        <th style="border: 1px solid #1c76bc;">Total ' . label("Cancelled") . ' (D)</th>
        <th style="border: 1px solid #1c76bc;">Paid ' . label("Cancelled") . ' (E)</th>
        <th style="border: 1px solid #1c76bc;">' . label("Exchange Return") . ' (F)</th>
        <th style="border: 1px solid #1c76bc;">' . label("Amount Return") . ' (G)</th>
        <th style="border: 1px solid #1c76bc;">' . label("Cash In Hand") . ' (G=C-E-G)</th>
        </tr> ';

        $cash_in_hand = $totalpaid - $totcancelled - $amt_return;

        $result .= '<tr>
            <td style="text-align:center;border: 1px solid #1c76bc; " >' . $start . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; " >' . number_format((float)$today_sales, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; " >' . number_format((float)$totalpaid, $this->setting->decimals, '.', '') . '</td> 
            <td style="text-align:center;border: 1px solid #1c76bc; " >' . number_format((float)$cancelledamt, $this->setting->decimals, '.', '') . '</td>  
            <td style="text-align:center;border: 1px solid #1c76bc; " >' . number_format((float)$totcancelled, $this->setting->decimals, '.', '') . '</td> 
            <td style="text-align:center;border: 1px solid #1c76bc; " >' . number_format((float)$exchange_return, $this->setting->decimals, '.', '') . '</td> 
             <td style="text-align:center;border: 1px solid #1c76bc; " >' . number_format((float)$amt_return, $this->setting->decimals, '.', '') . '</td> 
             <td style="text-align:center;border: 1px solid #1c76bc; " >' . number_format((float)$cash_in_hand, $this->setting->decimals, '.', '') . '</td> 
            </tr>';
        echo $result;
    }


    public function filter_total_rows()
    {
        $poql = $this->builder->query("select logo,themblock,companyname from settings where id=1 ")->row_array();
        $poss = $this->builder->query("select adresse from stores where id='" . $this->session->userdata('store') . "' ")->row_array();

        $start  = $this->input->post('Range');
        $end    = $this->input->post('Range1');
        $esuppr = $this->input->post('suppr');
        $pamode_id = $this->input->post('selectedValues');
        if ($poql['themblock'] == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
            $tax_summary = "tax_summary";
        } else {
            $sales = "dsales";
            $sale_items = "dsale_items";
            $tax_summary = "dtax_summary";
        }

        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));
        $la322x = explode('-', $start);
        $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];
        $from = $la32;

        $lax = explode('-', $end);
        $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
        $to   = $laxg;

        $total_sales_number = $this->Sale->get_filtered_data($sales, $esuppr, $from, $to, $sale_items);

        $slot = 10;
        $total_slot = ($total_sales_number / $slot);
        $offset = 0;
        $limit = 0;
        $arr = range(0, $total_sales_number);
        // $fetch_data = $this->Sale->make_datatables($sales, $esuppr, $from, $to, $sale_items, $offset, $limit);

        $chunks = array_chunk($arr, 10);

        echo json_encode(['number' => $total_sales_number]);
    }

    public function product_query($sales, $rtttfc, $esuppr, $la32, $laxg, $ssid = 0, $ret_idd = 0)
    {
        $this->db->select($sales . '.*');
        $this->db->select($sales . '.id as ssid');
        $this->db->select($sales . '.status as ssstatus');
        $this->db->select('customers.name as cname');
        $this->db->select('stores.name as ssname');

        if ($esuppr > 0) {
            $this->db->from($sales);
            $this->db->join('registers', $sales . '.register_id = registers.id', 'left');
            $this->db->join('customers', $sales . '.client_id = customers.id', 'left');
            $this->db->join('stores', 'registers.store_id = stores.id', 'left');
            if (!empty($rtttfc)) {
                $this->db->where($rtttfc); // Assuming this is a valid condition string
            }
            $this->db->where($sales . '.client_id', $esuppr);
            $this->db->where($sales . '.created_at >=', $la32);
            $this->db->where($sales . '.created_at <=', $laxg);
            $this->db->order_by($sales . '.id', 'desc');
        } elseif ($esuppr === '') {
            $this->db->select('SUM(tootal) AS return_total');
            $this->db->from($sales);
            $this->db->join('registers', $sales . '.register_id = registers.id', 'left');
            $this->db->join('customers', $sales . '.client_id = customers.id', 'left');
            $this->db->join('stores', 'registers.store_id = stores.id', 'left');
            $this->db->join('returnss', 'returnss.re_sales_id = ' . $sales . '.id', 'left');
            if (!empty($rtttfc)) {
                $this->db->where($rtttfc);
            }


            $this->db->where($sales . '.created_at >=', $la32);
            $this->db->where($sales . '.created_at <=', $laxg);

            // $this->db->where('returnss.re_sales_id', $ssid);
            // $this->db->where('returnss.rsale_type', $ret_idd);
            $this->db->order_by($sales . '.id', 'desc');
        } else {
            $this->db->from($sales);
            $this->db->join('registers', $sales . '.register_id = registers.id', 'left');
            $this->db->join('customers', $sales . '.client_id = customers.id', 'left');
            $this->db->join('stores', 'registers.store_id = stores.id', 'left');
            if (!empty($rtttfc)) {
                $this->db->where($rtttfc);
            }
            $this->db->where($sales . '.client_id', 0);
            $this->db->where($sales . '.created_at >=', $la32);
            $this->db->where($sales . '.created_at <=', $laxg);
            $this->db->order_by($sales . '.id', 'desc');
        }

        $query = $this->db->get();
        return $query;
    }

    public function get_sales_report()
    {
        $offset = $this->input->post('offset');
        $limit = $this->input->post('limit');
        $start  = $this->input->post('Range');
        $end    = $this->input->post('Range1');
        $esuppr = $this->input->post('suppr');
        $pamode_id = $this->input->post('selectedValues');

        $poql = $this->builder->query("select logo,themblock,companyname from settings where id=1 ")->row_array();
        $poss = $this->builder->query("select adresse from stores where id='" . $this->session->userdata('store') . "' ")->row_array();
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;

        if ($poql['themblock'] == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
            $tax_summary = "tax_summary";
        } else {
            $sales = "dsales";
            $sale_items = "dsale_items";
            $tax_summary = "dtax_summary";
        }
        $ret_idd = $poql['themblock'];

        $rttt = $this->input->post('StoresSelect');

        if ($rttt > 0) {
            $rtttfc = 'registers.store_id=' . $rttt . ' and ';
        } else {
            $rtttfc = "";
        }

        if ($this->input->post('store') != '') {
            $rtttfc =  $rtttfc = 'registers.store_id=' . $this->input->post('store') . ' and ';
        }

        $la322x = explode('-', $start);
        $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];
        $from = $la32;

        $lax = explode('-', $end);
        $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
        $to   = $laxg;


        $data = array();

        // fetch vehicles records
        // echo '<pre>';
        // print_r($fetch_data);
        // echo '</pre>';


        // $total_sales_number = $this->Sale->get_filtered_data($sales, $esuppr, $from, $to, $sale_items);

        // $slot = 10;
        // $total_slot = ($total_sales_number / $slot);

        $data = [];
        // $fetch_data = $this->Sale->make_datatables($sales, $esuppr, $from, $to, $sale_items, $offset, $limit);

        // if ($esuppr > 0) {
        //     $prducts = ("SELECT " . $sales . ".*," . $sales . ".id as ssid," . $sales . ".status as ssstatus,customers.name as cname,stores.name as ssname  FROM " . $sales . " 
        //     LEFT join registers on " . $sales . ".register_id=registers.id
        //     LEFT join customers on " . $sales . ".client_id=customers.id
        //     LEFT join stores on registers.store_id=stores.id
        //      WHERE    $rtttfc  client_id='$esuppr'  and    " . $sales . ".created_at  between '$la32' AND '$laxg' order by " . $sales . ".id desc ");
        // } else if ($esuppr == '') {
        //     $prducts = ("SELECT " . $sales . ".*," . $sales . ".id as ssid," . $sales . ".status as ssstatus,customers.name as cname,stores.name as ssname, SUM(tootal) AS return_total FROM " . $sales . "  left join registers on " . $sales . ".register_id=registers.id 
        //     LEFT join customers on " . $sales . ".client_id=customers.id
        //     LEFT join stores on registers.store_id=stores.id
        //     LEFT join returnss on returnss.re_sales_id=$sales.id
        //     WHERE  $rtttfc   " . $sales . ".created_at between '$la32' AND '$laxg' order by " . $sales . ".id desc ");
        // } else {
        //     $prducts = ("SELECT " . $sales . ".*," . $sales . ".id as ssid," . $sales . ".status as ssstatus,customers.name as cname,stores.name as ssname     FROM " . $sales . "  left join registers on " . $sales . ".register_id=registers.id 
        //     LEFT join customers on " . $sales . ".client_id=customers.id
        //     LEFT join stores on registers.store_id=stores.id
        //     WHERE  $rtttfc  client_id=0 and    " . $sales . ".created_at between '$la32' AND '$laxg' order by " . $sales . ".id desc ");
        // }

        // $prducts = $this->product_query($sales, $rtttfc, $esuppr, $la32, $laxg);

        $this->db->select($sales . '.*');
        $this->db->select($sales . '.id as ssid');
        $this->db->select($sales . '.status as ssstatus');
        $this->db->select('customers.name as cname');
        $this->db->select('stores.name as ssname');

        if ($esuppr > 0) {
            $this->db->from($sales);
            $this->db->join('registers', $sales . '.register_id = registers.id', 'left');
            $this->db->join('customers', $sales . '.client_id = customers.id', 'left');
            $this->db->join('stores', 'registers.store_id = stores.id', 'left');
            if (!empty($rtttfc)) {
                $this->db->where($rtttfc); // Assuming this is a valid condition string
            }
            $this->db->where($sales . '.client_id', $esuppr);
            $this->db->where($sales . '.created_at >=', $la32);
            $this->db->where($sales . '.created_at <=', $laxg);
            $this->db->order_by($sales . '.id', 'desc');
        } elseif ($esuppr === '') {
            // $this->db->select('SUM(tootal) AS return_total');
            // $this->db->select('IFNULL(SUM(returnss.tootal), 0) AS return_total');
            $this->db->from($sales);
            $this->db->join('registers', $sales . '.register_id = registers.id', 'left');
            $this->db->join('customers', $sales . '.client_id = customers.id', 'left');
            $this->db->join('stores', 'registers.store_id = stores.id', 'left');
            // $this->db->join('returnss', 'returnss.re_sales_id = ' . $sales . '.id', 'left');
            if (!empty($rtttfc)) {
                $this->db->where($rtttfc);
            }


            $this->db->where($sales . '.created_at >=', $la32);
            $this->db->where($sales . '.created_at <=', $laxg);

            // $this->db->where('returnss.re_sales_id', $ssid);
            // $this->db->where('returnss.rsale_type', $ret_idd);
            $this->db->order_by($sales . '.id', 'desc');
            $this->db->limit($limit, $offset);
        } else {
            $this->db->from($sales);
            $this->db->join('registers', $sales . '.register_id = registers.id', 'left');
            $this->db->join('customers', $sales . '.client_id = customers.id', 'left');
            $this->db->join('stores', 'registers.store_id = stores.id', 'left');
            if (!empty($rtttfc)) {
                $this->db->where($rtttfc);
            }
            $this->db->where($sales . '.client_id', 0);
            $this->db->where($sales . '.created_at >=', $la32);
            $this->db->where($sales . '.created_at <=', $laxg);
            $this->db->order_by($sales . '.id', 'desc');
        }

        $query = $this->db->get();


        // $query = $prducts;
        // $query = $this->db->query($sql, FALSE); // FALSE = unbuffered query

        // while ($prd = $query->unbuffered_row('object')) {
        //     // process $row one at a time
        //     print_r($prd);
        // }
        // die;

        // print_r($query->result());

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
        $grand_total_amount = 0;
        while ($prd = $query->unbuffered_row('object')) {
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
            $return_ck = $this->builder->query("SELECT * FROM  returnss WHERE re_sales_id='" . $prd->ssid . "' AND  rsale_type='" . $ret_idd . "' ");
            // $return_ck_num = $return_ck->return_total != '' ? $return_ck->return_total : 0;

            // $return_ck_num = isset($prd->return_total) && $prd->return_total != '' ? $prd->return_total : 0;


            $yuikk_query = ("select * from  " . $tax_summary . " where salesid='" . $prd->ssid . "' ");
            $yuikk = $this->db->query($yuikk_query, FALSE);
            while ($yuikkf = $yuikk->unbuffered_row('object')) {
                $oltaxl .= $yuikkf->taxname . '-' . number_format((float)$yuikkf->taxfrom, $this->setting->decimals, '.', '') . '<br>';
                $overal_tax = $overal_tax + $yuikkf->taxfrom;
            }

            $sslalf = $prd->discountamount;
            $discout_per = ($prd->discountamount * 100) / $prd->subtotal;

            $mkj = $this->builder->query("SELECT * from payment_mode where id!=1 order by id asc ");
            while ($mkjf = $mkj->unbuffered_row('array')) {

                $ll = $mkjf['id'];
                $mn = 'sss_' . $ll;
                $$mn = 0;
                if (is_array($pamode_id) && in_array($ll, $pamode_id)) {

                    // $result .= '<th style="border: 1px solid #1c76bc;"   >' . $mkjf['name'] . '</th>';
                }
            }

            $uyjhh = ("SELECT * FROM " . $sale_items . " WHERE sale_id='" . $prd->ssid . "'   ");
            // $uyjhh_query = $this->builder->where('sale_id', $prd->ssid)->get($sale_items)->result_array();
            $uyjhh = $this->db->query($uyjhh, FALSE);


            while ($uyjhhf = $uyjhh->unbuffered_row('array')) {
                $iknmm = $this->db->query("select * from retunn_items where sl_id='" . $uyjhhf['id'] . "' and sall_idd='" . $prd->ssid . "' and rsaleit_type='" . $ret_idd . "' ");
                if ($iknmm->num_rows() > 1) {
                    while ($retun_res = $iknmm->unbuffered_row('array')) {
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

            if ($prd->ssstatus == 3) {
                $bil_ststy = "style=background:#e9c0c0;";
                $sstaus_w = "<span class='cancel'>Cancel</span>";
            } elseif ($return_ck->num_rows() > 0) {
                $bil_ststy = "style=background:#f86e50;";
                $sstaus_w = "<span class='return'>Return</span>";
            } else {
                $bil_ststy = '';
                $sstaus_w = "<span class='sales'>Sales</span>";
            }
            $ee = explode('~', $prd->paidmethod);
            $mes_cash = $prd->recivamt;


            $exchange_amount = '0.00';
            if (!empty($pamode_id) && in_array($ee[0], $pamode_id)) {
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
                $ddd = !empty($pamode_id) ? count($pamode_id) : 0;
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
            if (($return_ck->num_rows()) > 0) {
                while ($return_sal = $return_ck->unbuffered_row('object')) {
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
            //     $return_ck_num,
            //     $billamtee
            // );

            $sub_total_amount += $prd->subtotal;
            $tax_total += $overal_tax;
            $discount_total += $dixxss;
            $shiping_total += $prd->disamtssh;
            $total_amount_ += $prd->total;
            $cancel_total += $cancel_amt;
            $exchange_total += $billamtee;
            $return_total += $billamtrr;

            $grand_total_amount = $total_amount_ - ($cancel_total + $exchange_total + $return_total);

            $tr .= '<tr ' . $bil_ststy . '>';
            $tr .= '<td>' . $prd->ssid . '</td>';
            $tr .= '<td>' . $prd->ssname . '</td>';
            $tr .= '<td>' . $custt_namef . '</td>';
            $tr .= '<td>' . date("d-m-Y", strtotime($oll[0])) . '</td>';
            $tr .= '<td>' . $prd->totalitems . '</td>';
            $tr .= '<td>' . number_format((float)$prd->subtotal, $this->setting->decimals, '.', '') . '</td>';
            $tr .= '<td>' . number_format((float)$overal_tax, $this->setting->decimals, '.', '') . '</td>';
            $tr .= '<td>' .  $oltaxl . '</td>';
            $tr .= '<td>' . number_format((float)$dixxss, $this->setting->decimals, '.', '') . '</td>';
            $tr .= '<td>' . number_format((float)$prd->disamtssh, $this->setting->decimals, '.', '') . '</td>';
            $tr .= '<td>' . number_format((float)$prd->total, $this->setting->decimals, '.', '') . '</td>';
            $tr .= '<td >' . $sstaus_w . '</td>';
            $tr .= '<td>' . number_format((float)$cancel_amt, $this->setting->decimals, '.', '') . '</td>';
            $tr .= '<td>' . $billamtee . '</td>';
            $tr .= '<td>' . $billamtrr . '</td>';
            // $tr .= '<td>' . $billamtee . '</td>';
            $tr .= '</tr>';
        }


        // $output = array(
        //     'draw' => intval($_POST['draw']),
        //     'recordsTotal' => $this->Sale->get_all_data($sales, $esuppr, $from, $to, $sale_items),
        //     'recordsFiltered' => $total_sales_number,
        //     'data' => $data
        // );

        echo json_encode(['tr' => $tr, 'rows' => ($count_rows), 'sub_total_amount' => $sub_total_amount, 'tax_total' => $tax_total, 'discount_total' => $discount_total, 'shiping_total' => $shiping_total, 'total_amount_' => $total_amount_, 'cancel_total' => $cancel_total, 'exchange_total' => $exchange_total, 'return_total' => $return_total, 'grand_total_amount' => $grand_total_amount]);
        $this->db->close();
        die;
    }


    public function getsalesdailReportnew1()
    {
        $start  = $this->input->post('Range');
        $end    = $this->input->post('Range1');
        $esuppr = $this->input->post('suppr');
        $pamode_id = $this->input->post('selectedValues');

        $poql = mysql_fetch_array(mysql_query("select logo,themblock,companyname from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select adresse from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;


        if ($poql['themblock'] == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
            $tax_summary = "tax_summary";
        } else {
            $sales = "dsales";
            $sale_items = "dsale_items";
            $tax_summary = "dtax_summary";
        }
        $ret_idd = $poql['themblock'];

        //  ".$sales."
        //  ".$sale_items."
        //  ".$tax_summary."



        $rttt = $this->input->post('StoresSelect');

        if ($rttt > 0) {
            $rtttfc = 'registers.store_id=' . $rttt . ' and ';
        } else {
            $rtttfc = "";
        }

        //echo $this->input->post('store');exit;

        if ($this->input->post('store') != '') {
            $rtttfc =  $rtttfc = 'registers.store_id=' . $this->input->post('store') . ' and ';
        }


        //$prduct = Product::find($product_id);



        $la322x = explode('-', $start);
        $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];
        $from = $la32;

        $lax = explode('-', $end);
        $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
        $to   = $laxg;

        // if ($esuppr > 0) {
        //     $prducts = ("SELECT " . $sales . ".*," . $sales . ".id as ssid," . $sales . ".status as ssstatus,customers.name as cname,stores.name as ssname  FROM " . $sales . " 
        //     LEFT join registers on " . $sales . ".register_id=registers.id
        //     LEFT join customers on " . $sales . ".client_id=customers.id
        //     LEFT join stores on registers.store_id=stores.id
        //      WHERE    $rtttfc  client_id='$esuppr'  and    " . $sales . ".created_at  between '$la32' AND '$laxg' order by " . $sales . ".id desc ");
        // } else if ($esuppr == '') {
        //     $prducts = ("SELECT " . $sales . ".*," . $sales . ".id as ssid," . $sales . ".status as ssstatus,customers.name as cname,stores.name as ssname     FROM " . $sales . "  left join registers on " . $sales . ".register_id=registers.id 
        //     LEFT join customers on " . $sales . ".client_id=customers.id
        //     LEFT join stores on registers.store_id=stores.id
        //     WHERE  $rtttfc   " . $sales . ".created_at between '$la32' AND '$laxg' order by " . $sales . ".id desc ");
        // } else {
        //     $prducts = ("SELECT " . $sales . ".*," . $sales . ".id as ssid," . $sales . ".status as ssstatus,customers.name as cname,stores.name as ssname     FROM " . $sales . "  left join registers on " . $sales . ".register_id=registers.id 
        //     LEFT join customers on " . $sales . ".client_id=customers.id
        //     LEFT join stores on registers.store_id=stores.id
        //     WHERE  $rtttfc  client_id=0 and    " . $sales . ".created_at between '$la32' AND '$laxg' order by " . $sales . ".id desc ");
        // }


        $data = array();

        // fetch vehicles records
        $fetch_data = $this->Sale->make_datatables($sales, $esuppr, $from, $to);

        foreach ($fetch_data as $veh) {

            $data[] = array(
                $veh->clientname,
                (!empty($veh->created_at) ? date('d.m.Y', strtotime($veh->created_at)) : ''),
                $veh->subtotal,
                $veh->total,
                $veh->created_by,
                (!empty($veh->attime) ? date('d.m.Y', strtotime($veh->attime)) : '')
            );
        }

        $output = array(
            'draw' => intval($_POST['draw']),
            'recordsTotal' => $this->Sale->get_all_data($sales, $esuppr, $from, $to),
            'recordsFiltered' => $this->Sale->get_filtered_data($sales, $esuppr, $from, $to),
            'data' => $data
        );

        echo json_encode($output);
        die;

        $product_list = $this->Sale->sales_report($sales, $esuppr, $la32, $laxg);
        // print_r($this->db->query($prducts)->result());
        // die;

        $result = '
        <table id="serverside"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="14" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="14"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="14">Daily Sales Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>
         <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;"> ' . label("Bill") . ' ' . label("Number") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Store") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("customers") . '</th>
        <th style="border: 1px solid #1c76bc;width:100px;">' . label("Date") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("NoOfItems") . '   </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . ' ' . label("Amount") . '   </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("tax") . '   </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Summary") . '   </th>
       
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Discount") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Shipping") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . ' ' . label("Amount") . ' </th>';


        $mkj = mysql_query("SELECT * from payment_mode where id!=1 order by id asc ");
        // while ($mkjf = mysql_fetch_array($mkj)) {

        //     $ll = $mkjf['id'];
        //     $mn = 'sss_' . $ll;
        //     $$mn = 0;
        //     if (is_array($pamode_id) && in_array($ll, $pamode_id)) {

        //         $result .= '<th style="border: 1px solid #1c76bc;"   >' . $mkjf['name'] . '</th>';
        //     }
        // }

        $result .= '<th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Status") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Cancel</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Exchange</th>        
        <th style="text-align:center;border: 1px solid #1c76bc; ">Return</th>
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

        $billamtrr_tot = 0;
        $billamtee_tot = 0;
        $fimdis = 0;
        // $product_list = $this->db->query($prducts)->result();

        $sql = $prducts;
        $query = $this->db->query($sql, FALSE); // FALSE = unbuffered query

        $data = [];
        while ($prd = $query->unbuffered_row('object')) {
            $row = [];
            $custt_namef = $prd->cname;


            $csub2 = 0;
            $ssub2 = 0;
            $isub2 = 0;
            $csubrr_2 = 0;
            $sslalf_rr = 0;

            // $sslal = Sale::find($prd->id);
            $oltaxl = '';

            $overal_tax = 0;

            $return_ck = mysql_query("select * from  returnss where re_sales_id='" . $prd->ssid . "' and  rsale_type='" . $ret_idd . "' ");
            $return_ck_num = mysql_num_rows($return_ck);


            $yuikk_query = ("select * from  " . $tax_summary . " where salesid='" . $prd->ssid . "' ");
            $yuikk = $this->db->query($yuikk_query, FALSE);
            while ($yuikkf = $yuikk_query->unbuffered_row('object')) {
                $oltaxl .= $yuikkf['taxname'] . '-' . number_format((float)$yuikkf['taxfrom'], $this->setting->decimals, '.', '') . '<br>';
                $overal_tax = $overal_tax + $yuikkf['taxfrom'];
            }

            $sslalf = $prd->discountamount;
            $discout_per = ($prd->discountamount * 100) / $prd->subtotal;



            $uyjhh = mysql_query("select * from " . $sale_items . " where sale_id='" . $prd->ssid . "'   ");
            while ($uyjhhf = mysql_fetch_array($uyjhh)) {
                $iknmm = mysql_query("select * from retunn_items where sl_id='" . $uyjhhf['id'] . "' and sall_idd='" . $prd->ssid . "' and rsaleit_type='" . $ret_idd . "' ");
                if (mysql_num_rows($iknmm) > 1) {
                    while ($retun_res = mysql_fetch_array($iknmm)) {
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




            if ($prd->ssstatus == 3) {
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

            $row[] = $prd->ssid;
            $row[] = $prd->ssname;
            $row[] = $custt_namef;
            $row[] = date("d-m-Y", strtotime($oll[0]));
            $row[] = $prd->totalitems;
            $row[] = number_format((float)$prd->subtotal, $this->setting->decimals, '.', '');
            $row[] = number_format((float)$overal_tax, $this->setting->decimals, '.', '');
            $row[] = $oltaxl;
            $row[] = number_format((float)$dixxss, $this->setting->decimals, '.', '');
            $row[] = number_format((float)$prd->disamtssh, $this->setting->decimals, '.', '');
            $row[] = number_format((float)$prd->total, $this->setting->decimals, '.', '');


            // '<td style="text-align:center;border: 1px solid #1c76bc; " >' . $prd->ssid . '</td>
            // <td style="text-align:left;border: 1px solid #1c76bc; " >' . $prd->ssname . '</td>
            // <td style="text-align:left;border: 1px solid #1c76bc; " >' . $custt_namef . '</td>
            // <td style="text-align:center;border: 1px solid #1c76bc; " >' .  date("d-m-Y", strtotime($oll[0])) . '</td>
            // <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->totalitems . '</td>
            // <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->subtotal, $this->setting->decimals, '.', '') . '</td>
            // <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$overal_tax, $this->setting->decimals, '.', '') . '</td>  
            // <td style="text-align:left;border: 1px solid #1c76bc; padding: 0px;">' . $oltaxl . '</td>
            // <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$dixxss, $this->setting->decimals, '.', '') . '</td>
            // <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->disamtssh, $this->setting->decimals, '.', '') . '</td> 

            // <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->total, $this->setting->decimals, '.', '') . '</td>  
            // ';

            if (!empty($pamode_id) && in_array($ee[0], $pamode_id)) {
                while ($mkjf = mysql_fetch_array($mkj)) {
                    $ll = $mkjf['id'];
                    $mn = 'sss_' . $ll;




                    $ee = explode('~', $prd->paidmethod);

                    if (isset($ll) && $ll != '' && in_array($ll, $pamode_id)) {
                        if ($ee[0] == $ll) {
                            if ($prd->total <= $prd->paid) {



                                $$mn = $$mn + $prd->recivamt2;
                                $row[] = number_format((float)$prd->recivamt2, $this->setting->decimals, '.', ' ');
                            } else {
                                $$mn = $$mn + $prd->recivamt2;
                                $row[] = number_format((float)$prd->recivamt2, $this->setting->decimals, '.', ' ');
                            }
                        } else {

                            $row[] = '0.00';
                        }
                    }
                }
            } else {
                $ddd = !empty($pamode_id) ? count($pamode_id) : 0;
                for ($nml = 0; $nml < $ddd; $nml++) {
                    if ($pamode_id[$nml] > 0) {

                        $row[] = '0.00';
                    }
                }
            }


            $cancel_amt = 0;
            if ($prd->ssstatus == 3) {
                $cancel_amt = $prd->total;
            }
            $billamtrr = 0;
            $billamtee = 0;
            // if ($return_ck_num > 0) {
            //     while ($return_sal = mysql_fetch_object($return_ck)) {

            //         if ($return_sal->retrn_amt_mtd == 1) {
            //             $billamtrr = $billamtrr + $return_sal->sutott;
            //             $billamtrr_tot = $billamtrr_tot + $return_sal->sutott;
            //         } else {
            //             $billamtee = $billamtee + $return_sal->sutott;
            //             $sstaus_w = "Exchange";
            //             $billamtee_tot = $billamtee_tot + $return_sal->sutott;
            //         }
            //     }
            // }
            $row[] = $sstaus_w;
            $row[] = number_format((float)$cancel_amt, $this->setting->decimals, '.', '');
            $row[] = number_format((float)$billamtee, $this->setting->decimals, '.', '');
            $row[] = number_format((float)$billamtrr, $this->setting->decimals, '.', '');



            // $result .= '</tr>';






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


            if ($prd->ssstatus == 3) {
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
            // if ($return_ck_num > 0) {
            //     while ($return_sal = mysql_fetch_object($return_ck)) {


            //         $billamt_rr = $billamt_rr + $return_sal->sutott;
            //         $tottax_rr = $tottax_rr + $csubrr_2;
            //         $fimdis_rr = $sslalf_rr + $fimdis_rr;
            //         $toott_rr = $toott_rr + $return_sal->tootal;
            //         $cashr_rr = 0;
            //         $coupr_rr = 0;
            //         $carddr_rr = 0;
            //         $cpointr_rr = 0;
            //     }
            // }

            $tottaxs = $tottaxs + $pxxxs;

            $tottaxi = $tottaxi + $pxxxi;
            $discc = $discc + $dixxss;
            $paidd = $paidd + $prd->total;
            $tt++;

            $data[] = $row;
        }
        echo json_encode(['data' => $data]);
        die;
        $result .= '</tbody>
        <tr>
           
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
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

           ';
        while ($mkjf = mysql_fetch_array($mkj)) {

            $ll = $mkjf['id'];
            $mn = 'sss_' . $ll;
            if (in_array($ll, $pamode_id)) {

                $result .= '<td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$$mn, $this->setting->decimals, '.', ' ') . '</b></td>';
            }
        }



        $result .= '<td style="text-align:right;border: 1px solid #1c76bc; "></td><td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$billamt_cc, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$billamtee_tot, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$billamtrr_tot, $this->setting->decimals, '.', '') . '</b></td>
            </tr>
            <tr>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Total</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
           <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "> </td> 
           <td style="text-align:right;border: 1px solid #1c76bc; "> </td>

           <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
           ';

        while ($mkjf = mysql_fetch_array($mkj)) {

            $ll = $mkjf['id'];
            $mn = 'sss_' . $ll;
            if (in_array($ll, $pamode_id)) {

                $result .= '<td style="text-align:right;border: 1px solid #1c76bc; "> </td>';
            }
        }


        $toott_tot = $toott - $billamt_cc - $billamtrr_tot - ($billamtee_tot);
        $result .= '<td style="text-align:right;border: 1px solid #1c76bc; "></td><td style="text-align:right;border: 1px solid #1c76bc; "> </td>
           <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$toott_tot, $this->setting->decimals, '.', '') . '</b></td></tr>

            </table>';

        // echo $result;

        echo json_encode(['data' => $data]);
    }



    public function getsalesdailReportnew()
    {

        for ($i = 1; $i <= 10; $i++) {

            $row[] = $i;
            $row[] = $i;
            $row[] = $i;
            $row[] = $i;
            $row[] = $i;
            $row[] = $i;
            $row[] = $i;
            $row[] = $i;
            $row[] = $i;
            $row[] = $i;
            $row[] = $i;
            $row[] = $i;
            $row[] = $i;
            $row[] = $i;
        }
        $data[] = $row;
        $output = array(
            "draw" => $_POST['draw'],
            "recordsTotal" => 10,
            "recordsFiltered" => 10,
            "data" => $data
        );
        // output to json format
        echo json_encode($output);
        /*$start  = $this->input->post('Range');
        $end    = $this->input->post('Range1');
        $esuppr = $this->input->post('suppr');
        $pamode_id = $this->input->post('selectedValues');
        
        $poql = mysql_fetch_array(mysql_query("select logo,themblock,companyname from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select adresse from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;
        
        if ($poql['themblock'] == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
            $tax_summary = "tax_summary";
        } else {
            $sales = "dsales";
            $sale_items = "dsale_items";
            $tax_summary = "dtax_summary";
        }
        $ret_idd = $poql['themblock'];

        //  ".$sales."
        //  ".$sale_items."
        //  ".$tax_summary."



        $rttt = $this->input->post('StoresSelect');

        if ($rttt > 0) {
            $rtttfc = 'registers.store_id=' . $rttt . ' and ';
        } else {
            $rtttfc = "";
        }


        //$prduct = Product::find($product_id);



        $la322x = explode('-', $start);
        $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

        $lax = explode('-', $end);
        $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
        if ($esuppr > 0) {

            $prducts = ("SELECT " . $sales . ".*," . $sales . ".id as ssid," . $sales . ".status as ssstatus,customers.name as cname,stores.name as ssname  FROM " . $sales . " 
            LEFT join registers on " . $sales . ".register_id=registers.id
            LEFT join customers on " . $sales . ".client_id=customers.id
            LEFT join stores on registers.store_id=stores.id
             WHERE    $rtttfc  client_id='$esuppr'  and    " . $sales . ".created_at  between '$la32' AND '$laxg' order by " . $sales . ".id desc ");
        } else if ($esuppr == '') {
            $prducts = ("SELECT " . $sales . ".*," . $sales . ".id as ssid," . $sales . ".status as ssstatus,customers.name as cname,stores.name as ssname     FROM " . $sales . "  left join registers on " . $sales . ".register_id=registers.id 
            LEFT join customers on " . $sales . ".client_id=customers.id
            LEFT join stores on registers.store_id=stores.id
            WHERE  $rtttfc   " . $sales . ".created_at between '$la32' AND '$laxg' order by " . $sales . ".id desc ");
        } else {
            $prducts = ("SELECT " . $sales . ".*," . $sales . ".id as ssid," . $sales . ".status as ssstatus,customers.name as cname,stores.name as ssname     FROM " . $sales . "  left join registers on " . $sales . ".register_id=registers.id 
            LEFT join customers on " . $sales . ".client_id=customers.id
            LEFT join stores on registers.store_id=stores.id
            WHERE  $rtttfc  client_id=0 and    " . $sales . ".created_at between '$la32' AND '$laxg' order by " . $sales . ".id desc ");
        }*/
        // print_r($this->db->query($prducts)->result());
        // die;

    }

    public function getsalesdailReport()
    {



        $start  = $this->input->post('Range');
        $end    = $this->input->post('Range1');
        $esuppr = $this->input->post('suppr');
        $pamode_id = $this->input->post('selectedValues');
        // $limit = $this->input->post('limit');
        // $offset = $this->input->post('offset');

        $poql = mysql_fetch_array(mysql_query("select logo,themblock,companyname from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select adresse from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;


        if ($poql['themblock'] == 0) {
            $sales = "sales";
            $sale_items = "sale_items";
            $tax_summary = "tax_summary";
        } else {
            $sales = "dsales";
            $sale_items = "dsale_items";
            $tax_summary = "dtax_summary";
        }
        $ret_idd = $poql['themblock'];

        //  ".$sales."
        //  ".$sale_items."
        //  ".$tax_summary."



        $rttt = $this->input->post('StoresSelect');

        if ($rttt > 0) {
            $rtttfc = 'registers.store_id=' . $rttt . ' and ';
        } else {
            $rtttfc = "";
        }


        //$prduct = Product::find($product_id);



        $la322x = explode('-', $start);
        $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

        $lax = explode('-', $end);
        $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
        if ($esuppr > 0) {

            $prducts = ("SELECT " . $sales . ".*," . $sales . ".id as ssid," . $sales . ".status as ssstatus,customers.name as cname,stores.name as ssname  FROM " . $sales . " 
            LEFT join registers on " . $sales . ".register_id=registers.id
            LEFT join customers on " . $sales . ".client_id=customers.id
            LEFT join stores on registers.store_id=stores.id
             WHERE $rtttfc  client_id='$esuppr'  and    " . $sales . ".created_at  between '$la32' AND '$laxg' order by " . $sales . ".id desc ");
        } else if ($esuppr == '') {
            $prducts = ("SELECT " . $sales . ".*," . $sales . ".id as ssid," . $sales . ".status as ssstatus,customers.name as cname,stores.name as ssname     FROM " . $sales . "  left join registers on " . $sales . ".register_id=registers.id 
            LEFT join customers on " . $sales . ".client_id=customers.id
            LEFT join stores on registers.store_id=stores.id
            WHERE  $rtttfc   " . $sales . ".created_at between '$la32' AND '$laxg' order by " . $sales . ".id desc");
        } else {
            $prducts = ("SELECT " . $sales . ".*," . $sales . ".id as ssid," . $sales . ".status as ssstatus,customers.name as cname,stores.name as ssname     FROM " . $sales . "  left join registers on " . $sales . ".register_id=registers.id 
            LEFT join customers on " . $sales . ".client_id=customers.id
            LEFT join stores on registers.store_id=stores.id
            WHERE  $rtttfc  client_id=0 and    " . $sales . ".created_at between '$la32' AND '$laxg' order by " . $sales . ".id desc ");
        }
        // print_r($this->db->query($prducts)->result());
        // die;


        $result = '
        <table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="14" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="14"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="14">Daily Sales Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>
         <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;"> ' . label("Bill") . ' ' . label("Number") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Store") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("customers") . '</th>
        <th style="border: 1px solid #1c76bc;width:100px;">' . label("Date") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("NoOfItems") . '   </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . ' ' . label("Amount") . '   </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("tax") . '   </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Summary") . '   </th>
       
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Discount") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Shipping") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . ' ' . label("Amount") . ' </th>';


        $mkj = mysql_query("SELECT * from payment_mode where id!=1 order by id asc ");
        while ($mkjf = mysql_fetch_array($mkj)) {

            $ll = $mkjf['id'];
            $mn = 'sss_' . $ll;
            $$mn = 0;
            if (is_array($pamode_id) && in_array($ll, $pamode_id)) {

                $result .= '<th style="border: 1px solid #1c76bc;"   >' . $mkjf['name'] . '</th>';
            }
        }

        $result .= '<th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Status") . ' </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Cancel</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">Exchange</th>        
        <th style="text-align:center;border: 1px solid #1c76bc; ">Return</th>
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

        $billamtrr_tot = 0;
        $billamtee_tot = 0;
        $fimdis = 0;
        $product_list = $this->db->query($prducts)->result();

        foreach ($product_list as $prd) {

            $custt_namef = $prd->cname;


            $csub2 = 0;
            $ssub2 = 0;
            $isub2 = 0;
            $csubrr_2 = 0;
            $sslalf_rr = 0;





            // $sslal = Sale::find($prd->id);
            $oltaxl = '';

            $overal_tax = 0;

            $return_ck = mysql_query("select * from  returnss where re_sales_id='" . $prd->ssid . "' and  rsale_type='" . $ret_idd . "' ");
            $return_ck_num = mysql_num_rows($return_ck);


            $yuikk = mysql_query("select * from  " . $tax_summary . " where salesid='" . $prd->ssid . "' ");
            while ($yuikkf = mysql_fetch_array($yuikk)) {
                $oltaxl .= $yuikkf['taxname'] . '-' . number_format((float)$yuikkf['taxfrom'], $this->setting->decimals, '.', '') . '<br>';
                $overal_tax = $overal_tax + $yuikkf['taxfrom'];
            }

            $sslalf = $prd->discountamount;
            $discout_per = ($prd->discountamount * 100) / $prd->subtotal;



            $uyjhh = mysql_query("select * from " . $sale_items . " where sale_id='" . $prd->ssid . "'   ");
            while ($uyjhhf = mysql_fetch_array($uyjhh)) {
                $iknmm = mysql_query("select * from retunn_items where sl_id='" . $uyjhhf['id'] . "' and sall_idd='" . $prd->ssid . "' and rsaleit_type='" . $ret_idd . "' ");
                if (mysql_num_rows($iknmm) > 1) {
                    while ($retun_res = mysql_fetch_array($iknmm)) {
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




            if ($prd->ssstatus == 3) {
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
            <td style="text-align:left;border: 1px solid #1c76bc; " >' . $prd->ssname . '</td>
            <td style="text-align:left;border: 1px solid #1c76bc; " >' . $custt_namef . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; " >' .  date("d-m-Y", strtotime($oll[0])) . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->totalitems . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->subtotal, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$overal_tax, $this->setting->decimals, '.', '') . '</td>  
            <td style="text-align:left;border: 1px solid #1c76bc; padding: 0px;">' . $oltaxl . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$dixxss, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->disamtssh, $this->setting->decimals, '.', '') . '</td> 

            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->total, $this->setting->decimals, '.', '') . '</td>  
            ';

            if (!empty($pamode_id) && in_array($ee[0], $pamode_id)) {
                while ($mkjf = mysql_fetch_array($mkj)) {
                    $ll = $mkjf['id'];
                    $mn = 'sss_' . $ll;




                    $ee = explode('~', $prd->paidmethod);

                    if (isset($ll) && $ll != '' && in_array($ll, $pamode_id)) {
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
                $ddd = !empty($pamode_id) ? count($pamode_id) : 0;
                for ($nml = 0; $nml < $ddd; $nml++) {
                    if ($pamode_id[$nml] > 0) {

                        $result .= '<td style="text-align:right;border: 1px solid #1c76bc; " >0.00</td>';
                    }
                }
            }


            $cancel_amt = 0;
            if ($prd->ssstatus == 3) {
                $cancel_amt = $prd->total;
            }
            $billamtrr = 0;
            $billamtee = 0;
            if ($return_ck_num > 0) {
                while ($return_sal = mysql_fetch_object($return_ck)) {

                    if ($return_sal->retrn_amt_mtd == 1) {
                        $billamtrr = $billamtrr + $return_sal->sutott;
                        $billamtrr_tot = $billamtrr_tot + $return_sal->sutott;
                    } else {
                        $billamtee = $billamtee + $return_sal->sutott;
                        $sstaus_w = "Exchange";
                        $billamtee_tot = $billamtee_tot + $return_sal->sutott;
                    }
                }
            }
            $result .= '<td style="text-align:center;border: 1px solid #1c76bc; " >' . $sstaus_w . '</td>';
            $result .= '<td  style="text-align:center;border: 1px solid #1c76bc; ">' . number_format((float)$cancel_amt, $this->setting->decimals, '.', '') . '</td><td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$billamtee, $this->setting->decimals, '.', '') . '</td><td  style="text-align:center;border: 1px solid #1c76bc; ">' . number_format((float)$billamtrr, $this->setting->decimals, '.', '') . '</td>';


            $result .= '</tr>';






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


            if ($prd->ssstatus == 3) {
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
                while ($return_sal = mysql_fetch_object($return_ck)) {


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
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Sub Total</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$billamt, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$tottax, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$fimdis, $this->setting->decimals, '.', ' ') . '</b></td> 
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$toott_ship, $this->setting->decimals, '.', ' ') . '</b></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$toott, $this->setting->decimals, '.', ' ') . '</b></td>

           ';
        while ($mkjf = mysql_fetch_array($mkj)) {

            $ll = $mkjf['id'];
            $mn = 'sss_' . $ll;
            if (in_array($ll, $pamode_id)) {

                $result .= '<td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$$mn, $this->setting->decimals, '.', ' ') . '</b></td>';
            }
        }



        $result .= '<td style="text-align:right;border: 1px solid #1c76bc; "></td><td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$billamt_cc, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$billamtee_tot, $this->setting->decimals, '.', '') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$billamtrr_tot, $this->setting->decimals, '.', '') . '</b></td>
            </tr>
            <tr>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "><b>Total</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
           <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>

           <td style="text-align:right;border: 1px solid #1c76bc; "> </td> 
           <td style="text-align:right;border: 1px solid #1c76bc; "> </td>

           <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
           ';

        while ($mkjf = mysql_fetch_array($mkj)) {

            $ll = $mkjf['id'];
            $mn = 'sss_' . $ll;
            if (in_array($ll, $pamode_id)) {

                $result .= '<td style="text-align:right;border: 1px solid #1c76bc; "> </td>';
            }
        }


        $toott_tot = $toott - $billamt_cc - $billamtrr_tot - ($billamtee_tot);
        $result .= '<td style="text-align:right;border: 1px solid #1c76bc; "></td><td style="text-align:right;border: 1px solid #1c76bc; "> </td>
           <td style="text-align:right;border: 1px solid #1c76bc; "> </td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . number_format((float)$toott_tot, $this->setting->decimals, '.', '') . '</b></td></tr>

            </table>';
        echo $result;
    }






    public function getprossReport()
    {

        $start  = $this->input->post('Range');
        $end    = $this->input->post('Range1');
        $esuppr = $this->input->post('suppr');

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));



        //$prduct = Product::find($product_id);
        if ($start == 0  || $start == '') {
            exit;
            $lmm = date("Y-m-d");
            $prducts = mysql_query("SELECT *  FROM `sales` WHERE   purdat between '$lmm' AND '$lmm'  order by purdat asc ");
        } else {

            $la322x = explode('-', $start);
            $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

            $lax = explode('-', $end);
            $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
            if ($esuppr > 0) {

                $prducts = mysql_query("SELECT *  FROM `sale_items` WHERE  product_id= $esuppr  and     `date` between '$la32' AND '$laxg' order by id desc ");
            } elseif ($esuppr == 0) {
                $prducts = mysql_query("SELECT *  FROM `sale_items` WHERE   `date` between '$la32' AND '$laxg' order by id desc ");
            } else {
                $prducts = mysql_query("SELECT *  FROM `sale_items` WHERE    `date` between '$la32' AND '$laxg' order by id desc ");
            }
        }


        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="7" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="7"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="7">HSN Sales Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

        <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;"> ' . label("Bill") . ' ' . label("Number") . '</th>
        <th style="border: 1px solid #1c76bc;"> ' . label("HSN") . ' ' . label("Name") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Date") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("NoOfItems") . '   </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Rate") . '   </th>
        
      
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Discount") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . ' ' . label("Amount") . ' </th>
       
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

        while ($prd = mysql_fetch_object($prducts)) {
            $csub2 = 0;
            $ssub2 = 0;
            $isub2 = 0;



            $csub2 = ($prd->subtotal2 * $prd->cgst) / 100;
            $ssub2 = ($prd->subtotal2 * $prd->sgst) / 100;
            $isub2 = ($prd->subtotal2 * $prd->igstt) / 100;




            $ollx = mysql_fetch_array(mysql_query("select * from sales where id='" . $prd->sale_id . "' "));
            $ohsn = mysql_fetch_array(mysql_query("select * from products where id='" . $prd->product_id . "' "));
            $yhhh = $ollx['yyear'] . '' . sprintf("%05d", $prd->sale_id);
            // $oll=explode(" ",$prd->attime);


            // $pxxx= $prd->taxamount;
            // $pxxxs= $prd->sgsttaxamt ;
            // $dixxss=$prd->discount_indujul + $prd->discountamount;


            $result .= '<tr  >
            <td  style="text-align:center;border: 1px solid #1c76bc; ">' . $yhhh . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' .  $ohsn['hsn'] . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' .  date("d-m-Y", strtotime($prd->date))  . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . $prd->qt . '</td>
             <td style="text-align:center;border: 1px solid #1c76bc; ">' . number_format((float)$prd->price, $this->setting->decimals, '.', '') . '</td>
          

            
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . number_format((float)$prd->dis_amt, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:center;border: 1px solid #1c76bc; ">' . number_format((float)$prd->subtotal, $this->setting->decimals, '.', '') . '</td>




           
           


            </tr>';
            $billamt = $billamt + $prd->qt;
            $tottax = $tottax + $csub2;

            $tottaxs = $tottaxs + $ssub2;
            $tottaxi = $tottaxi + $isub2;
            $discc = $discc + $prd->dis_amt;
            $toott = $toott + $prd->price;
            $paidd = $paidd + $prd->subtotal;


            // $cashr=$cashr+$cash;
            // $coupr=$coupr+$coup;
            //  $carddr=$carddr+$cardd;
            // $cpointr=$cpointr+$cpoint;




            $tt++;
        }

        $result .= '</tbody>
        <tr>
           
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:center;border: 1px solid #1c76bc; "></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . $billamt . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
           

           
           
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$discc, $this->setting->decimals, '.', ' ') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$paidd, $this->setting->decimals, '.', ' ') . '</b></td>

           
           
           


           
            </tr></table>';

        echo $result;
    }


    public function getprossdReport()
    {

        $start  = $this->input->post('Range');
        $end    = $this->input->post('Range1');
        $esuppr = $this->input->post('suppr');

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;


        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));


        //$prduct = Product::find($product_id);
        if ($start == 0  || $start == '') {
            exit;
            $lmm = date("Y-m-d");
            $prducts = mysql_query("SELECT *  FROM `sales` WHERE   purdat between '$lmm' AND '$lmm'  order by purdat asc ");
        } else {

            $la322x = explode('-', $start);
            $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

            $lax = explode('-', $end);
            $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
            if ($esuppr > 0) {

                $prducts = mysql_query("SELECT *,sum(qt) as qqt,sum(subtotal) as ssubtotal,sum(cgst) as ccgst,sum(sgst) as ssgst,sum(dis_amt) as ddis_amt,count(*) as bills  FROM `sale_items` WHERE product_id= $esuppr and    `date` between '$la32' AND '$laxg'  group by date,product_id ");
            } elseif ($esuppr == '') {
                $prducts = mysql_query("SELECT *,sum(qt) as qqt,sum(subtotal) as ssubtotal,sum(cgst) as ccgst,sum(sgst) as ssgst,sum(dis_amt) as ddis_amt,count(*) as bills  FROM `sale_items` WHERE   `date` between '$la32' AND '$laxg'  group by date,product_id ");
            } else {
                $prducts = mysql_query("SELECT *,sum(qt) as qqt,sum(subtotal) as ssubtotal,sum(cgst) as ccgst,sum(sgst) as ssgst,sum(dis_amt) as ddis_amt,count(*) as bills  FROM `sale_items` WHERE   `date` between '$la32' AND '$laxg'  group by product_id ");
            }
        }


        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="7" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="7"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="7">HSN Sales Summary Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>
         <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;"> ' . label("Total") . ' ' . label("Bill") . '</th>
        <th style="border: 1px solid #1c76bc;"> ' . label("HSN") . ' ' . label("Name") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Date") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("NoOfItems") . '   </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("MRP") . '   </th>
        
       
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Discount") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . ' ' . label("Amount") . ' </th>
       
        </tr></thead><tbody>';

        $tt = 1;
        $billamt = 0;
        $tottax = 0;
        $tottaxs = 0;
        $tottaxi = 0;
        $discc = 0;
        $toott = 0;
        $paidd = 0;




        while ($prd = mysql_fetch_object($prducts)) {



            $csub2 = 0;
            $ssub2 = 0;
            $isub2 = 0;
            $prmskk = mysql_query("SELECT *  FROM `sale_items` WHERE  product_id='" . $prd->product_id . "' and   date='$prd->date'   ");
            while ($uyjhhf = mysql_fetch_array($prmskk)) {
                $csub2 = (($uyjhhf['subtotal2'] * (int)intval($uyjhhf['cgst'])) / 100) + $csub2;
                $ssub2 = (($uyjhhf['subtotal2'] * $uyjhhf['sgst']) / 100) + $ssub2;
                $isub2 = (($uyjhhf['subtotal2'] * (int)intval($uyjhhf['igstt'])) / 100) + $isub2;
            }




            $ollx = mysql_fetch_array(mysql_query("select * from sales where id='" . $prd->sale_id . "' "));
            $yhhh = $ollx['yyear'] . '' . sprintf("%05d", $prd->sale_id);




            $ohsn = mysql_fetch_array(mysql_query("select * from products where id='" . $prd->product_id . "' "));


            $result .= '<tr  >
            
            <td  style="border: 1px solid #1c76bc;">' .  $prd->bills . '</td>
               <td style="border: 1px solid #1c76bc;" >' .  $ohsn['hsn'] . '</td>
            <td style="border: 1px solid #1c76bc;">' .  date("d-m-Y", strtotime($prd->date))  . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->qqt . '</td>
             <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->price, $this->setting->decimals, '.', '') . '</td>
           
            
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->ddis_amt, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->price * $prd->qqt, $this->setting->decimals, '.', '') . '</td>




           
           


            </tr>';
            $billamt = $billamt + $prd->qqt;
            $tottax = $tottax + $csub2;

            $tottaxs = $tottaxs + $ssub2;
            $tottaxi = $tottaxi + $isub2;
            $discc = $discc + $prd->ddis_amt;
            $toott = $toott + $prd->price;
            $paidd = ($prd->price * $prd->qqt) + $paidd;








            $tt++;
        }

        $result .= '</tbody>
        <tr>
           
            <td style="border: 1px solid #1c76bc;border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;border: 1px solid #1c76bc;"></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . $billamt . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
          
           
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$discc, $this->setting->decimals, '.', ' ') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$paidd, $this->setting->decimals, '.', ' ') . '</b></td>

           
           
           


           
            </tr></table>';

        echo $result;
    }

    public function getprossmReport()
    {

        $start  = $this->input->post('Range');
        $end    = $this->input->post('Range1');
        $esuppr = $this->input->post('suppr');

        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;
        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));



        //$prduct = Product::find($product_id);
        if ($start == 0  || $start == '') {
            exit;
            $lmm = date("Y-m-d");
            $prducts = mysql_query("SELECT *  FROM `sales` WHERE   purdat between '$lmm' AND '$lmm'  order by purdat asc ");
        } else {

            $la322x = explode('-', $start);
            $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

            $lax = explode('-', $end);
            $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
            if ($esuppr > 0) {



                $prducts = mysql_query("SELECT *,sum(qt) as qqt,sum(subtotal) as ssubtotal,sum(cgst) as ccgst,sum(sgst) as ssgst,sum(dis_amt) as ddis_amt,count(*) as bills  FROM `sale_items` WHERE  product_id= $esuppr  and   `date` between '$la32' AND '$laxg'  group by DATE_FORMAT(date, '%Y%m') ,product_id ");
            } elseif ($esuppr == 0) {
                $prducts = mysql_query("SELECT *,sum(qt) as qqt,sum(subtotal) as ssubtotal,sum(cgst) as ccgst,sum(sgst) as ssgst,sum(dis_amt) as ddis_amt,count(*) as bills  FROM `sale_items` WHERE   `date` between '$la32' AND '$laxg'  group by DATE_FORMAT(date, '%Y%m') ,product_id ");
            } else {
                $prducts = mysql_query("SELECT *,sum(qt) as qqt,sum(subtotal) as ssubtotal,sum(cgst) as ccgst,sum(sgst) as ssgst,sum(dis_amt) as ddis_amt,count(*) as bills  FROM `sale_items` WHERE   `date` between '$la32' AND '$laxg'  group by DATE_FORMAT(date, '%Y%m') , product_id ");
            }
        }


        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="7" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="7"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="7">Monthly Summary HSN Sales Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>

 <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;"> ' . label("Total") . ' ' . label("Bill") . '</th>
        <th style="border: 1px solid #1c76bc;"> ' . label("HSN") . ' ' . label("Name") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("Date") . '</th>
        <th style="border: 1px solid #1c76bc;">' . label("NoOfItems") . '   </th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("MRP") . '   </th>
        
       
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Discount") . '</th>
        <th style="text-align:center;border: 1px solid #1c76bc; ">' . label("Total") . ' ' . label("Amount") . ' </th>
       
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

        while ($prd = mysql_fetch_object($prducts)) {


            $ollx = mysql_fetch_array(mysql_query("select * from sales where id='" . $prd->sale_id . "' "));
            $yhhh = $ollx['yyear'] . '' . sprintf("%05d", $prd->sale_id);
            $oll = explode("-", $prd->date);
            $tyui = $oll['0'] . '-' . $oll['1'];

            $csub2 = 0;
            $ssub2 = 0;
            $isub2 = 0;
            $prmskk = mysql_query("SELECT *  FROM `sale_items` WHERE  product_id='" . $prd->product_id . "' and `date` between '$la32' AND '$laxg' and  date like '" . $tyui . "-%'   ");
            while ($uyjhhf = mysql_fetch_array($prmskk)) {
                $csub2 = (($uyjhhf['subtotal2'] * (int)intval($uyjhhf['cgst'])) / 100) + $csub2;
                $ssub2 = (($uyjhhf['subtotal2'] * $uyjhhf['sgst']) / 100) + $ssub2;
                $isub2 = (($uyjhhf['subtotal2'] * (int)intval($uyjhhf['igstt'])) / 100) + $isub2;
            }


            if ($prd->paidmethod == 0) {
                $cash = $prd->total;
                $coup = 0;
                $cardd = 0;
                $cpoint = 0;
            } elseif ($prd->paidmethod == 1) {
                $cash = 0;
                $coup = 0;
                $cardd = $prd->total;
                $cpoint = 0;
            } elseif ($prd->paidmethod == 2) {
                $cash = 0;
                $coup = $prd->total;
                $cardd = 0;
                $cpoint = 0;
            } else {
                $cash = 0;
                $coup = 0;
                $cardd = 0;
                $cpoint = $prd->total;
            }

            $pxxx = $prd->taxamount;
            $pxxxs = $prd->sgsttaxamt;
            $dixxss = $prd->discount_indujul + $prd->discountamount;


            $ohsn = mysql_fetch_array(mysql_query("select * from products where id='" . $prd->product_id . "' "));



            $result .= '<tr  >
            
            <td style="border: 1px solid #1c76bc;">' .  $prd->bills . '</td>
            <td style="border: 1px solid #1c76bc;">' .  $ohsn['hsn'] . '</td>
            <td style="border: 1px solid #1c76bc;">' .  $oll['1'] . '-' . $oll['0'] . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . $prd->qqt . '</td>
             <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->price, $this->setting->decimals, '.', '') . '</td>
            
            
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->ddis_amt, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; ">' . number_format((float)$prd->ssubtotal, $this->setting->decimals, '.', '') . '</td>




           
           


            </tr>';
            $billamt = $billamt + $prd->qqt;
            $tottax = $tottax + $csub2;

            $tottaxs = $tottaxs + $ssub2;
            $tottaxi = $tottaxi + $isub2;
            $discc = $discc + $prd->ddis_amt;
            $toott = $toott + $prd->price;
            $paidd = $paidd + $prd->ssubtotal;


            $cashr = $cashr + $cash;
            $coupr = $coupr + $coup;
            $carddr = $carddr + $cardd;
            $cpointr = $cpointr + $cpoint;




            $tt++;
        }

        $result .= '</tbody>
        <tr>
           
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>' . $billamt . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "></td>
          
           

           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$discc, $this->setting->decimals, '.', ' ') . '</b></td>
           <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$paidd, $this->setting->decimals, '.', ' ') . '</b></td>

           
           
           


           
            </tr></table>';

        echo $result;
    }





    public function gettotalsalsReport()
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
        <tr class="hideme" style="text-align:center; " ><th colspan="9"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
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
                $csub2 = (((int)$uyjhhf['subtotal2'] * (int)intval($uyjhhf['cgst'])) / 100) + $csub2;
                $ssub2 = (((int)$uyjhhf['subtotal2'] * (int)$uyjhhf['sgst']) / 100) + $ssub2;
                $isub2 = (((int)$uyjhhf['subtotal2'] * (int)intval($uyjhhf['igstt'])) / 100) + $isub2;
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
        $ret_idd = $lkmm['themblock'];
        //  ".$sales."
        //  ".$sale_items."
        //  ".$tax_summary."
        $start  = $this->input->post('Range');
        $end    = $this->input->post('Range1');
        $esuppr = $this->input->post('suppr');
        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));
        $totalprofit = 0;
        $totalprocg = 0;
        $totalprosg = 0;
        $gtotal = 0;


        $rttt = $this->input->post('StoresSelect');

        if ($rttt > 0) {
            $rtttfc = 'registers.store_id=' . $rttt . ' and ';
        } else {
            $rtttfc = "";
        }



        $la322x = explode('-', $start);
        $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];
        $lax = explode('-', $end);
        $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];
        if ($esuppr > 0) {

            $prducts = mysql_query("SELECT *," . $sales . ".id as ssid,sum(paid) as ttot,sum(Case When " . $sales . ".status=3 THEN paid ELSE 0 END) as total_can, sum(Case When paidmethod=0 THEN paid ELSE 0 END) as cashh,sum(Case When paidmethod like '1~%' THEN paid ELSE 0 END) as cardd,sum(Case When paidmethod like '10~%' THEN paid ELSE 0 END) as coupp,sum(Case When paidmethod like '6~%' THEN paid ELSE 0 END) as ppnt,count(*) as tbils,sum(totalitems) as noofitem,sum(subtotal) as toot,sum(taxamount) as cgst,sum(sgsttaxamt) as sgst,sum(discountamount) as disct  FROM " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE  $rtttfc  client_id='$esuppr'  and created_at between '$la32' AND '$laxg'  GROUP BY DATE_FORMAT(created_at, '%Y%m')   ");
        } elseif ($esuppr == '') {




            $prducts = mysql_query("SELECT *," . $sales . ".id as ssid,sum(paid) as ttot,sum(Case When " . $sales . ".status=3 THEN paid ELSE 0 END) as total_can, sum(Case When paidmethod=0 THEN paid ELSE 0 END) as cashh,sum(Case When paidmethod like '1~%' THEN paid ELSE 0 END) as cardd,sum(Case When paidmethod like '10~%' THEN paid ELSE 0 END) as coupp,sum(Case When paidmethod like '6~%' THEN paid ELSE 0 END) as ppnt,count(*) as tbils,sum(totalitems) as noofitem,sum(subtotal) as toot,sum(taxamount) as cgst,sum(sgsttaxamt) as sgst,sum(discountamount) as disct  FROM " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE  $rtttfc    created_at between '$la32' AND '$laxg'  GROUP BY DATE_FORMAT(created_at, '%Y%m')   ");
        } else {

            $prducts = mysql_query("SELECT *," . $sales . ".id as ssid,sum(paid) as ttot,sum(Case When " . $sales . ".status=3 THEN paid ELSE 0 END) as total_can, sum(Case When paidmethod=0 THEN paid ELSE 0 END) as cashh,sum(Case When paidmethod like '1~%' THEN paid ELSE 0 END) as cardd,sum(Case When paidmethod like '10~%' THEN paid ELSE 0 END) as coupp,sum(Case When paidmethod like '6~%' THEN paid ELSE 0 END) as ppnt,count(*) as tbils,sum(totalitems) as noofitem,sum(subtotal) as toot,sum(taxamount) as cgst,sum(sgsttaxamt) as sgst,sum(discountamount) as disct  FROM " . $sales . "  inner join registers on " . $sales . ".register_id=registers.id WHERE  $rtttfc  client_id=0  and   created_at between '$la32' AND '$laxg'  GROUP BY DATE_FORMAT(created_at, '%Y%m')   ");
        }

        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="9" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="9">Monthly Sales Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>
         <tr style="background:#1c76bc;color:#fff;border: 1px solid #1c76bc;">
        <th style="border: 1px solid #1c76bc;"> ' . label("Total") . ' ' . label("Bill") . ' </th>
        <th style="border: 1px solid #1c76bc;">' . label("Month") . '</th>
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
        $ik_ret_total = 0;


        while ($prd = mysql_fetch_object($prducts)) {




            $ujio = explode("-", $prd->created_at);
            $ujiog = $ujio['1'] . '-' . $ujio['0'];
            $ujxx = $ujio['0'] . '-' . $ujio['1'];

            $csub2 = 0;
            $ssub2 = 0;
            $isub2 = 0;


            $uyjhh = mysql_query("select * from sale_items where date like '" . $ujxx . "-%'   ");
            while ($uyjhhf = mysql_fetch_array($uyjhh)) {
                $csub2 = (($uyjhhf['subtotal2'] * (int)intval($uyjhhf['cgst'])) / 100) + $csub2;
                $ssub2 = (($uyjhhf['subtotal2'] * (int)$uyjhhf['sgst']) / 100) + $ssub2;
                $isub2 = (($uyjhhf['subtotal2'] * (int)intval($uyjhhf['igstt'])) / 100) + $isub2;
            }

            $rrty_value = mysql_fetch_array(mysql_query("select todate,sum(tootal) as rretunn from returnss where todate like '" . $ujxx . "-%' and  rsale_type='" . $ret_idd . "' "));

            $ik_ret_total = floatval($rrty_value['rretunn']) + $ik_ret_total;



            $oll = explode(" ", $prd->attime);
            if ($prd->paidmethod == 0) {
                $cash = $prd->paid;
                $coup = 0;
                $cardd = 0;
                $cpoint = 0;
            } elseif ($prd->paidmethod == 1) {
                $cash = 0;
                $coup = 0;
                $cardd = $prd->paid;
                $cpoint = 0;
            } elseif ($prd->paidmethod == 2) {
                $cash = 0;
                $coup = $prd->paid;
                $cardd = 0;
                $cpoint = 0;
            } else {
                $cash = 0;
                $coup = 0;
                $cardd = 0;
                $cpoint = $prd->paid;
            }
            $pxxx = $csub2;
            $pxxxs = $ssub2;
            $pxxxi = $isub2;
            $dixxss = $prd->discount_indujul + $prd->discountamount;
            $result .= '<tr  >
            <td  style="border: 1px solid #1c76bc;">' . $prd->tbils . '</td>
            <td style="border: 1px solid #1c76bc;">' .  $ujiog . '</td>
            <td style="border: 1px solid #1c76bc;">' . $prd->noofitem . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc;">' . number_format((float)$prd->toot, $this->setting->decimals, '.', '') . '</td>
          



            </tr>';
            $billamt = $billamt + $prd->toot;
            $billamt_cc = $billamt_cc + $prd->total_can;
            $tottax = $tottax + $pxxx;
            $tottaxs = $tottaxs + $pxxxs;
            $tottaxi = $tottaxi + $pxxxi;
            $discc = $discc + ($prd->disct / $prd->tbils);
            $toott = $toott + $prd->ttot;
            $paidd = $paidd + $prd->ttot;
            $cashr = $cashr + $prd->cashh;
            $coupr = $coupr + $prd->cardd;
            $carddr = $carddr + $prd->coupp;
            $cpointr = $cpointr + $prd->ppnt;
            $tt++;
        }
        $result .= '</tbody>
        <tr>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"><b>Sub Total</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$billamt, $this->setting->decimals, '.', '') . '</b></td>
        

          
       



            </tr>

            <tr>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"><b>Cancel</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$billamt_cc, $this->setting->decimals, '.', '') . '</b></td>
        

          
       

           
           
           
            </tr>  <tr>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"><b>Return</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)$ik_ret_total, $this->setting->decimals, '.', '') . '</b></td>
        

          
       


           
            </tr>


            <tr>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"></td>
            <td style="border: 1px solid #1c76bc;"><b>Total</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; "><b>Rs.' . number_format((float)($billamt - $billamt_cc - $ik_ret_total), $this->setting->decimals, '.', '') . '</b></td>
        

          
       

           
            </tr>
            </table>';
        echo $result;
    }



    public function getprofitdailReport()
    {

        $start  = $this->input->post('Range');
        $end    = $this->input->post('Range1');

        $ttt_tot = 0;
        $sss_tot = 0;
        $cann_tot = 0;
        $rett_tot = 0;
        $fff_tot = 0;
        $total_amt_tot = 0;

        $poql = mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        $poss = mysql_fetch_array(mysql_query("select * from stores where id='" . $this->session->userdata('store') . "' "));
        $kmmokk = base_url() . 'files/Setting/' . $poql['logo'];
        $startpp = date("d-m-Y", strtotime($start));
        $endpp = date("d-m-Y", strtotime($end));

        $storeoo = $this->session->userdata('store');



        $la322x = explode('-', $start);
        $la32 = $la322x[2] . '-' . $la322x[1] . '-' . $la322x[0];

        $lax = explode('-', $end);
        $laxg = $lax[2] . '-' . $lax[1] . '-' . $lax[0];


        $result = '<table id="chltkarr"  class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead><tr class="hideme"><th colspan="7" style="text-align:center; " >' . $poql['companyname'] . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="7"> ' . (isset($poss['adresse']) ? $poss['adresse'] : "") . '</th></tr>
        <tr class="hideme" style="text-align:center; " ><th colspan="7">Profit Reports from  ' . date("d-m-Y", strtotime($startpp)) . ' Till ' . date("d-m-Y", strtotime($endpp)) . '</th></tr>
        <tr style="background:#1c76bc;color:#fff;">
        <th style="border: 1px solid #1c76bc;text-align:center;">' . label("Date") . '</th>
        <th style="border: 1px solid #1c76bc;text-align:center;"> ' . label("Purchase") . ' </th>
        <th style="border: 1px solid #1c76bc;text-align:center;"> ' . label("Sales") . ' </th>
        <th style="border: 1px solid #1c76bc;text-align:center;"> ' . label("Cancel") . ' </th>
        <th style="border: 1px solid #1c76bc;text-align:center;"> ' . label("Return") . ' </th>
        <th style="border: 1px solid #1c76bc;text-align:center;"> ' . label("Goods Out") . ' </th>
        <th style="border: 1px solid #1c76bc;text-align:center;"> ' . label("Profit") . ' </th>
        </tr></thead><tbody >';




        $start_date = $la32;
        $end_date = $laxg;

        while (strtotime($start_date) <= strtotime($end_date)) {
            $ttt = 0;
            $sss = 0;
            $fff = 0;
            $rett = 0;
            $cann = 0;
            $timestamp = strtotime($start_date);
            $day = date('D', $timestamp);

            $opll = mysql_fetch_array(mysql_query("select date,sum(total) as pur_amt from purchases where store_id='" . $storeoo . "' and date='" . $start_date . "' "));
            $ttt = $opll['pur_amt'];


            $opllf = mysql_fetch_array(mysql_query("select created_at,sum(total)  as sal_total from sales inner join registers on registers.id=sales.register_id  where  registers.store_id='" . $storeoo . "' and created_at='" . $start_date . "' "));
            $sss = $opllf['sal_total'];


            $opllfc = mysql_fetch_array(mysql_query("select created_at,sum(total)  as sal_total from sales inner join registers on registers.id=sales.register_id  where  registers.store_id='" . $storeoo . "' and  created_at='" . $start_date . "' and status=3 "));
            $cann = $opllfc['sal_total'];



            $opllfr = mysql_fetch_array(mysql_query("select to_datte,sum(sl_subtotal)  as ren_tot from  retunn_items where store_idsi='" . $storeoo . "' and  to_datte='" . $start_date . "'"));
            $rett = $opllfr['ren_tot'];



            $gopllf = mysql_fetch_array(mysql_query("select datea,sum(totprice) as ggod_tota from goodsitems where datea='" . $start_date . "' "));

            $fff = $gopllf['ggod_tota'];






            $total_amt = $sss - $ttt - $cann - $rett + $fff;


            $ttt_tot = $ttt_tot + $ttt;
            $sss_tot = $sss_tot + $sss;
            $cann_tot = $cann_tot + $cann;
            $rett_tot = $rett_tot + $rett;
            $fff_tot = $fff_tot + $fff;
            $total_amt_tot = $total_amt_tot + $total_amt;


            $result .= '<tr  >
            <td style="border: 1px solid #1c76bc;text-align:center;" >' . date("d-m-Y", strtotime($start_date)) . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$ttt, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$sss, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$cann, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$rett, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$fff, $this->setting->decimals, '.', '') . '</td>
            <td style="text-align:right;border: 1px solid #1c76bc; " >' . number_format((float)$total_amt, $this->setting->decimals, '.', '') . '</td>
          

            </tr>';
            $start_date = date("Y-m-d", strtotime("+1 days", strtotime($start_date)));
        }

        $result .= '

        <tr  >
            <td style="border: 1px solid #1c76bc;text-align:right;" ><b>Total</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; " ><b>' . number_format((float)$ttt_tot, $this->setting->decimals, '.', '') . '</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; " ><b>' . number_format((float)$sss_tot, $this->setting->decimals, '.', '') . '</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; " ><b>' . number_format((float)$cann_tot, $this->setting->decimals, '.', '') . '</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; " ><b>' . number_format((float)$rett_tot, $this->setting->decimals, '.', '') . '</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; " ><b>' . number_format((float)$fff_tot, $this->setting->decimals, '.', '') . '</b></td>
            <td style="text-align:right;border: 1px solid #1c76bc; " ><b>' . number_format((float)$total_amt_tot, $this->setting->decimals, '.', '') . '</b></td>
          

            </tr>
            </tbody>
       </table>';

        echo $result;
    }
}
