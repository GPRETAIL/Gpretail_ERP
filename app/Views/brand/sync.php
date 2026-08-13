<div class="container">
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
      control.makeTransliteratable(["CategoryName"]);
      control.showControl('translControl');
    }
    google.setOnLoadCallback(onLoad);
  </script>

  <h3>
    <?= label("Brand"); ?>
    <?php if (!empty($kkar['bra'])): ?>
      <button style="float: right;" class="btn btn-primary btn-green" type="button" data-toggle="modal" data-target="#Addcategory">
        <?= label("Add"); ?>
      </button>
    <?php endif; ?>
  </h3>
  <hr>

  <div class="row mt-3">
    <table id="Table" class="table table-striped table-bordered" cellspacing="0" width="100%">
      <thead>
        <tr>
          <th style="width:60px;">
            <?= label("Brand") . " " . label("id"); ?>
          </th>
          <th><?= label("Brand") . " " . label("Name"); ?></th>
          <th><?= label("CreatedAt"); ?></th>
          <th><?= label("Action"); ?></th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($brands as $brand): ?>
          <tr>
            <td><?= esc($brand['id']); ?></td>
            <td><?= esc($brand['name']); ?></td>
            <td><?= date("d-m-Y H:i:s", strtotime($brand['created_at'])); ?></td>
            <td>
              <div class="btn-group">
                <?php if (!empty($kkar['brd'])): ?>
                  <a class="btn btn-default" href="javascript:void(0)" data-toggle="popover" data-placement="left" data-html="true" title='<?= label("Areyousure"); ?>' data-content='<a class="btn btn-danger" href="<?= base_url('brand/delete/' . $brand['id']); ?>"><?= label("yesiam"); ?></a>'>
                    <i class="fa fa-times"></i>
                  </a>
                <?php endif; ?>
                <?php if (!empty($kkar['bre'])): ?>
                  <a class="btn btn-default" href="<?= base_url('brand/edit/' . $brand['id']); ?>" data-toggle="tooltip" title="<?= label('Edit'); ?>">
                    <i class="fa fa-pencil"></i>
                  </a>
                <?php endif; ?>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  </div>
</div>

<!-- Modal for Adding Brand -->
<div class="modal fade" id="Addcategory" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <form action="<?= base_url('brand/add'); ?>" method="post" enctype="multipart/form-data">
        <div class="modal-header">
          <h4 class="modal-title" id="myModalLabel"><?= label("Add"); ?></h4>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="CategoryName"><?= label("Brand") . " " . label("Name"); ?></label>
            <input type="text" maxlength="50" name="CategoryName" class="form-control" id="CategoryName" placeholder="<?= label("Brand Name"); ?>" required>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-default" data-dismiss="modal"><?= label("Close"); ?></button>
          <button type="submit" class="btn btn-add"><?= label("Submit"); ?></button>
        </div>
      </form>
    </div>
  </div>
</div>
