<?php 
session_start();
$rolr=$this->user->role;
/*@$kkar=mysql_fetch_array(mysql_query("CALL getpermissionnew	('".$rolr."')  "));*/


if($this->uri->segment(1)=='' || $this->uri->segment(1)=='quotation')
{

}
else
{
$xzxz=mysql_fetch_array(mysql_query("select * from report_stting  where rsi=1 "));

@$kkar=mysql_fetch_array(mysql_query("select * from permission_new where nname='".$rolr."'  "));


}


//this is for local system



?>
<!DOCTYPE html>
<html lang="en">
   <head>
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="description" content="">
      <meta name="author" content="">
      <title><?=label('title');?> <?= $this->setting->companyname;?></title>
      <!-- jQuery -->
      <script type="text/javascript" src="<?=base_url()?>assets/js/jquery-2.2.2.min.js"></script>
      <script type="text/javascript" src="<?=base_url()?>assets/js/loading.js"></script>
      <!-- normalize & reset style -->
      
      <link rel="stylesheet" href="<?=base_url();?>assets/css/reset.min.css"  type='text/css'>

      <?php if($this->uri->segment(1)=='' || $this->uri->segment(1)=='quotation'){ ?>
      <link rel="stylesheet" href="<?=base_url();?>assets/css/normalize.min1.css"  type='text/css'>

      <link rel="stylesheet" href="<?=base_url();?>assets/css/jquery-ui1.css"  type='text/css'>
      <link href="<?=base_url();?>assets/css/bootstrap.min1.css" rel="stylesheet">
      <link href="<?=base_url();?>assets/css/bootstrap-horizon1.css" rel="stylesheet">

      <link rel="stylesheet" href="<?=base_url()?>assets/css/waves.min1.css">
      <link rel="stylesheet" href="<?=base_url()?>assets/css/app_custom1.css">
      <link href="<?=base_url()?>assets/css/select2.min1.css" rel="stylesheet">
      <link href="<?=base_url()?>assets/css/Style-<?=$this->setting->theme?>1.css" rel="stylesheet">

      <?php } else {  ?> 
       <link rel="stylesheet" href="<?=base_url();?>assets/css/normalize.min.css"  type='text/css'>

      <link rel="stylesheet" href="<?=base_url();?>assets/css/jquery-ui.css"  type='text/css'>
      <link href="<?=base_url();?>assets/css/bootstrap.min.css" rel="stylesheet">
      <link href="<?=base_url();?>assets/css/bootstrap-horizon.css" rel="stylesheet">
      
      <link rel="stylesheet" href="<?=base_url()?>assets/css/waves.min.css">
      
      <link href="<?=base_url()?>assets/css/select2.min.css" rel="stylesheet">
      <link href="<?=base_url()?>assets/css/Style-<?=$this->setting->theme?>.css" rel="stylesheet">

      <?php } ?>
      
      <link rel="stylesheet" href="<?=base_url();?>assets/css/font-awesome.min1.css">

      <!-- google lato font -->
     <!--  <link href='https://fonts.googleapis.com/css?family=Lato:400,700,900,300' rel='stylesheet' type='text/css'> -->
      <!-- Bootstrap Core CSS -->


      
      <!-- bootstrap-horizon -->
      
      <!-- datatable style -->
      <link href="<?php echo base_url('assets/datatables/css/dataTables.bootstrap.css')?>" rel="stylesheet">
      <!-- font awesome -->
      
      <!-- include summernote css-->
      <link href="<?=base_url();?>assets/css/summernote.css" rel="stylesheet">
      <!-- waves -->
      
      <!-- daterangepicker -->
      <link rel="stylesheet" type="text/css" href="<?=base_url();?>assets/css/daterangepicker.css" />
      <!-- css for the preview keyset extension -->
      <link href="<?=base_url()?>assets/css/keyboard-previewkeyset.css" rel="stylesheet">
      <!-- keyboard widget style -->
      <link href="<?=base_url()?>assets/css/keyboard.css" rel="stylesheet">
      <!-- Select 2 style -->

      
      <!-- Sweet alert swal -->
      <link rel="stylesheet" type="text/css" href="<?=base_url()?>assets/css/sweetalert.css">
      <!-- datepicker css -->
      <link rel="stylesheet" type="text/css" href="<?=base_url();?>assets/css/bootstrap-datepicker.min.css">
      <!-- Custom CSS -->
      
      
      <style>
            
            .icon-color li a{
                position:relative;
                padding-left:25px;
                margin-left:10px;
                line-height:1.6;
            }
            .icon-color li a i{
                position:absolute;
                left:0;
                top:4px;
                font-size:17px!important;
                color:#1e73be;
                margin-right:5px;
            }
            
            .menu-top{
                padding-top:5px;
            }
            .fa-stack i{
                color:red;
            }
      </style>
      </style>
      
      <!-- HTML5 Shim and Respond.js IE8 support of HTML5 elements and media queries -->
      <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
      <!--[if lt IE 9]>
      <script src="https://oss.maxcdn.com/libs/html5shiv/3.7.0/html5shiv.js"></script>
      <script src="https://oss.maxcdn.com/libs/respond.js/1.4.2/respond.min.js"></script>
      <![endif]-->
   </head>
   <body>
      <!-- Navigation -->
      <nav class="navbar navbar-default navbar-fixed-top" role="navigation">
         <div class="container-fluid">
            <div class="navbar-header">
               <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1" aria-expanded="false">
                 <span class="sr-only">Toggle navigation</span>
                 <span class="icon-bar"></span>
                 <span class="icon-bar"></span>
                 <span class="icon-bar"></span>
               </button>
               <a class="navbar-brand" href="<?php echo base_url();?>"><?php if($this->setting->logo){ ?><img src="<?=base_url()?>files/Setting/<?=$this->setting->logo;?>" alt="logo"  style='max-height: 45px; max-width: 200px'><?php } else { ?><img src="<?=base_url()?>assets/img/logo.png" alt="logo"><?php } ?></a>
            </div>
            <!-- Brand and toggle get grouped for better mobile display -->












            <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
               <ul class="nav navbar-nav menu-top">


