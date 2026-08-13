<!-- Page Content -->
<?php if (!$this->session->userdata('register'))
{?>
   <div class="container container-small">
      <div class="row">
         <h1 class="text-center choose_store"> <?=label('ChooseStore');?> </h1>
      </div>
      <div class="row">
         <ul id="storeline">
            <?php foreach ($Stores as $store):?>
            <a href="javascript:void(0)"  onclick="OpenRegister(<?=$store->status ? $store->status : 0;?>, <?=$store->id;?>)">
              <li class="listing clearfix">
                <div class="image_wrapper">
                  <img src="<?=base_url()?>assets/img/store.svg" alt="store">
                </div>
                <div class="info">
                  <span class="store_title"><?=$store->name;?></span>
                  <span class="store_info"><?=$store->city;?> <span>&bull;</span> <?=$store->phone;?> <span>&bull;</span> <?=$store->email;?></span>
                </div>
                <span class="store_type <?= $store->status == 1 ? 'store_open' : 'store_close';?>"><?= $store->status == 1 ? label('open') : label('close');?></span>
              </li>
            </a>
            <?php endforeach;?>
         </ul>
      </div>
   </div>
   <script type="text/javascript">
   function OpenRegister(status, storeid){
      if(status == 0) {
         $('#CashinHand').modal('show');
         $('#store').val(storeid);
      }else {
         window.location.href = "<?php echo site_url('pos/openregister/')?>/" + storeid;
      }
   }

   </script>
   <!-- Modal add user -->
   <div class="modal fade" id="CashinHand" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
       <div class="modal-content">
         <div class="modal-header">
           <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
           <h4 class="modal-title" id="myModalLabel"><?=label("CashinHand");?></h4>
         </div>
         <?php echo form_open_multipart('pos/openregister'); ?>
         <div class="modal-body">
               <div class="form-group">
                <label for="CashinHand"><?=label("CashinHand");?></label>
                <input type="number" step="any" name="cash" Required class="form-control" id="CashinHand" placeholder="<?=label("CashinHand");?>">
                <input type="hidden" name="store" class="form-control" id="store">
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
   <?php
}else {
    
    
    $lkl = $this->uri->segment(3);    
   $lklf = mysql_fetch_array(mysql_query("select * from    sales where id='".$lkl."' "));
   $lklfr=$lklf['client_id'];
   $diss=$lklf['discount'];
   if($diss==0 || $diss=='')
   {
$distt=0;
   }
   else
   {
    $dissex=explode("%",$diss);
    $distt=$dissex['0'];
   }

   if($lklfr>0) 
           {
   $lklfrg=mysql_fetch_array(mysql_query("select * from customers where id='".$lklfr."' "));
   $lklfrgg=$lklfrg['name'];
           }
           else
           {
              $lklfrgg="Walk in Customer" ;
           }
    
    ?>
<div class="container-fluid">
   <div class="row">
      <ul class="cbp-vimenu">
      	<li data-toggle="tooltip"  data-html="true" data-placement="left" title="<?=label('CloseRegister');?>"><a href="javascript:void(0)" onclick="CloseRegister()"><i class="fa fa-times" aria-hidden="true"></i></a></li>
      	<li data-toggle="tooltip"  data-html="true" data-placement="left" title="<?=label('SwitchStore');?>"><a href="pos/switshregister"><i class="fa fa-random" aria-hidden="true"></i></a></li>
      </ul>
      <div class="col-md-5 left-side">
         <div class="row">
            <div class="row row-horizon">
               <span class="holdList">
                  <!-- list Holds goes here -->
               </span>
               <span class="Hold pl" onclick="AddHold()">+</i></span>
               <span class="Hold pl" onclick="RemoveHold()">-</span>
            </div>
         </div>
         <div class="col-xs-8">
            <h2><?=label("Return");?></h2>
         </div>
         <div class="col-xs-4 client-add">
            
              
               <div></div></button>

                  
            
         </div>
         <div class="col-sm-12">
            <select class="js-select-options form-control" id="">
              
              
                 <option value="<?=$lklfr;?>"><?php echo $lklfrgg;?></option>
              
            </select>
         </div>
         <div class="col-sm-12">
            <form onsubmit="return barcode()">
               <input type="text" autofocus id="<?=strval($this->setting->keyboard) === '1' ? 'keyboard' : ''?>" class="form-control barcode" placeholder="<?=label('BarcodeScanner');?>">
            </form>
         </div>
         <div class="col-xs-4 table-header">
            <h3 style="text-transform: capitalize;"><?=label("Product");?></h3>
         </div>
         <div class="col-xs-2 table-header">
            <h3 style="text-transform: capitalize;"><?=label("price");?></h3>
         </div>
         <div class="col-xs-2 table-header nopadding">
            <h3 style="text-transform: capitalize;" class="text-left"><?=label("Quantity");?></h3>
         </div>
         <?php 
if($this->setting->gst_tax==1)
      {  ?>
         <div class="col-xs-1 table-header nopadding">
            <h3  style="text-transform: capitalize;" class="text-left">CGST</h3>
         </div>

         <div class="col-xs-1 table-header nopadding">
            <h3 style="text-transform: capitalize;" class="text-left">SGST</h3>
         </div>
         <?php } ?>

         <div class="col-xs-2 table-header nopadding">
            <h3 style="text-transform: capitalize;" ><?=label("Total");?></h3>
         </div>
        
           
           <div id="productList" style="overflow: hidden; width: auto; height: 355px;">
           
           <?php
               $stt=0;
               $ctt=0;

               $imm=mysql_query("select * from sale_items where sale_id='".$lkl."' ");
               while($immf=mysql_fetch_array($imm))
               {  
                   $immff=$immf['product_id'];
                   $prod=mysql_fetch_array(mysql_query("select * from products where id='".$immff."'  "));
$ttycg=($immf['price']*$immf['qt']*$immf['cgst'])/100;
$ctt=$ctt+$ttycg;
$ttysg=($immf['price']*$immf['qt']*$immf['sgst'])/100;
$stt=$stt+$ttysg;

               
           ?>
           <div class="col-xs-12">
           <div class="panel panel-default product-details">
           <div class="panel-body" style="">
           <div class="col-xs-4 nopadding">
           <div class="col-xs-2 nopadding">
           
           </div>
           <div class="col-xs-10 nopadding"><span class="textPD"><?php echo $prod['name'];?></span></div>
           </div>
           <div class="col-xs-2">
           <span class="textPD"><?php echo $immf['price'];?></span></div>
           <div class="col-xs-2 nopadding productNum">
               &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
           <input type="text" readonly="readonly"  class="form-control" value="<?php echo $immf['qt'];?>" placeholder="0" maxlength="2">
           </div>
      <?php 
if($this->setting->gst_tax==1)
      {  ?>
           <div class="col-xs-1 nopadding "><span class="subtotal textPD"><?php echo $immf['cgst'];?></span></div>
           <div class="col-xs-1 nopadding "><span class="subtotal textPD"><?php echo $immf['sgst'];?></span></div>
           <?php } ?>
           <div class="col-xs-2 nopadding "><span class="subtotal textPD"><?php echo $immf['subtotal'];?></span></div>

           </div></div></div>
           
           <?php 
               }
               ?>

           </div>
           
           
                <?php
                    
                    $oml=mysql_fetch_array(mysql_query("select * from sales where id='".$lkl."' "));
                ?>
         
         <div class="footer-section">
            <div class="table-responsive col-sm-12 totalTab">
               <table class="table">
                  <tr>
                     <td class="active" width="40%"><?=label("SubTotal");?></td>
                     <td class="whiteBg" width="60%"><span ></span> <?php echo $oml['totalitems']; ?> Items
                        <span class="float-right">Rs.<?php echo $oml['subtotal']; ?> </span>
                     </td>
                  </tr>
                  <tr>
                     <td class="active">CGST <?=label('Amount');?> </td>
                     <td class="whiteBg">
                   
                       <span class="float-right">Rs.<?php echo $ctt; ?></span>
                     </td>
                  </tr>

                  <tr>
                     <td class="active">SGST <?=label('Amount');?></td>
                     <td class="whiteBg">
                   
                       <span class="float-right">Rs.<?php echo $stt; ?></span>
                     </td>
                  </tr>
                  <tr>
                     <td class="active"><?=label("Discount");?></td>
                     <td class="whiteBg">
                     <?php if($oml['discount']=='' ||$oml['discount']==0){ echo "N/A";}else{ echo $oml['discount']; } ; ?>
                       <span class="float-right">Rs.<?php echo $oml['discountamount']; ?></span> 
                     </td>
                  </tr>
                  <tr>
                     <td class="active"><?=label("Total");?></td>
                     <td class="whiteBg light-blue text-bold"><span ></span>
                     <span class="float-right">Rs.<?php echo $oml['total']; ?></span>
                      </td>
                  </tr>
                  <tr>
                     <td class="active"><?=label('Return');?>  <?=label('Amount');?></td>
                     <td class="whiteBg light-blue text-bold"><span ></span>
                     <?php 
                     $injj=0;
                     $lklxx=mysql_query("select * from returnss where re_sales_id='".$lkl."' ");
                     while($lklxxf=mysql_fetch_array($lklxx))
                     {

                      $injj=$injj+$lklxxf['tootal'];
                     }

                     ?>
                     <span class="float-right">Rs.<?php echo $injj;?></span>
                      </td>
                  </tr>

               </table>
            </div>
            <a href="<?php echo base_url();?>sales" ><button type="button"  class="btn btn-red col-md-6 flat-box-btn">
              <h5 class="text-bold"><?=label('Back');?></h5>

            </button></a>
            <button type="button" class="btn btn-green col-md-6 flat-box-btn" data-toggle="modal" data-target="#AddSale"><h5 class="text-bold"><?=label('View');?></h5></button>
         </div>

      </div>
      <div class="col-md-7 right-side nopadding" style="height: 1000px;">
          <div style="margin: 50px 50px 50px 50px;color:red;" >                 
          <h2><?php echo  $this->session->flashdata('oky');    ?></h2>
          </div>
         
      </div>
   </div>
</div>

<!-- /.container -->
<script type="text/javascript">

$(document).ready(function() {
   $('#productListkk').load("<?php echo site_url('pos/load_posales')?>");
   $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);
   $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");
   $('.holdList').load("<?php echo site_url('pos/holdList/'.$this->register)?>");

   $('.Paid').show();
   $('.ReturnChange').show();
   $('.CreditCardNum').hide();
   $('.CreditCardHold').hide();
   $('.ChequeNum').hide();
   $('.stripe-btn').hide();



   $("#paymentMethod").change(function(){

      var p_met = $(this).find('option:selected').val();

      if (p_met === '0') {
         $('.Paid').show();
         $('.ReturnChange').show();
         $('.CreditCardNum').hide();
         $('.CreditCardHold').hide();
         $('.CreditCardMonth').hide();
         $('.CreditCardYear').hide();
         $('.CreditCardCODECV').hide();
         $('#CreditCardNum').val('');
         $('#CreditCardHold').val('');
         $('#CreditCardYear').val('');
         $('#CreditCardMonth').val('');
         $('#CreditCardCODECV').val('');
         $('.stripe-btn').hide();
         $('.ChequeNum').hide();
      } else if (p_met === '1') {
         $('.Paid').show();
         $('.ReturnChange').hide();
         $('.CreditCardNum').show();
         $('.CreditCardHold').show();
         $('.CreditCardMonth').show();
         $('.CreditCardYear').show();
         $('.CreditCardCODECV').show();
         $('.stripe-btn').show();
         $('.ChequeNum').hide();
      } else if (p_met === '2') {
         $('.Paid').hide();
         $('.ReturnChange').hide();
         $('.CreditCardNum').hide();
         $('.CreditCardHold').hide();
         $('.CreditCardMonth').hide();
         $('.CreditCardYear').hide();
         $('.CreditCardCODECV').hide();
         $('#CreditCardNum').val('');
         $('#CreditCardHold').val('');
         $('#CreditCardYear').val('');
         $('#CreditCardMonth').val('');
         $('#CreditCardCODECV').val('');
         $('.stripe-btn').hide();
         $('.ChequeNum').show();
      }

   });
   /********************************* Credit Card infos section ****************************************/
   $('#CreditCardNum').validateCreditCard(function(result) {
      var cardtype = result.card_type == null ? '-' : result.card_type.name;
      $('.CreditCardNum i').removeClass('dark-blue');
      $('#' + cardtype).addClass('dark-blue');
   });

   $('#CreditCardNum').keypress(function (e) {
      var data = $(this).val();
      if(data.length > 22){

       if (e.keyCode == 13) {
           e.preventDefault();

           var c = new SwipeParserObj(data);

               $('#CreditCardNum').val(c.account);
               $('#CreditCardHold').val(c.account_name);
               $('#CreditCardYear').val(c.exp_year);
               $('#CreditCardMonth').val(c.exp_month);
               $('#CreditCardCODECV').val('');

           }
           else {
               $('#CreditCardNum').val('');
               $('#CreditCardHold').val('');
               $('#CreditCardYear').val('');
               $('#CreditCardMonth').val('');
               $('#CreditCardCODECV').val('');
           }

           $('#CreditCardCODECV').focus();
           $('#CreditCardNum').validateCreditCard(function(result) {
              var cardtype = result.card_type == null ? '-' : result.card_type.name;
              $('.CreditCardNum i').removeClass('dark-blue');
              $('#' + cardtype).addClass('dark-blue');
           });
   }

   });


   // ********************************* change calculations
   $('#Paid').on('keyup',function() {
      var change = -(parseFloat($('#total').text()) - parseFloat($(this).val()));
      if(change < 0){
         $('#ReturnChange span').text(change.toFixed(<?=$this->setting->decimals;?>));
         $('#ReturnChange span').addClass( "red" );
         $('#ReturnChange span').removeClass( "light-blue" );
      }else{
         $('#ReturnChange span').text(change.toFixed(<?=$this->setting->decimals;?>));
         $('#ReturnChange span').removeClass( "red" );
         $('#ReturnChange span').addClass( "light-blue" );
      }
    });



    //  search product
   $("#searchProd").keyup(function(){
      // Retrieve the input field text
      var filter = $(this).val();
      // Loop through the list
      $("#productList2 #proname").each(function(){
         // If the list item does not contain the text phrase fade it out
         if ($(this).text().search(new RegExp(filter, "i")) < 0) {
             $(this).parent().parent().parent().hide();
         // Show the list item if the phrase matches
         } else {
             $(this).parent().parent().parent().show();
         }
      });
   });
});
// barcode scanner



