<!-- Page Content -->
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
        var ids = [ "companyName","gstnoo","summernotee","summernote2e","username","firstname","lastname","useraddr","password","confirm_password","StoreName","Country","City","Adresse","CustomeFooter","WarehouseName","Adressew"];
        control.makeTransliteratable(ids);
         control.showControl('translControl');
      }
      google.setOnLoadCallback(onLoad);
    </script>

 <?php 
      $ch = curl_init();
$jkjb=base_url();
$tyyp=explode("://", $jkjb);
$jkj=$tyyp['1'];

curl_setopt($ch, CURLOPT_URL,"https://www.codetechnology.in/crmusers/login/posusers");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS,"email=".$jkj);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$ssss = curl_exec ($ch);

curl_close ($ch);
$expp=explode("-",$ssss);
$uuserr=$expp['0'];
$sstore=$expp['1'];

$kuse=mysql_num_rows(mysql_query("select * from users "));
$kstr=mysql_num_rows(mysql_query("select * from stores ")); 

         $ch = curl_init();
$jkjb=base_url();
$tyyp=explode("://", $jkjb);
$jkj=$tyyp['1'];

$this->load->database();

curl_setopt($ch, CURLOPT_URL,"https://www.codetechnology.in/crmusers/login/possmsurlpos");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS,"email=".$jkj);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$ssss = curl_exec ($ch);

curl_close ($ch);
$kqpqp=explode(",",$ssss);

$urll=$kqpqp['0'];
$keyy=$kqpqp['1'];
$sedid=$kqpqp['2'];
$ritid=$kqpqp['3'];

$connert = @fsockopen("www.google.com", 80);

// only offline
/*if ($connert)
{
  
$xzxzx=str_replace("(","",str_replace(")","",GetVolumeLabel("c")));
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL,"http://chltech.in/retailenc/login/capcl_ddd");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS,"idd=".$xzxzx);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$cdd = curl_exec ($ch);
curl_close ($ch);
if($cdd==0)
{
mysql_query("update  settings set paskall='', phoneex2='' where id=1 ");
}

}*/


?>


<div class="container">
   <div class="row" style="margin-top:20px;">
      <div class="col-md-12">
         <!-- tab navigation -->
         <?php $tab = (isset($_GET['tab'])) ? $_GET['tab'] : null; ?>
         <ul class="nav nav-tabs">
            <li class="<?php echo ($tab == 'setting') ? 'active' : ''; ?>"><a href="#setting" data-toggle="tab"><i class="fa fa-cog" aria-hidden="true"></i> <?=label("Settings");?></a></li>
            <li class="<?php echo ($tab == 'users') ? 'active' : ''; ?>"><a href="#users" data-toggle="tab"><i class="fa fa-users" aria-hidden="true"></i> <?=label("users");?></a></li>
            <li class="<?php echo ($tab == 'stores') ? 'active' : ''; ?>"><a href="#stores" data-toggle="tab"><i class="fa fa-building-o" aria-hidden="true"></i> <?=label("Stores");?></a></li>
            <li class="<?php echo ($tab == 'warehouses') ? 'active' : ''; ?>"><a href="#warehouses" data-toggle="tab"><i class="fa fa-building" aria-hidden="true"></i> <?=label("Warehouses");?></a></li>


            <li class="<?php echo ($tab == 'settinggstt') ? 'active' : ''; ?>"><a href="#settinggstt" data-toggle="tab"><i class="fa fa-building" aria-hidden="true"></i> <?=label("Option");?> </a></li>

            <li class="<?php echo ($tab == 'settingpermi') ? 'active' : ''; ?>"><a href="#settingpermi" data-toggle="tab"><i class="fa fa-building" aria-hidden="true"></i> <?=label("Permission");?> </a></li> 

            <li class="<?php echo ($tab == 'settingreport') ? 'active' : ''; ?>"><a href="#settingreport" data-toggle="tab"><i class="fa fa-building" aria-hidden="true"></i> <?=label("Reports");?> </a></li> 

             <li class="<?php echo ($tab == 'smsapi') ? 'active' : ''; ?>"><a href="#smsapi" data-toggle="tab"><i class="fa fa-building" aria-hidden="true"></i> <?=label("SMS API");?></a></li>


            <li class="<?php echo ($tab == 'settingsms') ? 'active' : ''; ?>"><a href="#settingsms" data-toggle="tab"><i class="fa fa-building" aria-hidden="true"></i> <?=label("SMS");?> </a></li>

             <li class="<?php echo ($tab == 'printingsetup') ? 'active' : ''; ?>"><a href="#printingsetup" data-toggle="tab"><i class="fa fa-building" aria-hidden="true"></i> <?=label("printingsetup");?> </a></li>



<?php 
if($this->setting->backcloud==2 && $this->setting->apponords==1)
{ 
  ?>
            <li  class="<?php echo ($tab == 'settingreport') ? 'active' : ''; ?> basick">
            <a href="<?php echo base_url();?>sync" >
            <i class="fa fa-building" aria-hidden="true"></i>  <?=label("Backup My DB");?> 
            </a>
            </li>
<?php } ?>


         </ul>

         <!-- tab sections -->
         <div class="tab-content">





     <div class="tab-pane fade in <?php echo ($tab == 'settingreport') ? 'active' : ''; ?>" id="settingreport">
               <h4><?=label("Settings");?></h4>
               <p><?=label("SettingsDesciption");?></p>
               <?php echo form_open_multipart('settings/updatreportts'); ?>

<?php
$strid=$this->session->userdata('store') ? $this->session->userdata('store') : FALSE;
$wesw=mysql_fetch_array(mysql_query("select * from report_stting  where rsi=1 "));
?>



