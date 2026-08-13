<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Payments - Add Advance</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<div class="container mt-5">
    <h2 class="mb-4">Add Advance Payment</h2>

    <form action="<?= base_url('payments/add') ?>" method="post">
        <?= csrf_field() ?>
        
        <div class="mb-3">
            <label for="CategoryName" class="form-label">Customer</label>
            <select name="CategoryName" id="CategoryName" class="form-control" required>
                <option value="">-- Select Customer --</option>
                <?php foreach ($customers as $customer): ?>
                    <option value="<?= esc($customer['id']) ?>">
                        <?= esc($customer['name'] ?? $customer['company'] ?? 'Customer') ?>
                    </option>
                <?php endforeach; ?>
            </select>
        </div>

        <div class="mb-3">
            <label for="persent" class="form-label">Advance Amount</label>
            <input type="number" name="persent" id="persent" class="form-control" required>
        </div>

        <button type="submit" class="btn btn-success">Submit Payment</button>
    </form>
</div>
</body>
</html>
