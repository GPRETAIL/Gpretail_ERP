<!-- Page Content -->
<div class="container">
    <?php

    $rolr = $user->role;
    $kkar = $db->query("select * from permission_new where nname='" . $rolr . "'  ")->getRowArray();
    ?>

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
            var ids = ["CategoryName"];
            control.makeTransliteratable(ids);
            control.showControl('translControl');
        }
        google.setOnLoadCallback(onLoad);
    </script>





    <h3>
        <?= label("tax"); ?> <?php if ($kkar['taxa'] == 1) { ?>
            <button style="float: right;" class="btn btn-primary btn-green" type="button" class="btn btn-add btn-lg btn-taxes" data-toggle="modal" data-target="#purchaseTaxModal">
                <?= label("Add Sales Taxes"); ?>
            </button>


            <button style="float: right; margin-right: 10px;" class="btn btn-primary btn-green" type="button" class="btn btn-add btn-lg btn-taxes" data-toggle="modal" data-target="#Addcategory">
                <?= label("Add Purchase Taxes"); ?>
            </button>
        <?php } ?>
        <?php if ($kkar['taxa'] == 1) { ?>
            <!-- <button style="float: right; margin-right: 10px;" class="btn btn-primary btn-green" type="button" class="btn btn-add btn-lg" data-toggle="modal" data-target="#taxTypeModal">
                <?= label("Add Tax Zone"); ?>
            </button> -->
        <?php } ?>
    </h3>
    <hr>
    <?php if (false) { ?>
        <div class="row" style="margin-top:20px;">
            <h4>Tax Zones</h4>
            <table id="Table2" class="table table-striped table-bordered" cellspacing="0" width="100%">
                <thead>
                    <tr>
                        <th style="width:60px;"><?= label("id"); ?></th>
                        <th><?= label("Tax Zone"); ?> </th>
                        <th><?= label("CreatedAt"); ?></th>
                        <th><?= label("Action"); ?></th>
                    </tr>
                </thead>

                <tbody>
                    <?php
                    $taxtypes = $db->table('taxtype')->get()->getResult();
                    foreach ($taxtypes as $taxtype) {
                    ?>
                        <tr>
                            <td><?= $taxtype->id; ?></td>
                            <td><?= $taxtype->taxtype ?></td>
                            <td>
                                <?php
                                echo date("d-m-Y", strtotime($taxtype->created_at));
                                ?>
                            </td>
                            <td>
                                <div class="btn-group">
                                    <?php if ($kkar['taxd'] == 1) { ?>
                                        <a class="btn btn-default" href="javascript:void(0)" data-toggle="popover" data-placement="left" data-html="true" title='<?= label("Areyousure"); ?>' data-content='<a class="btn btn-danger" href="tax/delete_taxtype/<?= $taxtype->id; ?>"><?= label("yesiam"); ?></a>'><i class="fa fa-times"></i></a><?php } ?>

                                    <?php if ($kkar['taxe'] == 1) { ?>
                                        <a class="btn btn-default" href="tax/edit_taxtype/<?= $taxtype->id; ?>" data-toggle="tooltip" data-placement="top" title="<?= label('Edit'); ?>"><i class="fa fa-pencil"></i></a><?php } ?>
                                </div>
                            </td>
                        </tr>
                    <?php  } ?>
                </tbody>
            </table>
        </div>
    <?php } ?>
    <hr>
    <div class="row" style="margin-top:20px;">
        <h4>Taxes</h4>
        <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
            <thead>
                <tr>
                    <th style="width:60px;"><?= label("tax"); ?> <?= label("id"); ?></th>
                    <th><?= label("Tax Zone"); ?> </th>
                    <th><?= label("Tax"); ?> <?= label("Name"); ?></th>
                    <th><?= label("Tax Type"); ?> </th>
                    <th><?= label("Tax"); ?> % </th>
                    <th><?= label("Created At"); ?></th>
                    <th><?= label("Tax Default"); ?> </th>
                    <th><?= label("Tax for"); ?> </th>
                    <th><?= label("Action"); ?></th>
                </tr>
            </thead>

            <tbody>
                <?php
                $categories = $db->query("SELECT * FROM tax WHERE status=1  ORDER BY name ASC ")->getResult();
                foreach ($categories as $category) {
                ?>
                    <tr>
                        <td><?= $category->id; ?></td>
                        <td>
                            <?php
                            if ($category->custtype == 1) {
                                echo 'Local State';
                            } elseif ($category->custtype == 2) {
                                echo 'Other State';
                            } elseif ($category->custtype == 3) {
                                echo 'GST';
                            } else {
                                $taxtypeRow = $db->table('taxtype')->where('id', $category->custtype)->get()->getRow();
                                echo $taxtypeRow->taxtype ?? '';
                            }
                            ?>
                        </td>


                        <td><?= $category->name; ?></td>
                        <td><?= $category->taxtype == 1 ? 'Inclusive' : "Exclusive"; ?></td>
                        <td>
                            <?php
                            if ($category->tax_for == 1) {
                                if ($category->custtype == 1) {
                                    echo 'CGST-' . $category->cgst . '%<br>';
                                    echo 'SGST-' . $category->sgst . '%';
                                }

                                if ($category->custtype == 2) {
                                    echo 'IGST-' . $category->igst . '%';
                                }

                                if ($category->custtype == 3) {
                                    echo 'GST-' . $category->gst . '%';
                                }
                            } else {
                                echo $category->valueper . '%';
                            }
                            ?>
                        </td>
                        <td>
                            <?php
                            echo date("d-m-Y H:i:s", strtotime($category->created_at));
                            ?>
                        </td>
                        <td><?= $category->taxdefault == 1 ? "Yes" : "No" ?></td>
                        <td><?= $category->tax_for == 1 ? "Purchase" : "Sales" ?></td>
                        <td>
                            <div class="btn-group">
                                <?php if ($kkar['taxd'] == 1) { ?>
                                    <a class="btn btn-default" href="javascript:void(0)" data-toggle="popover" data-placement="left" data-html="true" title='<?= label("Areyousure"); ?>' data-content='<a class="btn btn-danger" href="tax/delete/<?= $category->id; ?>"><?= label("yesiam"); ?></a>'><i class="fa fa-times"></i></a><?php } ?>

                                <?php if ($kkar['taxe'] == 1) { ?>
                                    <a class="btn btn-default" href="tax/edit/<?= $category->id; ?>" data-toggle="tooltip" data-placement="top" title="<?= label('Edit'); ?>"><i class="fa fa-pencil"></i></a><?php } ?>
                            </div>
                        </td>
                    </tr>
                <?php  } ?>
            </tbody>
        </table>
    </div>
    <!-- Button trigger modal -->

