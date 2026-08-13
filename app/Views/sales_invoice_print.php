<?php

foreach ($posales as $posale) {

    $kmll = $db->query("SELECT * from products where id='" . $posale->product_id . "' ")->getRowArray();
    if ($setting->gst_tax == 1) {
        $cgst = $kmll['tax'];
        $sgst = $kmll['sgst'];
        $gst = intval($cgst) + intval($sgst);
    } else {
        $cgst = 0;
        $sgst = 0;
        $gst = 0;
    }


    $lxm11 = $db->query("SELECT * from settings where id=1 ")->getRowArray();

    if (isset($lxm11['disc_pro']) && $lxm11['disc_pro'] == 1) {
        $vper = $this->session->userdata('dper_' . $posale->id);
        if ($vper > 0) {
            $vper = $this->session->userdata('dper_' . $posale->id);
        } else {
            $vper = 0;
        }

        $vamt = $this->session->userdata('tper_' . $posale->id);
        if ($vamt > 0) {
            $vamt = $this->session->userdata('tper_' . $posale->id);
        } else {
            $vamt = 0;
        }
    } else {
        $vper = 0;
        $vamt = 0;
    }




    $nwtc = intval($posale->price) * intval($posale->qt);
    $peral = $sssd != 0 ? (100 * $sssd) / $sssb : 0; //persantage

    $nwtcf = intval($nwtc) - intval(intval($nwtc) * intval($peral)) / 100; //persantage



    mysql_query("insert into stock_transfer(llvel,rrack,peritemid,war_id,store_id,pro_id,qty,tyoftrans,date,bywhom,perselphy_ids,totamt) 
    values(1,1,'" . $posale->purid . "',0,'" . $storeid . "','" . $posale->product_id . "','" . $posale->qt . "','2','" . $kmddwe . "','" . $tyhcrr . "','0','" . $nwtcf . "')  ");




    if (isset($kmll['taxmethod']) && $kmll['taxmethod'] > 0) {
        $sinmn = intval($kmll['price']) * intval($posale->qt);
    } else {
        $tyui = 1 + ($gst / 100);
        $tyuif = round($kmll['price'] / $tyui, 2);
        $sinmn = intval($tyuif) * intval($posale->qt);
    }

    $luip = $db->query("select * from customers where id='" . $custidkk . "' ")->getRowArray();
    $ccname1 = $taname;
    $ccname3 = $tycvzz;
    if ($custidkk > 0) {
        $ccname2 = $luip['customeraddress'];
        $ccname569 = $luip['shppingad'];
        $ccname570 = $luip['gstno'];
    } else {
        $ccname2 = "";
        $ccname569 = "";
        $ccname570 = "";
    }



    // if (isset($lxm11['mystate']) && isset($luip['custstate']) && $lxm11['mystate'] == $luip['custstate'] || $custidkk == 0 || $custidkk == '') {
    if (isset($lxm11['mystate']) && isset($luip['custstate']) && $lxm11['mystate'] == $luip['custstate'] || $custidkk == 0 || $custidkk == '') {
        $data = array(
            "product_id" => $posale->product_id,
            "name" => $posale->name,
            "price" => $posale->price,
            "qt" => $posale->qt,
            "subtotal" => $posale->qt * $posale->price,
            "sale_id" => $sale->id,
            "store_irrdd" => $storeid,
            "cgst" => $cgst,
            "sgst" => $sgst,
            "igstt" => 0,
            "date" => $date,
            "dis_per" => $vper,
            "dis_amt" => $vamt,
            "perprice" => $kmll['cost'],
            "mrpp" => $kmll['rrate'],
            "subtotal2" => $sinmn,
            "tottax" => $gst
        );

        $ddata = array(
            "product_id" => $posale->product_id,
            "name" => $posale->name,
            "price" => $posale->price,
            "qt" => $posale->qt,
            "subtotal" => $posale->qt * $posale->price,
            "sale_id" => isset($dsale->id) ? $dsale->id : 0,
            "store_irrdd" => $storeid,
            "cgst" => $cgst,
            "sgst" => $sgst,
            "igstt" => 0,
            "date" => $date,
            "dis_per" => $vper,
            "dis_amt" => $vamt,
            "perprice" => $kmll['cost'],
            "mrpp" => $kmll['rrate'],
            "subtotal2" => $sinmn,
            "tottax" => $gst
        );
    } else {
        $data = array(
            "product_id" => $posale->product_id,
            "name" => $posale->name,
            "price" => $posale->price,
            "qt" => $posale->qt,
            "subtotal" => $posale->qt * $posale->price,
            "sale_id" => $sale->id,
            "store_irrdd" => $storeid,
            "cgst" => 0,
            "sgst" => 0,
            "igstt" => $kmll['igst'],
            "date" => $date,
            "dis_per" => $vper,
            "dis_amt" => $vamt,
            "perprice" => $kmll['cost'],
            "mrpp" => $kmll['rrate'],
            "subtotal2" => $sinmn,
            "tottax" => 0
        );

        $ddata = array(
            "product_id" => $posale->product_id,
            "name" => $posale->name,
            "price" => $posale->price,
            "qt" => $posale->qt,
            "subtotal" => $posale->qt * $posale->price,
            "sale_id" => $dsale->id,
            "store_irrdd" => $storeid,
            "cgst" => 0,
            "sgst" => 0,
            "igstt" => $kmll['igst'],
            "date" => $date,
            "dis_per" => $vper,
            "dis_amt" => $vamt,
            "perprice" => $kmll['cost'],
            "mrpp" => $kmll['rrate'],
            "subtotal2" => $sinmn,
            "tottax" => 0
        );
    }



    $number = $posale->number;
    $register = Register::find($this->register);
    $prod = Product::find($posale->product_id);




    if ($prod->combo_id > 0) {

        $dif_ttask = mysql_query("select * from purchase_items_combo where purchase_id='" . $prod->combo_id . "'  ");
        while ($dif_ttaskf = mysqli_fetch_array($dif_ttask)) {
            $posale_product_id = $dif_ttaskf['product_id'];
            $solldd = $dif_ttaskf['qt'] * $posale->qt;


            $stock = Stock::find(array('store_id' => $register->store_id, 'product_id' => $dif_ttaskf['product_id']));

            if (!isset($stock->id)) {
                $this->db->query("insert into stocks set
 
product_id='" . $posale->product_id . "',
type=0,
store_id='" . $register->store_id . "',
warehouse_id=0,
quantity=0,
price=0,
puritem_id=0,
datte='" . date("Y-m-d") . "' ");

                $ssiddd = $this->db->insert_id();
            }

            $stock = Stock::find(array('store_id' => $register->store_id, 'product_id' => $posale->product_id));


            $avlll = $stock->quantity - $solldd;
            if ($avlll < 0) {
                $avlll = 0;
            }


            mysql_query("update stocks set quantity='" . $avlll . "' where id='" . $stock->id . "'  ");
        }
    } else {
        $stock = Stock::find(array('store_id' => $register->store_id, 'product_id' => $posale->product_id));

        if (!isset($stock->id)) {
            mysql_query("insert into stocks set
 
product_id='" . $posale->product_id . "',
type=0,
store_id='" . $register->store_id . "',
warehouse_id=0,
quantity=0,
price=0,
puritem_id=0,
datte='" . date("Y-m-d") . "' ");

            $ssiddd = mysql_insert_id();
        }

        $stock = Stock::find(array('store_id' => $register->store_id, 'product_id' => $posale->product_id));
        $avlll = $stock->quantity - $posale->qt;
        if ($avlll < 0) {
            $avlll = 0;
        }
        mysql_query("update stocks set quantity='" . $avlll . "' where id='" . $stock->id . "'  ");
    }



    $pos = Sale_item::create($data);
    if ($themblock == 1) {
        $dpos_id = Dsale_item::create($ddata);
        $dpos = Dsale_item::find($dpos_id);
    }
}



$myrtax = array();
$iimyrtax = array();
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
$mstoe = $this->session->userdata('store');

$mstoef = $db->query("select * from stores where id='" . $mstoe . "' ")->getRowArray();

if ($lxm11['printersizew'] == "1") {

    $ticket = '<h2 style="text-align:center;margin-bottom:-15px;">TAX INVOICE </h2> <div style="width:210mm;font-size:10px;margin-top:1px;margin-left: -10px;padding:30px;" >';

    $ticket .= '<div style="border: 1px solid #333;padding:3px;">
  <table class="table" style="width:100%;border-top: 0px solid #333;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;margin-top:30px;" cellspacing="0" border="0"  > 
  <tr>
  <td style="width:55%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">
  <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >
            <tr>
            <td style="border-top: 0px;font-size:15px;color:#333;"><img src="' . base_url() . '/files/Setting/' . $setting->logo . '" alt="logo" style="max-height: 45px; "></td>
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

    if ($setting->gstnoo) {
        $ticket .= '<tr>
            <td style="border-top: 0px;">GSTIN  : ' . $setting->gstnoo . '</td>
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
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . $ttrrt . '</td>
            </tr>
             <tr style="background:#89b03e !important;color:#fff;">
            <td style="border-top: 0px;font-size:13px;">Amount Due</td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . number_format((float) $sale->total, $setting->decimals, '.', '') . '</td>
            </tr>
           <tr>
            <td style="border-top: 0px;font-size:13px;">Invoice Date  </td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . $rrarf . '</td>
            </tr>
            <tr>
            <td style="border-top: 0px;font-size:13px;">Due Date  </td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . $rrarfb . '</td>
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
           <th style="width:10px;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;">S.No</th>

        <th style="width:60mm;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;">' . label("Product") . ' Description</th>

        <th style="width:15mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("HSN") . '</th>
        <th style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("GST") . '</th>

       

        <th style="width:10mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("Qty") . '</th>
       

        
        
        <th  style="width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("Rate") . '</th>
       <th  style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("Per") . '</th>

        <th style="text-align:center;width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;">' . label("Total") . '</th>
        </tr></thead><tbody>';












    $i = 1;
    $vamttt = 0;
    $tkmx45 = 0;
    $mkm = 0;
    $cgst = 0;
    $cgsta = 0;
    foreach ($posales as $posale) {

        $mkm++;
        $kmkm = $db->query("select * from products where id='" . $posale->product_id . "' ")->getRowArray();


        if ($txcvukp == 1) {
            $ovtax = $kmkm['tax'];
        } else {
            $ovtax = $kmkm['igst'];
        }
        $tymsk = $ovtax;
        $tymsk1 = ($tymsk / 100) + 1;


        $rtcc = round($posale->price / $tymsk1, 2); //10
        if ($kmkm['combo_id'] > 0) {


            $dif_ttask = mysql_query("select * from purchase_items_combo where purchase_id='" . $kmkm['combo_id'] . "'  ");
            while ($dif_ttaskf = mysqli_fetch_array($dif_ttask)) {
                $posale_product_id = $dif_ttaskf['product_id'];


                $ovtax = $dif_ttaskf['cgst'];
                $rtcc = 0;
                $tymsk = $ovtax;
                $tymsk1 = ($tymsk / 100) + 1;


                $act_price = $dif_ttaskf['subtot'] / $dif_ttaskf['qt'];
                $rtcc = round($act_price / $tymsk1, 2);


                $yrq = mysql_query("select * from taxprolist where proid='" . $posale_product_id . "' ");
                while ($yrqf = mysqli_fetch_array($yrq)) {


                    $myrtax[] = $yrqf['taxid'];

                    if (in_array($yrqf['taxid'], $cgsttax)) //tax id
                    {

                        $ll = $yrqf['taxid'];
                        $mn = 'cgg_' . $ll;
                        $cgsta = ($rtcc * $dif_ttaskf['qt'] * $posale->qt * $yrqf['taxamount']) / 100;
                        $cgst = $$mn + $cgsta;
                        $$mn = $cgst;
                    } else {
                        $ll = $yrqf['taxid']; //taxid
                        $mn = 'cgg_' . $ll;
                        $cgsttax[] = $yrqf['taxid'];
                        $cgst = ($rtcc * $dif_ttaskf['qt'] * $posale->qt * $yrqf['taxamount']) / 100; //10*1*6/100=.6
                        $$mn = $cgst;
                    }
                }
            }
        } else {

            $yrq = mysql_query("select * from taxprolist where proid='" . $posale->product_id . "' ");
            while ($yrqf = mysqli_fetch_array($yrq)) {


                $myrtax[] = $yrqf['taxid'];

                if (in_array($yrqf['taxid'], $cgsttax)) //tax id
                {

                    $ll = $yrqf['taxid'];
                    $mn = 'cgg_' . $ll;
                    $cgsta = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100;
                    $cgst = $$mn + $cgsta;
                    $$mn = $cgst;
                } else {
                    $ll = $yrqf['taxid']; //taxid
                    $mn = 'cgg_' . $ll;
                    $cgsttax[] = $yrqf['taxid'];
                    $cgst = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100; //10*1*6/100=.6
                    $$mn = $cgst;
                }
            }
        }













        $vper = $this->session->userdata('dper_' . $posale->id);
        $vamt = $this->session->userdata('tper_' . $posale->id);
        $totaltaxg = intval($kmkm['tax']) + intval($kmkm['sgst']);




        $tkmx1 = intval($kmkm['rrate']) * $posale->qt;
        $tkmx2 = $posale->price * $posale->qt;
        $tkmx3 = $tkmx1 - $tkmx2;
        $tkmx45 = $tkmx3 + $tkmx45;




        $ticket .= '
            <tr>
             <td style="border-top: 0px solid #ddd;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;text-align: center;" >' . $i . '</td>

            <td style="border-top: 0px solid #333;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $posale->name . '</td>
    <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $kmkm['hsn'] . '</td>

   <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $ovtax . '%</td>
    <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $posale->qt . '</td>


       <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' . number_format((float) $posale->price, $setting->decimals, '.', '') . '</td>

    <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' . $kmkm['unit'] . '</td>

    <td style="text-align: right;border-left: 1px solid #333;border-right: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' . number_format((float) ($posale->qt * $posale->price), $setting->decimals, '.', '') . ' </td>
           

            
            </tr>';
        $vamttt = is_numeric($vamt) ? intval($vamt) + intval($vamttt) : 0;
        $i++;
    }


    for ($xsx = $i; $xsx < 18; $xsx++) {

        $ticket .= '
            <tr>
            <td style="border-top: 0px solid #ddd;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >&nbsp;</td>
            <td style="border-top: 0px solid #ddd;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >&nbsp;</td>
    <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" ></td>
    <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" ></td>
    <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" ></td>


   


    <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;"></td>

    <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;"></td>

    <td style="text-align: right;border-left: 1px solid #333;border-right: 1px solid #333;padding:3px;border-top: 0px solid #ddd;"></td>
           

            
            </tr>';
    }


    $tgbbb = ($sale->subtotal * $sale->discount) / 100;
    $bcs = 'code128';
    $height = 20;
    $width = 3;
    $ticket .= '

         <tr>

            
            <td colspan="4" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;border-right: 1px solid #333;" ><b>' . label("Total QTY") . '</b></td>
            

            <td  style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;text-align:right;" >' . $sale->totalitems . '</td>
            

            <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;"><b>' . label("Total") . '</b></td>
            
            

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->subtotal, $setting->decimals, '.', '') . '</td>
           

            
            </tr>

';

    if ($setting->disc_all == 1) {
        $ticket .= '
        



          <tr class="ooooo">
            
            <td colspan="4" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;" ></b></td>
            

            <td style="padding:3px;border-left: 0px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;" ></td>
            

            <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">Discount';
        if (intval($sale->discount))

            $ticket .= '( ' . $sale->discount . ' % )';

        $ticket .= '
            </td>
            
            

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->discountamount), $setting->decimals, '.', '') . '</td>
           

            
            </tr>


            ';
    }


    if (intval($sale->disamtssh))
        $ticket .= '



         <tr class="yyyyy">
            
            <td colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></b></td>
            

            
            

            <td  colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">Shipping
            </td>
            
            

            <td  style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->disamtssh), $setting->decimals, '.', '') . '</td>
           

            
            </tr>


            ';



    if ($setting->disc_pro == 1) {
        $ticket .= '
             <tr class="dddss">
            
            <td colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></b></td>
            

            
            

            <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">' . label("Discount") . '</td>
            
            

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->discount_indujul), $setting->decimals, '.', '') . '</td>
           

            
            </tr>

           ';
    }

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
        } else
            $str[] = null;
    }
    $Rupees = implode('', array_reverse($str));
    $paise = ($decimalkkr) ? "." . ($words[$decimalkkr / 10] . " " . $words[$decimalkkr % 10]) . ' Paise' : '';



    $yhh = ucwords($Rupees) . ' Rupees Only';

    $ticket .= '<tr>
            
            <td colspan="5" style="padding:3px;text-align:left; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>
            

          
            

            <td colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;"><b>Grand Total</b></td>
            
            

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;"><b>' . number_format((float) $sale->total, $setting->decimals, '.', '') . '</b></td>
           

            
            </tr>


            ';

    $lmoxx = $db->query("select * from sales where id='" . $sale->id . "'  order by id desc ")->getRowArray();
    $lkson = $sale->total - $lmoxx['paid'];
    $rrr = $lmoxx['recivamt'];
    $bbb = $lmoxx['ballamtt'];


    $ticket .= '<tr>            
            <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

            <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Paid") . ' (' . label("Cash") . ')</td>

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $rrr, $setting->decimals, '.', '') . '</td>
            </tr>';


    $lmqqq = $db->query("select * from payements where sale_id='" . $sale->id . "' and paidmethod=4 order by id desc ")->getRowArray();

    if ($PayMethode[0] == 2) {


        $ticket .= '
               <tr>            
                <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("CreditCard") . ' <br> Ref No.' . $PayMethode[3] . ' <br>' . $PayMethode[2] . '<br> xxxx ' . substr($PayMethode[1], -4) . '</td>

                <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->recivamt2, $setting->decimals, '.', '') . '</td>
                </tr>
                ';
    } else if ($PayMethode[0] > 2) {
        $pp_mm = $db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' ")->getRowArray();

        $ticket .= '<tr>            
                    <td   colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                    <td   colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . $pp_mm['name'] . ' <br> Ref No.' . $PayMethode[1] . '</td>

                    <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->recivamt2), $setting->decimals, '.', '') . '</td>
                    </tr>
                    ';
    }









    if ($sale->lalamt > 0) {
        $ticket .= '<tr>            
                <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;"><b>' . label("Exchange") . '(Ret ID:' . $sale->lalid . ' )<b></td>

                <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->paid, $setting->decimals, '.', '') . '</td>
                </tr>';


        $ticket .= '<tr>            
                    <td    style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" >Item</td> 
                    <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">QTY</td>
                    </tr>';
        $ret_items = mysql_query("select retunn_items.*,products.name as pname from retunn_items 
                        left join returnss on returnss.re_sales_id=retunn_items.ret_id
                        left join products on products.id=retunn_items.prodd_ids  where re_sales_id='" . $sale->id . "' and rsale_type='" . $themblock . "'  ");
        while ($ret_itemsf = mysqli_fetch_array($ret_items)) {
            $ticket .= '<tr>            
                    <td    style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" >' . $ret_itemsf['pname'] . '</td> 
                    <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . $ret_itemsf['sl_newqt'] . '</td>
                    </tr>';
        }


        $ticket .= '<tr>            
                        <td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

                        <td   colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Exchange") . '  ' . $PayMethode[1] . '</td>

                        <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->lalamt, $setting->decimals, '.', '') . '</td>
                        </tr>';
    }

    $ticket .= '<tr>            
            <td  colspan="5" style="padding:3px;text-align:left; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;border-bottom:1px solid #333;" ><b>' . $yhh . '</b></td>        

            <td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;border-bottom:1px solid #333;">' . label("Balanceamt") . ' </td>

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-bottom:1px solid #333;border-right: 1px solid #333;">' . number_format((float) $bbb, $setting->decimals, '.', '') . '</td>
            </tr>
            ';

    $ticket .= '</tbody></table>
          <br>';


    if ($setting->gst_tax == 1) {




        if ($kms == 1) {
            $ticket .= '<table width="60%"  >
                        <tr>            
                        <td style="padding: 3px;text-align:left;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" ><b>Tax Name</b></td>        
                        <td style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" ><b>%</b></td>
                        <td  style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;"><b>Amt</b></td>

                        <td style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;"><b>Total</b></td>
                        </tr>
                        ';
        }


        $array = array_values(array_flip(array_flip($myrtax)));



        $myrtaxu = array_unique($array);

        $countb = count($myrtaxu);
        $tax_total = 0;
        for ($kmv = 0; $kmv < $countb; $kmv++) {
            $pop = $myrtaxu[$kmv];
            $lkll = 'cgg_' . $pop;
            $ckll = 'sgg_' . $pop;
            $tax = 0;
            $tax_amount = 0;
            $naray = $db->query("select * from  tax where id='" . $myrtaxu[$kmv] . "' ")->getRowArray();
            if (isset($naray['valueper'])) {
                $tax_amount = round(($sssb / 100) * floatval($naray['valueper']));
            }
            $sss56 = $sssb + $tax_amount;
            // if (@$$lkll > 0) {


            //     $naray = $db->query("select * from  tax where id='" . $myrtaxu[$kmv] . "' "));

            //     $cddd = $myrtaxu[$kmv];
            //     $poo = $naray['valueper'] != 0 && intval($lkll) != 0 ? (intval($lkll) * 100) / floatval($naray['valueper']) : 0;
            // } else {
            //     $cddd = "---";
            //     $poo = '---';
            // }




            // $sss54 = $$lkll;
            // $sss51 = (100 * $sssd) / $sssb; //persantage
            // $sss52 = ($poo * $sss51) / 100; //persantage
            // $sss53 = $poo - $sss52; //poo

            // $sss55 = ($sss54 * $sss51) / 100; //persantage
            // $sss56 = $sss54 - $sss55; //lkll
            $tax_total += $sss56;




            mysql_query("insert into tax_summary(salesid,  taxname, taxpercent,  taxamount, taxfrom, datedd,c_s_i) 
      values('" . $ppp . "','" . $naray['name'] . "','" . $naray['valueper'] . "','" . $sssb . "','" . $tax_amount . "','" . date("Y-m-d") . "','" . $naray['custtype'] . "' ) ");

            mysql_query("insert into dtax_summary(salesid,  taxname, taxpercent,  taxamount, taxfrom, datedd,c_s_i) 
      values('" . $dppp . "','" . $naray['name'] . "','" . $naray['valueper'] . "','" . $sssb . "','" . $tax_amount . "','" . date("Y-m-d") . "','" . $naray['custtype'] . "' ) ");




            if ($kms == 1) {

                $ticket .= '
                            <tr>            
                            <td style="padding: 3px;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" >' . $naray['name'] . '</td>        
                            <td style=" padding: 3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" >' . number_format((float) @$naray['valueper'], $setting->decimals, '.', '') . '</td>
                            <td  style="padding: 3px;text-align:right;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;">' . number_format((float) @$sssb, $setting->decimals, '.', '') . '</td>

                            <td style="padding: 3px;text-align:right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;">' . number_format((float) @$tax_amount, $setting->decimals, '.', '') . '</td>
                            </tr>
                            ';
            }
        }
        $ticket .= '</table>';
    }
} elseif ($lxm11['printersizew'] == "2") {




    $ticket = '<h2 style="text-align:center;margin-bottom:-15px;">TAX INVOICE </h2> 
 <div style="width:148mm;font-size:10px;;margin-top:1px;margin-left:20px;margin:25px auto;padding: 15px;" >';




    $ticket .= '<div style="border: 1px solid #333;padding:3px;">

  <table class="table" style="width:100%;border-top: 0px solid #333;border-bottom: 0px solid #333;border-style: dashed;margin-bottom: 5px;margin-top:30px;" cellspacing="0" border="0"  > 
  <tr>
  <td style="width:55%;border-top: 0px solid #ddd;border-bottom: 0px solid #ddd;">

  <table class="table" style="width:100%;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >
         

            <tr>
            <td style="border-top: 0px;font-size:15px;color:#333;"><img src="' . base_url() . '/files/Setting/' . $setting->logo . '" alt="logo" style="max-height: 45px; "></td>
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

    if ($setting->gstnoo) {
        $ticket .= '<tr>
            <td style="border-top: 0px;">GSTIN  : ' . $setting->gstnoo . '</td>
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
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . $ttrrt . '</td>
            </tr>


             <tr style="background:#89b03e !important;color:#fff;">
            
            <td style="border-top: 0px;font-size:13px;">Amount Due</td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . number_format((float) $sale->total, $setting->decimals, '.', '') . '</td>
            </tr>

           <tr>
            
            <td style="border-top: 0px;font-size:13px;">Invoice Date  </td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . $rrarf . '</td>
            </tr>

            <tr>
            
            <td style="border-top: 0px;font-size:13px;">Due Date  </td>
            <td style="border-top: 0px;font-size:13px;text-align:right;">' . $rrarfb . '</td>
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
           <th style="width:10px;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;">S.No</th>

        <th style="width:60mm;border-top: 1px solid #333;border-left: 1px solid #333;border-bottom: 1px solid #333;">' . label("Product") . ' Description</th>

        <th style="width:15mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("HSN") . '</th>
        <th style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("GST") . '</th>

       

        <th style="width:10mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("Qty") . '</th>
       

        
        
        <th  style="width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("Rate") . '</th>
       <th  style="width:8mm;border-top: 1px solid #333;border-left: 1px solid #333;text-align:center;border-bottom: 1px solid #333;">' . label("Per") . '</th>

        <th style="text-align:center;width:20mm;border-top: 1px solid #333;border-left: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;">' . label("Total") . '</th>
        </tr></thead><tbody>';












    $i = 1;
    $vamttt = 0;
    $tkmx45 = 0;
    $mkm = 0;
    $cgst = 0;
    $cgsta = 0;
    foreach ($posales as $posale) {

        $mkm++;
        $kmkm = $db->query("select * from products where id='" . $posale->product_id . "' ")->getRowArray();


        if ($txcvukp == 1) {
            $ovtax = $kmkm['tax'];
        } else {
            $ovtax = $kmkm['igst'];
        }
        $tymsk = $ovtax;
        $tymsk1 = ($tymsk / 100) + 1;


        $rtcc = round($posale->price / $tymsk1, 2); //10
        if ($kmkm['combo_id'] > 0) {


            $dif_ttask = mysql_query("select * from purchase_items_combo where purchase_id='" . $kmkm['combo_id'] . "'  ");
            while ($dif_ttaskf = mysqli_fetch_array($dif_ttask)) {
                $posale_product_id = $dif_ttaskf['product_id'];


                $ovtax = $dif_ttaskf['cgst'];
                $rtcc = 0;
                $tymsk = $ovtax;
                $tymsk1 = ($tymsk / 100) + 1;


                $act_price = $dif_ttaskf['subtot'] / $dif_ttaskf['qt'];
                $rtcc = round($act_price / $tymsk1, 2);


                $yrq = mysql_query("select * from taxprolist where proid='" . $posale_product_id . "' and custtype='" . $txcvukp . "'  ");
                while ($yrqf = mysqli_fetch_array($yrq)) {


                    $myrtax[] = $yrqf['taxid'];

                    if (in_array($yrqf['taxid'], $cgsttax)) //tax id
                    {

                        $ll = $yrqf['taxid'];
                        $mn = 'cgg_' . $ll;
                        $cgsta = ($rtcc * $dif_ttaskf['qt'] * $posale->qt * $yrqf['taxamount']) / 100;
                        $cgst = $$mn + $cgsta;
                        $$mn = $cgst;
                    } else {
                        $ll = $yrqf['taxid']; //taxid
                        $mn = 'cgg_' . $ll;
                        $cgsttax[] = $yrqf['taxid'];
                        $cgst = ($rtcc * $dif_ttaskf['qt'] * $posale->qt * $yrqf['taxamount']) / 100; //10*1*6/100=.6
                        $$mn = $cgst;
                    }
                }
            }
        } else {

            $yrq = mysql_query("select * from taxprolist where proid='" . $posale->product_id . "' and custtype='" . $txcvukp . "'  ");
            while ($yrqf = mysqli_fetch_array($yrq)) {


                $myrtax[] = $yrqf['taxid'];

                if (in_array($yrqf['taxid'], $cgsttax)) //tax id
                {

                    $ll = $yrqf['taxid'];
                    $mn = 'cgg_' . $ll;
                    $cgsta = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100;
                    $cgst = $$mn + $cgsta;
                    $$mn = $cgst;
                } else {
                    $ll = $yrqf['taxid']; //taxid
                    $mn = 'cgg_' . $ll;
                    $cgsttax[] = $yrqf['taxid'];
                    $cgst = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100; //10*1*6/100=.6
                    $$mn = $cgst;
                }
            }
        }













        $vper = $this->session->userdata('dper_' . $posale->id);
        $vamt = $this->session->userdata('tper_' . $posale->id);
        $totaltaxg = $kmkm['tax'] + $kmkm['sgst'];




        $tkmx1 = $kmkm['rrate'] * $posale->qt;
        $tkmx2 = $posale->price * $posale->qt;
        $tkmx3 = $tkmx1 - $tkmx2;
        $tkmx45 = $tkmx3 + $tkmx45;




        $ticket .= '
            <tr>
             <td style="border-top: 0px solid #ddd;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;text-align: center;" >' . $i . '</td>

            <td style="border-top: 0px solid #333;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $posale->name . '</td>
    <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $kmkm['hsn'] . '</td>

   <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $ovtax . '%</td>
    <td style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;" >' . $posale->qt . '</td>


       <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' . number_format((float) $posale->price, $setting->decimals, '.', '') . '</td>

    <td  style="text-align: right;border-left: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' . $kmkm['unit'] . '</td>

    <td style="text-align: right;border-left: 1px solid #333;border-right: 1px solid #333;padding:3px;border-top: 0px solid #ddd;">' . number_format((float) ($posale->qt * $posale->price), $setting->decimals, '.', '') . ' </td>
           

            
            </tr>';
        $vamttt = $vamt + $vamttt;
        $i++;
    }



    $tgbbb = ($sale->subtotal * $sale->discount) / 100;
    $bcs = 'code128';
    $height = 20;
    $width = 3;
    $ticket .= '

         <tr>

            
            <td colspan="4" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;border-right: 1px solid #333;" ><b>' . label("Total QTY") . '</b></td>
            

            <td  style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;text-align:right;" >' . $sale->totalitems . '</td>
            

            <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;"><b>' . label("Total") . '</b></td>
            
            

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->subtotal, $setting->decimals, '.', '') . '</td>
           

            
            </tr>

';

    if ($setting->disc_all == 1) {
        $ticket .= '
        



          <tr class="ooooo">
            
            <td colspan="4" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;" ></b></td>
            

            <td style="padding:3px;border-left: 0px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;" ></td>
            

            <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">Discount';
        if (intval($sale->discount))

            $ticket .= '( ' . $sale->discount . ' % )';

        $ticket .= '
            </td>
            
            

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->discountamount), $setting->decimals, '.', '') . '</td>
           

            
            </tr>


            ';
    }


    if (intval($sale->disamtssh))
        $ticket .= '



         <tr class="yyyyy">
            
            <td colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></b></td>
            

            
            

            <td  colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">Shipping
            </td>
            
            

            <td  style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->disamtssh), $setting->decimals, '.', '') . '</td>
           

            
            </tr>


            ';



    if ($setting->disc_pro == 1) {
        $ticket .= '
             <tr class="dddss">
            
            <td colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></b></td>
            

            
            

            <td colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;">' . label("Discount") . '</td>
            
            

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->discount_indujul), $setting->decimals, '.', '') . '</td>
           

            
            </tr>

           ';
    }

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
        } else
            $str[] = null;
    }
    $Rupees = implode('', array_reverse($str));
    $paise = ($decimalkkr) ? "." . ($words[$decimalkkr / 10] . " " . $words[$decimalkkr % 10]) . ' Paise' : '';



    $yhh = ucwords($Rupees) . ' Rupees Only';

    $ticket .= '<tr>
            
            <td colspan="5" style="padding:3px;text-align:left; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>
            

          
            

            <td colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 0px solid #333;"><b>Grand Total</b></td>
            
            

            <td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;"><b>' . number_format((float) $sale->total, $setting->decimals, '.', '') . '</b></td>
           

            
            </tr>


            ';

    $lmoxx = $db->query("select * from sales where id='" . $sale->id . "'  order by id desc ")->getRowArray();
    $lkson = $sale->total - $lmoxx['paid'];
    $rrr = $lmoxx['recivamt'];
    $bbb = $lmoxx['ballamtt'];


    $ticket .= '<tr>            
