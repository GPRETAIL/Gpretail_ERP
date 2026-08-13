<script type="text/javascript" src="https://www.google.com/jsapi"></script>
    <script type="text/javascript">
      google.load("elements", "1", {
            packages: "transliteration"
          });
      function onLoad() {
        var options = {
          sourceLanguage: 'en', // or google.elements.transliteration.LanguageCode.ENGLISH,
          destinationLanguage: ['<?=label("languagek");?>'], // or [google.elements.transliteration.LanguageCode.HINDI],
          shortcutKey: 'ctrl+g',
          transliterationEnabled: true
        };
        var control = new google.elements.transliteration.TransliterationControl(options);
        var ids = [ "countryname_1m" ];
        control.makeTransliteratable(ids);
         control.showControl('translControl');
      }
      google.setOnLoadCallback(onLoad);
</script>
<?php  
if($this->setting->destpp!=1)
{   
?>
<script type="text/javascript">
      $(function(){
   $('#productList').slimScroll({
      height: '330px',
      alwaysVisible: true,
      railVisible: true,
      
   });
});
</script>
<?php }
else
{ ?>

  <script type="text/javascript">

      $(function(){

var hh=$(window).height()*0.50;

   $('#productList').slimScroll({
      height: hh+'px',
      alwaysVisible: true,
      railVisible: true,
      
   });
});

</script>


  <?php } ?>




   <script type="text/javascript">

      google.load("elements", "1", {
            packages: "transliteration"
          });
      function onLoad() {
        var options = {
          sourceLanguage: 'en', // or google.elements.transliteration.LanguageCode.ENGLISH,
          destinationLanguage: ['<?=label("languagek");?>'], // or [google.elements.transliteration.LanguageCode.HINDI],
          shortcutKey: 'ctrl+g',
          transliterationEnabled: true
        };
        var control = new google.elements.transliteration.TransliterationControl(options);
        var ids = [ "searchProd" ];
        control.makeTransliteratable(ids);
         control.showControl('translControl');
      }
      google.setOnLoadCallback(onLoad);
    </script>

    <style type="text/css">
      #gbb
      {
        display: none;
        border-top: 0px solid #ddd;background: #fff;
      }
    </style>
    
<?php 
session_start();

if($this->setting->disc_pro==0 )
      {
$msk=2;
$msm=1.5;
    
    ?>

 <style type="text/css">
     .col-xs-2
     {
        width: 19%;
        float: left;
        padding-right: 15px;
        padding-left: 15px;
     }
     .col-xs-1
     {
        width: 13%;
        float: left;
        padding-right: 15px;
        padding-left: 15px;
     }

   </style>
   <?php }
   



    ?>
   

   <?php 


     if($this->setting->disc_pro==1 )
   {
 $msk=2.3;
$msm=2;
?>
 <style type="text/css">
     .col-xs-2
     {
        width: 17%;
        float: left;
        padding-right: 15px;
        padding-left: 15px;
     }
     .col-xs-1
     {
        width: 11%;
        float: left;
        padding-right: 15px;
        padding-left: 15px;
     }

   </style>
   <?php
}
?>
<?php 
$mmik=mysql_fetch_array(mysql_query("select * from products order by id desc "));

$this->user->id;
$pll = mysql_fetch_array(mysql_query("select * from users where id='".$this->user->id."' "));


$rolwer=$this->user->role;
@$kkar=mysql_fetch_array(mysql_query("select * from permission_new where nname='".$rolwer."'  "));



