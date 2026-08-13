<div class="container">
   
   <div class="row" style="margin-top:3px;">
   <h3><?=label("Credit");?> <?=label("Status");?>   </h3>
   <hr>
   <div class="row rangeStat">
      
      <div class="col-md-2">
         <div class="form-group">
             <label for="customerSelect"><?=label('Customer');?></label>
               <select class="js-select-options form-control" id="customerSelect">
                  
                  <option value="">All</option>
                  <option value=""><?=label("WalkinCustomer");?></option>
                 <?php foreach ($customers as $customer):?>
                    <option value="<?=$customer->id;?>"><?=$customer->name;?></option>
                 <?php endforeach;?>
               </select>
         </div>
      </div>


      <div class="col-md-2">
         <div class="form-group">
             <label for="customerSelect"><?=label('User');?></label>
              
              <select class="js-select-options form-control" id="sssSelect">
              <option value="">All</option>
              <?php 
              while ($ssalf=mysql_fetch_array($ssal)) 
              { ?>
                 <option  value="<?php echo $ssalf['id'];?>">
                 <?php echo  $ssalf['firstname'].' - '.$ssalf['lastname'];?></option>
              <?php } ?>
            </select>

         </div>
      </div>

      <div class="col-md-3">
            <div class="form-group">
                <label><?=label('SelectRange');?></label>
            <div class="input-group margin-bottom-sm">
               <span class="input-group-addon RangePicker"><i class="fa fa-calendar fa-fw" aria-hidden="true"></i></span>
               <input class="form-control" id="CustomerRange" type="text" name="daterange" />
            </div>
         </div>
      </div>
      <div class="col-md-2">
         <button  class="cancelBtn btn btn-picker" type="button" onclick="getCustomerReport()"><?=label('GetReport');?></button>
      </div>
           <br><div class="col-md-3" style="margin-top:8px;">
<a href="#" style="display: inline;padding: 7px;"  class="btn btn-add hiddenpr" onclick="PrintTicket()" >Print</a>
<a href="#" id="btnExport"   style="display: inline;padding: 7px;" class="btn btn-add hiddenpr" >XLS</a>

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



  <!-- Modal ticket -->
  <div class="modal fade" id="ticket" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
   <div class="modal-dialog" role="document" id="ticket" style="width:500px;">
      <div class="modal-content">
        <div class="modal-header">
          <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
          <h4 class="modal-title" id="ticket"><?=label("Details");?></h4>
        </div>
        <div class="modal-body" id="modal-body" >
           <div id="printSectionk">
              <!-- Ticket goes here -->
              <center><h1 style="color:#34495E"><?=label("empty");?></h1></center>
           </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-default hiddenpr" data-dismiss="modal"><?=label("Close");?></button>
          
          
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
function PrintTicket() 
{
        $('.hideme').show();
         $('.modal-body').removeAttr('id');
          window.print();
         $('.hideme').hide();

       $('.modal-body').attr('id', 'modal-body');
}
   $(function() {
      $('input[name="daterange"]').daterangepicker();
      $('input[name="daterangeP"]').daterangepicker();
      $('input[name="daterangeR"]').daterangepicker();
      var d = new Date().getFullYear();
      $('#ProductRange').val('01-01-'+d+' - 31-12-'+d);
      $('#CustomerRange').val('01-01-'+d+' - 31-12-'+d);
      $('#RegisterRange').val('01-01-'+d+' - 31-12-'+d);

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
   function getCustomerReport()
   {
      var client_id = $('#customerSelect').find('option:selected').val();
      var sssSelect = $('#sssSelect').find('option:selected').val();
      var Range = $('#CustomerRange').val();
      //mmddyyy
      //yyyymmdd
      var start = Range.slice(6,10)+'-'+Range.slice(3,5)+'-'+Range.slice(0,2);
      var end = Range.slice(19,23)+'-'+Range.slice(16,18)+'-'+Range.slice(13,15);
           // ajax delete data to database
           $.ajax({
               url : "<?php echo site_url('reports/getCustomercredit')?>/",
               type: "POST",
               data: {sssSelect: sssSelect,client_id: client_id, start: start, end: end},
               success: function(data)
               {

                  $('#custrrr').html(data);
                  $('.hideme').hide();

                 
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


    function showTicket4(id)
    {


      $.ajax({
          url : "<?php echo site_url('invoices/ShowTicketk')?>/"+id,
          type: "POST",
          success: function(data)
          {
            
              $('#printSectionk').html(data);
              $('#ticket').modal('show');
          },
          error: function (jqXHR, textStatus, errorThrown)
          {
             alert("error");
          }
     });
    };  

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