<table id="table" class="table table-striped table-bordered dataTable no-footer" role="grid" style="width: 50%;" width="50%" cellspacing="0">
      <thead class="thead-inverse">
        <tr role="row">
        <th  class="sorting" tabindex="0" aria-controls="table" rowspan="1" colspan="1" style="width: 252px;" aria-label="Date: activate to sort column ascending"><?=label("Report");?></th>

        <th class="sorting" tabindex="0" aria-controls="table" rowspan="1" colspan="1" style="width: 50px;" aria-label="Discount: activate to sort column ascending"><?=label("Show");?></th>

        <th class="sorting" tabindex="0" aria-controls="table" rowspan="1" colspan="1" style="width: 50px;" aria-label="Total: activate to sort column ascending"><?=label("Hide");?></th>



        
        </tr>
      </thead>
      <tbody>


      <tr role="row" class="even">
      <td><?=label("Customer");?></td>
      <td>
      <input type="radio" <?php if($wesw['r1']==1){ ?> checked="checked" <?php } ?> name="r1" id="r1" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r1']==0){ ?> checked="checked" <?php } ?> name="r1" id="rv1" value="0" />
      </td>
      </tr>


          <tr role="row" class="even">
      <td><?=label("Product");?></td>
      <td>
      <input type="radio" <?php if($wesw['r2']==1){ ?> checked="checked" <?php } ?> name="r2" id="r2" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r2']==0){ ?> checked="checked" <?php } ?> name="r2" id="rv2" value="0" />
      </td>
      </tr>


          <tr role="row" class="even">
      <td><?=label("Store");?></td>
      <td>
      <input type="radio" <?php if($wesw['r3']==1){ ?> checked="checked" <?php } ?> name="r3" id="r3" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r3']==0){ ?> checked="checked" <?php } ?> name="r3" id="rv3" value="0" />
      </td>
      </tr>    


      <tr role="row" class="even">
      <td><?=label("Product");?> <?=label("tax");?></td>
      <td>
      <input type="radio" <?php if($wesw['r4']==1){ ?> checked="checked" <?php } ?> name="r4" id="r4" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r4']==0){ ?> checked="checked" <?php } ?> name="r4" id="rv4" value="0" />
      </td>
      </tr>    

      <tr role="row" class="even">
      <td><?=label("Customer");?> <?=label("tax");?></td>
      <td>
      <input type="radio" <?php if($wesw['r5']==1){ ?> checked="checked" <?php } ?> name="r5" id="r5" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r5']==0){ ?> checked="checked" <?php } ?> name="r5" id="rv5" value="0" />
      </td>
      </tr>    


      <tr role="row" class="even">
      <td><?=label("Purchase");?></td>
      <td>
      <input type="radio" <?php if($wesw['r6']==1){ ?> checked="checked" <?php } ?> name="r6" id="r6" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r6']==0){ ?> checked="checked" <?php } ?> name="r6" id="rv6" value="0" />
      </td>
      </tr>    


      
       

      <tr role="row" class="even">
      <td><?=label("Purchase");?> <?=label("Product");?>  </td>
      <td>
      <input type="radio" <?php if($wesw['r8']==1){ ?> checked="checked" <?php } ?> name="r8" id="r8" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r8']==0){ ?> checked="checked" <?php } ?> name="r8" id="rv8" value="0" />
      </td>
      </tr>    


      <tr role="row" class="even">
      <td><?=label("Purchase");?> <?=label("Dealer");?></td>
      <td>
      <input type="radio" <?php if($wesw['r9']==1){ ?> checked="checked" <?php } ?> name="r9" id="r9" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r9']==0){ ?> checked="checked" <?php } ?> name="r9" id="rv9" value="0" />
      </td>
      </tr>    





      <tr role="row" class="even">
      <td><?=label("Stock");?>  <?=label("Store");?>  </td>
      <td>
      <input type="radio" <?php if($wesw['r12']==1){ ?> checked="checked" <?php } ?> name="r12" id="r12" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r12']==0){ ?> checked="checked" <?php } ?> name="r12" id="rv12" value="0" />
      </td>
      </tr>    


      <tr role="row" class="even">
      <td><?=label("Stock");?></td>
      <td>
      <input type="radio" <?php if($wesw['r13']==1){ ?> checked="checked" <?php } ?> name="r13" id="r13" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r13']==0){ ?> checked="checked" <?php } ?> name="r13" id="rv13" value="0" />
      </td>
      </tr>    


      <tr role="row" class="even">
      <td><?=label("Profit");?> </td>
      <td>
      <input type="radio" <?php if($wesw['r14']==1){ ?> checked="checked" <?php } ?> name="r14" id="r14" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r14']==0){ ?> checked="checked" <?php } ?> name="r14" id="rv14" value="0" />
      </td>
      </tr>    


      <tr role="row" class="even">
      <td><?=label("Supplier");?></td>
      <td>
      <input type="radio" <?php if($wesw['r15']==1){ ?> checked="checked" <?php } ?> name="r15" id="r15" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r15']==0){ ?> checked="checked" <?php } ?> name="r15" id="rv15" value="0" />
      </td>
      </tr>        


      <tr role="row" class="even">
      <td><?=label("Sales");?> </td>
      <td>
      <input type="radio" <?php if($wesw['r16']==1){ ?> checked="checked" <?php } ?> name="r16" id="r16" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r16']==0){ ?> checked="checked" <?php } ?> name="r16" id="rv16" value="0" />
      </td>
      </tr>        


      <tr role="row" class="even">
      <td><?=label("HSN");?>  <?=label("Sales");?> </td>
      <td>
      <input type="radio" <?php if($wesw['r17']==1){ ?> checked="checked" <?php } ?> name="r17" id="r17" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r17']==0){ ?> checked="checked" <?php } ?> name="r17" id="rv17" value="0" />
      </td>
      </tr>    

       <tr role="row" class="even">
      <td><?=label("Purchase");?></td>
      <td>
      <input type="radio" <?php if($wesw['r10']==1){ ?> checked="checked" <?php } ?> name="r10" id="r10" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r10']==0){ ?> checked="checked" <?php } ?> name="r10" id="rv10" value="0" />
      </td>
      </tr>   



      <tr role="row" class="even">
      <td><?=label("Sales");?>  <?=label("Return");?> </td>
      <td>
      <input type="radio" <?php if($wesw['r11']==1){ ?> checked="checked" <?php } ?> name="r11" id="r11" value="1" />
      </td>
      <td>
      <input type="radio" <?php if($wesw['r11']==0){ ?> checked="checked" <?php } ?> name="r11" id="rv11" value="0" />
      </td>
      </tr>    





    

</tbody>
</table>





                
<?php
if($this->setting->setting_save==1)
{ ?>

<div class="col-md-12">
<button type="submit" class="btn btn-add btn-lg"><?=label("Submit");?></button>
</div>

 <?php }else { echo "*** Demo version don't have permission to edit this information *** ";  }?> 
               <?php echo form_close(); ?>
            </div>






<div class="tab-pane fade in <?php echo ($tab == 'settingsms') ? 'active' : ''; ?>" id="settingsms">
               <h4>SMS <?=label("Settings");?></h4>
               
               <?php echo form_open_multipart('settings/updateSettings'); ?>
                 
                  <div class="col-md-6">
                


<?php
$mkk=mysql_fetch_array(mysql_query("select birth_anni_modul,id from settings where id=1"));
if($mkk['birth_anni_modul']==1)
{
?>

                    <h4><?=label("Birthday");?></h4>
                    <textarea class="form-control" id="birthday_date" name="birthday_date"><?=$this->setting->birthday_date;?></textarea>

                    <h4><?=label("Anniversary");?></h4>
                    <textarea class="form-control" id="anniversary_date" name="anniversary_date"><?=$this->setting->anniversary_date;?></textarea>

                     <?php }else{

         ?>
<input type="hidden"   value="0" name="birthday_date" class="form-control" id="birthday_date" placeholder="Date">

<input type="hidden"    value="0" name="anniversary_date" class="form-control" id="anniversary_date" placeholder="Date">
<?php } ?>


<h4><?=label("Billing");?></h4>
<textarea class="form-control" id="billing_sms" name="billing_sms"><?=$this->setting->billing_sms;?></textarea>


                  </div>

                  <div class="form-group col-md-6">
                     <h4><?=label("amf");?></h4>
                  
                  
                    
                    <p>Total Amount
                      <span class="pull-right"><a href="#" class="add_merge_field">{total_amount}</a></span>
                    </p>
                    <p>Bill Number
                      <span class="pull-right"><a href="#" class="add_merge_field">{bill_number}</a></span>
                    </p>
                    <p>Date
                      <span class="pull-right"><a href="#" class="add_merge_field">{date}</a></span>
                    </p>
                    <p>Customer Name
                      <span class="pull-right"><a href="#" class="add_merge_field">{customer_name}</a></span>
                    </p>
                    
                    
                    </p>
                    <p>Store Address
                      <span class="pull-right"><a href="#" class="add_merge_field">{delivery_address}</a></span>
                    </p> 

                    <p>Cashier Name
                      <span class="pull-right"><a href="#" class="add_merge_field">{emp_name}</a></span>
                    </p> 

                    <p>Delivery Address
                      <span class="pull-right"><a href="#" class="add_merge_field">{store_address}</a></span>
                    </p> 

                    <p><?=label("Birthday");?>
                      <span class="pull-right"><a href="#" class="add_merge_field">{birthday_date}</a></span>
                    </p> 

                    <p><?=label("Anniversary");?>
                      <span class="pull-right"><a href="#" class="add_merge_field">{anniversary_date}</a></span>
                    </p>


                    
                      

                </div>
                  




                    
                    
         <?php
