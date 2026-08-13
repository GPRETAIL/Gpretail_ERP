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
    
 <h3><?=label("Edit");?>  </h3>
   <hr>
   <div class="row" style="margin-top:20px;">
      <a class="btn btn-default float-right" href="#" onclick="history.back(-1)"style="margin-bottom:10px;">
         <i class="fa fa-arrow-left"></i> <?=label("Back");?></a>
      <?php echo form_open_multipart('customers/edit/'.$customer->id); ?>




            <div class="form-group">
            <label for="CustomerName"><?=label("CustomerName");?></label>
            <input type="text" maxlength="50" Required name="name" value="<?=$customer->name;?>" class="form-control" id="CustomerName" placeholder="<?=label("CustomerName");?>">
           </div>
           <div class="form-group">
            <label for="CustomerPhone"><?=label("CustomerPhone");?></label>
            <input type="text" name="phone" maxlength="30" value="<?=$customer->phone;?>" class="form-control" id="CustomerPhone" placeholder="<?=label("CustomerPhone");?>">
           </div>
           <div class="form-group">
            <label for="CustomerEmail"><?=label("CustomerEmail");?></label>
            <input type="email" maxlength="50" name="email" value="<?=$customer->email;?>" class="form-control" id="CustomerEmail" placeholder="<?=label("CustomerEmail");?>">
           </div>

           <div class="form-group">
            <label for="CustomerDiscount"><?=label("CustomerDiscount");?></label>
            <input type="text" maxlength="5" name="discount" value="<?=$customer->discount;?>" class="form-control" id="CustomerDiscount" placeholder="<?=label("CustomerDiscount");?>">
           </div> 

           <div class="form-group">
            <label for="CustomerDiscount"><?=label("Adresse");?></label>
            <textarea name="customeraddress" class="form-control" id="customeraddress" ><?=$customer->customeraddress;?></textarea>
           
           </div>

 <div class="form-group">
             <label for="CustomerEmail"><?=label("State");?></label>

             <select class="form-control" name="custstate" id="custstate">
             <?php
              $stty=mysql_query("select * from state where CountryID=1 order by StateName asc ");
             while($sttyf=mysql_fetch_array($stty))
              {
              ?>
            <option <?php if($customer->custstate==$sttyf['StateID']){ ?> selected="selected" <?php } ?> value="<?php echo $sttyf['StateID'];?>" ><?php echo $sttyf['StateName'];?></option>
            <?php
              }
              ?>

           </select>

           </div>










      </div>
      <div class="form-group">
       <button type="submit" class="btn btn-add"><?=label("Submit");?></button>
      </div>
      <?php echo form_close(); ?>
</div>
