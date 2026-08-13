<?php 
$count=$_POST['countid_exp'];
$lxzmm=mysql_fetch_array(mysql_query("select * from settings where id=1 "));
?>

<?php
$mm=mysql_query("select id from  products order by id desc  LIMIT 1  ");
$mmf=mysql_fetch_array($mm);
$jj=@$mmf['id']+1+$count;
?>

<div id="add<?php echo $count;?>" class="col-xs-12" style="padding-left: 3px;margin-top:10px;">


<div class="col-sm-2">
<div class="form-group">

<select class="form-control" name="warehouse[]" id="warehouse_<?php echo $count;?>"  >
<?php 
$mkxcc=mysql_query("select * from   warehouses order by name asc   ");
while($mkxccf=mysql_fetch_object($mkxcc))
{ 
?>
<option value="<?=$mkxccf->id;?>"><?=$mkxccf->name;?></option>
<?php 
} ?>
</select>
</div>
</div> 




<div class="col-sm-2">
<div class="form-group">

<select class="form-control" name="brand[]" id="brand_<?php echo $count;?>"   onchange="ger_subcatmmkk(this.value,this.id,<?php echo $count;?>);" >
<option value="0">select</option>
<?php 
$mkxcc=mysql_query("select * from   brand order by name   ");
while($mkxccf=mysql_fetch_object($mkxcc))
{ ?>
<option value="<?=$mkxccf->id;?>"><?=$mkxccf->name;?></option>
<?php 
} ?>
</select>
</div>
</div> 




<div class="col-sm-3">
<div class="form-group">

<select class="form-control" name="dishname[]" id="dishname_<?php echo $count;?>" onchange="alqtcheck(this.value,this.id,<?php echo $count;?>);"  >
<option value="0">Select</option>
</select>
</div>
</div> 

<div class="col-sm-2">
<div class="form-group">

<input type="text"  readonly  name="avlqty[]" class="form-control" id="avlqty_<?php echo $count;?>" />
</div>
</div> 

<div class="col-sm-2">
<div class="form-group">

<input type="text" step="any"  name="transty[]" class="form-control" id="transty_<?php echo $count;?>"  />
</div>
</div> 

 
 

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

  

  
  
  