<li class="flat-box"><a href="<?=base_url();?>dashboard/posview"><i style="font-size: 18px;color:#1e73be; color:#1e73be;" class="fa fa-tachometer"></i> <?=label("Dashboard");?></a></li>

                <?php if($kkar['ssa']==1){ ?>
                  <li class="flat-box"><a href="<?=base_url();?>"><i style="font-size: 18px;color:#1e73be; " class="fa fa-shopping-cart"></i> <?=label("POS");?></a></li> 
                  <?php } ?>



                    <li class="dropdown">
                    <a href="#" class="dropdown-toggle flat-box" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false"><i style="font-size: 17px;color:#1e73be;" class="fa fa-newspaper-o"></i> <?=label("Voucher");?> <span class="caret"></span></a>
                    <ul class="dropdown-menu icon-color">


               <?php if($kkar['ssv']==1){ ?>   
               <li class="flat-box"><a href="<?=base_url()?>sales"><i style=""  class="fa fa-shopping-cart"></i> <?=label("Sales");?></a></li>
               <?php } ?>

               <?php if($kkar['puv']==1){ ?> 

                  <li class="flat-box"><a href="<?=base_url()?>purchase"><i style="" class="fa fa-cart-arrow-down"></i> <?=label("Purchase");?></a></li>



                  <?php } ?>

                   <?php if($kkar['excv']==1){ ?>
                       <li class="flat-box"><a href="<?=base_url()?>categorie_expences"><i style="" class="fa fa-hdd-o"></i> <?=label("Expense");?> <?=label("Type");?></a></li><?php } ?>
                       <?php if($kkar['exxv']==1){ ?>
                       <li class="flat-box"><a href="<?=base_url()?>expences"><i style="" class="fa fa-archive"></i> <?=label("Expense");?></a></li><?php } ?>



                        <?php if($this->setting->quotation==1)
                        { ?>

                       <li class="flat-box"><a href="<?=base_url()?>quotation"><i style="" class="fa fa-archive"></i> <?=label("Add Quotation");?></a></li>

                       <li class="flat-box"><a href="<?=base_url()?>sales/quotation"><i style="" class="fa fa-archive"></i> <?=label("Quotation");?></a></li>
                       <?php } ?>


                  </ul>
                  </li>



                 


                 <li class="dropdown">
                    <a href="#" class="dropdown-toggle flat-box" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false"><i style="font-size: 17px;color:#1e73be;" class="fa fa-graduation-cap"></i> <?=label("Master");?> <span class="caret"></span></a>
                    <ul class="dropdown-menu icon-color">

                     <?php if($kkar['brv']==1){ ?>
                       <li class="flat-box"><a href="<?=base_url()?>brand"><i style="" class="fa fa-archive"></i><?=label("Brand");?>  </a></li><?php } ?>
                       
                        <?php if($kkar['brv']==1){ ?>
                       <li class="flat-box"><a href="<?=base_url()?>roll"><i style="" class="fa fa-archive"></i><?=label("Roll");?>  </a></li><?php } ?>
                       




                        <?php if($kkar['caav']==1){ ?>
                       <li class="flat-box"><a href="<?=base_url()?>categories"><i style="" class="fa fa-archive"></i> <?=label("Categories");?></a></li><?php } ?>
                       

                    <?php if($kkar['prv']==1){ ?>


                       <li class="flat-box"><a href="<?=base_url()?>products"><i style="" class="fa fa-product-hunt"></i> <?=label("Product");?></a></li>

                         <li class="flat-box"><a href="<?=base_url()?>products_inistock"><i style="" class="fa fa-product-hunt"></i> <?=label("Product");?> Initial Stock</a></li>



                       <?php } ?>

                       <?php if($kkar['taxv']==1){ ?>
                       <li class="flat-box"><a href="<?=base_url()?>tax"><i style="" class="fa fa-money"></i> <?=label("tax");?>  </a></li><?php } ?>


                       
                       <?php if($kkar['cuv']==1){ ?>
                       <li class="flat-box"><a href="<?=base_url()?>customers"><i style="" class="fa fa-user"></i> <?=label("Customers");?></a></li><?php } ?>
                       <?php if($kkar['suv']==1){ ?>
                       <li class="flat-box"><a href="<?=base_url()?>suppliers"><i style="" class="fa fa-truck"></i> <?=label("Supplier");?></a></li><?php } ?>
                      

                      

                      

                    </ul>
                 </li>
                 


            


                 
                 
                 <li class="dropdown">
                    <a href="#" class="dropdown-toggle flat-box" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false"><i style="font-size: 18px;color:#1e73be;" class="fa fa-money"></i> <?=label("Inventory");?> <span class="caret"></span></a>
                    <ul class="dropdown-menu  icon-color">
                       
