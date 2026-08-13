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
        var ids = [ "hsn","ProductName","summernoted","Brandname","CategoryName","SupplierName","country","adress","summernotes","taxName","city","Unit" ];
        control.makeTransliteratable(ids);
         control.showControl('translControl');
      }
      google.setOnLoadCallback(onLoad);
</script>

<div class="container">
<?php 
$rolr=$this->user->role;
$kkar=mysql_fetch_array(mysql_query("select * from permission_new where nname='".$rolr."'  "));
?>
<h3> <?=label("Products");?>
  <?php if($kkar['pra']==1){ ?>
  <button style="float: right;" type="button" class="btn btn-primary btn-green" data-toggle="modal" data-target="#Addproduct"><?=label("Add");?>
   </button><?php } 


$query = mysql_query("SHOW TABLE STATUS WHERE name='products'");
$row = mysql_fetch_array($query);
$autoit=$row["Auto_increment"]; 


?>
</h3>
<hr>

<div class="row" style="margin-top:10px;">
     
      <table id="Table3s" class="table table-striped table-bordered" cellspacing="0" width="100%">
          <thead>
              <tr>
                  <th class="hidden-xs"><?=label("ProductCode");?></th>
                  <th class="hidden-xs"><?=label("HSN");?></th>
                  <th><?=label("SupplierName");?></th>
                  <th><?=label("Product");?> <?=label("Name");?></th>
                  <th><?=label("Brand");?> <?=label("Name");?></th>
                  
                  <?php
                  $mm=mysql_fetch_array(mysql_query("select * from settings where id=1 "));
                   if($mm['gst_tax']==1)
                   {
                    ?>
                  <th class="hidden-xs"><?=label("tax");?> %</th>
                  
                  <?php } ?>
                  <th><?=label("Purchase");?> <?=label("Price");?></th>
                  <th><?=label("Selling");?> <?=label("Price");?></th>
                  <th><?=label("MRP");?></th>
                  <th><?=label("Dis");?> %</th>
                  <th><?=label("Avail");?> Qty</th>
                  
                  <?php
                  if($mm['expi']==1)
                   {
                    ?>

                  <th><?=label("BatchNo");?></th>
                  <th><?=label("Packed");?></th>
                  <th><?=label("Expire");?></th>
                  <?php } ?>


                  <th><?=label("Status");?></th>
                  <th><?=label("Action");?></th>
              </tr>
          </thead>


          <tbody>
          </tbody>
            
      </table>
   </div>
   <style type="text/css" media="print">
   body {
  overflow: auto;
  height: 100%;

 
}

@page {

    size: auto;   /* auto is the initial value */
     margin:0; /* this affects the margin in the printer settings */
}
</style>
   <!-- Button trigger modal -->
   

  <div class=" float-right">
      
      <a class="btn btn-add btn-xs" data-toggle="modal" data-target="#ImportProducts"><?=label("Uploadxlsfile");?></a>
   </div>
</div>
<!-- /.container -->
<?php echo $this->load->view('modals/_imageViewer'); ?>

