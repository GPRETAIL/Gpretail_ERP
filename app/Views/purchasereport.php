<div class="container">
   <div class="row" style="margin-top:3px;">
   <h3><?=label('Purchase');?> <?=label('Reports');?>  </h3>
   <hr>
   <div class="row rangeStat" style="margin-top:1px;">
      <div class="col-md-2">
         <div class="form-group">
             <label for="customerSelect"><?=label('Warehouses');?>  </label>
               <select class="js-select-options form-control" id="waree">
               <option value="">Select</option>
               <option value="0">All</option>

                 <?php
$mjm=mysql_query("select * from warehouses order by name asc ");
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
       <div class="col-md-2">
         <div class="form-group">
             <label for="customerSelect"><?=label('Supplier');?> </label>
               <select class="js-select-options form-control" id="suppr">
               <option value="">Select</option>
               <option value="0">All</option>
   <?php $mjm=mysql_query("select * from suppliers order by name asc ");
   while($mjmf=mysql_fetch_array($mjm))
   {  ?>
   <option value="<?php echo $mjmf['id'];?>" ><?php echo $mjmf['name'];?></option>
   <?php } ?>
               </select>
         </div>
      </div>

       <div class="col-md-2">
         <div class="form-group">
             <label for="customerSelect"><?=label('Products');?></label>
               <select class="js-select-options form-control" id="productSelect">
               <option value="0">All</option>
                  <?php foreach ($Products as $product):?>
                    <option value="<?=$product->id;?>"><?=$product->name;?></option>
                 <?php endforeach;?>
               </select>
         </div>
      </div>

      <div class="col-md-2">
            <div class="form-group">
                <label><?=label('SelectRange');?></label>
            <div class="input-group margin-bottom-sm">
               <span class="input-group-addon RangePicker"><i class="fa fa-calendar fa-fw" aria-hidden="true"></i></span>
               <input class="form-control" id="ProductRange" type="text" name="daterangeP" />
            </div>
         </div>
      </div>
      <div class="col-md-2">
         <button class="cancelBtn btn btn-picker" type="button" onclick="getProducttaxReport()"><?=label('GetReport');?></button>
      </div>

       <br>
       <div class="col-md-2"  style="margin-top:10px;">
<a href="#" style="display: inline;padding: 7px;"  class="btn btn-add hiddenpr" onclick="PrintTicket()" >Print</a>
<a href="#"  style="display: inline;padding: 7px;" class="btn btn-add hiddenpr" onClick ="$('#custrrr').tableExport({type:'excel',escape:'false'});">XLS</a>
<a href="#"  style="display: inline;padding: 7px;" class="btn btn-add hiddenpr" onclick="pdfreceipt()">PDF</a>
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
    function pdfreceipt(){


   var content = $('#printSection').html();
   $.redirect('<?php echo site_url('pos/pdfreceipt')?>/', { content: content });

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

  

                  

             
   function getProducttaxReport()
   {
      var product_id = $('#productSelect').find('option:selected').val();
      var waridd = $('#waree').find('option:selected').val();
      var suppid = $('#suppr').find('option:selected').val();
      var Range = $('#ProductRange').val();
      var start = Range.slice(6,10)+'-'+Range.slice(0,2)+'-'+Range.slice(3,5);
      var end = Range.slice(19,23)+'-'+Range.slice(13,15)+'-'+Range.slice(16,18);
           // ajax set data to database
        $.ajax({
            url : "<?php echo site_url('reports/getpurchaseReport')?>/",
            type: "POST",
            data: {product_id: product_id, start: start, end: end,waridd:waridd,suppid:suppid},
            success: function(data)
            {
               $('#custrrr').html(data);
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

 function PrintTicket() {
       $('.modal-body').removeAttr('id');
       window.print();
       $('.modal-body').attr('id', 'modal-body');
    }

	</script>

    <script type="text/javascript" src="<?php echo base_url();?>assets/js/exxpert/tableExport.js"></script>
  <script type="text/javascript" src="<?php echo base_url();?>assets/js/exxpert/jquery.base64.js"></script>
  <script type="text/javascript" src="<?php echo base_url();?>assets/js/exxpert/html2canvas.js"></script>
  <script type="text/javascript" src="<?php echo base_url();?>assets/js/exxpert/sprintf.js"></script>
  <script type="text/javascript" src="<?php echo base_url();?>assets/js/exxpert/jspdf.js"></script>
  <script type="text/javascript" src="<?php echo base_url();?>assets/js/exxpert/base64.js"></script>