$(".categories").on("click", function () {
   // Retrieve the input field text
   var filter = $(this).attr('id');
   $(this).parent().children().removeClass('selectedGat');

   $(this).addClass('selectedGat');
   // Loop through the list
   $("#productList2 #category").each(function(){
      // If the list item does not contain the text phrase fade it out
      if ($(this).val().search(new RegExp(filter, "i")) < 0) {
         $(this).parent().parent().parent().hide();
         // Show the list item if the phrase matches
      } else {
         $(this).parent().parent().parent().show();
      }
   });
});
// function to calculate a percentage from a number
function percentage(tot, n) {
   var perc;
   perc = ((parseFloat(tot) * (parseFloat(n ? n : 0)*0.01)));
   return perc;
}


/********************************** Hold functions ************************************/




/********************************** end Hold functions ************************************/




$("#customerSelect").change(function(){

  var id = $(this).find('option:selected').val();
  if(id === '0') {
      $('.Remise').val('<?=$this->setting->discount;?>');
  } else {
     $.ajax({
         url : "<?php echo site_url('pos/GetDiscount')?>/"+id,
         type: "POST",
         success: function(data)
         {
            var values = data.split('~');
            $('#customerName span').text(values[1]);
            $('.Remise').val(values[0]);
            $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);
         },
         error: function (jqXHR, textStatus, errorThrown)
         {
            alert("error");
         }
    });
 }
});

