<?php 
$count=$_POST['countid'];
$lxzmm=mysql_fetch_array(mysql_query("select * from settings where id=1 "));
?>

<div id="add<?php echo $count;?>" class="col-xs-12" >
       
       <div class="col-sm-2 "><div class="form-group">
        <select onchange="getState(this.value,this.id)" class="js-select-options form-control" name="customerSelect[]" id="customerSelect_<?php echo $count;?>">
        <option value="0">Select</option>
        <?php
          $kmk=mysql_query("select * from brand order by name asc ");
          while($kmkf=mysql_fetch_object($kmk))
          {?>
        <option value="<?=$kmkf->id;?>"><?=$kmkf->name;?></option>
        <?php } ?>
        </select>
        </div></div>    

      <div class="col-sm-2 "><div class="form-group">
       <select class="js-select-options form-control" id="statediv_<?php echo $count;?>" name="statediv[]" onchange="getdetals(this.value,this.id);getStatebrd(this.value,this.id);">
       <option value="0">Select Product </option>
        <?php
          $kmkg=mysql_query("select * from products order by name asc ");
          while($kmkgh=mysql_fetch_object($kmkg))
          {?>
        <option value="<?=$kmkgh->id;?>">&nbsp;&nbsp;&nbsp;<?=$kmkgh->name;?></option>
        <?php } ?>
       </select></div></div>
       
      <div style="width:120px;" class="col-sm-1 "><div class="form-group">
      <input readonly="readonly" type="text" class="form-control" id="cosst_<?php echo $count;?>" name="cosst[]" value="" placeholder="Cost"></div></div>
     <?php
       if($lxzmm['gst_tax']==1)
      { ?>
      <div class="col-sm-1 "><div class="form-group">
      <input  readonly="readonly" type="text" class="form-control" id="cgst_<?php echo $count;?>" name="cgst[]" value="" placeholder="Cgst">
      <input  readonly="readonly" type="hidden" class="form-control" id="ttcgst_<?php echo $count;?>" name="ttcgst[]" value="0" placeholder="Cgst"></div></div>
      
      <div class="col-sm-1 "><div class="form-group">
      <input  readonly="readonly" type="text" class="form-control" id="sgst_<?php echo $count;?>" name="sgst[]" value="" placeholder="Sgst">
      <input  readonly="readonly" type="hidden" class="form-control" id="ttsgst_<?php echo $count;?>" name="ttsgst[]" value="0" placeholder="Sgst"></div></div>
      
      
     <?php
     }
     else
     {


     ?>
      
      <input  readonly="readonly" type="hidden" class="form-control" id="cgst_<?php echo $count;?>" name="cgst[]" value="" placeholder="Cgst">
      <input  readonly="readonly" type="hidden" class="form-control" id="ttcgst_<?php echo $count;?>" name="ttcgst[]" value="0" placeholder="Cgst">
      
      
      <input  readonly="readonly" type="hidden" class="form-control" id="sgst_<?php echo $count;?>" name="sgst[]" value="" placeholder="Sgst">
      <input  readonly="readonly" type="hidden" class="form-control" id="ttsgst_<?php echo $count;?>" name="ttsgst[]" value="0" placeholder="Sgst">
      <?php } ?>

      <div class="col-sm-1 "><div class="form-group">
      <input type="text" onkeyup="return callcc(this.value,this.id);"  required="required" class="form-control" id="qty_<?php echo $count;?>" name="qty[]"   value="" placeholder="Quantity"></div></div>
      
      <div style="width:140px;" class="col-sm-1 "><div class="form-group">
      <input style="width:120px;" readonly="readonly" type="text" class="form-control" id="selling_<?php echo $count;?>" name="selling[]" value="" placeholder="Cost"></div></div>
      
      <div class="col-sm-2 "><div class="input-group">  
      <input value="0" readonly="readonly" type="text" class="form-control" id="subtt_<?php echo $count;?>" name="subtt[]" value="" placeholder="Cost">
      <div class="input-group-btn"> 

      <button class="btn btn-danger" type="button" onclick="remove_education_fields(<?php echo $count;?>);" > 
      <span class="glyphicon glyphicon-minus"  aria-hidden="true"></span></button></div></div></div>  
       
</div>



    <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
<style>
	.delRowBtn{
		position: relative;
		top: 0px;
	}
	
</style>
  <script>
   $(function(){
   $("#product").click(function(event) {
	   //alert('dfgdfgdf');
	   var aaa = $("#prob_cat_name<?php echo $count; ?>").val();

  
  if ( $("#prob_cat_name<?php echo $count; ?>").val() === "" ) {
	$("#prob_cat_name_error<?php echo $count; ?>").text( "Field cannot be empty" ).show();
    event.preventDefault();
  }
   if ($("#model<?php echo $count; ?>").val() === "" ) {
	$("#model_error<?php echo $count; ?>").text( "Field cannot be empty" ).show();
    event.preventDefault();
  }
  
     if ($("#prob_code<?php echo $count; ?>").val() === "" ) {
	$("#prob_code_error<?php echo $count; ?>").text( "Field cannot be empty" ).show();
    event.preventDefault();
  }
  

	});
	});
</script>
<script>
    $(function(){
		
		$("#prob_cat_name<?php echo $count; ?>").change(function(){
			if($(this).val()==""){
			    $("#prob_cat_name_error<?php echo $count; ?>").show();
			}
			else{
				$("#prob_cat_name_error<?php echo $count; ?>").hide();
			}
		});

		$("#model<?php echo $count; ?>").change(function(){
			var aaa = $(this).val();
			if($(this).val()==""){
			    $("#model_error<?php echo $count; ?>").show();
			}
			else{
				$("#model_error<?php echo $count; ?>").hide();
			}
		});
		
		$("#prob_code<?php echo $count; ?>").keyup(function(){
			if($(this).val()==""){
			    $("#prob_code_error<?php echo $count; ?>").show();
			}
			else{
				$("#prob_code_error<?php echo $count; ?>").hide();
			}
		});
		
		
	});
</script>

<script>
$(document).ready(function(){
$('#prob_code<?php echo $count; ?>').change(function(){
var prob_code=$(this).val();	 
var datastring='code='+prob_code;
    $.ajax({
    type:"POST",
    url:"<?php echo base_url(); ?>problemcategory/checkCode",
        data:datastring,
        cache:false,
        success:function(data){
			//alert(data);
        if(data >0){
            $('#name_error<?php echo $count; ?>').html('Problem Code already Exist!').show(); 
			$('#prob_code<?php echo $count; ?>').val('');
        }

		else if(data==0)
		{
			$('#name_error<?php echo $count; ?>').hide(); 
			
		}
		
        
        }
    });
 });
});
</script> 
<?php
exit;?>

  

  
  
  
