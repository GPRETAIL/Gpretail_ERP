<?php 

$yhe=$_POST['countid'];
$yh=explode("/",$yhe);
$lkl=$yh['0'];

   $lklf = mysql_fetch_array(mysql_query("select * from    sales where id='".$lkl."' "));
   $lklfr=$lklf['client_id'];
   $diss=$lklf['discount'];
   if($diss==0 || $diss=='')
   {
$distt=0;
   }
   else
   {
    $dissex=explode("%",$diss);
    $distt=$dissex['0'];
   }

   if($lklfr>0) 
           {
   $lklfrg=mysql_fetch_array(mysql_query("select * from customers where id='".$lklfr."' "));
   $lklfrgg=$lklfrg['name'];
           }
           else
           {
              $lklfrgg="Walk in Customer" ;
           }
?>

<div class="modal-dialog" role="document" style="width:45%;">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel">List Of Products</h4>
      </div>
      
      <div  style="width: 100%;">

         <div class="col-xs-3 table-header">
            <h4><?=label("Warehouse");?></h4>
         </div>

         <div class="col-xs-2 table-header">
            <h4><?=label("Level");?></h4>
         </div>

         <div class="col-xs-2 table-header">
            <h4><?=label("Rack");?></h4>
         </div>

         <div class="col-xs-2 table-header nopadding">
            <h4 class="text-left"><?=label("Avl Qty");?></h4>
         </div>

       


      </div>
      <div style="background: #fff;height: 250px;overflow-y: scroll;display: inline-block;width: 100%;">




 
         
          
          
             <?php
               $immff=1;
               $imm=mysql_query("select * from purchase_items where product_id='".$lkl."' and avlqty>0 ");
               while($immf=mysql_fetch_array($imm))
               {  
                  $salid=$immf['id'];
                  $salidf = mysql_fetch_object(mysql_query("select purid,sum(qt) as mkm from posales where purid='".$salid."' "));
                  $salidft=$salidf->mkm;
                  if($salidft>0)
                  {
                    $salidft=$salidft;
                  }
                  else
                  {
                    $salidft=0;
                  }
                   
                   $qtyy=$immf['avlqty'];
                   $wqxz=$immf['warehouse_id'];

                   $warr=mysql_fetch_object(mysql_query("select * from warehouses where id='".$wqxz."' "));
                                 
           ?>
           
           <a style="color: #333;" href="javascript:void(0);"  data-dismiss="modal" class="col-xs-12 fv"  onclick="add_posalenk('<?php echo $salid;?>');"  >
           <div class="panel panel-default product-details">
           
           
           
           
           <div class="col-xs-3 ">
            <h5><?php echo $warr->name;?></h5>
         </div>

         <div class="col-xs-2 ">
            <h5><?php echo $immf['levelk'];?></h5>
         </div>

         <div class="col-xs-2">
             <h5><?php echo $immf['rackk'];?></h5>
         </div>

         <div class="col-xs-2 ">
            <h5><?php echo $immf['avlqty']-$salidft;?></h5>
         </div>


           
           </div>

         </a>
           
           <?php 
           $immff++;
               }
               ?>

        </div>
           
      
      <style type="text/css">
        .mnm
        {
          border-radius: 4px;padding: 6px 12px;background-color: #eee;text-align: center;width: 160px;margin: 0px 7px 0px 15px;height: 32px;
          border: 1px solid #ccc;
        }
         .mnms
        {
          border-radius: 4px;padding: 6px 12px;text-align: center;width: 160px;margin: 0px 7px 0px 15px;height: 32px;
          border: 1px solid #ccc;
        }
        .fv
        {
          cursor: pointer;
        }.fv:hover
        {
          cursor: pointer;
          background: #e6e1e1;
        }
      </style>

      <div class="modal-footer"> 
          



        <button type="button" class="btn btn-default" data-dismiss="modal"><?=label("Close");?></button>
       
      </div>
      </div>
      </div>
   
   







   <!--  <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.js"></script>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script> -->

<?php
exit;
?>

  

  
  
  