function cancelPOS(){
   swal({   title: '<?=label("Areyousure");?>',
   text: '<?=label("Deletemessage");?>',
   type: "warning",
   showCancelButton: true,
   confirmButtonColor: "#DD6B55",
   confirmButtonText: '<?=label("yesiam");?>',
   closeOnConfirm: false },
   function(){

  $('#customerSelect').val('0');
  $('#customerSelect').trigger('change.select2');
  $('.Remise').val('<?=$this->setting->discount;?>');
  $('.TAX').val('<?=$this->setting->tax;?>');

  $.ajax({
      url : "<?php echo site_url('pos/ResetPos')?>/",
      type: "POST",
      success: function(data)
      {
          $('#productList').load("<?php echo site_url('pos/load_posales')?>");
          $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);
          $('#ItemsNum span, #ItemsNum2 span').text("0");
      },
      error: function (jqXHR, textStatus, errorThrown)
      {
         alert("error");
      }
 });
 swal('<?=label("Deleted");?>', '<?=label("Deletedmessage");?>', "success"); });
};


function saleBtn(type) {
   var clientID = $('#customerSelect').find('option:selected').val();
   var clientName = $('#customerName span').text();
   var Tax = $('.TAX').val();
   var Discount = $('.Remise').val();
   var Subtotal = $('#Subtot').text();
   var Total = $('#total').text();
   var createdBy = '<?php echo $this->user->firstname." ".$this->user->lastname;?>';
   var totalItems = $('#ItemsNum span').text();
   var Paid = $('#Paid').val();
   var paidMethod = $('#paymentMethod').find('option:selected').val();
   var Status = 0;
   var ccnum = $('#CreditCardNum').val();
   var ccmonth = $('#CreditCardMonth').val();
   var ccyear = $('#CreditCardYear').val();
   var ccv = $('#CreditCardCODECV').val();
   switch(paidMethod) {
       case '1':
           paidMethod += '~'+$('#CreditCardNum').val()+'~'+$('#CreditCardHold').val();
           break;
       case '2':
           paidMethod += '~'+$('#ChequeNum').val()
           break;
       case '0':
           var change = parseFloat(Total) - parseFloat(Paid);
           if(change==parseFloat(Total)) Status = 1;
           else if(change>0) Status = 2;
           else if(change<=0) Status = 0;
   }
   var taxamount = $('.TAX').val().indexOf('%') != -1 ? parseFloat($('#taxValue').text()) : $('.TAX').val();
   var discountamount = $('.Remise').val().indexOf('%') != -1 ? parseFloat($('#RemiseValue').text()) : $('.Remise').val();

  $.ajax({
      url : "<?php echo site_url('pos/AddNewSale')?>/"+type,
      type: "POST",
      data: {client_id: clientID, clientname: clientName, discountamount: discountamount, taxamount: taxamount, tax: Tax, discount: Discount, subtotal: Subtotal, total: Total, created_by: createdBy, totalitems: totalItems, paid: Paid, status: Status, paidmethod: paidMethod, ccnum: ccnum, ccmonth: ccmonth, ccyear: ccyear, ccv: ccv},
      success: function(data)
      {
         $('#printSection').html(data);
         $('#productList').load("<?php echo site_url('pos/load_posales')?>");
         $('#ItemsNum span, #ItemsNum2 span').load("<?php echo site_url('pos/totiems')?>");
         $('#Subtot').load("<?php echo site_url('pos/subtot')?>", null, total_change);
         $('#AddSale').modal('hide');
         $('#ticket').modal('show');
         $('#ReturnChange span').text('0');
         $('#Paid').val('0');
         $('.holdList').load("<?php echo site_url('pos/holdList/'.$this->register)?>");
      },
      error: function (jqXHR, textStatus, errorThrown)
      {
         alert("error");
      }
  });

  $('#CreditCardNum').val('');
  $('#CreditCardHold').val('');
  $('#CreditCardYear').val('');
  $('#CreditCardMonth').val('');
  $('#CreditCardCODECV').val('');

}

