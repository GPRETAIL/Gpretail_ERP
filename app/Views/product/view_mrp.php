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
    // Google Transliteration API setup
    if (typeof google !== 'undefined') {
        google.load("elements", "1", {
            packages: "transliteration"
        });

        function onLoad() {
            var options = {
                sourceLanguage: 'en',
                destinationLanguage: ['<?= label("languagek"); ?>'],
                shortcutKey: 'ctrl+g',
                transliterationEnabled: true
            };
            var control = new google.elements.transliteration.TransliterationControl(options);
            var ids = ["hsn", "ProductName", "summernoted", "Unit"];
            control.makeTransliteratable(ids);
            control.showControl('translControl');
        }

        google.setOnLoadCallback(onLoad);
    }
</script>

<div class="container">
    <?php
    // Replaced deprecated MySQL functions with mysqli
    $rolr = $user->role;
    // $query = mysqli_query($db->conn_id, "SELECT * FROM permission_new WHERE nname='" . $rolr . "'");
    $permission = $db->table('permission_new')->where('nname', $rolr)->get()->getRowArray();
    // $kkar = mysqli_fetch_array($permission);
    ?>
    <h3><?= label("price_mrp"); ?></h3>
    <hr>

    <!-- Search Form -->
    <!-- <form method="POST" action="<?= site_url('products_mrp') ?>">
        <input type="text" name="search" placeholder="Search by Product Name or ID" value="<?= set_value('search') ?>" />
        <button type="submit">Search</button>
    </form> -->

    <!-- Product Table -->
    <div class="row" style="margin-top:10px;">
        <form method="post" action="<?= base_url(); ?>ProductsMrp/addinis">
            <div class="row rangeStat" style="margin-top:1px;">



                <div class="col-sm-2 ">
                    <div class="form-group"><?= label("price_method"); ?>

                        <select required="required" class="form-control" id="prince_mas" name="prince_mas" onchange="getRegisterReport();">
                            <option value="0">Store</option>
                         
                            <?php
                            $rt = $db->table('price_master')->orderBy('name', 'ASC')->get()->getResultArray();
                             foreach ($rt as $item): ?>
                                <option value="<?= esc($item['id']) ?>"><?= esc($item['name']) ?></option>
                            <?php endforeach; ?>
                            </select>



                    </div>
                </div>


                <div class="col-sm-2 ">
                    <div class="form-group">Price %
                        <input type="text" maxlength="2" onkeyup="call_all(this.value);" required="required" value="0" name="pddate" class="form-control" id="pddate" placeholder="from Date">

                    </div>
                </div>
                <div class="col-md-2">
                    <input type="submit" style="text-align: right;margin-top:17px;" class="dt-button buttons-excel buttons-html5 btn btn-default" value="Save" />
                </div>
                <br>



            </div>

            <div id="RegisterDetails">
                <table class="table table-striped table-bordered" cellspacing="0" id="Table3" style="width: 100%;">
                    <thead>
                        <tr>
                            <th class="hidden-xs"><?= label("ID"); ?></th>
                            <th><?= label("Product"); ?> <?= label("Name"); ?></th>
                            <th style="text-align: center;">MRP Store <?= label("Price"); ?></th>
                            <th style="text-align: center;" width="30%"><?= label("Update Price"); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                            <?php if (!empty($products)) : ?>
                                <?php foreach ($products as $product) : ?>
                                    <tr>
                                        <td><?= esc($product->id) ?></td>
                                        <td><?= esc($product->name) ?></td>
                                        <td style="text-align: center;" class="hidden-xs"><?= esc($product->rrate) ?></td>
                                        <td style="text-align: center;">
                                            <input type="hidden" name="pro_pprice[]" id="pro_pprice_<?= esc($product->id) ?>" value="<?= esc($product->rrate) ?>">
                                            <input type="hidden" class="pro_iid" name="pro_iid[]" id="pro_iid" value="<?= esc($product->id) ?>">
                                            <input type="text" name="product_price[]" id="product_price_<?= esc($product->id) ?>" value="<?= number_format((float)$product->rrate, $setting->decimals ?? 2, decimal_separator: '.', thousands_separator: '') ?>">
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php else : ?>
                                <tr>
                                    <td colspan="4">No products found.</td>
                                </tr>
                            <?php endif; ?>
                            <tr>
                                <td colspan="4" style="text-align: center;">No products found</td>
                            </tr>
                        
                    </tbody>
                </table>
            </div>

            <!-- Pagination Links -->
            <div class="pagination-links">
                <?= $pagination ?>
            </div>
        </form>
    </div>
</div>

<!-- Modal -->
<?php view('modals/_imageViewer'); ?>

<!-- External Scripts -->
<script src="<?= base_url() ?>assets/js/jquery-ui.min.js"></script>
<script src="<?= base_url() ?>assets/js/datatables.min.js" type="text/javascript"></script>

<!-- DataTables Initialization -->
<script>
    $(function() {
        $('#Table3').dataTable({
            buttons: [],
            "order": [
                [0, 'desc']
            ],
            "lengthMenu": [
                [-1],
                ["All"]
            ],
            "pageLength": -1,
            "dom": "<'row'<'col-md-12'B>><'row'<'col-md-6 col-sm-12'l><'col-md-6 col-sm-12'f>r><'table-scrollable't><'row'<'col-md-5 col-sm-12'i><'col-md-7 col-sm-12'p>>"
        });
    });
</script>

<!-- Price Calculation Script -->
<script>
    function call_all(hnhh) {
        $('.pro_iid').each(function() {
            var ttt = $(this).val();
            var pprice = $('#pro_pprice_' + ttt).val();
            var totall = parseFloat(pprice) + (parseFloat(pprice) * parseFloat(hnhh) * 0.01);
            $('#product_price_' + ttt).val(totall.toFixed(2));
        });
    }
</script>

<!-- AJAX Report Update -->
<script type="text/javascript">
    function getRegisterReport() {
        var Range = $('#prince_mas').val();
        $.ajax({
            url: "<?= site_url('reports/view_mrp_more') ?>",
            type: "POST",
            data: {
                Range: Range
            },
            success: function(data) {
                $('#RegisterDetails').html(data);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert("error");
            }
        });
    }
</script>

<!-- Custom CSS -->
<style type="text/css">
    .dt-buttons {
        text-align: right;
    }

    @media print {
        body {
            overflow: auto;
            height: 100%;
        }

        @page {
            size: auto;
            margin: 0;
        }
    }
</style>