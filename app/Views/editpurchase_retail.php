
<div class="container">
   <div class="row" style="margin-top:10px;">
      <div class="col-md-12">
         <!-- tab navigation -->
         <?php $tab = (isset($_GET['tab'])) ? $_GET['tab'] : null; ?>


         <?php $segg= $this->uri->segment(3);

$perr=mysql_fetch_array(mysql_query("select * from purchases where id='".$segg."' "));

         ?>


<script language="javascript" type="text/javascript">

function getXMLHTTP() { 
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
         url : "<?php echo site_url('pos/load_pogoodpurrdelpp')?>/",
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
var cc1=0;
var ss1=0;
  var ttyt=document.getElementById('ll').value;
   var ss = ttyt.split(","); 
   
   for (var i in ss) 
   { 
 xt=ss[i];
 var elementExists = document.getElementById('subtt_'+xt);
  if(elementExists!=null)
  {
     var rssss=document.getElementById('subtt_'+xt).value;
     var xxz=document.getElementById('qty_'+xt).value;
 amtt=parseFloat(amtt)+parseFloat(rssss);
  totitem=parseFloat(totitem)+parseFloat(xxz);
     var c1=document.getElementById('cgst_'+xt).value;
     var tty = (parseFloat(c1)*parseFloat(amtt))/100;
     $("#ttcgst_"+xt).val(tty);
     cc1=parseFloat(cc1)+parseFloat(tty);
     var s1=document.getElementById('sgst_'+xt).value;
     var sty = (parseFloat(s1)*parseFloat(amtt))/100;
     $("#ttsgst_"+xt).val(sty);
     ss1=parseFloat(ss1)+parseFloat(sty);
  }
}
var dd1=document.getElementById('ddkst').value;
var flss1=parseFloat(amtt)+parseFloat(cc1)+parseFloat(ss1)-parseFloat(dd1);
$("#betot").val(amtt);
$("#innvamt").val(amtt);
$("#discct").val(totitem);
$("#cskgst").val(cc1);
$("#sskgst").val(ss1);
$("#afftot").val(flss1);




          

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

$("#afftot").val(kmxx);





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
var ttcgst=0;
var ttsgst=0;
var totitem=0;
var cc1=0;
var ss1=0;
  var ttyt=document.getElementById('ll').value;
   var ss = ttyt.split(","); 
   
   for (var i in ss) 
   { 
 xt=ss[i];
 var elementExists = document.getElementById('subtt_'+xt);
  if(elementExists!=null)
  {
     var rssss=document.getElementById('subtt_'+xt).value;
     var xxz=document.getElementById('qty_'+xt).value;
 amtt=parseFloat(amtt)+parseFloat(rssss);
  totitem=parseFloat(totitem)+parseFloat(xxz);
     var c1=document.getElementById('cgst_'+xt).value;
     var tty = (parseFloat(c1)*parseFloat(amtt))/100;
     $("#ttcgst_"+xt).val(tty);
     cc1=parseFloat(cc1)+parseFloat(tty);
     var s1=document.getElementById('sgst_'+xt).value;
     var sty = (parseFloat(s1)*parseFloat(amtt))/100;
     $("#ttsgst_"+xt).val(sty);
     ss1=parseFloat(ss1)+parseFloat(sty);
  }
}
var dd1=document.getElementById('ddkst').value;
var flss1=parseFloat(amtt)+parseFloat(cc1)+parseFloat(ss1)-parseFloat(dd1);
$("#betot").val(amtt);
$("#innvamt").val(amtt);
$("#discct").val(totitem);
$("#cskgst").val(cc1);
$("#sskgst").val(ss1);
$("#afftot").val(flss1);


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
    $(document).ready(function(){
  $("#country_1").keyup(function(){
    $.ajax({
    type: "POST",
    url: "<?php echo base_url();?>pos/lookupcc",
    data:'vv=1&keyword='+$(this).val(),
    success: function(data){
      $("#suggesstion-box_1").show();
      $("#suggesstion-box_1").html(data);
    }
    });
  });
});

function ckkkr()
{

var kk=$("#innvamt").val();
var mm=$("#betot").val();
if(kk==mm)

{
  
  return true;
}
else
{
  alert("Sorry ,Supplier Invoice Amount is not matching with total amount");
  return false;
}


} 



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


<h3><?=label("Edit");?> <?=label("Purchase");?> <a style="float: right;" class="btn btn-primary btn-red" href="<?php echo base_url();?>purchase"  ><?=label("Back");?></a></h3>
<hr>
        


<form  method="post" action="<?php echo base_url();?>purchase/edittodbb/<?php echo $segg;?>" >

<div class="panel-body" style="padding: 1px;">

  <div class="col-sm-2 ">
  <div class="form-group"><?=label("Purchase");?> <?=label("Number");?>
  <?php


 $ikmm=mysql_fetch_array(mysql_query("select id from purchases order by id desc "));


  $knn = $ikmm['id']+1;


  $vv=explode('-', $perr['purdat']);
  $ccv=$vv[2].'-'.$vv[1].'-'.$vv[0];

  ?>
     <input readonly="readonly"  class="form-control" type="text" name="prcno" id="prcno" value="<?php echo $perr['id'];?>">
  

</div>
</div>    

  

<div class="col-sm-2 ">
  <div class="form-group"><?=label("Purchase");?> <?=label("Date");?> 
  <input type="text" maxlength="30" Required="required"  value="<?php echo $ccv;?>" name="pddate" class="form-control" id="pddate" placeholder="<?=label("Date");?>">
     
  

</div>
</div> 


<div class="col-sm-2 ">
  <div class="form-group"><?=label("Purchase");?> <?=label("Type");?>  
     <select required="required" class="form-control" id="pptye" name="pptye" >
    <option <?php if($perr['purtpy']==0){ ?> selected="selected" <?php } ?> value="0"><?=label("Cash");?>  </option>
    <option <?php if($perr['purtpy']==1){ ?> selected="selected" <?php } ?> value="1"><?=label("CreditCard");?></option>
    <option  <?php if($perr['purtpy']==2){ ?> selected="selected" <?php } ?> value="2"><?=label("Cheque");?></option>

    
    </select>
  

</div>
</div> 





 





<div class="col-sm-2 ">
  <div class="form-group"><?=label("Suppliers");?>
    <select  required="required" class="form-control" id="supp" name="supp" >
    
    <?php

$mjm=mysql_query("select * from suppliers order by name asc ");
while($mjmf=mysql_fetch_array($mjm))
{
  ?>
    <option <?php if($perr['supplier_id']==$mjmf['id']){ ?> selected="selected" <?php } ?> value="<?php echo $mjmf['id'];?>" ><?php echo $mjmf['name'];?></option>
    <?php

}
    ?>
    
    </select>
  

</div>
</div>
</div>


<div class="panel-body" style="padding: 1px;">

<div class="col-sm-2 ">
  <div class="form-group"><?=label("Supplier");?> <?=label("Invoice");?> <?=label("Number");?>
     <input class="form-control" type="text" name="innvno" id="innvno" required="required" value="<?php echo $perr['invno'];?>">
  

</div>
</div> 


  <div class="col-sm-2 ">
  <div class="form-group"><?=label("Supplier");?> <?=label("Invoice");?> <?=label("Date");?>  
     <input class="form-control" type="text" name="innvdda" id="innvdda" value="<?php echo $perr['invdat'];?>">
  

</div>
</div>  

  <input class="form-control" type="hidden" name="innvamt" id="innvamt" value="<?php echo $perr['invamt'];?>">
  






 <div class="col-sm-12 ">
<div class="panel-body" style="padding: 0px;background-color: bisque;">



         <div style="text-align: center;" class="col-xs-2 table-header">
            <h7><?=label("Product");?></h7>
         </div>
         
         

         

         <div  class="col-xs-2 table-header">
            <h7><?=label("Purchase");?> <?=label("Price");?> </h7>

         </div>
         <?php 
         $lxzmm=mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        if($lxzmm['gst_tax']==1)
        {
          ?>
         <div style="text-align: center;text-align: center;" class="col-xs-1 table-header">
            <h7><?=label("tax");?></h7>
         </div>


        
         <?php 
         } 
         ?>
         <div style="text-align: center;padding: 0px 0px;"  style="text-align: center;" class="col-xs-1 table-header">
            <h7><?=label("Quantity");?></h7>
         </div>
        
         <div  class="col-xs-2 table-header">
            <h7><?=label("Selling");?> <?=label("Price");?> </h7>
         </div>

          <div   class="col-xs-2 table-header">
            <h7><?=label("Total");?> <?=label("Price");?> </h7>
         </div>
         
  


  <div id="add1" class="col-xs-12">
       
<div class="col-sm-2 " style="padding-right: 1px;padding-left: 1px;"><div class="form-group">
       <input onkeyup="return auromcv(this.value,this.id);" class="form-control" type='text' id='countryname_1m' '/>
       <input      class="form-control" type='hidden' id="statediv_1m"  />
        </div></div>    


<script type="text/javascript">

function barcodekar()
{
var producnum=$('#statediv_1m').val();
if(producnum=='')
{
  $('#countryname_1m').focus();
  return false;
}

var purrs=$('#cosst_1m').val();
if(purrs=='') { $('#cosst_1m').focus(); return false; }

var sellrs=$('#selling_1m').val();
if(sellrs=='') { $('#selling_1m').focus(); return false; }

var qqty=$('#qty_1m').val();
if(qqty=='' || qqty==0 || qqty=='0') { $('#qty_1m').focus(); return false; }

var cgstt=$('#cgst_1m').val();
var sgst=$('#sgst_1m').val();


var toto=$('#subtt_1m').val();
if(toto=='') { $('#subtt_1m').focus(); return false; }

var atorr=$('#totelemt').val();


var nj=atorr++;
   $.ajax({
         url : "<?php echo site_url('pos/load_pogoodpurrpp')?>/",
         type: "POST",
         data: {producnum: producnum,purrs: purrs,sellrs: sellrs,qqty: qqty,cgstt: cgstt,sgst: sgst,toto: toto},
         success: function(data)
         {
          
          $('#productListkar').html(data);
          

$('#statediv_1m').val('');
$('#countryname_1m').val('');
$('#cosst_1m').val('');
$('#selling_1m').val('');
$('#qty_1m').val('');

$('#cgst_1m').val('');
$('#sgst_1m').val('');
$('#subtt_1m').val('');

$('#totelemt').val(nj);
$('#countryname_1m').focus();


var amtt=0;
var totitem=0;
var cc1=0;
var ss1=0;
 var ttyt=document.getElementById('ll').value;
   var ss = ttyt.split(","); 
   for (var i in ss) 
   { 
 xt=ss[i];
  var elementExists = document.getElementById('subtt_'+xt);
 if(elementExists!=null)
  {
   var rssss=document.getElementById('subtt_'+xt).value;
   var xxz=document.getElementById('qty_'+xt).value;
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
$("#betot").val(amtt);
$("#innvamt").val(amtt);
$("#discct").val(totitem);
$("#cskgst").val(cc1);
$("#sskgst").val(ss1);
$("#afftot").val(flss1);


           
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

      

      <div style="padding-right: 1px;padding-left: 1px;"  class="col-sm-2 "><div class="form-group">
      <input readonly="readonly"     type="text" class="form-control" id="cosst_1m"  value="" placeholder="Cost"><br>
      
      </div></div>


     <?php
       if($lxzmm['gst_tax']==1)
      { ?>
      <div  style="padding-right: 1px;padding-left: 1px;" class="col-sm-1 "><div class="form-group">
      <input  style="padding: 0px 0px;" readonly="readonly" type="text" class="form-control" id="cgst_1m"  value="" placeholder="Cgst">
      </div></div>
      
      
      <input style="padding: 0px 0px;"  readonly="readonly" type="hidden" class="form-control" id="sgst_1m"  value="" placeholder="Sgst">
      
      
      
     <?php
     }
     else
     {
#4488c9;

     ?>

      
      <input  readonly="readonly" type="hidden" class="form-control" id="cgst_1m"  value="0" >
      
      
      
      <input  readonly="readonly" type="hidden" class="form-control" id="sgst_1m"  value="0" >
      

      <?php } ?>

      
<div  class="col-sm-1 " style="padding-right: 1px;padding-left: 1px;"><div class="form-group">

<input  style="padding: 0px 0px;"  type="text" onkeyup="return calstrip(this.value,this.id);"   class="form-control" id="qty_1m"   value="" placeholder="Quantity">

</div></div>
      
      
      <div  class="col-sm-2 " style="padding-right: 1px;padding-left: 1px;"><div class="form-group">
      <input readonly="readonly"   type="text" class="form-control" id="selling_1m"  value="" placeholder="Cost"><br>
      
      </div></div>
      
      <div class="col-sm-2 " style="padding-right: 1px;padding-left: 1px;"><div class="input-group">  
      <input  readonly="readonly" type="text" class="form-control" value="0"  id="subtt_1m"  value="" placeholder="Cost">
      <div class="input-group-btn">  
      <button class="btn btn-success" type="button" onclick="barcodekar();" > 
      <span class="glyphicon glyphicon-plus" aria-hidden="true"></span></button></div></div></div>  
       
</div>




</div>





</div>
</div>








<div class="panel panel-default">
  
  <div class="panel-heading"><?=label("Products");?> </div>
<div class="panel-body" style="padding: 1px;">



         <div style="text-align: center;" class="col-xs-2 table-header">
            <h7><?=label("Product");?></h7>
         </div>

         <div style="text-align: center;" class="col-xs-2 table-header">
            <h7><?=label("Purchase");?> <?=label("Price");?>  </h7>

         </div>
         <?php 
         $lxzmm=mysql_fetch_array(mysql_query("select * from settings where id=1 "));
        if($lxzmm['gst_tax']==1)
        {
          ?>
         <div style="text-align: center;text-align: center;" class="col-xs-1 table-header">
            <h7><?=label("tax");?></h7>
         </div>


         <?php 
         } 
         ?>
         <div style="text-align: center;" class="col-xs-1 table-header">
            <h7><?=label("Quantity");?></h7>
         </div> 
         <div style="width:120px;text-align: center;" class="col-xs-1 table-header">
            <h7><?=label("Selling");?> <?=label("Price");?> </h7>
         </div>

          <div  style="text-align: center;"class="col-xs-2 table-header">
            <h7><?=label("Total");?> <?=label("Price");?> </h7>
         </div>
         
  
  
  
      
<script  type="text/javascript" src="<?php echo base_url();?>assets/wildel/jquery-1.10.2.min.js"></script>
<script  type="text/javascript" src="<?php echo base_url();?>assets/wildel/jquery-ui-1.10.3.custom.min.js"></script>






<div id="productListkar">
          
        </div>



<input type="hidden" id="totelemt" name="totelemt"  value="<?php echo $kmx;?>" />

 <input type="hidden" id="countid" value="<?php echo $kmxv;?>">


<div id="education_fields">
          
        </div>




  <div class="col-sm-2 ">
  <div class="form-group">
    &nbsp;
  </div>
</div>
<div class="col-sm-2 ">
  <div class="form-group">
    &nbsp;
  </div>
</div>
<div class="col-sm-2 ">
  <div class="form-group">
    &nbsp;
  </div>
</div>
<div class="col-sm-1 ">
  <div class="form-group">
    &nbsp;
  </div>
</div>
<div class="col-sm-2 ">
 
        
      
  <div class="form-group" style="float: right;">
  <br><br>

    
  </div>
</div>






<div  class="col-xs-12" >
       
       <div class="col-sm-1 "></div>    

      <div class="col-sm-1 "></div>
       
      
     <?php
       if($lxzmm['gst_tax']==1)
      { ?>
      <div class="col-sm-1 "></div>
      
      
      
      
     <?php
     }
     ?>
<div style="width:120px;" class="col-sm-1 "><?=label("TotalItems");?> </div>
      <div class="col-sm-2 "><input readonly="readonly" type="text" class="form-control" id="discct" name="discct" value="" placeholder="Total">
</div>
      
      <div style="width:140px;" class="col-sm-1 "><?=label("Total");?> </div>
      
      <div class="col-sm-2 "><input readonly="readonly" type="text" class="form-control" id="betot" name="betot" value="<?php echo $perr['betot'];?>" placeholder="Total"></div>  
       
</div>



<?php
       if($lxzmm['gst_tax']==1)
      { ?>

<div  class="col-xs-12" >
       
       <div class="col-sm-1 "></div>    

      <div class="col-sm-2 "></div>
       
      <div style="width:120px;" class="col-sm-1 "></div>
     <?php
       if($lxzmm['gst_tax']==1)
      { ?>
      <div class="col-sm-1 "></div>
      
      
      
      
     <?php
     }
     ?>

      <div class="col-sm-1 ">
</div>
      
      <div style="width:140px;" class="col-sm-1 "><br><?=label("tax");?> <?=label("Amount");?></div>
      
      <div class="col-sm-2 "><br><input readonly="readonly" type="text" class="form-control" id="cskgst" name="cskgst" value="<?php echo $perr['cgst'];?>" placeholder="Total"></div>  
       
</div>


<div  class="col-xs-12" >
       
       <div class="col-sm-1 "></div>    

      <div class="col-sm-2 "></div>
       
      <div style="width:120px;" class="col-sm-1 "></div>
     <?php
       if($lxzmm['gst_tax']==1)
      { ?>
      <div class="col-sm-1 "></div>
      
      
      
      
     <?php
     }
     ?>

      <div class="col-sm-1 ">
</div>
      
      <div style="width:140px;" class="col-sm-1 ">
      </div>
      
      <div class="col-sm-2 ">
      <input readonly="readonly" type="hidden" class="form-control" id="sskgst" name="sskgst" value="<?php echo $perr['sgst'];?>" placeholder=""></div>  
       
</div>



<?php }
else
  { ?>

<input readonly="readonly" type="hidden" class="form-control" id="cskgst" name="cskgst" value="0" placeholder="Total">
<input readonly="readonly" type="hidden" class="form-control" id="sskgst" name="sskgst" value="0" placeholder="">

<?php

  } ?>

<div  class="col-xs-12" >
       
       <div class="col-sm-1 "></div>    

      <div class="col-sm-2 "></div>
       
      <div style="width:120px;" class="col-sm-1 "></div>
     <?php
       if($lxzmm['gst_tax']==1)
      { ?>
      <div class="col-sm-1 "></div>
      
      
      
      
     <?php
     }
     ?>

      <div class="col-sm-1 ">
</div>
      
      <div style="width:140px;" class="col-sm-1 "><br><?=label("Discount");?> <?=label("Amount");?></div>
      
      <div class="col-sm-2 "><br><input onkeyup="return callds(this.value,this.id);"  type="text" class="form-control" id="ddkst" name="ddkst" value="<?php echo $perr['discamt'];?>" placeholder=""></div>  
       
</div>


<div  class="col-xs-12" >
       
       <div class="col-sm-1 "></div>    

      <div class="col-sm-2 "></div>
       
      <div style="width:120px;" class="col-sm-1 "></div>
     <?php
       if($lxzmm['gst_tax']==1)
      { ?>
      <div class="col-sm-1 "></div>
      
      
      
      
     <?php
     }
     ?>

      <div class="col-sm-1 ">
</div>
      
      <div style="width:140px;" class="col-sm-1 "><br><?=label("Total");?></div>
      
      <div class="col-sm-2 "><br><input readonly="readonly" type="text" class="form-control" id="afftot" name="afftot" value="<?php echo $perr['total'];?>" placeholder="Total"></div>  
       
</div>




<div  class="col-xs-12" >
       
       <div class="col-sm-1 "></div>    

      <div class="col-sm-2 "></div>
       
      <div style="width:120px;" class="col-sm-1 "></div>
     <?php
       if($lxzmm['gst_tax']==1)
      { ?>
      <div class="col-sm-1 "></div>
      
      
      
      
     <?php
     }
     ?>

      <div class="col-sm-1 ">
</div>
      
      <div style="width:140px;" class="col-sm-1 "></div>
      
      <div class="col-sm-2 "><br><input onclick="return ckkkr();" type="Submit" class="form-control btn btn-green" id="aftot" name="Submit" value="<?=label("Submit");?>"   ></div>  
       
</div>



<div class="clear"></div>
  
  </div>

  <div class="panel-footer"><small><em><a href="javascript:void(0);"></a></em></em></small></div>
</div>





      </div>
   </div>
</div>
</form>





<script type="text/javascript">



$(document).ready(function() {
   $.ajax({
         url : "<?php echo site_url('pos/load_posalesmskpp')?>/",
         type: "POST",
         data: {producnum: 10},
         success: function(data)
         {
          
          $('#productListkar').html(data);
      
var amtt=0;
var totitem=0;
var cc1=0;
var ss1=0;
 var ttyt=document.getElementById('ll').value;
   var ss = ttyt.split(","); 
   for (var i in ss) 
   { 
 xt=ss[i];
  var elementExists = document.getElementById('subtt_'+xt);
 if(elementExists!=null)
  {
   var rssss=document.getElementById('subtt_'+xt).value;
   var xxz=document.getElementById('qty_'+xt).value;
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
$("#betot").val(amtt);
$("#innvamt").val(amtt);
$("#discct").val(totitem);
$("#cskgst").val(cc1);
$("#sskgst").val(ss1);
$("#afftot").val(flss1);


           
         },
         error: function (jqXHR, textStatus, errorThrown)
         {
            alert("error");
         }
     });

});

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
  });


 function auromcv(kk,mm)
    {

  var items = mm.split('_');
  var jjv=items[1];

    $('#countryname_'+jjv).autocomplete({
      

              source: function( request, response ) {
                $.ajax({
                  url : '<?php echo base_url();?>pos/searchitems2/',
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

                    $('#cosst_1m').val(names[3]);



            

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




