<?php if($kkar['phv']==1){ ?>
                       <li class="flat-box"><a href="<?=base_url()?>physicalstock"><i class="fa fa-hand-o-right"></i> <?=label("Physical");?> <?=label("Stock");?>  </a></li>
                       <?php } ?>
                       <?php if($kkar['gov']==1){ ?>
                       
                       <li class="flat-box"><a href="<?=base_url()?>goodsout"><i class="fa fa-truck"></i> <?=label("GoodsOut");?> </a></li>
                       <?php } ?>



 <?php if($kkar['salretv']==1){ ?>
 <li class="flat-box"><a href="<?=base_url()?>sales/proreturn"><i class="fa fa-repeat"></i> <?=label("Sales");?> <?=label("Return");?>  </a></li>


  <?php }  

  if($kkar['prdenv']==1){ ?>
<!--  <li class="flat-box"><a href="<?=base_url()?>production"><i class="fa fa-shopping-basket"></i> <?=label("Production");?> <?=label("Entry");?>  </a></li> -->
  <?php } ?>


                    </ul>
                 </li>



                

                 
                 <!-- <?php if($this->user->role === "admin"){?><li class="flat-box"><a href="<?=base_url()?>stats"><i class="fa fa-line-chart"></i> <?=label("Reports");?></a></li><?php } ?> -->


