<div class="container container-small">

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
        var ids = [  "CustomerName","customeraddress" ];
        control.makeTransliteratable(ids);
         control.showControl('translControl');
      }
      google.setOnLoadCallback(onLoad);
    </script>
    
 <h3><?=label("Edit");?>  <a  style="float: right;" class="btn btn-default float-right" href="#" onclick="history.back(-1)"style="margin-bottom:10px;">
         <i class="fa fa-arrow-left"></i> <?=label("Back");?></a> </h3>
   <hr>
   <div class="row" style="margin-top:20px;">
      
      <?php echo form_open_multipart('customers/edit/'.$customer->id); ?>


       
         <div class="form-group">
           
           

            <div class="col-xs-6">
            <label for="CustomerName"><?=label("CustomerName");?></label>
            <input type="text" maxlength="50" Required name="name" value="<?=$customer->name;?>" class="form-control" id="CustomerName" placeholder="<?=label("CustomerName");?>">
           </div>

           </div>


           <div class="form-group">
            <div class="col-xs-6">
            <label for="CustomerPhone"><?=label("CustomerPhone");?></label>
            <input type="text" name="phone" maxlength="30" value="<?=$customer->phone;?>" class="form-control" id="CustomerPhone" placeholder="<?=label("CustomerPhone");?>">
           </div>
          <div class="col-xs-6">
            <label for="CustomerEmail"><?=label("CustomerEmail");?></label>
            <input type="email" maxlength="50" name="email" value="<?=$customer->email;?>" class="form-control" id="CustomerEmail" placeholder="<?=label("CustomerEmail");?>">
           </div>
           </div>

           <div class="form-group">
            <div class="col-xs-6">
            <label for="CustomerDiscount"><?=label("CustomerDiscount");?></label>
            <input type="text" maxlength="5" name="discount" value="<?=$customer->discount;?>" class="form-control" id="CustomerDiscount" placeholder="<?=label("CustomerDiscount");?>">
           </div> 

         <div class="col-xs-6">
            <label for="CustomerDiscount"><?=label("GST");?></label>

            <input type="text" maxlength="5" name="gstno" value="<?=$customer->gstno;?>" class="form-control" id="gstno" >


           
           </div>
           </div>

 <div class="form-group">
  <div class="col-xs-6">
             <label for="CustomerEmail"><?=label("State");?></label>

        
           <select class="form-control" name="custstate" id="custstate">
                <?php
                $db = \Config\Database::connect();

                $states = $db->table('state')->where('CountryID', 1)->orderBy('StateName', 'ASC')->get()->getResult();
                 foreach ($states as $state): ?>
                    <option value="<?= esc($state->StateID) ?>" <?= ($customer->custstate == $state->StateID) ? 'selected' : '' ?>>
                        <?= esc($state->StateName) ?>
                    </option>
                <?php endforeach; ?>
            </select>

           </div>

<div class="col-xs-6">
             <label for="CustomerEmail"><?=label("Customer Type");?></label>

             <select class="form-control" name="custtype" id="custtype">
             
            <option <?php if($customer->custtype==1){ ?> selected="selected" <?php } ?> value="1" >Retail</option>
            <option <?php if($customer->custtype==2){ ?> selected="selected" <?php } ?> value="2" >Wholesale</option>
           


           </select>

           </div>
           </div>

            <div class="form-group">
          <div class="col-xs-12">

           <label for="CustomerDiscount"><?=label("Credit Days");?></label>
             <input value="<?=$customer->creddate;?>"  type="text" maxlength="3" name="creddate" class="form-control" id="creddate" placeholder="<?=label("Credit Days");?>">

          </div>
           </div>

           
<?php
$mkk=mysql_fetch_array(mysql_query("select birth_anni_modul,id from settings where id=1"));
if($mkk['birth_anni_modul']==1)
{
?>
           <div class="form-group">
             <div class="col-xs-12">
            <label for="CustomerDiscount"><?=label("Birthday");?></label>
 <input type="text" maxlength="30" required="required" value="<?php echo date("d-m-Y",strtotime($customer->birthday_date));?>" name="birthday_date" class="form-control" id="birthday_date" placeholder="Date">
           
           </div>  
           </div>  


           <div class="form-group">
             <div class="col-xs-12">
            <label for="CustomerDiscount"><?=label("Anniversary");?></label>
 <input type="text" maxlength="30" required="required" value="<?php echo date("d-m-Y",strtotime($customer->anniversary_date));?>" name="anniversary_date" class="form-control" id="anniversary_date" placeholder="Date">
           
           </div>
           </div>
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
         <?php }else{

         ?>


<input type="hidden"   value="<?php echo date("d-m-Y");?>" name="birthday_date" class="form-control" id="birthday_date" placeholder="Date">

<input type="hidden"   value="<?php echo date("d-m-Y");?>" name="anniversary_date" class="form-control" id="anniversary_date" placeholder="Date">

         <?php  } ?>



          <div class="form-group">
            <div class="col-xs-6">
             <label for="CustomerDiscount">Billing  <?=label("Adresse");?></label>
             <textarea name="customeraddress" class="form-control" id="customeraddress" ><?=$customer->customeraddress;?></textarea>
             </div>
             <div class="col-xs-6">

             <label for="CustomerDiscount"><?=label("Shipping Address");?></label>
             <textarea name="shppingad" class="form-control" id="shppingad" ><?=$customer->shppingad;?></textarea>
             </div>

          </div>















      </div>
      <div class="form-group">
        <br>
       <button type="submit" class="btn btn-add"><?=label("Submit");?></button>
      </div>
      <?php echo form_close(); ?>
</div>
