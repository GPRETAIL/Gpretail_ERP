<div class="container container-small">
    <h3><?= label('Edit'); ?> <a style="float: right;" class="btn btn-primary btn-green" href="<?php echo base_url(); ?>expences"><?= label('Back'); ?></a>

    </h3>
    <hr>

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
            var ids = ["Reference", "summernoted"];
            control.makeTransliteratable(ids);
            control.showControl('translControl');
        }
        google.setOnLoadCallback(onLoad);
    </script>

    <div class="row" style="margin-top:20px;">

        <?php
        $attributes = array('id' => 'addform');
        echo form_open_multipart('expences/edit/' . $expenceModel['id'], $attributes);
        ?>
        <div class="modal-body">
            <div class="form-group controls">
                <label for="Date"><?= label("Date"); ?> *</label>
                <input type="text" maxlength="30" Required name="date" value="<?= date('d-m-Y', strtotime($expenceModel['date'])); ?>" class="form-control" id="Date" placeholder="<?= label("Date"); ?>">
            </div>
            <div class="form-group">
                <label for="Reference"><?= label("Reference"); ?> *</label>
                <input type="text" name="reference" value="<?= $expenceModel['reference']; ?>" maxlength="25" Required class="form-control" id="Reference" placeholder="<?= label("Reference"); ?>">
            </div>
            <div class="form-group">
                <label for="Category"><?= label("Type"); ?></label>
                <select class="form-control" name="category" id="Category">
                    <option value="0"><?= label("select"); ?></option>
                    <?php foreach ($categories as $category): ?>
                        <option value="<?= $category->id; ?>" <?= $expenceModel['category_id'] == $category->id ? 'selected' : ''; ?>><?= $category->name; ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="form-group">
                <label for="store_id"><?= label("Store"); ?></label>
                <?php if ($user->role !== "admin"): ?>
                    <input type="text" value="<?= $storeName; ?>" class="form-control" id="store_id" disabled>
                    <input type="hidden" value="<?= $expenceModel['store_id']; ?>" name="store_id">
                <?php else: ?>
                    <select class="form-control" name="store_id" id="store_id">
                        <option value="0"><?= label("Store"); ?></option>
                        <?php foreach ($stores as $store): ?>
                            <option value="<?= $store->id; ?>" <?= $expenceModel['store_id'] == $store->id ? 'selected' : ''; ?>><?= $store->name; ?></option>
                    <?php endforeach;
                    endif; ?>

                    </select>
            </div>
            <div class="form-group">
                <label for="Amount"><?= label("Amount"); ?> (Rs) *</label>
                <input type="number" step="any" Required name="amount" value="<?= $expenceModel['amount']; ?>" class="form-control" id="Amount" placeholder="<?= label("Amount"); ?>">
            </div>
            <div class="form-group">
                <label for="exampleInputFile"><?= label("Attachment"); ?></label>
                <input type="file" name="userfile" id="attachment">
                <p class="help-block"><?= label("AttachmentInfos"); ?></p>
            </div>
            <div class="form-group">
                <label for="Note"><?= label("note"); ?></label>
                <textarea id="summernoted" class="form-control" name="note"><?= $expenceModel['note'] ?></textarea>
            </div>
        </div>

        <div class="form-group">
            <button type="submit" class="btn btn-add"><?= label("Submit"); ?></button>
        </div>
        <?php echo form_close(); ?>
    </div>
</div>

<script type="text/javascript">
    $(document).ready(function() {

        $('#Date').datepicker({
            todayHighlight: true,
            autoclose: true

        });
    });
</script>