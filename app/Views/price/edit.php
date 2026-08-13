



<div class="container mt-4">
    <h3><?= label("Edit") ?> <?= label("Brand") ?></h3>

    <form method="post" action="<?= site_url('price/edit/' . esc($id)) ?>">
        <div class="mb-3">
            <label for="CategoryName" class="form-label"><?= label("CategoryName") ?></label>
            <input type="text" name="CategoryName" id="CategoryName" class="form-control" required>
        </div>

        <button type="submit" class="btn btn-primary"><?= label("Update") ?></button>
        <a href="<?= site_url('price') ?>" class="btn btn-secondary"><?= label("Cancel") ?></a>
    </form>
</div>


