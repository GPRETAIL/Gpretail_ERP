<div class="container">
    <?php

    $rolr = $user->role;
    $kkar = $db->query(("select * from permission_new where nname='" . $rolr . "'  "))->getRowArray();


    if ($setting->ooffr == 0 || $kkar['offv'] == 0) {
        redirect('help');
    }



    ?>

    <h3><?= label('offers'); ?> <?php if ($kkar['offa'] == 1) { ?><a style="float: right;" class="btn btn-primary btn-green" href="<?php echo base_url(); ?>offers/add"><?= label('Add Offers'); ?></a>
        <?php } ?>


    </h3>
    <hr>



    <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead class="thead-inverse">
            <tr>
                <th style="text-align: center;"><?= label('Date'); ?></th>
                <th style="text-align: center;"><?= label('ID'); ?> </th>
                <th style="text-align: center;"><?= label('Barcode No'); ?> </th>
                <th style="text-align: center;"><?= label('Products'); ?> </th>
                <th style="text-align: center;"><?= label('sellingprice'); ?></th>
                <th style="text-align: center;"><?= label('offerprice'); ?></th>
                <th style="text-align: center;"><?= label('validfrom'); ?> </th>
                <th style="text-align: center;"><?= label('validtill'); ?> </th>
                <th style="text-align: center;"><?= label('Qty'); ?> </th>
                <th style="text-align: center;"><?= label('createdby'); ?> </th>
                <th style="text-align: center;"><?= label('Status'); ?></th>
                <th style="text-align: center;"><?= label('Action'); ?></th>
            </tr>
        </thead>
        <tbody>

            <?php
            $lxzmm = $db->query(("SELECT * from settings where id=1 "))->getRowArray();
            $rolr = $user->role;
            $kkar = $db->query(("SELECT * from permission_new where nname='" . $rolr . "'  "))->getRowArray();
            $query = $db->query("SELECT *  FROM offers   order by of_id desc ");
            $list = $query->getResult();
            foreach ($list as $invoice) {
                $product_tab = $db->query(("SELECT * from products where id='" . $invoice->of_proid . "' "))->getRowArray();
                $user_tab = $db->query(("SELECT * from users where id='" . $invoice->of_created . "' "))->getRowArray();
            ?>

                <tr>
                    <td style="text-align: center;"><?php echo date("d-m-Y", strtotime($invoice->of_today)); ?></td>
                    <td style="text-align: center;"><?php echo $invoice->of_id; ?></td>
                    <td style="text-align: center;"><?php echo isset($product_tab['code']) ? $product_tab['code'] : ''; ?></td>
                    <td style="text-align: center;"> <?php echo isset($product_tab['name']) ? $product_tab['name'] : ''; ?></td>
                    <td style="text-align: center;"> <?php echo $invoice->of_sellingprice; ?></td>
                    <td style="text-align: center;"> <?php echo $invoice->of_offerprice; ?></td>
                    <td style="text-align: center;"><?php echo $invoice->of_validfrom ?></td>
                    <td style="text-align: center;"><?php echo $invoice->of_validtill ?></td>
                    <td style="text-align: center;"><?php echo $invoice->qty ?></td>
                    <td style="text-align: center;"> <?php echo $user_tab['firstname'] . ' ' . $user_tab['lastname']; ?></td>
                    <td style="text-align: center;">

                        <?php if (date('Y-m-d') > $invoice->of_validtill): ?>
                            <span style="display: inline-block; padding: 8px 16px; font-size: 14px; font-weight: bold; text-align: center; background-color: #dc3545; color: white; width: 120px; border-radius: 8px;">
                                Expired
                            </span>
                        <?php else: ?>
                            <span style="display: inline-block; padding: 8px 16px; font-size: 14px; font-weight: bold; text-align: center; background-color: #28a745; color: white; width: 120px; border-radius: 8px;">
                                Available
                            </span>
                        <?php endif; ?>
                    </td>


                    <td style="text-align: center;">
                        <?php
                        //  && $invoice->of_status == 1
                        if ($kkar['offe'] == 1) {
                        ?>
                            <div class="btn-group">
                                <button class="btn btn-primary dropdown-toggle" data-toggle="dropdown">
                                    <i class="fa fa-cog fa-fw"></i>
                                    <span class="fa fa-caret-down" title="Toggle dropdown menu"></span>
                                </button>
                                <ul class="dropdown-menu">
                                    <li>
                                        <a href="<?php echo base_url(); ?>offers/edit/<?php echo $invoice->of_id; ?>" title="Edit">
                                            <i class="fa fa-pencil"></i> Edit
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#" onclick="delete_offer(<?php echo $invoice->of_id; ?>)" title="Delete">
                                            <i class="fa fa-trash"></i> Delete
                                        </a>
                                    </li>
                                </ul>
                            </div>



                        <?php
                        }
                        ?>

                    </td>
                </tr>
            <?php } ?>

        </tbody>
    </table>



</div>

<script>
    function delete_offer(id) {

        swal({
                title: '<?= label('Areyousure') ?>',
                type: "warning",
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                confirmButtonText: 'Yes',
                closeOnConfirm: false
            },
            function() {
                window.location.href = '<?php echo base_url(); ?>offers/delete_offer/' + id;
                swal.close();
            });
    }
</script>