if($this->setting->setting_save==1)
{ ?>


                 <div class="col-md-12">
                     <br><br>
                    <button type="submit" class="btn btn-add btn-lg"><?=label("Submit");?></button>
                 </div>

               <?php }else { echo "*** Demo version don't have permission to edit this information *** ";  }?> 

               <?php echo form_close(); ?>
            </div>


 <div class="tab-pane fade in <?php echo ($tab == 'settingpermi') ? 'active' : ''; ?>" id="settingpermi">
               <h4><?=label("Permission");?></h4>
               <p><?=label("SettingsDesciption");?></p>
               <?php echo form_open_multipart('settings/updatepermiss'); ?>

<select style="width:150px;" name="role" id="role" class="form-control" onchange=" getRegisterReport();" >
           <option>Select Role</option>  
           <?php
           
           
           $poee=mysql_query("select nname from permission_new order by nname asc ");
           while($poeef=mysql_fetch_array($poee))
           {
           ?>
           <option value="<?php echo $poeef['nname'];?>"><?php echo $poeef['nname'];?></option>
                
            <?php 
            } 
            ?>
            </select>

 <div class="modal-body">
            <div id="RegisterDetails">
               <!-- close register detail goes here -->
            </div>
         </div>
         <script type="text/javascript">
           
           function getRegisterReport()
   {

      
      var Range = $('#role').val();

      
    
           // ajax set data to database
        $.ajax({
            url : "<?php echo site_url('reports/getRegrtrools')?>/",
            type: "POST",
            data: { Range: Range},
            success: function(data)
            {


                $('#RegisterDetails').html(data);
             
            },
            error: function (jqXHR, textStatus, errorThrown)
            {
               alert("error");
            }
       });
   }


         </script>

               

<?php
if($this->setting->setting_save==1)
{ 
?>

<div class="col-md-12">
<button type="submit" class="btn btn-add btn-lg"><?=label("Submit");?></button>
</div>

 <?php }else { echo "*** Demo version don't have permission to edit this information *** ";  }?> 


               <?php echo form_close(); ?>
            </div>






























             <div class="tab-pane fade in <?php echo ($tab == 'settinggstt') ? 'active' : ''; ?>" id="settinggstt">
               
               <p><?=label("SettingsDesciption");?></p>
               <?php echo form_open_multipart('settings/updategsttax'); ?>

<?php
$strid=$this->session->userdata('store') ? $this->session->userdata('store') : FALSE;
$ikkxm=mysql_fetch_array(mysql_query("select * from settings  where id=1 "));
?>





<div class="col-xs-8" >
    

    <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
      <thead class="thead-inverse">
        <tr>
        <th><?=label('Option');?> </th>
          <th><?=label('Choice');?></th>
          <th><?=label('Choice');?></th>
          </tr>
          </thead>

          <tbody>

<tr>
        <th><?=label("Discount");?></th>
        <th><input type="radio" <?php if($ikkxm['disc_pro']==1){ ?> checked="checked" <?php } ?> name="prowise" id="prowise" value="1" /> <?=label("Productwise");?> <?=label("Discount");?></th>

        <th><input <?php if($ikkxm['disc_all']==1){ ?> checked="checked" <?php } ?> type="radio" name="prowise" id="allpro" value="2" /> <?=label("OverAllDiscount");?></th>
</tr>





<tr>
        <th><?=label("sendsmstocustomer");?></th>
        <th>
       <input type="radio" <?php if($ikkxm['smsset']==1){ ?> checked="checked" <?php } ?> name="smsset" id="sms" value="1" /> <?=label("Yes");?> </th>

        <th><input <?php if($ikkxm['smsset']==2){ ?> checked="checked" <?php } ?> type="radio" name="smsset" id="sms1" value="2" /> 
        <?=label("NO");?></th>
</tr>

       


<tr>
<th>GST <?=label("tax");?></th>
<th><input <?php if($ikkxm['gst_tax']==1){ ?> checked="checked" <?php } ?> type="radio" name="gsttax" id="gsttax" value="1" />
<?=label("Yes");?></th>

<th><input <?php if($ikkxm['gst_tax']==0){ ?> checked="checked" <?php } ?>  name="gsttax" id="gsttax1" type="radio"  value="0" /><?=label("NO");?></th>
</tr>

<tr>
<th>IGST <?=label("tax");?></th>
<th><input <?php if($ikkxm['igsttax']==1){ ?> checked="checked" <?php } ?> type="radio" name="igsttax" id="igsttax" value="1" />
<?=label("Yes");?></th>

<th><input <?php if($ikkxm['igsttax']==0){ ?> checked="checked" <?php } ?>  name="igsttax" id="igsttax1" type="radio"  value="0" /><?=label("NO");?></th>
</tr>



<tr>
<th> <?=label("displayaddresinposrecipt");?></th>
<th><input <?php if($ikkxm['ddsp']==1){ ?> checked="checked" <?php } ?> type="radio" name="ddsp" id="ddsp" value="1" />
<?=label("Yes");?></th>

<th><input <?php if($ikkxm['ddsp']==0){ ?> checked="checked" <?php } ?>  name="ddsp" id="ddsp1" type="radio"  value="0" /><?=label("NO");?></th>
</tr>
<tr>
<th> <?=label("displaycustinposrecipt");?></th>
<th><input <?php if($ikkxm['ddspct']==1){ ?> checked="checked" <?php } ?> type="radio" name="ddspct" id="ddspct" value="1" />
<?=label("Yes");?></th>

<th><input <?php if($ikkxm['ddspct']==0){ ?> checked="checked" <?php } ?>  name="ddspct" id="ddspct1" type="radio"  value="0" /><?=label("NO");?></th>
</tr>


<tr>
<th> <?=label("stockstoring");?></th>
<th><input <?php if($ikkxm['warstore']==1){ ?> checked="checked" <?php } ?> type="radio" name="warstore" id="warstore" value="1" />
<?=label("Warehouses");?></th>

<th><input <?php if($ikkxm['warstore']==0){ ?> checked="checked" <?php } ?>  name="warstore" id="warstore1" type="radio"  value="0" /><?=label("Stores");?></th>
</tr>


<tr>
<th> <?=label("Product");?> <?=label("Search");?> in <?=label("Purchase");?></th>
<th><input <?php if($ikkxm['cat_pur']==1){ ?> checked="checked" <?php } ?> type="radio" name="cat_pur" id="cat_pur" value="1" />
<?=label("Category");?></th>

<th><input <?php if($ikkxm['cat_pur']==0){ ?> checked="checked" <?php } ?>  name="cat_pur" id="cat_pur" type="radio"  value="0" /><?=label("Barcode");?></th>
</tr>







<tr>
        <th>Display Virtual keyboard</th>
        <th>
       <input <?php if($ikkxm['keyboard']==1){ ?> checked="checked" <?php } ?> type="radio"  name="ttouch" id="ttouch" value="1"  />

        <?=label("Yes");?> </th>

        <th>
        <input <?php if($ikkxm['keyboard']==0){ ?> checked="checked" <?php } ?> type="radio"  name="ttouch" id="ttouch1"  value="0" />

   
        <?=label("NO");?></th>
</tr>

<tr>
        <th>Tax show in POS</th>
        <th>
       <input <?php if($ikkxm['taxsho']==1){ ?> checked="checked" <?php } ?> type="radio"  name="taxsho" id="taxsho" value="1"  />

        <?=label("Yes");?> </th>

        <th>
        <input <?php if($ikkxm['taxsho']==0){ ?> checked="checked" <?php } ?> type="radio"  name="taxsho" id="taxsho"  value="0" />

   
        <?=label("NO");?></th>
</tr>


