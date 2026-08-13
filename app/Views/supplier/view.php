<!-- Page Content -->
<div class="container">
    <?php
    $rolr = $user->role;
    $kkar = $db->query("SELECT * FROM permission_new WHERE nname='" . $rolr . "'")->getRowArray();
    ?>

    <script type="text/javascript" src="https://www.google.com/jsapi"></script>
    <script type="text/javascript">
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
            var ids = ["SupplierName", "summernotes", "city", "country", "adress"];
            control.makeTransliteratable(ids);
            control.showControl('translControl');
        }
        google.setOnLoadCallback(onLoad);
    </script>

    <h3>
        <?= label("Supplier"); ?>
        <?php if ($kkar['sua'] == 1) { ?>
            <button style="float: right;" class="btn btn-primary btn-green" type="button" data-toggle="modal" data-target="#AddSupplier">
                <?= label("Add Supplier"); ?>
            </button>
        <?php } ?>
    </h3>
    <hr>

    <div class="row" style="margin-top:20px;">
        <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
            <thead>
                <tr>
                    <th>SN</th>
                    <th style="width:80px;"><?= label("Supplier"); ?> <?= label("Id"); ?></th>
                    <th><?= label("SupplierName"); ?></th>
                    <th><?= label("SupplierPhone"); ?></th>
                    <th class="hidden-xs"><?= label("SupplierEmail"); ?></th>
                    <th class="hidden-xs"><?= label("CreatedAt"); ?></th>
                    <th><?= label("Action"); ?></th>
                </tr>
            </thead>

            <tbody>
                <?php $sn = 1;
                foreach ($suppliers as $supplier): ?>
                    <tr>
                        <td><?= $sn++; ?></td>
                        <td><?= $supplier->id; ?></td>
                        <td><?= $supplier->name; ?></td>
                        <td><?= $supplier->phone; ?></td>
                        <td class="hidden-xs"><?= $supplier->email; ?></td>
                        <td class="hidden-xs"><?= date("d-m-Y H:i:s", strtotime($supplier->created_at)); ?></td>
                        <td>
                            <div class="btn-group">
                                <?php if ($kkar['sud'] == 1) { ?>
                                    <button class="btn btn-danger" data-toggle="modal" data-target="#deleteModal" onclick="setDeleteId(<?= $supplier->id; ?>)">
                                        <i class="fa fa-times"></i>
                                    </button>
                                <?php } ?>
                                <?php if ($kkar['sue'] == 1) { ?>
                                    <a class="btn btn-default" href="suppliers/edit/<?= $supplier->id; ?>" data-toggle="tooltip" title="<?= label('Edit'); ?>">
                                        <i class="fa fa-pencil"></i>
                                    </a>
                                <?php } ?>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</div>




<!-- Add Supplier Modal -->
<div class="modal fade" id="AddSupplier" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                <h4 class="modal-title"><?= label("Add"); ?></h4>
            </div>
            <?php echo form_open_multipart('suppliers/add'); ?>
            <div class="modal-body">
                <div class="form-group">
                    <div class="col-xs-6">
                        <label for="SupplierName"><?= label("SupplierName"); ?></label>
                        <input type="text" name="name" maxlength="50" required class="form-control" id="SupplierName">
                    </div>
                    <div class="col-xs-6">
                        <label for="SupplierPhone"><?= label("SupplierPhone"); ?></label>
                        <input type="text" name="phone" required maxlength="30" class="form-control" id="SupplierPhone">
                    </div>
                </div>
                <div class="form-group">
                    <div class="col-xs-6">
                        <label for="SupplierEmail"><?= label("SupplierEmail"); ?></label>
                        <input type="email" maxlength="50" required name="email" class="form-control" id="SupplierEmail">
                    </div>
                    <div class="col-xs-6">
                        <label for="GST">GST <?= label("Number"); ?></label>
                        <input type="text" maxlength="50" required name="gst" class="form-control" id="gst">
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button type="submit" class="btn btn-primary"><?= label("Submit"); ?></button>
                <button type="button" class="btn btn-secondary" data-dismiss="modal"><?= label("Close"); ?></button>
            </div>
            <?php echo form_close(); ?>
        </div>
    </div>
</div>

<!-- Delete Confirmation Modal -->
<div class="modal fade" id="deleteModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                <h4 class="modal-title">Delete Supplier</h4>
            </div>
            <div class="modal-body">
                <p>Do you really want to delete this supplier?</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <a href="#" id="confirmDelete" class="btn btn-danger">Yes, Delete</a>
            </div>
        </div>
    </div>
</div>

<script>
    function setDeleteId(supplierId) {
        document.getElementById("confirmDelete").href = "suppliers/delete/" + supplierId;
    }

    $('#gst').keyup(function(e) {
        e.preventDefault();
        var gstin = $(this).val();
        console.log(gstin);
    });
</script>