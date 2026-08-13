<!-- app/Views/product/add.php -->
<?= $this->extend('layouts/main') ?>
<?= $this->section('content') ?>

<div class="container">
    <?php
    $rolr = session('user')['role'] ?? '';
    $kkar = $kkar ?? null; // Provided via controller
    ?>

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
            var ids = ["CategoryName"];
            control.makeTransliteratable(ids);
            control.showControl('translControl');
        }

        google.setOnLoadCallback(onLoad);
    </script>

    <h3><?= label("Brand"); ?> <?php if ($kkar): ?> <span><?= esc($kkar['name'] ?? '') ?></span> <?php endif; ?></h3>

    <!-- Example Form -->
    <form method="post" action="<?= site_url('product/add') ?>">
        <div class="form-group">
            <label for="code"><?= label("ProductCode"); ?></label>
            <input type="text" class="form-control" name="code" id="code" required>
        </div>

        <div class="form-group">
            <label for="CategoryName"><?= label("CategoryName"); ?></label>
            <input type="text" class="form-control" name="CategoryName" id="CategoryName">
        </div>

        <button type="submit" class="btn btn-primary"><?= label("Save"); ?></button>
    </form>
</div>

<style>
    .container {
        margin-top: 20px;
    }

    .form-group {
        margin-bottom: 15px;
    }

    label {
        font-weight: bold;
    }

    .btn-primary {
        background-color: #007bff;
        border: none;
    }

    .btn-primary:hover {
        background-color: #0056b3;
    }
</style>

<?= $this->endSection() ?>