<?php if($kkar['rev']==1){ 
  
  ?>
                 <li class="dropdown">
                    <a href="#" class="dropdown-toggle flat-box" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false"><i style="font-size: 17px;color:#1e73be; margin-right:3px;" class="fa fa-line-chart"></i><?=label("Reports");?> <span class="caret"></span></a>
                    <ul class="dropdown-menu  icon-color">

                      <?php if($this->setting->creditstatus==1)
                        { ?>

                    <!--   <li class="flat-box"><a href="<?=base_url()?>report/creditstatus"><i class="fa fa-user"></i><?=label("Credit Status");?></a></li> 

                      <li class="flat-box"><a href="<?=base_url()?>report/collection"><i class="fa fa-user"></i><?=label("Collection");?></a></li> 

                      <li class="flat-box"><a href="<?=base_url()?>notification"><i class="fa fa-user"></i><?=label("Notification");?></a></li> -->


                    <?php } ?>



<?php if($xzxz['r2']==1)
                    { ?>
                       <!-- <li class="flat-box"><a href="<?=base_url()?>report/productreport"><i class="fa fa-product-hunt"></i><?=label("Product");?></a></li> -->

                       <li class="flat-box"><a href="<?=base_url()?>report/categoryreport"><i class="fa fa-product-hunt"></i><?=label("Category");?></a></li>

                       <?php } ?>


                       <?php if($xzxz['r3']==1)
                    { ?>

                       <li class="flat-box"><a href="<?=base_url()?>report/storereport"><i class="fa fa-power-off"></i><?=label("CloseRegister");?></a></li>
                       <?php } ?>

                               <?php if($xzxz['r13']==1)
                    { ?>
                        <li class="flat-box"><a href="<?=base_url()?>report/stockallreport"><i class="fa fa-window-close"></i>
                        <?=label("Closing");?> <?=label("Stock");?></a></li>
                        <?php } ?>


                    <?php if($xzxz['r1']==1)
                    { ?>

                       <li class="flat-box"><a href="<?=base_url()?>report/customerreport"><i class="fa fa-user"></i><?=label("Customer");?></a></li>
                       <?php } ?>

                            <?php if($xzxz['r5']==1)
                    { ?>

                        <li class="flat-box"><a href="<?=base_url()?>report/customertaxreport"><i class="fa fa-money"></i><?=label("Customer");?> <?=label("tax");?> </a></li>
                        <?php } ?>




                          


                                   <?php if($xzxz['r12']==1)
                    { ?>
                        

                      <!--   <li class="flat-box"><a href="<?=base_url()?>report/stockstorereport"><i class="fa fa-window-close"></i>
                        <?=label("Closing");?> <?=label("Stock");?>-<?=label("Warehouses");?>  </a></li> -->

                      


                        <li class="flat-box"><a href="<?=base_url()?>report/fastreport"><i class="fa fa-window-close"></i>
                        <?=label("Fast Moving");?>  </a></li>     

                       
                       





                        <?php } ?>

                       <?php if($xzxz['r4']==1)
                    { ?>
                        <li class="flat-box"><a href="<?=base_url()?>report/producttaxreport"><i class="fa fa-money"></i><?=label("Product");?> <?=label("tax");?> </a></li>
                        <?php } ?>


                        <?php if($xzxz['r14']==1)
                    { ?>
                        <li class="flat-box"><a href="<?=base_url()?>report/profitdailyreport"><i class="fa fa-money"></i><?=label("Profit");?>  </a></li>
                        <?php } ?>

                         <?php if($xzxz['r10']==1)
                    { ?>

                        <li class="flat-box"><a href="<?=base_url()?>report/totalpurchasereport"><i class="fa fa-cart-arrow-down"></i><?=label("Purchase");?> </a></li>
                        <?php } ?>


                   


                  <!--       <?php if($xzxz['r6']==1)
                    { ?>

                        
                        <li class="flat-box"><a href="<?=base_url()?>report/purchasereport"><i class="fa fa-archive"></i><?=label("Purchase");?></a></li>
                        <?php } ?>
                        <?php if($xzxz['r7']==1)
                    { ?>

                        <li class="flat-box"><a href="<?=base_url()?>report/purchasedailyreport"><i class="fa fa-archive"></i><?=label("Purchase");?>(D)</a></li>
                        <?php } ?> -->


                        <?php if($xzxz['r8']==1)
                    { ?>


                        <li class="flat-box"><a href="<?=base_url()?>report/purchaseproductreport"><i class="fa fa-cart-arrow-down"></i><?=label("Purchase");?> <?=label("Product");?>  </a></li>




                        <?php } ?>
                        <?php if($xzxz['r9']==1)
                    { ?>
                        <li class="flat-box"><a href="<?=base_url()?>report/purchasedealerreport"><i class="fa fa-user-plus"></i><?=label("Purchase");?> <?=label("Dealer");?>    </a></li>
                        <?php } ?>

                       <!--  <?php if($xzxz['r10']==1)
                    { ?>
<li class="flat-box"><a href="<?=base_url()?>report/purchasemonthlyreport"><i class="fa fa-archive"></i><?=label("Purchase");?> (M)   </a></li>

<?php } ?> -->

<!-- <?php if($xzxz['r11']==1)
                    { ?>

                        <li class="flat-box"><a href="<?=base_url()?>report/salesdailyreport"><i class="fa fa-archive"></i><?=label("Sales");?> (D) </a></li>
                        <?php } ?> -->


            
             




                       


                    <?php if($xzxz['r16']==1)
                    { ?>

                        <li class="flat-box"><a href="<?=base_url()?>report/totalsalesreport"><i class="fa fa-shopping-cart"></i>
                        <?=label("Sales");?> </a></li>
                    <?php } ?>   

                  <!--   <?php if($xzxz['r17']==1)
                    { ?>

                        <li class="flat-box"><a href="<?=base_url()?>report/totalsalesreporthsn"><i class="fa fa-shopping-cart"></i>
                        <?=label("HSN");?> <?=label("Sales");?> </a></li>
                    <?php } ?> -->


                    


                        <?php if($xzxz['r11']==1)
                    { ?>

                        <li class="flat-box"><a href="<?=base_url()?>report/salesretunreport"><i class="fa fa-repeat"></i><?=label("Sales");?>  <?=label("Return");?> </a></li>
                        <?php } ?>


                         <?php if($xzxz['r15']==1)
                    { ?>
                        <li class="flat-box"><a href="<?=base_url()?>report/supplierreport"><i class="fa fa-users"></i><?=label("Supplier");?>  <?=label("Payment");?></a></li>
                        <?php } ?>



                       
                    </ul>

                 </li>
                 <?php } ?>

                  <?php if($this->user->role === "admin"){?><li class="flat-box"><a href="<?=base_url()?>settings?tab=setting"><i style="font-size: 18px;color:#1e73be;" class="fa fa-cogs"></i> <?=label("Setting");?></a></li><?php } ?>


                     

 <?php if($this->setting->tallyy==1)
 { ?>


                   
                 <li class="dropdown">
                    <a href="#" class="dropdown-toggle flat-box" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false"><i style="font-size: 18px;color:#1e73be;" class="fa fa-money"></i> Tally <span class="caret"></span></a>
                    <ul class="dropdown-menu  icon-color">
                       


<?php if($kkar['tallypur']==1){ ?>                    
<li class="flat-box"><a href="<?=base_url()?>report/purchasetally"><i class="fa fa-truck"></i>Purchase</a></li><?php } ?>

<?php if($kkar['tallypurlog']==1){ ?>
<li class="flat-box"><a href="<?=base_url()?>log/purchasetallylog"><i class="fa fa-truck"></i>Purchase Log</a></li><?php } ?>

<?php if($kkar['tallysale']==1){ ?>
<li class="flat-box"><a href="<?=base_url()?>report/salestally"><i class="fa fa-truck"></i>Sales</a></li><?php } ?>

<?php if($kkar['tallysalelog']==1){ ?>
<li class="flat-box"><a href="<?=base_url()?>log/salestallylog"><i class="fa fa-truck"></i>Sales Log</a></li><?php } ?>

<?php if($kkar['tallyupallv']==1){ ?>
<li class="flat-box"><a href="<?=base_url()?>log/updateall"><i class="fa fa-truck"></i>Update All</a></li><?php } ?>

</ul>
</li>
<?php } ?>



               </ul>
               <ul class="nav navbar-nav navbar-right">

                <li style="margin-top: 5px;" class="flat-box waves-effect waves-block">
