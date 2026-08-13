<div class="container">
  <div class="col-md-12">
  <?php


$iddff=$this->uri->segment(3);

if($iddff>0)
{

$myss=mysql_fetch_array(mysql_query("select * from prentrypurchases_combo where id='".$iddff."' "));
}
else
{
  redirect('combooffers');

}

   $tab = (isset($_GET['tab'])) ? $_GET['tab'] : null; ?>
<script type="text/javascript" src="https://www.google.com/jsapi"></script>
    <script type="text/javascript">
          google.load("elements", "1", 
          {
            packages: "transliteration"
          });

      function onLoad() 
      {
        var options = 
        {
          sourceLanguage: 'en', // or google.elements.transliteration.LanguageCode.ENGLISH,
          destinationLanguage: ['<?=label("languagek");?>'], // or [google.elements.transliteration.LanguageCode.HINDI],
          shortcutKey: 'ctrl+g',
          transliterationEnabled: true
        };
        var control = new google.elements.transliteration.TransliterationControl(options);
        var ids = [ "countryname_1m" ];
        control.makeTransliteratable(ids);
         control.showControl('translControl');
      }
      google.setOnLoadCallback(onLoad);
    </script>
    

<script language="javascript" type="text/javascript">
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
function getdetals(countryId,vvv) 
{
var vvvxx= vvv;
var itemss = vvvxx.split('_');
var jjv=itemss[1];
var strURL="<?php echo base_url();?>purchase/findcctn?country="+countryId;
var req = getXMLHTTP();
        if (req) {
            req.onreadystatechange = function() 
            {
                if (req.readyState == 4) 
                {
                    if (req.status == 200) 
                    {    
                    var data = req.responseText.split(",");
                    $('#cosst_'+jjv).val(data[0]);
                    $('#selling_'+jjv).val(data[1]);

                    $('#cgst_'+jjv).val(data[2]);
                    $('#sgst_'+jjv).val(data[3]);



                    $('#qty_'+jjv).val(0);
                    $('#subtt_'+jjv).val(0);

                    
                                            
                    } 
                    else 
                    {
                        alert("There was a problem while using XMLHTTP:\n" + req.statusText);
                    }
                }                
            }            
            req.open("GET", strURL, true);
            req.send(null);
        }        


}

function getState(countryId,jjj) {  


 var idxx= jjj;
 
    var items = idxx.split('_');
    var jj=items[1];
    

var strURL="<?php echo base_url();?>purchase/findState?country="+countryId;
        var req = getXMLHTTP();
        if (req) {
            req.onreadystatechange = function() 
            {
                if (req.readyState == 4) 
                {
                    if (req.status == 200) 
                    {       

                        document.getElementById('statediv_'+jj).innerHTML=req.responseText;                        
                    } 
                    else 
                    {
                        alert("There was a problem while using XMLHTTP:\n" + req.statusText);
                    }
                }                
            }            
            req.open("GET", strURL, true);
            req.send(null);
        }        
    }

    function getStatebrd(countryId,jjj) {  


 var idxx= jjj;
 
    var items = idxx.split('_');
    var jj=items[1];
    

var strURL="<?php echo base_url();?>purchase/findStatebran?country="+countryId;
        var req = getXMLHTTP();
        if (req) {
            req.onreadystatechange = function() 
            {
                if (req.readyState == 4) 
                {
                    if (req.status == 200) 
                    {       

                        document.getElementById('customerSelect_'+jj).innerHTML=req.responseText;                        
                    } 
                    else 
                    {
                        alert("There was a problem while using XMLHTTP:\n" + req.statusText);
                    }
                }                
            }            
            req.open("GET", strURL, true);
            req.send(null);
        }        
    }
</script>
<script>
$(document).ready(function(){
$(document).on("click","#addMoreRows", function(){ //alert("ddssss");
    var inc=1;
  var vl=$('#countid').val();
         var vl1 =  (parseFloat(vl)+parseFloat(inc)); 
     //alert(vl1);
    //alert(vl);
    $('#countid').val(vl1);
    var datastring='countid='+vl1;
  
  $.ajax
({
type: "POST",
url: "<?php  echo base_url(); ?>purchase/addrow",
data: datastring,
cache: false,
success: function(result)
{ 
    // alert(result);
            
        $('#education_fields').append(result);
} 
});

});
  
});
</script>


