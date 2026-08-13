<!-- Page Content -->
<div class="container">
 <?php 

  $rolr=$user->role;
$kkar=$db->query("select * from permission_new where nname='".$rolr."'  ")->getRowArray();
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
    

   <h3><?=label("price_method");?><?php if($kkar['prv']==1){ ?>
   <button style="float: right;" class="btn btn-primary btn-green"  type="button" class="btn btn-add btn-lg" data-toggle="modal" data-target="#Addcategory"> 
     <?=label("Add");?>
   </button><?php } ?>
   </h3>
   <hr>

  
  
      <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
          <thead>
              <tr>
                  <th style="width:60px;"> <?=label("ID");?></th>
                  <th> <?=label("Name");?></th>
                  <th><?=label("CreatedAt");?></th>
                  <th><?=label("Action");?></th>
              </tr>
          </thead>

          <tbody>
             <?php 

            $categories=$db->query("select * from price_master order by name asc ")->getResult();
             foreach($categories as $category)
              {
                ?>
              <tr>
                 <td><?=$category->id;?></td>
                 <td><?=$category->name;?></td>
                 <td><?php
                 echo date("d-m-Y H:i:s", strtotime($category->created_at));

                 ?></td>
                 <td><div class="btn-group">
                       

<?php if($kkar['prd']==1){ ?>
                       <a class="btn btn-default" href="javascript:void(0)" data-toggle="popover" data-placement="left"  data-html="true" title='<?=label("Areyousure");?>' data-content='<a class="btn btn-danger" href="price/delete/<?=$category->id;?>"><?=label("yesiam");?></a>'><i class="fa fa-times"></i></a><?php } ?>

                       <?php if($kkar['pre']==1){ ?>
                       <a class="btn btn-default" href="price/edit/<?=$category->id;?>" data-toggle="tooltip" data-placement="top" title="<?=label('Edit');?>"><i class="fa fa-pencil"></i></a><?php } ?>
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
      <?php echo form_open_multipart('price/add'); ?>
      <div class="modal-body">
           <div class="form-group">
             <label for="CategoryName"><?=label("Name");?></label>
             <input type="text" maxlength="50" name="CategoryName" class="form-control" id="CategoryName"  required>
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
