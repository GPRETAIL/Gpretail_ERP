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
   $lm = $uri->getSegment(3);

   $lmp=$db->query("select * from rolls where r_id='".$lm."' ")->getRowArray();
   ?>


   <div class="row" style="margin-top:20px;">
      <a class="btn btn-default float-right" href="#" onclick="history.back(-1)" style="margin-bottom:10px;">
         <i class="fa fa-arrow-left"></i> <?=label("Back");?></a>
     <?php echo form_open_multipart('roll/edit/'.$lm); ?>
         <div class="form-group">
            <label for="CategoryName"><?=label("Role");?> <?=label("Name");?></label>
            <input type="text" maxlength="50" name="CategoryName" value="<?php echo $lmp['r_name'];?>" class="form-control" id="CategoryName" placeholder="<?=label("Role Name");?>" required>
         </div>
     <div class="form-group">
       <button type="submit" class="btn btn-add"><?=label("Submit");?></button>
     </div>
     <?php echo form_close(); ?>
   </div>
</div>