<script src="<?=base_url()?>assets/js/jquery-ui.min.js"></script>
<script type="text/javascript">

         var save_method; //for save method string
    var table;
    $(document).ready(function() {
      table = $('#Table3s').DataTable({

        "processing": true, //Feature control the processing indicator.
        "serverSide": true, //Feature control DataTables' server-side processing mode.
        "order": [], //Initial no order.
        // Load data for the table's content from an Ajax source
        "ajax": {
            "url": "<?php echo site_url('invoices_pro/ajax_list')?>",
            "type": "POST"
        },

        //Set column definition initialisation properties.
        "columnDefs": [
        {
          "targets": [ -1 ], //last column
          "orderable": false, //set not orderable
        },
        ],
         "bInfo": false,
         // "fnRowCallback": function(nRow, aData, iDisplayIndex) {
         //     nRow.setAttribute('data-order',aData[4]);
         // }
      });
    });
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
          
          location.reload();

            if(data === "service")
            {
              
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

function add_product_item(item, noitem) {
   if (item == null && noitem == null) {
      return false;
   }
   if(noitem != 1) {
      var item_id = 0;
      $.each(items, function(i){
         if(items[i].item_id == item.id) {
            items[i].quantity = (parseFloat(items[i].quantity) + 1);
            item_id = item.id;
            return false;
         }
      });
      if(item_id == 0) {
         item.qty = 1;
         items.push({
            'item_id': item.id,
            'quantity': item.qty,
            'code': item.code,
            'name': item.name
         });
      }
   }


   $("#Comboprd tbody").empty();
   items.forEach(function(item) {
      var Tr = $('<tr id="rowid_' + item.item_id + '" class="item_' + item.item_id + '"></tr>');
      td = '<td>' + item.name + ' (' + item.code + ')</td>';
      td += '<td><input class="form-control text-center" name="quantity" type="text" value="' + item.quantity + '" item-id="' + item.item_id + '" id="quantit"></td>';
      td += '<td class="text-center"><i class="fa fa-times tip delt" id="' + item.item_id + '" title="Remove" style="cursor:pointer;"></i></td>';
      Tr.html(td);
      Tr.prependTo("#Comboprd");
   });
   console.log(items);
   $( "[id='quantit']" ).on('change', function() {
      var itemID = $(this).attr("item-id");
      var val = $(this).val();
      items.forEach(function(e) {
         if(e.item_id == itemID) {
            e.quantity = val;
         }
      });
      console.log(items);
   });
   return true;

}

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
             alert("error");
          }
     });
}

function updatestock(){
      $.ajax({
          url : "<?php echo site_url('products/updatestock')?>/",
          data: {quant: quant, quantw: quantw, productID: productID, pricest: pricestore},
          type: "POST",
          success: function(data)
          {
            location.reload();
          },
          error: function (jqXHR, textStatus, errorThrown)
          {
             alert("error");
          }
     });
    };


function modifystock(id){
   $.ajax({
       url : "<?php echo site_url('productcontroller/modifystock')?>/"+id,
       type: "POST",
       success: function(data)
       {
          $('#stockcontent').html(data);
          $('#stock').modal('show');

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
       },
       error: function (jqXHR, textStatus, errorThrown)
       {
          alert("error");
       }
  });
}


function Viewproduct(id){
   $.ajax({
       url : "<?php echo site_url('productcontroller/Viewproduct')?>/"+id,
       type: "POST",
       success: function(data)
       {
          $('#viewSectionProduct').html(data);
          $('#Viewproduct').modal('show');
       },
       error: function (jqXHR, textStatus, errorThrown)
       {
          alert("error");
       }
  });
}

$(document).on('click', '.delt', function () {
    var id = $(this).attr('id');
    $.each(items, function(i){
       if(items[i].item_id == id) {
           items.splice(i,1);
           return false;
       }
   });
    $(this).closest('#rowid_' + id).remove();
    console.log(items);
});

function modifycombo(id){
   $.ajax({
       url : "<?php echo site_url('productcontroller/modifycombo')?>/"+id,
       type: "POST",
       success: function(data)
       {
          $('#combocontent').html(data);
          $('#Viewproduct').modal('hide');
          $('#combo').modal('show');
          $.ajax({
              url : "<?php echo site_url('productcontroller/getcombos')?>/"+id,
              type: "POST",
              success: function(data){
                 dataitems = JSON.parse(data);
                 dataitems.forEach(function(e) {
                    items.push({
                       'item_id': e.item_id,
                       'quantity': e.quantity,
                       'code': e.code,
                       'name': e.name
                    });
                  });
            },
              error: function (jqXHR, textStatus, errorThrown){alert("error");}
         });
          console.log(items);
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
       },
       error: function (jqXHR, textStatus, errorThrown)
       {
          alert("error");
       }
  });
}


 function barcode()
{
   row = $('#Brrows').val();
   num = $('#Brnum').val();    
   var urld = "<?php echo site_url('printbarcodes/productlabel')?>/"+productBcode+"/"+row+"/"+num;
   window.open(urld);
}



function Printbarcode() {
   $('.modal-body').removeAttr('id');
   window.print();
   $('.modal-body').attr('id', 'modal-body');
}

