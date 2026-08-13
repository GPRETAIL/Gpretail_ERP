

<div class="container container-small">
    <script type="text/javascript" src="https://www.google.com/jsapi"></script>
    <script type="text/javascript">
        google.load("elements", "1", { packages: "transliteration" });

        function onLoad() {
            var options = {
                sourceLanguage: 'en',
                destinationLanguage: ['<?= label("languagek"); ?>'],
                shortcutKey: 'ctrl+g',
                transliterationEnabled: true
            };
            var control = new google.elements.transliteration.TransliterationControl(options);
            control.makeTransliteratable(["CategoryName"]);
            control.showControl('translControl');
        }

        google.setOnLoadCallback(onLoad);
    </script>

    <h3><?= label("Edit"); ?></h3>
    <hr>

    <div class="row" style="margin-top:20px;">
        <a class="btn btn-default float-right" href="<?= previous_url() ?>" style="margin-bottom:10px;">
            <i class="fa fa-arrow-left"></i> <?= label("Back"); ?>
        </a>

        <form action="<?= base_url('brand/edit/' . esc($brand['id'])) ?>" method="post" enctype="multipart/form-data">
            <div class="form-group">
                <label for="CategoryName"><?= label("Brand"); ?> <?= label("Name"); ?></label>
                <input type="text" maxlength="50" name="CategoryName"
                       value="<?= esc($brand['name']) ?>" class="form-control"
                       id="CategoryName" placeholder="<?= label("Brand Name"); ?>" required>
            </div>
            <div class="form-group">
                <button type="submit" class="btn btn-add"><?= label("Submit"); ?></button>
            </div>
        </form>
    </div>
</div>