<tr>
        <th>Show Declaration</th>
        <th>
       <input <?php if($ikkxm['decln']==1){ ?> checked="checked" <?php } ?> type="radio"  name="decln" id="taxsho" value="1"  />

        <?=label("Yes");?> </th>

        <th>
        <input <?php if($ikkxm['decln']==0){ ?> checked="checked" <?php } ?> type="radio"  name="decln" id="taxsho"  value="0" />

   
        <?=label("NO");?></th>
</tr>


<tr>
        <th>Maintain inventory</th>
        <th>
       <input <?php if($ikkxm['maininv']==1){ ?> checked="checked" <?php } ?> type="radio"  name="maininv" id="maininv" value="1"  />

        <?=label("Yes");?> </th>

        <th>
        <input <?php if($ikkxm['maininv']==0){ ?> checked="checked" <?php } ?> type="radio"  name="maininv" id="maininv"  value="0" />

   
        <?=label("NO");?></th>
</tr>

<tr>
        <th>Product Editable in POS</th>
        <th>
       <input <?php if($ikkxm['editpro']==1){ ?> checked="checked" <?php } ?> type="radio"  name="editpro" id="editpro" value="1"  />

        <?=label("Yes");?> </th>

        <th>
        <input <?php if($ikkxm['editpro']==0){ ?> checked="checked" <?php } ?> type="radio"  name="editpro" id="editpro"  value="0" />

   
        <?=label("NO");?></th>
</tr>

<?php
$mkk=mysql_fetch_array(mysql_query("select birth_anni_modul,id from settings where id=1"));
if($mkk['birth_anni_modul']==1)
{ ?>
<tr>
        <th><?=label("autobirthday");?></th>
        <th>
       <input <?php if($ikkxm['auto_birth']==1){ ?> checked="checked" <?php } ?> type="radio"  name="auto_birth" id="auto_birth" value="1"  />

        <?=label("yes");?> </th>

        <th>
        <input <?php if($ikkxm['auto_birth']==0){ ?> checked="checked" <?php } ?> type="radio"  name="auto_birth" id="auto_birth"  value="0" />

   
        <?=label("no");?></th>
</tr>


<tr>
        <th><?=label("autoanniversary");?></th>
        <th>
       <input <?php if($ikkxm['auto_anniver']==1){ ?> checked="checked" <?php } ?> type="radio"  name="auto_anniver" id="auto_anniver" value="1"  />

        <?=label("yes");?> </th>

        <th>
        <input <?php if($ikkxm['auto_anniver']==0){ ?> checked="checked" <?php } ?> type="radio"  name="auto_anniver" id="auto_anniver"  value="0" />

   
        <?=label("no");?></th>
</tr>

<?php 
}
else
{
?>
<input   type="hidden"  name="auto_birth" id="auto_birth"  value="0" />
  <input   type="hidden"  name="auto_anniver" id="auto_anniver"  value="0" />
<?php } ?>




        <tr>
        <th>POS Screen Type</th>
        <th colspan="2">
<select required="required" class=" form-control " id="destpp" name="destpp"  tabindex="-1" >
<option <?php if($ikkxm['destpp']==2){ ?> selected="selected" <?php } ?> value="2"><?=label("TouchScreen");?></option>
<option <?php if($ikkxm['destpp']==1){ ?> selected="selected" <?php } ?> value="1">Non <?=label("TouchScreen");?></option>
<option <?php if($ikkxm['destpp']==0){ ?> selected="selected" <?php } ?> value="0">List</option>
</select>
        </th>
        </tr>




<?php 
if($this->setting->apponords==1)
{ 
?>
    <tr>
        <th><?=label("Backupfrequency");?></th>
        <th colspan="2">
<select required="required" class=" form-control " id="backtimfrecon" name="backtimfrecon"  tabindex="-1" >
       <option <?php if($ikkxm['backtimfrecon']==0){ ?> selected="selected" <?php } ?> value="0">No Need</option>
       <option <?php if($ikkxm['backtimfrecon']==1){ ?> selected="selected" <?php } ?> value="1">Every 1 Hours</option>
       <option <?php if($ikkxm['backtimfrecon']==2){ ?> selected="selected" <?php } ?> value="2">Every 2 Hours</option>
       <option <?php if($ikkxm['backtimfrecon']==3){ ?> selected="selected" <?php } ?> value="3">Every 3 Hours</option>
       <option <?php if($ikkxm['backtimfrecon']==4){ ?> selected="selected" <?php } ?> value="4">Every 4 Hours</option>
       <option <?php if($ikkxm['backtimfrecon']==5){ ?> selected="selected" <?php } ?> value="5">Every 5 Hours</option>
       <option <?php if($ikkxm['backtimfrecon']==6){ ?> selected="selected" <?php } ?> value="6">Every 6 Hours</option>
       <option <?php if($ikkxm['backtimfrecon']==7){ ?> selected="selected" <?php } ?> value="7">Every 7 Hours</option>
       <option <?php if($ikkxm['backtimfrecon']==8){ ?> selected="selected" <?php } ?> value="8">Every 8 Hours</option>
       <option <?php if($ikkxm['backtimfrecon']==9){ ?> selected="selected" <?php } ?> value="9">Every 9 Hours</option>
       <option <?php if($ikkxm['backtimfrecon']==10){ ?> selected="selected" <?php } ?> value="10">Every 10 Hours</option>
       <option <?php if($ikkxm['backtimfrecon']==11){ ?> selected="selected" <?php } ?> value="11">Every 11 Hours</option>
       <option <?php if($ikkxm['backtimfrecon']==12){ ?> selected="selected" <?php } ?> value="12">Every 12 Hours</option>
       </select>
       
        </th>
        </tr>


<?php if($ikkxm['backcloud']==2){ ?>

        <tr>
        <th><?=label("Backupfrequency");?></th>



        <th>

<input <?php if($ikkxm['backsorno']==1){ ?> checked="checked" <?php } ?> type="radio"  name="backsorno" id="backsorno"  value="1" /> <?=label("Confirm");?> &nbsp; &nbsp; &nbsp;
 </th> <th>

<input <?php if($ikkxm['backsorno']==0){ ?> checked="checked" <?php } ?> type="radio"  name="backsorno" id="backsorno1" value="0"  /> <?=label("Auto");?>


        </th>
</tr>


<tr>
        <th><?=label("Backuplogout");?></th>
        <th>
<input <?php if($ikkxm['backuplogout']==1){ ?> checked="checked" <?php } ?> type="radio"  name="backuplogout" id="backuplogout" value="1"  /><?=label("Yes");?> </th>

<th>
<input <?php if($ikkxm['backuplogout']==0){ ?> checked="checked" <?php } ?> type="radio"  name="backuplogout" id="backuplogout1"  value="0" /><?=label("NO");?></th>
</tr>





<?php 
}
else
{
  ?>





<input  type="hidden"  name="backsorno" id="backsorno1" value="0"  /> 
<input  type="hidden"  name="backuplogout" id="backuplogout1"  value="0" />

<?php }

}
else
{
  ?>
<input  type="hidden"  id="backtimfrecon" name="backtimfrecon" value="0"  /> 
<input  type="hidden"  name="backsorno" id="backsorno1" value="0"  /> 
<input  type="hidden"  name="backuplogout" id="backuplogout1"  value="0" />


  <?php } ?>




    


          </tbody>
     





          </table>
          </div> 





                

