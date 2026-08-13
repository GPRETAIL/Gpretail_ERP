<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Problem Category</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- Bootstrap CSS for styling -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <nav class="navbar navbar-expand-lg navbar-dark bg-dark">
        <div class="container-fluid">
            <a class="navbar-brand" href="#">My App</a>
        </div>
    </nav>

    <div class="container mt-4">
        <?php if (!empty($user_dat)): ?>
            <div class="alert alert-info">
                Logged in as: <strong><?= esc($user_dat['username'] ?? 'User') ?></strong>
            </div>
        <?php endif; ?>
