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

    $taxtype = mysql_fetch_array(mysql_query("SELECT * FROM taxtype WHERE id='" . $lm . "' "));
    ?>



    <div class="row" style="margin-top:20px;">
        <a class="btn btn-default float-right" href="#" onclick="history.back(-1)" style="margin-bottom:10px;">
            <i class="fa fa-arrow-left"></i> <?= label("Back"); ?></a>
        <?php echo form_open_multipart('tax/edit_taxtype/' . $lm); ?>
        <div class="form-group">
            <label for="CategoryName"><?= label("tax"); ?> <?= label("Method"); ?></label>
            <input type="text" name="taxtype" value="<?php echo $taxtype['taxtype']; ?>" class="form-control" id="" placeholder="<?= label("Tax Type"); ?>" required>
        </div>

        <div class="form-group">
            <button type="submit" class="btn btn-add"><?= label("Submit"); ?></button>
        </div>
        <?php echo form_close(); ?>
    </div>
</div>