function PrintTicket() {
   $('.modal-body').removeAttr('id');
   window.print();
   $('.modal-body').attr('id', 'modal-body');
}

function CloseRegister() {
   $.ajax({
      url : "<?php echo site_url('pos/CloseRegister')?>/",
      type: "POST",
      success: function(data)
      {
         $('#closeregsection').html(data);
         $('#CloseRegister').modal('show');
         setTimeout(function(){$('#countedcash').focus()}, 1000);
         $('#countedcash').on('keyup',function() {
           var change = -(parseFloat($('#expectedcash').text()) - parseFloat($(this).val()));
           var difftot = change + parseFloat($('#diffcc').text()) + parseFloat($('#diffcheque').text());
           var total = parseFloat($('#countedcc').val()) + parseFloat($('#countedcheque').val()) + parseFloat($('#countedcash').val());
           $('#countedtotal').text(total.toFixed(<?=$this->setting->decimals;?>));
           $('#difftotal').text(difftot.toFixed(<?=$this->setting->decimals;?>))
           if(change < 0){
               $('#diffcash').text(change.toFixed(<?=$this->setting->decimals;?>));
               $('#diffcash').addClass( "red" );
               $('#diffcash').removeClass( "light-blue" );
           }else{
               $('#diffcash').text(change.toFixed(<?=$this->setting->decimals;?>));
               $('#diffcash').removeClass( "red" );
               $('#diffcash').addClass( "light-blue" );
           }
         });

         $('#countedcc').on('keyup',function() {
           var change = -(parseFloat($('#expectedcc').text()) - parseFloat($(this).val()));
           var difftot = change + parseFloat($('#diffcash').text()) + parseFloat($('#diffcheque').text());
           var total = parseFloat($('#countedcc').val()) + parseFloat($('#countedcheque').val()) + parseFloat($('#countedcash').val());
           $('#countedtotal').text(total.toFixed(<?=$this->setting->decimals;?>));
           $('#difftotal').text(difftot.toFixed(<?=$this->setting->decimals;?>))
           if(change < 0){
               $('#diffcc').text(change.toFixed(<?=$this->setting->decimals;?>));
               $('#diffcc').addClass( "red" );
               $('#diffcc').removeClass( "light-blue" );
           }else{
               $('#diffcc').text(change.toFixed(<?=$this->setting->decimals;?>));
               $('#diffcc').removeClass( "red" );
               $('#diffcc').addClass( "light-blue" );
           }
         });

         $('#countedcheque').on('keyup',function() {
           var change = -(parseFloat($('#expectedcheque').text()) - parseFloat($(this).val()));
           var difftot = change + parseFloat($('#diffcc').text()) + parseFloat($('#diffcash').text());
           var total = parseFloat($('#countedcc').val()) + parseFloat($('#countedcheque').val()) + parseFloat($('#countedcash').val());
           $('#countedtotal').text(total.toFixed(<?=$this->setting->decimals;?>));
           $('#difftotal').text(difftot.toFixed(<?=$this->setting->decimals;?>))
           if(change < 0){
               $('#diffcheque').text(change.toFixed(<?=$this->setting->decimals;?>));
               $('#diffcheque').addClass( "red" );
               $('#diffcheque').removeClass( "light-blue" );
           }else{
               $('#diffcheque').text(change.toFixed(<?=$this->setting->decimals;?>));
               $('#diffcheque').removeClass( "red" );
               $('#diffcheque').addClass( "light-blue" );
           }
         });
      },
      error: function (jqXHR, textStatus, errorThrown)
      {
          alert("error");
      }
   });
}