<script type="text/javascript">
  
function education_fields() 
{

 var ttyt=document.getElementById('totelemt').value;
 ttyt++;
   document.getElementById('totelemt').value=ttyt; 
   document.getElementById('add'+ttyt).style.display = 'block';
   

}



   function remove_education_fields(rid) 
   {

 
       $.ajax({
         url : "<?php echo site_url('pos/prodload_combo')?>/",
         type: "POST",
         data: {rid: rid},
         success: function(data)
         {
          
          $('#productListkar').html(data);
          $('#countryname_1m').focus();

     
 var amtt=0;
var ttcgst=0;
var ttsgst=0;
var totitem=0;
var totitem_amt=0;
var cc1=0;
var ss1=0;
  var ttyt=document.getElementById('ll').value;
   var ss = ttyt.split(","); 
   
   for (var i in ss) 
   { 
 xt=ss[i];
 var elementExists = document.getElementById('qty_'+xt);
  if(elementExists!=null)
  {
    var xxz=document.getElementById('qty_'+xt).value;
    var xxzcc=document.getElementById('tcosst_'+xt).value;
    totitem=parseFloat(totitem)+parseFloat(xxz);
    totitem_amt=parseFloat(totitem_amt)+parseFloat(xxzcc);
  }
}
$("#discct").val(totitem);
$("#discct_amt").val(totitem_amt);
$("#final_amt").val(totitem_amt);
    },
         error: function (jqXHR, textStatus, errorThrown)
         {
            alert("error");
         }
     });



   }


   function callds(cc,bb)
   {

 var va1=document.getElementById('betot').value;
 var va2=document.getElementById('cskgst').value;
 var va3=document.getElementById('sskgst').value;


   var kmxx=parseFloat(va1) + parseFloat(va2)+ parseFloat(va3)- parseFloat(cc);

$("#afftot").val(kmxx.toFixed(<?=$this->setting->decimals;?>));





   }

     function callcc(cc,bb)
   {
   
     
   var items = bb.split('_');
   var jj=items[1];
   var rssss=document.getElementById('cosst_'+jj).value;
   var qqty=cc;
   var kmxx=parseFloat(rssss) * parseFloat(qqty);
  
   $("#subtt_"+jj).val(kmxx);
   

var amtt=0;
var totitem=0;
var totitem_amt=0;

var cc1=0;
var ss1=0;


   var ttyt=document.getElementById('totelemt').value;
   
for(var xt=1;xt<=ttyt;xt++)
{
  var elementExists = document.getElementById('subtt_'+xt);


  if(elementExists!=null)
  {
     var rssss=document.getElementById('subtt_'+xt).value;
     var xxz=document.getElementById('qty_'+xt).value;


 var xxzcc=document.getElementById('tcosst_'+xt).value;
   totitem_amt=parseFloat(totitem_amt)+parseFloat(xxzcc);

  amtt=parseFloat(amtt)+parseFloat(rssss);
  totitem=parseFloat(totitem)+parseFloat(xxz);


  var c1=document.getElementById('cgst_'+xt).value;


     var tty = (parseFloat(c1)*parseFloat(rssss))/100;
     $("#ttcgst_"+xt).val(tty);
     cc1=parseFloat(cc1)+parseFloat(tty);

     

     var s1=document.getElementById('sgst_'+xt).value;
     var sty = (parseFloat(s1)*parseFloat(rssss))/100;
     $("#ttsgst_"+xt).val(sty);
     ss1=parseFloat(ss1)+parseFloat(sty);
  
  }
}

var dd1=document.getElementById('ddkst').value;

var flss1=parseFloat(amtt)+parseFloat(cc1)+parseFloat(ss1)-parseFloat(dd1);

$("#betot").val(amtt.toFixed(<?=$this->setting->decimals;?>));
$("#discct").val(totitem);
$("#discct_amt").val(totitem_amt);
$("#final_amt").val(totitem_amt);
$("#cskgst").val(cc1.toFixed(<?=$this->setting->decimals;?>));
$("#sskgst").val(ss1.toFixed(<?=$this->setting->decimals;?>));
$("#afftot").val(flss1.toFixed(<?=$this->setting->decimals;?>));

}



      function callcctt(cc,bb)
   {
   var rssss=document.getElementById('betot').value;
   
   var nmm=parseFloat(rssss);
   if(cx!='')
   {
  

   $("#aftot").val(kmaa);

 }
 else
 {

  $("#aftot").val(nmm);

   }
 }