</div>
<!-- /.container -->


<!-- Modal -->
<!-- Sales Tax add modal  -->
<div class="modal fade" id="Addcategory" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="myModalLabel"><?= label("Add"); ?></h4>
            </div>
            <?php echo form_open_multipart('tax/add'); ?>
            <div class="modal-body">
                <div class="form-group">
                    <label for="taxZone"><?= label("Tax"); ?> <?= label("Zone"); ?></label>
                    <select class="form-control" name="custtype" id="taxZone">
                        <option value="1" data-val="local_state">Local State</option>
                        <option value="2" data-val="other_state">Other State</option>
                        <option value="3" data-val="gst">GST</option>

                    </select>
                    <!-- <input type="text" name="custtype" id="custtype" class="form-control"> -->
                </div>
                <div class="form-group">
                    <label for="CategoryName"><?= label("Tax"); ?> <?= label("Name"); ?></label>
                    <input type="text" maxlength="50" name="CategoryName" class="form-control" id="CategoryName">
                </div>

                <div class="form-group  local_state txZone">
                    <label for="cgst"><?= label("CGST"); ?>(%)</label>
                    <input type="text" name="cgst" class="form-control" id="cgst">
                </div>

                <div class="form-group local_state txZone">
                    <label for="sgst"><?= label("SGST"); ?>(%)</label>
                    <input type="text" name="sgst" class="form-control" id="sgst">
                </div>

                <div class="form-group gst txZone">
                    <label for="sgst"><?= label("GST"); ?>(%)</label>
                    <input type="text" name="gst" class="form-control" id="gst">
                </div>

                <div class="form-group other_state txZone">
                    <label for="igst"><?= label("IGST"); ?>(%)</label>
                    <input type="text" name="igst" class="form-control" id="igst">
                </div>

                <!-- <div class="form-group">
                    <label for="CategoryName"><?= label("Tax"); ?>(%)</label>
                    <input type="text" maxlength="5" name="persent" class="form-control" id="persent">
                </div> -->

                <div class="form-group">
                    <label for="CategoryName"><?= label("Tax"); ?> <?= label("Type"); ?></label>
                    <select class="form-control" name="taxtype" id="taxtype" required>
                        <option value="">Select</option>
                        <option value="1">Inclusive</option>
                        <option value="2">Exclusive</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="CategoryName"><?= label("Tax"); ?> <?= label("Default"); ?></label>
                    <select class="form-control" name="default" id="default">
                        <option value="1">Yes</option>
                        <option value="2" selected>No</option>
                    </select>
                </div>


            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal"><?= label("Close"); ?></button>
                <button type="submit" class="btn btn-add"><?= label("Submit"); ?></button>
            </div>
            <?php echo form_close(); ?>
        </div>
    </div>