if (!$this->session->userdata('register'))
{



if($pll['role']=="admin")
{ ?>
   <div class="container container-small">
      <div class="row">
         <h1 class="text-center choose_store"> <?=label('ChooseStore');?> </h1>
      </div>
      <div class="row">
         <ul id="storeline">
            <?php foreach ($Stores as $store):?>
            <a href="javascript:void(0)"  onclick="OpenRegister(<?=$store->status ? $store->status : 0;?>, <?=$store->id;?>)">
              <li class="listing clearfix">
                <div class="image_wrapper">
                  <img src="<?=base_url()?>assets/img/store.svg" alt="store">
                </div>
                <div class="info">
                  <span class="store_title"><?=$store->name;?></span>
                  <span class="store_info"><?=$store->city;?> <span>&bull;</span> <?=$store->phone;?> <span>&bull;</span> <?=$store->email;?></span>
                </div>
                <span class="store_type <?= $store->status == 1 ? 'store_open' : 'store_close';?>"><?= $store->status == 1 ? label('open') : label('close');?></span>
              </li>
            </a>
            <?php endforeach;?>
         </ul>
      </div>


   </div>
<?php  }  ?>
   <script type="text/javascript">
   function OpenRegister(status, storeid){
    
      if(status == 0) {
         $('#CashinHand').modal('show');
         $('#store').val(storeid);
      }else {
         window.location.href = "<?php echo site_url('pos/openregister/')?>/" + storeid;
      }
   }

   </script>

  
   <!-- Modal add user -->
   <div class="modal fade" id="CashinHand" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
       <div class="modal-content">
         <div class="modal-header">
           <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
           <h4 class="modal-title" id="myModalLabel"><?=label("CashinHand");?></h4>
         </div>
         <?php echo form_open_multipart('pos/openregister'); ?>
         <div class="modal-body">
               <div class="form-group">
                <label for="CashinHand"><?=label("CashinHand");?></label>
                <input type="number" step="any" name="cash" Required class="form-control" id="CashinHand" placeholder="<?=label("CashinHand");?>">
                <input type="hidden" name="store" class="form-control" id="store">
              </div>
         </div>
         <div class="modal-footer">
           <button type="button" class="btn btn-red" data-dismiss="modal"><?=label("Close");?></button>
           <button type="submit" class="btn btn-add"><?=label("Submit");?></button>
         </div>
      <?php echo form_close(); ?>
       </div>
    </div>
   </div>
   <!-- /.Modal -->
   <?php
}else {?>
<div class="container-fluid" >
   <div class="row" style="margin-left: -10px;">
     
<input type="hidden" name="pprtnt" id="pprtnt"  value="<?php echo $this->setting->ddirectprint;?>">
     
      <div class="col-md-8 left-side " style="margin-bottom: 1px;padding-right: 5px;padding-left: 5px;">
         <div class="row" >
         <div class="col-xs-6" >
            <div class="row row-horizon" style="margin: 0 0px;">
               <span class="holdList">
                  <!-- list Holds goes here -->
               </span>
               <span data-toggle="tooltip" title="Add New" class="Hold pl" onclick="AddHold()">+</i></span>
               <span data-toggle="tooltip" title="Remove Selected" class="Hold rl" onclick="RemoveHold()">-</span>
            </div>
            </div>

<div class="col-xs-6 " style="margin-top:-3px;text-align: right;" >


                        <?php if($this->setting->quotation==1)
                        { ?>
 
 <input type="text"  name="qttnumm" id="qttnumm" placeholder="QT No" style="width: 60px;border: 1px solid #C8D3DF;
border-radius: 0px;height: 36px;">


<a href="javascript:void(0)" onclick="dsdsdsd();" data-toggle="modal" >

<i style="font-size:18px;" class="fa fa-search"></i>

</a>

<?php } ?>




<?php

if($this->session->userdata('payment_price'))
{
$sellrr=$this->session->userdata('payment_price');
}
else
{
$sellrr=0;
}


 ?>


<?php 
if($this->setting->mlp_rss==1)
{ 
?>
<span style="width: 25%;float: right;margin: 2px;" >

<select  class="form-control"  id="payment_price" style="width: 100%;height: 39px;float: right; display: block;padding: 2px;
line-height: 2.42857143;
    background: linear-gradient(to bottom, #ffffff 0%,#eeeeee 100%);
color: #000;
text-align: center;
border: 1px solid #C8D3DF; ">
<option value="0"  <?php if($sellrr==0){ ?> selected="selected" <?php } ?>   ><?=label("Store");?></option>
<?php
 $pprrc=mysql_query("select * from price_master   order by name asc ");
 while($pprrcf=mysql_fetch_object($pprrc)) 
 { ?>
 <option value="<?=$pprrcf->id;?>"  <?php if($sellrr==$pprrcf->id){ ?> selected="selected" <?php } ?>><?=$pprrcf->name;?></option>
 <?php } ?>
</select>

</span>

 <?php } else {  ?>

 <input type="hidden"  name="payment_price" id="payment_price"  value="0" >

 <?php }   ?>


<a href="javascript:void(0)" data-toggle="modal" data-target="#ticket">
<span    class="categories" ><i class="fa fa-tags" aria-hidden="true"></i>

<?=label("Receipt");?>
</span></a>
<a data-toggle="tooltip"   href="javascript:void(0)" onclick="CloseRegister()"><span class="categories" >
<i class="fa fa-power-off" aria-hidden="true"></i>
<?=label("Close");?>

</span></a>

 </div>


         </div>


<style type="text/css">
  .ui-menu .ui-menu-item {


    background-color: #F2F7FA;
    padding: 2px;
}

</style>
         <?php $styll='F2F7FA';  if($this->setting->themblock==1) { $styll='7ec9ff'; } ?>   
 



        <div  class="col-sm-12" style="height: 53px;margin-top: 4px;margin-bottom: 5px;border: solid 1px #CFCFCF;
/*-webkit-border-radius: 3px 3px 0 0;*/
/*border-radius: 3px 3px 0 0;*/
background: #<?php echo $styll;?>;font-family:'Roboto', sans-serif;">

<?php
if(!empty($this->uri->segment(3)))
{
  $qt_id=$this->uri->segment(3);
 $ssel_cust=mysql_fetch_object(mysql_query("select * from saleqs where id='".$this->uri->segment(3)."' "));
 $ssel_custf=$ssel_cust->client_id;
 $ssel_custds=$ssel_cust->discount;

 $ssel_custsh=$ssel_cust->disamtssh;
}
else
{
  $ssel_custf=0;
   $ssel_custds=$this->setting->discount;
   $ssel_custmob=0;
    $ssel_custsh=0;
    $qt_id=0;
}
?>
<input type="hidden" name="qt_id" id="qt_id" value="<?php echo $qt_id;?>">

         <div class="col-sm-3" style="margin-top: 10px;padding-right: 1px;padding-left: 0px;">
          
<select     class="js-select-options form-control" id="customerSelect">
<option value="0"><?=label("WalkinCustomer");?></option>
<?php foreach ($customers as $customer):?>
<option  value="<?=$customer->id;?>"    <?php if($ssel_custf==$customer->id){  $ssel_custmob=$customer->phone; ?> selected <?php } ?> ><?php echo $customer->name.' - '.$customer->phone;?></option>
<?php endforeach;?>
            </select>
            </div>
            <div class="col-sm-1" style="margin-top: 10px;padding-left: 1px;padding-right:  0px;">
             <a href="javascript:void(0)" data-toggle="modal" data-target="#AddCustomer">
               <span class="fa-stack fa-lg" data-toggle="tooltip" data-placement="top" title="<?=label('AddNewCustomer');?>">
                  
                  <i style="color: #89b03e;" class="fa fa-user-plus fa-stack-1x  "></i>
               </span>
            </a>
         </div>

        <div class="col-sm-4" style="padding-left: 0px;padding-right:  0px;">
            <form onsubmit="return barcode()" action="javascript:void(0)">
            <input autofocus style="margin-top:10px;" placeholder="<?=label('Barcode_Product_Name');?>" autocomplete="off" onkeyup="return auromcv(this.value,this.id);" class="form-control barcode" type='text' id='countryname_1m' />

<!-- <input  style="margin-top:10px;" type="text" autofocus id="<?=strval($this->setting->keyboard) === '1' ? 'keyboard' : ''?>" class="form-control barcode" placeholder="<?=label('BarcodeScanner');?>"> -->
            </form>

            
<script  type="text/javascript" src="<?php echo base_url();?>assets/wildel/jquery-1.10.2.min.js"></script>
<script  type="text/javascript" src="<?php echo base_url();?>assets/wildel/jquery-ui-1.10.3.custom.min.js"></script>
         </div>
          <div class="col-sm-3" style="margin-top: 15px;font-size: 19px;">
                              
                                
                                <span class="float-left"><i style="margin-right:5px; color:#89b03e;font-size: 20px;" class="fa fa-shopping-cart"></i><b id="ItemsNum"><span></span> <?=label("item");?></b></span>
                               
        </div>


<span title="Add New Product"   style="cursor: pointer;margin-top: 13px;font-size: 25px;color: #89b03e !important;" class="float-left" data-toggle="modal" data-target="#Addproduct"> 
<i  class="fa fa-plus"></i></span>


   </div>
   <div class="clearfix"></div>


<div class="col-sm-12" style="background: #FBFBF7;border:1px solid #CFCFCF;padding-left:1px;font-family:'Roboto', sans-serif;">
         <div class="col-xs-1 " style="width: 15px;">
            
         </div>

         <div class="col-xs-1 table-header" style="padding-right: 5px;width: 60px;  padding-left: 5px;" >
            <h5 style="margin-top:10px;text-align: left;" ><b><?=label("PID");?></b></h5>
         </div>

         <div class="col-xs-3 table-header" style="padding-right: 5px;padding-left: 5px;">
            <h5 style="margin-top:10px;text-align: center;" ><b><?=label("Product");?></b></h5>
         </div>

         <div class="col-xs-1 table-header" style="padding-right: 5px;padding-left: 5px;">
            <h5 style="margin-top:10px;text-align: right;" ><b>MRP</b></h5>
         </div>
       

         <div class="col-xs-1 table-header" style="padding-right: 5px;padding-left: 5px;">
            <h5 style="margin-top:10px;text-align: center;"><b><?=label("price");?></b></h5>
         </div>
         <div class="col-xs-1 table-header " style="padding-right: 1px;padding-left: 5px;">
            <h5 style="margin-top:10px;text-align: center;margin-right: 10px;" ><b><?=label("Quantity");?></b></h5>
         </div>

<?php 




      
 if($this->setting->disc_pro==1)
      { $msk--; 
        ?>
<input type="hidden" name="prowise" id="prowise" value="1">
 <div style="width:50px;text-align: center;padding-right: 1px;padding-left: 1px;" class="col-xs-1 table-header ">
            <h5 style="margin-top:10px;" ><b>Dis<br> %</b></h5>
         </div>
          <div style="width:55px;text-align: center;padding-right: 1px;padding-left: 1px;" class="col-xs-1 table-header ">
            <h5 style="margin-top:10px;" ><b>Dis AMT</b></h5>
         </div>
         <?php 
       }
       else
       {
        ?>
        <input type="hidden" name="prowise" id="prowise" value="0">
         <div  style="width:10px;text-align: left;display:none;" class="col-xs-1 table-header ">
            <h3 style="margin-top:10px;" class="text-left">&nbsp;</h3>
         </div>
          <div style="width:10px;text-align: left;display:none;" class="col-xs-1 table-header ">
            <h3 style="margin-top:10px;" class="text-left">&nbsp;</h3>
         </div>
         <?php
       }

     if($this->setting->gst_tax==1)
      {  
        $msk--;

if($this->setting->mystate==$customer->custstate || $_SESSION['custkid']==0)
{ ?>
 <input type="hidden" name="gkstt" id="gkstt" value="1">
        

<?php }

        else
        {
      ?>
      <input type="hidden" name="gkstt" id="gkstt" value="1">
       



        


<?php 
}
}
else
 {
        ?>
        <input type="hidden" name="gkstt" id="gkstt" value="0">
         <div style="width:50px;text-align: left;display:none;" class="col-xs-1 table-header ">
            <h3 style="margin-top:10px;" class="text-left">&nbsp;</h3>
         </div>
          <div style="width:50px;text-align: left;display:none;" class="col-xs-1 table-header ">
            <h3 style="margin-top:10px;" class="text-left">&nbsp;</h3>
         </div>
         <?php
       }

?>
         <div class="col-xs-2 table-header nopadding ">
            <h5 style="margin-top:10px;text-align: right;"><b><?=label("Total");?></b></h5>
         </div>
          <div class="col-xs-1 table-header nopadding " style="width: 15px;">
            <i style="margin: 10px 0px 0px 36px;" class="fa fa-question-circle-o" title="If uncheck,discount won't calculate for that product" aria-hidden="true"></i>
         </div>

 </div>




         <div  id="productList" style="border: 1px solid #dbdbdb;" >
            <!-- product List goes here  -->
         </div>
<?php
if($this->setting->destpp!=1)
{
  ?>

         <div class="footer-section">
        

         

            <div class="table-responsive col-sm-12 totalTab">
            
               <table class="table"  style="border: 1px solid #ddd !important;    margin-top: 6px;margin-bottom: 5px !important;" >
 
 


  <?php  if( $this->setting->disc_all ==1)
                  { ?>
                    <input type="hidden" name="allddd" id="allddd" value="1">
                     
    <input      maxlength="5"  style="width: 100%;height: 30px;float: right;background-color: #fff;display: block;margin-top: 5px;


padding: 6px 10px;
line-height: 1.42857143;
color: #555;
text-align: center;
background-color: #fff;
border: 1px solid #C8D3DF;

-webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
-webkit-transition: border-color ease-in-out .15s,-webkit-box-shadow ease-in-out .15s;
-o-transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;" type="hidden" value="<?=$ssel_custds;?>" onkeyup="total_change()" id="<?=strval($this->setting->keyboard) === '1' ? 'num02' : ''?>" class="total-input Remise " placeholder="N/A"  >

                     

                     
                     
                     <span style="display: none;"  class="float-right"><b id="RemiseValue"></b></span>

                   <?php } else {  ?>
                    
                      <input type="hidden" name="allddd" id="allddd" value="0">
<input type="hidden" value="0" onchange="total_change()" id="<?=strval($this->setting->keyboard) === '1' ? 'num02' : ''?>" class="total-input Remise" placeholder="N/A"  maxlength="5">
                     <span  style="display:none;" class="float-right">Rs.<b id="RemiseValue">0</b></span>
                   
                     <?php } ?>




                      
                       

<input maxlength="10"  style="width: 100%;height: 30px;float:right;background-color:#fff;display: block;padding: 5px;
line-height: 1.42857143;color: #555;text-align: center;background-color: #fff;border: 1px solid #C8D3DF;margin-top: 5px;
-webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,.075);box-shadow: inset 0 1px 1px rgba(0,0,0,.075);-webkit-transition: border-color ease-in-out .15s,-webkit-box-shadow ease-in-out .15s;-o-transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;" type="hidden" value=""   onkeyup="total_changeddish()" id="disamtssh" class="total-input" placeholder="Shipping"  >
                     

                        

                         <?php

                  $payy=mysql_query("select * from payment_mode where status=1 order by id asc ");
                  while($payyf=mysql_fetch_object($payy)) 
                    { ?>
<input type="hidden" id="payment_<?php echo $payyf->id;?>" value="<?php echo $payyf->validate_it;?>">
                  <?php } ?>

          
           <input type="hidden" id="paymentMethod" value="0">
                    
                 
 




 

<div class="form-group CreditCardNum">
            
             <input type="text" class="form-control cc-num" id="CreditCardNum" placeholder="<?=label("CreditCardNum");?>">
           </div>
           <div class="clearfix"></div>
           <div class="form-group CreditCardHold  padding-s"  style="margin: 0 0 0px 0 !important;">
             <input type="text" class="form-control" id="CreditCardHold" placeholder="<?=label("CreditCardHold");?> Name">
           </div>
           
             <input type="hidden" class="form-control" id="CreditCardMonth" value="00">
          
           
             <input type="hidden" class="form-control" id="CreditCardYear" value="0000">
           
           
             <input type="hidden" class="form-control" id="CreditCardCODECV" value="000">
           
           <div class="col-xs-6 form-group ChequeNum nopadding" style="margin: 0 0 0px 0 !important;text-align: center;">
            <b> Ref Num </b><br>   
             <input type="text" name="chequenum" class="form-control" placeholder="Ref Number" id="ChequeNum" >
           </div>


<div class="col-xs-6 ChequeNum table-header nopadding " style="text-align: center;"> 
   
<input onkeyup="return callcc2(this.value,this.id);" value="0" style="margin-left: 3px;text-align: center;" type="hidden" name="recivedamt2" class="form-control" placeholder="Amount" id="recivedamt2" >
</div>

 
 
  <input style="margin-top: 5px;width: 100%;height: 30px;float: right;background-color: #fff;display: block;padding: 5px;
line-height: 1.42857143;
color: #555;
text-align: center;
background-color: #fff;
border: 1px solid #C8D3DF;margin-top: 5px;

-webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
-webkit-transition: border-color ease-in-out .15s,-webkit-box-shadow ease-in-out .15s;
-o-transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;"   type="hidden" value="0" onkeyup="return callcc(this.value,this.id);" name="recivedamt" class="form-control <?=strval($this->setting->keyboard) === '1' ? 'paidk' : ''?>" id="recivedamt" >
  
 
   <tr style=" " >
    
      
      <?php  
if( $this->setting->disc_all ==1)
{
?>

                       <input maxlength="10"  style="width: 100%;height: 30px;float: right;background-color: #fff;display: block;padding: 6px 10px;
line-height: 1.42857143;
color: #555;
text-align: center;
background-color: #fff;
border: 1px solid #C8D3DF;margin-top: 5px;

-webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
-webkit-transition: border-color ease-in-out .15s,-webkit-box-shadow ease-in-out .15s;
-o-transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;" type="hidden" value="<?=$this->setting->discount;?>" onkeyup="total_changeddi()" id="disamtss"    class="total-input  " placeholder="N/A"  >

<?php 
} 
?>

<?php 
      
      if( $this->setting->disc_pro==1)
      {  
      ?>
      <br>
      <span class="float-left"><b id=""><span></span></b></span>
                     <span style=""  ><span id="disamtt"   ></span></span>
                  <?php }
else
{?>
      <span style="display:none" class="float-left"><b id=""><span></span></b></span>
        
        <span style="display:none" class="float-right" ><span id="disamtt"   ></span></span>
                        
                    

   <?php }  ?>

    
    
      <input  value="<?php echo $ssel_custmob;?>"  style="width: 100%;height: 30px;float: right;background-color: #fff;display: block;padding: 6px 10px;
line-height: 1.42857143;
color: #555;
text-align: center;
background-color: #fff;
border: 1px solid #C8D3DF;margin-top: 5px;

-webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
-webkit-transition: border-color ease-in-out .15s,-webkit-box-shadow ease-in-out .15s;
-o-transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;"  type="hidden" name="mobnnm" class="-control" id="mobnnm" />
     
      
         
   <b><span style="margin-right: <?php echo $msk*7;?>%; display: none;" class="float-right" ><span id="Subtot"   ></span></b>

          

 




      <td style="padding: 5px;border: 1px solid #ddd !important;color:red;" class="  text-bold">
        <b><?=label("Total");?></b>

                     <span style="margin-right: <?php echo $msk*7;?>%;font-size: 32px;color: #0052ad;" class="float-right" ><i style="font-size: 25px;" class="fa fa-rupee"></i> <b id="total"></b></span> </td>


                     
                      <h3 style="color:red;margin-top: 0px; display: none;" id="bamacee"  ><i style="font-size: 25px;" class="fa fa-rupee"></i> <span></span> </h3>
                     

    </tr>




               </table>

               <?php if( $this->setting->gst_tax==1)
      {  
      ?>
                 
                     <input type="hidden" value="<?=$this->setting->tax;?>" onchange="total_change()" id="<?=strval($this->setting->keyboard) === '1' ? 'num01' : ''?>" class="total-input TAX" placeholder="N/A"  maxlength="5">

                        <span hidden style="margin-right: <?php echo $msk*$msm*40;?>px;"  class="float-right">Rs.<b id="cgstt" ></b></span>
                     
                     
                     <input type="hidden" value="<?=$this->setting->tax;?>" onchange="total_change()" id="<?=strval($this->setting->keyboard) === '1' ? 'num01' : ''?>" class="total-input TAX" placeholder="N/A"  maxlength="5">
                        <span hidden style="margin-right: <?php echo $msk*$msm*40;?>px;" class="float-right">Rs.<b id="sgstt"></b></span>
                     

      <?php }
      else{ ?>

                 
                     <input type="hidden" value="<?=$this->setting->tax;?>" onchange="total_change()" id="<?=strval($this->setting->keyboard) === '1' ? 'num01' : ''?>" class="total-input TAX" placeholder="N/A"  maxlength="5">
                        <span style="display: none"  class="float-right">Rs.<b id="cgstt" ></b></span>
                    
                    <input type="hidden" value="<?=$this->setting->tax;?>" onchange="total_change()" id="<?=strval($this->setting->keyboard) === '1' ? 'num01' : ''?>" class="total-input TAX" placeholder="N/A"  maxlength="5">
                        <span  style="display: none" class="float-right">Rs.<b id="sgstt"></b></span>
                    
                  <?php } ?>
              
            </div>
            <button style="width: 31%;margin-left: 1.5%;border: 1px solid #B7B7B7 !important;" class="btn btn-red col-md-6 flat-box-btn waves-effect waves-button" type="button" onclick="cancelPOS()" class="btn categories col-md-4 ">

            <h4 class="text-bold"> 
            <i style="color:#fff;" class="fa fa-tachometer"></i>  
            <?=label('CANCEL');?> (F4)</h4></button>&nbsp;
            <button style="width: 31%;margin-left: 0.4%;border: 1px solid #B7B7B7 !important;" type="button" class="btn btn-green col-md-4 flat-box-btn " data-toggle="modal" data-target="#AddSale">
            <h4 class="text-bold"><i style="color:#fff;" class="fa fa-money"></i> <?=label('Exchange');?></h4></button>

<a  onclick="saleBtn(1)" style="width: 31%;margin-left: 0.4%;border: 1px solid #B7B7B7 !important;"  href="javascript:void(0)"  class="btn btn-green col-md-4 flat-box-btn ssf"><h4><i style="color:#fff;" class="fa fa-print"></i> <?=label('Quick Pay & Print');?> (F8)</h4> </a>


         </div>

         <?php } ?>

      </div>



      <div class="col-md-4 right-side "   >
        





       




<?php
if($this->setting->destpp==1)
{
  ?>


           <div class="footer-section">
        
          <div class="table-responsive col-sm-12 totalTab" style="padding-right: 3px; padding-left: 3px;">
            <br>
         
          <table class="table"  style="border: 0px solid #ddd !important;    margin-top: 6px;margin-bottom: 3px !important;" >
            <tr style=" " >
  <?php  if( $this->setting->disc_all ==1)
                  { ?>
                    <input type="hidden" name="allddd" id="allddd" value="1">
                    <td class="" style="width:50%;padding: 5px;font-family:'Roboto', sans-serif;border: 0px solid #ddd !important;" ><b><?=label("Discount");?></b> (%)
                      <input   maxlength="5"  style="width: 100%;height: 35px;float: right;background-color: #fff;display: block;margin-top: 5px;


padding: 6px 10px;
line-height: 1.42857143;
color: #555;
text-align: center;
background-color: #fff;
border: 1px solid #C8D3DF;

-webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
-webkit-transition: border-color ease-in-out .15s,-webkit-box-shadow ease-in-out .15s;
-o-transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;" type="text" value="<?=$ssel_custds;?>" onkeyup="total_change()" id="<?=strval($this->setting->keyboard) === '1' ? 'num02' : ''?>" class="total-input Remise " placeholder="N/A"  >

                     

                     
                     </td>
                           <span style="display: none;"  class="float-right"><b id="RemiseValue"></b></span>

                   <?php } else {  ?>
                    <td class="" style="width:50%;padding: 14px;font-family:'Roboto', sans-serif;border: 0px solid #ddd !important;" > &nbsp;
                      <input type="hidden" name="allddd" id="allddd" value="0">
<input type="hidden" value="0" onchange="total_change()" id="<?=strval($this->setting->keyboard) === '1' ? 'num02' : ''?>" class="total-input Remise" placeholder="N/A"  maxlength="5">
                     <span  style="display:none;" class="float-right">Rs.<b id="RemiseValue">0</b></span>
                   </td>
                     <?php } ?>

                      <td  style="width:50%;padding: 5px;font-family:'Roboto', sans-serif;border: 0px solid #ddd !important;" >
      <b><?=label("Discount");?> Amt</b> 
      <?php  
if( $this->setting->disc_all ==1)
{
?>

                       <input maxlength="10"  style="width: 100%;height: 35px;float: right;background-color: #fff;display: block;padding: 6px 10px;
line-height: 1.42857143;
color: #555;
text-align: center;
background-color: #fff;
border: 1px solid #C8D3DF;margin-top: 5px;

-webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
-webkit-transition: border-color ease-in-out .15s,-webkit-box-shadow ease-in-out .15s;
-o-transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;" type="text" value="<?=$this->setting->discount;?>" onkeyup="total_changeddi()" id="disamtss"   class="total-input  " placeholder="N/A"  >

<?php 
} 
?>

<?php 
      
      if( $this->setting->disc_pro==1)
      {  
      ?>
      <br>
      <span class="float-left"><b id=""><span></span></b></span>
                     <span style=""  ><span id="disamtt"   ></span></span>
                  <?php }
else
{?>
      <span style="display:none" class="float-left"><b id=""><span></span></b></span>
        
        <span style="display:none" class="float-right" ><span id="disamtt"   ></span></span>
                        
                    

   <?php }  ?>

    </td>
  </tr>
  <tr style=" " >
            <td class="" style="padding: 5px; font-family:'Roboto', sans-serif;border: 0px solid #ddd !important;"  width="18%">
                       <b><?=label("Shipping");?></b>
                         <input maxlength="10"  style="width: 100%;height: 35px;float: right;background-color: #fff;display: block;padding: 5px;
line-height: 1.42857143;
color: #555;
text-align: center;
background-color: #fff;
border: 1px solid #C8D3DF;margin-top: 5px;

-webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
-webkit-transition: border-color ease-in-out .15s,-webkit-box-shadow ease-in-out .15s;
-o-transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;" type="text" value="" onkeyup="total_changeddish()" id="disamtssh" class="total-input  "   placeholder="Shipping"  >
                      </td>
                           <td class="" style="padding: 5px;  font-family:'Roboto', sans-serif;border: 0px solid #ddd !important;" ><b><?=label("Mobile");?></b>
      <input  value=""  style="width: 100%;height: 35px;float: right;background-color: #fff;display: block;padding: 6px 10px;
line-height: 1.42857143;
color: #555;
text-align: center;
background-color: #fff;
border: 1px solid #C8D3DF;margin-top: 5px;

-webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
-webkit-transition: border-color ease-in-out .15s,-webkit-box-shadow ease-in-out .15s;
-o-transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;"   type="text" name="mobnnm" class="-control" id="mobnnm" />
     </td>

  </tr>

  <tr>
           <td class="" style="padding: 5px; font-family:'Roboto', sans-serif;border: 0px solid #ddd !important;"  width="18%">

                         <?php

                  $payy=mysql_query("select * from payment_mode where status=1 order by id asc ");
                  while($payyf=mysql_fetch_object($payy)) 
                    { ?>
<input type="hidden" id="payment_<?php echo $payyf->id;?>" value="<?php echo $payyf->validate_it;?>">
                  <?php } ?>

          
           <b> Payment Mode </b>
                    
                  <select  class="form-control"  id="paymentMethod" style="width: 100%;height: 35px;float: right;background-color: #fff;display: block;padding: 5px;
line-height: 1.42857143;
color: #555;
text-align: center;
background-color: #fff;
border: 1px solid #C8D3DF;margin-top: 5px;

-webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
-webkit-transition: border-color ease-in-out .15s,-webkit-box-shadow ease-in-out .15s;
-o-transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;">
<option value="0">Select</option>
                  <?php

                  
                  $payy=mysql_query("select * from payment_mode where status=1 and id!=1  order by id asc ");
                  while($payyf=mysql_fetch_object($payy)) 
                    { ?>
                  <option value="<?=$payyf->id;?>"><?=$payyf->name;?></option>
                  <?php } ?>
                  </select>

                      </td>  
                        <td class="" style="padding: 5px; font-family:'Roboto', sans-serif;border: 0px solid #ddd !important;" > 


<div class="form-group CreditCardNum">
            
             <input type="text" class="form-control cc-num" id="CreditCardNum" placeholder="<?=label("CreditCardNum");?>">
           </div>
           <div class="clearfix"></div>
           <div class="form-group CreditCardHold  padding-s"  style="margin: 0 0 0px 0 !important;">
             <input type="text" class="form-control" id="CreditCardHold" placeholder="<?=label("CreditCardHold");?> Name">
           </div>
           
             <input type="hidden" class="form-control" id="CreditCardMonth" value="00">
          
           
             <input type="hidden" class="form-control" id="CreditCardYear" value="0000">
           
           
             <input type="hidden" class="form-control" id="CreditCardCODECV" value="000">
           
           <div class="col-xs-6 form-group ChequeNum nopadding" style="margin: 0 0 0px 0 !important;text-align: center;">
            <b> Ref Num </b><br>   
             <input type="text" name="chequenum" class="form-control" placeholder="Ref Number" id="ChequeNum" >
           </div>


<div class="col-xs-6 ChequeNum table-header nopadding " style="text-align: center;"> 
<b> Paid </b><br>    
<input onkeyup="return callcc2(this.value,this.id);" value="0" style="margin-left: 3px;text-align: center;" type="text" name="recivedamt2" class="form-control" placeholder="Amount" id="recivedamt2" >
</div>


         </td>

  </tr>
  <tr>
    <td class="" style="padding: 5px; font-family:'Roboto', sans-serif;border: 0px solid #ddd !important;"  width="25%">
  <b><?=label("SubTotal");?></b><br>
   <b><span style="margin-right: <?php echo $msk*7;?>%" class="float-right" ><span id="Subtot"   ></span></b>
</td>
 <td style="padding: 5px;border: 0px solid #ddd !important;color:#0052ad;" class="  text-bold">
        <b><?=label("Total");?></b>

                     <span style="margin-right: <?php echo $msk*7;?>%;font-size: 32px;color: #0052ad;" class="float-right" ><i style="font-size: 25px;" class="fa fa-rupee"></i> <b id="total"></b></span> </td>
  </tr>

  <tr style=" " >


<td class="" style="padding: 5px; font-family:'Roboto', sans-serif;border: 0px solid #ddd !important;"  width="20%"><b><?=label("paidcash");?>(F7)</b>
  <input style="margin-top: 5px;width: 100%;height: 35px;float: right;background-color: #fff;display: block;padding: 5px;
line-height: 1.42857143;
color: #555;
text-align: center;
background-color: #fff;
border: 1px solid #C8D3DF;margin-top: 5px;

-webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
-webkit-transition: border-color ease-in-out .15s,-webkit-box-shadow ease-in-out .15s;
-o-transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;"   type="text" value="0" onkeyup="return callcc(this.value,this.id);" name="recivedamt" class="form-control <?=strval($this->setting->keyboard) === '1' ? 'paidk' : ''?>" id="recivedamt" >
  
</td>
 <td  style="padding: 5px;text-align: left;border-top: 0px solid #ddd;">
                      <b  style="padding: 5px;color: red;"><?=label("Balanceamt");?></b>
                      <h3 style="color:red;margin-top: 0px;text-align: right;" id="bamacee"  ><i style="font-size: 25px;" class="fa fa-rupee"></i> <span></span> </h3>
                     </td>
</tr>

               <?php if( $this->setting->gst_tax==1)
      {  
      ?>
                 
                     <input type="hidden" value="<?=$this->setting->tax;?>" onchange="total_change()" id="<?=strval($this->setting->keyboard) === '1' ? 'num01' : ''?>" class="total-input TAX" placeholder="N/A"  maxlength="5">

                        <span hidden style="margin-right: <?php echo $msk*$msm*40;?>px;"  class="float-right">Rs.<b id="cgstt" ></b></span>
                     
                     
                     <input type="hidden" value="<?=$this->setting->tax;?>" onchange="total_change()" id="<?=strval($this->setting->keyboard) === '1' ? 'num01' : ''?>" class="total-input TAX" placeholder="N/A"  maxlength="5">
                        <span hidden style="margin-right: <?php echo $msk*$msm*40;?>px;" class="float-right">Rs.<b id="sgstt"></b></span>
                     

      <?php }
      else{ ?>

                 
                     <input type="hidden" value="<?=$this->setting->tax;?>" onchange="total_change()" id="<?=strval($this->setting->keyboard) === '1' ? 'num01' : ''?>" class="total-input TAX" placeholder="N/A"  maxlength="5">
                        <span style="display: none"  class="float-right">Rs.<b id="cgstt" ></b></span>
                    
                    <input type="hidden" value="<?=$this->setting->tax;?>" onchange="total_change()" id="<?=strval($this->setting->keyboard) === '1' ? 'num01' : ''?>" class="total-input TAX" placeholder="N/A"  maxlength="5">
                        <span  style="display: none" class="float-right">Rs.<b id="sgstt"></b></span>
                    
                  <?php } ?>



</table>
               <br>

             


            </div>


        
<button style="width: 45%;margin-left: 3%;margin-top: 4%;border: 1px solid #B7B7B7 !important;" class="btn btn-red col-md-6 flat-box-btn waves-effect waves-button" type="button" onclick="cancelPOS()" class="btn categories col-md-4 ">

            <h4 class="text-bold"> 
            <i style="color:#fff;" class="fa fa-tachometer"></i>  
            <?=label('CANCEL');?> (F4)</h4></button>&nbsp;

            <button style="width: 45%;margin-left: 3%;margin-top: 4%;border: 1px solid #B7B7B7 !important;" type="button" class="btn btn-green col-md-4 flat-box-btn " data-toggle="modal" data-target="#AddSale">
            <h4 class="text-bold"><i style="color:#fff;" class="fa fa-money"></i> <?=label('Exchange');?> </h4></button>


<a   onclick="saleBtn(1)" style="width: 56%;margin-left: 24%;margin-top: 4%;border: 1px solid #B7B7B7 !important;"  href="javascript:void(0)"  class="btn btn-green col-md-4 flat-box-btn ssf"><h4><i style="color:#fff;" class="fa fa-print"></i> <?=label('Quick Pay & Print');?> (F8)</h4> </a>




   
   


         </div>
               

               
               <?php 
             } 

if($this->setting->destpp!=1)
{
  ?>

 <div class="row row-horizon" >
                  <span class="categories selectedGat" id=""><i style="font-size:18px;" class="fa fa-home"></i></span>
                  <?php foreach ($categories as $category):?>
                     <span class="categories" id="<?=$category->id;?>"><?=$category->name;?></span>
                  <?php endforeach;?>
               </div>
<div id="productList2" style="padding-left: 2px;padding-right: 10px;font-family: 'Roboto slab', serif;margin-top: 2px;font-weight: 600;">


<?php }else{ ?>
  <div id="" style="padding-left: 2px;padding-right: 10px;font-family: 'Roboto slab', serif;margin-top: 2px;font-weight: 600;">
    <?php }


    if($this->setting->destpp==0)
{ ?>



         <div class="col-sm-12" style="padding-right: 6px;padding-left: 1px;">
                  <div id="searchContaner">
                      <div class="input-group stylish-input-group" style="width:100%;">
                          <input type="text" id="searchProd" style="border: 1px solid #ccc;" class="form-control" placeholder="Search" autocomplete="off">
                          
                      </div>
                  </div>
              </div>
            <?php 
          }
          
            ?>
       
      




<?php


             

if($this->setting->destpp!=1)
{
  ?>

 <div class="row row-horizon" >
                  <span class="categories selectedGat" id="">All</span>
                  <?php foreach ($categories as $category):?>
                     <span class="categories" id="<?=$category->id;?>"><?=$category->name;?></span>
                  <?php endforeach;?>
               </div>
<div id="productList2" style="padding-left: 2px;padding-right: 10px;margin-top: 2px;font-weight: 600;">


<?php }else{ ?>
  <div id="" style="padding-left: 2px;padding-right: 10px;margin-top: 2px;font-weight: 600;">
    <?php }


    if($this->setting->destpp==0)
{ ?>



          
            <?php 
          }
$categxx=mysql_query("select * from products where statuss=0 order by  name asc ");
/*$categxx=mysql_query("CALL getproductsdata()");*/
while($product=mysql_fetch_object($categxx))
{
               $cheked = true;
               $invis = $product->h_stores;
               $invis = trim($invis, ",");
               $array = explode(',', $invis); //split string into array seperated by ', '
               foreach($array as $value) //loop over values
               {
                  $cheked = $value == $this->store ? false : $cheked;
               }
               if($cheked) {


/*@$omssv=mysql_fetch_array(mysql_query("select * from stocks where store_id='".$this->session->userdata('store')."'  and product_id ='".$product->id."'  "));*/

if($this->setting->disc_all==1)
{
  if($sellrr==0)
{ 

  $new_price_store_org=$product->price;
  $mnmz=0;
}
else
{ 
$olloo_nn=mysql_fetch_array(mysql_query("select pp_pro_price from price_marterr where  pp_pro_id ='".$product->id."' and  pp_price_type ='".$sellrr."' "));   
if($olloo_nn['pp_pro_price'])
{  
   $new_price_store_org=floatval($olloo_nn['pp_pro_price']);
   $mnmz=0;
}
else
{
  $new_price_store_org=$product->price;
  $mnmz=0;
}    
}

}
else
{




if($sellrr==0)
{ 

  $new_price_store_org=$product->price-($product->descountperr*$product->price)/100;
   $mnmz=($product->descountperr*$new_price_store_org)/100;
}
else
{ 
$olloo_nn=mysql_fetch_array(mysql_query("select pp_pro_price from price_marterr where  pp_pro_id ='".$product->id."' and  pp_price_type ='".$sellrr."' "));   
if($olloo_nn['pp_pro_price'])
{  
   $new_price_store_org=floatval($olloo_nn['pp_pro_price'])-($product->descountperr*floatval($olloo_nn['pp_pro_price']))/100;
      $mnmz=($product->descountperr*$new_price_store_org)/100;
}
else
{
  $new_price_store_org=$product->price-($product->descountperr*$product->price)/100;
   $mnmz=($product->descountperr*$new_price_store_org)/100;
}    
}
}




 $new_price_store =!$product->taxmethod || $product->taxmethod == '0' ? floatval($new_price_store_org) : floatval($new_price_store_org)*(1 + $tg / 100);


if($this->setting->destpp==1)
{
  ?>



 <div style="display: none;" >
                    

                        <div class="product flat-box">
                           
                           <input type="hidden" id="idname-<?=$product->id;?>" name="name" value="<?=$product->name;?>" />
                           <input type="hidden" id="idprice-<?=$product->id;?>" name="price" value="<?=$new_price_store;?>" />
                           <input type="hidden" id="category" name="category" value="<?=$product->category;?>" />
                           <input type="hidden" id="dispp-<?=$product->id;?>" name="dispp" value="<?=$product->descountperr;?>" />
                           <input type="hidden" id="disamt-<?=$product->id;?>" name="disamt" value="<?=$mnmz;?>" />
                           
                           
                       


                        </div>
                        

               </div>
               

               

               
               <?php 
             } 
               else if($this->setting->destpp==2)
                {

                  ?>
                  
                  <div class="col-sm-3 col-xs-3" style="padding: 2px;">
                     <button style="width: 100%;border: 0px;padding-left: 0px;height: 140px;padding-right: 0px;background: transparent;border: 1px solid #d0d1d3;"    class="addPct" id="product-<?=$product->code;?>"

                     <?php if($product->batchwiseupdate==1){ ?> onclick="education_fields_prod('<?=$product->id;?>')"  <?php } else { ?>   onclick="add_posalenk('<?=$product->id;?>')"  <?php } ?> >


                        <div class="product flat-box">
                           
                           <input type="hidden" id="idname-<?=$product->id;?>" name="name" value="<?=$product->name;?>" />
                           <input type="hidden" id="idprice-<?=$product->id;?>" name="price" value="<?=$new_price_store;?>" />
                           <input type="hidden" id="category" name="category" value="<?=$product->category;?>" />
                           <input type="hidden" id="dispp-<?=$product->id;?>" name="dispp" value="<?=$product->descountperr;?>" />
                           <input type="hidden" id="disamt-<?=$product->id;?>" name="disamt" value="<?=$mnmz;?>" />
                           
                           
                           <?php if($product->photo){ ?><img src="<?=base_url()?>files/products/<?=$product->photo;?>" alt="<?=$product->name;?>"><?php }else{ 
                           ?>
                           <img src="<?=base_url()?>files/products/noimage.png" alt="<?=$product->name;?>">
                           
                           <?php } ?>

                        </div>
                         <span  class="ng-binding"><?php echo  substr($product->name,0,15);?></span>
                     </button>
               </div>
               
               
            <?php  }
            else
                {

                  $tg= $product->tax+$product->sgst;

$pro_new_price=$new_price_store_org;
$orgprice=$product->price;


$pr_org_price =!$product->taxmethod || $product->taxmethod == '0' ? floatval($pro_new_price) : floatval($pro_new_price)*(1 + $tg / 100);


if($product->offer_id>0)
{
$pro_new_price=$product->offer_price;
}


$new_price_store =!$product->taxmethod || $product->taxmethod == '0' ? floatval($new_price_store_org) : floatval($new_price_store_org)*(1 + $tg / 100);

?>

                  <div class="col-sm-12 " style="padding-right: 6px;padding-left: 1px;">
                     <a href="javascript:void(0)" class="addPct" id="product-<?=$product->code;?>"

                     <?php if($product->batchwiseupdate==1){ ?> onclick="education_fields_prod('<?=$product->id;?>')"  <?php } else { ?>   onclick="add_posalenk('<?=$product->id;?>')"  <?php } ?> >


                        <div  style="   border: 1px solid #c8d1db;    background: linear-gradient(to bottom, #ffffff 0%,#eeeeee 100%);
    width: 100%;
    border-radius: 0px;
    text-align: left;
    background-size: cover;
    margin-top: 2px;
   
    overflow: hidden;">
<h3 style="margin-top: 7px;font-size: 15px;font-weight: bold; color: #000; margin-left: 5px;" id="proname"><?=$product->name;?>
  <?php




if($product->offer_id>0)
{

?>
<span style="color:#358ee0;" ><strike >
<?=number_format((float)$pr_org_price, $this->setting->decimals, '.', '');?></strike></span>

<?php } ?>

<span style="color:#ff0000;float: right;" >
  -Rs.<?=number_format((float)$pro_new_price, $this->setting->decimals, '.', '');?></span>




<?php
if($this->setting->expi==1)
{

$expire_1m='';
if($product->expire_1m!='' && $product->expire_1m!=0)
{
$expire_1m=date("d-m-Y",strtotime($product->expire_1m));
}
  
?>
<span style="color:#489103;float: right;font-size: 10px;" ><?=$expire_1m;?></span>
<?php } ?>

</h3>



                            <input type="hidden" id="idname-<?=$product->id;?>" name="name" value="<?=$product->name;?>" />
                           <input type="hidden" id="idprice-<?=$product->id;?>" name="price" value="<?=$new_price_store;?>" />
                           <input type="hidden" id="category" name="category" value="<?=$product->category;?>" />
                           <input type="hidden" id="dispp-<?=$product->id;?>" name="dispp" value="<?=$product->descountperr;?>" />
                           <input type="hidden" id="disamt-<?=$product->id;?>" name="disamt" value="<?=$mnmz;?>" />
                        </div>
                     </a>
               </div>

               
            <?php  } 
             

            }
            }
            ?>




   </div>
   </div>
</div>
  </div>
<!-- /.container -->
<script type="text/javascript">


function exefunction(cc)
{

var lfckv = document.getElementById("ckks-"+cc).checked;
if(lfckv==true)
{
var bb=$('#subtot-'+cc).text();

var dsper=$('.Remise').val();

var vv=parseFloat(dsper ? dsper : 0)*0.01;

var dstt=$('#RemiseValue').text();
var ltot=$('#Subtot').text();
var k1=parseFloat(bb)*parseFloat(vv);
var sgstt=document.getElementById("sgstt").innerHTML;
var cgstt=document.getElementById("cgstt").innerHTML;
var k2=parseFloat(dstt)+parseFloat(k1);
var k3=parseFloat(ltot)-parseFloat(k2)+parseFloat(cgstt)+parseFloat(sgstt);
     $('#RemiseValue').text(k2.toFixed(<?=$this->setting->decimals;?>));
      $('#total').text(k3.toFixed(<?=$this->setting->decimals;?>));
      $('#Paid').val(k3.toFixed(<?=$this->setting->decimals;?>));
      $('#Paidd').val(k3.toFixed(<?=$this->setting->decimals;?>));
      $('#TotalModal').text('<?=label("Total");?>Rs.'+k3.toFixed(<?=$this->setting->decimals;?>));
}
else
{
  var bb=$('#subtot-'+cc).text();
var dsper=$('.Remise').val();

var vv=parseFloat(dsper ? dsper : 0)*0.01;
var dstt=$('#RemiseValue').text();
var ltot=$('#Subtot').text();

var k1=parseFloat(bb)*parseFloat(vv);

 var sgstt=document.getElementById("sgstt").innerHTML;
     var cgstt=document.getElementById("cgstt").innerHTML;




var k2=parseFloat(dstt)-parseFloat(k1);

var k3=parseFloat(ltot)-parseFloat(k2);
var k3=parseFloat(ltot)-parseFloat(k2)+parseFloat(cgstt)+parseFloat(sgstt);


     $('#RemiseValue').text(k2.toFixed(<?=$this->setting->decimals;?>));
      $('#total').text(k3.toFixed(<?=$this->setting->decimals;?>));
      $('#Paid').val(k3.toFixed(<?=$this->setting->decimals;?>));
      $('#Paidd').val(k3.toFixed(<?=$this->setting->decimals;?>));
      $('#TotalModal').text('<?=label("Total");?>Rs.'+k3.toFixed(<?=$this->setting->decimals;?>));
}

window.setTimeout(slowAlert, 1113800);

}

$(document).ready(function() {
    var timeNow = new Date();
  var hours   = timeNow.getHours();
  var minutes = timeNow.getMinutes();
  var seconds = timeNow.getSeconds();
  var rerr = parseInt(hours*60*60) + parseInt(minutes* 60) + parseInt(seconds); 
 

   $('#productList').load("<?php echo site_url('pos/load_posales')?>/0");
   $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);

   
   $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");
   $('.holdList').load("<?php echo site_url('pos/holdList/'.$this->register)?>");
   $('#cgstt').load("<?php echo site_url('pos/calcgst')?>", null, total_change);
   $('#sgstt').load("<?php echo site_url('pos/calsgst')?>", null, total_change);

 disxn();

   $('.Paid').show();
   $('.Paidd').show();
   $('.ReturnChange').show();
   $('.CreditCardNum').hide();
   $('.CreditCardHold').hide();
   $('.ChequeNum').hide();
   $('.stripe-btn').hide();



   $("#paymentMethod").change(function(){


       $('#ChequeNum').attr('readonly', false);
       $('#recivedamt2').attr('readonly', false);


       $('#ChequeNum').val(0);
       $('#recivedamt2').val(0);



var p_met = $(this).find('option:selected').val();
var custiid = $('#customerSelect').find('option:selected').val();

if(p_met==10 && custiid>0)
{
  document.getElementById("creddate").readOnly = false; 
}
else
{
  $('#creddate').val('');
document.getElementById("creddate").readOnly = true;  
}

      if (p_met === '1' ||  p_met === '0') {
         $('.Paid').show();
         $('.ReturnChange').show();
         $('.CreditCardNum').hide();
         $('.CreditCardHold').hide();
         $('.CreditCardMonth').hide();
         $('.CreditCardYear').hide();
         $('.CreditCardCODECV').hide();
         $('#CreditCardNum').val('');
         $('#CreditCardHold').val('');
         $('#CreditCardYear').val('');
         $('#CreditCardMonth').val('');
         $('#CreditCardCODECV').val('');
         $('.stripe-btn').hide();
         $('.ChequeNum').hide();
      } else if (p_met === '2') {
        
         $('.Paid').show();
         
         $('.CreditCardNum').show();
         $('.CreditCardHold').show();
         $('.CreditCardMonth').show();
         $('.CreditCardYear').show();
         $('.CreditCardCODECV').show();
         $('.stripe-btn').show();
         $('.ChequeNum').show();
      } 
      else if (p_met === '4') 
      {

          var idc = $('#customerSelect').find('option:selected').val();
          if(idc==0)
          {
            var ggg=$('#paymentMethod').html();
            $('#paymentMethod').html(ggg);
             swal("Please select customer");
             return false;
          }

  $.ajax({
      url : "<?php echo site_url('pos/getcustomer_credit')?>/"+idc,
      type: "POST",
      //dataType: "JSON",
      success: function(data)
      {
       var values = data.split('~');


       $('#ChequeNum').attr('readonly', true);
       $('#recivedamt2').attr('readonly', true);


       $('#ChequeNum').val(values[0]);
       $('#recivedamt2').val(values[1]);

     
       
       disxn();
      },
      error: function (jqXHR, textStatus, errorThrown)
      {
         alert("Please reload this page");
      }
  });

         // $('.Paid').hide();
         $('.ReturnChange').hide();
         $('.CreditCardNum').hide();
         $('.CreditCardHold').hide();
         $('.CreditCardMonth').hide();
         $('.CreditCardYear').hide();
         $('.CreditCardCODECV').hide();
         $('#CreditCardNum').val('');
         $('#CreditCardHold').val('');
         $('#CreditCardYear').val('');
         $('#CreditCardMonth').val('');
         $('#CreditCardCODECV').val('');
         $('.stripe-btn').hide();
         $('.ChequeNum').show();
      } 
      else 
      {
        // $('.Paid').hide();
         $('.ReturnChange').hide();
         $('.CreditCardNum').hide();
         $('.CreditCardHold').hide();
         $('.CreditCardMonth').hide();
         $('.CreditCardYear').hide();
         $('.CreditCardCODECV').hide();
         $('#CreditCardNum').val('');
         $('#CreditCardHold').val('');
         $('#CreditCardYear').val('');
         $('#CreditCardMonth').val('');
         $('#CreditCardCODECV').val('');
         $('.stripe-btn').hide();
         $('.ChequeNum').show();
      }


   });
   /********************************* Credit Card infos section ****************************************/
   $('#CreditCardNum').validateCreditCard(function(result) {
      var cardtype = result.card_type == null ? '-' : result.card_type.name;
      $('.CreditCardNum i').removeClass('dark-blue');
      $('#' + cardtype).addClass('dark-blue');
   });

   $('#CreditCardNum').keypress(function (e) {
      var data = $(this).val();
      if(data.length > 22){

       if (e.keyCode == 13) {
           e.preventDefault();

           var c = new SwipeParserObj(data);

               $('#CreditCardNum').val(c.account);
               $('#CreditCardHold').val(c.account_name);
               $('#CreditCardYear').val(c.exp_year);
               $('#CreditCardMonth').val(c.exp_month);
               $('#CreditCardCODECV').val('');

           }
           else {
               $('#CreditCardNum').val('');
               $('#CreditCardHold').val('');
               $('#CreditCardYear').val('');
               $('#CreditCardMonth').val('');
               $('#CreditCardCODECV').val('');
           }

           $('#CreditCardCODECV').focus();
           $('#CreditCardNum').validateCreditCard(function(result) {
              var cardtype = result.card_type == null ? '-' : result.card_type.name;
              $('.CreditCardNum i').removeClass('dark-blue');
              $('#' + cardtype).addClass('dark-blue');
           });
   }

   });


   // ********************************* change calculations
   $('#Paid').on('keyup',function() {
      var change = -(parseFloat($('#total').text()) - parseFloat($(this).val()));
      if(change < 0){
         $('#ReturnChange span').text(change.toFixed(<?=$this->setting->decimals;?>));
         $('#ReturnChange span').addClass( "red" );
         $('#ReturnChange span').removeClass( "light-blue" );
      }else{
         $('#ReturnChange span').text(change.toFixed(<?=$this->setting->decimals;?>));
         $('#ReturnChange span').removeClass( "red" );
         $('#ReturnChange span').addClass( "light-blue" );
      }
    });



    //  search product
   $("#searchProd").keyup(function(){
      // Retrieve the input field text
      var filter = $(this).val();
      // Loop through the list
      $("#productList2 #proname").each(function(){
         // If the list item does not contain the text phrase fade it out
         if ($(this).text().search(new RegExp(filter, "i")) < 0) {
             $(this).parent().parent().parent().hide();
         // Show the list item if the phrase matches
         } else {
             $(this).parent().parent().parent().show();
         }
      });
   });
});
// barcode scanner
function barcode(){
   var code = $('.barcode').val();
   $.ajax({
       url : "<?php echo site_url('pos/findproduct')?>/"+code,
       type: "POST",
       dataType: "JSON",
       success: function(data)
       {
          add_posale(data);
          $('.barcode').val('');
       },
       error: function (jqXHR, textStatus, errorThrown)
       {
          alert("Please reload this page");
       }
   });
   return false;
};

