<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title><?= esc($setting->title ?? 'Reset Password') ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="<?= base_url('public/assets/pos.ico') ?>" rel="icon">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="<?= base_url('public/assets/css/sweetalert.css') ?>" rel="stylesheet">
</head>

<body>
<div class="container mt-5" style="max-width: 400px;">
    <h3 class="text-center mb-4"><?= label('Reset Password') ?></h3>

    <?php if (session()->getFlashdata('message')): ?>
        <div class="alert alert-info text-center"><?= session('message') ?></div>
    <?php endif; ?>

    <?= form_open('forgot') ?>
        <div class="mb-3">
            <label for="email" class="form-label"><?= label("Enter your registered email") ?></label>
            <input type="email" name="email" id="email" class="form-control" required>
        </div>

        <div class="d-grid">
            <button type="submit" class="btn btn-primary"><?= label("Send Reset Link") ?></button>
        </div>
    <?= form_close() ?>

    <div class="text-center mt-3">
        <a href="<?= base_url('login') ?>"><?= label("Back to Login") ?></a>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="<?= base_url('public/assets/js/sweetalert.min.js') ?>"></script>
<script>
    <?php if (session()->getFlashdata('message')): ?>
        swal("<?= esc(session('message')) ?>");
    <?php endif; ?>
</script>
</body>
</html>