<?php
if($this->setting->setting_save==1)
{ ?>

                 
                 <div class="col-md-12">
                    <button type="submit" class="btn btn-add btn-lg"><?=label("Submit");?></button>
                 </div>

               <?php }else { ?><div class="col-md-12"> <?php echo "*** Demo version don't have permission to edit this information *** "; ?> </div> <?php } ?> 
               <?php echo form_close(); ?>

                 
                 
               <?php echo form_close(); ?>
            </div>












              <div class="tab-pane fade in <?php echo ($tab == 'setting') ? 'active' : ''; ?>" id="setting">
              
               
               <?php echo form_open_multipart('settings/updateSettings'); ?>


<fieldset style="border: 1px solid #e4e3e3;">

<legend style="border: 0px black solid;margin-left: 1em;width:auto;color: #1e73be;margin-bottom: 5px;  ">Company Information</legend>

  <div class="form-group col-md-3">
                   <label for="companyName"><?=label("Company");?></label>
                   <input type="text" value="<?=$this->setting->companyname;?>" name="companyname" class="form-control" id="companyName" placeholder="<?=label("Company");?>">
                 </div>
                     <div class="form-group col-md-3">
                   <label for="phone"><?=label("Phone");?></label>
                   <input type="text" value="<?=$this->setting->phone;?>" name="phone" class="form-control" id="phone" placeholder="<?=label("Phone");?>">
                 </div>

                 <div class="form-group col-md-6">
                    <label for="logo"><?=label("CompanyLogo");?></label>
                    <input type="file" name="userfile" id="logo">
                    <?php if($this->setting->logo){ ?><img src="<?=base_url()?>files/Setting/<?=$this->setting->logo;?>" alt="" class="float-right" width="100px"/><?php } else { ?><img src="<?=base_url()?>assets/img/logo.png" alt="logo" class="float-right" width="100px"><?php } ?>
                 </div>



<div class="form-group col-md-3">
                    <label for="numberDecimal"><?=label("Select");?> <?=label("State");?></label>

                   <select name="mystate" id="mystate"  class="form-control">

             <?php
              $stty=mysql_query("select * from state where CountryID=1 order by StateName asc ");
             while($sttyf=mysql_fetch_array($stty))
              {
              ?>
            <option <?php if($this->setting->mystate==$sttyf['StateID']){ ?> selected="selected"  <?php } ?> value="<?php echo $sttyf['StateID'];?>" ><?php echo $sttyf['StateName'];?></option>
            <?php
              }
              ?>
                       </select>

                     
<input type="hidden" name="keyboard" id="keyboard" value="<?php echo $this->setting->keyboard;?>" />
                     
                   
                 </div>


                 <div class="form-group col-md-3">
                   <label for="numberDecimal"><?= label('timezone');?></label>                      
                   <select name="timezone" class="form-control">
                         <option value="0"><?= label('timezone');?></option>
                         <?php foreach($Timezones as $t) { ?>
                           <option value="<?php print $t['zone'] ?>" <?= $t['zone'] === $this->setting->timezone ? 'selected' : ''; ?>>
                             <?php print $t['diff_from_GMT'] . ' - ' . $t['zone'] ?>
                           </option>
                         <?php } ?>
                       </select>
                  
                 </div>

                

                    <div class="form-group col-md-2">
                   <label for="currency"><?=label("Currency");?></label>
                   <input type="text" value="<?=$this->setting->currency;?>" name="currency" class="form-control" id="currency" placeholder="<?=label("Currency");?>">
                 </div> 

              



                  


                 <div class="form-group col-md-2">
                   <label for="currency"><?=label("GST No.");?></label>
                   <input type="text" value="<?=$this->setting->gstnoo;?>" name="gstnoo" class="form-control" id="gstnoo" placeholder="<?=label("Currency");?>">
                 </div>

                 <div class="form-group col-md-2">
                   <label for="DefaultDiscount"><?=label("DefaultDiscount");?></label>
                   <input type="text" value="<?=$this->setting->discount;?>" name="discount" class="form-control" id="DefaultDiscount" placeholder="<?=label("DefaultDiscount");?>">
                 </div>







</fieldset>
<br>
<fieldset style="border: 1px solid #e4e3e3;">

<legend style="border: 0px black solid;margin-left: 1em;width:auto;color: #1e73be;margin-bottom: 5px;  ">Bank Details</legend>


                  <div class="form-group col-md-3">
                   <label for="currency"><?=label("Pan No");?></label>
                   <input type="text" value="<?=$this->setting->pann;?>" name="pann" class="form-control" id="pann" placeholder="<?=label("Pan No");?>">
                 </div> 

                      <div class="form-group col-md-3">
                   <label for="currency"><?=label("Acc No");?></label>
                   <input type="text" value="<?=$this->setting->aaco;?>" name="aaco" class="form-control" id="aaco" placeholder="<?=label("Acc No");?>">
                 </div> 

                    <div class="form-group col-md-2">
                   <label for="currency"><?=label("Bank Name");?></label>
                   <input type="text" value="<?=$this->setting->bbank;?>" name="bbank" class="form-control" id="bbank" placeholder="<?=label("Bank Name");?>">
                 </div> 

                  <div class="form-group col-md-2">
                   <label for="currency"><?=label("Branch");?></label>
                   <input type="text" value="<?=$this->setting->bbranch;?>" name="bbranch" class="form-control" id="bbranch" placeholder="<?=label("Branch");?>">
                 </div> 

                   <div class="form-group col-md-2">
                   <label for="currency"><?=label("IFS Code");?></label>
                   <input type="text" value="<?=$this->setting-> iifs;?>" name="iifs" class="form-control" id="iifs" placeholder="<?=label("IFS code");?>">
                 </div> 

                 </fieldset>



<br>
<fieldset style="border: 1px solid #e4e3e3;">

<legend style="border: 0px black solid;margin-left: 1em;width:auto;color: #1e73be;margin-bottom: 5px;  ">Print Details</legend>

   <div class="form-group col-md-3">
                   <label for="numberDecimal"><?=label("NoofPrintinPos");?></label>
<input type="text" value="<?=$this->setting->pptt;?>" name="pptt" class="form-control" id="pptt" />                  

                 </div> 



                 
                  <div class="form-group col-md-3">
                   <label for="numberDecimal"><?=label("Print Size in Pos");?></label>

 


<select class="form-control" name="printersizew" id="printersizew">
<?php 
$prin_tb=mysql_query("select * from print_setup order by dp_id ");
while($prin_tbf=mysql_fetch_array($prin_tb))
{ 
?>
<option value="<?php echo $prin_tbf['dp_id'];?>" <?php if($this->setting->printersizew==$prin_tbf['dp_id']){ ?> selected="selected"  <?php } ?>  ><?php echo $prin_tbf['dp_printer_name'];?></option>
<?php } ?>

                      
                   </select>
                 </div>

                <div class="form-group col-md-2">
                   <label for="DefualtTax"><?=label("suffixsalesid");?></label>
                   <input type="text" value="<?=$this->setting->regidd;?>" name="regidd" class="form-control" id="regidd" placeholder="<?=label("DefualtTax");?>">
                 </div>
            
                
                

               
             

                   <div class="form-group col-md-3">
                     <label for="DefualtTax"><?=label("Directprint");?></label>
           <select class="form-control" name="ddirectprint" id="ddirectprint">
                      <option value="1" <?=$this->setting->ddirectprint==1 ? 'selected' : '';?>>Yes</option>
                      <option value="2" <?=$this->setting->ddirectprint==2 ? 'selected' : '';?>>No</option>
                      
                   </select>

                  </div>

<?php 
if($this->setting->ddirectprint==1)
{ ?>
                  <div class="col-md-3">
                    <label for="DefualtTax"><?=label("Printername");?></label>

                    <select class="form-control" name="pprintername" id="pprintername">

<?php 
$getprt=printer_list(PRINTER_ENUM_LOCAL| PRINTER_ENUM_DEFAULT );
$printers = serialize($getprt);
$printers=unserialize($printers);
foreach ($printers as $PrintDest)
  { ?>
    <option value="<?php echo $PrintDest['NAME'];?>" <?php if($this->setting->pprintername==$PrintDest['NAME']){ ?> selected ="selected"  <?php } ?>  ><?php echo explode(",",$PrintDest["DESCRIPTION"])[1];?></option>
 <?php } ?>

 </select>
 </div>

<?php 
}
 