function SubmitRegister() {
   var expectedcash = $('#expectedcash').text();
   var countedcash = $('#countedcash').val();
   var expectedcc = $('#expectedcc').text();
   var countedcc = $('#countedcc').val();
   var expectedcheque = $('#expectedcheque').text();
   var countedcheque = $('#countedcheque').val();
   var RegisterNote = $('#RegisterNote').val();

   swal({   title: '<?=label("Areyousure");?>',
   text: '<?=label("CloseMessageRegister");?>',
   type: "warning",
   showCancelButton: true,
   confirmButtonColor: "#DD6B55",
   confirmButtonText: '<?=label("yesClose");?>',
   closeOnConfirm: false },
   function(){

   $.ajax({
      url : "<?php echo site_url('pos/SubmitRegister')?>/",
      type: "POST",
      data: {expectedcash: expectedcash, countedcash: countedcash, expectedcc: expectedcc, countedcc: countedcc, expectedcheque: expectedcheque, countedcheque: countedcheque, RegisterNote: RegisterNote},
      success: function(data)
      {
         window.location.href = "<?php echo site_url()?>";
      },
      error: function (jqXHR, textStatus, errorThrown)
      {
          alert("error");
      }
   });

   swal.close(); });
}

function email()
{
   $('#ticket').modal('hide');
   swal({
      title: "An input!",
      text: "Email:",
      type: "input",
      showCancelButton: true,
      closeOnConfirm: false,
      animation: "slide-from-top",
      inputPlaceholder: "Email" },
      function(inputValue){
         if (inputValue === false) return false;
         if (inputValue === "") {
            swal.showInputError("You need to write an email!");
            return false   }
            var content = $('#printSection').html();
            $.ajax({
               url : "<?php echo site_url('pos/email')?>/",
               type: "POST",
               data: {content: content, email: inputValue},
               success: function(data)
               {
                  $('#ticket').modal('show');
                  swal.close();
               },
               error: function (jqXHR, textStatus, errorThrown)
               {
                   alert("error");
               }
            });
             });
}

function pdfreceipt(){


   var content = $('#printSection').html();
   $.redirect('<?php echo site_url('pos/pdfreceipt')?>/', { content: content });

}

</script>


<!-- Modal -->
<?php
    
    $lkl = $this->uri->segment(3);    
   $lklf = mysql_fetch_array(mysql_query("select * from    sales where id='".$lkl."' "));
   $lklfr=$lklf['client_id'];
   $diss=$lklf['discount'];
   if($diss==0 || $diss=='')
   {
$distt=0;
   }
   else
   {
    $dissex=explode("%",$diss);
    $distt=$dissex['0'];
   }

   if($lklfr>0) 
           {
   $lklfrg=mysql_fetch_array(mysql_query("select * from customers where id='".$lklfr."' "));
   $lklfrgg=$lklfrg['name'];
           }
           else
           {
              $lklfrgg="Walk in Customer" ;
           }
    
    ?>
?>