function barcodecx(){


   var code = $('#searchProd').val();
   
   $.ajax({
       url : "<?php echo site_url('pos/findproduct')?>/"+code,
       type: "POST",
       dataType: "JSON",
       success: function(data)
       {
      

          add_posalenk(data);
            
 

          
       },
       error: function (jqXHR, textStatus, errorThrown)
       {
         $('#searchProd').val('');
  $('#searchProd').focus();
  $('#productList2 div').css('display','block');
          alert("Please reload this page");
       }
   });
   return false;
};

//  **********************select categorie

$(".categories").on("click", function () {
   // Retrieve the input field text
   var filter = $(this).attr('id');
   $(this).parent().children().removeClass('selectedGat');

   $(this).addClass('selectedGat');
   // Loop through the list
   $("#productList2 #category").each(function(){
      // If the list item does not contain the text phrase fade it out
      if ($(this).val().search(new RegExp(filter, "i")) < 0) {
         $(this).parent().parent().parent().hide();
         // Show the list item if the phrase matches
      } else {
         $(this).parent().parent().parent().show();
      }
   });
});
// function to calculate a percentage from a number
function percentage(tot, n) {
   var perc;
   perc = ((parseFloat(tot) * (parseFloat(n ? n : 0)*0.01)));
   return perc;
}
// function to calculate the total number
function total_change() {

   var tot;

   if ( ($('.TAX').val().indexOf('%') == -1) && ($('.Remise').val().indexOf('%') != -1) ) 
   {
    
      tot = parseFloat($('#Subtot').text().replace(/ /g,'')) + parseFloat($('.TAX').val() ? $('.TAX').val() : 0);
     
      $('#taxValue').text('<?=$this->setting->currency;?>');
      $('#RemiseValue').text('<?=$this->setting->currency;?>');
      tot = tot - parseFloat($('.Remise').val() ? $('.Remise').val() : 0);
      $('#total').text(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paid').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paidd').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#TotalModal').text('<?=label("Total");?>Rs. '+tot.toFixed(<?=$this->setting->decimals;?>));
   }else if ( ($('.TAX').val().indexOf('%') != -1) && ($('.Remise').val().indexOf('%') == -1) ) {
   
      tot = parseFloat($('#Subtot').text()) + percentage($('#Subtot').text(), $('.TAX').val());
      $('#taxValue').text(percentage($('#Subtot').text(), $('.TAX').val()).toFixed(<?=$this->setting->decimals;?>) + ' <?=$this->setting->currency;?>');
      $('#RemiseValue').text('<?=$this->setting->currency;?>');
      tot = tot - parseFloat($('.Remise').val() ? $('.Remise').val() : 0);
      $('#total').text(tot.toFixed(<?=$this->setting->decimals;?>));
     
      $('#Paid').val(tot.toFixed(<?=$this->setting->decimals;?>));
       $('#Paidd').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#TotalModal').text('<?=label("Total");?> Rs.'+tot.toFixed(<?=$this->setting->decimals;?>));
   }else if ( ($('.TAX').val().indexOf('%') != -1) && ($('.Remise').val().indexOf('%') != -1) ) {
 

      tot = parseFloat($('#Subtot').text()) + percentage($('#Subtot').text(), $('.TAX').val());
      $('#taxValue').text(percentage($('#Subtot').text(), $('.TAX').val()).toFixed(<?=$this->setting->decimals;?>) + ' <?=$this->setting->currency;?>');
      tot = tot - percentage($('#Subtot').text(), $('.Remise').val());
     
      $('#RemiseValue').text(percentage($('#Subtot').text(), $('.Remise').val()).toFixed(<?=$this->setting->decimals;?>));
      $('#total').text(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paid').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paidd').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#TotalModal').text('<?=label("Total");?>Rs.'+tot.toFixed(<?=$this->setting->decimals;?>));
   }

   else if ( ($('.TAX').val().indexOf('%') == -1)  && ($('.Remise').val().indexOf('%') == -1) ) 
   {
      tot = parseFloat($('#Subtot').text()) + parseFloat($('.TAX').val() ? $('.TAX').val() : 0);
       var tt=$('.Remise').val();
      var shiptt=$('#disamtssh').val();
      if(shiptt>0)
      {
        shiptt=shiptt;
      }
      else
      {
        shiptt=0;
      }


      
      tot = tot - percentage($('#Subtot').text(), $('.Remise').val());
      $('#taxValue').text('<?=$this->setting->currency;?>');
     var cghh= $('#cgstt').text();     
     var sghh= $('#sgstt').text();
     var gsttot=parseFloat(cghh)+parseFloat(sghh);
  tot=parseFloat(tot)+parseFloat(shiptt)+parseFloat(gsttot);
     
     var tyxz=percentage($('#Subtot').text(), $('.Remise').val());
     $('#bamacee span').text("-"+tot.toFixed(<?=$this->setting->decimals;?>));
     $('#disamtss').val(tyxz.toFixed(<?=$this->setting->decimals;?>));
      
      $('#RemiseValue').text(percentage($('#Subtot').text(), $('.Remise').val()).toFixed(<?=$this->setting->decimals;?>) );
      $('#total').text(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paid').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paidd').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#TotalModal').text('<?=label("Total");?> Rs.'+tot.toFixed(<?=$this->setting->decimals;?>));
   }
}