?>

               
               
                   
                   


   <div class="form-group col-md-2">
                   <label for="DefualtTax"><?=label("DefualtTax");?></label>
                   <input type="text" value="<?=$this->setting->tax;?>" name="tax" class="form-control" id="DefualtTax" placeholder="<?=label("DefualtTax");?>">
                 </div>



               
                 <div class="form-group col-md-3">
                   <label for="numberDecimal"><?=label("numberDecimal");?></label>
                   <select class="form-control" name="decimals" id="numberDecimal">
                      <option value="1" <?=$this->setting->decimals===1 ? 'selected' : '';?>>0.1</option>
                      <option value="2" <?=$this->setting->decimals===2 ? 'selected' : '';?>>0.01</option>
                      <option value="3" <?=$this->setting->decimals===3 ? 'selected' : '';?>>0.001</option>
                   </select>
                 </div> 
                  

                
                  




                 <div class=" form-group col-md-6">
                    
                    <label for="numberDecimal"><?=label("ReceiptHeader");?></label>  

                    <input type="text" class="form-control" id="summernotee" name="receiptheader" value="<?=$this->setting->receiptheader;?>"  />


                  </div>

                  <div class="col-md-6">
                    

                     <label for="numberDecimal"><?=label("Declaration");?></label> 


                    <input type="text" class="form-control" id="declaration" name="declaration" value="<?=$this->setting->declaration;?>" >
                  </div>
          



                  <div class="form-group col-md-6">
                     
                     <label for="numberDecimal"><?=label("ReceiptFooter");?></label> 
                     

                      <input type="text" class="form-control" id="summernote2e" name="receiptfooter" value="<?=$this->setting->receiptfooter;?>" >

                  </div>   


                  </fieldset>


                
                
                      <input type="hidden" name="stripe" value="0" />
                      <input type="hidden" name="stripe" value="1" <?=strval($this->setting->stripe) === '1' ? 'checked' : '';?>>
                     
                     
                   
                   
                  
                  
                          <input type="hidden" value="<?=$this->setting->stripe_secret_key;?>" name="stripe_secret_key" class="form-control" id="stripe_secret_key" placeholder="stripe secret key">
                      
                      
                          <input type="hidden" value="<?=$this->setting->stripe_publishable_key;?>" name="stripe_publishable_key" class="form-control" id="stripe_publishable_key" placeholder="stripe publishable key">
                    
           
<?php 
if($this->setting->apponords==1)
{ 
?>

  <br>
<fieldset style="border: 1px solid #e4e3e3;">

<legend style="border: 0px black solid;margin-left: 1em;width:auto;color: #1e73be;margin-bottom: 5px;  ">

BackUp Details</legend>

 <div class="form-group col-md-3">
                     <h4><?=label("Storebackup");?></h4>
                     
<input value="<?php echo $this->setting->backupdir;?>" name="backupdir" class="form-control" id="backupdir"  type="text">
                  </div>

<div class="form-group col-md-3">
                     <h4><?=label("Storebackupplace");?></h4>
                     

<select class="form-control" name="backcloud" id="backcloud">
<option value="1" <?php if($this->setting->backcloud=="1"){ ?> selected="selected"  <?php } ?>  >Local Only</option>
<option value="2" <?php if($this->setting->backcloud=="2"){ ?> selected="selected"  <?php } ?> >Local and Cloud</option>

</select>

                  </div>

                      </fieldset>

                  <?php
              }
              else
              {
                ?>
                
<input type="hidden" value="" name="backupdir" id="backupdir" >
<input type="hidden" value="" name="backcloud" id="backcloud" >

<?php  
} ?>






                  <div class="form-group col-md-12">
                     <h4><?=label("themesPick");?></h4>
                     <label class="themesPick col-md-3">
                        <input type="radio" name="theme" value="Light" <?=$this->setting->theme === 'Light' ? 'checked' : '';?>/>
                        <img src="<?=base_url()?>assets/img/Light-theme.jpg" alt="Light-theme">
                      </label>
                   <!--    <label class="themesPick col-md-3">
                        <input type="radio" name="theme" value="Dark" <?=$this->setting->theme === 'Dark' ? 'checked' : '';?> />
                        <img src="<?=base_url()?>assets/img/Dark-theme.jpg" alt="Dark-theme">
                      </label> -->
                  </div>  

       


<?php
if($this->setting->setting_save==1)
{ ?>

                 <div class="col-md-12">
                    <button type="submit" class="btn btn-add btn-lg"><?=label("Submit");?></button>
                 </div>
               <?php }else { echo "*** Demo version don't have permission to edit this information *** ";  }?> 
               <?php echo form_close(); ?>
            </div>


























            <div class="tab-pane fade in <?php echo ($tab == 'smsapi') ? 'active' : ''; ?>" id="smsapi">
               <table class="table">
                  <tr>
                     <th><?=label("S.No");?></th>
                     <th><?=label("URL");?></th>
                     <th width="200"><?=label("Status");?></th>
                     <th width="150"><?=label("Action");?></th>
                  </tr>
<?php 
$ll=0;
$mkm=mysql_query("select * from smstabble_new order by ss asc ");
while($mkmf=mysql_fetch_array($mkm))
{
  $ll++;

  $plmm=$mkmf['ss'];
                  
                 ?>
<tr>
<td><?=$ll;?></td>
<td><?=$mkmf['ss_url'];?></td>
<td>
<?php
if($mkmf['ss_status']==1)
{ ?>
<a class="btn btn-success" href="<?php echo base_url();?>api_new/deactive/<?=$plmm;?>" >Active</a>

<?php } else { ?>
<a class="btn btn-danger" href="<?php echo base_url();?>api_new/active/<?=$plmm;?>" >Deactive</a>
<?php } ?>
</td>
                      
                      
<td><div class="btn-group">
<a class="btn btn-default" href="api_new/delete/<?=$plmm;?>" data-toggle="tooltip" data-placement="top" title="<?=label('Delete');?>"><i class="fa fa-times"></i></a>
<a class="btn btn-default" href="api_new/edit/<?=$plmm;?>" data-toggle="tooltip" data-placement="top" title="<?=label('Edit');?>"><i class="fa fa-pencil"></i></a>
</div>
</td>
                   </tr>
                   <?php  } ?>
                  </table>
                  <!-- Button trigger modal -->
                  <button type="button" class="btn btn-primary btn-green" data-toggle="modal" data-target="#Addapi">
                     <?=label("Add API");?>
                  </button>
            </div>



            
<div class="modal fade" id="Addapi" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document">
    <div class="modal-content">

        

      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("Add API");?></h4>
      </div>

      <div class="form-group col-md-12">
                    <h4>Available merge fields</h4>
                    <p>Mobile Number
                    <span class="pull-right"><a href="#" class="add_merge_field">{mobile_number}</a></span>
                    </p>
                    <p>Message
                    <span class="pull-right"><a href="#" class="add_merge_field">{message_details}</a></span>
                    </p>
      </div>


      <?php echo form_open_multipart('api_new/add'); ?>
      <div class="form-group col-md-12">
            <div class="form-group">
             <label for="WarehouseName"><?=label("API URL");?> *</label>
             <textarea  name="ss_url" class="form-control" id="ss_url" placeholder="<?=label("API URL");?>" required></textarea>
           </div>
           

      </div>



      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal"><?=label("Close");?></button>
        <button type="submit" class="btn btn-add"><?=label("Submit");?></button>
      </div>
   <?php echo form_close(); ?>
    </div>
 </div>