<td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

<td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Paid") . ' (' . label("Cash") . ')</td>

<td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $rrr, $setting->decimals, '.', '') . '</td>
</tr>';





    $lmqqq = $db->query("select * from payements where sale_id='" . $sale->id . "' and paidmethod=4 order by id desc ")->getRowArray();

    if ($PayMethode[0] == 2) {


        $ticket .= '
               <tr>            
<td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

<td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("CreditCard") . ' <br> Ref No.' . $PayMethode[3] . ' <br>' . $PayMethode[2] . '<br> xxxx ' . substr($PayMethode[1], -4) . '</td>

<td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->recivamt2, $setting->decimals, '.', '') . '</td>
</tr>
';
    } else if ($PayMethode[0] > 2) {
        $pp_mm = $db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' ")->getRowArray();

        $ticket .= '<tr>            
<td   colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

<td   colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . $pp_mm['name'] . ' <br> Ref No.' . $PayMethode[1] . '</td>

<td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) ($sale->recivamt2), $setting->decimals, '.', '') . '</td>
</tr>
';
    }









    if ($sale->lalamt > 0) {
        $ticket .= '<tr>            
<td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

<td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Exchange") . '(Ret ID:' . $sale->lalid . ' )</td>

<td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->paid, $setting->decimals, '.', '') . '</td>
</tr>';

        $ticket .= '<tr>            
