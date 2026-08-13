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
        var ids = [ "CategoryName" ];
        control.makeTransliteratable(ids);
         control.showControl('translControl');
      }
      google.setOnLoadCallback(onLoad);
    </script>

 <h3><?=label("Edit");?>
  
   </h3>
   <hr>
   <?php
   $uri = service('uri');
   $lm=$uri->getSegment(3);

   $lmp=$db->query("select * from payment_mode where id='".$lm."' ")->getRowArray();
   ?>


   <div class="row" style="margin-top:20px;">
      <a class="btn btn-default float-right" href="#" onclick="history.back(-1)" style="margin-bottom:10px;">
         <i class="fa fa-arrow-left"></i> <?=label("Back");?></a>
     <?php echo form_open_multipart('PaymentMode/edit/'.$lm); ?>
         <div class="form-group">
            <label for="CategoryName"><?=label("paymentMethod");?> <?=label("Name");?></label>
            <input type="text" maxlength="50" name="CategoryName" value="<?php echo $lmp['name'];?>" class="form-control" id="CategoryName" placeholder="<?=label("paymentMethod");?>" required>
         </div>


           <div class="form-group">
             <label for="CategoryName"><?=label("validatee");?> </label>
             
             <select name="validate_it" id="validate_it"  class="form-control" >
               <option value="1"  <?php if($lmp['validate_it']==1){?> selected="selected" <?php } ?> >Yes</option>
               <option value="0" <?php if($lmp['validate_it']==0){?> selected="selected" <?php } ?> >No</option>
             </select>
           </div>

     <div class="form-group">
       <button type="submit" class="btn btn-add"><?=label("Submit");?></button>
     </div>
     <?php echo form_close(); ?>
   </div>
</div>
