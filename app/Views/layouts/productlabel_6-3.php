

    
     <style type="text/css">
  body { 
        margin: 0;
        padding: 0;
        background-color: #FAFAFA;
        font: 12pt "Tahoma";
      }
    
    * {
        box-sizing: border-box;
        -moz-box-sizing: border-box;
      }
    
    .page {
         
        
        padding: 0mm;
      
        border: 1px #D3D3D3 solid;
        border-radius: 5px;
        background: white;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
    }
    
    .subpage {
        padding: 0mm;
        border: 1px red solid;
        height: 34mm;
        outline: 1mm #FFEAEA solid;
    }
    
    @page {
        size: A6;
        margin: 0;
    }
    
    @media print {
        .page {
            margin: 0;
            border: initial;
            border-radius: initial;
            width: initial;
            min-height: initial;
            box-shadow: initial;
            background: initial;
            page-break-after: always;
        }
    }
</style>


<?php

$row=$this->uri->segment(4);
$num=$this->uri->segment(5);
$productBcode=$this->uri->segment(3);

   
  

 

    $this->load->database();


    $omm=mysql_fetch_object(mysql_query("select * from stores where id='".$this->session->userdata('store')."' "));
    $compname=$omm->name;
    $nnm=mysql_fetch_array(mysql_query("select * from products where id='".$productBcode."' "));
    $nam   = $nnm['name']; 
    $description   = $nnm['description']; 

    $print_lab=mysql_fetch_array(mysql_query("select * from barcode_print_model where br_status=1 "));
    $brcode_no   = $print_lab['br_no'];
  $productBcode = $nnm['code'];
       $params['data'] = $productBcode;
    $params['level'] = 'H';
    $params['size'] = 111;
    $time_now = time();
    $params['savename'] = FCPATH.'assets/abc/qrimg'.$time_now.'.png';
    $imageResource =  $this->ciqrcode->generate($params); 


    $PostPrice=$nnm['price'];
   
    
    $pr_org_price = !$nnm['taxmethod'] || $nnm['taxmethod'] == '0' ? floatval($PostPrice) : floatval($PostPrice)*(1 + $tg / 100);
    
    
if($nnm['offer_id']>0)
{
$PostPrice=$nnm['offer_price'];
}

$tg= $nnm['tax']+$nnm['sgst'];
$prixz = !$nnm['taxmethod'] || $nnm['taxmethod'] == '0' ? floatval($PostPrice) : floatval($PostPrice)*(1 + $tg / 100);



if($nnm['offer_id']>0)
{

$frr='<span style="color:#358ee0;" ><strike >Rs.'.number_format((float)$pr_org_price, $this->setting->decimals, '.', '').'</strike> Rs.'.$prixz;
}
else
{
$frr=$prixz;
}



