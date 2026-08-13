<!-- Page Content -->
<div class="container">
   <div class="row" style="margin-top:10px;">
      <div class="col-md-12">
         <!-- tab navigation -->
         <?php $tab = (isset($_GET['tab'])) ? $_GET['tab'] : null; ?>




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

var warrvv=document.getElementById('warr').value;

var strURL="<?php echo base_url();?>purchase/findcctnqqty?country="+countryId+"&warr="+warrvv;
        var req = getXMLHTTP();
        if (req) {
            req.onreadystatechange = function() 
            {
                if (req.readyState == 4) 
                {
                    if (req.status == 200) 
                    {    
                    var data = req.responseText;
                    $('#cosst_'+jjv).val(data);
                    
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
url: "<?php  echo base_url(); ?>production/addrowphy",
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

 $('#add'+rid).remove();
    

     
     var amtt=0;
var ttcgst=0;
var ttsgst=0;
var totitem=0;


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
$("#discct").val(totitem);
$("#cskgst").val(cc1);
$("#sskgst").val(ss1);
$("#afftot").val(flss1);









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
   var kmxx=parseFloat(rssss)- parseFloat(qqty);
   if(kmxx>0)
   {
  
   $("#subtt_"+jj).val(kmxx);
 }
 else
 {
   $("#qty_"+jj).val(0);
   $("#subtt_"+jj).val(rssss);
 }
   

var totitem=0;



   var ttyt=document.getElementById('totelemt').value;
   
for(var xt=1;xt<=ttyt;xt++)
{
  var elementExists = document.getElementById('qty_'+xt);


  if(elementExists!=null)
  {
     
     var xxz=document.getElementById('qty_'+xt).value;

  totitem=parseFloat(xxz)+parseFloat(totitem);

  
  }
}


$("#discct").val(totitem);


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

<h3><?=label('Add');?> <?=label('Production');?>  <a style="float: right;" class="btn btn-primary btn-red" href="<?php echo base_url();?>physicalstock"  ><?=label('Back');?></a></h3>
<hr>
        <input type="hidden" id="countid" value="1">


<form  method="post" action="<?php echo base_url();?>production/addtodbbprodu" >

<div class="panel-body">

  <div class="col-sm-2 ">
  <div class="form-group">&nbsp;&nbsp;<?=label('Voucher');?>  <?=label('Number');?> 
  <?php
 $ikmm=mysql_fetch_array(mysql_query("select id from physivcal_stock order by id desc "));
  $knn = $ikmm['id']+1;
  ?>
     <input readonly="readonly"  class="form-control" type="text" name="prcno" id="prcno" value="<?php echo $knn;?>">
  

</div>
</div>    

  

<div class="col-sm-2 ">
  <div class="form-group">&nbsp;&nbsp;<?=label('Date');?>
  <input type="text" maxlength="30" Required="required"  value="<?php echo date("d-m-Y");?>" name="pddate" class="form-control" id="pddate" placeholder="<?=label("Date");?>">
</div>
</div> 


<div class="col-sm-2 ">
  <div class="form-group">&nbsp;&nbsp;<?=label('Store');?>
     <select required="required" class="form-control" id="warr" name="warr" >
    
<?php
$mjm=mysql_query("select * from stores order by name asc ");
while($mjmf=mysql_fetch_array($mjm))
{
   ?>
    <option value="<?php echo $mjmf['id'];?>" ><?php echo $mjmf['name'];?></option>
   <?php
}
?>
    
    </select>
  

</div>
</div> 
</div>
<input type="hidden" id="totelemt" name="totelemt"  value="1" />

<div class="panel panel-default">
  
  <div class="panel-heading"><?=label('Products');?>  </div>
  <div class="panel-body">




         <div style="text-align: center;" class="col-xs-3 table-header">
            <h7><?=label('Product');?></h7>
         </div>

         <div style="text-align: center;" class="col-xs-2 table-header">
            <h7>Avl Qty</h7>

         </div>

          <div style="text-align: center;" class="col-xs-2 table-header">
            <h7><?=label('Product');?></h7>
         </div>

         
         <div style="text-align: center;" class="col-xs-1 table-header">
            <h7><?=label('Qty');?></h7>
         </div> 
       

  <div id="add1" class="col-xs-12">
       <div class="col-sm-3 "><div class="form-group">
       <select class="js-select-options form-control" id="statediv_1" name="statediv[]" onchange="getdetals(this.value,this.id)">
       <option value="0">Select</option>
        <?php
          $kmk=mysql_query("select * from products order by name asc ");
          while($kmkf=mysql_fetch_object($kmk))
          {?>
        <option value="<?=$kmkf->id;?>"><?=$kmkf->name;?></option>
        <?php } ?>
       </select></div></div>
       
<div   class="col-sm-2 ">
<div class="form-group">
<input readonly="readonly" type="text" class="form-control" id="cosst_1" name="cosst[]" value="" placeholder="">
</div>
</div>

<div class="col-sm-2 "><div class="form-group">
       <select class="js-select-options form-control" id="statetab_1" name="statetab[]" >
       <option value="0">Select</option>
        <?php
          $kmk=mysql_query("select * from products order by name asc ");
          while($kmkf=mysql_fetch_object($kmk))
          {?>
        <option value="<?=$kmkf->id;?>"><?=$kmkf->name;?></option>
        <?php } ?>
       </select></div></div>

    

   

      
     

      
      <div class="col-sm-2 "><div class="input-group">  

     <input type="text" onkeyup="return callcc(this.value,this.id);"  required="required" class="form-control" id="qty_1" name="qty[]"   value="" placeholder="Quantity">
      <div class="input-group-btn">  
      <button class="btn btn-danger" type="button" > 
      <span class="glyphicon glyphicon-minus" aria-hidden="true"></span></button></div></div></div>  
       
</div>

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

<button id="addMoreRows" style="margin: 0px 0px 0px 14px;"  class="btn btn-success" type="button"  onclick="education_fields();"> <span class="glyphicon glyphicon-plus" aria-hidden="true"></span> </button>



<div  class="col-xs-12" >
       
       <div class="col-sm-2 "></div>    

      <div class="col-sm-1 "></div>
       
      
  
<div style="width:120px;" class="col-sm-1 "><?=label('TotalItems');?></div>
      <div class="col-sm-2 "><input readonly="readonly" type="text" class="form-control" id="discct" name="discct" value="" placeholder="Total">
</div>
      
      <div style="width:140px;" class="col-sm-1 "></div>
      
      <div class="col-sm-2 "></div>  
       
</div>




<div  class="col-xs-12" >
       
       <div class="col-sm-2 "></div>    

      <div class="col-sm-2 "></div>
       
      <div style="width:120px;" class="col-sm-1 "></div>
  

      <div class="col-sm-1 ">
</div>
      
      <div style="width:140px;" class="col-sm-1 "></div>
      
      <div class="col-sm-2 "><br><input onclick="return ckkkr();" type="Submit" class="form-control btn btn-green" id="aftot" name="Submit" value="<?=label('Submit');?>"   ></div>  
       
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

</script>