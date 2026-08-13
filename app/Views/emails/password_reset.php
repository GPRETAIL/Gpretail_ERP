<?php $resetLink = base_url('reset-password/' . $token); ?>

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Password Reset</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f4f6f8; padding: 20px; }
        .email-box {
            max-width: 600px;
            margin: auto;
            background: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .btn {
            background: #0d6efd;
            color: #fff;
            padding: 10px 20px;
            display: inline-block;
            border-radius: 6px;
            text-decoration: none;
            margin-top: 20px;
        }
    </style>
</head>
<body>
<div class="email-box">
    <h2><?= esc($setting['title'] ?? 'VINOTH POS') ?></h2>
    <p>Hello <?= esc($user['name'] ?? 'User') ?>,</p>
    <p>We received a request to reset your password. Click below to reset:</p>
    <a href="<?= $resetLink ?>" class="btn">Reset Password</a>
    <p>This link will expire in 1 hour. If you didn't request this, you can ignore it.</p>
    <p>— VINOTH POS Team</p>
</div>
</body>
</html>
