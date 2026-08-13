<?php

namespace App\Controllers;

use App\Models\SaleModel;
use App\Models\SaleItemModel;
use App\Models\CustomerModel;
use App\Models\SettingModel;
use CodeIgniter\Controller;
use Config\Services;

class Invoicess extends BaseController
{
    protected $setting;

    public function __construct()
    {
        helper(['form', 'url']);

        // Load setting once
        $this->setting = SettingModel::find(1);
        $this->SaleModel = new SaleModel();
        $this->CustomerModel = new CustomerModel();
        $this->SaleItemModel = new SaleItemModel();
        $this->SettingModel = new SettingModel();
    }
    public function showInvoice($id)
    {

        $sale = $this->SaleModel->find($id);
        $posales = $this->SaleItemModel->all(['sale_id' => $id]);
        $client = $this->CustomerModel->find('first', array(
            'conditions' => array(
                'id = ?',
                $sale->client_id
            )
        ));

        $ClientData = $client ? 'Customer_model: ' . $client->name . '<br>' . $client->phone . '<br>' . $client->email : label('WalkinCustomer');

        $reg_ffrf = $this->db - query("select id,store_id from registers where id='" . $sale->register_id . "'  ")->getRowArray();
        @$mstoe = $reg_ffrf['store_id'];
        $mstoef = $this->db->query("select * from stores where id='" . $mstoe . "' ")->getRowArray();
        $ccname1 = $sale->clientname;
        $ccname3 = $sale->mobnnm;

        if ($sale->client_id > 0) {


            $ccname2 = $client->customeraddress;
            $ccname569 = $client->shppingad;
            $ccname570 = isset($client->gstno);
        } else {
            $ccname2 = "";
            $ccname569 = "";
            $ccname570 = "";
        }











        $ticket = '<h2 style="text-align:center;margin-bottom:-15px;font-size:16px;">TAX INVOICE </h2> <div style="width:148mm;font-size:10px;margin-top:10px;margin:25px auto;padding:15px;" >';





        $ticket .= '<div style="border: 1px solid #333;padding:3px;">

            <table class="table" style="width:100%;border-top: 0px solid #333;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;margin-top:30px;" cellspacing="0" border="0"  > 
            <tr>
            <td style="width:55%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">

            <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >
         

            <tr>
            <td style="border-top: 0px;font-size:15px;color:#333;"><img src="' . base_url() . '/files/Setting/' . $this->setting->logo . '" alt="logo" style="max-height: 45px; "></td>
            </tr>  
            <tr>
            <td style="border-top: 0px;font-size:13px;color:#333;"><b>' . $mstoef['name'] . '</b></td>
            </tr>
            <tr>
            <td style="border-top: 0px;">' . nl2br($mstoef['adresse']) . ',' . $mstoef['city'] . ',' . $mstoef['country'] . '</td>
            </tr>';
        if ($mstoef['phone']) {
            $ticket .= '<tr>
            <td style="border-top: 0px;" >PHONE: ' . $mstoef['phone'] . '</td>
            
            </tr>';
        }

        if ($this->setting->gstnoo) {
            $ticket .= '<tr>
            <td style="border-top: 0px;">GSTIN  : ' . $this->setting->gstnoo . '</td>
            </tr>';
        }

        $rrar = strtotime($sale->created_at);
        $rrarf = date("M d,Y", $rrar);

        $rrarfa = "+" . $sale->creddate . "day";

        $rrarfb = date('M d,Y', strtotime($rrarfa, $rrar));




        $ticket .= '</tbody>
        </table></td>';

        $ticket .= '
        <td style="width:44%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
        <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >

 
            
            <td style="width:60%;border-top: 0px;font-size:15px;"><b>Invoice No </b> </td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . $sale->id  . '</td>
            </tr>


             <tr style="background:#89b03e !important;color:#fff;">
            
            <td style="border-top: 0px;font-size:13px;">Amount Due</td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . number_format((float)$sale->total, $this->setting->decimals, '.', '')  . '</td>
            </tr>

           <tr>
            
            <td style="border-top: 0px;font-size:13px;">Invoice Date  </td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . $rrarf  . '</td>
            </tr>

            <tr>
            
            <td style="border-top: 0px;font-size:13px;">Due Date  </td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . $rrarfb  . '</td>
            </tr>

         
      

            </tr>

            

        </tbody>
        </table></td></tr></table><br>';


        $ticket .= '<table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0"  > 
        <tr>
        <td style="width:55%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
        <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0" >
            <tr>
            <td style="border-top: 0px;font-size:13px;color:#333;"><b>Buyer</b></td>
            </tr>';
        if ($sale->clientname) {
            $ticket .= '<tr>
            <td style="border-top: 0px;">' . $sale->clientname . '</td>
            </tr>';
        }
        if ($ccname2) {

            $ticket .= '<tr>
            <td style="border-top: 0px;">' . nl2br($ccname2) . '</td>
            </tr>';
        }
        if ($sale->mobnnm) {

            $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("Phone") . ':' . $sale->mobnnm . '</td>
            </tr>';
        }

        if ($ccname570) {

            $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("GST") . ':' . $ccname570 . '</td>
            </tr>';
        }


        $ticket .= '</tbody>
            </table></td>';

        $ticket .= '
            <td style="width:44%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
            <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;" cellspacing="0" border="0" >
            <tr>
            <td style="border-top: 0px;font-size:13px;color:#333;"><b>Ship To</b></td>
            </tr>';


        if ($ccname569) {

            $ticket .= '<tr>
            <td style="border-top: 0px;">' . nl2br($ccname569) . '</td>
            </tr>';
        }
        if ($sale->mobnnm) {

            $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("Phone") . ':' . $sale->mobnnm . '</td>
            </tr>';
        }

        if ($ccname570) {

            $ticket .= '<tr>
            <td style="border-top: 0px;" >' . label("GST") . ':' . $ccname570 . '</td>
            </tr>';
        }
        $ticket .= '</tbody>
        </table></td></tr></table></div>';



        $PayMethode = explode('~', $sale->paidmethod);


        $ticket .= '<br>';

        $ticket .= '<table class="table" cellspacing="0" border="0" style="margin-bottom: 0px;"><thead>
        <tr style="background:#89b03e !important;color:#fff;font-weight:600;">
           <th style="width:10px;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;padding:8px;">S.No</th>

        <th style="width:60mm;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;padding:8px;">' . label("Product") . ' Description</th>

        <th style="width:15mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;padding:8px;">' . label("HSN") . '</th>
        <th style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;padding:8px;">' . label("GST") . '</th>

       

        <th style="width:10mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;padding:8px;">' . label("Qty") . '</th>
       

        
        
        <th  style="width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;padding:8px;">' . label("Rate") . '</th>
       <th  style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;padding:8px;">' . label("Per") . '</th>

        <th style="text-align:center;width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;border-right: 1px solid #333;padding:8px;border-bottom: 1px solid #333;">' . label("Total") . '</th>
        </tr></thead><tbody>';








        $i = 1;
        $t1 = 0;
        $t2 = 0;
        $t3 = 0;
        $t4 = 0;
        $myrtax  = array();
        $iimyrtax  = array();
        $cgsttax = array();
        $iicgsttax = array();
        $cgsttaxamt = array();
        $iicgsttaxamt = array();
        $sgsttax = array();
        $sgsttaxamt = array();

        $summa = array('summ');
        $iisumma = array('iisumm');

        $cgpa = array('cgp');
        $iicgpa = array('cgp');
        $cgamta = array('cgamt');
        $iicgamta = array('cgamt');

        $sgpa = array('sgp');
        $sgpamta = array('sgpamt');
        $ik3 = 0;

        foreach ($posales as $posale) {


            $kmkm = $this->db->query("select * from sale_items where id='" . $posale->id . "' ")->getRowArray();




            $ik1 = $kmkm['price'] * $kmkm['qt'];
            $ik2 = $kmkm['mrpp'] * $kmkm['qt'];

            $fik3 = $ik2 - $ik1;
            $ik3 = $ik3 + $fik3;
            $myrtax[] = (int)$kmkm['cgst'];
            $iimyrtax[] = (int)$kmkm['igstt'];
            $myrtax[] = (int)$kmkm['sgst'];




            if (in_array($kmkm['cgst'], $cgsttax)) {
                $ll = (int)$kmkm['cgst'];
                $mn = 'cgg_' . $ll;
                $amtt = 'amtgg_' . $ll;
                $cgsta = ($kmkm['subtotal2'] * (int)$kmkm['cgst']) / 100;
                $cgst = $$mn + $cgsta;
                $$mn = $cgst;
            } else {
                $ll = (int)$kmkm['cgst'];
                $mn = 'cgg_' . $ll;
                $cgsttax[] = (int)$kmkm['cgst'];
                $cgst = ($kmkm['subtotal2'] * (int)$kmkm['cgst']) / 100;
                $$mn = $cgst;
            }
            if (in_array($kmkm['sgst'], $sgsttax)) {
                $ol = (int)$kmkm['sgst'];
                $ms = 'sgg_' . $ol;
                $sgsta = ($kmkm['subtotal2'] * (int)$kmkm['sgst']) / 100;
                $sgst = $$ms + $sgsta;
                $$ms = $sgst;
            } else {
                $ol = (int)$kmkm['sgst'];
                $ms = 'sgg_' . $ol;
                $sgsttax[] = (int)$kmkm['sgst'];
                $sgst = (intval($kmkm['subtotal2']) * intval($kmkm['sgst'])) / 100;
                $$ms = $sgst;
            }
            $rvv = (int)$kmkm['cgst'] + (int)$kmkm['sgst'];
            $mrr = $kmkm['mrpp'];





            if (in_array($kmkm['igstt'], $iicgsttax)) {
                $llkg = (int)$kmkm['igstt'];
                $iimn = 'iicgg_' . $llkg;

                $iicgsta = ((int)$kmkm['subtotal2'] * (int)$kmkm['igstt']) / 100;
                $iicgst = $$iimn + $iicgsta;
                $$iimn = $iicgst;
            } else {
                $llkg = (int)$kmkm['igstt'];
                $iimn = 'iicgg_' . $llkg;
                $iicgsttax[] = (int)$kmkm['igstt'];
                $iicgst = ((int)$kmkm['subtotal2'] * (int)$kmkm['igstt']) / 100;
                $$iimn = $iicgst;
            }




            $jtax = (int)$posale->cgst + (int)$posale->sgst;
            $omzz = $this->db->query("select id,unit,hsn  from products where id='" . $posale->product_id . "' ")->getRowArray();

            $ccnn = ((int)$posale->cgst * (int)$posale->price * (int)$posale->qt) / 100;
            $t1 = $t1 + $ccnn;
            $ynn = ((int)$posale->sgst * (int)$posale->price * (int)$posale->qt) / 100;
            $t2 = $t2 + $ynn;
            $kkmm = (int)$posale->qt * (int)$posale->price;
            $t3 = $t3 + $kkmm;
            $totot = $ynn + $ccnn + ((int)$posale->qt * (int)$posale->price);
            $t4 = $t4 + $totot;
            $kmmmk = ($sale->discount * $sale->subtotal) / 100;

            if ($posale->cgst > 0) {
                $ovtax = $posale->cgst;
            } else {
                $ovtax = $posale->igstt;
            }



            $ticket .= '
            <tr>
             <td style="border-top: 0px solid #ddd;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;text-align: center;" >' . $i . '</td>

            <td style="border-top: 0px solid #333;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $posale->name . '</td>
            <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $omzz['hsn'] . '</td>

            <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $ovtax . '%</td>
            <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $posale->qt . '</td>


            <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' .  number_format((float)$posale->price, $this->setting->decimals, '.', '') . '</td>

            <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' .  $omzz['unit'] . '</td>

            <td style="text-align: right;border-left: 1px solid #333;border-right: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' . number_format((float)($posale->qt * $posale->price), $this->setting->decimals, '.', '') . ' </td>
           

            
            </tr>';


            $i++;
        }

        $bcs = 'code128';
        $height = 20;
        $width = 3;

        $ticket .= '

         <tr>

            
            <td colspan="4" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;border-right: 1px solid #333;" ><b>' . label("Total QTY") . '</b></td>
            

            <td  style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;text-align:right;" >' . $sale->totalitems . '</td>
            

            <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;"><b>' . label("Total") . '</b></td>
            
            

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float)$sale->subtotal, $this->setting->decimals, '.', '') . '</td>
           

            
            </tr>

            ';

        $ticket .= '
        



          <tr class="ooooo">
            
            <td colspan="4" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;" ></b></td>
            

            <td style="padding:3px;border-left: 0px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;" ></td>
            

            <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">Discount 
            
            </td>
            
            

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->discount_indujul + $sale->discountamount), $this->setting->decimals, '.', '') . '</td>
           

            
            </tr>


            ';

        if (intval($sale->disamtssh))
            $ticket .= '


         <tr class="yyyyy">
            
            <td colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></b></td>
            

            <td  colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">Shipping
            </td>
            
            <td  style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->disamtssh), $this->setting->decimals, '.', '') . '</td>
           
            </tr>


            ';


        $numberkkr = $sale->total;

        $decimalkkr = round($numberkkr - ($no = floor($numberkkr)), 2) * 100;
        $hundred = null;
        $digits_length = strlen($no);
        $i = 0;
        $str = array();
        $words = array(
            0 => '',
            1 => 'one',
            2 => 'two',
            3 => 'three',
            4 => 'four',
            5 => 'five',
            6 => 'six',
            7 => 'seven',
            8 => 'eight',
            9 => 'nine',
            10 => 'ten',
            11 => 'eleven',
            12 => 'twelve',
            13 => 'thirteen',
            14 => 'fourteen',
            15 => 'fifteen',
            16 => 'sixteen',
            17 => 'seventeen',
            18 => 'eighteen',
            19 => 'nineteen',
            20 => 'twenty',
            30 => 'thirty',
            40 => 'forty',
            50 => 'fifty',
            60 => 'sixty',
            70 => 'seventy',
            80 => 'eighty',
            90 => 'ninety'
        );
        $digits = array('', 'hundred', 'thousand', 'lakh', 'crore');
        while ($i < $digits_length) {
            $divider = ($i == 2) ? 10 : 100;
            $numberkkr = floor($no % $divider);
            $no = floor($no / $divider);
            $i += $divider == 10 ? 1 : 2;
            if ($numberkkr) {
                $plural = (($counter = count($str)) && $numberkkr > 9) ? 's' : null;
                $hundred = ($counter == 1 && $str[0]) ? ' and ' : null;
                $str[] = ($numberkkr < 21) ? $words[$numberkkr] . ' ' . $digits[$counter] . $plural . ' ' . $hundred : $words[floor($numberkkr / 10) * 10] . ' ' . $words[$numberkkr % 10] . ' ' . $digits[$counter] . $plural . ' ' . $hundred;
            } else $str[] = null;
        }
        $Rupees = implode('', array_reverse($str));
        $paise = ($decimalkkr) ? "." . ($words[$decimalkkr / 10] . " " . $words[$decimalkkr % 10]) . ' Paise' : '';



        $yhh = ucwords($Rupees) . ' Rupees Only';


        $ticket .= '<tr>
            
            <td colspan="5" style="padding:3px;text-align:left; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>
            

            <td colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;"><b>Grand Total</b></td>
           
            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;"><b>' . number_format((float)$sale->total, $this->setting->decimals, '.', '') . '</b></td>
           
            </tr>';



        $lmoxx = $this->db->query("select * from sales where id='" . $sale->id . "'  order by id desc ")->getRowArray();
        $lkson = $sale->total - $lmoxx['paid'];
        $rrr = $lmoxx['recivamt'];
        $bbb = $lmoxx['ballamtt'];
        $lmqqq = $this->db->query("select * from payements where sale_id='" . $sale->id . "' and paidmethod=4 order by id desc ");

        if ($PayMethode[0] == 2) {

            $ticket .= '
            <tr>            
            <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

            <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("CreditCard") . ' (xxxx xxxx xxxx ' . substr($PayMethode[1], -4) . ')<br>' . label("CreditCardHold") . '-' . substr($PayMethode[2], 0, 8) . '</td>

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float)$sale->paid, $this->setting->decimals, '.', '') . '</td>
            </tr>
            ';
        } else if ($PayMethode[0] == 1) {
            $ticket .= '<tr>            
            <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

            <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Paid") . ' (' . label("Cash") . ')</td>

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float)$sale->paid, $this->setting->decimals, '.', '') . '</td>
            </tr>';
        } else {

            $pp_mm = $this->db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' ")->getRowArray();
            $ticket .= '<tr>            
            <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

            <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . (isset($pp_mm['name']) ? (isset($pp_mm['name']) ? $pp_mm['name'] : '') : '') . '<br> Ref No..' . $PayMethode[1] . '</td>

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">&nbsp;</td>
            </tr>';
        }
        if ($sale->lalamt > 0) {

            $ticket .= '<tr>            
            <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

            <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Exchange") . '(Ret ID:' . $sale->lalid . ' )</td>

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float)$sale->paid, $this->setting->decimals, '.', '') . '</td>
            </tr>';

            $ticket .= '<tr>            
            <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

            <td   colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Exchange") . '  ' . $PayMethode[1] . '</td>

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float)$sale->lalamt, $this->setting->decimals, '.', '') . '</td>
            </tr>';
        }

        $ticket .= '
                <tr>            
            <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

            <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Receivedamount") . ' </td>

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float)$rrr, $this->setting->decimals, '.', '') . '</td>
            </tr>



            <tr>            
            <td  colspan="5" style="padding:3px;text-align:left; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;border-bottom:1px solid #333;" ><b>' . $yhh . '</b></td>        

            <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;border-bottom:1px solid #333;">' . label("Balanceamt") . ' </td>

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-bottom:1px solid #333;border-right: 1px solid #333;">' . number_format((float)$bbb, $this->setting->decimals, '.', '') . '</td>
            </tr>


            ';

        $ticket .= '</tbody></table>
          <br>';

        $lxzmm = $this->db->query("select * from settings where id=1 ")->getRowArray();
        if ($lxzmm['gst_tax'] == 1) {
            if ($sale->kms == 1) {

                $ticket .= '<table width="60%"  >

            <tr>            
            <td style="padding: 3px;text-align:left;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" ><b>Tax Name</b></td>        
            <td style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" ><b>%</b></td>
            <td  style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;"><b>Amt</b></td>

            <td style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;"><b>Total</b></td>
            </tr>
            ';


                $oklzw = $this->db->query("select * from tax_summary where salesid='" . $id . "' ")->getResultArray();
                foreach ($oklzw as $oklzwf) {

                    $ticket .= '
            <tr>            
            <td style="padding: 3px;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" >' . $oklzwf['taxname'] . '</td>        
            <td style=" padding: 3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" >' . number_format((float)@$oklzwf['taxpercent'], $this->setting->decimals, '.', '') . '</td>
            <td  style="padding: 3px;text-align:right;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;">' . number_format((float)@$oklzwf['taxamount'], $this->setting->decimals, '.', '')    . '</td>

            <td style="padding: 3px;text-align:right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;">' . number_format((float)@$oklzwf['taxfrom'], $this->setting->decimals, '.', '') . '</td>
            </tr>


            ';
                }
            }
            $ticket .= '</table>';
        }

        $ticket .= '

            <table class="table" style="margin-bottom:0px; width:100%;margin-top:1px;border: 1px solid #333;padding:10px;" cellspacing="0" border="0"  > 
            <tr style="border: 0px solid #ddd;">

            <td style="width:15%;border-top: 0px solid #ddd;padding: 0px;border-right: 1px solid #333;padding:3px;">
            <span >Customer Seal & Sign</span></td>


            <td style="width:30%;border-top: 0px solid #ddd;padding: 0px;">

            <table class="table" style="width:100%;margin-top:1px;margin-bottom: 1px;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >
                    
                    
                        <tr>
                        <td style="border-top: 0px;padding-left:5px;"><b>Terms & conditions </b>: <br>' . $this->setting->declaration . '</td>
                        </tr>
            </table></td>
            <td style="width:25%;border-top: 0px solid #ddd;border-left: 1px solid #333;padding: 0px;">
            <table class="table" style="width:100%;margin-bottom: 1px;margin-top:1px;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >

            <tr >
             <td style="border-top: 0px;padding-left:5px;">Bank</td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->bbank . '</td>
            </tr>

           <tr>
            
            <td style="border-top: 0px;padding-left:5px;">Acc No  </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->aaco . '</td>
            </tr> <tr>
            
            <td style="border-top: 0px;padding-left:5px;">IFS   </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->iifs . '</td>
            </tr>
             <tr>

             <td style="border-top: 0px;padding-left:5px;">Branch  </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->bbranch . '</td>
            </tr>
             <tr>

             <td style="border-top: 0px;padding-left:5px;">Pan  </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $this->setting->pann . '</td>
            </tr>
            </tr>
            </tbody>
            </table></td>


            <td style="width:30%;border-top: 0px solid #ddd;padding: 0px;border-left: 1px solid #333;padding:3px;">
            For ' . ucwords($this->setting->companyname) . '</td>

            </tr></table>

            ';


        $ticket .= '<table style="margin-top:20px;" class="table" cellspacing="0" border="0" >
 
            <tr><td colspan="2" style="text-align:center;border: 0px solid #fff;background-color: white;padding:0px;">

          ' . $this->setting->receiptfooter . '
          </td>

          </tr>
          
          </table></div>
          ';



        echo $ticket;
        die;
    }
    public function showInvoice4($id)
    {
        $saleModel = new SaleModel();
        $saleItemModel = new SaleItemModel();
        $customerModel = new CustomerModel();
        $productModel = new ProductModel();
        $registerModel = new RegisterModel();
        $storeModel = new StoreModel();
        $settingModel = new SettingModel();
        $db = \Config\Database::connect();

        $sale = $saleModel->find($id);
        $posales = $saleItemModel->where('sale_id', $id)->findAll();
        $client = $customerModel->find($sale['client_id']);
        $register = $registerModel->find($sale['register_id']);
        $store = $storeModel->find($register['store_id']);
        $setting = $settingModel->first();

        $clientData = $client ? [
            'name' => $client['name'],
            'phone' => $client['phone'],
            'email' => $client['email'],
            'address' => $client['customeraddress'],
            'shipping' => $client['shppingad'],
            'gstno' => $client['gstno']
        ] : null;

        $taxSummary = $db->table('tax_summary')->where('salesid', $id)->get()->getResultArray();

        $settings = [
            'logo' => $setting['logo'],
            'gstnoo' => $setting['gstnoo'],
            'declaration' => $setting['declaration'],
            'bbank' => $setting['bbank'],
            'aaco' => $setting['aaco'],
            'iifs' => $setting['iifs'],
            'bbranch' => $setting['bbranch'],
            'pann' => $setting['pann'],
            'companyname' => $setting['companyname'],
            'receiptfooter' => $setting['receiptfooter'],
            'decimals' => $setting['decimals']
        ];

        $data = [
            'sale' => $sale,
            'posales' => $posales,
            'client' => $clientData,
            'store' => $store,
            'setting' => $settings,
            'taxSummary' => $taxSummary
        ];

        return view('invoices/show_invoice4', $data);
    }
}
