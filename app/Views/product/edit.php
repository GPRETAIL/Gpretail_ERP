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



<script type="text/javascript">
    $(function() {

        $('#Type').on('change', function() {
            if (this.value == 1) //if service
            {
                $("#pushaceP").slideUp();
                $("#alertqty").slideUp();
                $("#supply").slideUp();
                $("#UnitP").slideUp();
            } else if (this.value == 2) {
                $("#pushaceP").slideUp();
                $("#alertqty").slideUp();
                $("#supply").slideUp();
                $("#UnitP").slideUp();
            } else {
                $("#pushaceP").slideDown();
                $("#alertqty").slideDown();
                $("#supply").slideDown();
                $("#UnitP").slideDown();
            }
        });
        if (<?= $product->type !== null ? $product->type : 1; ?> == 1) //if service
        {
            $("#pushaceP").slideUp();
            $("#supply").slideUp();
            $("#alertqty").slideUp();
            $("#UnitP").slideUp();
        } else if (<?= $product->type ?> == 2) {
            $("#pushaceP").slideUp();
            $("#alertqty").slideUp();
            $("#supply").slideUp();
            $("#UnitP").slideUp();
        } else {
            $("#pushaceP").slideDown();
            $("#supply").slideDown();
            $("#alertqty").slideDown();
            $("#UnitP").slideDown();
        }

    });
