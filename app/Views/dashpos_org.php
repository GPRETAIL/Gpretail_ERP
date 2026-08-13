  <div class="container">



    <?php


$arr=array();


$ddat=date("Y-m-d");
$from_date=date("Y-m-d",strtotime('-30 day', strtotime($ddat)));
$till_date=date("Y-m-d",strtotime($ddat));



$arrv=array("Days","Sales","Purchase");
array_push($arr, $arrv);
while (strtotime($from_date) <= strtotime($till_date)) 
{
$sal_count=mysql_fetch_array(mysql_query("SELECT SUM(total) as count,created_at FROM sales where created_at='".$from_date."' GROUP BY created_at ORDER BY created_at"));
$pur_count=mysql_fetch_array(mysql_query("SELECT SUM(total) as count,date FROM purchases where date='".$from_date."' GROUP BY date ORDER BY date"));

$date_for=date("d-m-Y",strtotime($from_date));



$point1=array($date_for,intval($sal_count['count']),intval($pur_count['count']));




array_push($arr, $point1);
$from_date = date ("Y-m-d", strtotime("+1 day", strtotime($from_date)));

}




$kmk= json_encode($arr);



  $rolr=$this->user->role;
$kkar=mysql_fetch_array(mysql_query("select * from permission_new where nname='".$rolr."'  "));
?>
<style type="text/css">
  table ,tr td{
    
}
tbody {
    display:block;
    height:300px;
    overflow:auto;
}
thead, tbody tr {
    display:table;
    width:100%;
    table-layout:fixed;
}
thead {
    width: calc( 100% - 1em )
}
table {
    width:400px;
}

</style>
   <h3><?=label('Dashboard');?> </h3>
   <hr>

     <h4><?=label('TodaySale');?> and <?=label('Purchase');?></h4>


   <html>
  <head>
    <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
    <script type="text/javascript">
      google.charts.load('current', {'packages':['bar']});
      google.charts.setOnLoadCallback(drawChart);

      function drawChart() {
        var data = google.visualization.arrayToDataTable(<?php echo $kmk;?>);

        var options = {
          chart: {
            title: 'Amount',
            subtitle: '',
          }
        };

        var chart = new google.charts.Bar(document.getElementById('columnchart_material'));

        chart.draw(data, google.charts.Bar.convertOptions(options));
      }
    </script>
  </head>

    <div id="columnchart_material" style=" height: 500px;"></div>

</html>

  
    <div class="col-xs-4" >
    <h4><?=label('TodaySale');?></h4>

    <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
      <thead class="thead-inverse">
        <tr>
        <th><?=label('Bill');?> <?=label('Number');?></th>
          <th><?=label('Date');?></th>
          <th><?=label('Amount');?></th>
          </tr>
          </thead>

          <tbody>
          
<?php 
$totsal=0;
$miomk=mysql_query("select * from sales where created_at='".date("Y-m-d")."' order by id desc  ");
while($miomkf=mysql_fetch_array($miomk))
{
  $totsal=$totsal+$miomkf['total'];
?>
<tr>
        <th><?php echo $miomkf['id'].'/'.$miomkf['yyear'];?></th>
        <th ><?php echo date("d-m-Y H:i:s", strtotime($miomkf['attime'])) ; ?></th>
        <th style="text-align: right;"><?php echo number_format((float)$miomkf['total'], $this->setting->decimals, '.', '');?></th>
</tr>
<?php 
}
?>


            


          </tbody>
           <thead class="thead-inverse">
        <tr>
        <th></th>
          <th><?=label('Total');?></th>
          <th style="text-align: right;"><?php echo number_format((float)$totsal, $this->setting->decimals, '.', '');?></th>
          </tr>
          </thead>




          </table>
          </div> 


          

          <div class="col-xs-4" >
    <h4><?=label('Daily Sales');?></h4>
    <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
      <thead class="thead-inverse">
        <tr>
          <th><?=label('Date');?></th>
        <th><?=label('Total Bills');?> </th>
          <th><?=label('Amount');?></th>
          </tr>
          </thead>
        <tbody>
<?php 
$txpp=0;
for($ff=0;$ff<=30;$ff++)
{
$new_date = date('Y-m-d', strtotime(date("Y-m-d")." - $ff days"));
$miomk=mysql_query("select *,sum(total) as smms from sales where created_at='".$new_date."'  ");
while($miomkf=mysql_fetch_array($miomk))
{
  $tybb=mysql_num_rows(mysql_query(" select * from sales where created_at='".$new_date."' "));
  $totsal=$totsal+$miomkf['total'];
?>
<tr>
        <th><?php echo $new_date;?></th>
        <th><?php echo $tybb;?></th>
        <th style="text-align: right;"><?php echo number_format((float)$miomkf['smms'], $this->setting->decimals, '.', ''); ?></th>
</tr>
<?php 
$txpp=$miomkf['smms']+$txpp;
}
}
?>
          </tbody>
           <thead class="thead-inverse">
        <tr>
        <th></th>
          <th><?=label('Total');?></th>
          <th style="text-align: right;"><?php echo number_format((float)$txpp, $this->setting->decimals, '.', '');?></th>
          </tr>
          </thead>
          </table>
          </div> 



            <div class="col-xs-4" >
    <h4><?=label('Monthly Sales');?></h4>
    <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
      <thead class="thead-inverse">
        <tr>
          <th><?=label('Month');?></th>
        <th><?=label('Total Bills');?> </th>
          <th><?=label('Amount');?></th>
          </tr>
          </thead>
        <tbody>
