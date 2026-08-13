<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title><?= esc($setting['title'] ?? 'Reset Password') ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="<?= base_url('public/assets/pos.ico') ?>" rel="icon">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="<?= base_url('public/assets/css/sweetalert.css') ?>" rel="stylesheet">
</head>
<body>
    <div class="container mt-5" style="max-width: 400px;">
        <h3 class="text-center"><?= label('Reset Password') ?></h3>

        <?php if (isset($message)): ?>
            <div class="alert alert-danger text-center"><?= esc($message) ?></div>
        <?php endif; ?>

        <?= form_open('reset-password/' . $token) ?>
            <div class="mb-3">
                <label for="password"><?= label('New Password') ?></label>
                <input type="password" name="password" id="password" class="form-control" required>
            </div>

            <div class="mb-3">
                <label for="pass_confirm"><?= label('Confirm Password') ?></label>
                <input type="password" name="pass_confirm" id="pass_confirm" class="form-control" required>
            </div>

            <div class="d-grid">
                <button type="submit" class="btn btn-success"><?= label('Reset Password') ?></button>
            </div>
        <?= form_close() ?>

        <div class="text-center mt-3">
            <a href="<?= base_url('login') ?>"><?= label('Back to Login') ?></a>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="<?= base_url('public/assets/js/sweetalert.min.js') ?>"></script>
    <script>
        <?php if (isset($message)): ?>
            swal("<?= esc($message) ?>");
        <?php endif; ?>
    </script>
</body>
</html>
