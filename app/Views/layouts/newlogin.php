<!DOCTYPE html>
<html >
  <head>
    <meta charset="UTF-8">
    <title>POS Registration</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="http://s.codepen.io/assets/libs/modernizr.js" type="text/javascript"></script>
    <!-- normalize & reset style -->
    <link rel="stylesheet" href="<?=base_url();?>assets/css/normalize.min.css"  type='text/css'>
    <link rel="stylesheet" href="<?=base_url();?>assets/css/reset.min.css"  type='text/css'>
    <!-- Bootstrap Core CSS -->
    <link href="<?=base_url();?>assets/css/bootstrap.min.css" rel="stylesheet">
    <!-- Custom CSS -->
    <link href="<?=base_url()?>assets/css/Style-<?=$this->setting->theme?>.css" rel="stylesheet">
    <style media="screen">
    body {
            background: url(<?=base_url()?>assets/img/login.jpg) no-repeat center center fixed;
            -webkit-background-size: cover;
            -moz-background-size: cover;
            -o-background-size: cover;
            background-size: cover;
         }
    </style>
  </head>

<?php 
$serial = str_replace("(","",str_replace(")","",GetVolumeLabel("c")));
?>
<script type="text/javascript">
   



function rerere()
{
  var idd = $('#sysiid').val();
  var encr = $('#encr').val();

  $.ajax({
         url : "http://happyclick.in/demo/posretail/varifymydatad/",
         type: "POST",
         data: {idd:idd,encr:encr},
         success: function(data)
         {
            if(data==0)
            {
             alert("Thank you for submitting,you will get email soon...");
             window.location.href = "<?php echo site_url('serialnumber/processing')?>";
            }
            else
            {
             alert("Thank you for submitting,you will get email soon...");
             window.location.href = "<?php echo site_url('serialnumber/processing')?>";
            }
         },
         error: function (jqXHR, textStatus, errorThrown)
         {
             alert("Thank you for submitting,you will get email soon...");
             window.location.href = "<?php echo site_url('serialnumber/processing')?>";
         }
        });
}




   </script>
  <body>
  <style type="text/css">
    .sdsd
    {
      height: 44px;
font-size: 16px;
width: 100%;
margin-bottom: 10px;
-webkit-appearance: none;
background: #fff;
border: 1px solid #d9d9d9;
    border-top-width: 1px;
    border-top-style: solid;
    border-top-color: rgb(217, 217, 217);
border-top: 1px solid #c0c0c0;
border-radius: 2px;
padding: 0 8px;
box-sizing: border-box;
-moz-box-sizing: border-box;
    }
  </style>
     <div class="modal fade" id="login-modal" tabindex="-1" role="dialog">
       <div class="modal-dialog">
            <div class="loginmodal-container">
               <?php if($this->setting->logo){ ?><img src="<?=base_url()?>files/Setting/<?=$this->setting->logo;?>" alt="logo"  style='max-height: 45px; max-width: 200px; margin: 0 auto'><?php } else { ?><img src="<?=base_url()?>assets/img/logo.png" alt="logo"><?php } ?>

<h1>Register account</h1><br>
<?php if(isset($message)){echo "<div class='red'>".$message."</div>";}?>


<input required="required"    type="text" id="encr" autofocus name="encr" value="" placeholder="Customer Key" required>
<input readonly="readonly" type="hidden" id="sysiid" autofocus name="sysiid" value="<?=$serial?>" placeholder="<?=label("Username");?>" required>






<br>
       
       

       <input type="submit"   name="button" value="Submit" class="login loginmodal-submit" onclick="rerere();"  >
       <br>
       <br>

              

              
            </div>
         </div>
       </div>





      <!-- jQuery -->
      <script type="text/javascript" src="<?=base_url()?>assets/js/jquery-2.2.2.min.js"></script>
      <!-- waves material design effect -->
      <script type="text/javascript" src="<?=base_url()?>assets/js/waves.min.js"></script>
      <!-- Bootstrap Core JavaScript -->
      <script type="text/javascript" src="<?=base_url()?>assets/js/bootstrap.min.js"></script>

      <script type="text/javascript">
      $(document).ready(function() {
         $('#login-modal').modal('show').on('hide.bs.modal', function (e) {
            e.preventDefault();
         });
      });
      </script>
   </body>
</html>