<?php 
$txppm=0;
for($ffm=0;$ffm<=12;$ffm++)
{

    
  $new_datem=date("Y-m", strtotime("-$ffm months"));

//$new_datem = date('Y-m', strtotime(date("Y-m")." - $ffm months"));

$miomkm=mysql_query("select *,sum(total) as smms from sales where created_at like '".$new_datem."%'  ");
while($miomkfm=mysql_fetch_array($miomkm))
{
  $tybbm=mysql_num_rows(mysql_query(" select * from sales where created_at like '".$new_datem."%' "));
  
?>
<tr>
        <th><?php echo $new_datem;?></th>
        <th><?php echo $tybbm;?></th>
        <th style="text-align: right;"><?php echo number_format((float)$miomkfm['smms'], $this->setting->decimals, '.', ''); ?></th>
</tr>
<?php 
$txppm=$miomkfm['smms']+$txppm;
}
}
?>
          </tbody>
           <thead class="thead-inverse">
        <tr>
        <th></th>
          <th><?=label('Total');?></th>
          <th style="text-align: right;"><?php echo number_format((float)$txppm, $this->setting->decimals, '.', '');?></th>
          </tr>
          </thead>
          </table>
          </div> 






          <div class="col-xs-4" >
          <h4><?=label('todatpurchase');?></h4>
    <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
      <thead class="thead-inverse">
        <tr>
        <th><?=label('Bill');?> <?=label('Number');?></th>
          <th><?=label('Date');?></th>
          <th><?=label('Amount');?></th>
          </tr>
          </thead>

          <tbody>
          
<?php 
$totpur=0;
$miomk=mysql_query("select * from purchases where date='".date("Y-m-d")."' order by id desc  ");
while($miomkf=mysql_fetch_array($miomk))
{
  $totpur=$totpur+$miomkf['total'];
?>
<tr>
        <th><?php echo $miomkf['id'];?></th>
        <th><?php echo date("d-m-Y", strtotime($miomkf['date'])) ; ?></th>
        <th style="text-align: right;"><?php echo number_format((float)$miomkf['total'], $this->setting->decimals, '.', '');?></th>
</tr>
<?php 
}
?>


            


          </tbody>
           <thead class="thead-inverse">
        <tr>
        <th></th>
          <th><?=label('Total');?></th>
          <th style="text-align: right;"><?php echo number_format((float)$totpur, $this->setting->decimals, '.', '');?></th>
          </tr>
          </thead>




          </table>
          </div>




          <div class="col-xs-4" >
    <h4><?=label('Daily Purchases');?></h4>
    <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
      <thead class="thead-inverse">
        <tr>
          <th><?=label('Date');?></th>
        <th><?=label('Total Bills');?> </th>
          <th><?=label('Amount');?></th>
          </tr>
          </thead>
        <tbody>
<?php 
$ert=0;
for($ff=0;$ff<=30;$ff++)
{
$new_date = date('Y-m-d', strtotime(date("Y-m-d")." - $ff days"));

$miomk=mysql_query("select *,sum(total) as olo from purchases where date='".$new_date."' order by id desc  ");


while($miomkf=mysql_fetch_array($miomk))
{
  $tybb=mysql_num_rows(mysql_query("select * from purchases where date='".$new_date."' order by id desc  "));

  

  $totsal=$totsal+$miomkf['total'];
?>
<tr>
        <th><?php echo $new_date;?></th>
        <th><?php echo $tybb;?></th>
        <th style="text-align: right;"><?php echo number_format((float)$miomkf['olo'], $this->setting->decimals, '.', ''); ?></th>
</tr>
<?php 
$ert=$miomkf['olo']+$ert;
}
}
?>
          </tbody>
           <thead class="thead-inverse">
        <tr>
        <th></th>
          <th><?=label('Total');?></th>
          <th style="text-align: right;"><?php echo number_format((float)$ert, $this->setting->decimals, '.', '');?></th>
          </tr>
          </thead>
          </table>
          </div> 



            <div class="col-xs-4" >
    <h4><?=label('Monthly Purchases');?></h4>
    <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
      <thead class="thead-inverse">
        <tr>
          <th><?=label('Month');?></th>
        <th><?=label('Total Bills');?> </th>
          <th><?=label('Amount');?></th>
          </tr>
          </thead>
        <tbody>