</div>

<div class="modal fade" id="taxTypeModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="myModalLabel"><?= label("Add"); ?></h4>
            </div>
            <?php echo form_open_multipart('tax/add_type'); ?>
            <div class="modal-body">
                <div class="form-group">
                    <label for="CategoryName"><?= label("tax"); ?> <?= label("Method"); ?></label>
                    <input type="text" maxlength="50" name="taxtype" class="form-control" required>
                </div>
            </div>
            <input type="hidden" name="tax_for" value="0">
            <!-- O=Sales Tax and 1=Purchase Tax  -->
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal"><?= label("Close"); ?></button>
                <button type="submit" class="btn btn-add"><?= label("Submit"); ?></button>
            </div>
            <?php echo form_close(); ?>
        </div>
    </div>
</div>
<!-- /.Modal -->



<!-- Purchase Tax add modal  -->
<div class="modal fade" id="purchaseTaxModal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <h4 class="modal-title" id="myModalLabel"><?= label("Add"); ?></h4>
            </div>
            <?php echo form_open_multipart('tax/add'); ?>
            <div class="modal-body">
                <div class="form-group">
                    <label for="taxZone"><?= label("Tax"); ?> <?= label("Zone"); ?></label>
                    <select class="form-control" name="custtype" id="taxZone">
                        <option value="1" data-val="local_state">Local State</option>
                        <option value="2" data-val="other_state">Other State</option>
                        <option value="3" data-val="gst">GST</option>
                        <!-- <?php
                                $tax_method = $db->table('taxtype')->get()->getResult();
                                foreach ($tax_method as $key => $value) { ?>
                            <option value="<?= $value->id ?>"><?= $value->taxtype ?></option>
                        <?php }
                        ?> -->
                    </select>
                    <!-- <input type="text" name="custtype" id="custtype" class="form-control"> -->
                </div>
                <div class="form-group">
                    <label for="CategoryName"><?= label("Tax"); ?> <?= label("Name"); ?></label>
                    <input type="text" maxlength="50" name="CategoryName" class="form-control" id="CategoryName">
                </div>

                <div class="form-group">
                    <label for="CategoryName"><?= label("Tax"); ?>(%)</label>
                    <input type="text" maxlength="5" name="persent" class="form-control" id="persent">
                </div>

                <div class="form-group">
                    <label for="CategoryName"><?= label("Tax"); ?> <?= label("Type"); ?></label>
                    <select class="form-control" name="taxtype" id="taxtype" required>
                        <option value="">Select</option>
                        <option value="1">Inclusive</option>
                        <option value="2">Exclusive</option>
                    </select>
                </div>
                <input type="hidden" name="tax_for" value="1">
                <!-- O=Sales Tax and 1=Purchase Tax  -->
                <div class="form-group">
                    <label for="CategoryName"><?= label("Tax"); ?> <?= label("Default"); ?></label>
                    <select class="form-control" name="default" id="default">
                        <option value="1">Yes</option>
                        <option value="2" selected>No</option>
                    </select>
                </div>


            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-default" data-dismiss="modal"><?= label("Close"); ?></button>
                <button type="submit" class="btn btn-add"><?= label("Submit"); ?></button>
            </div>
            <?php echo form_close(); ?>
        </div>
    </div>
</div>