<td  colspan="5" style="padding:3px;text-align:right; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;" ></td>        

<td   colspan="2" style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;">' . label("Exchange") . '  ' . $PayMethode[1] . '</td>

<td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 1px solid #333;">' . number_format((float) $sale->lalamt, $setting->decimals, '.', '') . '</td>
</tr>';
    }

    $ticket .= '
               




<tr>            
<td  colspan="5" style="padding:3px;text-align:left; border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;border-bottom:1px solid #333;" ><b>' . $yhh . '</b></td>        

<td  colspan="2"  style="padding:3px;border-left: 1px solid #333;border-top: 0px solid #333;border-right: 0px solid #333;border-bottom:1px solid #333;">' . label("Balanceamt") . ' </td>

<td style="padding:3px;text-align: right;border-left: 1px solid #333;border-top: 0px solid #333;border-bottom:1px solid #333;border-right: 1px solid #333;">' . number_format((float) $bbb, $setting->decimals, '.', '') . '</td>
</tr>


 ';









    $ticket .= '</tbody></table>
          <br>';


    if ($setting->gst_tax == 1) {




        if ($kms == 1) {
            $ticket .= '<table width="60%"  >

 <tr>            
<td style="padding: 3px;text-align:left;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" ><b>Tax Name</b></td>        
<td style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" ><b>%</b></td>
<td  style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;"><b>Amt</b></td>

<td style="padding: 3px;text-align:center;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;"><b>Total</b></td>
</tr>
';
        }


        $array = array_values(array_flip(array_flip($myrtax)));



        $myrtaxu = array_unique($array);

        $countb = count($myrtaxu);
        for ($kmv = 0; $kmv < $countb; $kmv++) {
            $pop = $myrtaxu[$kmv];
            $lkll = 'cgg_' . $pop;
            $ckll = 'sgg_' . $pop;
            if (@$$lkll > 0) {


                $naray = $db->query("select * from  tax where id='" . $myrtaxu[$kmv] . "' ")->getRowArray();

                $cddd = $myrtaxu[$kmv];
                $poo = ($$lkll * 100) / $naray['valueper'];
            } else {
                $cddd = "---";
                $poo = '---';
            }



            $sss54 = $$lkll;
            $sss51 = (100 * $sssd) / $sssb; //persantage
            $sss52 = ($poo * $sss51) / 100; //persantage
            $sss53 = $poo - $sss52; //poo

            $sss55 = ($sss54 * $sss51) / 100; //persantage
            $sss56 = $sss54 - $sss55; //lkll




            mysql_query("insert into tax_summary(salesid,  taxname, taxpercent,  taxamount, taxfrom, datedd,c_s_i) 
      values('" . $ppp . "','" . $naray['name'] . "','" . $naray['valueper'] . "','" . $sss53 . "','" . $sss56 . "','" . date("Y-m-d") . "','" . $naray['custtype'] . "' ) ");

            mysql_query("insert into dtax_summary(salesid,  taxname, taxpercent,  taxamount, taxfrom, datedd,c_s_i) 
      values('" . $dppp . "','" . $naray['name'] . "','" . $naray['valueper'] . "','" . $sss53 . "','" . $sss56 . "','" . date("Y-m-d") . "','" . $naray['custtype'] . "' ) ");




            if ($kms == 1) {

                $ticket .= '
      <tr>            
<td style="padding: 3px;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" >' . $naray['name'] . '</td>        
<td style=" padding: 3px;text-align:right; border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;" >' . number_format((float) @$naray['valueper'], $setting->decimals, '.', '') . '</td>
<td  style="padding: 3px;text-align:right;border-left: 1px solid #333;border-top: 1px solid #333;border-bottom: 1px solid #333;">' . number_format((float) @$sss53, $setting->decimals, '.', '') . '</td>

<td style="padding: 3px;text-align:right;border-left: 1px solid #333;border-top: 1px solid #333;border-right: 1px solid #333;border-bottom: 1px solid #333;">' . number_format((float) @$sss56, $setting->decimals, '.', '') . '</td>
</tr>

';
            }
        }
        $ticket .= '</table>';
    }
} elseif ($lxm11['printersizew'] > 2) {

    $print_tb = mysql_fetch_object(mysql_query("select * from print_setup where dp_id='" . $lxm11['printersizew'] . "' "));
    $rfkkkk = $print_tb->dp_pt_width . "mm";
    $olp = "5px";



    $ticket = '<div style="width:' . $rfkkkk . ';font-size:' . $print_tb->font_size_l . 'px;margin-left:' . $print_tb->margin_left . 'px;padding:0px;" >
          <table class="table" cellspacing="0" border="0" style="margin-bottom:8px;"><tbody>';

    if ($print_tb->logo_sh == 1) {

        $ticket .= '<tr><td colspan="6"  style="text-align:' . $print_tb->logo_p . ';border: 0px solid #fff;background-color: white;border: 0px solid #fff;"><img src="' . base_url() . '/files/Setting/' . $setting->logo . '" alt="logo" style="max-height: 25px; "></td></tr>';
    }

    if ($print_tb->reciptheader_sh == 1) {

        $ticket .= '<tr><td  colspan="6"  style="text-align:' . $print_tb->reciptheader_p . ';border: 0px solid #fff;background-color: white;border: 0px solid #fff;">' . $setting->receiptheader . '</td></tr>';
    }


    if ($print_tb->companyname_sh == 1) {
        $ticket .= ' <tr><td colspan="6"  style="text-align:' . $print_tb->companyname_p . ';border: 0px solid #fff;background-color: white;font-size:' . $print_tb->font_size_b . 'px;"><b>' . $mstoef['name'] . '</b></td></tr>';
    }


    if ($print_tb->address_sh == 1) {

        $ticket .= '<tr><td colspan="6"  style="text-align:' . $print_tb->address_p . ';border: 0px solid #fff;background-color: white;">' . $mstoef['adresse'] . '</td></tr>';
        $ticket .= '<tr><td colspan="6" style="text-align:' . $print_tb->address_p . ';border: 0px solid #fff;background-color: white;">' . $mstoef['city'] . ',' . $mstoef['phone'] . '</td></tr>';
    }

    if ($print_tb->gst_sh == 1) {
        $ticket .= '<tr><td  colspan="6"  style="text-align:' . $print_tb->gst_p . ';border: 0px solid #fff;background-color: white;">' . label("GST No") . ': ' . $setting->gstnoo . '</td></tr>';
    }

    $PayMethode = explode('~', $sale->paidmethod);
    $payment_mmode = '';
    if ($PayMethode[0] == 2) {

        $payment_mmode .= '<td colspan="3"  style="text-align:' . $print_tb->paymentmode_p . ';border: 0px solid #fff;background-color: white;width: 100px;"> ' . label("PAYEMENT") . ': ' . label("CreditCard") . '</td>';
    } elseif ($PayMethode[0] == 1) {
        $payment_mmode .= '<td  colspan="3" style="text-align:' . $print_tb->paymentmode_p . ';border: 0px solid #fff;background-color: white;width: 100px;"> ' . label("PAYEMENT") . ':' . label("Cash") . '</td>';
    } else {
        $pp_mm = $db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' ")->getRowArray();

        $payment_mmode .= '<td  colspan="3" style="text-align:' . (isset($print_tb->paymentmode_p) ? $print_tb->paymentmode_p : "") . ';border: 0px solid #fff;background-color: white;width: 100px;"> ' . label("PAYEMENT") . ': ' . (isset($pp_mm['name']) ? $pp_mm['name'] : "") . '</td>';
    }


    $customer_ddetaii = '<tr><td colspan="6" style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Customer") . '</td></tr>';
    if ($ccname1)
        $customer_ddetaii .= '<tr><td   colspan="6" style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Name") . ' : ' . $ccname1 . '</td></tr> ';

    if ($custrrf)
        $customer_ddetaii .= '<tr><td   colspan="6"  style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Ref No") . ' : ' . $custrrf . '</td></tr> ';
    if ($ccname2)
        $customer_ddetaii .= '
          <tr><td  colspan="6"  style="text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Address") . '</td></tr>
          <tr>
          <td   colspan="6"  style="text-align:left;border: 0px solid #fff;background-color: white;"> : ' . $ccname2 . '</td>
          </tr>';
    if ($ccname3)
        $customer_ddetaii .= '<tr><td   colspan="6"  style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("Mobile") . ' : ' . $ccname3 . '</td></tr> ';

    if (isset($client->gstno) && $client->gstno)
        $customer_ddetaii .= '<tr><td   colspan="6"  style=" text-align:' . $print_tb->customer_p . ';border: 0px solid #fff;background-color: white;">' . label("GST") . ' : ' . $client->gstno . '</td></tr> ';



    $line_1 = '';
    $line_2 = '';
    $line_3 = '';
    $line_4 = '';
    $line_5 = '';
    $line_6 = '';
    $line_7 = '';
    for ($fv = 1; $fv < 8; $fv++) {
        $fv_t = $fv;

        if ($print_tb->salesno_l == $fv && $print_tb->salesno_sh == 1) {

            $tt = 'line_' . $fv;
            /*if($sale->org_sam==2){ $kmkkkk="(S)";}else{$kmkkkk='';}*/
            $$tt .= '<td  colspan="2"   style="text-align:' . $print_tb->salesno_p . ';border: 0px solid #fff;background-color: white;">' . label("SaleNum") . '.:' . $ttrrt . '</td>';


            $fv = $fv_t;
        }






        if ($print_tb->cashier_l == $fv && $print_tb->cashier_sh == 1) {
            $tt = 'line_' . $fv;
            $$tt .= '<td colspan="3"  style="text-align:' . $print_tb->cashier_p . ';border: 0px solid #fff;background-color: white;">' . label("Cashier") . ': ' . $sale->created_by . '</td>';
            $fv = $fv_t;
        }




        if ($print_tb->paymentmode_l == $fv && $print_tb->paymentmode_sh == 1) {
            $tt = 'line_' . $fv;
            $$tt .= $payment_mmode;
            $fv = $fv_t;
        }



        if ($print_tb->date_l == $fv && $print_tb->date_sh == 1) {
            $tt = 'line_' . $fv;
            $$tt .= '<td colspan="3"  style="text-align:' . (isset($print_tb->date_p) ? $print_tb->date_p : "") . ';border: 0px solid #fff;background-color: white;width:50%;">' . label("Date") . ':' . date('d-m-Y', strtotime($sale->attime)) . '</td>';
            $fv = $fv_t;
        }


        if ($print_tb->time_l == $fv && $print_tb->time_sh == 1) {
            $tt = 'line_' . $fv;
            $$tt .= '<td colspan="3"  style="text-align:' . $print_tb->time_p . ';border: 0px solid #fff;background-color: white;width:50%;">' . label("Time") . ':' . date('H:i', strtotime($sale->attime)) . '</td>';
            $fv = $fv_t;
        }

        if ($print_tb->customer_l == $fv && $print_tb->customer_sh == 1) {
            $tt = 'line_' . $fv;
            $$tt .= $customer_ddetaii;
            $fv = $fv_t;
        }
    }



    for ($fvb = 1; $fvb < 7; $fvb++) {
        $lint_temp = 'line_' . $fvb;
        $linef = $$lint_temp;



        $ticket .= '<tr>' . $linef . '</tr>';
    }

    $ticket .= '';


    $ticket .= '<tr>';



    $pro_width = $print_tb->dp_pt_width * 0.1 * 3;

    if ($print_tb->product_sh == 1)
        $ticket .= '<th  style="width:' . $pro_width . 'mm;border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;"><b>' . label("Product") . '</b></th>';
    if ($print_tb->qt_sh == 1)
        $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;"><b>' . label("QTY") . '</b></th>';
    if ($print_tb->mrp_sh == 1)
        $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;"><b>' . label("MRP") . '</b></th>';
    if ($print_tb->rate_sh == 1)
        $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;"><b>' . label("Rate") . '</b></th>';
    if ($print_tb->tax_sh == 1)
        $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;"><b>' . label("Tax") . '</b></th>';
    if ($print_tb->amt_sh == 1)
        $ticket .= '<th style="border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;"><b>' . label("Amount") . '</b></th>';


    $ticket .= '</tr>';



    $i = 1;
    $vamttt = 0;
    $tkmx45 = 0;
    $mkm = 0;

    $cgst = 0;
    $cgsta = 0;
    foreach ($posales as $posale) {
        $mkm++;
        $kmkm = $db->query("select * from products where id='" . $posale->product_id . "' ")->getRowArray();
        $ovtax = $kmkm['tax'];
        $rtcc = 0;
        if ($txcvukp == 1) {
            $ovtax = $kmkm['tax'];
        } else {
            $ovtax = $kmkm['igst'];
        }
        $tymsk = $ovtax;
        $tymsk1 = (floatval($tymsk) / 100) + 1;
        $rtcc = round($posale->price / $tymsk1, 2); //10



        $rtcc = round($posale->price / $tymsk1, 2); //10
        if ($kmkm['combo_id'] > 0) {


            $dif_ttask = mysql_query("select * from purchase_items_combo where purchase_id='" . $kmkm['combo_id'] . "'  ");
            while ($dif_ttaskf = mysqli_fetch_array($dif_ttask)) {
                $posale_product_id = $dif_ttaskf['product_id'];


                $ovtax = $dif_ttaskf['cgst'];
                $rtcc = 0;
                $tymsk = $ovtax;
                $tymsk1 = ($tymsk / 100) + 1;


                $act_price = $dif_ttaskf['subtot'] / $dif_ttaskf['qt'];
                $rtcc = round($act_price / $tymsk1, 2);


                $yrq = mysql_query("select * from taxprolist where proid='" . $posale_product_id . "' and custtype='" . $txcvukp . "'  ");
                while ($yrqf = mysqli_fetch_array($yrq)) {


                    $myrtax[] = $yrqf['taxid'];

                    if (in_array($yrqf['taxid'], $cgsttax)) //tax id
                    {

                        $ll = $yrqf['taxid'];
                        $mn = 'cgg_' . $ll;
                        $cgsta = ($rtcc * $dif_ttaskf['qt'] * $posale->qt * $yrqf['taxamount']) / 100;
                        $cgst = $$mn + $cgsta;
                        $$mn = $cgst;
                    } else {
                        $ll = $yrqf['taxid']; //taxid
                        $mn = 'cgg_' . $ll;
                        $cgsttax[] = $yrqf['taxid'];
                        $cgst = ($rtcc * $dif_ttaskf['qt'] * $posale->qt * $yrqf['taxamount']) / 100; //10*1*6/100=.6
                        $$mn = $cgst;
                    }
                }
            }
        } else {

            $yrq = mysql_query("select * from taxprolist where proid='" . $posale->product_id . "' and custtype='" . $txcvukp . "'  ");
            while ($yrqf = mysqli_fetch_array($yrq)) {


                $myrtax[] = $yrqf['taxid'];

                if (in_array($yrqf['taxid'], $cgsttax)) //tax id
                {

                    $ll = $yrqf['taxid'];
                    $mn = 'cgg_' . $ll;
                    $cgsta = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100;
                    $cgst = $$mn + $cgsta;
                    $$mn = $cgst;
                } else {
                    $ll = $yrqf['taxid']; //taxid
                    $mn = 'cgg_' . $ll;
                    $cgsttax[] = $yrqf['taxid'];
                    $cgst = ($rtcc * $posale->qt * $yrqf['taxamount']) / 100; //10*1*6/100=.6
                    $$mn = $cgst;
                }
            }
        }














        $vper = $this->session->userdata('dper_' . $posale->id);
        $vamt = $this->session->userdata('tper_' . $posale->id);

        $totaltaxg = intval($kmkm['tax']) + intval($kmkm['sgst']);




        $tkmx1 = intval($kmkm['rrate']) * intval($posale->qt);
        $tkmx2 = intval($posale->price) * intval($posale->qt);
        $tkmx3 = intval($tkmx1) - intval($tkmx2);
        $tkmx45 = intval($tkmx3) + intval($tkmx45);



        if ($print_tb->productlist_one_two == 1) {
            $ticket .= '<tr>';
            if ($print_tb->product_sh == 1) {
                $ticket .= '<td   style="width:' . $pro_width . 'mm;text-align:left;    border-top: 0px solid #ddd; ">' . substr($posale->name, 0, 15) . '</td>';
            }
            if ($print_tb->qt_sh == 1) {
                $ticket .= '<td style="text-align:center;    border-top: 0px solid #ddd;">' . $posale->qt . '</td>';
            }
            if ($print_tb->mrp_sh == 1) {
                $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float) $kmkm['rrate'], $setting->decimals, '.', '') . ' </td>';
            }
            if ($print_tb->rate_sh == 1) {
                $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float) $posale->price, $setting->decimals, '.', '') . ' </td>';
            }
            if ($print_tb->tax_sh == 1) {
                $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . $ovtax . '%</td>';
            }
            if ($print_tb->amt_sh == 1) {

                $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;  ">' . number_format((float) ($posale->qt * $posale->price), $setting->decimals, '.', '') . ' </td>';
            }

            $ticket .= '<tr>';
        } else {

            if ($print_tb->product_sh == 1) {

                $ticket .= '<tr><td  colspan="6"  style="text-align:left;    border-top: 0px solid #ddd; ">' . substr($posale->name, 0, 15) . '</td></tr>';
            }
            $ticket .= '<tr><td style="text-align:center;    border-top: 0px solid #ddd;">&nbsp;</td>';
            if ($print_tb->qt_sh == 1) {
                $ticket .= '<td style="text-align:center;    border-top: 0px solid #ddd;">' . $posale->qt . '</td>';
            }
            if ($print_tb->mrp_sh == 1) {
                $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float) $kmkm['rrate'], $setting->decimals, '.', '') . ' </td>';
            }
            if ($print_tb->rate_sh == 1) {
                $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . number_format((float) $posale->price, $setting->decimals, '.', '') . ' </td>';
            }
            if ($print_tb->tax_sh == 1) {
                $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;">' . $ovtax . '%</td>';
            }
            if ($print_tb->amt_sh == 1) {

                $ticket .= '<td style="text-align:right;    border-top: 0px solid #ddd;  ">' . number_format((float) ($posale->qt * $posale->price), $setting->decimals, '.', '') . ' </td>';
            }

            $ticket .= '</tr>';
        }





        $vamttt = intval($vamt) + intval($vamttt);
        $i++;
    }




    $tgbbb = ($sale->subtotal * $sale->discount) / 100;
    $bcs = 'code128';
    $height = 20;
    $width = 3;
    $ticket .= '

        <tr>
        <td  style="text-align:left;"><b>' . label("TotalItems") . '</b></td>
        <td style="text-align:left; "><b>' . $sale->totalitems . '</b></td>
        <td  style="text-align:left; "><b>' . label("Total") . '</b></td>
        <td colspan="3" style="text-align:right;"><b>Rs.' . $sale->subtotal . '</b></td>
       
        </tr>';






    if ($setting->disc_all == 1 && $sale->discountamount > 0) {
        $ticket .= '<tr>
        
          
          <td colspan="2" style="text-align:left;">' . label("OverAllDiscount") . '</td>
          <td colspan="4" style="text-align:right;font-weight:bold;">Rs.' . number_format((float) $sale->discountamount, $setting->decimals, '.', '') . ' </td>
          
          </tr>';
    }


    if (intval($sale->disamtssh)) {
        $ticket .= '<tr>
          
          <td colspan="2" style="text-align:left;">' . label("Shipping") . '</td>
          <td colspan="4" style="text-align:right;font-weight:bold;">Rs.' . number_format((float) $sale->disamtssh, $setting->decimals, '.', '') . ' </td>
          
          </tr>';
    }




    if ($setting->disc_pro == 1) {
        $ticket .= '<tr>
             <td colspan="2" style="text-align:left; ">' . label("Discount") . ' ' . label("Amount") . '</td>
             <td colspan="4" style="text-align:right;">Rs.' . number_format((float) $sale->discount_indujul, $setting->decimals, '.', '') . '</td><td style="text-align:left;    border-top: 0px solid #ddd;width:' . $olp . ' "></td></tr>';
    }



    $ticket .= '<tr>
        <td colspan="2" style="border-top:0px dashed #000;font-weight:bold;text-align:left;  padding-top:5px;font-weight:bold;;"><b>' . label("GrandTotal") . '</b></td>
        <td colspan="4" style="border-top:0px dashed #000; padding-top:5px; text-align:right;font-size:' . $print_tb->font_size_b . 'px;font-weight:bold;">Rs.' . number_format((float) $sale->total, $setting->decimals, '.', '') . ' </td>
        </tr><tr>';


    $lmoxx = $db->query("select * from sales where id='" . $sale->id . "'  order by id desc ")->getRowArray();
    $lkson = $sale->total - $lmoxx['paid'];
    $rrr = $lmoxx['recivamt'];
    $bbb = $lmoxx['ballamtt'];


    if ($print_tb->received_sh == 111) {
        $ticket .= '<tr>
                <td colspan="2" style="text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . label("Received(Cash)") . ' </td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">Rs.' . number_format((float) ($rrr), $setting->decimals, '.', '') . ' </td>
                </tr>';
    }



    $lmqqq = $db->query("select * from payements where sale_id='" . $sale->id . "' and paidmethod=4 order by id desc ")->getRowArray();



    if ($print_tb->paid_sh == 1) {
        if ($PayMethode[0] == 2) {

            $ticket .= '<td colspan="2" style="text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . label("CreditCard") . ' <br> Ref No.' . $PayMethode[3] . ' <br>' . $PayMethode[2] . '<br> xxxx ' . substr($PayMethode[1], -4) . '</td>
                <td colspan="4" style="padding-top:5px; text-align:right; border-top: 0px solid #ddd;">Rs.' . number_format((float) ($sale->recivamt2), $setting->decimals, '.', '') . '</td></tr>

                ';
        } else if ($PayMethode[0] > 2) {
            $pp_mm = $db->query("select id, name from payment_mode where id='" . $PayMethode[0] . "' ")->getRowArray();
            $ticket .= '<td colspan="2" style="border-top: 0px solid #ddd;text-align:left;  padding-top:5px;border-top: 0px solid #ddd;">' . $pp_mm['name'] . ' <br> Ref No.' . $PayMethode[1] . '</td>
                <td colspan="4" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">Rs.' . number_format((float) ($sale->recivamt2), $setting->decimals, '.', '') . '</td></tr>';
        }
    }




    if ($sale->lalamt > 0) {
        $ticket .= '<tr>
                <td colspan="2" style="text-align:left; padding-top:5px;border-top: 0px solid #ddd;">Exchange (Ret.ID:' . (isset($sale->lalid) ? $sale->lalid : '') . ')</td>
                <td colspan="4" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">Rs.' . number_format((float) ($sale->lalamt), $setting->decimals, '.', '') . '</td> </td>   
                </tr>';

        $ticket .= '<tr>
                <td colspan="3" style="text-align:left; padding-top:5px;border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;">Item</td>
                <td colspan="1" style="padding-top:5px; text-align:right;border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;">QTY</td> </td>
                <td colspan="2" style="padding-top:5px; text-align:right;border-top: 1px solid #ddd;border-bottom: 1px solid #ddd;">Amount</td> </td>   
                </tr>';


        $ret_items = mysql_query("SELECT retunn_items.*,products.name as pname from retunn_items 
    left join returnss on returnss.re_id=retunn_items.ret_id
    left join products on products.id=retunn_items.prodd_ids  where returnss.purcha_sales_id='" . $sale->id . "' and returnss.rsale_type='0'  ");
        while ($ret_itemsf = mysqli_fetch_array($ret_items)) {
            $ticket .= '<tr>            
<td    colspan="3" style="text-align:left; padding-top:5px;border-top: 0px solid #ddd;">' . substr($ret_itemsf['pname'], 0, 15) . '</td> 
<td colspan="1" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">' . $ret_itemsf['sl_newqt'] . '</td>
<td colspan="2" style="padding-top:5px; text-align:right;border-top: 0px solid #ddd;">' . $ret_itemsf['sl_subtotal'] . '</td>
</tr>';
        }
    }


    if ($print_tb->balance_sh) {
        $amount_wordins = '';
        if ($bbb > 0) {
            $amount_wordins = '(Give balance to customer)';
        } else {
            $amount_wordins = '(Get balance from customer)';
        }

        $ticket .= '<tr>
                <td colspan="2" style="border-top:1px solid #ccc;font-weight:bold;text-align:left;  padding-top:5px;font-weight:bold;;">' . label("Balanceamt") . '<br> <span>' . $amount_wordins . '</span></td>
                <td colspan="4" style="border-top:1px solid #ccc; padding-top:5px; text-align:right;font-size:' . $print_tb->font_size_b . 'px;font-weight:bold;">Rs.' . number_format((float) ($bbb), $setting->decimals, '.', '') . ' </td></tr>';
    }



    if ($print_tb->todaysaving_sh == 1) {


        $ticket .= '<tr>
                <td colspan="1" style="text-align:left; font-weight:bold; padding-top:5px;border-top: 1px solid #ddd;">' . label("Saving") . '  </td>
                <td colspan="3" style="font-size:' . $print_tb->font_size_b . 'px;font-weight:bold;text-align:left; padding-top:5px;border-top: 1px solid #ddd;"> : Rs.' . number_format((float) ($tkmx45), $setting->decimals, '.', '') . '</td>
                <td colspan="2" style="font-size:16px;font-weight:bold;padding-top:5px; text-align:right; border-top: 1px solid #ddd;"> </td><td style="text-align:left;    border-top: 1px solid #ddd;"></td>

                </tr>';
    }

    $ticket .= '</tbody></table><br>';

    if ($print_tb->taxx_sh == 1) {


        $ticket .= '<table class="table"  cellspacing="0" border="0"><thead><tr>';

        if ($print_tb->taxname_sh == 1) {
            $ticket .= '<th style="border-top: 1px solid #ddd;" >Tax Name</th>';
        }
        if ($print_tb->taxpersontage_sh == 1) {

            $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;">%</th>';
        }
        if ($print_tb->taxamt_sh == 1) {
            $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;">Amt</th>';
        }
        if ($print_tb->taxtotal_sh == 1) {
            $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;">Total</th>';
        }
        $ticket .= '<th style="border-top: 1px solid #ddd;text-align:center;">&nbsp;</th></tr></thead><tbody>';
    }



    $array = array_values(array_flip(array_flip($myrtax)));


    $myrtaxu = array_unique($array);

    $countb = count($myrtaxu);
    for ($kmv = 0; $kmv < $countb; $kmv++) {
        $pop = $myrtaxu[$kmv];
        $lkll = 'cgg_' . $pop;
        $ckll = 'sgg_' . $pop;
        if (@$$lkll > 0) {


            $naray = $db->query("select * from  tax where id='" . $myrtaxu[$kmv] . "' ")->getRowArray();

            $cddd = $myrtaxu[$kmv];
            $poo = ($$lkll * 100) / $naray['valueper'];
        } else {
            $cddd = "---";
            $poo = '---';
        }

        $sss54 = $$lkll;
        $sss51 = (100 * $sssd) / $sssb; //persantage
        $sss52 = ($poo * $sss51) / 100; //persantage
        $sss53 = $poo - $sss52; //poo

        $sss55 = ($sss54 * $sss51) / 100; //persantage
        $sss56 = $sss54 - $sss55; //lkll


        mysql_query("insert into tax_summary(salesid,  taxname, taxpercent,  taxamount, taxfrom, datedd,c_s_i) 
      values('" . $ppp . "','" . $naray['name'] . "','" . $naray['valueper'] . "','" . $sss53 . "','" . $sss56 . "','" . date("Y-m-d") . "','" . $naray['custtype'] . "' ) ");
        if ($themblock == 1) {
            mysql_query("insert into dtax_summary(salesid,  taxname, taxpercent,  taxamount, taxfrom, datedd,c_s_i) 
      values('" . $dppp . "','" . $naray['name'] . "','" . $naray['valueper'] . "','" . $sss53 . "','" . $sss56 . "','" . date("Y-m-d") . "','" . $naray['custtype'] . "' ) ");
        }


        if ($print_tb->taxx_sh == 1) {
            $ticket .= '<tr>';

            if ($print_tb->taxname_sh == 1) {
                $ticket .= '<td style="text-align:left;border-top: 0px solid #ddd;">' . $naray['name'] . '</td>';
            }
            if ($print_tb->taxpersontage_sh == 1) {

                $ticket .= '<td style="text-align:right;border-top: 0px solid #ddd;">' . $naray['valueper'] . '</td>';
            }
            if ($print_tb->taxamt_sh == 1) {
                $ticket .= '
            <td style="text-align:right;border-top: 0px solid #ddd; ">' . round(@$sss53, 2) . '</td>';
            }
            if ($print_tb->taxtotal_sh == 1) {
                $ticket .= '
            <td style="text-align:right;border-top: 0px solid #ddd; ">' . round(@$sss56, 2) . '</td>';
            }



            $ticket .= '<td colspan="2" style="text-align:right;border-top: 0px solid #ddd; "></td>';
            $ticket .= '</tr>';
        }
    }




    $ticket .= '</table>';
}




if ($lxm11['printersizew'] < 3) {

    $ticket .= '

  <table class="table" style="margin-bottom:0px; width:100%;margin-top:1px;border: 1px solid #333;padding:10px;" cellspacing="0" border="0"  > 
  <tr style="border: 0px solid #ddd;">

  <td style="width:15%;border-top: 0px solid #ddd;padding: 0px;border-right: 1px solid #333;padding:3px;">
<span >Customer Seal & Sign</span></td>


  <td style="width:30%;border-top: 0px solid #ddd;padding: 0px;">

  <table class="table" style="width:100%;margin-top:1px;margin-bottom: 1px;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >
         
           
            <tr>
            <td style="border-top: 0px;padding-left:5px;"><b>Terms & conditions </b>: <br>' . $setting->declaration . '</td>
            </tr>
</table></td>
 <td style="width:25%;border-top: 0px solid #ddd;border-left: 1px solid #333;padding: 0px;">
 <table class="table" style="width:100%;margin-bottom: 1px;margin-top:1px;border-bottom: 0px solid #333;border-style: dashed;" cellspacing="0" border="0" >

            <tr >
             <td style="border-top: 0px;padding-left:5px;">Bank</td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $setting->bbank . '</td>
            </tr>

           <tr>
            
            <td style="border-top: 0px;padding-left:5px;">Acc No  </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $setting->aaco . '</td>
            </tr> <tr>
            
            <td style="border-top: 0px;padding-left:5px;">IFS   </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $setting->iifs . '</td>
            </tr>
             <tr>

             <td style="border-top: 0px;padding-left:5px;">Branch  </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $setting->bbranch . '</td>
            </tr>
             <tr>

             <td style="border-top: 0px;padding-left:5px;">Pan  </td>
            <td style="border-top: 0px;padding-left:5px;">: ' . $setting->pann . '</td>
            </tr>
 </tr>
</tbody>
</table></td>


<td style="width:30%;border-top: 0px solid #ddd;padding: 0px;border-left: 1px solid #333;padding:3px;">
For ' . ucwords($setting->companyname) . '</td>

</tr></table>

  ';
}




$ticket .= '<table style="margin-top:10px;" class="table" cellspacing="0" border="0" >
 


          <tr><td colspan="6" style="text-align:center;border: 0px solid #fff;background-color: white;padding:0px;">

          ' . $setting->receiptfooter . '
          </td>

          </tr>
          
          </table></div>
          ';










Posale_model::delete_all(['status' => 1, 'register_id' => $this->register, 'user_id' => $this->session->userdata('user_id')]);

/*      if (isset($number)) {
            if ($number != 1)
                Hold_model::delete_all(array(
                    'conditions' => array(
                        'number = ? AND register_id = ? AND user_id =?',
                        $number,
                        $this->register,
                        $this->session->userdata('user_id')
                    )
                ));
        }*/

$hold = Hold_model::find('last', array(
    'conditions' => array(
        'register_id = ?',
        $this->register
    )
));
if ($hold) {
    Posale_model::update_all(array(
        'set' => array(
            'status' => 1
        ),
        'conditions' => array(
            'number = ? AND register_id = ? AND user_id =?',
            $hold->number,
            $this->register,
            $this->session->userdata('user_id')
        )
    ));
}



if ($setting->smsset == 1) {
    $kmsen = $db->query("select * from smstabble_new where ss_status=1 ")->getRowArray();
    $mobileNumber = $tycvzz;

    $amtt = number_format((float) $sale->paid);
    $bilnum = sprintf('%05d', $sale->id);
    $lmdornn = $sale->created_by;
    $ccname2 = ' ';
    $date = date("d-m-Y");
    $taname = $sale->clientname;

    $searchArray = array("{bill_number}", "{total_amount}", "{emp_name}", "{delivery_address}", "{date}", "{customer_name}", "{birthday_date}", "{anniversary_date}", "{store_address}");
    $replaceArray = array($bilnum, $amtt, $lmdornn, $ccname2, $date, $taname, '', '', $mstoef['adresse']);
    $intoString = $setting->billing_sms;
    $message = str_replace($searchArray, $replaceArray, $intoString);

    $s_array = array("{mobile_number}", "{message_details}");
    $r_array = array(urlencode($mobileNumber), urlencode($message));
    $url = str_replace($s_array, $r_array, $kmsen['ss_url']);


    $json = json_decode(file_get_contents($url), true);
    if ($json["status"] === "success") {
    } else {
    }
}

for ($oio = 1; $oio <= $setting->pptt; $oio++) {

    echo $ticket;
    die;
}