<a href="<?php echo base_url();?>help"  title="<?=label('Help');?>">
<i style="font-size: 18px;color:#1e73be; " class="fa fa-user fa-lg"></i> Help</a>
                    </li>


                  <li class="dropdown ">
                  <a href="#" class="dropdown-toggle flat-box" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
                        <img class="img-circle topbar-userpic hidden-xs" src="<?=$this->user->avatar ? base_url().'files/Avatars/'.$this->user->avatar : base_url().'assets/img/Avatar.jpg' ?>" width="30px" height="30px">
                        <span class="hidden-xs"> <?php echo ucfirst($this->user->firstname);?> </span><span class="caret"></span>
                     </a>
                     <ul class="dropdown-menu">
                        <li class="flat-box">
                        <?php 
if($this->setting->apponords==1)
{ 
if($this->setting->backuplogout==1 && $this->setting->backcloud==2  )
{
?>
<a href="javascript:void(0)" onclick="logoutses();" title="<?=label('LogOut');?>"><i class="fa fa-sign-out fa-lg"></i> &nbsp; Logout</a>
<?php 
} else 
{
   
?>
<a href="<?php echo base_url();?>auth/logoutnext"  title="<?=label('LogOut');?>"><i class="fa fa-sign-out fa-lg"></i> &nbsp; Logout</a>

<?php 
} 

}
else
{
?>
<a href="<?php echo base_url();?>auth/logouts"  title="<?=label('LogOut');?>"><i class="fa fa-sign-out fa-lg"></i> &nbsp; Logout</a>

<?php 
} 
?>


                        </li>



                        </ul>

                  </li>



                  <li class="dropdown language">
                     <a href="#" class="dropdown-toggle flat-box" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">
                        <i class="fa fa-language" aria-hidden="true"></i>
                        <span class="caret"></span></a>
                     <ul class="dropdown-menu">
                        <li class="flat-box"><a href="<?=base_url()?>dashboard/change/english"><img src="<?=base_url()?>assets/img/flags/india.jpg" class="flag" alt="language"> English</a></li>
                        
                        <li class="flat-box"><a href="<?=base_url()?>dashboard/change/tamil"><img src="<?=base_url()?>assets/img/flags/india.jpg" class="flag" alt="language"> தமிழ் </a></li>

                        <li class="flat-box"><a href="<?=base_url()?>dashboard/change/hindi"><img src="<?=base_url()?>assets/img/flags/india.jpg" class="flag" alt="language"> हिंदी </a></li>

                        <li class="flat-box"><a href="<?=base_url()?>dashboard/change/malayalam"><img src="<?=base_url()?>assets/img/flags/india.jpg" class="flag" alt="language"> മലയാളം </a></li>

                        <li class="flat-box"><a href="<?=base_url()?>dashboard/change/telugu"><img src="<?=base_url()?>assets/img/flags/india.jpg" class="flag" alt="language"> తెలుగు </a></li>

                        <li class="flat-box"><a href="<?=base_url()?>dashboard/change/kannada"><img src="<?=base_url()?>assets/img/flags/india.jpg" class="flag" alt="language"> ಕನಾಡಾ </a></li>
                     </ul>
                  </li>
                 
               </ul>
            </div>
            <div id="loadingimg"></div>
         </div>
         <!-- /.container -->
      </nav>
      <!-- Page Content -->


      <?=$yield?>

 


 



      <!-- slim scroll script -->