</script>
<script>
$(document).ready(function() {
   $.ajax({
         url : "<?php echo site_url('pos/proddload_posales_combo')?>/",
         type: "POST",
         data: {producnum: 10},
         success: function(data)
         {
          
          $('#productListkar').html(data);
      
var amtt=0;
var totitem=0;
var totitem_amt=0;
var cc1=0;
var ss1=0;
 var ttyt=document.getElementById('ll').value;
   var ss = ttyt.split(","); 
   for (var i in ss) 
   { 
 xt=ss[i];
  var elementExists = document.getElementById('qty_'+xt);


 if(elementExists!=null)
  {
   var xxz=document.getElementById('qty_'+xt).value;

    var xxzcc=document.getElementById('tcosst_'+xt).value;

      totitem_amt=parseFloat(totitem_amt)+parseFloat(xxzcc);
   
   totitem=parseFloat(totitem)+parseFloat(xxz);
  }
  
}


$("#discct").val(totitem);

  $("#discct_amt").val(totitem_amt);
//$("#final_amt").val(totitem_amt);




           
         },
         error: function (jqXHR, textStatus, errorThrown)
         {
            alert("error");
         }
     });

});





function selectState(nam,m,idd,rss,cgg,sgg) 
{
$("#country_"+m).val(nam);
$("#cosst_"+m).val(rss);
$("#proid_"+m).val(idd);
$("#cgst_"+m).val(cgg);
$("#sgst_"+m).val(sgg);
$("#suggesstion-box_"+m).hide();
}


    </script>



    

</html>

         

     <style>  
           .vvv ul{  
             background-color: #f8f1f1;
            z-index: 1000;
                
                cursor:pointer;
                width:90%;
              position: absolute;  
               padding:10px;  
           }  
           .vvv li{  
                padding:5px;

           }  
           </style>

<h3><?=label("Edit");?> <?=label("combo_offers");?>  <a style="float: right;" class="btn btn-primary btn-red" href="<?php echo base_url();?>productionentry"  ><?=label("Back");?></a></h3>
<hr>
        <input type="hidden" id="countid" value="1">


<form  method="post" action="<?php echo base_url();?>combooffers/addtodbb_edit/<?php echo $iddff;?>" >

<div class="panel-body">

<input   class="form-control" type="hidden" name="prcno" id="prcno" value="1">
  


  <input type="hidden" maxlength="30" Required="required"  value="<?php echo date("d-m-Y");?>" name="pddate" class="form-control" id="pddate" placeholder="<?=label("Date");?>"> 


   <input type="hidden" maxlength="30"  value="0" name="warr" class="form-control" id="warr" />



<div class="col-sm-3 ">
  <div class="form-group"><?=label("Title");?>
  <input  value="<?php echo $myss['ref'];?>" type="text" maxlength="30" Required="required"  value="" name="ref" class="form-control" id="ref"  > 
</div>
</div> 



















</div>






 <div class="col-sm-10 ">
<div class="panel-body" style="padding: 0px;background-color: bisque;">



         <div style="text-align: center;" class="col-xs-4 table-header">
            <h7><?=label("Product");?></h7>
         </div>
         
         

          <div style="text-align: center;"   class="col-xs-2 table-header">
            <h7><?=label("Quantity");?></h7>
         </div>


         <div style="text-align: center;padding: 0px 0px;"  class="col-xs-2 table-header">
            <h7><?=label("selling");?> <?=label("Price");?> </h7>

         </div>
      

        


        
        

         
  


  <div id="add1" class="col-xs-12">
       
