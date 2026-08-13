<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Edit Tax</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<div class="container mt-5">
    <h2>Edit Tax</h2>

    <?php if (isset($tax)): ?>
        <form action="<?= base_url('payments/edit/' . $tax['id']) ?>" method="post">
            <?= csrf_field() ?>
            <div class="mb-3">
                <label for="CategoryName" class="form-label">Tax Name</label>
                <input type="text" name="CategoryName" id="CategoryName" class="form-control" value="<?= esc($tax['name']) ?>" required>
            </div>
            <button type="submit" class="btn btn-primary">Update</button>
            <a href="<?= base_url('tax') ?>" class="btn btn-secondary">Cancel</a>
        </form>
    <?php else: ?>
        <div class="alert alert-danger">Tax record not found.</div>
    <?php endif; ?>
</div>
</body>
</html>