function total_changeddi() 
{

   var tot;

   if ( ($('.TAX').val().indexOf('%') == -1) && ($('.Remise').val().indexOf('%') != -1) ) 
   {
    
      tot = parseFloat($('#Subtot').text().replace(/ /g,'')) + parseFloat($('.TAX').val() ? $('.TAX').val() : 0);
     
      $('#taxValue').text('<?=$this->setting->currency;?>');
      $('#RemiseValue').text('<?=$this->setting->currency;?>');
      tot = tot - parseFloat($('.Remise').val() ? $('.Remise').val() : 0);
      $('#total').text(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paid').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paidd').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#TotalModal').text('<?=label("Total");?>Rs. '+tot.toFixed(<?=$this->setting->decimals;?>));
   }else if ( ($('.TAX').val().indexOf('%') != -1) && ($('.Remise').val().indexOf('%') == -1) ) {
   
      tot = parseFloat($('#Subtot').text()) + percentage($('#Subtot').text(), $('.TAX').val());
      $('#taxValue').text(percentage($('#Subtot').text(), $('.TAX').val()).toFixed(<?=$this->setting->decimals;?>) + ' <?=$this->setting->currency;?>');
      $('#RemiseValue').text('<?=$this->setting->currency;?>');
      tot = tot - parseFloat($('.Remise').val() ? $('.Remise').val() : 0);
      $('#total').text(tot.toFixed(<?=$this->setting->decimals;?>));
     
      $('#Paid').val(tot.toFixed(<?=$this->setting->decimals;?>));
       $('#Paidd').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#TotalModal').text('<?=label("Total");?> Rs.'+tot.toFixed(<?=$this->setting->decimals;?>));
   }else if ( ($('.TAX').val().indexOf('%') != -1) && ($('.Remise').val().indexOf('%') != -1) ) {
 

      tot = parseFloat($('#Subtot').text()) + percentage($('#Subtot').text(), $('.TAX').val());
      $('#taxValue').text(percentage($('#Subtot').text(), $('.TAX').val()).toFixed(<?=$this->setting->decimals;?>) + ' <?=$this->setting->currency;?>');
      tot = tot - percentage($('#Subtot').text(), $('.Remise').val());
     
      $('#RemiseValue').text(percentage($('#Subtot').text(), $('.Remise').val()).toFixed(<?=$this->setting->decimals;?>));
      $('#total').text(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paid').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paidd').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#TotalModal').text('<?=label("Total");?>Rs.'+tot.toFixed(<?=$this->setting->decimals;?>));
   }

   else if ( ($('.TAX').val().indexOf('%') == -1)  && ($('.Remise').val().indexOf('%') == -1) ) {
    var vvp=$('#disamtss').val();
    if(vvp>0)
    {
     var dtot =  parseFloat(vvp); 
    }
    else
    {
      var dtot =  0;
      $('#disamtss').val(0);
    }

     var kvvp=$('#disamtssh').val();
    if(kvvp>0)
    {
     var kdtot =  parseFloat(kvvp); 
    }
    else
    {
      var kdtot =  0;
     
    }

    
      tot = parseFloat($('#Subtot').text()) + parseFloat($('.TAX').val() ? $('.TAX').val() : 0);
      $('.Remise').val('0');
      
      tot = tot - parseFloat(dtot)+ parseFloat(kdtot);
      
      $('#taxValue').text('<?=$this->setting->currency;?>');
     var cghh= $('#cgstt').text();     
     var sghh= $('#sgstt').text();
     var gsttot=parseFloat(cghh)+parseFloat(sghh);
     tot=parseFloat(tot)+parseFloat(gsttot);
      
      $('#RemiseValue').text(dtot.toFixed(<?=$this->setting->decimals;?>));
      $('#total').text(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paid').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paidd').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#TotalModal').text('<?=label("Total");?> Rs.'+tot.toFixed(<?=$this->setting->decimals;?>));
   }
}

function total_changeddish() 
{

   var tot;

   if ( ($('.TAX').val().indexOf('%') == -1) && ($('.Remise').val().indexOf('%') != -1) ) 
   {
    
      tot = parseFloat($('#Subtot').text().replace(/ /g,'')) + parseFloat($('.TAX').val() ? $('.TAX').val() : 0);
     
      $('#taxValue').text('<?=$this->setting->currency;?>');
      $('#RemiseValue').text('<?=$this->setting->currency;?>');
      tot = tot - parseFloat($('.Remise').val() ? $('.Remise').val() : 0);
      $('#total').text(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paid').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paidd').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#TotalModal').text('<?=label("Total");?>Rs. '+tot.toFixed(<?=$this->setting->decimals;?>));
   }else if ( ($('.TAX').val().indexOf('%') != -1) && ($('.Remise').val().indexOf('%') == -1) ) {
   
      tot = parseFloat($('#Subtot').text()) + percentage($('#Subtot').text(), $('.TAX').val());
      $('#taxValue').text(percentage($('#Subtot').text(), $('.TAX').val()).toFixed(<?=$this->setting->decimals;?>) + ' <?=$this->setting->currency;?>');
      $('#RemiseValue').text('<?=$this->setting->currency;?>');
      tot = tot - parseFloat($('.Remise').val() ? $('.Remise').val() : 0);
      $('#total').text(tot.toFixed(<?=$this->setting->decimals;?>));
     
      $('#Paid').val(tot.toFixed(<?=$this->setting->decimals;?>));
       $('#Paidd').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#TotalModal').text('<?=label("Total");?> Rs.'+tot.toFixed(<?=$this->setting->decimals;?>));
   }else if ( ($('.TAX').val().indexOf('%') != -1) && ($('.Remise').val().indexOf('%') != -1) ) {
 

      tot = parseFloat($('#Subtot').text()) + percentage($('#Subtot').text(), $('.TAX').val());
      $('#taxValue').text(percentage($('#Subtot').text(), $('.TAX').val()).toFixed(<?=$this->setting->decimals;?>) + ' <?=$this->setting->currency;?>');
      tot = tot - percentage($('#Subtot').text(), $('.Remise').val());
     
      $('#RemiseValue').text(percentage($('#Subtot').text(), $('.Remise').val()).toFixed(<?=$this->setting->decimals;?>));
      $('#total').text(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paid').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paidd').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#TotalModal').text('<?=label("Total");?>Rs.'+tot.toFixed(<?=$this->setting->decimals;?>));
   }

   else if ( ($('.TAX').val().indexOf('%') == -1)  && ($('.Remise').val().indexOf('%') == -1) ) {
    var vvp=$('#disamtssh').val();
    if(vvp>0)
    {
     var dtot =  parseFloat(vvp); 
    }
    else
    {
      var dtot =  0;
      $('#disamtssh').val(0);
    }

   var rmsss= $('#RemiseValue').text();
   var rmdfgff= $('#disamtt').text();
    
      tot = parseFloat($('#Subtot').text()) + parseFloat($('.TAX').val() ? $('.TAX').val() : 0);
      var tt=$('.Remise').val();
      
      tot = tot + parseFloat(dtot)-parseFloat(rmsss)-parseFloat(rmdfgff);
      
      $('#taxValue').text('<?=$this->setting->currency;?>');
     var cghh= $('#cgstt').text();     
     var sghh= $('#sgstt').text();
     var gsttot=parseFloat(cghh)+parseFloat(sghh);
     tot=parseFloat(tot)+parseFloat(gsttot);
      
      
      $('#total').text(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paid').val(tot.toFixed(<?=$this->setting->decimals;?>));
      $('#Paidd').val(tot.toFixed(<?=$this->setting->decimals;?>));
     
      $('#bamacee span').text("-"+tot.toFixed(<?=$this->setting->decimals;?>));

      $('#TotalModal').text('<?=label("Total");?> Rs.'+tot.toFixed(<?=$this->setting->decimals;?>));
   }
}


function delete_posale(id)
{
  var idc = $('#customerSelect').find('option:selected').val();

  // ajax delete data to database
  $.ajax({
      url : "<?php echo site_url('pos/delete')?>/"+id,
      type: "POST",
      dataType: "JSON",
      success: function(data)
      {
        $('#productList').load("<?php echo site_url('pos/load_posales')?>/"+idc);
         $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");
         $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);
         $('#cgstt').load("<?php echo site_url('pos/calcgst')?>", null, total_change);
         $('#sgstt').load("<?php echo site_url('pos/calsgst')?>", null, total_change);
         disxn();
      },
      error: function (jqXHR, textStatus, errorThrown)
      {
         alert("Please reload this page");
      }
  });

}

/********************************** Hold functions ************************************/
function AddHold()
{
  var id = $('#customerSelect').find('option:selected').val();
  $.ajax({
      url : "<?php echo site_url('pos/AddHold')?>/<?=$this->register?>",
      type: "POST",
      dataType: "JSON",
      success: function(data)
      {
       $('#productList').load("<?php echo site_url('pos/load_posales')?>/"+id);
         $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");
         $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);
         $('.holdList').load("<?php echo site_url('pos/holdList/'.$this->register)?>");
         $('#cgstt').load("<?php echo site_url('pos/calcgst')?>", null, total_change);
         $('#sgstt').load("<?php echo site_url('pos/calsgst')?>", null, total_change);
         
      },
      error: function (jqXHR, textStatus, errorThrown)
      {
         alert("Please reload this page");
      }
  });

}