<div class="col-sm-3 " style="padding-right: 1px;padding-left: 1px;"><div class="form-group">
       <input onkeyup="return auromcv(this.value,this.id);" class="form-control" type='text' id='countryname_1m' />
       <input      class="form-control" type='hidden' id="statediv_1m"  />
        </div></div>    


<script type="text/javascript">

function barcodekar(edit_id)
{
var producnum=$('#statediv_1m').val();
if(producnum=='')
{
  $('#countryname_1m').focus();
  return false;
}

var purrs=$('#cosst_1m').val();
if(purrs=='') { $('#cosst_1m').focus(); return false; }

var qqty=$('#qty_1m').val();
if(qqty=='' || qqty==0 || qqty=='0') { $('#qty_1m').focus(); return false; }

var atorr=$('#totelemt').val();
var nj=atorr++;
   $.ajax({
         url : "<?php echo site_url('pos/prodenload_combo')?>/",
         type: "POST",
         data: {edit_id: edit_id,producnum: producnum,purrs: purrs,qqty: qqty},
         success: function(data)
         {
          
          $('#productListkar').html(data);
          

$('#statediv_1m').val('');
$('#countryname_1m').val('');
$('#cosst_1m').val('');

$('#qty_1m').val('');


$('#countryname_1m').focus();


var amtt=0;
var totitem=0;
var totitem_amt=0;
var cc1=0;
var ss1=0;
 var ttyt=document.getElementById('ll').value;
   var ss = ttyt.split(","); 
   for (var i in ss) 
   { 
 xt=ss[i];
  var elementExists = document.getElementById('qty_'+xt);
 if(elementExists!=null)
  {
   var xxz=document.getElementById('qty_'+xt).value;
   totitem=parseFloat(totitem)+parseFloat(xxz);

   var xxzcc=document.getElementById('tcosst_'+xt).value;
   totitem_amt=parseFloat(totitem_amt)+parseFloat(xxzcc);

  }
}

$("#discct").val(totitem);
$("#discct_amt").val(totitem_amt);
$("#final_amt").val(totitem_amt);

           
         },
         error: function (jqXHR, textStatus, errorThrown)
         {
            alert("error");
         }
     });

   

};
  
$(document).ready(function() {
  $('#mexpdate_1m').datepicker({
      todayHighlight: true,
      autoclose:true
  });
 });

$(document).ready(function() {
  $('#expdate_1m').datepicker({
      todayHighlight: true,
      autoclose:true
  });
 });

</script>



   

<script type="text/javascript">

   function caliuu(cc,bb) 
   {
    var va1=document.getElementById('cosst_1mex').value;
    var kmxx1= parseFloat(va1) / parseFloat(cc);
    $("#cosst_1m").val(kmxx1.toFixed(2));

    var va2=document.getElementById('selling_1mex').value;
    var kmxx2= parseFloat(va2) / parseFloat(cc);
    $("#selling_1m").val(kmxx2.toFixed(2));   

    var va3=document.getElementById('stropex').value;
    var kmxx3= parseFloat(cc) * parseFloat(va3);
    $("#qty_1m").val(kmxx3); 



   }


function calstrip(cc,bb)
{

 var va1=document.getElementById('cosst_1m').value;
 var kmxx= parseFloat(va1)*parseFloat(cc);
 $("#subtt_1m").val(kmxx.toFixed(2));

}

function calpurc(cc,bb)
   {
     var va1=document.getElementById('stropex').value;
    var kmxx= parseFloat(va1)*parseFloat(cc);
    $("#subtt_1m").val(kmxx.toFixed(2));

     var va2=document.getElementById('iuuex').value;
     var kmxx2= parseFloat(cc) / parseFloat(va2);
     $("#cosst_1m").val(kmxx2.toFixed(2));
   }

   function calsell(cc,bb)
   {
     var va2=document.getElementById('iuuex').value;
     var kmxx2= parseFloat(cc) / parseFloat(va2);
     $("#selling_1m").val(kmxx2.toFixed(2));
   }


