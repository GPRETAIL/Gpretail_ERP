<div class="container container-small">

<h3> <?=label("Edit");?> 
     </h3>
   <hr>
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
        var ids = [ "SupplierName","summernotes" ];
        control.makeTransliteratable(ids);
         control.showControl('translControl');
      }
      google.setOnLoadCallback(onLoad);
    </script>

   <div class="row" style="margin-top:20px;">
      <a class="btn btn-default float-right" href="#" onclick="history.back(-1)"style="margin-bottom:10px;">
         <i class="fa fa-arrow-left"></i> <?=label("Back");?></a>
      <?php echo form_open('suppliers/edit/'.$supplier->id); ?>
            <div class="form-group">
            <label for="SupplierName"><?=label("SupplierName");?></label>
            <input type="text" maxlength="50" Required name="name" value="<?=$supplier->name;?>" class="form-control" id="SupplierName" placeholder="<?=label("SupplierName");?>">
           </div>
           <div class="form-group">
            <label for="SupplierPhone"><?=label("SupplierPhone");?></label>
            <input type="text" name="phone" maxlength="30" value="<?=$supplier->phone;?>" class="form-control" id="SupplierPhone" placeholder="<?=label("SupplierPhone");?>">
           </div>

           <div class="form-group">
            <label for="SupplierEmail"><?=label("SupplierEmail");?></label>
            <input type="email" maxlength="50" name="email" value="<?=$supplier->email;?>" class="form-control" id="SupplierEmail" placeholder="<?=label("SupplierEmail");?>">
           </div>
           <div class="form-group">
            <label for="SupplierEmail"><?=label("GST");?> No</label>
            <input type="text" maxlength="50" name="gst" value="<?=$supplier->gst;?>" class="form-control" id="gst" placeholder="<?=label("gst");?>">
           </div>
           <div class="form-group">
            <label for="SupplierEmail"><?=label("country");?></label>
            <input type="text" maxlength="50" name="country" value="<?=$supplier->country;?>" class="form-control" id="country" placeholder="<?=label("country");?>">
           </div>
           <div class="form-group">
            <label for="SupplierEmail"><?=label("city");?></label>
            <input type="text" maxlength="50" name="city" value="<?=$supplier->city;?>" class="form-control" id="city" placeholder="<?=label("city");?>">
           </div>

           <div class="form-group">
           <label for="Note"><?=label("address");?></label>
           <textarea class="form-control" id="adress" name="adress"><?=$supplier->adress;?></textarea>
          </div>



           <div class="form-group">
           <label for="Note"><?=label("note");?></label>
           <textarea class="form-control" id="summernotes" name="note"><?=$supplier->note;?></textarea>
          </div>
      </div>
      <div class="form-group">
       <button type="submit" class="btn btn-add"><?=label("Submit");?></button>
      </div>
      <?php echo form_close(); ?>
</div>