function RemoveHold()
{
  var id = $('#customerSelect').find('option:selected').val();
   var number = $('.selectedHold').clone().children().remove().end().text();
   if(number !=1) {
      swal({   title: '<?=label("Areyousure");?>',
      text: '<?=label("Deletemessage");?>',
      type: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DD6B55",
      confirmButtonText: '<?=label("yesiam");?>',
      closeOnConfirm: false },
      function(){
        // ajax delete data to database
        $.ajax({
            url : "<?php echo site_url('pos/RemoveHold')?>/"+number+"/<?=$this->register;?>",
            type: "POST",
            dataType: "JSON",
            success: function(data)
            {
               $('#productList').load("<?php echo site_url('pos/load_posales')?>/"+id);
               $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");
               $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);
               $('.holdList').load("<?php echo site_url('pos/holdList/'.$this->register)?>");
               $('#cgstt').load("<?php echo site_url('pos/calcgst')?>", null, total_change);
               $('#sgstt').load("<?php echo site_url('pos/calsgst')?>", null, total_change);
               
            },
            error: function (jqXHR, textStatus, errorThrown)
            {
               alert("Please reload this page");
            }
        });
      swal.close(); });
   }

}

function SelectHold(number)
{
  // ajax delete data to database
  var id = $('#customerSelect').find('option:selected').val();

  $.ajax({
      url : "<?php echo site_url('pos/SelectHold')?>/"+number,
      type: "POST",
      dataType: "JSON",
      success: function(data)
      {
         $('#productList').load("<?php echo site_url('pos/load_posales')?>/"+id);

         $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");
         $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);
         $('#cgstt').load("<?php echo site_url('pos/calcgst')?>", null, total_change);
         $('#sgstt').load("<?php echo site_url('pos/calsgst')?>", null, total_change);
         $('#'+number).parent().children().removeClass('selectedHold');
         $('#'+number).addClass('selectedHold');
        
      },
      error: function (jqXHR, textStatus, errorThrown)
      {
         alert("Please reload this page");
      }
  });

}

/********************************** end Hold functions ************************************/

function add_posale(id)
{



   var name1 = $('#idname-'+id).val();
   var price1 = $('#idprice-'+id).val();

   var ddpp = $('#dispp-'+id).val();
   var ddam = $('#disamt-'+id).val();
   

var idkm = $('#customerSelect').find('option:selected').val();
   var number = $('.selectedHold').clone().children().remove().end().text();
     // ajax delete data to database
     $.ajax({
         url : "<?php echo site_url('pos/addpdc')?>/",
         type: "POST",
         data: {ddpp:ddpp,ddam:ddam,name: name1, price: price1, product_id: id, number: number, registerid: <?=$this->register;?>},
         success: function(data)
         {

          
            if(data === 'stock'){
               swal("<?=label("Lowinventory");?>");
            }else{


                $('#productList').load("<?php echo site_url('pos/load_posales')?>/"+idkm);

                $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");

                $('#disamtt span').load("<?php echo site_url('pos/totiems')?>");

                $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);

                

                $('#cgstt').load("<?php echo site_url('pos/calcgst')?>", null, total_change);
                $('#sgstt').load("<?php echo site_url('pos/calsgst')?>", null, total_change);
                disxn();
            }
         },
         error: function (jqXHR, textStatus, errorThrown)
         {
            alert("Please reload this page");
         }
     });

}

function add_posalenks(id)
{


  

   $('#searchProd').val('');
  $('#searchProd').focus();
  
  /*$('#productList2 div').css('display','block');*/


   var name1 = $('#idname-'+id).val();
   var price1 = $('#idprice-'+id).val();

   var payment_price = $('#payment_price').val();

   var ddpp = $('#dispp-'+id).val();
   var ddam = $('#disamt-'+id).val();
   var xcust = $('#customerSelect').val();


var idkm = $('#customerSelect').find('option:selected').val();
   

   var number = $('.selectedHold').clone().children().remove().end().text();
     // ajax delete data to database
     $.ajax({
         url : "<?php echo site_url('pos/addpdc')?>/",
         type: "POST",
         data: {payment_price:payment_price,xcust:xcust,ddpp:ddpp,ddam:ddam,name: name1, price: price1, product_id: id, number: number, registerid: <?=$this->register;?>},
         success: function(data)
         {

              $('#searchProd').focus();
          
            if(data === 'stock'){
               swal("<?=label("Lowinventory");?>");
               $('#countryname_1m').val('');
               $('#countryname_1m').focus();

            }else{

$('#countryname_1m').val('');
$('#countryname_1m').focus();
                $('#productList').load("<?php echo site_url('pos/load_posales')?>/"+idkm);
                $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");

                $('#disamtt span').load("<?php echo site_url('pos/totiems')?>");

                $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);

                

                $('#cgstt').load("<?php echo site_url('pos/calcgst')?>", null, total_change);
                $('#sgstt').load("<?php echo site_url('pos/calsgst')?>", null, total_change);
                disxn();
            }
         },
         error: function (jqXHR, textStatus, errorThrown)
         {
            alert("Please reload this page");
         }
     });

}


function add_posalenk(id)
{


  

   $('#searchProd').val('');
  $('#searchProd').focus();
  
  /*$('#productList2 div').css('display','block');*/


   var name1 = $('#idname-'+id).val();
   var price1 = $('#idprice-'+id).val();

   var payment_price = $('#payment_price').val();

   var ddpp = $('#dispp-'+id).val();
   var ddam = $('#disamt-'+id).val();
   var xcust = $('#customerSelect').val();


var idkm = $('#customerSelect').find('option:selected').val();
   

   var number = $('.selectedHold').clone().children().remove().end().text();
     // ajax delete data to database
     $.ajax({
         url : "<?php echo site_url('pos/addpdc')?>/",
         type: "POST",
         data: {payment_price:payment_price,xcust:xcust,ddpp:ddpp,ddam:ddam,name: name1, price: price1, product_id: id, number: number, registerid: <?=$this->register;?>},
         success: function(data)
         {
           $('#searchProd').focus();
           if(data === 'stock'){
               swal("<?=label("Lowinventory");?>");
               $('#countryname_1m').val('');
             

            }else{

                $('#countryname_1m').val('');
                $('#productList').load("<?php echo site_url('pos/load_posales')?>/"+idkm);
                $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");
                $('#disamtt span').load("<?php echo site_url('pos/totiems')?>");
                $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);
                $('#cgstt').load("<?php echo site_url('pos/calcgst')?>", null, total_change);
                $('#sgstt').load("<?php echo site_url('pos/calsgst')?>", null, total_change);
                disxn();
            }
         },
         error: function (jqXHR, textStatus, errorThrown)
         {
            alert("Please reload this page");
         }
     });

}

function discounn(zzz)
{

   var xxz = $('#rrt-'+zzz).val();
   var xxzx = $('#dispe-'+zzz).val();
   var qqt = $('#qt-'+zzz).val();
   var ty=(parseFloat(xxz)*parseFloat(xxzx)*parseFloat(qqt))/100;
   $('#disamt-'+zzz).val(ty);
 $.ajax({
         url : "<?php echo site_url('pos/sessstt')?>/",
         type: "POST",
         data: {zzz: zzz, xxzx: xxzx, ty: ty},
         success: function(data)
         {

         },
        

     });

  
   disxn();


   
}

function disxn()
{
   


window.setTimeout(slowAlert, 800);
var nn=document.getElementsByName("disamt[]").length;
   var o = 0;
   var nnn=0;
   while (o < nn) 
   {
       var inputAtrib = document.getElementsByName("disamt[]")[o].value;
       nnn=parseFloat(nnn)+parseFloat(inputAtrib);
       o++;
    }

    var xxzx = $('#disamtssh').val();
   
    if(xxzx>0)
    {
      var iklm=float(xxzx);
    }
    else
    {
      var iklm=0;
    }
    
     var paymentMethod=document.getElementById('paymentMethod').value;
     
     if(paymentMethod==11)
     {
var tot_creaditpoint=document.getElementById('tot_creaditpoint').value;


     }
     else
     {
var tot_creaditpoint=0;   
     }

     document.getElementById("disamtt").innerHTML=nnn.toFixed(2);
     var nmtot=document.getElementById("Subtot").innerHTML;
     var sgstt=document.getElementById("sgstt").innerHTML;
     var cgstt=10;
     var RemiseValue=document.getElementById("RemiseValue").innerHTML;
       var recivedamt2= $('#recivedamt2').val();
     var hjk=parseFloat(nmtot)-parseFloat(nnn)-parseFloat(RemiseValue)+parseFloat(iklm);
     document.getElementById("total").innerHTML=hjk.toFixed(2);

     var retamt = $('#amttt').val();

     
       $('#Paid').val(hjk.toFixed(<?=$this->setting->decimals;?>));

       var zs1 = $('#recivedamt').val();

       if(zs1=='' || isNaN(zs1))
       {
        zs1=0;
       }  

       
var zs2 = $('#Paid').val();
var zs3=parseFloat(zs1)-parseFloat(zs2)+parseFloat(tot_creaditpoint)+parseFloat(retamt)+parseFloat(recivedamt2);

 $('#bamacee span').text(zs3.toFixed(<?=$this->setting->decimals;?>));

       document.getElementById("TotalModal").innerHTML=hjk.toFixed(2);
       $('#Paidd').val(hjk.toFixed(<?=$this->setting->decimals;?>));


       
  
  


}


function edit_posale(id)
{


   var qt1 = $('#qt-'+id).val();
   
   var decc = $('#dispe-'+id).val();



var idkm = $('#customerSelect').find('option:selected').val();

        $.ajax({
            url : "<?php echo site_url('pos/edit')?>/"+id,
            type: "POST",
            data: {qt: qt1,decc:decc},
            success: function(data)
            {
               if(data === 'stock'){
                  swal("<?=label("Lowinventory");?>");
                 $('#productList').load("<?php echo site_url('pos/load_posales')?>/"+idkm);
                  $('.barcode').focus();
                  $('.barcode').val('');
                

               }else{
                   $('#productList').load("<?php echo site_url('pos/load_posales')?>/"+idkm);
                   $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");
                   $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);
                   $('#cgstt').load("<?php echo site_url('pos/calcgst')?>", null, total_change);
                   $('#sgstt').load("<?php echo site_url('pos/calsgst')?>", null, total_change);
                   $('.barcode').focus();
                  $('.barcode').val('');

                    }


            },
            error: function (jqXHR, textStatus, errorThrown)
            {
               alert("Please reload this page");
            }
        });

disxn();
    

}


function slowAlert() 
{
  disxn();
}

  

$("#customerSelect").change(function()
{

var id = $(this).find('option:selected').val();




$.ajax({
         url : "<?php echo site_url('pos/GetDiscount')?>/"+id,
         type: "POST",
         success: function(data)
         {
             $('#productList').load("<?php echo site_url('pos/load_posales')?>/"+id);
             $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");
             $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);
             $('#cgstt').load("<?php echo site_url('pos/calcgst')?>", null, total_change);
             $('#sgstt').load("<?php echo site_url('pos/calsgst')?>", null, total_change);
             var values = data.split('~');
             $('#customerName span').text(values[1]);
             var jj=document.getElementById("Subtot").innerHTML;
            var jjj=(parseFloat(jj)*parseFloat(values[0]))/100;
            document.getElementById("RemiseValue").innerHTML=jjj.toFixed(2);
            $('#disamtss').val(jjj.toFixed(2));

            
            var jjjj=parseFloat(jj)-parseFloat(jjj);
            document.getElementById("total").innerHTML=jjjj.toFixed(2);

           
      $('#Paid').val(jjjj.toFixed(<?=$this->setting->decimals;?>));
      $('#Paidd').val(jjjj.toFixed(<?=$this->setting->decimals;?>));
      $('#TotalModal').text('<?=label("Total");?>Rs.'+jjjj.toFixed(<?=$this->setting->decimals;?>));



            $('.Remise').val(values[0]);
             $('#mobnnm').val(values[2]);
             $('#creddate').val(values[3]);
             $('#tot_creaditpoint').val(values[4]);
            
         },
         error: function (jqXHR, textStatus, errorThrown)
         {
            alert("Please reload this page");
         }
    });

});



$("#payment_price").change(function()
{
     var id = $(this).find('option:selected').val();
     $.ajax({
              url : "<?php echo site_url('pos/payment_price_list')?>/"+id,
              type: "POST",
              success: function(data)
              {
                $('#productList').load("<?php echo site_url('pos/load_posales')?>");
                $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");
                $('#disamtt span').load("<?php echo site_url('pos/totiems')?>");
                $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);
                $('#cgstt').load("<?php echo site_url('pos/calcgst')?>", null, total_change);
                $('#sgstt').load("<?php echo site_url('pos/calsgst')?>", null, total_change);
                disxn();
              },
              error: function (jqXHR, textStatus, errorThrown)
              {
               alert("error");
              }
            });
});




function cancelPOS(){
   swal({   title: '<?=label("Areyousure");?>',
   text: '<?=label("Deletemessage");?>',
   type: "warning",
   showCancelButton: true,
   confirmButtonColor: "#DD6B55",
   confirmButtonText: '<?=label("yesiam");?>',
   closeOnConfirm: false },
   function(){

  $('#customerSelect').val('0');
  $('#customerSelect').trigger('change.select2');
  $('.Remise').val('<?=$this->setting->discount;?>');
  $('.TAX').val('<?=$this->setting->tax;?>');
    

  $.ajax({
      url : "<?php echo site_url('pos/ResetPos')?>/",
      type: "POST",
      success: function(data)
      {
          $('#productList').load("<?php echo site_url('pos/load_posales/0')?>");
          $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);
          $('#cgstt').load("<?php echo site_url('pos/calcgst')?>", null, total_change);
   $('#sgstt').load("<?php echo site_url('pos/calsgst')?>", null, total_change);
          $('#ItemsNum span, #ItemsNum2 span').text("0");
          $('#countryname_1m').focus();
      },
      error: function (jqXHR, textStatus, errorThrown)
      {
         alert("Please reload this page");
      }
 });
  $('#countryname_1m').focus();
 swal('<?=label("Deleted");?>', '<?=label("Deletedmessage");?>', "success"); });
};


document.onkeydown = KeyCheck;
function KeyCheck(e)
{



   var KeyID = (window.event) ? event.keyCode : e.keyCode;





   if(KeyID == 118)
   {
    document.getElementById("recivedamt").select();
    
   $('#recivedamt').focus();
   } 
    var cccz= $('#bamacee span').text();
   if(cccz>0 && KeyID == 113)
   {
   saleBtn();
   }
   
   if(KeyID == 119)
   {
   //var rssss=document.getElementById('Paid').value;
   //document.getElementById('recivedamt').value=rssss;
   //$('#bamacee span').text(0);
   saleBtn();
   }  
   
   if(KeyID == 115)
   {
   cancelPOS();
   }

}

function quickpay() 
{
   var rssss=document.getElementById('Paid').value;
   document.getElementById('recivedamt').value=rssss;
   $('#bamacee span').text(0);
   saleBtn();
}

function saleBtn(type) 
{
  var kms =1;
var paidMethod = 0;
var ballamtt = $('#bamacee span').text();
  
  var recivamt2 = $('#recivedamt2').val();

  if(paidMethod==1 || paidMethod==0)
  {

  }
  else if(paidMethod==2)
  {
  	 var cx = $('#CreditCardNum').val();
  	 var xc = $('#CreditCardHold').val();
  	 if(cx=='')
  	 {
      swal("Please enter card number");
      $('#CreditCardNum').focus();
      return false;
    } 
  	 if(xc=='')
  	 {
      swal("Please enter card holder name");
    	$('#CreditCardHold').focus();
     	return false;
  	 }
  	
  	
  }
  else
  {
  	 var cxx = $('#ChequeNum').val();
  	 if(cxx=='')
  	 {
      swal("Please enter ref number");
  	 	$('#ChequeNum').focus();
  	 	return false;
      
  	 }
  }


   var clientID = $('#customerSelect').find('option:selected').val();
   var clientName = $('#customerName span').text();
   var Tax = "10%";
   var Discount = $('.Remise').val();

   var lalid = $('#retidd').val();
   
   var lalamt = $('#amttt').val();
   var custrrf = $('#custrrf').val();
   var qt_id = $('#qt_id').val();
   

   var Subtotal = $('#Subtot').text();
   var xsxsx = document.getElementById("disamtt").innerHTML;

   
   var Total = $('#total').text();
   //edited on 9817 by karunakaran

   var cgggst = $('#cgstt').text();
   var sgggst = $('#sgstt').text();

   var createdBy = '<?php echo $this->user->firstname." ".$this->user->lastname;?>';
   var totalItems = $('#ItemsNum span').text();

    var recivamt = $('#recivedamt').val();
     if(recivamt=='' || isNaN(recivamt))
       {
        recivamt=0;
       } 

    var ballamtt = $('#bamacee span').text();


   var Paid = $('#Paid').val();
   var paidMethod = 0;

   var pay_vali = $('#payment_'+paidMethod).val();
   if(pay_vali==1 && ballamtt<0)
   {
    swal("Balance amount should not less than zero");
    return false;
   }

   var Status = 0;
   var ccnum = $('#CreditCardNum').val();
   var ccmonth = $('#CreditCardMonth').val();
   var ccyear = $('#CreditCardYear').val();
   var ccv = $('#CreditCardCODECV').val();
   var mobnnm = $('#mobnnm').val();
   var creddate = $('#creddate').val();



   if(paidMethod==2)
   {
    paidMethod += '~'+$('#CreditCardNum').val()+'~'+$('#CreditCardHold').val()+'~'+$('#ChequeNum').val();
   }
   else
   {
     paidMethod += '~'+$('#ChequeNum').val();
   }

  

           var change = parseFloat(Total) - parseFloat(recivamt) + parseFloat(lalamt);
           if(change==parseFloat(Total)) Status = 1;
           else if(change>0) Status = 2;
           else if(change<=0) Status = 0;


var taxamount =$('.TAX').val().indexOf('%') != -1 ? parseFloat($('#taxValue').text()) : $('.TAX').val();

var discountamount = $('#RemiseValue').text();
var disamtssh = $('#disamtssh').val();

var pprtnt = $('#pprtnt').val();

if(pprtnt==1)
{
  var tturl = "<?php echo site_url('pos/AddNewSaletest')?>/"+type;

}
else
{
    var tturl =  "<?php echo site_url('pos/AddNewSale')?>/"+type;
}

var $this = $('.ssf');
$this.button('loading');


$.ajax({
      url : tturl,
      type: "POST",
      data: {recivamt2:recivamt2,qt_id:qt_id,creddate:creddate,disamtssh:disamtssh,custrrf:custrrf,recivamt:recivamt,ballamtt:ballamtt,client_id: clientID, clientname: clientName, discountamount: discountamount,  tax: Tax, discount: Discount, subtotal: Subtotal, total: Total, created_by: createdBy, totalitems: totalItems, paid: recivamt, status: Status, paidmethod: paidMethod, ccnum: ccnum, ccmonth: ccmonth, ccyear: ccyear, ccv: ccv,taxamount:cgggst,sgsttaxamt:sgggst,lalid:lalid,lalamt:lalamt,discount_indujul : xsxsx,mobnnm : mobnnm,kms:kms},
      success: function(data)
      {
        $this.button('reset');

         $('#printSection').html(data);
         $('#productList').load("<?php echo site_url('pos/load_posales/0')?>");
         $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");
         $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);
         $('#cgstt').load("<?php echo site_url('pos/calcgst')?>", null, total_change);
         $('#sgstt').load("<?php echo site_url('pos/calsgst')?>", null, total_change);
         $('#AddSale').modal('hide');
         $('#ticket').modal('show');
         $('#ReturnChange span').text('0');
         $('#Paid').val('0');
          $('#retidd').val('0');
          $('#sals_iidr').val('');

         $('#amttt').val('0');
         $('#disamtssh').val('0');
         $('#recivedamt2').val('0');
        
         

         $('#num02').val('10%');
         $('#recivedamt').val('0');
         $('#bamacee span').text('0');
        
         
         $('#custrrf').val('');
         $('#ChequeNum').val('');
         

$('#mobnnm').val('0');
var ggg=$('#customerSelect').html();
$('#customerSelect').html(ggg);

var ggdeg=$('#paymentMethod').html();
$('#paymentMethod').html(ggdeg);

   $('.Paid').show();
   $('.Paidd').show();
   $('.ReturnChange').show();
   $('.CreditCardNum').hide();
   $('.CreditCardHold').hide();
   $('.ChequeNum').hide();
   $('.stripe-btn').hide();


$('#customerName span').text('Walk in Customer');
$(".js-select-options").select2();



       $('#ChequeNum').attr('readonly', false);
       $('#recivedamt2').attr('readonly', false);


       
       


 $('.Remise').val('<?=$this->setting->discount;?>');
 

 
$('.holdList').load("<?php echo site_url('pos/holdList/'.$this->register)?>");

setTimeout(function(){   
 PrintTicket(); 
   }, 300);

      },
      error: function (jqXHR, textStatus, errorThrown)
      {
         alert("Please reload this page");
      }
  });

  $('#CreditCardNum').val('');
  $('#CreditCardHold').val('');
  $('#CreditCardYear').val('');
  $('#CreditCardMonth').val('');
  $('#CreditCardCODECV').val('');

}