</script>
<div class="container" style="width: 60%;padding-left: 15px;border: 1px solid #c9c9c9;">

    <h3><?= label("Edit"); ?> <a class="btn btn-default float-right" href="#" onclick="history.back(-1)" style="margin-bottom:10px;">
            <i class="fa fa-arrow-left"></i> <?= label("Back"); ?></a></h3>
    <hr>
    <div class="row" style="margin-top:20px;">

        <?php echo form_open_multipart('products/edit/' . $product->id); ?>


        <input type="hidden" class="form-control" name="type" id="Type" value="0">







        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="ProductCode"><?= label("HSN"); ?></label>
            <input type="text" name="hsn" maxlength="30" Required value="<?= $product->hsn; ?>" class="form-control" id="hsn" placeholder="<?= label("ProductCode"); ?>">

        </div>


        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="ProductName"><?= label("ProductName"); ?></label>
            <input type="text" name="name" maxlength="50" Required value="<?= $product->name; ?>" class="form-control" id="ProductName" placeholder="<?= label("ProductName"); ?>">
        </div>


        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="Category"><?= label("Brand"); ?></label>
            <select class="form-control" name="brandd" id="brandd">


                <?php
                $imnn = $db->query("SELECT * FROM brand ORDER BY name ASC")->getResultArray();
                foreach ($imnn as $imnnf) {
                ?>
                    <option value="<?php echo  $imnnf['id']; ?>" <?php if ($product->brandd == $imnnf['id']) { ?> selected="selected" <?php } ?>><?php echo $imnnf['name']; ?></option>
                <?php
                }
                ?>
            </select>
        </div>


        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="Category"><?= label("Category"); ?></label>
            <select class="form-control" value="<?= $product->category; ?>" name="category" id="Category">
                <option value="0">Select </option>

                <?php foreach ($categories as $category): ?>
                    <option value="<?= $category->id; ?>" <?php if ($product->category == $category->id) { ?> selected="selected" <?php } ?>><?= $category->name; ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="Supplier"><?= label("Supplier"); ?></label>
            <select class="form-control" name="supplier" id="Supplier">

                <?php foreach ($suppliers as $supplier): ?>
                    <option value="<?= $supplier->id; ?>" <?php if ($product->supplier == $supplier->id) { ?> selected="selected" <?php } ?>><?= $supplier->name; ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="PurchasePrice"><?= label("PurchasePrice"); ?> (Rs)</label>
            <input type="number" step="any" Required name="cost" value="<?= $product->cost; ?>" class="form-control" id="PurchasePrice" placeholder="<?= label("PurchasePrice"); ?>">
        </div>

        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="Price"><?= label("Selling"); ?> <?= label("Price"); ?> </label>
            <input type="number" step="any" Required name="price" value="<?= $product->price; ?>" class="form-control" id="Price" placeholder="<?= label("Price"); ?>">
        </div>

        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="Price"><?= label("MRP"); ?></label>
            <input type="number" step="any" Required name="rrate" value="<?= $product->rrate; ?>" class="form-control" id="rrate" placeholder="<?= label("Price"); ?>">
        </div>

        <?php
        $lxzmm = $db->query("SELECT * FROM settings WHERE id=1")->getRowArray();
        if ($lxzmm['gst_tax'] == 1) { ?>



            <div class="col-xs-12">
                <label for="Tax">Tax %</label>



                <div style="height: 100px;overflow-y: scroll;">
                    <?php
                    $taxx = $db->query("select * from tax order by name asc")->getResultArray();
                    foreach ($taxx as $taxxf) {
                        $ikzz = $db->query("select * from taxprolist where proid='" . $product->id . "' and taxid='" . $taxxf['id'] . "' ")->getNumRows();
                        if ($ikzz == 1 || $taxxf['status'] == 1) {
                    ?>
                            <div class="col-xs-3">
                                <span style="float: left;width: 15%">
                                    <input <?php if ($ikzz == 1) { ?> checked="checked" <?php } ?> type="checkbox" style="display: block;" name="ckk[]" id="ckc" value="<?php echo $taxxf['id']; ?>">
                                </span>
                                <span style="float: left;width:84%">
                                    <?php echo $taxxf['name']; ?>-<?php echo $taxxf['valueper']; ?>%
                                </span>
                            </div>

                    <?php
                        }
                    }
                    ?>


                </div>

            </div>



            <div class="col-xs-6" style="margin-bottom: 10px;">
                <label for="taxType"><?= label("TaxMethod"); ?></label>
                <select class="form-control" name="taxmethod" id="taxType">
                    <option value="0" <?php if ($product->taxmethod == "0") { ?> selected="selected" <?php } ?>><?= label("inclusive"); ?></option>
                    <option value="1" <?php if ($product->taxmethod == "1") { ?> selected="selected" <?php } ?>><?= label("exclusive"); ?></option>
                </select>
            </div>

        <?php } else { ?>

            <input type="hidden" name="tax" value="<?= $product->tax; ?>" id="Tax" />
            <input type="hidden" name="stax" value="<?= $product->sgst; ?>" id="sTax" />
            <input type="hidden" name="igst" value="<?= $product->igst; ?>" id="igst" />
            <input type="hidden" name="taxmethod" value="<?= $product->taxmethod; ?>" id="taxType" />


        <?php } ?>






        <?php
        if ($lxzmm['disc_pro'] == 1) { ?>


            <div class="col-xs-6" style="margin-bottom: 10px;">
                <label for="Price"><?= label("Discount"); ?> %</label>
                <input type="number" step="any" Required name="dispx" value="<?= $product->descountperr; ?>" class="form-control" id="dispx" placeholder="<?= label("Price"); ?>">
            </div>

        <?php } else { ?>

            <input type="hidden" name="dispx" value="<?= $product->descountperr; ?>" id="dispx" />



        <?php } ?>

        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="Unit"><?= label("Net Weight"); ?></label>
            <input Required type="text" name="net_wight" value="<?= $product->net_wight; ?>" class="form-control" id="net_wight" />
        </div>

        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="Unit"><?= label("Units"); ?></label>
            <input required="" type="text" step="any" name="unit" value="<?= $product->unit; ?>" class="form-control" id="Unit" placeholder="<?= label("Unit"); ?>">
        </div>


        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="AlertQt"><?= label("AlertQt"); ?></label>
            <input type="number" value="<?= $product->alertqt; ?>" name="alertqt" class="form-control" id="AlertQt" placeholder="<?= label("AlertQt"); ?>">
        </div>


        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="Price"><?= label("Packed"); ?></label>
            <input type="text" value="<?= $product->packed_1m; ?>" Required name="packed_1m" class="form-control" id="packed_1m">
        </div>


        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="taxType"><?= label("Best Before"); ?></label>
            <input type="text" value="<?= $product->best_before; ?>" name="best_before" class="form-control" id="best_before">
        </div>




        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="exampleInputFile"><?= label("Imageinput"); ?></label>
            <input type="file" name="userfile" id="ImageInput">
        </div>


        <input type="hidden" value="<?= $product->measur; ?>" name="measur" class="form-control" id="measur">


        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="ProductDescription"><?= label("ProductDescription"); ?></label>
            <textarea class="form-control" id="summernoted" name="description"><?= $product->description; ?></textarea>
        </div>

        <div class="col-xs-6" style="margin-bottom: 10px;">
            <label for="ProductCode"><?= label("ProductCode"); ?></label>
            <input type="text" name="code" Required value="<?= $product->code; ?>" class="form-control" id="ProductCode" placeholder="<?= label("ProductCode"); ?>">
            <p class="red"><?= $session->getFlashdata('error') ? $session->getFlashdata('error') : ''; ?></p>
        </div>



        <div class="col-xs-6" style="margin-bottom: 10px;">






            <input type="hidden" name="color" id="color" value="<?php echo $product->color; ?>" />



            <?php if ($product->photo) { ?><img src="<?= base_url() ?>files/products/<?= $product->photo; ?>" alt="" class="float-right" width="150px" /><?php } ?>
        </div>
        <div class="col-xs-12">
            <button type="submit" class="btn btn-green col-md-6 flat-box-btn"><?= label("Submit"); ?></button>
        </div>
        <?php echo form_close(); ?>
    </div>
</div>