<div class="modal fade" id="AddSale" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
<div class="modal-content" style="width: 400px;margin: 30px auto;">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">×</span></button>
        <h4 class="modal-title" id="ticket">Receipt</h4>
      </div>
      <div class="modal-body" id="modal-body">
         <div id="printSection">
         <div class="col-md-12">
         <div class="text-center"></div><div style="clear:both;">
         <h4 class="text-center"><?=label("Sale");?> <?=label("Number");?>   .: <?php echo   str_pad($lkl, 5, "0", STR_PAD_LEFT); ?> </h4> 
         <div style="clear:both;"></div>
         <span class="float-left">Date: 08-09-2017 14:57:01</span><br>
         <div style="clear:both;"><span class="float-left"><?php echo $lklfrgg;?></span>
         <div style="clear:both;">
         <table class="table" cellspacing="0" border="0">
         <thead>
         <tr>
         <th><em>#</em></th>
         <th><?=label("Product");?></th>
         <th><?=label("price");?></th>
         <th><?=label("Quantity");?> </th>
         <th>GST</th>
         <th><?=label("Total");?></th>
         </tr></thead>
         <tbody>
            <?php
               $kmk=1;
               $oosgtt=0;
               $coosgtt=0;
               $imm=mysql_query("select * from sale_items where sale_id='".$lkl."' ");
               while($immf=mysql_fetch_array($imm))
               {  
                   $immff=$immf['product_id'];
                   $prod=mysql_fetch_array(mysql_query("select * from products where id='".$immff."'  "));
               
              $oll= $immf['cgst']+$immf['sgst'];

              $oosgt=($immf['sgst']*$immf['qt']*$immf['price'])/100;
              $oosgtt=$oosgtt+$oosgt;

              $coosgt=($immf['cgst']*$immf['qt']*$immf['price'])/100;
              $coosgtt=$coosgtt+$coosgt;
           
           

           ?>

         <tr>
         <td style="text-align:center; width:30px;"><?php echo $kmk;?></td>
         <td style="text-align:left; width:180px;"><?php echo $immf['name'];?></td>
         <td style="text-align:left; width:180px;"><?php echo $immf['price'];?></td>
         <td style="text-align:center; width:50px;"><?php echo $immf['qt'];?></td>
         <td style="text-align:center; width:50px;"><?php echo $oll;?></td>
         <td style="text-align:right; width:70px; "><?php echo $immf['subtotal'];?></td>
         </tr>
         <?php  

         $kmk++;
         }
         ?>
         </tbody>
         </table>

         <table class="table" style="margin-bottom:8px;" cellspacing="0" border="0">
         <tbody>
         <tr>
         <td style="text-align:left;">Total Items</td>
         <td style="text-align:right; padding-right:1.5%;"><?php echo $oml['totalitems']; ?></td>
         <td style="text-align:left; padding-left:1.5%;"><?=label("Total");?> </td>
         <td style="text-align:right;font-weight:bold;">Rs.<?php echo $oml['subtotal']; ?></td>
         </tr>
           <tr>
         <td style="text-align:left; padding-left:1.5%;"></td>
         <td style="text-align:right;font-weight:bold;"></td>
         <td style="text-align:left;">CGST <?=label("Amount");?></td>
         <td style="text-align:right; padding-right:1.5%;font-weight:bold;">Rs.
         <?php echo $coosgtt; ?></td>
         </tr>   

         <tr>
         <td style="text-align:left; padding-left:1.5%;"></td>
         <td style="text-align:right;font-weight:bold;"></td>
         <td style="text-align:left;">SGST <?=label("Amount");?></td>
         <td style="text-align:right; padding-right:1.5%;font-weight:bold;">Rs.
         <?php echo $oosgtt; ?></td>
         </tr>

         <tr>
         <td style="text-align:left; padding-left:1.5%;"></td>
         <td style="text-align:right;font-weight:bold;"></td>
         <td style="text-align:left;"><?=label("Discount");?></td>
         <td style="text-align:right; padding-right:1.5%;font-weight:bold;">
         <?php if($oml['discount']=='' ||$oml['discount']==0){ echo "N/A";}else{ echo $oml['discount']; } ; ?>
         </td>
         </tr>
        
         <tr><td colspan="2" style="text-align:left; font-weight:bold; padding-top:5px;"><?=label("GrandTotal");?></td><td colspan="2" style="border-top:1px dashed #000; padding-top:5px; text-align:right; font-weight:bold;">Rs.<?php echo $oml['total']; ?></td></tr>
         <tr><td colspan="2" style="text-align:left; font-weight:bold; padding-top:5px;"><?=label("Paid");?> </td><td colspan="2" style="padding-top:5px; text-align:right; font-weight:bold;">Rs.<?php echo $oml['paid']; ?></td></tr>
         <tr><td colspan="2" style="text-align:left; font-weight:bold; padding-top:5px;"><?=label("Change");?> </td><td colspan="2" style="padding-top:5px; text-align:right; font-weight:bold;">Rs.0.0</td></tr>
         </tbody>
         </table>

         <div style="border-top:1px solid #000; padding-top:10px;"><span class="float-left"><?=label("Store");?></span><span class="float-right">Tel: +9176791477</span><div style="clear:both;"><center><img style="margin-top:30px" src="<?php echo base_url();?>pos/GenerateBarcode/<?php echo str_pad($lkl, 5, "0", STR_PAD_LEFT);  ?>/code128/20/3" alt="33"></center><p class="text-center" style="margin:0 auto;margin-top:10px;">Custome Footer for dal web store</p>