<?php 
$ertm=0;
for($ffm=0;$ffm<=12;$ffm++)
{

    
  $new_datem=date("Y-m", strtotime("-$ffm months"));

//$new_datem = date('Y-m', strtotime(date("Y-m")." - $ffm months"));



$miomkm=mysql_query("select *,sum(total) as smms from purchases where date like '".$new_datem."%'  ");
while($miomkfm=mysql_fetch_array($miomkm))
{
  $tybbm=mysql_num_rows(mysql_query(" select * from purchases where date like '".$new_datem."%' "));
  
?>
<tr>
        <th><?php echo $new_datem;?></th>
        <th><?php echo $tybbm;?></th>
        <th style="text-align: right;"><?php echo number_format((float)$miomkfm['smms'], $this->setting->decimals, '.', ''); ?></th>
</tr>
<?php 
$ertm=$miomkfm['smms']+$ertm;
}
}
?>
          </tbody>
           <thead class="thead-inverse">
        <tr>
        <th></th>
          <th><?=label('Total');?></th>
          <th><?php echo number_format((float)$ertm, $this->setting->decimals, '.', '');?></th>
          </tr>
          </thead>
          </table>
          </div> 


<!-- ////////////end of purchase






/// start od expence -->






       




<div class="col-xs-6" >
<h4><?=label('Monthly');?> <?=label('paymentMethod');?></h4>
    <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
      <thead class="thead-inverse">
        <tr>
        <th><?=label('Monthly');?></th>
          <th><?=label('Cash');?></th>
          <th><?=label('Card');?></th>
          <th><?=label('Coupon');?></th>
          <th><?=label('Online');?></th>
          <th ><?=label('Total');?></th>
          </tr>
          </thead>

          <tbody>
          
<?php 


$rt=date("Y-m");

$kcc=11;
for($ky=$kcc;$ky>=0;$ky--)
{
  $rtll=date("Y-m", strtotime("-$ky months"));

$totpur=0;
$cash=0;
$card=0;
$check=0;
$totot=0;
$cardd=0;
$onlinn=0;
$llc= mysql_query("select * from sales  where created_at like '$rtll%'   ");
while($llcf=mysql_fetch_array($llc))
{
  $totot=$totot+$llcf['paid'];
  if($llcf['paidmethod']==0)
  {
    $cash=$cash+$llcf['paid'];
  } 
  else if($llcf['paidmethod']==1)
  {
    $card=$card+$llcf['paid'];
  }  
  else if($llcf['paidmethod']==2)
  {
    $check=$check+$llcf['paid'];
  }

  else if($llcf['paidmethod']==3)
  {
    $cardd=$cardd+$llcf['paid'];
  } 

  

  else if($llcf['paidmethod']==7)
  {
    $onlinn=$onlinn+$llcf['paid'];
  } 




}

$tyhh=$cardd+$card;

?>
<tr>
        <th><?php echo date("m-Y", strtotime($rtll)) ;?></th>
        <th style="text-align: right;"><?php echo number_format((float)$cash, $this->setting->decimals, '.', ''); ?></th>
        <th style="text-align: right;"><?php echo number_format((float)$tyhh, $this->setting->decimals, '.', ''); ?></th>
        <th style="text-align: right;"><?php echo number_format((float)$check, $this->setting->decimals, '.', ''); ?></th>
        <th style="text-align: right;"><?php echo number_format((float)$onlinn, $this->setting->decimals, '.', ''); ?></th>
        <th style="text-align: right;"><?php echo number_format((float)$totot, $this->setting->decimals, '.', ''); ?></th>
        
        
</tr>
<?php 

}

?>


            


          </tbody>
           </table>
          </div>



<div class="col-xs-6" >
<h4><?=label('Monthly');?> <?=label('Sales');?> & <?=label('Purchase');?></h4>
    <table id="table" class="table table-striped table-bordered" cellspacing="0" width="100%">
      <thead class="thead-inverse">
        <tr>
        <th><?=label('Monthly');?></th>
          <th><?=label('Sales');?></th>
          <th><?=label('Purchase');?></th>
          
          
          </tr>
          </thead>

          <tbody>
          
<?php 
$rt=date("Y-m");
$kcc=0;
for($ky=$kcc;$ky<=11;$ky++)
{
$rtll=date("Y-m", strtotime("-$ky months"));
$totpur=0;
$ssal= mysql_fetch_array(mysql_query("select *, sum(total) as stoto from sales  where created_at like '$rtll%'   "));
$ppal= mysql_fetch_array(mysql_query("select *, sum(total) as purtt from purchases  where date like '$rtll%'   "));
$lmm=$ssal['stoto']-$ppal['purtt'];
?>

<tr>
        <th><?php echo date("m-Y", strtotime($rtll)) ; ?></th>
        <th style="text-align: right;"><?php echo number_format((float)$ssal['stoto'], $this->setting->decimals, '.', ''); ?></th>
        <th style="text-align: right;"><?php echo number_format((float)$ppal['purtt'], $this->setting->decimals, '.', ''); ?></th>
        
       
        
        
</tr>
<?php 
}
?>


            


          </tbody>
           </table>
          </div>




          </div>

         