</script>

      

  

      


      
      
      

      



        <div style="padding-right: 1px;padding-left: 1px;"  class="col-sm-3 "><div class="form-group">
        <input  style="padding: 0px 0px;"  type="text" onkeyup="return calstrip(this.value,this.id);"   class="form-control" id="qty_1m"   value="" placeholder="Quantity"><br>
        </div>
        </div>


             <div class="col-sm-3 " style="padding-right: 1px;padding-left: 1px;"><div class="input-group"> 

      <input readonly="readonly"     type="text" class="form-control" id="cosst_1m"  value="" placeholder="Cost">
       
      
      <div class="input-group-btn">  
      <button class="btn btn-success" type="button" onclick="barcodekar(<?php echo $iddff;?>);" > 
      <span class="glyphicon glyphicon-plus" aria-hidden="true"></span></button></div>
      </div>
      </div>  
       
</div>




</div>





<input type="hidden" id="totelemt" name="totelemt"  value="1" />




<div class="panel panel-default">
  
  <div class="panel-heading"><?=label("Products");?>  </div>
  <div class="panel-body">



         <div style="text-align: center;" class="col-xs-4 table-header">
            <h7><?=label("Product");?></h7>
         </div>


         <div style="text-align: center;" class="col-xs-2 table-header">
            <h7><?=label("Quantity");?></h7>
         </div> 

         <div style="text-align: center;" class="col-xs-2 table-header">
            <h7><?=label("selling");?> <?=label("Price");?> </h7>

         </div>     


         <div style="text-align: center;" class="col-xs-2 table-header">
            <h7><?=label("Total");?> <?=label("Price");?> </h7>

         </div>
        

         
  



<script  type="text/javascript" src="<?php echo base_url();?>assets/wildel/jquery-1.10.2.min.js"></script>
<script  type="text/javascript" src="<?php echo base_url();?>assets/wildel/jquery-ui-1.10.3.custom.min.js"></script>

<div id="productListkar">

         
        </div>
     
   



          <br>
          <br>
          <br>




<div  class="col-xs-12" >
       
       <div class="col-sm-2 "></div>    

      
       
   

<div  class="col-sm-2 "><?=label("TotalItems");?></div>
      <div style="padding-left: 0px;padding-right: 0px;" class="col-sm-2 "><input readonly="readonly" type="text" class="form-control" id="discct" name="discct" value="" placeholder="Total">
</div>

<div  class="col-sm-2 "><?=label("Totalamount");?></div>
      <div style="padding-left: 0px;padding-right: 0px;" class="col-sm-2 "><input readonly="readonly" type="text" class="form-control" id="discct_amt" name="discct_amt" value="" placeholder="Total">
</div>
      
     
</div>

          

<div  class="col-xs-12" >
  <br>
        
<div class="col-sm-2 "></div>    
<div  class="col-sm-2 ">&nbsp;</div>
<div style="padding-left: 0px;padding-right: 0px;" class="col-sm-2 ">&nbsp;
</div>
<div  class="col-sm-2 "><?=label("combo_amount");?></div>
<div style="padding-left: 0px;padding-right: 0px;" class="col-sm-2 ">
  <input   type="text" class="form-control" id="final_amt" name="final_amt" value="<?php echo $myss['final_amt'];?>" placeholder="Total">
</div>
      
     
</div>








<div  class="col-xs-12" >
       
       <div class="col-sm-2 "></div>    

      <div class="col-sm-2 "></div>
       
      <div  class="col-sm-1 "></div>
  


  

      
      <div  class="col-sm-2 "></div>
      
      <div style="padding-left: 0px;padding-right: 0px;" class="col-sm-2 "><br><input  type="Submit" class="form-control btn btn-green" id="aftot" name="Submit" value="Save"   ></div>  
       














