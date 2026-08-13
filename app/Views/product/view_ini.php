<style>
    .pagination-links {
        width: 100%;
        text-align: center;
    }

    .pagination-links a,
    .pagination-links strong {
        margin-left: 5px;
    }
</style>

<!-- Page Content -->
<script type="text/javascript" src="https://www.google.com/jsapi"></script>
<script type="text/javascript">
    google.load("elements", "1", {
        packages: "transliteration"
    });

    function onLoad() {
        var options = {
            sourceLanguage: 'en', // or google.elements.transliteration.LanguageCode.ENGLISH,
            destinationLanguage: [
                '<?= label('languagek') ?>'
            ], // or [google.elements.transliteration.LanguageCode.HINDI],
            shortcutKey: 'ctrl+g',
            transliterationEnabled: true
        };
        var control = new google.elements.transliteration.TransliterationControl(options);
        var ids = ["hsn", "ProductName", "summernoted", "Unit"];
        control.makeTransliteratable(ids);
        control.showControl('translControl');
    }
    google.setOnLoadCallback(onLoad);
</script>

<div class="container">
    <?php
    $rolr = $user->role;
    $kkar = mysql_fetch_array(mysql_query("select * from permission_new where nname='" . $rolr . "'  "));
    ?>
    <h3> <?= label('initial_stock') ?>


    </h3>

    <hr>

    <div class="row" style="margin-top:10px;">
        <form method="post" action="<?php echo base_url(); ?>products_inistock/addinis">

            <input type="submit" style="text-align: right;" class="dt-button buttons-excel buttons-html5 btn btn-default"
                value="Save" />

            <table id="Table3" class="table table-striped table-bordered" cellspacing="0" width="60%">
                <thead>
                    <tr>
                        <th class="hidden-xs"><?= label('ID') ?></th>
                        <th><?= label('Product') ?> <?= label('Name') ?></th>
                        <th><?= label('Price') ?> </th>

                        <th><?= label('current Stock') ?></th>
                        <th><?= label('initial Stock') ?></th>
                        <th style="text-align: center;"><?= label('Update Stock') ?></th>
                    </tr>
                </thead>

                <tbody>

                    <?php
                    //   $categories=mysql_query("select pro.id, pro.name, pro.price, stt.quantity,sum(str.qty) as qty_plus   from products as pro 
                    //   left join stocks as stt  on  stt.product_id=pro.id 
                    //   left join stock_transfer as  str on str.pro_id=pro.id  where str.tyoftrans=5 GROUP by pro.id  
                    //   ORDER BY `pro`.`name`  ASC ");

                    foreach ($products as $product) {
                    ?>
                        <tr>
                            <td><?= $product->id ?></td>
                            <td><?= $product->name ?></td>

                            <td style="text-align: center;" class="hidden-xs"><?= $product->price ?></td>


                            <td style="text-align: center;" class="hidden-xs"><?php echo intval($product->quantity); ?></td>
                            <td style="text-align: center;" class="hidden-xs"><?php echo intval($product->qty_plus); ?></td>
                            <td style="text-align: center;"><?php echo (isset($stor_ddf['name']) ? $stor_ddf['name'] : ""); ?>
                                <input type="text" name="qtty_iid[<?php echo $product->id; ?>][<?php echo intval($product->qty_plus); ?>]"
                                    id="qtty_iid" value="">

                            </td>
                        </tr>
                    <?php
                    }
                    ?>
                </tbody>
            </table>
        </form>
        <div class="pagination-links">
            <?= $pager->links() ?>
        </div>
    </div>
    <style type="text/css" media="print">
        body {
            overflow: auto;
            height: 100%;


        }

        @page {

            size: auto;
            /* auto is the initial value */
            margin: 0;
            /* this affects the margin in the printer settings */
        }
    </style>
    <!-- Button trigger modal -->




</div>
<!-- /.container -->
<?php $this->load->view('modals/_imageViewer'); ?>

<script src="<?= base_url() ?>assets/js/jquery-ui.min.js"></script>








<style type="text/css">
    .dt-buttons {
        text-align: right;
    }
</style>

<script src="<?php echo base_url(); ?>assets/js/datatables.min.js" type="text/javascript"></script>

<script type="text/javascript">
    $(function() {
        var TableDatatablesButtons = function() {
            var table = $('#Table3');
            var oTable = table.dataTable({
                buttons: [{}],
                "order": [
                    [0, 'desc']
                ],
                "lengthMenu": [
                    [-1],
                    ["All"] // change per page values here
                ],
                // set the initial value
                "pageLength": -1,
                "dom": "<'row' <'col-md-12'B>><'row'<'col-md-6 col-sm-12'l><'col-md-6 col-sm-12'f>r><'table-scrollable't><'row'<'col-md-5 col-sm-12'i><'col-md-7 col-sm-12'p>>", // horizobtal scrollable datatable
                // Uncomment below line("dom" parameter) to fix the dropdown overflow issue in the datatable cells. The default datatable layout
                // setup uses scrollable div(table-scrollable) with overflow:auto to enable vertical scroll(see: assets/global/plugins/datatables/plugins/bootstrap/dataTables.bootstrap.js). 
                // So when dropdowns used the scrollable div should be removed. 
                //"dom": "<'row' <'col-md-12'T>><'row'<'col-md-6 col-sm-12'l><'col-md-6 col-sm-12'f>r>t<'row'<'col-md-5 col-sm-12'i><'col-md-7 col-sm-12'p>>",
            });
        }();
        jQuery(document).ready(function() {
            TableDatatablesButtons.init();
        });
    });
</script>