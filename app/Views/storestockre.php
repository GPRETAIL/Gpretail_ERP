<div class="container">
   
   <div class="row" style="margin-top:10px;">
   <h3><?=label("Closing");?> <?=label('Stock');?> <?=label('Reports');?> -<?=label('Warehouses');?>    </h3>
   <hr>

   


  <div class="row rangeStat" style="margin-top:10px;">
      
      <div class="col-md-2">
         <div class="form-group">
             <label for="customerSelect"><?=label('Warehouses');?></label>
               <select class="js-select-options form-control" id="StoresSelect">
               <option value="0">All</option>
                  <?php foreach ($Warehouses as $store):?>
                    <option value="<?=$store->id;?>"><?=$store->name;?></option>
                 <?php endforeach;?>
               </select>
         </div>
      </div>
      <div class="col-md-2">
            <div class="form-group">
                <label><?=label('Fromdate');?></label>
            <div class="input-group margin-bottom-sm">
               <span class="input-group-addon RangePicker"><i class="fa fa-calendar fa-fw" aria-hidden="true"></i></span>
               <input  class="form-control" id="pddate" type="text" value="<?php echo date("d-m-Y");?>" name="pddate" />
            </div>
         </div>
      </div> 

      <div class="col-md-2">
            <div class="form-group">
                <label><?=label('Tilldate');?></label>
            <div class="input-group margin-bottom-sm">
               <span class="input-group-addon RangePicker"><i class="fa fa-calendar fa-fw" aria-hidden="true"></i></span>
               <input  class="form-control" id="pddatet" type="text" value="<?php echo date("d-m-Y");?>" name="pddatet" />
            </div>
         </div>
      </div> 


      <div class="col-md-1">
            <div class="form-group">
                <label>Dispatch</label>
            <div class="input-group margin-bottom-sm" style="    display: contents;">
  <input  class="form-control" style="height: 19px;" id="ckkk" type="checkbox" name="ckkk" value="1" />
            </div>
         </div>
      </div>
      <div class="col-md-4">

       

     

     <a href="javascript:void(0);" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;"  class="btn btn-add hiddenpr" onclick="getRegisterReport()" ><?=label('GetReport');?></a>

<a href="#" style="padding: 7px;margin-top: 22px;margin-bottom: 0px;"  class="btn btn-add hiddenpr" onclick="PrintTicket()" >Print</a>
<a href="#" id="btnExport"   style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" >XLS</a>