<div class="clear"></div>
  
  </div>
  </div>

  <div class="panel-footer"><small><em><a href="javascript:void(0);"></a></em></em></small></div>
</div>





      </div>
   </div>
</div>
</form>

<script type="text/javascript">

/******** passwors confirmation validation ****************/

var currency = document.getElementById("currency");

function validatecurrency(){
  if(currency.value.length < 3) {
    currency.setCustomValidity("The Currency code must be at least 3 characters length");
  } else {
    currency.setCustomValidity('');
  }
}
if(currency) currency.onchange = validatecurrency;

$('.collapse').collapse()
</script>



<script type="text/javascript">

function saleBtn(type) {

   var bbtna = $('#bkmfgbbcg').val();
     var ecpnn = $('#bkexpdate').val();
     var mecpnn = $('#bkmexpdate').val();
     var ecpame = $('#bkmfgname').val();
     
  $.ajax({
      url : "<?php echo site_url('pos/savebatch')?>/"+type,
      type: "POST",
      data: {bbtna:bbtna,ecpnn:ecpnn,mecpnn:mecpnn,ecpame:ecpame},
      success: function(data)
      {
         $('#bkmfgbbcg').val('');
     $('#bkexpdate').val('');
     $('#bkmexpdate').val('');
     $('#bkmfgname').val('');
     $('#AddWarehouse').modal('hide');

 $('#printSection').html(data);
   $('#Addpayament').modal('show');

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


$(document).ready(function() {
  $('#pddate').datepicker({
      todayHighlight: true,
      autoclose:true
  });
 });

$(document).ready(function() {
$('#innvdda').datepicker({
      todayHighlight: true,
      autoclose:true
  });

$('#bkexpdate').datepicker({
      todayHighlight: true,
      autoclose:true
  });

$('#bkmexpdate').datepicker({
      todayHighlight: true,
      autoclose:true
  });
  });

</script>
<script  >
 function auromcv(kk,mm)
    {

  var items = mm.split('_');
  var jjv=items[1];

    $('#countryname_'+jjv).autocomplete({

              source: function( request, response ) {
                $.ajax({
                  url : '<?php echo base_url();?>pos/searchitems34/',
                  dataType: "json",
              data: {
                 name_startsWith: request.term,
                 type: 'country_table',
                 row_num : 1
              },
               success: function( data ) {
                
                
                  response( $.map( data, function( item ) {
                  var code = item.split("|");
                  return {
                    label: code[0],
                    value: code[0],
                    data : item
                  }
                }));
              }
                });
              },
              autoFocus: true,          
              minLength: 0,
              select: function( event, ui ) {
              

            var names = ui.item.data.split("|");

            console.log(names[1], names[2], names[3]);   

                    $('#statediv_1m').val(names[1]);
                    
                    $('#selling_1m').val(names[2]);

                    $('#cgst_1m').val(names[4]);
                    $('#sgst_1m').val(names[5]);

                    $('#cosst_1m').val(names[2]);



            

          }           
            });
            
            }


 function auromcvbat(kk,mm)
    {
      

      var items = mm.split('_');
   var jjv=items[1];

    $('#mfgbbcg_'+jjv).autocomplete({
      

              source: function( request, response ) {
                $.ajax({
                  url : '<?php echo base_url();?>pos/searchitems3/',
                  dataType: "json",
              data: {
                 name_startsWith: request.term,
                 type: 'country_table',
                 row_num : 1
              },
               success: function( data ) {
                
                  response( $.map( data, function( item ) {
                  var code = item.split("|");
                  return {
                    label: code[0],
                    value: code[0],
                    data : item
                  }
                }));
              }
                });
              },
              autoFocus: true,          
              minLength: 0,
              select: function( event, ui ) {
              

            var names = ui.item.data.split("|");

            console.log(names[1], names[2], names[3]);   

                    $('#expdate_'+jjv).val(names[1]);
                    $('#mexpdate_'+jjv).val(names[2]);
                    $('#mfgname'+jjv).val(names[3]);

                   


            

          }           
            });
            
            }

          
      

</script>