$printi=mysql_fetch_array(mysql_query("select * from print_setup where dp_id=3 "));

  
      $content = "";
      $bcs = 'code128';
      $height = 30;
      $width = 2;
      $widthxc = 0;
      $kk=(12/$row)*($printi['bar_width']+1);
      $content .= '<div    >';
      for ($i=0; $i < $num; $i++) {


 $content .= '<div   class="page" style="height:'.$printi['bar_hight'].'mm;" >'; 


for($rf=0;$rf<$row;$rf++)
{
if($rf!=0)  {  $i++;}
  if($num==$i)  {   break; }

  if($brcode_no==1)
  {
$bar_pprice=$printi['bar_price']-5;
      $content .= '<div   style="text-align: left;padding-right: 0px;padding-left: 0px;width:'.$printi['bar_width'].'mm;height:'.$printi['bar_hight'].'mm;float:left;"  >
  
         <table class="table"  cellspacing="0" border="0" style="    margin-left: 8px;margin-top:'.$printi['bar_mar_top'].'mm;margin-bottom:'.$printi['bar_mar_botom'].'mm;    width: 100%;"><tbody>  
         
          <tr><td  ><td>&nbsp;</td></tr>
          
<tr><td colspan="6" style="padding: 0px;text-align:center; color:#000; border: 0px solid #fff;background-color:#fff !important;font-size:'.$printi['bar_store_name'].'px;"><b  >'. $compname .'</b></td></tr>
<tr>
<td colspan="2" style=" width:25%; padding: 0px;text-align:Center;border: 0px solid #fff;background-color: white;font-size:'.$bar_pprice.'px;"><b>'.$productBcode.'</b></td><td colspan="6" style="text-align:Left;padding: 0px;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_product'].'px;"><b>'. $nam .'</b></td>
<td colspan="4" style="width:72%;padding: 0px;text-align:left;border: 0px solid #fff;background-color: white;font-size:'.$bar_pprice.'px;">&nbsp;</td>
</tr>
<tr>
<td colspan="2" style="width:25%;padding: 0px;text-align:Left;border: 0px solid #fff;background-color: white;"><img  style="margin-top:'.$printi['bar_img_top'].'px;width:'.$printi['bar_img_width'].'mm;height:'.$printi['bar_img_height'].'mm;font-size:'.$printi['bar_img_fontsize'].'px;" src="'.base_url().'assets/abc/qrimg'.$time_now.'.png" alt="'.$productBcode.'" />
</td>
<td colspan="4" style="width:72%;padding: 0px;text-align:left;border: 0px solid #fff;background-color: white;"><b>MRP . '.$frr.'</b>
<br><ssk style="font-size:12px;"text-align:left;>(incl..of all taxes)</ssk>
</td>
</tr>

</tbody></table>
         </div>';

  }
  elseif($brcode_no==2)
  {

     $content .= '<div   style="text-align: left;padding-right: 0px;padding-left: 0px;width:'.$printi['bar_width'].'mm;height:'.$printi['bar_hight'].'mm;float:left;"  >
  
        
           <table class="table"  cellspacing="0" border="0" style="margin-left: 8px;margin-top:'.$printi['bar_mar_top'].'mm;margin-bottom:'.$printi['bar_mar_botom'].'mm;    width: 100%;"><tbody> 
            <tr><td  ><td>&nbsp;</td></tr>
         
<tr><td colspan="6" style="padding: 0px;text-align:left;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_product'].'px;"><b>'. $nam .'</b></td></tr>

<tr>
<td colspan="6" style="text-align:left;padding: 0px;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_price'].'px;"><b>Net Wt:'. $nnm['net_wight'] .''.$nnm['unit'] .'</b></td>
</tr>
<tr>
<td colspan="6" style="padding: 0px;text-align:left;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_price'].'px;"><b>MRP : '.$nnm['rrate'].'/-</b></td>
</tr>


<tr><td colspan="2" style="padding: 0px;text-align:left;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_price'].'px;"><b>Packed :'. $nnm['packed_1m'] .'</b></td>
<td colspan="4" style="padding: 0px;text-align:left;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_price'].'px;"><b>Best Before : '.$nnm['best_before'].'</b></td>
</tr>

<tr> <td colspan="6" style="padding: 0px;text-align:left;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_store_name'].'px;"><b>Repacked By</b> :'.$compname .'</td></tr>

<tr><td colspan="6" style="padding: 0px;text-align:left;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_price'].'px;">'.$omm->adresse .','.$omm->city .'</td></tr>

<tr><td colspan="6" style="padding: 0px;text-align:center;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_price'].'px;"> '.$omm->email .' | '.$omm->phone .'</td></tr>

<tr><td colspan="6" style="padding: 0px;text-align:left;border: 0px solid #fff;background-color: white;"><img   style="margin-top:'.$printi['bar_img_top'].'px;width:'.$printi['bar_img_width'].'mm;height:'.$printi['bar_img_height'].'mm;font-size:'.$printi['bar_img_fontsize'].'px;"   src="' . site_url('productcontroller/GenerateBarcode/' . sprintf($productBcode) . '/' . $bcs . '/' . $height . '/' . $width) . '" alt="'.$productBcode.'" />
</td></tr>




</tbody></table>

         </div>';


  }
  else if($brcode_no==3)
  {



      $content .= '<div   style="text-align: left;padding-right: 0px;padding-left: 0px;width:'.$printi['bar_width'].'mm;height:'.$printi['bar_hight'].'mm;float:left;"  >
      
  
         <table class="table"  cellspacing="0" border="0" style="margin-left: 12px;margin-top:'.$printi['bar_mar_top'].'mm;margin-bottom:'.$printi['bar_mar_botom'].'mm;    width: 100%;"><tbody> 
         
          <tr><td  ><td>&nbsp;</td></tr>
<tr><td colspan="6" style="padding: 0px;text-align:center;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_store_name'].'px;"><b>'. $compname .'</b></td></tr>

<tr>
<td colspan="6" style="text-align:left;padding: 0px;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_product'].'px;"><b>'. $nam .'</b></td>
 
</tr>
<tr>

 

<td colspan="6" style="text-align:left;padding: 0px;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_price'].'px;"><b>


'.$frr.'</b></td>

</tr>

<tr>
<td colspan="6" style="padding: 0px;text-align:left;border: 0px solid #fff;background-color: white;"><img  style="margin-top:'.$printi['bar_img_top'].'px;width:'.$printi['bar_img_width'].'mm;height:'.$printi['bar_img_height'].'mm;font-size:'.$printi['bar_img_fontsize'].'px;" src="' . site_url('productcontroller/GenerateBarcode/' . sprintf($productBcode) . '/' . $bcs . '/' . $height . '/' . $width) . '" alt="'.$productBcode.'" />
</td>

</tr>
</tbody></table>
         </div>';

  }  
  else if($brcode_no==4)
  {

$fvv=$printi['bar_width']*0.47;
      $content .= '<div   style="text-align: left;padding-right: 0px;padding-left: 0px;width:'.$printi['bar_width'].'mm;height:'.$printi['bar_hight'].'mm;float:left;"  >
  
           <table class="table"  cellspacing="0" border="0" style="margin-left: 15px;margin-top:'.$printi['bar_mar_top'].'mm;margin-bottom:'.$printi['bar_mar_botom'].'mm;    width: 100%;"><tbody>
           
 <tr><td  ><td>&nbsp;</td></tr>

<tr>


<tr>
<td style="width:'.$fvv.'mm;padding: 0px;text-align:center;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_store_name'].'px;">
<table class="table"  cellspacing="0" border="0"  ><tr>
<td colspan="6" style="padding: 0px;text-align:center;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_store_name'].'px;"><b>'. $compname .'</b></td></tr>
<tr>
<td colspan="6" style="text-align:left;padding: 0px;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_product'].'px;"><b>'. ucfirst($nam) .'</b></td></tr>
<tr>
<td colspan="6" style="text-align:left;padding: 0px;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_price'].'px;"><b>'.$frr.'</b></td>
</tr>
</table>
</td>


<td colspan="2" style="padding: 0px;text-align:left;border: 0px solid #fff;background-color: white;"><img  style="margin-top:'.$printi['bar_img_top'].'px;width:'.$printi['bar_img_width'].'mm;height:'.$printi['bar_img_height'].'mm;font-size:'.$printi['bar_img_fontsize'].'px;" src="' . site_url('productcontroller/GenerateBarcode/' . sprintf($productBcode) . '/' . $bcs . '/' . $height . '/' . $width) . '" alt="'.$productBcode.'" />
</td>
</tr>
 
 
 
</tbody></table>
         </div>';

  }
  else
  {

      $content .= '<div   style="text-align: left;padding-right: 0px;padding-left: 0px;width:'.$printi['bar_width'].'mm;height:'.$printi['bar_hight'].'mm;float:left;"  >
  
         <table class="table"  cellspacing="0" border="0" style="margin-left: 8px;margin-top:'.$printi['bar_mar_top'].'mm;margin-bottom:'.$printi['bar_mar_botom'].'mm;"><tbody>          
<tr><td colspan="6" style="padding: 0px;text-align:center;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_store_name'].'px;"><b>'. $compname .'</b></td></tr>
<tr>
<td colspan="6" style="text-align:left;padding: 0px;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_product'].'px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>'. $nam .'</b></td>
</tr>
<tr>

<td colspan="6" style="padding: 0px;text-align:left;border: 0px solid #fff;background-color: white;font-size:'.$printi['bar_price'].'px;"><b>Rs.'.$prixz.'</b></td>
</tr>
<tr>
<td colspan="6" style="padding: 0px;text-align:left;border: 0px solid #fff;background-color: white;"><img  style="margin-top:'.$printi['bar_img_top'].'px;width:'.$printi['bar_img_width'].'mm;height:'.$printi['bar_img_height'].'mm;font-size:'.$printi['bar_img_fontsize'].'px;" src="' . site_url('productcontroller/Generateciqrcode/' . sprintf($productBcode) . '/' . $bcs . '/' . $height . '/' . $width) . '" alt="'.$productBcode.'" />
</td>

</tr>
</tbody></table>
         </div>';

  }



        
      

       }


         $content .= ' </div>
         ';


      }
      $content .= '</div>';

      echo $content;
?>

<script type="text/javascript">
  window.print();
</script>







<!-- /.Modal -->