<?php 
if($this->setting->show_pdf_or_not==1)
{ 
?>
<a href="#"  style="padding: 7px;margin-top: 22px;margin-bottom: 0px;" class="btn btn-add hiddenpr" onclick="pdfreceipt()">PDF</a> <?php 
} 
?>

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
		var randomScalingFactor = function(){ return Math.round(Math.random()*100)};
		var lineChartData = {
			labels : ["<?=label('January');?>","<?=label('February');?>","<?=label('March');?>","<?=label('April');?>","<?=label('May');?>","<?=label('June');?>","<?=label('July');?>","<?=label('August');?>","<?=label('September');?>","<?=label('October');?>","<?=label('November');?>","<?=label('December');?>"],
			datasets : [
            {
               label: "<?=label('Expences');?>",
               backgroundColor: "rgba(255,99,132,0.2)",
               borderColor: "rgba(255,99,132,1)",
               pointBackgroundColor: "rgba(255,99,132,1)",
               pointBorderColor: "#fff",
               pointHoverBackgroundColor: "#fff",
               pointHoverBorderColor: "rgba(255,99,132,1)",
               data: [<?=$monthlyExp[0]->january;?>,<?=$monthlyExp[0]->feburary;?>,<?=$monthlyExp[0]->march;?>,<?=$monthlyExp[0]->april;?>,<?=$monthlyExp[0]->may;?>,<?=$monthlyExp[0]->june;?>,<?=$monthlyExp[0]->july;?>,<?=$monthlyExp[0]->august;?>,<?=$monthlyExp[0]->september;?>,<?=$monthlyExp[0]->october;?>,<?=$monthlyExp[0]->november;?>,<?=$monthlyExp[0]->december;?>]
            },
				{
					label: "<?=label('Revenue');?>",
					backgroundColor : "#34495e",
					borderColor : "#2c3e50",
					pointBackgroundColor : "#34495e",
					pointBorderColor : "#fff",
					pointHoverBackgroundColor : "#fff",
					pointHoverBorderColor : "#2c3e50",
					data : [<?=$monthly[0]->january;?>,<?=$monthly[0]->feburary;?>,<?=$monthly[0]->march;?>,<?=$monthly[0]->april;?>,<?=$monthly[0]->may;?>,<?=$monthly[0]->june;?>,<?=$monthly[0]->july;?>,<?=$monthly[0]->august;?>,<?=$monthly[0]->september;?>,<?=$monthly[0]->october;?>,<?=$monthly[0]->november;?>,<?=$monthly[0]->december;?>]
				}
			]
		}
	window.onload = function(){

      // Chart.defaults.global.gridLines.display = false;

		var ctx = document.getElementById("canvas").getContext("2d");
		window.myLine = new Chart(ctx, {
    type: 'line',
    data: lineChartData,
    options: {
         scales : {
           xAxes : [ {
                   gridLines : {
                      display : false
                   }
              } ],
           yAxes : [ {
                   gridLines : {
                      display : false
                   }
              } ]
          },
         scaleFontSize: 9,
         tooltipFillColor: "rgba(0, 0, 0, 0.71)",
         tooltipFontSize: 10,
			responsive: true
		}});

      /********************* pie **********************/
      <?php if(count($Top5product) >=5){ ?>


      var pieData =  {
          labels: [
            "<?=$Top5product[0]->name;?>",
            "<?=$Top5product[1]->name;?>",
            "<?=$Top5product[2]->name;?>",
            "<?=$Top5product[3]->name;?>",
            "<?=$Top5product[4]->name;?>"
          ],
          datasets: [
           {
               data: [<?=$Top5product[0]->totalquantity;?>, <?=$Top5product[1]->totalquantity;?>, <?=$Top5product[2]->totalquantity;?>, <?=$Top5product[3]->totalquantity;?>, <?=$Top5product[4]->totalquantity;?>],
               backgroundColor: [
                   "#34495E",
                   "#7f8c8d",
                   "#ECF0F1",
                   "#3498DB",
                   "#1ABC9C"
               ],
               hoverBackgroundColor: [
                   "#3e5367",
                   "#95a5a6",
                   "#f5fbfc",
                   "#459eda",
                   "#2dc6a8"
               ]
            }
         ]
      };

      Chart.defaults.global.legend.display = false;

      var ctx2 = document.getElementById("chart-area2").getContext("2d");
      window.myPie = new Chart(ctx2,{
             type: 'pie',
             data: pieData});
      <?php } ?>
	}


   /********************************** Get repports functions ************************************/

  

                  

             
     $(document).ready(function() {

  $('#pddate').datepicker({
      todayHighlight: true,
      autoclose:true
  }); $('#pddatet').datepicker({
      todayHighlight: true,
      autoclose:true
  });


  });

              
               function getRegisterReport()
   {
      var store_id = $('#StoresSelect').find('option:selected').val();
      var Range = $('#pddate').val();
      var Range1 = $('#pddatet').val();
      if(Range=='')
      {
        alert("Please Select Range ");
        return false;
      } if(Range1=='')
      {
        alert("Please Select Range ");
        return false;
      }
      

     var ckkk= document.getElementById("ckkk").checked ;
      

      
      var start = Range.slice(6,10)+'-'+Range.slice(3,5)+'-'+Range.slice(0,2);
      var endd = Range1.slice(6,10)+'-'+Range1.slice(3,5)+'-'+Range1.slice(0,2);
    
           // ajax set data to database
        $.ajax({
            url : "<?php echo site_url('reports/getRegisterReportstore')?>/",
            type: "POST",
            data: {store_id: store_id, start: start,ckkk:ckkk,endd:endd },
            success: function(data)
            {

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
               alert("error");
            }
       });
   }


   function RegisterDetails(id) {
      $.ajax({
         url : "<?php echo site_url('reports/RegisterDetails')?>/"+id,
         type: "POST",
         success: function(data)
         {
            $('#RegisterDetails').html(data);
            $('#stats').modal('hide');
            $('#RegisterDetail').modal('show');
         },
         error: function (jqXHR, textStatus, errorThrown)
         {
             alert("error");
         }
      });
   }


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