function PrintTicket() {
   $('.modal-body').removeAttr('id');
   window.print();
   $('.modal-body').attr('id', 'modal-body');
}

function rrr() 
{
  var ddd=$('#retidd').val();
 
  var ppp=$('#Paidd').val();
  $.ajax({
      url : "<?php echo base_url();?>returns/checkret/"+ddd,
      type: "POST",
      success: function(data)
      {

if(data>0)
{
$('#amttt').val(data);
var ccc=parseFloat(data)-parseFloat(ppp);

$('#bamacee span').text(ccc.toFixed(<?=$this->setting->decimals;?>));
}
else
{
  var lln=$('#recivedamt').val();
        if(lln=='' || isNaN(lln))
       {
        lln=0;
       } 

  $('#retidd').val(0);
 $('#amttt').val(0);
 
 var bb=0-parseFloat(ppp)+parseFloat(lln);

 $('#bamacee span').text("-"+parseFloat(ppp));

}

}
 });
}



function total_noots() 
{
  var jj;
  var kk;
  var ll;
  var mm=0;
  var  fff;
var i;
  for(i=1;i<9;i++)
  {
    jj=parseFloat($('#caa_'+i).val())*parseFloat($('#saa_'+i).val());
    parseFloat($('#kaa_'+i).val(jj));
      mm=parseFloat(mm) + parseFloat(jj);
  }
   ll=parseFloat(mm) - parseFloat($('#expectedcash_1').val());
   kk=parseFloat($('#total_cl').val())+parseFloat(ll);

  
  parseFloat($('#subtott').val(mm));
  parseFloat($('#countedcash_1').val(mm));
  parseFloat($('#diffcash_1').val(ll));
  parseFloat($('#countedtotal').val(kk));
  
  fff=parseFloat(kk)-parseFloat($('#total_cl').val());
  
   parseFloat($('#difftotal').val(fff));
  

}

function CloseRegister() {
   $.ajax({
      url : "<?php echo site_url('pos/CloseRegister')?>/",
      type: "POST",
      success: function(data)
      {
         $('#closeregsection').html(data);
         $('#CloseRegister').modal('show');
         setTimeout(function(){$('#countedcash').focus()}, 1000);

         $('#countedcash').on('keyup',function() {
           var change = -(parseFloat($('#expectedcash').text()) - parseFloat($(this).val()));
           var difftot = change + parseFloat($('#diffcc').text()) + parseFloat($('#diffcheque').text());
           var total = parseFloat($('#countedcc').val()) + parseFloat($('#countedcheque').val()) + parseFloat($('#countedcash').val());
           $('#countedtotal').text(total.toFixed(<?=$this->setting->decimals;?>));
           $('#difftotal').text(difftot.toFixed(<?=$this->setting->decimals;?>))
           if(change < 0){
               $('#diffcash').text(change.toFixed(<?=$this->setting->decimals;?>));
               $('#diffcash').addClass( "red" );
               $('#diffcash').removeClass( "light-blue" );
           }else{
               $('#diffcash').text(change.toFixed(<?=$this->setting->decimals;?>));
               $('#diffcash').removeClass( "red" );
               $('#diffcash').addClass( "light-blue" );
           }
         });

     


     

      },
      error: function (jqXHR, textStatus, errorThrown)
      {
          alert("Please reload this page");
      }
   });
}

function SubmitRegister() 
{




  return false;
   var expectedcash = $('#expectedcash_1').text();
   var countedcash = $('#countedcash_1').val();
   var expectedcc = 0;
   var countedcc = 0;
   var expectedcheque =0;
   var countedcheque = 0;
   var RegisterNote = $('#RegisterNote').val();





   swal({title:'<?=label("Areyousure");?>',
   text: '<?=label("CloseMessageRegister");?>',
   type: "warning",
   showCancelButton: true,
   confirmButtonColor: "#DD6B55",
   confirmButtonText: '<?=label("yesClose");?>',
   closeOnConfirm: false },
   function(){

   $.ajax({
      url : "<?php echo site_url('pos/SubmitRegister')?>/",
      type: "POST",
      data: {expectedcash: expectedcash, countedcash: countedcash, expectedcc: expectedcc, countedcc: countedcc, expectedcheque: expectedcheque, countedcheque: countedcheque, RegisterNote: RegisterNote},
      success: function(data)
      {
         window.location.href = "<?php echo site_url()?>";
      },
      error: function (jqXHR, textStatus, errorThrown)
      {
          alert("Please reload this page");
      }
   });

   swal.close(); });
}

function email()
{
   $('#ticket').modal('hide');
   swal({
      title: "An input!",
      text: "Email:",
      type: "input",
      showCancelButton: true,
      closeOnConfirm: false,
      animation: "slide-from-top",
      inputPlaceholder: "Email" },
      function(inputValue){
         if (inputValue === false) return false;
         if (inputValue === "") {
            swal.showInputError("You need to write an email!");
            return false   }
            var content = $('#printSection').html();
            $.ajax({
               url : "<?php echo site_url('pos/email')?>/",
               type: "POST",
               data: {content: content, email: inputValue},
               success: function(data)
               {
                  $('#ticket').modal('show');
                  swal.close();
               },
               error: function (jqXHR, textStatus, errorThrown)
               {
                   alert("Please reload this page");
               }
            });
             });
}

function pdfreceipt(){


   var content = $('#printSection').html();
   $.redirect('<?php echo site_url('pos/pdfreceipt')?>/', { content: content });

}

</script>


<!-- Modal -->

<div class="modal fade" id="AddSale" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document">
    <div class="modal-content">
<div class="modal-header">
<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
<h3 style="width:33%;float: left;font-family: bold;margin-top: 0px;margin-bottom: 1px;" id="TotalModal"></h4>
<h4 style="width:25%;float: right;" class="modal-title" id="ItemsNum2"><?=label("item");?> : <span></span> </h4>
</div>
      <form>
      <div class="modal-body">

       <table class="table table-striped  " style="border: 1px solid #ddd;margin-bottom: 0px;font-family: "Roboto", sans-serif;">
      


       <h5 style="display: none;"  id="customerName"><span><?=label("WalkinCustomer");?></span></h5>

     

        <input  value="" style="width: 80%;border: 1px solid #ccc;padding: 5px 12px;" type="hidden" name="custrrf" class="-control" id="custrrf" />
      



<?php

if($kkar['salretv']==1)
{ ?>

         <tr>
        <td><?=label("Exchange");?></td>
        <td><?=label("Product Code");?></td>
        <td><?=label("Return");?> ID</td>
        <td><?=label("Amount");?></td>
        </tr>


        <tr>
<td style="border-top: 0px solid #ddd;">
<input style="padding: 5px 12px;width:100px;float: left;"  type="text" name="sals_iidr" class="form-control" id="sals_iidr" placeholder="<?=label("Sales No");?>">
 <br>
<button style="padding: 6px 0px;width:50px;float: left;margin-bottom: 0px;margin-left: 10px;margin-top: 5px;background-color: #489103;" class="btn btn-add" type="button" onclick="education_fields();">Check</button>
</td>

 

<td style="border-top: 0px solid #ddd;">
<input style="padding: 5px 12px;width:100px;float: left;"  type="text" name="sals_iidrproo" class="form-control" id="sals_iidrproo" placeholder="<?=label("barcode");?>">
<button style="padding: 6px 0px;width:50px;float: left;margin-bottom: 0px;background-color: #489103;" class="btn btn-add" type="button" onclick="education_fieldsproductsold();">Check</button>
</td>


<td style="border-top: 0px solid #ddd;"><input readonly="readonly" value="0" style="border: 1px solid #ccc;padding: 5px 12px;width:80%;background-color: #edf2f6;"  type="text"  name="retidd" class="-control" id="retidd" />
</td>

<td style="border-top: 0px solid #ddd;"><input  value="0" style="width:80%;border: 1px solid #ccc;padding: 5px 12px;background-color: #edf2f6;" type="text" readonly="readonly" value="0" name="amttt" class="-control" id="amttt" />
</td>
        </tr>

<?php }
else
{ ?>



<input   type="hidden" name="name"  id="CustomerName" >

<input  value="0"   type="hidden"  name="retidd" id="retidd" />

<input  value="0" type="hidden"  name="amttt"  id="amttt" />



<?php  }  ?>







<input readonly="readonly" type="hidden" value="0" name="paid" class="form-control <?=strval($this->setting->keyboard) === '1' ? 'paidk' : ''?>" id="Paid" placeholder="<?=label("Paid");?>">

             <input type="hidden" value="0" name="paidd" class="form-control <?=strval($this->setting->keyboard) === '1' ? 'paidk' : ''?>" id="Paidd" placeholder="<?=label("Paid");?>">










 <?php if($this->setting->creditstatus==1)
                        { ?>
      


   
   <input type="hidden" style="width:57%;border: 1px solid #ccc;padding: 5px 12px;"  name="creddate" class="form-control <?=strval($this->setting->keyboard) === '1' ? 'paidk' : ''?>" id="creddate" placeholder="<?=label("Credit Days");?>">
      


         <?php } ?>




          


          
<script type="text/javascript">

   function ddsdd(cc)
   {



  
}   

function callcc(cc,bb)
   {

   var rssss=document.getElementById('Paid').value;
   var amtttf=document.getElementById('amttt').value;
     var recivedamt2=document.getElementById('recivedamt2').value;
   
   var kmxx=parseFloat(amtttf)+parseFloat(cc)+parseFloat(recivedamt2)-parseFloat(rssss);
   $('#bamacee span').text(kmxx.toFixed(<?=$this->setting->decimals;?>));
  
}

function callcc2(cc,bb)
   {

   var rssss=document.getElementById('Paid').value;
   var amtttf=document.getElementById('amttt').value;
   var recivedamt=document.getElementById('recivedamt').value;
 
   
   var kmxx=parseFloat(amtttf)+parseFloat(cc)+parseFloat(recivedamt)-parseFloat(rssss);
   $('#bamacee span').text(kmxx.toFixed(<?=$this->setting->decimals;?>));
  
}


</script>

  </table>


      









         

          <div class="clearfix"></div>
      </div>
      <div class="modal-footer" >
        <button type="button" class="btn btn-red" data-dismiss="modal"><?=label("Close");?>
          
        </button>
        


        <button type="button" class="btn btn-add" onclick="saleBtn(1)"><?=label("save&print");?></button>
      </div>
   <?php echo form_close(); ?>
    </div>
 </div>
</div>

<!-- /.Modal -->

<script type="text/javascript">
var items = [];
$(function() {
   $('#addform').submit(function()
   {
      var error = false;
      $('.productcode').each(function() {
         if($(this).text() === $("#ProductCode").val()){
            $('#codeError').show();
            error = true;
         }
      });
      if(error) return false;
       // ... continue work
   });

   $('#Type').on('change', function() {
     if( this.value == 1 ) //if service
     {
        $("#pushaceP").slideUp();
        $("#alertqty").slideUp();
        $("#supply").slideUp();
        $("#UnitP").slideUp();
     } else if ( this.value == 2 ) {
        $("#pushaceP").slideUp();
        $("#alertqty").slideUp();
        $("#supply").slideUp();
        $("#UnitP").slideUp();
     } else {
        $("#pushaceP").slideDown();
        $("#alertqty").slideDown();
        $("#supply").slideDown();
        $("#UnitP").slideDown();
     }
   });
});


$(document).on("click", ".open-modalimage", function () {
  var myId = $(this).data('id');
  $(".modal-body #image").attr("src","<?php echo site_url()?>/files/products/"+myId);
});


var quant = [];
var quantw = [];
var pricestore = [];
var productID;
$(document).ready(function() {



   $('#addform').ajaxForm({ //FormID - id of the form.

         success: function (data) {
            if(data === "service")
            {
               location.reload();
            }else if($('#Type').value == 1) {
               $('#stockcontent').html(data);
               $('#stock').modal('show');
               $('#Addproduct').modal('hide');

               $( "[id='quantity']" ).on('change', function() {
                  var storeID = $(this).attr("store-id");
                  quant.push({
                     'store_id': storeID,
                     'quantity': $(this).val()
                  });
               });

               $( "[id='quantityw']" ).on('change', function() {
                  var warehouseID = $(this).attr("warehouse-id");
                  quantw.push({
                     'warehouse_id': warehouseID,
                     'quantity': $(this).val()
                  });
               });

               $( "[id='pricestr']" ).on('change', function() {
                  var storeID = $(this).attr("store-id");
                  pricestore.push({
                     'store_id': storeID,
                     'price': $(this).val()
                  });
               });

               productID = $('#prodctID').val();
            } else {

               productID = $('#prodctID').val();
               $('#combocontent').html(data);
               $('#combo').modal('show');
               $('#Addproduct').modal('hide');

               $("#add_item").autocomplete({
                  source: '<?= site_url('productcontroller/suggest'); ?>',
                  minLength: 1,
                  autoFocus: false,
                  delay: 200,
                  select: function( event, ui ) {

                           event.preventDefault();
                           if (ui.item.id !== 0) {
                              var row = add_product_item(ui.item);
                              if (row) {
                                 $(this).val('');
                              }
                           } else {
                              alert('<?= label('NoProduct') ?>');
                              return false;
                           }
                        },
                  response: function (event, ui) {
                       if ($(this).val().length >= 16 && ui.content[0].id == 0) {
                           alert('<?= label('NoProduct') ?>');
                           $('#add_item').focus();
                           $(this).val('');
                       }
                       else if (ui.content.length == 1 && ui.content[0].id != 0) {
                           ui.item = ui.content[0];
                           $(this).data('ui-autocomplete')._trigger('select', 'autocompleteselect', ui);
                           $(this).autocomplete('close');
                           $(this).removeClass('ui-autocomplete-loading');
                       }
                       else if (ui.content.length == 1 && ui.content[0].id == 0) {
                           alert('<?= label('NoProduct') ?>');
                           $('#add_item').focus();
                           $(this).val('');

                       }
                  }
               });

            }
      }
   });
});



function addcombo(){


var values = [];

$('input[name="quantity[]"]').each(function() {
    values.push($(this).val());
});


var valuesg = [];
$('input[name="store[]"]').each(function() {
    valuesg.push($(this).val());
});

 var productID = $('#prodctID').val();
   

   $.ajax({
          url : "<?php echo site_url('productcontroller/addcombo')?>/",
          type: "POST",
          data: {strrr: valuesg, qrrt: values,prodd:productID},
          success: function(data)
          {
             location.reload();
          },
          error: function (jqXHR, textStatus, errorThrown)
          {
             alert("Please reload this page");
          }
     });
}

</script>

<div class="modal fade" id="Addproduct" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header" style="padding: 7px;">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("AddProduct");?></h4>
      </div>
<?php 
      echo form_open_multipart('productcontroller/addn'); ?>
      <div class="modal-body" style="padding: 2px;" >

          <input type="hidden" readonly="readonly"  maxlength="30" value="0"  name="type" class="form-control" id="type" placeholder="<?=label("ProductCode");?>">





           


           <div class="form-group controls">
            <div class="col-xs-4">
             <label for=""><?=label("HSN");?></label>