<?php 
$lmjj=mysql_query("select * from returnss where re_sales_id ='".$lkl."' ");
while($lmjjf=mysql_fetch_array($lmjj))
{
$retidd=$lmjjf['re_id'];
?>

<div style="clear:both;">
<span class="float-left"><?=label("Retun");?> <?=label("Number");?> : <?php echo $lmjjf['re_id'];?> </span>
<span class="float-right" ><?=label("Date");?>  <?php echo $lmjjf['todate'];?></span>



         <div style="clear:both;">
        

         <table class="table" cellspacing="0" border="0">
         <thead>
         <tr><th>
         <em>#</em>
         <th><?=label("Product");?></th>
         <th><?=label("price");?></th>
         <th><?=label("Quantity");?></th>
         
         <th><?=label("SubTotal");?> </th>
         <tbody>
            <?php
               $kmk=1;
               $imm=mysql_query("select * from retunn_items where ret_id='".$retidd."' ");
               while($immfb=mysql_fetch_array($imm))
               {  
                   $immf=$immfb['sl_id'];
                   $immf= mysql_fetch_array(mysql_query("select * from sale_items where id='".$immf."' "));
                   $immff=$immf['product_id'];
                   $prod=mysql_fetch_array(mysql_query("select * from products where id='".$immff."'  "));
               
               
           
           

           ?>

         <tr>
         <td style="text-align:center; width:30px;"><?php echo $kmk;?></td>
         <td style="text-align:left; width:180px;"><?php echo $immf['name'];?></td>
         <td style="text-align:left; width:180px;"><?php echo $immf['price'];?></td>
          <td style="text-align:center; width:50px;"><?php echo $immfb['sl_newqt'];?></td>
         <td style="text-align:right; width:70px; "><?php echo $immfb['sl_subtotal'];?></td>
         </tr>
         <?php  

         $kmk++;
         }
         ?>
         </tbody>
         </table>


         <table class="table" style="margin-bottom:8px;" cellspacing="0" border="0">
         <tbody>
         <tr>
         <td style="text-align:left;"><?=label("TotalItems");?> </td>
         <td style="text-align:right; padding-right:1.5%;"><?php echo $lmjjf['iteems']; ?></td>
         <td style="text-align:left; padding-left:1.5%;">Total</td>
         <td style="text-align:right;font-weight:bold;">Rs.<?php echo $lmjjf['sutott']; ?></td>
         </tr>
        

         <tr>
         <td style="text-align:left; padding-left:1.5%;"></td>
         <td style="text-align:right;font-weight:bold;"></td>
         <td style="text-align:left;"><?=label("Discount");?> </td>
         <td style="text-align:right; padding-right:1.5%;font-weight:bold;">
         <?php if($lmjjf['discper']=='' ||$lmjjf['discper']==0){ echo "N/A";}else{ echo $lmjjf['discper']; } ; ?>
         </td>
         </tr>
        
         <tr><td colspan="2" style="text-align:left; font-weight:bold; padding-top:5px;"><?=label("GrandTotal");?> </td><td colspan="2" style="border-top:1px dashed #000; padding-top:5px; text-align:right; font-weight:bold;">Rs.<?php echo $lmjjf['tootal']; ?></td></tr>
         <tr>
         <td colspan="1" style="text-align:left; font-weight:bold; padding-top:5px;">Return Type</td>
         <td colspan="1" style="padding-top:5px; text-align:right; "><?php if($lmjjf['retrn_amt_mtd']==1){echo "Return";}else{echo "Exchange";} ?></td>
         <td colspan="1" style="text-align:left; font-weight:bold; padding-top:5px;"><?=label("Return");?>  <?=label("Status");?> </td>
         <td colspan="1" style="padding-top:5px; text-align:right; "><?php if($lmjjf['retun_amt_stas']==1){echo "Returned";}else{echo "Pending";} ?></td>

         </tr>
         <tr>
         <td colspan="1" style="text-align:left; font-weight:bold; padding-top:5px;"><?=label("Return");?>  <?=label("Date");?> </td>
         <td colspan="1" style="padding-top:5px; text-align:right; "><?php echo $lmjjf['date_retun']; ?></td>

          <td colspan="1" style="text-align:left; font-weight:bold; padding-top:5px;">Sal ID</td>
         <td colspan="1" style="padding-top:5px; text-align:right; font-weight:bold;"><?php echo   str_pad($lmjjf['purcha_sales_id'], 5, "0", STR_PAD_LEFT); ?></td>

         </tr>
         </tbody>
         </table>
         </div>
         </div>


      <?php
    }

    ?>



      <div class="text-center" style="background-color:#000;padding:5px;width:85%;color:#fff;margin:0 auto;border-radius:3px;margin-top:20px;">Thank you for your business</div> 
         </div>
         </div>
         </div>
         </div>
         </div>
         </div>
         </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?=label("Close");?></button>
        <button type="button" class="btn btn-add hiddenpr" href="javascript:void(0)" onclick="pdfreceipt()">PDF</button>
        <button type="button" class="btn btn-add hiddenpr" onclick="email()"><?=label("Email");?></button>
        <button type="button" class="btn btn-add hiddenpr" onclick="PrintTicket()"><?=label("print");?></button>
      </div>
    </div>
</div>
<!-- /.Modal -->


<!-- Modal ticket -->
<div class="modal fade" id="ticket" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document" id="ticketModal">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="ticket"><?=label("Receipt");?></h4>
      </div>
      <div class="modal-body" id="modal-body">
         <div id="printSection">
            <!-- Ticket goes here -->
            <center><h1 style="color:#34495E"><?=label("empty");?></h1></center>
         </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?=label("Close");?></button>
        <button type="button" class="btn btn-add hiddenpr" href="javascript:void(0)" onClick="pdfreceipt()">PDF</button>
        <button type="button" class="btn btn-add hiddenpr" onclick="email()"><?=label("email");?></button>
        <button type="button" class="btn btn-add hiddenpr" onclick="PrintTicket()"><?=label("print");?></button>
      </div>
    </div>
 </div>
</div>
<!-- /.Modal -->



 <script>
  
   function isNumberKey(evt)
      {
         var charCode = (evt.which) ? evt.which : event.keyCode
         if (charCode > 31 && (charCode < 48 || charCode > 57))
            return false;

         return true;
      }
    
    
function getXMLHTTP() 
{ 
        var xmlhttp=false;    
        try{
            xmlhttp=new XMLHttpRequest();
        }
        catch(e)    {        
            try{            
                xmlhttp= new ActiveXObject("Microsoft.XMLHTTP");
            }
            catch(e){
                try{
                xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
                }
                catch(e1){
                    xmlhttp=false;
                }
            }
        }
             
        return xmlhttp;
}




function getqqtt(str,tid) 
{   




var fie = tid.split('_');
var iij = fie[1];
 var pprice=document.getElementById('pric_'+iij).value;
 var qtyret=document.getElementById('retq_'+iij).value;
 var ssubtoto=document.getElementById('stot_'+iij).value;
  var qtyavl=document.getElementById('qty_'+iij).value;
 
  var tta=pprice*qtyret;
  if(parseInt(qtyavl) >= parseInt(qtyret)  )
  {

 document.getElementById('stot_'+iij).value=tta;
 
 }
  else
  {
    document.getElementById('retq_'+iij).value=0;
    document.getElementById('stot_'+iij).value=0;
  }

    
 var texxx=document.getElementById('numrowc').value;

var mss=0;
var i=1;
for(i=1;i< texxx; i++)
{

var skk=document.getElementById('stot_'+i).value;

if(skk>0)
{
mss=parseFloat(mss) + parseFloat(skk);
}

}
  document.getElementById('gtot').value=mss;
  var ddper=document.getElementById('discper').value;

  var taxcal=(ddper * mss)/100;
  var ttt=parseFloat(mss)-parseFloat(taxcal);
  document.getElementById('distot').value=taxcal;


  document.getElementById('gltot').value=ttt; 

      

    
}

  
  







