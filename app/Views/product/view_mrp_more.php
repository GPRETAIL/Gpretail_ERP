      <table  style="width: 60%;" class="table table-striped table-bordered" cellspacing="0"  >
          <thead>
              <tr>
                  <th class="hidden-xs"><?=label("ID");?></th>
                  <th><?=label("Product");?> <?=label("Name");?></th>
                  
                  <th style="text-align: center;" >MRP Store <?=label("Price");?> </th>
                  
                  
                  <th   style="text-align: center;"  width="30%"><?=label("Update Price");?></th>
                  
                  
              </tr>
          </thead>

          <tbody>
            
<?php 
$ollo=mysql_query("select * from products order by name asc");
while($product=mysql_fetch_object($ollo))
{
if($prince_mas==0)
{
  $pppp_price=$product->rrate;
}
else
{
$myy=mysql_fetch_array(mysql_query("select * from price_mrp where pp_pro_id ='".$product->id."' and pp_price_type ='".$prince_mas."'  "));
if($myy)
{
$pppp_price=$myy['pp_pro_price'];
}
else
{
$pppp_price=0;
}
}
?>
              <tr>
              
<td><?=$product->id;?></td>
<td><?=$product->name;?></td>
<td style="text-align: center;" class="hidden-xs"><?=$product->rrate;?></td>
<td style="text-align: center;"  >
 <input type="hidden" name="pro_pprice[]" id="pro_pprice_<?php echo $product->id;?>" value="<?=$product->rrate;?>"> 
 <input type="hidden" class="pro_iid" name="pro_iid[]" id="pro_iid" value="<?php echo $product->id;?>"> 
 <input type="text" name="product_price[]" id="product_price_<?php echo $product->id;?>" value="<?php echo number_format((float)$pppp_price, $this->setting->decimals, '.', '');?>"> 
</td>
</tr>
           <?php }?>
          </tbody>
      </table>
   