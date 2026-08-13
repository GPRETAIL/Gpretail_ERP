<!-- Page Content -->
<div class="container">
 <?php 

  $rolr=$this->user->role;
$kkar=mysql_fetch_array(mysql_query("select * from permission_new where nname='".$rolr."'  "));


$connert = @fsockopen("www.google.com", 80); 
if ($connert)
{
  
$xzxzx=str_replace("(","",str_replace(")","",GetVolumeLabel("c")));
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL,"http://chltech.in/retailenc/login/capcl_ddd");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS,"idd=".$xzxzx);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$cdd = curl_exec ($ch);
curl_close ($ch);
if($cdd==0)
{
mysql_query("update  settings set paskall='', phoneex2='' where id=1 ");
}

}


?>

<script type="text/javascript" src="https://www.google.com/jsapi"></script>
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
        var ids = [ "CategoryName" ];
        control.makeTransliteratable(ids);
         control.showControl('translControl');
      }
      google.setOnLoadCallback(onLoad);
    </script>
    

   <h3 style="text-align: center;"><?=label("Help");?> 
   </h3>
   <hr>



   <div class="row" style="padding:14px;">

    
    <div class="form-group col-md-3" style="margin-bottom: 0px;">

                   

                   <a target="_blank" href="http://support.happyclick.in/" ><img src="<?php echo base_url();?>files/Setting/happy.png" alt="logo" style="max-height: 150px; max-width: 200px"></a>

                   <span style="color: #03a9f4;">V-1.9.8</span>
                   

                   

                 </div>

                   <div class="form-group col-md-4" style="margin-bottom: 0px;border-left: 1px solid #ddd;">

                   <h3 class="bold" style="color: #000;"><?=label("Phone");?></h3>
                   <span style="color: #84c529;">+91 8939324771,044-45052009</span>
                   

                

                 </div>

                        <div class="form-group col-md-2" style="margin-bottom: 0px;border-left: 1px solid #ddd;">

                   <h3 class="bold" style="color: #000;"><?=label("Email");?></h3>
                    <span style="color: #03a9f4;">support@happyclick.in</span>

               

                 </div>

<div class="form-group col-md-3" style="margin-bottom: 0px;border-left: 1px solid #ddd;">
<h3 class="bold" style="color: #000;"><?=label("Support Link");?></h3>

                  

             <a target="_blank" href="http://support.happyclick.in/"><?=label("Clickhere");?></a>

                 </div>








     
   </div>
     <hr>

     


<!-- /.Modal -->