</div>


            <!-- users tab -->
            <div class="tab-pane fade in <?php echo ($tab == 'users') ? 'active' : ''; ?>" id="users">
               <table class="table">
                  <tr>
                     <th><?=label("Avatar");?></th>
                     <th><?=label("firstname");?></th>
                     <th><?=label("lastname");?></th>
                     <th><?=label("Username");?></th>
                     <th><?=label("Role");?></th>
                     <th><?=label("lastActive");?></th>
                     <th><?=label("Action");?></th>
                  </tr>
                  <?php foreach ($Users as $user):?>
                   <tr>
                      <td><img class="img-circle topbar-userpic hidden-xs" src="<?=$user->avatar ? base_url().'files/Avatars/'.$user->avatar : base_url().'assets/img/Avatar.jpg' ?>" width="30px" height="30px"></td>
                      <td><?=$user->firstname;?></td>
                      <td><?=$user->lastname;?></td>
                      <td><?=$user->username;?></td>
                      <td><?=$user->role;?></td>

                      <?php 
                      if($user->last_active=='' || $user->last_active=='NULL')
                      {
$typ=$user->created_at;
                      }
                      else
                      {
$typ=$user->last_active;
                      }
                      ?>
                      <td><?=date("d-m-Y H:i:s", strtotime($typ));?></td>
                      <td><div class="btn-group">
                            <?php if($user->id !== 1){?><a class="btn btn-default" href="settings/deleteUser/<?=$user->id;?>" data-toggle="tooltip" data-placement="top" title="<?=label('Delete');?>"><i class="fa fa-times"></i></a><?php } ?>
                            <a class="btn btn-default" href="settings/editUser/<?=$user->id;?>" data-toggle="tooltip" data-placement="top" title="<?=label('Edit');?>"><i class="fa fa-pencil"></i></a>
                          </div>
                       </td>
                   </tr>
                <?php endforeach;?>
               </table>
               <!-- Button trigger modal -->



<button type="button" class="btn btn-primary btn-green" data-toggle="modal" data-target="#AddUser">
<?=label("Adduser");?>
</button>




            </div>     




<!-- //printing -->

             <div class="tab-pane fade in <?php echo ($tab == 'printingsetup') ? 'active' : ''; ?>" id="printingsetup">
               <table class="table">
                  <tr>
                     <th><?=label("SI");?></th>
                     <th><?=label("Printer Type");?></th>
                     <th><?=label("Printer Width");?></th>
                  <th><?=label("Action");?></th>
                  </tr>
                  <?php 

                $maas=mysql_query("select * from print_setup ");
                while($maasf=mysql_fetch_array($maas))
                  {
                  ?>
                   <tr>
                     

                      <td><?=$maasf['dp_id'];?></td>
                      <td><?=$maasf['dp_printer_name'];?></td>
                      <td><?=$maasf['dp_pt_width'];?></td>
                      



                      <td><div class="btn-group">
                            <!-- <?php if($user->id !== 1)
                            {?><a class="btn btn-default" href="settings/deleteUser/<?=$maasf['dp_id'];?>" data-toggle="tooltip" data-placement="top" title="<?=label('Delete');?>"><i class="fa fa-times"></i></a><?php } ?> -->

<?php if($maasf['dp_id']>2 && $this->setting->setting_save==1){ ?>

                            <a class="btn btn-default" href="settings/editprint/<?=$maasf['dp_id'];?>" data-toggle="tooltip" data-placement="top" title="<?=label('Edit');?>"><i class="fa fa-pencil"></i></a>
                          <?php } ?>

                          &nbsp;



                          </div>
                       </td>
                   </tr>
                <?php } ?>
               </table>
               <!-- Button trigger modal -->









            </div>
            <!-- Stores tab -->
            <div class="tab-pane fade in <?php echo ($tab == 'stores') ? 'active' : ''; ?>" id="stores">
               <table class="table">
                  <tr>
                     <th><?=label("Stores");?> <?=label("Id");?></th>
                     <th><?=label("Stores");?> <?=label("Name");?></th>
                     <th><?=label("Email");?></th>
                     <th><?=label("StorePhone");?></th>
                     <th><?=label("Country");?></th>
                     <th><?=label("City");?></th>
                     <th><?=label("Action");?></th>
                  </tr>
                  <?php foreach ($Stores as $store):?>
                   <tr>
                      <td><?=$store->id;?></td>
                      <td><?=$store->name;?></td>
                      <td><?=$store->email;?></td>
                      <td><?=$store->phone;?></td>
                      <td><?=$store->country;?></td>
                      <td><?=$store->city;?></td>
                      <td><div class="btn-group">
                            <a class="btn btn-default" <?= $store->id == 1 ? 'disabled="disabled"' : '';?> href="stores/delete/<?=$store->id;?>" data-toggle="tooltip" data-placement="top" title="<?=label('Delete');?>"><i class="fa fa-times"></i></a>
                            <a class="btn btn-default" href="stores/edit/<?=$store->id;?>" data-toggle="tooltip" data-placement="top" title="<?=label('Edit');?>"><i class="fa fa-pencil"></i></a>
                          </div>
                       </td>
                   </tr>
                   <?php endforeach;?>
                  </table>
                  <!-- Button trigger modal -->

              


         <button type="button" class="btn btn-primary btn-green" data-toggle="modal" data-target="#AddStore">
                     <?=label("AddStore");?>
                  </button>
                 
                 
            </div>
            <!-- Warehouse tab -->
            <div class="tab-pane fade in <?php echo ($tab == 'warehouses') ? 'active' : ''; ?>" id="warehouses">
               <table class="table">
                  <tr>
                     <th><?=label("WarehouseName");?></th>
                     <th><?=label("WarehousePhone");?></th>
                     <th><?=label("Email");?></th>
                     <th><?=label("Adresse");?></th>
                     <th><?=label("Action");?></th>
                  </tr>
                  <?php foreach ($warehouses as $warehouse):?>
                   <tr>
                      <td><?=$warehouse->name;?></td>
                      <td><?=$warehouse->phone;?></td>
                      <td><?=$warehouse->email;?></td>
                      <td><?=$warehouse->adresse;?></td>
                      <td><div class="btn-group">
                            <a class="btn btn-default" href="warehouses/delete/<?=$warehouse->id;?>" data-toggle="tooltip" data-placement="top" title="<?=label('Delete');?>"><i class="fa fa-times"></i></a>
                            <a class="btn btn-default" href="warehouses/edit/<?=$warehouse->id;?>" data-toggle="tooltip" data-placement="top" title="<?=label('Edit');?>"><i class="fa fa-pencil"></i></a>
                          </div>
                       </td>
                   </tr>
                   <?php endforeach;?>
                  </table>
                  <!-- Button trigger modal -->
                  <button type="button" class="btn btn-primary btn-green" data-toggle="modal" data-target="#AddWarehouse">
                     <?=label("AddWarehouse");?>
                  </button>
            </div>
         </div>
      </div>
   </div>
</div>
<!-- /.container -->
<!-- add user Modal -->
<div class="modal fade" id="AddUser" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("Adduser");?></h4>
      </div>
      <?php echo form_open_multipart('settings/addUser'); ?>
      <div class="modal-body">
            <div class="form-group">
              <div class="col-xs-6">
             <label for="username"><?=label("Username");?> *</label>
             <input type="text" name="username" class="form-control" id="username" placeholder="<?=label("Username");?>" required>
           </div>
           <div class="col-xs-6">
             <label for="firstname"><?=label("firstname");?> *</label>
             <input type="text" name="firstname" class="form-control" id="firstname" placeholder="<?=label("firstname");?>" required>
           </div>
           </div>
           <div class="form-group">
            <div class="col-xs-6">
             <label for="lastname"><?=label("lastname");?></label>
             <input type="text" name="lastname" class="form-control" id="lastname" placeholder="<?=label("lastname");?>">
           </div>


           <div class="col-xs-6">
