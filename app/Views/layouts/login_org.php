<!DOCTYPE html>
 


    <script type="text/javascript">
      google.load("elements", "1", {
            packages: "transliteration"
          });
      function onLoad() {
        var options = {
          sourceLanguage: 'en', // or google.elements.transliteration.LanguageCode.ENGLISH,
          destinationLanguage: ['<?=label("languagek");?>'], // or [google.elements.transliteration.LanguageCode.HINDI],
          shortcutKey: 'ctrl+g',
          transliterationEnabled: true
        };
        var control = new google.elements.transliteration.TransliterationControl(options);
        var ids = [ "username","cxcxcxc" ];
        control.makeTransliteratable(ids);
         control.showControl('translControl');
      }
      google.setOnLoadCallback(onLoad);
    </script>

<html >
  <head>
    <meta charset="UTF-8">
    <title>POS Login</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
     <link href="<?php echo base_url(); ?>assets/pos.ico" rel="shortcut icon">
    
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
  <body>
     <div   tabindex="-1" role="dialog">
       <div class="modal-dialog">
            <div class="loginmodal-container">
               <img src="<?=base_url()?>assets/happyclick.png" alt="logo">
               <h1><?=label('Loginaccount');?></h1><br>
               <?php if(isset($message)){echo "<div class='red'>".$message."</div>";}?>
               <?php
              $attributes = array('class' => 'login');
              echo form_open('login', $attributes);
              ?>
               <input type="text" autofocus name="username" id="username" value="<?=isset($username)?$username:''?>" placeholder="<?=label("Username");?>" required>
               <input type="password" name="password" id="cxcxcxc" placeholder="<?=label("Password");?>" required>
               <?php
                  echo form_submit('submit', label("Login"), "class='login loginmodal-submit'");
               ?>

              <?=form_close()?>

              <div class="login-help">
               &copy; <?=date("Y");?> <a href="http://www.happyclick.in/" style="color:#000;" target="_blank">Happyclick.in,8939324771</a>
              </div>
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