function makePrdInvis(id, prd) {
   $.ajax({
       url : "<?php echo site_url('productcontroller/makePrdInvis')?>/"+id+"/"+prd,
       type: "POST",
       success: function(data){},
       error: function (jqXHR, textStatus, errorThrown)
       {
          alert("error");
       }
  });
}



</script>

<!-- Modal -->
<div class="modal fade" id="Addproduct" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("AddProduct");?></h4>
      </div>
      <?php
      $attributes = array('id' => 'addform');
      echo form_open_multipart('productcontroller/add', $attributes);
      ?>
      <div class="modal-body" >
         <input type="hidden" name="type" value="0" id="type" >
            <?php 

 


            $mmik=mysql_fetch_array(mysql_query("select * from products order by id desc "));
            ?>
            <div class="form-group controls">

           <div class="col-xs-4">
             <label for="ProductCode"><?=label("ProductCode");?></label>

<input type="text"    value="<?php echo $autoit;?>" Required name="code" class="form-control" id="ProductCode" placeholder="<?=label("ProductCode");?>">


             <p id="codeError" class="red" hidden><?=label("codeerror");?></p>
           </div> 

           <div class="col-xs-4">
             <label for="ProductName"><?=label("ProductName");?></label>
<input autofocus type="text" name="name" maxlength="50" Required class="form-control" id="ProductName" placeholder="<?=label("ProductName");?>">
           </div>

             

           <div class="col-xs-4">
             <label for="ProductCode"><?=label("HSN");?></label>
<input type="text"   maxlength="30" value="0" Required name="hsn" class="form-control" id="hsn" placeholder="<?=label("HSN");?>">
             <p id="codeError" class="red" hidden><?=label("codeerror");?></p>
           </div>


          


           </div>



     <div class="form-group">
      <div class="col-xs-4">
             <label for="Category">Brand</label>
             <select class="form-control" name="brandd" id="brandd">
               <option value="0" >Select</option>
               
               <?php 
               $imnn=mysql_query("select * from brand order by name asc");
               while($imnnf=mysql_fetch_array($imnn))
               {
               ?>
               <option value="<?php echo  $imnnf['id'];?>"><?php echo $imnnf['name'];?></option>
               <?php 
               }
               ?>
             </select>

                   <a href="javascript:void(0)" data-toggle="modal" data-target="#Addbrand">
               <span class="fa-stack fa-lg" data-toggle="tooltip" data-placement="top" title="" data-original-title="Add New Brand">
                  
                  <i style="color: #89b03e;" class="fa fa-plus fa-stack-1x  "></i>
               </span>
</a>

           </div>



           <div class="col-xs-4">
             <label for="Category"><?=label("Category");?></label>
             <select class="form-control" name="category" id="Category">
              <option value="0" >Select</option>
               <?php foreach ($categories as $category):?>
                  <option value="<?=$category->id;?>"><?=$category->name;?></option>
               <?php endforeach;?>
            </select>

               <a href="javascript:void(0)" data-toggle="modal" data-target="#Addcategory">
               <span class="fa-stack fa-lg" data-toggle="tooltip" data-placement="top" title="" data-original-title="Add New Category">
                  
                  <i style="color: #89b03e;" class="fa fa-plus fa-stack-1x  "></i>
               </span>
</a>
           </div>



           <div class="col-xs-4" id="supply">
             <label for="Supplier"><?=label("Supplier");?></label>
             <select class="form-control" name="supplier" id="Supplier">
              <option value="0" >Select</option>
               <?php foreach ($suppliers as $supplier):?>
                  <option value="<?=$supplier->id;?>"><?=$supplier->name;?></option>
               <?php endforeach;?>
            </select>

<a href="javascript:void(0)" data-toggle="modal" data-target="#AddSupplier">
               <span class="fa-stack fa-lg" data-toggle="tooltip" data-placement="top" title="" data-original-title="Add New Suppliers">
                  
                  <i style="color: #89b03e;" class="fa fa-user-plus fa-stack-1x  "></i>
               </span>
