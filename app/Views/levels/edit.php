<?= $this->extend('layouts/main') ?> <!-- Adjust the layout path as needed -->

<?= $this->section('content') ?>
<div class="container">
    <h2>Edit Level</h2>

    <?php if (isset($level)): ?>
        <form action="<?= base_url('levels/edit/' . $level['id']) ?>" method="post">
            <?= csrf_field() ?>

            <div class="form-group">
                <label for="CategoryName">Category Name</label>
                <input type="text" name="CategoryName" id="CategoryName" class="form-control" value="<?= esc($level['name']) ?>" required>
            </div>

            <div class="form-group">
                <label for="persent">Percentage</label>
                <input type="number" step="0.01" name="persent" id="persent" class="form-control" value="<?= esc($level['valueper']) ?>" required>
            </div>

            <button type="submit" class="btn btn-primary mt-3">Update</button>
            <a href="<?= base_url('levels/viewlevels/' . $level['warehousr']) ?>" class="btn btn-secondary mt-3">Cancel</a>
        </form>
    <?php else: ?>
        <p>Level not found.</p>
    <?php endif; ?>
</div>
<?= $this->endSection() ?>