<?php if($this->uri->segment(1)=='' || $this->uri->segment(1)=='quotation'){ ?>
      <script type="text/javascript" src="<?=base_url()?>assets/js/jquery.slimscroll.min1.js"></script>
      <?php } else { ?>
      <script type="text/javascript" src="<?=base_url()?>assets/js/jquery.slimscroll.min.js"></script>
      <?php } ?>


      <!-- waves material design effect -->
      <script type="text/javascript" src="<?=base_url()?>assets/js/waves.min.js"></script>
      <!-- Bootstrap Core JavaScript -->
      <script type="text/javascript" src="<?=base_url()?>assets/js/bootstrap.min.js"></script>
      <!-- keyboard widget dependencies -->

      <?php
      
      if(@$this->setting->keyboard==1)
      {
        ?>
      <script type="text/javascript" src="<?=base_url()?>assets/js/jquery.keyboard.js"></script>
      <?php 
      } 
      ?>
      <script type="text/javascript" src="<?=base_url()?>assets/js/jquery.keyboard.extension-all.js"></script>
      <script type="text/javascript" src="<?=base_url()?>assets/js/jquery.keyboard.extension-extender.js"></script>
      <script type="text/javascript" src="<?=base_url()?>assets/js/jquery.keyboard.extension-typing.js"></script>
      <script type="text/javascript" src="<?=base_url()?>assets/js/jquery.mousewheel.js"></script>
      <!-- select2 plugin script -->
      <script type="text/javascript" src="<?=base_url()?>assets/js/select2.min.js"></script>
      <!-- dalatable scripts -->
      <script src="<?php echo base_url('assets/datatables/js/jquery.dataTables.min.js')?>"></script>
      <script src="<?php echo base_url('assets/datatables/js/dataTables.bootstrap.js')?>"></script>
      <!-- summernote js -->
      <script src="<?=base_url()?>assets/js/summernote.js"></script>
      <!-- chart.js script -->
      <script src="<?=base_url()?>assets/js/Chart.js"></script>
      <!-- moment JS -->
      <script type="text/javascript" src="<?=base_url()?>assets/js/moment.min.js"></script>
      <!-- Include Date Range Picker -->
      <script type="text/javascript" src="<?=base_url()?>assets/js/daterangepicker.js"></script>
      <!-- Sweet Alert swal -->
      <script src="<?=base_url()?>assets/js/sweetalert.min.js"></script>
      <!-- datepicker script -->
      <script src="<?=base_url()?>assets/js/bootstrap-datepicker.min.js"></script>
      <!-- creditCardValidator script -->
      <script src="<?=base_url()?>assets/js/jquery.creditCardValidator.js"></script>
      <!-- creditCardValidator script -->
      <script src="<?=base_url()?>assets/js/credit-card-scanner.js"></script>
      <script src="<?=base_url()?>assets/js/jquery.redirect.js"></script>
      <!-- ajax form -->
      <script src="<?=base_url()?>assets/js/jquery.form.min.js"></script>
      <!-- custom script -->
      <script src="<?=base_url()?>assets/js/app.js"></script>
   </body>