</a>
           </div>
           </div>

            <div class="form-group">
            <div class="col-xs-3">
            <label for="PurchasePrice"><?=label("PurchasePrice");?></label>
    <input type="number" step="any" Required  value="0" Required name="cost" class="form-control" id="PurchasePrice" placeholder="<?=label("PurchasePrice");?>">
            </div>

           <div class="col-xs-3">
             <label for="Price"><?=label("Selling");?> <?=label("Price");?></label>
             <input type="number" step="any" value="0" Required name="price" class="form-control" id="Price" placeholder="<?=label("Price");?>">
           </div> 

            <div class="col-xs-3">
             <label for="Price"><?=label("MRP");?></label>
             <input type="number" step="any" value="0" Required name="rrate" class="form-control" id="rrate" placeholder="<?=label("MRP");?>">
           </div>  

             <div class="col-xs-3">
                <label for="taxType"><?=label("TaxMethod");?></label>
                <select class="form-control" name="taxmethod" id="taxType">
                <option value="0"><?=label("inclusive");?></option>
                <option value="1"><?=label("exclusive");?></option>
                </select>
           </div> 



         


           </div> 



<?php
$mkzz=mysql_fetch_array(mysql_query("select * from settings where id=1 "));
if($mkzz['gst_tax']==1)
{
?>
           <div class="form-group">

           <div class="col-xs-12">
             <label for="Tax">Tax %</label>
              <a href="javascript:void(0)" data-toggle="modal" data-target="#Addtax">
               <span class="fa-stack fa-lg" data-toggle="tooltip" data-placement="top" title="" data-original-title="Add New Tax">
                  
                  <i style="color: #89b03e;" class="fa fa-plus fa-stack-1x  "></i>
               </span>
</a>
             

             
<div style="height: 70px;overflow-y: scroll;" id="ttaxx">
               <?php 
               $taxx=mysql_query("select * from tax where status=1 order by name asc");
               while($taxxf=mysql_fetch_array($taxx))
               {
               ?>
               <div class="col-xs-4">
<span style="float: left;width: 10%">
 <input   type="checkbox" style="display: block;" name="ckk[]" id="ckc" value="<?php echo $taxxf['id'];?>"   >
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
             <input maxlength="2" type="number" step="any" Required value="0" name="dispx" class="form-control" id="dispx" placeholder="<?=label("Price");?>">
           </div>



           

           <div class="col-xs-3">
             <label for="Unit"><?=label("Net Weight");?></label>
             <input  Required  type="text"   name="net_wight" value="0" class="form-control" id="net_wight"  />
           </div>

            <div class="col-xs-3">
             <label for="Unit"><?=label("Unit");?></label>
             <input  Required  type="text" step="any" name="unit" value="0" class="form-control" id="Unit" placeholder="<?=label("Unit");?>">
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


           <div class="col-xs-12">
          
             <label for="ProductDescription"><?=label("ProductDescription");?></label>
             <textarea id="summernoted" class="form-control" name="description"></textarea>
         
          </div>

          <input type="hidden" name="color" id="option7" value="color07" autocomplete="off">

      
<style type="text/css">
.modal-footer
{
border-top: 0px solid #e5e5e5;
}
</style>
      <div class="modal-footer">

        <button type="submit" style="background-color: #34495E;color:#fff;border: 1px solid transparent;padding: 6px 12px;float: right;margin: 10px 28px 0px 10px;"><?=label("Submit");?></button>

        <button type="button" style="padding: 6px 12px;float: right;margin: 10px 5px 0px 5px;border: 1px solid #ccc;" data-dismiss="modal"><?=label("Close");?></button>

      </div>
   <?php echo form_close(); ?>
    </div>
 </div>
</div>
</div>
</div>
<!-- /.Modal -->

<!-- Modal -->
<div class="modal fade" id="ImportProducts" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("AddProduct");?></h4>
      </div>
      <?php
      $attributes = array('id' => 'addform');
      echo form_open_multipart('products/importcsvnew', $attributes);
      ?>
      <div class="modal-body">
         <div class="form-group">
           <label for="exampleInputFile"><?=label("Uploadxlsfile");?></label>
           <input type="file" name="userfile" id="ImageInput">
           <p class="help-block"><a href="<?=site_url('files/product.xls');?>"><?=label('DownloadSample');?></a></p>
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




<!-- Modal -->


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
          <!-- <button type="button" class="btn btn-default hiddenpr" onclick="location.reload();"><?=label("Close");?></button>
          <button type="button" class="btn btn-add hiddenpr" onclick="addcombo()"><?=label("submit");?></button> -->
        </div>
      </div>
   </div>
  </div>
  <!-- /.Modal -->

  <!-- Modal stock -->
  <div class="modal fade" id="stock" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
  <div class="modal-dialog" role="document" id="stockModal">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title" id="stock"><?=label("Stock");?></h4>
        </div>
        <div class="modal-body" id="modal-body" style="padding:1px;">
           <div id="stockcontent">
              <!-- stock goes here -->
           </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-default hiddenpr" onclick="location.reload();"><?=label("Close");?></button>
          <button type="button" class="btn btn-add hiddenpr" onclick="updatestock()"><?=label("submit");?></button>
        </div>
      </div>
  </div>
  </div>
  <!-- /.Modal -->


  <!-- Modal view -->
  <div class="modal fade" id="Viewproduct" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
   <div class="modal-dialog modal-lg" role="document" id="viewModal">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title" id="view"><?=label("Viewproduct");?></h4>
        </div>
        <div class="modal-body" id="modal-body" style="padding:1px;">
           <div id="viewSectionProduct">
              <!-- view goes here -->
           </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?=label("Close");?></button>
        </div>
      </div>
   </div>
  </div>
  <!-- /.Modal -->


  <!-- Modal barcode -->
  <div class="modal fade" id="barcode" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
   <div class="modal-dialog" role="document" id="stockModal">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title" id="barcode"><?=label("Stock");?></h4>
        </div>
        <div class="modal-body" id="modal-body" style="padding:1px;">
           <div class="form-group col-md-6">
             <label for="Price"><?=label("RowsNumber");?></label>
             <select Required class="form-control" id="Brrows">
                <option value="12">1</option>
                <option value="6">2</option>
                <option value="4">3</option>
             </select>
           </div>
           <div class="form-group col-md-6">
             <label for="Price"><?=label("Number");?></label>
             <input type="number" Required name="num" class="form-control" id="Brnum" placeholder="<?=label("Number");?>" value="10">
           </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?=label("Close");?></button>
          <button type="button" class="btn btn-add hiddenpr" onclick="barcode()"><?=label("submit");?></button>
        </div>
      </div>
   </div>
  </div>
  <!-- /.Modal -->


  <!-- Modal barcode -->
  <div class="modal fade" id="barcodeP" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
   <div class="modal-dialog" role="document" id="stockModal">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title" id="barcodeP"><?=label("Stock");?></h4>
        </div>
        <div class="modal-body" id="modal-body" style="padding:1px;">
           <div id="printSection" style="text-align: center;">
             <!-- content -->
           </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?=label("Close");?></button>
          <button type="button" class="btn btn-add hiddenpr" onclick="Printbarcode()"><?=label("print");?></button>
        </div>
      </div>
   </div>
  </div>
  <!-- /.Modal -->



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
             <input type="text" maxlength="5" name="persent" class="form-control" id="persent"  required>
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
         alert("error");
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
         alert("error");
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
         alert("error");
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
         alert("error");
      }
  });

  }


</script>


 <style type="text/css">
  .dt-buttons
  {
    text-align: right;
  }
 </style>

<script src="<?php echo base_url();?>assets/js/datatables.min.js" type="text/javascript"></script>

        <script>


                  var save_method; //for save method string
    var table;
    $(document).ready(function() {
      table = $('#Table3').DataTable({

        "processing": true, //Feature control the processing indicator.
        "serverSide": true, //Feature control DataTables' server-side processing mode.
        "order": [], //Initial no order.
        // Load data for the table's content from an Ajax source
        "ajax": {
            "url": "<?php echo site_url('invoices/ajax_list_pro')?>",
            "type": "POST"
        },

        //Set column definition initialisation properties.
        "columnDefs": [
        {
          "targets": [ -1 ], //last column
          "orderable": false, //set not orderable
        },
        ],
         "bInfo": false,
         // "fnRowCallback": function(nRow, aData, iDisplayIndex) {
         //     nRow.setAttribute('data-order',aData[4]);
         // }
      });
    });




</script>