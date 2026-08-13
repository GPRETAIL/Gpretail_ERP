<?php 
$count=$_POST['countid'];
$lxzmm=mysql_fetch_array(mysql_query("select * from settings where id=1 "));
?>


<div id="add<?php echo $count;?>" class="col-xs-12" >
       
    


      <div class="col-sm-3 "><div class="form-group">
       <select class="js-select-options form-control" id="statediv_<?php echo $count;?>" name="statediv[]" onchange="getdetals(this.value,this.id)">
          <?php
          $kmk=mysql_query("select * from products order by name asc ");
          while($kmkf=mysql_fetch_object($kmk))
          {?>
        <option value="<?=$kmkf->id;?>"><?=$kmkf->name;?></option>
        <?php } ?>
       </select></div></div>
       
      <div class="col-sm-2 "><div class="form-group">
      <input readonly="readonly" type="text" class="form-control" id="cosst_<?php echo $count;?>" name="cosst[]" value="" placeholder=""></div></div>



      <div class="col-sm-2 "><div class="form-group">
       <select class="js-select-options form-control" id="statetab_<?php echo $count;?>" name="statetab[]" >
       <option value="0">Select</option>
        <?php
          $kmk=mysql_query("select * from products order by name asc ");
          while($kmkf=mysql_fetch_object($kmk))
          {?>
        <option value="<?=$kmkf->id;?>"><?=$kmkf->name;?></option>
        <?php } ?>
       </select></div></div>

   
      <div class="col-sm-2 "><div class="input-group">  
     <input type="text" onkeyup="return callcc(this.value,this.id);"  required="required" class="form-control" id="qty_<?php echo $count;?>" name="qty[]"   value="" placeholder="Quantity">
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

  

  
  
  