</html>

<?php 
if($this->setting->apponords==1)
{ 
?>
<script src="<?php echo base_url();?>assets/build/bootstrap-waitingfor.js"></script>

<?php
$tycc=$this->setting->backcloud;
 $rmst=$this->setting->backtimfrecon;
 $ryors=$this->setting->backsorno;
$rf=array();
for($jj=$rmst;$jj<25;)
{
  $rf[]=$jj*3600;
  $jj=$rmst+$jj;
}
?>
<script>
var jArrayk= <?php echo json_encode($rf); ?>;
var tycc= <?php echo $tycc; ?>;
var ryors= <?php echo $ryors; ?>;
setInterval(function() { 
  var timeNow = new Date();
  var hours   = timeNow.getHours();
  var minutes = timeNow.getMinutes();
  var seconds = timeNow.getSeconds();
  var rerr = parseInt(hours*60*60) + parseInt(minutes* 60) + parseInt(seconds); 
  for(var i=0; i<jArrayk.length; i++)
  {
   var name = jArrayk[i];
   if(name == rerr)
   {
    if(tycc==2 && ryors==1)
    {
    timeses();
    }
    else if(tycc==2 && ryors==0)
    {
    timesesauto();
    } 
    else
    {
    timeseslocalauto();
    }


   }
  }
}, 1000);
function timeseslocalauto()
    {
   waitingDialog.show('Please wait,updating your tables...');
            $.ajax({
            url : "<?php echo site_url('auth/logsesslocal')?>/",
            type: "POST",
           
            success: function(data)
            {
              setTimeout(function () {
  waitingDialog.hide();
}, 1000);

             
            },
            error: function (jqXHR, textStatus, errorThrown)
            {
               alert('Error adding / update data');
            }
         });

    }

    function timesesauto()
    {

   waitingDialog.show('Please wait,updating your tables...');
            $.ajax({
            url : "<?php echo site_url('auth/logsess')?>/",
            type: "POST",
           
            success: function(data)
            {
              setTimeout(function () {
  waitingDialog.hide();
}, 1000);

             
            },
            error: function (jqXHR, textStatus, errorThrown)
            {
               alert('Error adding / update data');
            }
         });

    }

function timeses()
    {


      swal({
        title: "Are you sure?",
        text: "Do you want to perform  database backup !",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Cloud and Local',
        cancelButtonText: "Local Only",
        closeOnConfirm: true,
        closeOnCancel: true
    },
    function(isConfirm) {
        if (isConfirm) {
             waitingDialog.show('Please wait,updating your tables...');
            $.ajax({
            url : "<?php echo site_url('auth/logsess')?>/",
            type: "POST",
           
            success: function(data)
            {
              setTimeout(function () {
  waitingDialog.hide();
}, 1000);

             
            },
            error: function (jqXHR, textStatus, errorThrown)
            {
               alert('Error adding / update data');
            }
         });

        } else {
                  waitingDialog.show('Please wait,updating your tables...');
            $.ajax({
            url : "<?php echo site_url('auth/logsesslocal')?>/",
            type: "POST",
           
            success: function(data)
            {
setTimeout(function () 
{
  waitingDialog.hide();
}, 1000);
},
            error: function (jqXHR, textStatus, errorThrown)
            {
               alert('Error adding / update data');
            }
         });
        }
    });

     
    }


function logoutses()
    {


      swal({
        title: "Are you sure?",
        text: "Do you want to perform  database backup !",
        type: "warning",
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: 'Yes, I am sure!',
        cancelButtonText: "No,Just Logout",
        closeOnConfirm: true,
        closeOnCancel: true
    },
    function(isConfirm) {
        if (isConfirm) {
             waitingDialog.show('Please wait,updating your tables...');
            $.ajax({
            url : "<?php echo site_url('auth/logout')?>/",
            type: "POST",
           
            success: function(data)
            {
              
              window.location = "<?php echo site_url('auth/logoutnext')?>/";
            },
            error: function (jqXHR, textStatus, errorThrown)
            {
               alert('Error adding / update data');
            }
         });

        } else {
            window.location = "<?php echo site_url('auth/logoutnext')?>/";
        }
    });

     
    }



</script>
<?php 
} 
?>





