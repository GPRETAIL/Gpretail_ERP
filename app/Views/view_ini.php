<!-- Page Content -->
<script type="text/javascript" src="https://www.google.com/jsapi"></script>
<script type="text/javascript">
    google.load("elements", "1", {
        packages: "transliteration"
    });

    function onLoad() {
        var options = {
            sourceLanguage: 'en', // or google.elements.transliteration.LanguageCode.ENGLISH,
            destinationLanguage: ['<?= label("languagek"); ?>'], // or [google.elements.transliteration.LanguageCode.HINDI],
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
    $rolr = $this->user->role;
    $kkar = $db->query("select * from permission_new where nname='" . $rolr . "'");
    ?>
    <h3><?= label("initial_stock"); ?></h3>
    Showing latest 300 records only
    <hr>

    <div class="row" style="margin-top:10px;">
        <form method="post" action="<?php echo base_url(); ?>products_inistock/addinis">

            <input type="submit" style="text-align: right;" class="dt-button buttons-excel buttons-html5 btn btn-default" value="Save" />

            <table id="Table3" class="table table-striped table-bordered" cellspacing="0" width="100%">
                <thead>
                    <tr>
                        <th class="hidden-xs"><?= label("ID"); ?></th>
                        <th><?= label("Product"); ?> <?= label("Name"); ?></th>
                        <th><?= label("Price"); ?></th>
                        <th width="30%"><?= label("Update Stock"); ?></th>
                        <th width="30%"><?= label("initial Stock"); ?></th>
                        <th width="30%"><?= label("Available Stock"); ?></th>
                    </tr>
                </thead>

                <tbody>
                    <?php
                    $categories = $db->query("select * from products order by id desc limit 100")->getResult();
                    foreach ($categories as $product) {
                    ?>
                        <tr>
                            <td><?= $product->id; ?></td>
                            <td><?= $product->name; ?></td>
                            <td style="text-align: center;" class="hidden-xs"><?= $product->price; ?></td>
                            <td style="text-align: center;">
                                <?php
                                $stor_dty = $db->query("select * from stores order by name asc")->getRowArray();
                                foreach ($stor_dty as $stor_ddf) {
                                    $frcc = $db->query("select *,sum(qty) as qty_plus from stock_transfer where store_id='" . $stor_ddf['id'] . "' and pro_id='" . $product->id . "' and tyoftrans=5")->getRowArray();
                                ?>
                                    <div style="width: 100%; margin-bottom: 20px;">
                                        <span style="float: left; width: 49%; text-align: left;">
                                            <?php echo $stor_ddf['name']; ?>
                                        </span>
                                        <span style="float: left; width: 49%;">
                                            <input type="hidden" name="store_iid[]" id="store_iid" value="<?php echo $stor_ddf['id']; ?>">
                                            <input type="hidden" name="pro_iid[]" id="pro_iid" value="<?php echo $product->id; ?>">
                                            <input type="text" name="qtty_iid[]" id="qtty_iid" value="<?php echo intval($frcc['qty_plus']); ?>">
                                            <input type="hidden" name="qtty_iall[]" id="qtty_iall" value="<?php echo intval($frcc['qty_plus']); ?>">
                                        </span>
                                    </div>
                                <?php echo "<br>";
                                } ?>
                            </td>
                            <td style="text-align: center;" class="hidden-xs">
                                <?php
                                $stor_dty = $db->query("select * from stores order by name asc")->getRowArray();
                                foreach ($stor_dty as $stor_ddf) {
                                    $frcc = $db->query("select *,sum(qty) as qty_plus from stock_transfer where store_id='" . $stor_ddf['id'] . "' and pro_id='" . $product->id . "' and tyoftrans=5")->getRowArray();
                                ?>
                                    <div style="width: 100%; margin-bottom: 20px;">
                                        <span style="float: left; width: 49%; text-align: left;">
                                            <?php echo $stor_ddf['name']; ?>
                                        </span>
                                        <span style="float: left; width: 49%;">
                                            <?php echo intval($frcc['qty_plus']); ?>
                                        </span>
                                    </div>
                                <?php echo "<br>";
                                } ?>
                            </td>
                            <td style="text-align: center;" class="hidden-xs">
                                <?php
                                $stor_dty = $db->query("select * from stores order by name asc")->getRowArray();
                                foreach ($stor_dty as $stor_ddf) {
                                    $frcc_st = $db->query("select * from stocks where store_id='" . $stor_ddf['id'] . "' and product_id='" . $product->id . "'")->getRowArray();
                                ?>
                                    <div style="width: 100%; margin-bottom: 20px;">
                                        <span style="float: left; width: 49%; text-align: left;">
                                            <?php echo $stor_ddf['name']; ?>
                                        </span>
                                        <span style="float: left; width: 49%;">
                                            <?php echo intval($frcc_st['quantity']); ?>
                                        </span>
                                    </div>
                                <?php echo "<br>";
                                } ?>
                            </td>
                        </tr>
                    <?php } ?>
                </tbody>
            </table>
        </form>
    </div>
    <style type="text/css" media="print">
        body {
            overflow: auto;
            height: 100%;
        }

        @page {
            size: auto;
            margin: 0;
        }
    </style>

    <!-- Button trigger modal -->
</div>
<!-- /.container -->
<?php echo $this->load->view('modals/_imageViewer'); ?>

<script src="<?= base_url() ?>assets/js/jquery-ui.min.js"></script>

<style type="text/css">
    .dt-buttons {
        text-align: right;
    }
</style>

<script src="<?php echo base_url(); ?>assets/js/datatables.min.js" type="text/javascript"></script>

<script>
    // $(function() {
    //     var TableDatatablesButtons = function() {
    //         var table = $('#Table3');
    //         var oTable = table.DataTable({
    //             buttons: [],
    //             "order": [
    //                 [0, 'desc']
    //             ],
    //             "lengthMenu": [
    //                 [10, 25, 50, -1], // Define how many records to show per page
    //                 [10, 25, 50, "All"] // Labels for the above numbers
    //             ],
    //             "pageLength": 10, // Set default number of rows per page
    //             "paging": true, // Enable pagination
    //             "dom": "<'row' <'col-md-12'B>><'row'<'col-md-6 col-sm-12'l><'col-md-6 col-sm-12'f>r><'table-scrollable't><'row'<'col-md-5 col-sm-12'i><'col-md-7 col-sm-12'p>>", // Layout with pagination
    //         });
    //     }();

    //     jQuery(document).ready(function() {
    //         TableDatatablesButtons.init();
    //     });
    // });
    $(function() {
        // Initialize DataTable on page load
        $('#Table3').DataTable({
            buttons: [], // Add buttons if needed
            order: [
                [0, 'desc']
            ],
            lengthMenu: [
                [10, 25, 50, -1],
                [10, 25, 50, "All"]
            ],
            pageLength: 10,
            paging: true,
            dom: "<'row'<'col-md-12'B>>" +
                "<'row'<'col-md-6 col-sm-12'l><'col-md-6 col-sm-12'f>r>" +
                "<'table-scrollable't>" +
                "<'row'<'col-md-5 col-sm-12'i><'col-md-7 col-sm-12'p>>"
        });
    });
</script>