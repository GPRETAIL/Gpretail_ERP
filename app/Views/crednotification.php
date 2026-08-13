<!-- Page Content -->
<div class="container">
 <?php 

  $rolr=$this->user->role;
$kkar=mysql_fetch_array(mysql_query("select * from permission_new where nname='".$rolr."'  "));
?>



    

   <h3><?=label("Notification");?></h3>
   

   <div class="row" style="margin-top:20px;">
      <table id="" class="table table-striped table-bordered" cellspacing="0" width="100%">
          <thead>
              <tr>
                  <th ><?=label("Customer");?> </th>
                  <th style="width:15%;"><?=label("Sales");?> <?=label("Man");?></th>
                  <th style="width:15%;text-align: center;"><?=label("Sales");?> <?=label("ID");?></th>
                  <th style="width:15%;text-align: center;"><?=label("Mobile");?></th>
                  <th style="width:15%;text-align: center;"><?=label("Purchase");?> <?=label("date");?></th>
                  <th style="width:15%;text-align: center;"><?=label("unpaid");?> <?=label("date");?></th>
                  <th style="text-align: center;"><?=label("Amounttopay");?></th>
              </tr>
          </thead>

          <tbody>
             <?php 

             $categories=mysql_query("select * from sales where salesperson > 0 order by id asc ");
             while($category=mysql_fetch_array($categories))
              {

             $ixc=$category['salesperson'];
             $usx=mysql_fetch_array(mysql_query("select * from users where id='".$ixc."' "));
             $idd=$category['created_at'];
             $crdays=$category['salesperson'];
for($i=1;$i<=$crdays;$i++)
{
$id=$category['id'];
$kmkm=mysql_fetch_array(mysql_query("select *,sum(paid) as kl from payements where sale_id='".$id."' and  date='".$idd."' group by date  "));
$pll=mysql_num_rows(mysql_query("select *,sum(paid) as kl from payements where sale_id='".$id."' and  date='".$idd."' group by date  "));
if($pll==0 && $idd <= date("Y-m-d"))
{
?>
              <tr>
                 <td><?=$category['clientname'];?></td>
                 <td style="width:15%;"><?php echo  $usx['firstname'].' '.$usx['lastname'];?></td>
                 <td style="width:15%;text-align: center;"><?=$category['id'];?></td>
                 <td style="width:15%;text-align: center;"><?=$category['mobnnm'];?></td>
                 <td style="width:15%;text-align: center;"><?=$category['created_at'];?></td>
                 <td style="width:15%;text-align: center;"><?=$idd;?></td>
                 <td style="text-align: right;margin-right: 50px;"><?php echo number_format((float)$category['total']-$category['paid'], $this->setting->decimals, '.', '');?></td>
                 




              </tr>
           <?php 

         }
         $idd=date('Y-m-d', strtotime("+1 day", strtotime($idd)));

           }



         } ?>
          </tbody>
      </table>
   </div>
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
