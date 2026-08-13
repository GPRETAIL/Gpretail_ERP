<!-- Page Content -->
<div class="container">
 <?php 
  $rolr = $user->role;
  $kkar = $db->query("SELECT * FROM permission_new WHERE nname='" . $rolr . "'")->getRowArray();
 ?>

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
        var ids = ["CategoryName"];
        control.makeTransliteratable(ids);
        control.showControl('translControl');
    }
    google.setOnLoadCallback(onLoad);
</script>

<h3>
    <?= label("paymentMethod"); ?> 
    <?php if ($kkar['paya'] == 1) { ?>
        <button style="float: right;" class="btn btn-primary btn-green" type="button" data-toggle="modal" data-target="#Addcategory">
            <?= label("Add Payment Method"); ?>
        </button>
    <?php } ?>
</h3>
<hr>

<div class="row" style="margin-top:20px;">
    <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
        <thead>
            <tr>
                <th>SN</th>
                <th style="width:60px;"><?= label("id"); ?></th>
                <th><?= label("paymentMethod"); ?></th>
                <th style="text-align: center;"><?= label("validatee"); ?></th>
                <th><?= label("CreatedAt"); ?></th>
                <th><?= label("Action"); ?></th>
            </tr>
        </thead>
        <tbody>
            <?php 
            $sn = 1;
            $categories = $db->query("SELECT * FROM payment_mode WHERE status=1 ORDER BY name ASC")->getResult();
            foreach ($categories as $category) { ?>
                <tr>
                    <td><?= $sn++; ?></td>
                    <td><?= $category->id; ?></td>
                    <td><?= $category->name; ?></td>
                    <td style="text-align: center;">
                        <?= ($category->validate_it == 1) ? "Yes" : "No"; ?>
                    </td>
                    <td><?= date("d-m-Y H:i:s", strtotime($category->created_at)); ?></td>
                    <td>
                        <div class="btn-group">
                            <?php if ($kkar['payd'] == 1 && $category->id > 5) { ?>
                                <button class="btn btn-danger" data-toggle="modal" data-target="#deleteModal" onclick="setDeleteId(<?= $category->id; ?>)">
                                    <i class="fa fa-times"></i>
                                </button>
                            <?php } ?>
                            <?php if ($kkar['paye'] == 1 && $category->id > 5) { ?>
                                <a class="btn btn-default" href="PaymentMode/edit/<?= $category->id; ?>" data-toggle="tooltip"  data-placement="top" title="<?= label('Edit'); ?>">
                                    <i class="fa fa-pencil"></i>
                                </a>
                            <?php } ?>
                        </div>
                    </td>
                </tr>
            <?php } ?>
        </tbody>
    </table>
</div>

<!-- Add Payment Method Modal -->
<div class="modal fade" id="Addcategory" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                <h4 class="modal-title" id="myModalLabel"><?= label("Add"); ?></h4>
            </div>
            <?php echo form_open_multipart('PaymentMode/add'); ?>
            <div class="modal-body">
                <div class="form-group">
                    <label for="CategoryName"><?= label("paymentMethod"); ?> <?= label("Name"); ?></label>
                    <input type="text" maxlength="50" name="CategoryName" class="form-control" id="CategoryName" placeholder="<?= label("paymentMethod"); ?>" required>
                </div> 
                <div class="form-group">
                    <label for="validate_it"><?= label("validatee"); ?></label>
                    <select name="validate_it" id="validate_it" class="form-control">
                        <option value="1">Yes</option>
                        <option value="0">No</option>
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

<!-- Delete Confirmation Modal -->
<div class="modal fade" id="deleteModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                <h4 class="modal-title">Delete Payment Method</h4>
            </div>
            <div class="modal-body">
                <p>Do you really want to delete this payment method?</p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <a href="#" id="confirmDelete" class="btn btn-danger">Yes, Delete</a>
            </div>
        </div>
    </div>
</div>

<script>
    function setDeleteId(categoryId) {
        document.getElementById("confirmDelete").href = "paymentMode/delete/" + categoryId;
    }
</script>