</script>


<!-- Modal add user -->
</div>

<div class="modal fade" id="AddCustomer" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document" style="width:700px;">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel">List Of Products</h4>
      </div>
      
      <div class="modal-body" style="padding: 0;">
                    <div class="col-xs-3 table-header">
            <h3 style="text-transform: capitalize;"><?=label("Product");?></h3>
         </div>
         <div class="col-xs-2 table-header">
            <h3 style="text-transform: capitalize;"><?=label("price");?></h3>
         </div>
         <div class="col-xs-2 table-header nopadding">
            <h3 style="text-transform: capitalize;" class="text-left"><?=label("Purchase");?> <br><?=label("Qty");?></h3>
         </div>
         
                    <div class="col-xs-2 table-header">
            <h3 style="text-transform: capitalize;"><?=label("Return");?> Qty</h3>
         </div>
         
         <div class="col-xs-3 table-header nopadding">
            <h3 style="text-transform: capitalize;"><?=label("Total");?></h3>
         </div>
         <form method="POST" action="<?php echo base_url();?>returns/addre/<?php echo $lkl;?>"> 
              <div class="modal-body" style="padding: 0;">
             <?php
               $immff=1;
               $imm=mysql_query("select * from sale_items where sale_id='".$lkl."' ");
               while($immf=mysql_fetch_array($imm))
               {  
                   $salid=$immf['id'];
                   $qtyy=$immf['qt'];
                   $ckkk=mysql_query("select * from retunn_items where sl_id='".$salid."' ");
                   while($ckkkf=mysql_fetch_array($ckkk))
                   {
                    $qtyy=$qtyy-$ckkkf['sl_newqt'];
                   }


                   

                   $immffq=$immf['product_id'];
                   $prod=mysql_fetch_array(mysql_query("select * from products where id='".$immffq."'  "));
               
           ?>
           <div class="col-xs-12">
           <div class="panel panel-default product-details">
           <div class="panel-body" style="padding: 6px;">
           
           
           <div class="col-xs-3 nopadding"><span class="textPD"><?php echo $prod['name'];?></span></div>
           <div class="col-xs-2">
<input style="width:100%;" type="hidden" readonly="readonly" id="idd_<?php echo $immff;?>" name="idd_<?php echo $immff;?>" value="<?php echo $salid;?>" /> 
           <input class="form-control"  style="width:100%;" type="text" readonly="readonly" id="pric_<?php echo $immff;?>" name="pric_<?php echo $immff;?>" value="<?php echo $immf['price'];?>" />
           </div>
           <div class="col-xs-2 nopadding ">
               
               <input  class="form-control" style="width:100%;" type="text" readonly="readonly" id="qty_<?php echo $immff;?>" name="qty_<?php echo $immff;?>" value="<?php echo $qtyy;?>" />
               
           
           </div>
           <div class="col-xs-2 padding ">
           <input class="form-control"  style="width:100%;"  onkeypress="return isNumberKey(event)"  onkeyup="getqqtt(this.value,this.id)" type="text"  id="retq_<?php echo $immff;?>" name="retq_<?php echo $immff;?>" value="" />
           </div>
           
           <div class="col-xs-3 nopadding ">
           <input class="form-control" style="width:100%;" type="text" readonly="readonly"  id="stot_<?php echo $immff;?>" name="stot_<?php echo $immff;?>" value="" />
           </div>
           
           </div></div></div>
           
           <?php 
           $immff++;
               }
               ?>

               
           
      </div>
      <style type="text/css">
        .mnm
        {
          border-radius: 4px;padding: 6px 12px;background-color: #eee;text-align: center;width: 160px;margin: 0px 7px 0px 15px;height: 32px;
          border: 1px solid #ccc;
        }
         .mnms
        {
          border-radius: 4px;padding: 6px 12px;text-align: center;width: 160px;margin: 0px 7px 0px 15px;height: 32px;
          border: 1px solid #ccc;
        }
      </style>
      <div class="modal-footer"> 
          <br><br>
          <input  type="hidden" readonly="readonly"  id="numrowc" name="numrowc" value="<?php echo $immff;?>" />
            <?=label("SubTotal");?><input  class="mnm" type="text" readonly="readonly"  id="gtot" name="gtot" value="" />
          <br><br>
          <input  type="hidden" readonly="readonly"  id="discper" name="discper" value="<?php echo $distt;?>" />
          <?=label("Discount");?> <input class="mnm"  type="text" readonly="readonly"  id="distot" name="distot" value="" />
          <br><br>
           <?=label("Total");?> <input class="mnm"  type="text" readonly="readonly"  id="gltot" name="gltot" value="" />
          <br><br>

            <?=label("Return");?> <?=label("Type");?> <select class="mnms" name="rrtyp" id="rrtyp">
          <option value="1"><?=label("Return");?> </option>
          <option value="2"><?=label("Exchange");?> </option>
            </select>
          <br><br>


        <button type="button" class="btn btn-default" data-dismiss="modal"><?=label("Close");?></button>
        <button type="submit" class="btn btn-add"><?=label("Submit");?></button>
      </div>
   </form>
    </div>
 </div>
</div>
<!-- /.Modal -->

<!-- Modal add user -->
<div class="modal fade" id="CloseRegister" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog modal-lg" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("CloseRegister");?></h4>
      </div>
      <div class="modal-body">
         <div id="closeregsection">
            <!-- close register detail goes here -->
         </div>
      </div>
      <div class="modal-footer">
        <a href="javascript:void(0)" onclick="SubmitRegister()" class="btn btn-red col-md-12 flat-box-btn"><?=label("CloseRegister");?></a>
      </div>
    </div>
 </div>
</div>
<!-- /.Modal -->

<?php } ?>