<input type="text"   maxlength="30" value="" Required name="hsn" class="form-control" id="hsn" placeholder="<?=label("HSN");?>">
            
           </div>


            <div class="col-xs-4">
             <label for="ProductName"><?=label("ProductName");?></label>
<input type="text" name="name" maxlength="50" Required class="form-control" id="ProductName" placeholder="<?=label("ProductName");?>">
           </div>



    <div class="col-xs-4">
             <label for="Category">Brand</label><a href="javascript:void(0)" data-toggle="modal" data-target="#Addbrand">
               <span class=" fa-lg" data-toggle="tooltip" data-placement="top" title="" data-original-title="Add New Brand">
                  
                  <i style="color: #89b03e;padding: 5px;" class="fa fa-plus fa-stack-1x  "></i>
               </span>
</a>
             <select class="form-control" name="brandd" id="brandd">
               <option value="0" >Select</option>
               
               <?php 
               
               while($imnnf=mysql_fetch_array($imnn))
               {

               ?>
               <option value="<?php echo  $imnnf['id'];?>"><?php echo $imnnf['name'];?></option>
               <?php 
               }
               ?>
             </select>
           </div>
           </div>



           <div class="form-group">
             <div class="col-xs-4">
             <label for="Category"><?=label("Category");?></label>
                         <a href="javascript:void(0)" data-toggle="modal" data-target="#Addcategory">
               <span class=" fa-lg" data-toggle="tooltip" data-placement="top" title="" data-original-title="Add New Category">
                  
                  <i style="color: #89b03e;padding: 5px;" class="fa fa-plus fa-stack-1x  "></i>
               </span>
</a>

             <select class="form-control" name="category" id="Category">
              <option value="0" >Select</option>
               <?php foreach ($categories as $category):?>
                  <option value="<?=$category->id;?>"><?=$category->name;?></option>
               <?php endforeach;?>
            </select>
           </div>



           <div class="col-xs-4" id="supply">
             <label for="Supplier"><?=label("Supplier");?></label>

             <a href="javascript:void(0)" data-toggle="modal" data-target="#AddSupplier">
               <span   class="fa-lg" data-toggle="tooltip" data-placement="top" title="" data-original-title="Add New Suppliers">
                  
                  <i style="color: #89b03e;padding: 5px;" class="fa fa-user-plus fa-stack-1x  "></i>
               </span>
</a>

             <select class="form-control" name="supplier" id="Supplier">
               <option value="0" >Select</option>
               <?php foreach ($suppliers as $supplier):?>
                  <option value="<?=$supplier->id;?>"><?=$supplier->name;?></option>
               <?php endforeach;?>
            </select>
           </div>
            <div class="col-xs-4">
                <label for="taxType"><?=label("TaxMethod");?></label>
                <select class="form-control" name="taxmethod" id="taxType">
                <option value="0"><?=label("inclusive");?></option>
                <option value="1"><?=label("exclusive");?></option>
                </select>
           </div> 

           </div>

            <div class="form-group">
            <div class="col-xs-4">
            <label for="PurchasePrice"><?=label("PurchasePrice");?> (<?=$this->setting->currency;?>)</label>
    <input type="number"  Required   name="cost" value="0" class="form-control" id="PurchasePrice" placeholder="<?=label("PurchasePrice");?>">
            </div>

           <div class="col-xs-4">
             <label for="Price"><?=label("Selling");?> <?=label("Price");?></label>
             <input type="number" value="0" Required name="price" class="form-control" id="Price" placeholder="<?=label("Price");?>">
           </div> 

            <div class="col-xs-4">
             <label for="Price"><?=label("MRP");?></label>
             <input type="number" value="0" Required name="rrate" class="form-control" id="rrate" placeholder="<?=label("MRP");?>">
           </div> 


           </div> 



<?php
$mkzz=mysql_fetch_array(mysql_query("select * from settings where id=1 "));
if($this->setting->gst_tax==1)
{
?>
           <div class="form-group">

           <div class="col-xs-12">
             <label for="Tax">Tax %</label>

                        <a href="javascript:void(0)" data-toggle="modal" data-target="#Addtax">
               <span class="fa-lg" data-toggle="tooltip" data-placement="top" title="" data-original-title="Add New Tax">
                  
                  <i style="color: #89b03e;padding: 5px;text-align: left;
margin-left: 14%;" class="fa fa-plus fa-stack-1x  "></i>
               </span>
</a>
             

             
<div style="height: 40px;overflow-y: scroll;" id="ttaxx">
               <?php 
               while($taxxf=mysql_fetch_array($taxx))
               {
               ?>
 <div class="col-xs-4">
<span style="float: left;width: 10%">
 <input   type checked="checkbox" style="display: block;" name="ckk[]" id="ckc" value="<?php echo $taxxf['id'];?>"   >
 </span>
 <span style="float: left;width:80%;margin-left:5%;">
 <?php echo $taxxf['name'];?>-<?php echo $taxxf['valueper'];?>%
 </span>
 </div>

               <?php 
               }
               ?>
           

</div>

           </div>


          

             <input type="hidden" value="0" maxlength="10" name="stax" class="form-control" id="sTax" placeholder="In %">
           


          

             <input type="hidden" value="0" maxlength="2" name="igst" class="form-control" id="igst" placeholder="In %">
           


           



          
           </div>

<?php }
else{
  ?>
<input type="hidden" name="tax"  id="Tax" value="0">
<input type="hidden"  name="stax"  id="sTax" value="0">
<input type="hidden"  name="taxmethod"  id="taxmethod" value="0">
<input type="hidden"  name="igst"  id="igst" value="0">


<?php  } ?>

          



           <div class="form-group">

           <div class="col-xs-3">
             <label for="Price"><?=label("Discount");?> %</label>
             <input value="0" maxlength="2" type="number" step="any"  name="dispx" class="form-control" id="dispx" placeholder="<?=label("Price");?>">
           </div>


            <div class="col-xs-3">
             <label for="Unit"><?=label("Net Wight");?></label>
             <input  Required  type="text"   name="net_wight" value="0" class="form-control" id="net_wight"  />
           </div>

           <div class="col-xs-3">
             <label for="Unit"><?=label("Unit");?></label>
             <input value="0" Required  type="text" step="any" name="unit" class="form-control" id="Unit" placeholder="<?=label("Unit");?>">
           </div>

           <div class="col-xs-3">
             <label for="AlertQt"><?=label("AlertQt");?></label>
             <input  type="number" value="0" name="alertqt" class="form-control" id="AlertQt" placeholder="<?=label("AlertQt");?>">
           </div>
          

           </div>


            
           <div class="form-group">
           

     <div class="col-xs-3">
             <label for="Price"><?=label("Packed");?></label>
             <input type="text"   value="0" Required name="packed_1m" class="form-control" id="packed_1m" >
           </div> 
           

           <div class="col-xs-3">
                <label for="taxType"><?=label("Best Before");?></label>
    
<input  type="text" value="0" name="best_before" class="form-control" id="best_before"  >

           </div> 


<input  value="1"  type="hidden"  name="measur" class="form-control" id="measur" >


         
           </div>
              <div class="form-group">

             <label for="exampleInputFile"><?=label("Imageinput");?></label>
             <input type="file" name="userfile" id="ImageInput">
           </div>


           <div class="form-group">
          <div class="col-xs-12">
             <label for="ProductCode"><?=label("ProductCode");?></label>

             <input type="text"    value="<?php echo @$mmik['id']+1;?>"  name="code" class="form-control" id="ProductCode" placeholder="<?=label("ProductCode");?>">
             <p id="codeError" class="red" hidden><?=label("codeerror");?></p>
         
          </div> 
          </div> 


          <div class="form-group">
            <div class="col-xs-12">
          
             <label for="ProductDescription"><?=label("ProductDescription");?></label>
             <textarea id="summernoted" class="form-control" name="description"></textarea>
         
          </div>
          </div>

          <input type="hidden" name="color" id="option7" value="color07" autocomplete="off">

      
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal"><?=label("Close");?></button>
        <button type="submit" class="btn btn-add"><?=label("Submit");?></button>
      </div>
   <?php echo form_close(); ?>
    </div>
 </div>
</div>
</div>
</div>



  <!-- Modal combo -->
  <div class="modal fade" id="combo" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
   <div class="modal-dialog" role="document" id="comboModal">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title" id="combo"><?=label("combinations");?></h4>
        </div>
        <div class="modal-body" id="modal-body" style="padding:1px;">
           <div id="combocontent">
              <!-- combo goes here -->
           </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-default hiddenpr" onclick="location.reload();"><?=label("Close");?></button>
          <button type="button" class="btn btn-add hiddenpr" onclick="addcombo()"><?=label("submit");?></button>
        </div>
      </div>
   </div>
  </div>
  <!-- /.Modal -->


<!-- Modal ticket -->
<div class="modal fade" id="ticket" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document" id="ticketModal" style="width:800px;" >
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="ticket"><?=label("Receipt");?></h4>
      </div>
      <div class="modal-body" id="modal-body" style="padding: 0px !important;">
         <div id="printSection">
            <!-- Ticket goes here -->
            <center><h1 style="color:#34495E"><?=label("empty");?></h1></center>
         </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-red hiddenpr" data-dismiss="modal"><?=label("Close");?></button>

        <?php 
        if($this->setting->ddirectprint==2)
        { ?>
        
        <button type="button" class="btn btn-add hiddenpr" onclick="email()"><?=label("Email");?></button>
        <button type="button" class="btn btn-add hiddenpr" onclick="PrintTicket()"><?=label("print");?></button>
        <?php } ?>
      </div>
    </div>
 </div>
</div>
<!-- /.Modal -->

<!-- Modal add user -->

<div class="modal fade" id="education_fields" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" >


 </div>


<div class="modal fade" id="AddCustomer" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">

        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("AddCustomer");?></h4>
      </div>

      <?php echo form_open_multipart('customers/addn'); ?>
      <div class="modal-body">

           
            <div class="form-group">
          
          

           <div class="col-xs-6">
             <label for="CustomerName"><?=label("CustomerName");?></label>
             <input type="text" name="name" maxlength="50" Required class="form-control" id="CustomerName" placeholder="<?=label("CustomerName");?>">
           </div>
           </div>



           <div class="form-group">
            <div class="col-xs-6">
             <label for="CustomerPhone"><?=label("CustomerPhone");?></label>
             <input type="text" name="phone" maxlength="30" class="form-control" id="CustomerPhone" placeholder="<?=label("CustomerPhone");?>">
           </div>
           <div class="col-xs-6">
             <label for="CustomerPhone"><?=label("GST");?></label>
             <input type="text" name="gstno" maxlength="30" class="form-control" id="gstno" placeholder="GST">
           </div>
           </div>


           <div class="form-group">
            <div class="col-xs-6">
             <label for="CustomerEmail"><?=label("CustomerEmail");?></label>
             <input type="email" maxlength="50" name="email" class="form-control" id="CustomerEmail" placeholder="<?=label("CustomerEmail");?>">
           </div>
           <div class="col-xs-6">
             <label for="CustomerDiscount"><?=label("CustomerDiscount");?> (in %)</label>
             <input type="text" maxlength="2" name="discount" class="form-control" id="CustomerDiscount" placeholder="<?=label("CustomerDiscount");?>">
           </div>
           </div>


<?php
if($this->setting->birth_anni_modul==1)
{
?>  <div class="form-group">
           <div class="col-md-6" >
           
         
             <label for="CustomerDiscount"><?=label("Birthday");?></label>
             <input type="text" name="birthday_date" value="<?php echo date("d-m-Y");?>" class="form-control" id="birthday_date" >
           </div>
            

           <div class="col-md-6" >
           
           
             <label for="CustomerDiscount"><?=label("Anniversary");?></label>
             <input type="text" name="anniversary_date" class="form-control" value="<?php echo date("d-m-Y");?>" id="anniversary_date" >
           </div>
           </div>
            <?php }else{

         ?>


<input type="hidden" maxlength="30"  value="<?php echo date("d-m-Y");?>" name="birthday_date" class="form-control" id="birthday_date" placeholder="Date">

<input type="hidden" maxlength="30"   value="<?php echo date("d-m-Y");?>" name="anniversary_date" class="form-control" id="anniversary_date" placeholder="Date">

         <?php  } ?>


           <div class="form-group">
            <div class="col-xs-6">
             <label for="CustomerEmail"><?=label("State");?></label>

             <select class="form-control" name="custstate" id="custstate">
             <option value=""> Select State</option>
                         <option  value="32">ANDAMAN &amp; NICOBAR</option>
                        <option <?php if($this->setting->mystate==1){ ?> selected="selected" <?php  } ?> value="1">ANDHRA PRADESH</option>
                        <option value="3">ARUNACHAL PRADESH</option>
                        <option value="2">ASSAM</option>
                        <option <?php if($this->setting->mystate==5){ ?> selected="selected" <?php  } ?> value="5">BIHAR</option>
                        <option value="31">CHANDIGARH</option>
                        <option value="35">CHATTISGARH</option>
                        <option value="30">DADRA &amp; NAGAR</option>
                        <option value="29">DAMAN &amp; DIU</option>
                        <option value="25">DELHI</option>
                        <option value="26">GOA</option>
                        <option <?php if($this->setting->mystate==4){ ?> selected="selected" <?php  } ?> value="4">GUJRAT</option>
                        <option value="6">HARYANA</option>
                        <option value="7">HIMACHAL PRADESH</option>
                        <option value="8">JAMMU &amp; KASHMIR</option>
                        <option value="34">JHARKHAND</option>
                        <option <?php if($this->setting->mystate==9){ ?> selected="selected" <?php  } ?> value="9">KARNATAKA</option>
                        <option value="10">KERALA</option>
                        <option value="28">LAKSHDWEEP</option>
                        <option value="11">MADHYA PRADESH</option>
                        <option value="12">MAHARASHTRA</option>
                        <option value="13">MANIPUR</option>
                        <option value="14">MEGHALAYA</option>
                        <option value="15">MIZORAM</option>
                        <option value="16">NAGALAND</option>
                        <option value="17">ORISSA</option>
                        <option value="27">PONDICHERY</option>
                        <option value="18">PUNJAB</option>
                        <option value="19">RAJASTHAN</option>
                        <option value="20">SIKKIM</option>
                        <option <?php if($this->setting->mystate==21){ ?> selected="selected" <?php  } ?> value="21">TAMIL NADU</option>
                        <option value="22">TRIPURA</option>
                        <option value="23">UTTAR PRADESH</option>
                        <option value="33">UTTARANCHAL</option>
                        <option value="24">WEST BENGAL</option>
            
           </select>

           </div>
        <div class="col-xs-6">
          <label for="CustomerEmail"><?=label("Customer");?> <?=label("Type");?></label>
          <select class="form-control" name="custtype" id="custtype">
             <option value="1" >Retail</option>
             <option value="2" >Wholesale </option>
          </select>

           </div>
           </div>


          <div class="col-xs-12">

           <label for="CustomerDiscount"><?=label("Credit Days");?></label>
             <input type="hidden" maxlength="3" name="creddate" class="form-control" id="creddate" placeholder="<?=label("Credit Days");?>">

          </div> 
          

    <div class="form-group">
            <div class="col-xs-6">
             <label for="CustomerDiscount">Billing  <?=label("Adresse");?></label>
             <textarea name="customeraddress" class="form-control" id="customeraddress" ></textarea> 
             </div>
             <div class="col-xs-6">

             <label for="CustomerDiscount"><?=label("Shipping Address");?></label>
             <textarea name="shppingad" class="form-control" id="shppingad" ></textarea>
             </div>

          </div>



      </div>
      <div class="modal-footer">

        <button type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?=label("Submit");?></button>

        <button type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?=label("Close");?></button>
        
      </div>
   <?php echo form_close(); ?>
    </div>
 </div>
</div>

<!-- /.Modal -->

<!-- Modal add user -->
<div class="modal fade" id="CloseRegister" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog modal-lg" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("CloseRegister");?></h4>
      </div>
      <div class="modal-body">
         <div id="closeregsection">
            <!-- close register detail goes here -->
         </div>
      </div>
     
    </div>
 </div>
</div>
<!-- /.Modal -->

<?php } ?>


<script type="text/javascript">

function education_fields()
{    
  var vl=$('#sals_iidr').val();
 
  if(vl>0 || v2>0)
  {
        
    var datastring='countid='+vl;
  $.ajax
({
type: "POST",
url: "<?php  echo base_url(); ?>purchase/addrowret",
data: datastring,
cache: false,
success: function(result)
{          

             $('#education_fields').html(result);
              $('#education_fields').modal('show');
        
} 
});
}
else
{
  alert("Please Enter Sales ID ");
  return false;
}


}


function education_fieldsproductsold()
{    
  var vl=$('#sals_iidrproo').val();
  if(vl==0 || vl=='')
  {
    alert("Please Enter Barcode ");
    return false;
  }     

var datastring='countid='+vl;
  $.ajax
({
type: "POST",
url: "<?php  echo base_url(); ?>purchase/addrowret_probarcode",
data: datastring,
cache: false,
success: function(result)
{          
    $('#education_fields').html(result);
    $('#education_fields').modal('show');
} 
});

}



function chltech(cc)
{
    
    
  var vl=cc;
  if(vl==0 || vl=='')
  {
    alert("Please Enter Sales ID ");
    return false;
  }

     
    var datastring='countid='+vl;
  
  
  $.ajax
({
type: "POST",
url: "<?php  echo base_url(); ?>purchase/addrowretckk",
data: datastring,
cache: false,
success: function(result)
{ 
    
            
             $('#education_fields').html(result);
              $('#education_fields').modal('show');

        
} 
});




}


$(document).ready(function() {

  $('#pddate').datepicker({
      todayHighlight: true,
      autoclose:true
  });


  });


   function isNumberKey(evt)
      {
         var charCode = (evt.which) ? evt.which : event.keyCode
         if (charCode > 31 && (charCode < 48 || charCode > 57))
            return false;

         return true;
      }
    
    