<label for="lastname"><?=label("Role");?></label>
           <select name="role" id="role" class="form-control">
            
           <?php
           
           
           $poee=mysql_query("select nname from permission_new order by nname asc ");
           while($poeef=mysql_fetch_array($poee))
           {
           ?>
           <option value="<?php echo $poeef['nname'];?>"><?php echo $poeef['nname'];?></option>
                
            <?php 
            } 
            ?>
            </select>

            </div>           
            </div>           


            <div class="form-group">
              <div class="col-xs-6">
<label for="lastname"><?=label("Store");?></label>
           
           <select name="store_id" id="store_id" class="form-control">
           <?php
           $pss=mysql_query("select id,name from stores order by name asc ");
           while($pssf=mysql_fetch_array($pss))
           {
           ?>

           <option value="<?php echo $pssf['id'];?>"><?php echo $pssf['name'];?></option>

           <?php 
           } 
            ?>
           </select>

           </div>

<style type="text/css">
.modal-footer
{
border-top: 0px solid #e5e5e5;
}
</style>

           <div class="col-xs-6">
             <label for="email"><?=label("Email");?></label>
             <input type="email" name="email" class="form-control" id="email" placeholder="<?=label("Email");?>">
           </div> 
           </div> 

           <div class="form-group">
            <div class="col-xs-6">

             <label for="password"><?=label("Password");?> *</label>
             <input type="password" name="password" class="form-control" id="password" placeholder="<?=label('Password');?>" required>
             
           </div>

           

           <div class="col-xs-6">
            <label for="confirm_password"><?=label("PasswordRepeat");?> *</label>
             <input type="password" name="PasswordRepeat" class="form-control" id="confirm_password" placeholder="<?=label('PasswordRepeat');?>" required>

          </div>
          </div>
           <div class="col-xs-12">
            <label for="email"><?=label("Adresse");?></label>
             <textarea name="useraddr" class="form-control" id="useraddr" ></textarea>

             
           </div>
           <div class="col-xs-12">
             <label for="Avatar"><?=label("Avatar");?></label>
             <input type="file" name="userfile" id="Avatar">
           </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal"><?=label("Close");?></button>
        <button type="submit" class="btn btn-add"><?=label("Submit");?></button>
      </div>
   <?php echo form_close(); ?>
    </div>
 </div>
</div>
<!-- /.Modal -->


<!-- add store Modal -->
<div class="modal fade" id="AddStore" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("AddStore");?></h4>
      </div>
      <?php echo form_open_multipart('stores/add'); ?>
      <div class="modal-body">
            <div class="form-group">
              <div class="col-xs-6">
             <label for="StoreName"><?=label("Stores");?> <?=label("Name");?> *</label>
             <input type="text" name="name" class="form-control" id="StoreName" placeholder="<?=label("StoreName");?>" required>
           </div>
           <div class="col-xs-6">
             <label for="email"><?=label("Email");?></label>
             <input type="email" name="email" class="form-control" id="email" placeholder="<?=label("Email");?>">
          </div>
          </div>
           <div class="form-group">
            <div class="col-xs-6">
             <label for="StorePhone"><?=label("StorePhone");?></label>
             <input type="text" name="phone" class="form-control" id="StorePhone" placeholder="<?=label("StorePhone");?>">
           </div>
           <div class="col-xs-6">
             <label for="Country"><?=label("Country");?></label>
             <input type="text" name="country" class="form-control" id="Country" placeholder="<?=label("Country");?>">
           </div>
           </div>
           <div class="form-group">
            <div class="col-xs-6">
             <label for="City"><?=label("City");?></label>
             <input type="text" name="city" class="form-control" id="City" placeholder="<?=label("City");?>">
           </div>
           <div class="col-xs-6">
             <label for="Adresse"><?=label("Adresse");?></label>
             <input type="text" name="adresse" class="form-control" id="Adresse" placeholder="<?=label("Adresse");?>">
           </div>
           </div>
           <div class="col-xs-12">
             <label for="CustomeFooter"><?=label("CustomeFooter");?></label>
             <input type="text" name="footer_text" class="form-control" id="CustomeFooter" placeholder="<?=label("CustomeFooter");?>">
             <br>
           </div>
           <br>
      </div>
      <div class="modal-footer">

        <button type="button" class="btn btn-default" data-dismiss="modal"><?=label("Close");?></button>
        <button type="submit" class="btn btn-add"><?=label("Submit");?></button>
      </div>
   <?php echo form_close(); ?>
    </div>
 </div>
</div>
<!-- /.Modal -->

<!-- add warehouse Modal -->
<div class="modal fade" id="AddWarehouse" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("AddWarehouse");?></h4>
      </div>
      <?php echo form_open_multipart('warehouses/add'); ?>
      <div class="modal-body">
            <div class="form-group">
             <label for="WarehouseName"><?=label("WarehouseName");?> *</label>
             <input type="text" name="name" class="form-control" id="WarehouseName" placeholder="<?=label("WarehouseName");?>" required>
           </div>
           <div class="form-group">
             <label for="WarehousePhone"><?=label("WarehousePhone");?></label>
             <input type="text" name="phone" class="form-control" id="WarehousePhone" placeholder="<?=label("WarehousePhone");?>">
          </div>
           <div class="form-group">
             <label for="email"><?=label("Email");?></label>
             <input type="email" name="email" class="form-control" id="email" placeholder="<?=label("Email");?>">
          </div>
           <div class="form-group">
             <label for="Adresse"><?=label("Adresse");?></label>
             <input type="text" name="adresse" class="form-control" id="Adressew" placeholder="<?=label("Adresse");?>">
           </div>
  

      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal"><?=label("Close");?></button>
        <button type="submit" class="btn btn-add"><?=label("Submit");?></button>
      </div>
   <?php echo form_close(); ?>
    </div>
 </div>
</div>
<!-- /.Modal -->











<script>


$( ".basick" ).click(function() {
  waitingDialog.show('Please wait,updating your tables...');

  $(document).keypress(function(e) 
{
    return false;
});


$(window).on('mousewheel DOMMouseScroll', function() {
    return false;
});
window.onwheel = function(){ return false; }
$(document).ready(function () {
   $('body').bind('cut copy paste', function (e) {
        e.preventDefault();
    });
   $("body").on("contextmenu",function(e){
        return false;
    });
});
setTimeout(function () {
  

}, 3000);
});

$( ".custom" ).click(function() {
  waitingDialog.show('Loading Something...',{
    headerText: 'jQueryScript',
        dialogSize: 'sm',
        progressType: 'danger'
    });
setTimeout(function () {
  waitingDialog.hide();
}, 3000);
});
$( ".callback" ).click(function() {
  waitingDialog.show('Loading Something...',{
        progressType: 'success',
        onHide: function () {alert('Callback!');}
    });
setTimeout(function () {
  waitingDialog.hide();
}, 3000);
});
</script>



  


<script type="text/javascript">





/******** passwors confirmation validation ****************/

var currency = document.getElementById("currency");

function validatecurrency(){
  if(currency.value.length < 3) {
    currency.setCustomValidity("The Currency code must be at least 3 characters length");
  } else {
    currency.setCustomValidity('');
  }
}
if(currency) currency.onchange = validatecurrency;

$('.collapse').collapse()
</script>
