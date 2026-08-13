<!-- Page Content -->
<div class="container">
 <?php 

  $rolr=$this->user->role;
$kkar=mysql_fetch_array(mysql_query("select * from permission_new where nname='".$rolr."'  "));
?>

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
    

   <h3><?=label("Level");?> 

    
    

   </h3>
   <hr>

   <div class="row" style="margin-top:20px;">
      <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
          <thead>
              <tr>
                  <th style="width:60px;"><?=label("id");?></th>
                  <th><?=label("warehouses");?></th>
                  
                  <th><?=label("Action");?></th>
              </tr>
          </thead>

          <tbody>
             <?php 
             $categories=mysql_query("select * from warehouses  order by name asc ");
             while($category=mysql_fetch_object($categories))
             {
                ?>
              <tr>
                 <td><?=$category->id;?></td>
                 <td><?=$category->name;?></td>
                 
              

                 <td><div class="btn-group">
                       

                  


                       

                       <a class="btn btn-default" href="levels/viewlevels/<?=$category->id;?>" data-toggle="tooltip" data-placement="top" title="<?=label('View');?>"><i class="fa fa-pencil"></i></a>


                     </div>
                  </td>
              </tr>
           <?php  } ?>
          </tbody>
      </table>
   </div>
   <!-- Button trigger modal -->
 
</div>
<!-- /.container -->
<!-- Modal -->
<div class="modal fade" id="Addcategory" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("Add");?></h4>
      </div>
      <?php echo form_open_multipart('levels/add'); ?>
      <div class="modal-body">
           <div class="form-group">
             <label for="CategoryName"><?=label("Level");?></label>
             <input type="text" maxlength="50" name="CategoryName" class="form-control" id="CategoryName" required>
           </div>

           <div class="form-group">
             <label for="CategoryName"><?=label("No Of Rack's");?></label>
             <input type="text" maxlength="2" name="persent" class="form-control" id="persent"  required>
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
