<div class="container container-small">
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

    <h3><?= label("Edit"); ?>

    </h3>
    <hr>
    <?php

    $lm = $uri->getSegment(3);

    $lmp = mysql_fetch_array(mysql_query("SELECT * FROM tax WHERE id='" . $lm . "' "));
    ?>



    <div class="row" style="margin-top:20px;">
        <a class="btn btn-default float-right" href="#" onclick="history.back(-1)" style="margin-bottom:10px;">
            <i class="fa fa-arrow-left"></i> <?= label("Back"); ?></a>
        <?php echo form_open_multipart('tax/edit/' . $lm); ?>
        <div class="form-group">
            <label for="CategoryName"><?= label("tax"); ?> <?= label("Name"); ?></label>
            <input type="text" maxlength="50" name="name" value="<?php echo $lmp['name']; ?>" class="form-control" id="CategoryName" placeholder="<?= label("Brand Name"); ?>" required>
        </div>
        <div class="form-group">
            <label for="CategoryName"><?= label("tax"); ?> <?= label("type"); ?></label>
            <select class="form-control" name="custtype" id="taxZone">
                <option value="1" <?= $lmp['custtype'] == 1 ? 'selected' : '' ?> data-val="local_state">Local State</option>
                <option value="2" <?= $lmp['custtype'] == 2 ? 'selected' : '' ?> data-val="other_state">Other State</option>
                <option value="3" <?= $lmp['custtype'] == 2 ? 'GST' : '' ?> data-val="gst">GST</option>
                <?php
                // $tax_method = $db->get_where('taxtype')->result();
                $tax_method = $db->table('taxtype')->get()->getResult();
                foreach ($tax_method as $key => $value) { ?>
                    <option value="<?= $value->id ?>" <?= $lmp['custtype'] == $value->id ? 'selected' : '' ?>><?= $value->taxtype ?></option>
                <?php }
                ?>
            </select>
        </div>
        <?php
        if ($tax->tax_for == 0) { ?>
            <div class="form-group">
                <label for="CategoryName"><?= label("tax"); ?> %</label>
                <input type="text" maxlength="50" name="valueper" value="<?php echo $lmp['valueper']; ?>" class="form-control" id="persent" required>
            </div>
        <?php } else { ?>
            <div class="form-group  local_state txZone">
                <label for="cgst"><?= label("CGST"); ?>(%)</label>
                <input type="text" name="cgst" class="form-control" id="cgst" value="<?= $tax->cgst ?>">
            </div>

            <div class="form-group local_state txZone">
                <label for="sgst"><?= label("SGST"); ?>(%)</label>
                <input type="text" name="sgst" class="form-control" id="sgst" value="<?= $tax->sgst ?>">
            </div>

            <div class="form-group gst txZone">
                <label for="sgst"><?= label("GST"); ?>(%)</label>
                <input type="text" name="gst" class="form-control" id="gst" value="<?= $tax->gst ?>">
            </div>

            <div class="form-group other_state txZone">
                <label for="igst"><?= label("IGST"); ?>(%)</label>
                <input type="text" name="igst" class="form-control" id="igst" value="<?= $tax->igst ?>">
            </div>
        <?php }
        ?>

        <div class="form-group">
            <label for="CategoryName"><?= label("tax"); ?> <?= label("Type"); ?></label>
            <select class="form-control" name="taxtype" id="taxtype" required>
                <option value="">Select</option>
                <option value="1" <?= $lmp['taxtype'] == 1 ? 'selected' : '' ?>>Inclusive</option>
                <option value="2" <?= $lmp['taxtype'] == 2 ? 'selected' : '' ?>>Exclusive</option>
            </select>
        </div>
        <div class="form-group">
            <label for="CategoryName"><?= label("Tax"); ?> <?= label("Default"); ?></label>
            <select class="form-control" name="taxdefault" id="taxdefault">
                <option value="1" <?= $lmp['taxdefault'] == 1 ? 'selected' : '' ?>>Yes</option>
                <option value="2" <?= $lmp['taxdefault'] == 2 ? 'selected' : '' ?>>No</option>
            </select>
        </div>
        <div class="form-group">
            <button type="submit" class="btn btn-add"><?= label("Submit"); ?></button>
        </div>
        <?php echo form_close(); ?>
    </div>
</div>

<script>
    $(function() {
        $("#taxZone").change();
    });
    $('.btn-taxes').click(function(e) {
        e.preventDefault();
        $("#taxZone").trigger('change');
    });
    $(function() {
        $("#taxZone").trigger('change');
    });
    $("#taxZone").change(function(e) {
        e.preventDefault();
        var taxZone = $("#taxZone option:selected").data("val");

        $('.txZone').hide();
        $('.' + taxZone).show();

    });
</script>