function getXMLHTTP() 
{ 
        var xmlhttp=false;    
        try{
            xmlhttp=new XMLHttpRequest();
        }
        catch(e)    {        
            try{            
                xmlhttp= new ActiveXObject("Microsoft.XMLHTTP");
            }
            catch(e){
                try{
                xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
                }
                catch(e1){
                    xmlhttp=false;
                }
            }
        }
             
        return xmlhttp;
}




function getqqtt(str,tid) 
{   




var fie = tid.split('_');
var iij = fie[1];
 var pprice=document.getElementById('pric_'+iij).value;
 var qtyret=document.getElementById('retq_'+iij).value;
 var ssubtoto=document.getElementById('stot_'+iij).value;
  var qtyavl=document.getElementById('qty_'+iij).value;
 
  var tta=pprice*qtyret;
  if(parseInt(qtyavl) >= parseInt(qtyret)  )
  {

 document.getElementById('stot_'+iij).value=tta;
 
 }
  else
  {
    document.getElementById('retq_'+iij).value=0;
    document.getElementById('stot_'+iij).value=0;
  }

    
 var texxx=document.getElementById('numrowc').value;

var mss=0;
var i=1;
for(i=1;i< texxx; i++)
{

var skk=document.getElementById('stot_'+i).value;

if(skk>0)
{
mss=parseFloat(mss) + parseFloat(skk);
}

}
  document.getElementById('gtot').value=mss;
  var ddper=document.getElementById('discper').value;

  var taxcal=(ddper * mss)/100;
  var ttt=parseFloat(mss)-parseFloat(taxcal);
  document.getElementById('distot').value=taxcal;


  document.getElementById('gltot').value=ttt; 

      

    
}



function gauthamm(ccc) 
{   




var kkq = document.getElementsByName( 'retq[]' ),
    retq  = [].map.call(kkq, function( input ) {
        return input.value;
    }).join( '|' );

    var kkt = document.getElementsByName( 'stot[]' ),
    stot  = [].map.call(kkt, function( input ) {
        return input.value;
    }).join( '|' );

    var kky = document.getElementsByName( 'idd[]' ),
    idd  = [].map.call(kky, function( input ) {
        return input.value;
    }).join( '|' );





 var discper=document.getElementById('discper').value;
 var distot=document.getElementById('distot').value;
 var gtot=document.getElementById('gtot').value;
 var gltot=document.getElementById('gltot').value;
 var distot=document.getElementById('distot').value;
 var rrtyp=document.getElementById('rrtyp').value;
 var numrowc=document.getElementById('numrowc').value;
 
var $this = $('.retiddxz');
$this.button('loading');
 
     
    $.ajax({
      url : "<?php echo site_url('returns/addre')?>/"+ccc,
      type: "POST",
      data: {retq: retq, stot: stot, idd: idd, discper: discper, distot: distot, gtot: gtot, gltot: gltot, distot: distot, rrtyp: rrtyp, numrowc: numrowc},
      success: function(data)
      {

      	 $this.button('reset');
         var myarr = data.split("-");
       var ii=  myarr[0];
        var jj= myarr[1];
        




		var amtttn=document.getElementById('amttt').value;
		var retiddf=document.getElementById('retidd').value;
		var retiddfff=retiddf+'~'+ii;

 		var dsds=parseFloat(amtttn)+parseFloat(jj);
        document.getElementById('retidd').value=retiddfff;
        document.getElementById('amttt').value=dsds;
         

 var entrr=document.getElementById('recivedamt').value;
        if(entrr=='' || isNaN(entrr))
       {
        entrr=0;
       } 


 
 var entrPaidr=document.getElementById('Paid').value;
 var dsds=parseFloat(jj)+parseFloat(entrr)-parseFloat(entrPaidr);
         
         

//document.getElementById("sals_iidr").readOnly = true;
        
  $('#bamacee span').text(dsds.toFixed(<?=$this->setting->decimals;?>));
   $('#education_fields').modal('hide');


      




         
      },
      error: function (jqXHR, textStatus, errorThrown)
      {
          alert("Please reload this page");
      }
   });



      

    
}


</script>


<script  >
 function auromcv(kk,mm)
    {
  var items = mm.split('_');
  var jjv=items[1];

    $('#countryname_'+jjv).autocomplete({
      

              source: function( request, response ) {
                $.ajax({
                  url : '<?php echo base_url();?>pos/searchitems51/',
                  dataType: "json",
              data: {
                 name_startsWith: request.term,
                 type: 'country_table',
                 row_num : 1
              },
               success: function( data ) {

                  response( $.map( data, function( item ) {
                  var code = item.split("|");
                  return {
                    label: code[0] +' - '+ code[1],
                    value: '',
                    data : item
                  }
                }));
              }
                });
              },
              autoFocus: true,          
              minLength: 1,
              select: function( event, ui ) 
              {
              var names = ui.item.data.split("|");

               $('.barcode').val('');
              

              add_posalenks(names[1]);


      }           
            });
            
            }



function edit_posalepp(id)
{

   var qt1 = $('#rrt-'+id).val();
   var decc = $('#dispe-'+id).val();
   var idkm = $('#customerSelect').find('option:selected').val();
        $.ajax({
            url : "<?php echo site_url('pos/editpp')?>/"+id,
            type: "POST",
            data: {qt: qt1,decc:decc},
            success: function(data)
            {
               if(data === 'stock'){
                  swal("<?=label("Lowinventory");?>");
                 $('#productList').load("<?php echo site_url('pos/load_posales')?>/"+idkm);
                  $('.barcode').focus();
                  $('.barcode').val('');
               }else{
                   $('#productList').load("<?php echo site_url('pos/load_posales')?>/"+idkm);
                   $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");
                   $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);
                   $('#cgstt').load("<?php echo site_url('pos/calcgst')?>", null, total_change);
                   $('#sgstt').load("<?php echo site_url('pos/calsgst')?>", null, total_change);
                   $('.barcode').focus();
                  $('.barcode').val('');

                    }


            },
            error: function (jqXHR, textStatus, errorThrown)
            {
               alert("Please reload this page");
            }
        });
disxn();
}

function edit_proeditt(id)
{

   var qt1 = $('#prodname-'+id).val();
   $.ajax({
            url : "<?php echo site_url('pos/edit_proname')?>/"+id,
            type: "POST",
            data: {qt: qt1},
            success: function(data)
            {
            },
            error: function (jqXHR, textStatus, errorThrown)
            {
               alert("Please reload this page");
            }
        });

}



 function dsdsdsd()
    { 
     var jk= $('#qttnumm').val();


var idkm = $('#customerSelect').find('option:selected').val();
    
     if(jk>0)
     {

       $.ajax({
         url : "<?php echo site_url('pos/qttaddpdc')?>/",
         type: "POST",
         data: {jk:jk},
         success: function(data)
         {

          
            if(data === 'stock'){
               swal("<?=label("Lowinventory");?>");
            }else{


                $('#productList').load("<?php echo site_url('pos/load_posales')?>/"+idkm);
                $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");

                $('#disamtt span').load("<?php echo site_url('pos/totiems')?>");

                $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);

                

                $('#cgstt').load("<?php echo site_url('pos/calcgst')?>", null, total_change);
                $('#sgstt').load("<?php echo site_url('pos/calsgst')?>", null, total_change);
                disxn();
            }
         },
         error: function (jqXHR, textStatus, errorThrown)
         {
            alert("Please reload this page");
         }
     });

      

     }
     else
     {
      alert("Please Enter QT Number...");
     }


    }



      function auromcvbat(kk,mm)
    {
      

      var items = mm.split('_');
   var jjv=items[1];

    $('#mfgbbcg_'+jjv).autocomplete({
      

              source: function( request, response ) {
                $.ajax({
                  url : '<?php echo base_url();?>pos/searchitems3/',
                  dataType: "json",
              data: {
                 name_startsWith: request.term,
                 type: 'country_table',
                 row_num : 1
              },
               success: function( data ) {
                
                  response( $.map( data, function( item ) {
                  var code = item.split("|");
                  return {
                    label: code[0],
                    value: code[0],
                    data : item
                  }
                }));
              }
                });
              },
              autoFocus: true,          
              minLength: 0,
              select: function( event, ui ) {
              

            var names = ui.item.data.split("|");

            console.log(names[1], names[2], names[3]);   

                    $('#expdate_'+jjv).val(names[1]);
                    $('#mexpdate_'+jjv).val(names[2]);
                    $('#mfgname'+jjv).val(names[3]);

                   


            

          }           
            });
            
            }

          
      

</script>




<!-- Modal -->
<div class="modal fade" id="Addcategory" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("AddCategory");?></h4>
      </div>
      <?php echo form_open_multipart('categories/add'); ?>
      <div class="modal-body">
           <div class="form-group">
             <label for="CategoryName"><?=label("CategoryName");?></label>
             <input type="text" maxlength="50" name="name" class="form-control" id="CategoryName" placeholder="<?=label("CategoryName");?>" required>
           </div>
      </div>
      <div class="modal-footer">

        <button  data-dismiss="modal" onclick="return kakkakat();" type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?=label("Submit");?></button>


      <button  type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?=label("Close");?></button>
        
      </div>
   <?php echo form_close(); ?>
    </div>
 </div>
</div>




<!-- Modal -->
<div class="modal fade" id="Addbrand" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("Add Brand");?></h4>
      </div>
      <?php echo form_open_multipart('categories/add'); ?>
      <div class="modal-body">
           <div class="form-group">
             <label for="CategoryName"><?=label("Brand");?></label>
             <input type="text" maxlength="50" name="Brandname" class="form-control" id="Brandname" placeholder="<?=label("Brand");?>" required>
           </div>
      </div>
      <div class="modal-footer">

        <button  data-dismiss="modal" onclick="return kakkakbar();" type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?=label("Submit");?></button>


      <button  type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?=label("Close");?></button>
        
      </div>
   <?php echo form_close(); ?>
    </div>
 </div>
</div>





<!-- Modal -->
<div class="modal fade" id="Addtax" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("Add");?></h4>
      </div>
      <?php echo form_open_multipart('tax/add'); ?>
      <div class="modal-body">
           <div class="form-group">
             <label for="CategoryName"><?=label("tax");?> <?=label("Name");?></label>
             <input type="text" maxlength="50" name="taxName" class="form-control" id="taxName" required>
           </div>

           <div class="form-group">
             <label for="CategoryName"><?=label("tax");?>(%)</label>
             <input type="text" maxlength="2" name="persent" class="form-control" id="persent"  required>
           </div>

           <div class="form-group">
             <label for="CategoryName"><?=label("tax");?> <?=label("type");?></label>
             <select class="form-control" name="custtype" id="custtype">
              <option value="1"  >Local State</option>
              <option value="2"  >Other State</option>
             </select>
           </div>


      </div>
      <div class="modal-footer">

        <button  data-dismiss="modal" onclick="return kakkaktax();" type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?=label("Submit");?></button>


      <button  type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?=label("Close");?></button>
        
      </div>
   <?php echo form_close(); ?>
    </div>
 </div>
</div>
<!-- /.Modal -->




<div class="modal fade" id="AddSupplier" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("Add");?></h4>
      </div>
      
      <div class="modal-body">
            <div class="form-group">
              <div class="col-xs-6">
             <label for="SupplierName"><?=label("SupplierName");?></label>
             <input type="text" name="name" maxlength="50" Required class="form-control" id="SupplierName" placeholder="<?=label("SupplierName");?>">
           </div>
           <div class="col-xs-6">
             <label for="SupplierPhone"><?=label("SupplierPhone");?></label>
             <input type="text" name="phone" Required maxlength="30" class="form-control" id="SupplierPhone" placeholder="<?=label("SupplierPhone");?>">
           </div>
           </div>
           <div class="form-group">

           <div class="col-xs-6">
             <label for="SupplierEmail"><?=label("SupplierEmail");?></label>
             <input type="email" maxlength="50"  name="email" class="form-control" id="SupplierEmail" placeholder="<?=label("SupplierEmail");?>">
           </div>
           <div class="form-group">
             <div class="col-xs-6">
             <label for="City">City</label>
             <input name="city" class="form-control" id="city" required="" placeholder="City" type="text">
           </div>

            <div class="col-xs-6">
             <label for="Country">Country</label>
             <input name="country" class="form-control" required="" id="country" placeholder="Country" type="text">
           </div>
          
           </div>
           <div class="col-xs-6">
             <label for="SupplierEmail">GST <?=label("Number");?></label>
             <input type="text" maxlength="50"  name="gst"  class="form-control" id="gst" placeholder="GST <?=label("Number");?>">
           </div>
           
           </div>

           
         
            

             <input name="city"  value="Chennai" class="form-control" id="city" Required placeholder="City" type="hidden">
           


     
            
             <input name="country" class="form-control" value="India"  Required id="country" placeholder="Country" type="hidden">
           
          
       


          <div class="col-xs-6">
           <label for="Note"><?=label("Address");?></label>
           <textarea id="adress" class="form-control" name="adress"></textarea>
          </div>


           <div class="col-xs-6">
           <label for="Note"><?=label("note");?></label>
           <textarea id="summernotes" class="form-control" name="note"></textarea>
          </div>


      </div>

<style type="text/css">
.modal-footer
{
border-top: 0px solid #e5e5e5;
}
</style>


      <div class="modal-footer">

       <button  data-dismiss="modal" onclick="return kakkak();" type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?=label("Submit");?></button>

        <button  type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?=label("Close");?></button>
        
      </div>

   
    </div>
 </div>
</div>
<!-- /.Modal -->





<script type="text/javascript">



   function kakkaktax()
  {
    
    var taxName = $('#taxName').val();
     var persent = $('#persent').val();
     var custtype = $('#custtype').val();




     if(CategoryName=='')
    {
      return false;
    }
    
     
  $.ajax({
      url : "<?php echo site_url('tax/addajax')?>/",
      type: "POST",
      data: {taxName:taxName,persent:persent,custtype:custtype},
      success: function(data)
      {
         $('#taxName').val('');
         $('#persent').val('');
         $('#custtype').val('');
        
          $('#ttaxx').html(data);
     

 $('#printSection').html(data);
   $('#Addpayament').modal('show');

},
      error: function (jqXHR, textStatus, errorThrown)
      {
         alert("Please reload this page");
      }
  });

  }




  
   function kakkak()
  {
    
    var SupplierName = $('#SupplierName').val();
     var SupplierPhone = $('#SupplierPhone').val();
     var SupplierEmail = $('#SupplierEmail').val();
     var gst = $('#gst').val();
     var adress = $('#adress').val();
     var country =  $('#country').val();
     var city =  $('#city').val();
     var summernotes = $('#summernotes').val();


     if(SupplierName=='')
    {
      return false;
    }

     
  $.ajax({
      url : "<?php echo site_url('suppliers/addajax')?>/",
      type: "POST",
      data: {city:city,country:country,name:SupplierName,phone:SupplierPhone,email:SupplierEmail,gst:gst,adress:adress,note:summernotes},
      success: function(data)
      {


        
         $('#SupplierName').val('');
         $('#city').val('');
         $('#country').val('');
         $('#SupplierPhone').val('');
         $('#SupplierEmail').val('');
         $('#gst').val('');
         $('#adress').val('');
         $('#summernotes').val('');
          $('#Supplier').html(data);
     

 $('#printSection').html(data);
   $('#Addpayament').modal('show');

},
      error: function (jqXHR, textStatus, errorThrown)
      {
         alert("Please reload this page");
      }
  });

  }



   function kakkakat()
  {
    
    var goryName = $('#CategoryName').val();
    if(goryName=='')
    {
      return false;
    }
     

     
  $.ajax({
      url : "<?php echo site_url('categories/addajax')?>/",
      type: "POST",
      data: {name:goryName},
      success: function(data)
      {
        
         $('#CategoryName').val('');
         
         $('#Category').html(data);
     

 $('#printSection').html(data);
   $('#Addpayament').modal('show');

},
      error: function (jqXHR, textStatus, errorThrown)
      {
         alert("Please reload this page");
      }
  });

  }
   function kakkakbar()
  {
    
    var goryName = $('#Brandname').val();
     
  if(goryName=='')
    {
      return false;
    }
     
     
  $.ajax({
      url : "<?php echo site_url('brand/addajax')?>/",
      type: "POST",
      data: {name:goryName},
      success: function(data)
      {
        
         $('#Brandname').val('');
         
         $('#brandd').html(data);
     

 $('#printSection').html(data);
   $('#Addpayament').modal('show');

},
      error: function (jqXHR, textStatus, errorThrown)
      {
         alert("Please reload this page");
      }
  });

  }


</script>
 <script type="text/javascript">
             
$(document).ready(function() {
  $('#birthday_date').datepicker({
      todayHighlight: true,
      autoclose:true
  });
 });

$(document).ready(function() {
  $('#anniversary_date').datepicker({
      todayHighlight: true,
      autoclose:true
  });
 });
           </script>

           
 <style type="text/css">
.klkl
{
/* display: block;*/
/*width: 100%;*/
height: 34px;
padding: 6px 12px;
font-size: 14px;
line-height: 1.42857143;
color: #555;
background-color: #fff;
background-image: none;
border: 1px solid #18293d;
border-radius: 4px;
-webkit-box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
box-shadow: inset 0 1px 1px rgba(0,0,0,.075);
-webkit-transition: border-color ease-in-out .15s,-webkit-box-shadow ease-in-out .15s;
-o-transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
transition: border-color ease-in-out .15s,box-shadow ease-in-out .15s;
    }
</style>
<script>
function myFunction() 
{
    var input, filter, ul, li, a, i;
    input = document.getElementById("myInput");


    filter = input.value.toUpperCase();
     
    ul = document.getElementById("post-data");
    li = ul.getElementsByTagName("tr");

    for (i = 0; i < li.length; i++) {

         a = li[i].getElementsByTagName("a")[0];
              

 

        if (a.innerHTML.toUpperCase().indexOf(filter) > -1) 
        {
           
            li[i].style.display = "";
        } else 
        {
          
            li[i].style.display = "none";
        }
    }
}
</script>





