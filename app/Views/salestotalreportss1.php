<style type="text/css">
        #cover {position: fixed; height: 100%; width: 100%; top:0; left: 0; background: transparent; z-index:9999; 
    font-size: 60px; text-align: center; padding-top: 200px; color: #fff;
}
</style>
<div id="cover" ><img id="loading-image" src="<?php echo base_url();?>assets/loader.gif" alt="Loading..." /></div>


<div class="container">
   <div class="row" style="margin-top:3px;">
   <h3><?=label("Sales");?> <?=label("Reports");?>    </h3>
   <hr>
   <div class="row rangeStat" style="margin-top:1px;">



      <div class="col-sm-2 ">
  <div class="form-group"><?=label("Customer");?>



 <select class="js-select-options form-control" id="supp" name="supp">
              <option value="">All</option>
              <option value="0"><?=label("WalkinCustomer");?></option>
              <?php foreach ($customers as $customer):?>
                 <option value="<?=$customer->id;?>"><?=$customer->name;?></option>
              <?php endforeach;?>
            </select>



     
  

</div>
</div>       


<div class="col-sm-1 " style="padding-left: 1px;width: 120px;">
  <div class="form-group"> <?=label("Fromdate");?>
  <input type="text" maxlength="30" Required="required"  value="<?php echo date("d-m-Y");?>" name="pddate" class="form-control" id="pddate" placeholder="from Date">
     
  

</div>
</div> 


  <div class="col-sm-1 " style="padding-left: 1px;width: 120px;">
  <div class="form-group"> <?=label("Tilldate");?>
     <input class="form-control" type="text" name="innvdda" id="innvdda" value="<?php echo date("d-m-Y");?>" placeholder="Till Date">
  

</div>
</div>  

<div class="col-sm-1 " style="padding-left: 1px;width: 120px;">
<div class="form-group"><?=label("Date");?> <?=label("Type");?>
<select class="js-select-options form-control" id="typeda" name="typeda">
<option value="1"><?=label("Daily");?></option>
<option value="2"><?=label("Monthly");?></option>
</select>
</div>
</div>  

<div class="col-sm-1 " style="padding-left: 1px;width: 120px;">
<div class="form-group"><?=label("Type");?>
<select class="js-select-options form-control" id="typess" name="typess">
<option value="1"><?=label("Detailed");?></option>
<option value="2"><?=label("Summary");?></option>

</select>
</div>
</div>       




      
     
      <div class="col-md-3">

           <a href="javascript:void(0);" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;"  class="btn btn-add hiddenpr" onclick="getProducttaxReport()" ><?=label('Get');?></a>

<a href="#" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;"  class="btn btn-add hiddenpr" onclick="PrintTicket()" >Print</a>
<a href="#" id="btnExport"   style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" >XLS</a>

<a href="#"  style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" onclick="pdfreceipt()">PDF</a>


      



   </div>


   </div>






 <div class="modal-body">
            <div id="printSection">
               <div id="custrrr">
    
  </div>
            </div>
         </div>
         


  


</div>


	<script>
function pdfreceipt()
{
 $('.hideme').show();
var content = $('#printSection').html();
$.redirect('<?php echo site_url('pos/pdfreceipt')?>/', { content: content });
 $('.hideme').hide();
}
 function PrintTicket() {
  
         $('.hideme').show();
         $('.modal-body').removeAttr('id');
          window.print();
         $('.hideme').hide();

       $('.modal-body').attr('id', 'modal-body');
    }
   /******* Range date picker *******/
   $(function() {
      $('input[name="daterange"]').daterangepicker();
      $('input[name="daterangeP"]').daterangepicker();
      $('input[name="daterangeR"]').daterangepicker();
      var d = new Date().getFullYear();
      $('#ProductRange').val('01/01/'+d+' - 12/31/'+d);
      $('#CustomerRange').val('01/01/'+d+' - 12/31/'+d);
      $('#RegisterRange').val('01/01/'+d+' - 12/31/'+d);

   });
   /************************ Chart Data *************************/
	
  

    
   function getProducttaxReport()
   {
      $("#cover").show();
      
      
      var Range = $('#pddate').val();
      var Range1 = $('#innvdda').val();
      var suppr = $('#supp').val();

      var typeda = $('#typeda').val();
      var typess = $('#typess').val();
      
     
     if(typeda==1 && typess==1)
     {

           // ajax set data to database
        $.ajax({
            url : "<?php echo site_url('reports/getsalesdailReport1')?>/",
            type: "POST",
            data: {Range: Range, Range1: Range1,suppr:suppr},
            success: function(data)
            {
              $("#cover").hide();
               $('#custrrr').html(data);
               $('.hideme').hide();
               $('#stats').modal('show');
               var table = $('#Table').DataTable( {
                   dom: 'T<"clear">lfrtip',
                   tableTools: {
                       'bProcessing'    : true
                    }
                 });
            },
            error: function (jqXHR, textStatus, errorThrown)
            {
               $("#cover").hide();
            }
       });
      } 
      else if(typeda==2 && typess==1)
     { 
        $.ajax({
            url : "<?php echo site_url('reports/getsalesdailReport')?>/",
            type: "POST",
            data: {Range: Range, Range1: Range1,suppr:suppr},
            success: function(data)
            {
              $("#cover").hide();
               $('#custrrr').html(data);
               $('.hideme').hide();
               $('#stats').modal('show');
               var table = $('#Table').DataTable( {
                   dom: 'T<"clear">lfrtip',
                   tableTools: {
                       'bProcessing'    : true
                    }
                 });
            },
            error: function (jqXHR, textStatus, errorThrown)
            {
               $("#cover").hide();
            }
       });
      }

      else if(typeda==1 && typess==2)
     { 
     
     
        $.ajax({
            url : "<?php echo site_url('reports/gettotalsalsReport')?>/",
            type: "POST",
            data: {Range: Range, Range1: Range1,suppr:suppr},
            success: function(data)
            {
              $("#cover").hide();
               $('#custrrr').html(data);
               $('.hideme').hide();
               $('#stats').modal('show');
               var table = $('#Table').DataTable( {
                   dom: 'T<"clear">lfrtip',
                   tableTools: {
                       'bProcessing'    : true
                    }
                 });
            },
            error: function (jqXHR, textStatus, errorThrown)
            {
              $("#cover").hide();
            }
       });
      } 
      else if(typeda==2 && typess==2)
     { 
     

        $.ajax({
            url : "<?php echo site_url('reports/gettalsalseport')?>/",
            type: "POST",
            data: {Range: Range, Range1: Range1,suppr:suppr},
            success: function(data)
            {
              $("#cover").hide();
               $('#custrrr').html(data);
               $('.hideme').hide();
               $('#stats').modal('show');
               var table = $('#Table').DataTable( {
                   dom: 'T<"clear">lfrtip',
                   tableTools: {
                       'bProcessing'    : true
                    }
                 });
            },
            error: function (jqXHR, textStatus, errorThrown)
            {
               $("#cover").hide();
            }
       });
      }

   }



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


<script src="<?php echo base_url();?>assets/new/jquery.btechco.excelexport.js"></script>
<script src="<?php echo base_url();?>assets/new/jquery.base64.js"></script>

<script>
    $(document).ready(function () {
        $("#btnExport").click(function () {
            $("#printSection").btechco_excelexport({
                containerid: "printSection" 
            });
        });
    });
</script>

<script type="text/javascript">
$(window).on('load', function() {
            
   $("#cover").hide();
});
</script>

