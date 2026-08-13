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
        var ids = [ "WarehouseName","Adresse","summernotee","summernote2e","username","firstname","lastname","useraddr","password","confirm_password","StoreName","Country","City","Adresse","CustomeFooter","WarehouseName","Adressew"];
        control.makeTransliteratable(ids);
         control.showControl('translControl');
      }
      google.setOnLoadCallback(onLoad);
    </script>
 <h3><?=label("Edit");?> 
 
   </h3>
   <hr>
<?php

$mkk=mysql_fetch_array(mysql_query("select * from smstabble_new where ss='".$ss."' "));
?>
    <div class="form-group col-md-12">
                    <h4>Available merge fields</h4>
                    <p>Mobile Number
                    <span class="pull-right"><a href="#" class="add_merge_field">{mobile_number}</a></span>
                    </p>
                    <p>Message
                    <span class="pull-right"><a href="#" class="add_merge_field">{message_details}</a></span>
                    </p>
      </div>
      <a class="btn btn-default float-right" href="#" onclick="history.back(-1)" style="margin-bottom:10px;">
         <i class="fa fa-arrow-left"></i> <?=label("Back");?></a>
      <?php echo form_open_multipart('api_new/edit/'.$ss); ?>



      <div class="form-group">
      <label for="WarehouseName"><?=label("API URL");?> *</label>
      <textarea rows="5" type="text" name="ss_url"   class="form-control" id="ss_url"   required><?=$mkk['ss_url'];?></textarea>
     </div>
     

     
      <div class="form-group">
        <button type="submit" class="btn btn-green col-md-6 flat-box-btn"><?=label("Submit");?></button>
      </div>
      <?php echo form_close(); ?>
    </div>
</div>
